"use client";
import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CandidatePreviewData,
  PreviewMessage,
  Application,
} from "@/features/candidate-workspace/types";
import { profileEmailVerifiedAt } from "@/features/candidate-workspace/types";
import {
  applicationError,
  type ApplyInput,
  type ApplyResult,
} from "@/features/candidate-workspace/application";
import { validateCv } from "@/features/candidate-profile/validation";
import { validateMessage } from "@/features/candidate-workspace/rules";
import {
  loadEmailPreferences,
  saveEmailPreferences,
  type EmailPreferences,
} from "@/features/candidate-workspace/email-preferences";
import { createProfilePreview } from "@/mocks/candidate-profile";
import type { CandidateProfile } from "@/features/candidate-profile/types";
import { apiRequest } from "@/features/api/client";
import {
  candidateApplicationFromApi,
  candidateMessageFromApi,
  candidateNotificationFromApi,
  candidateProfileFromApi,
  candidateProfilePayload,
  record,
  rows,
} from "@/features/candidate-workspace/api-adapter";
import type { Job } from "@/features/jobs/types";
import { mapJob } from "@/features/jobs/api";
import {
  liveConversations,
  useBackendEvent,
  useLiveRefresh,
} from "@/features/api/live";
import { readWorkspaceSnapshot } from "@/features/api/workspace";
import { useChatMessages } from "@/features/chat/use-chat-messages";
import {
  mergeChatMessages,
  receiptIncludesMessage,
} from "@/features/chat/updates";

type WorkspaceInitial = CandidatePreviewData & { profile?: CandidateProfile };

function useWorkspaceState(initial: WorkspaceInitial) {
  const [profile, setProfile] = useState(() => {
    if (initial.mode === "api" && !initial.profile)
      throw new Error("Không thể tải hồ sơ ứng viên.");
    return initial.profile ?? createProfilePreview();
  });
  const [emailVerifiedAt, setEmailVerifiedAt] = useState(
    initial.emailVerifiedAt ?? null,
  );
  const profileEmail = useRef(profile.email);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [cvUrl, setCvUrl] = useState(initial.cvUrl ?? null);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? null);
  const [jobs, setJobs] = useState(initial.jobs);
  const [conversations, setConversations] = useState(initial.conversations);
  const knownJobs = useRef(new Set(initial.jobs.map((job) => job.id)));
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const locks = useRef(new Set<string>());
  const revision = useRef(0);
  const api = initial.mode === "api";
  async function command<T>(key: string, action: () => Promise<T>): Promise<T> {
    if (locks.current.has(key)) throw new Error("Thao tác đang được xử lý.");
    locks.current.add(key);
    revision.current++;
    setPending((current) => ({ ...current, [key]: true }));
    try {
      return await action();
    } finally {
      locks.current.delete(key);
      setPending((current) => ({ ...current, [key]: false }));
    }
  }
  const [savedIds, setSavedIds] = useState(initial.savedIds);
  const [applications, setApplications] = useState(initial.applications);
  const applicationRecords = useRef(initial.applications);
  const [applicationFiles, setApplicationFiles] = useState<
    Record<number, File>
  >({});
  const chat = useChatMessages(
    initial.messages,
    api,
    (raw, id) => candidateMessageFromApi(raw, Number(initial.userId), id),
    Number(initial.userId),
  );
  const { messages, setMessages } = chat;
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [notifications, setNotifications] = useState(initial.notifications);
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences>({
    applications: false,
    messages: false,
  });
  const [emailPrefsReady, setEmailPrefsReady] = useState(!api);
  const [emailPrefsLoading, setEmailPrefsLoading] = useState(false);
  const [emailPrefsError, setEmailPrefsError] = useState<string | null>(null);
  const [emailPrefsSaved, setEmailPrefsSaved] = useState(false);
  const emailPrefsReading = useRef(false);
  const loadEmailPrefs = useCallback(async () => {
    if (!api || emailPrefsReading.current) return;
    emailPrefsReading.current = true;
    setEmailPrefsLoading(true);
    setEmailPrefsError(null);
    setEmailPrefsSaved(false);
    try {
      const [preferences, response] = await Promise.all([
        loadEmailPreferences(),
        apiRequest<unknown>("/candidate/profile"),
      ]);
      const updatedProfile = candidateProfileFromApi(response.data);
      const previousEmail = profileEmail.current;
      setEmailVerifiedAt((current) =>
        profileEmailVerifiedAt(
          previousEmail,
          updatedProfile.email,
          current,
          record(record(response.data).user).email_verified_at,
        ),
      );
      profileEmail.current = updatedProfile.email;
      setProfile(updatedProfile);
      setEmailPrefs(preferences);
      setEmailPrefsReady(true);
    } catch (error) {
      setEmailPrefsReady(false);
      setEmailPrefsError(
        error instanceof Error ? error.message : "Không thể tải cài đặt email.",
      );
    } finally {
      emailPrefsReading.current = false;
      setEmailPrefsLoading(false);
    }
  }, [api]);
  useBackendEvent(
    "backend:message",
    (message) => {
      if (!conversations.some((item) => item.id === message.conversation_id))
        return;
      setMessages((current) =>
        mergeChatMessages(current, [
          candidateMessageFromApi(
            message,
            Number(initial.userId),
            message.conversation_id,
          ),
        ]),
      );
    },
    api,
  );
  useBackendEvent(
    "backend:messages-read",
    (receipt) => {
      setMessages((current) =>
        current.map((message) =>
          message.outgoing &&
          receiptIncludesMessage(receipt, message, Number(initial.userId))
            ? { ...message, read_at: receipt.read_at }
            : message,
        ),
      );
    },
    api,
  );
  useBackendEvent(
    "backend:notification",
    (notification) => {
      const mapped = candidateNotificationFromApi(notification);
      setNotifications((current) => [
        mapped,
        ...current.filter((item) => item.id !== mapped.id),
      ]);
      if (
        notification.data?.conversation_id &&
        !conversations.some(
          (item) => item.id === notification.data?.conversation_id,
        )
      )
        window.dispatchEvent(new Event("backend:refresh"));
      else if (
        notification.type === "new_message" &&
        notification.data?.conversation_id &&
        !liveConversations().includes(notification.data.conversation_id)
      ) {
        const id = notification.data.conversation_id;
        // Reading history marks the room read. Refresh the preview through the
        // conversation list while that room is closed or minimized instead.
        void apiRequest<unknown[]>("/conversations")
          .then((response) => {
            const conversation = rows(response.data).find((item) => Number(item.id) === id);
            if (!conversation?.last_message) return;
            setMessages((current) => mergeChatMessages(current, [
              candidateMessageFromApi(conversation.last_message, Number(initial.userId), id),
            ]));
          })
          .catch(() => {});
      }
    },
    api,
  );
  useLiveRefresh(async () => {
    if (locks.current.size) return;
    const version = revision.current;
    const data = await readWorkspaceSnapshot<Record<string, unknown>>(
      apiRequest,
      "candidate",
    );
    const notificationData = data.notifications;
    const conversationData = data.conversations;
    const applicationData = data.applications;
    const savedData = data.saved_jobs;
    const additions = [
      ...rows(data.conversation_jobs).map(mapJob),
      ...rows(savedData).map(mapJob),
      ...rows(applicationData)
        .filter((item) => item.job)
        .map((item) => mapJob(item.job)),
    ];
    if (version !== revision.current || locks.current.size) return;
    additions.forEach((job) => knownJobs.current.add(job.id));
    setJobs((current) =>
      Array.from(
        new Map(
          [...current, ...additions].map((job) => [job.id, job]),
        ).values(),
      ),
    );
    setNotifications(rows(notificationData).map(candidateNotificationFromApi));
    setConversations(
      rows(conversationData).map((item) => ({
        id: Number(item.id),
        job_id: Number(item.job_id),
        contact: String(record(item.partner).name ?? ""),
      })),
    );
    setMessages((current) =>
      mergeChatMessages(
        current,
        rows(conversationData).flatMap((item) =>
          item.last_message
            ? [
                candidateMessageFromApi(
                  item.last_message,
                  Number(initial.userId),
                  Number(item.id),
                ),
              ]
            : [],
        ),
      ),
    );
    applicationRecords.current = rows(applicationData).map(
      candidateApplicationFromApi,
    );
    setApplications(applicationRecords.current);
    setSavedIds(rows(savedData).map((item) => Number(item.id)));
  }, api);
  const markConversationRead = useCallback(
    async (id: number) => {
      if (api)
        await apiRequest(`/conversations/${id}/read`, { method: "PATCH" });
    },
    [api],
  );
  return {
    ...initial,
    emailVerifiedAt,
    markConversationRead,
    jobs,
    conversations,
    cvUrl,
    avatarUrl,
    pending,
    messageSending: chat.sending,
    messageHistory: chat.history,
    retryMessage: chat.retryMessage,
    isApi: api,
    profile,
    setProfile,
    avatar,
    setAvatar,
    cv,
    setCv,
    savedIds,
    applications,
    applicationFiles,
    messages,
    drafts,
    notifications,
    emailPrefs,
    emailPrefsReady,
    emailPrefsLoading,
    emailPrefsError,
    emailPrefsSaved,
    loadEmailPrefs,
    updateEmailPreference: async (
      key: keyof EmailPreferences,
      enabled: boolean,
    ) => {
      if (locks.current.has("email-preferences") || (api && !emailPrefsReady))
        return;
      const previous = emailPrefs;
      const next = { ...previous, [key]: enabled };
      setEmailPrefs(next);
      setEmailPrefsError(null);
      setEmailPrefsSaved(false);
      if (!api) return;
      try {
        await command("email-preferences", async () => {
          setEmailPrefs(await saveEmailPreferences(next));
          setEmailPrefsSaved(true);
        });
      } catch (error) {
        setEmailPrefs(previous);
        setEmailPrefsError(
          error instanceof Error
            ? error.message
            : "Không thể lưu cài đặt email. Vui lòng thử lại.",
        );
      }
    },
    registerJob: (job: Job) => {
      knownJobs.current.add(job.id);
      setJobs((current) =>
        current.some((item) => item.id === job.id)
          ? current
          : [...current, job],
      );
    },
    saveProfile: async (next: CandidateProfile) => {
      if (api)
        return command("profile", async () => {
          const response = await apiRequest<unknown>("/candidate/profile", {
            method: "PUT",
            body: JSON.stringify(candidateProfilePayload(next)),
          });
          const updatedProfile = candidateProfileFromApi(response.data);
          const previousEmail = profileEmail.current;
          setEmailVerifiedAt((current) =>
            profileEmailVerifiedAt(
              previousEmail,
              updatedProfile.email,
              current,
              record(record(response.data).user).email_verified_at,
            ),
          );
          profileEmail.current = updatedProfile.email;
          setProfile(updatedProfile);
          return updatedProfile;
        });
      setProfile(next);
      return next;
    },
    uploadFile: async (kind: "cv" | "avatar", file: File) =>
      command(kind, async () => {
        if (api) {
          const body = new FormData();
          body.set(kind === "cv" ? "cv_file" : "avatar", file);
          const response = await apiRequest<unknown>(
            kind === "avatar" ? "/candidate/profile" : "/candidate/cv",
            { method: "POST", body },
          );
          if (kind === "cv") setCvUrl("/api/backend/candidate/cv/file");
          else {
            const url = record(record(response.data).profile).avatar_url;
            if (typeof url === "string") setAvatarUrl(url);
          }
        }
        if (kind === "cv") setCv(file);
        else setAvatar(file);
      }),
    deleteFile: async (kind: "cv" | "avatar") =>
      command(kind, async () => {
        if (api)
          await apiRequest<unknown>(`/candidate/${kind}`, { method: "DELETE" });
        if (kind === "cv") {
          setCv(null);
          setCvUrl(null);
        } else {
          setAvatar(null);
          setAvatarUrl(null);
        }
      }),
    toggleSaved: async (id: number) => {
      if (api)
        await command(`saved:${id}`, async () => {
          const job = !knownJobs.current.has(id)
            ? mapJob((await apiRequest<unknown>(`/jobs/${id}`)).data)
            : null;
          await apiRequest<unknown>(`/jobs/${id}/save`, {
            method: savedIds.includes(id) ? "DELETE" : "POST",
          });
          if (job) {
            knownJobs.current.add(id);
            setJobs((current) => [...current, job]);
          }
        });
      setSavedIds((current) =>
        current.includes(id)
          ? current.filter((value) => value !== id)
          : [id, ...current],
      );
    },
    submitApplication: async (input: ApplyInput): Promise<ApplyResult> => {
      if (api) {
        try {
          return await command(`apply:${input.jobId}`, async () => {
            const body = new FormData();
            body.set("cover_letter", input.coverLetter.trim());
            body.set("cv_source", input.resumeExportId ? "builder" : input.useProfileCv ? "profile" : "new");
            if(input.resumeExportId)body.set("resume_export_id",String(input.resumeExportId));
            if (input.cv) body.set("cv_file", input.cv);
            const response = await apiRequest<unknown>(
              `/jobs/${input.jobId}/apply`,
              { method: "POST", body },
            );
            const application = candidateApplicationFromApi(response.data);
            applicationRecords.current = [
              application,
              ...applicationRecords.current,
            ];
            setApplications(applicationRecords.current);
            return { success: true as const, application };
          });
        } catch (error) {
          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Không thể nộp hồ sơ. Vui lòng thử lại.",
          };
        }
      }
      const job = jobs.find((item) => item.id === input.jobId);
      const error = applicationError(
        job,
        applicationRecords.current,
        input.coverLetter,
      );
      if (error) return { success: false, message: error };
      try {
        if (!input.cv)
          return { success: false, message: "Vui lòng chọn CV PDF." };
        const invalid = await validateCv(input.cv);
        if (invalid) return { success: false, message: invalid };
      } catch {
        return {
          success: false,
          message: "Không đọc được tệp CV. Vui lòng chọn lại.",
        };
      }
      // Recheck after reading the PDF: competing clicks must never add duplicates.
      const changed = applicationError(
        job,
        applicationRecords.current,
        input.coverLetter,
      );
      if (changed) return { success: false, message: changed };
      const application: Application = {
        id:
          Math.max(0, ...applicationRecords.current.map((item) => item.id)) + 1,
        job_id: input.jobId,
        status: "applied",
        created_at: new Date().toISOString(),
        cv_name: input.cv!.name,
        cover_letter: input.coverLetter.trim(),
      };
      applicationRecords.current = [application, ...applicationRecords.current];
      setApplications(applicationRecords.current);
      // Snapshot the submitted File; replacing the default CV cannot alter an application.
      setApplicationFiles((current) => ({
        ...current,
        [application.id]: input.cv!,
      }));
      return { success: true, application };
    },
    removeSaved: async (id: number) => {
      if (api)
        await command(`saved:${id}`, () =>
          apiRequest<unknown>(`/jobs/${id}/save`, { method: "DELETE" }),
        );
      setSavedIds((current) => current.filter((value) => value !== id));
    },
    withdraw: async (id: number) =>
      command(`withdraw:${id}`, async () => {
        await apiRequest<unknown>(`/candidate/applications/${id}/withdraw`, {
          method: "DELETE",
        });
        applicationRecords.current = applicationRecords.current.map((item) =>
          item.id === id
            ? { ...item, status: "withdrawn", can_withdraw: false }
            : item,
        );
        setApplications(applicationRecords.current);
      }),
    startConversation: async (jobId: number) =>
      command(`conversation:${jobId}`, async () => {
        const response = await apiRequest<unknown>("/conversations", {
          method: "POST",
          body: JSON.stringify({ job_id: jobId }),
        });
        const item = record(response.data);
        const id = Number(item.id);
        setConversations((current) =>
          current.some((conv) => conv.id === id)
            ? current
            : [
                ...current,
                {
                  id,
                  job_id: jobId,
                  contact:
                    jobs.find((job) => job.id === jobId)?.company.name ??
                    "Nhà tuyển dụng",
                },
              ],
        );
        return id;
      }),
    loadMessages: chat.loadMessages,
    setDraft: (id: number, value: string) =>
      setDrafts((current) => ({ ...current, [id]: value })),
    sendPreview: async (id: number, image?: File | null) => {
      const text = drafts[id] ?? "";
      const error = api && image && !text.trim() ? null : validateMessage(text);
      if (error || !conversations.some((item) => item.id === id))
        return error ?? "Không tìm thấy hội thoại.";
      if (api) {
        if (
          image &&
          (!/^image\/(jpeg|png|gif|webp)$/.test(image.type) ||
            image.size > 5 * 1024 * 1024)
        )
          return "Chọn ảnh JPEG, PNG, GIF hoặc WebP tối đa 5 MB.";
        if (chat.sending[id]) return "Tin nhắn đang được gửi, vui lòng chờ.";
        setDrafts((current) => ({
          ...current,
          [id]: current[id] === text ? "" : current[id],
        }));
        return chat.sendMessage(id, text, image);
      }
      const message: PreviewMessage = {
        id: crypto.randomUUID(),
        conversation_id: id,
        message: text.trim(),
        outgoing: true,
        preview: true,
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, message]);
      setDrafts((current) => ({ ...current, [id]: "" }));
      return null;
    },
    markRead: async (id?: number) => {
      if (api)
        await command(`notification:${id ?? "all"}`, () =>
          apiRequest<unknown>(
            id === undefined
              ? "/notifications/read-all"
              : `/notifications/${id}/read`,
            { method: "PATCH" },
          ),
        );
      setNotifications((current) =>
        current.map((item) =>
          !item.read_at && (id === undefined || item.id === id)
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
    },
  };
}
const WorkspaceContext = createContext<ReturnType<
  typeof useWorkspaceState
> | null>(null);
export function WorkspaceProvider({
  initial,
  children,
}: {
  initial: WorkspaceInitial;
  children: ReactNode;
}) {
  const value = useWorkspaceState(initial);
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Candidate workspace requires WorkspaceProvider");
  return value;
}
export function useOptionalWorkspace() {
  return useContext(WorkspaceContext);
}
