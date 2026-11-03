"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  liveConversations,
  useBackendEvent,
  useLiveRefresh,
} from "@/features/api/live";
import { useChatMessages } from "@/features/chat/use-chat-messages";
import {
  mergeChatMessages,
  receiptIncludesMessage,
} from "@/features/chat/updates";
import type {
  ApplicationStatus,
  CompanyValues,
  EmployerData,
  JobValues,
} from "@/features/employer/types";
import {
  companyReady,
  effectiveJobStatus,
  jobFromValues,
  validateCompany,
  validateJob,
} from "@/features/employer/rules";
import { apiRequest } from "@/features/api/client";
import {
  jobPayload,
  loadEmployerApi,
  mapApplication,
  mapCompany,
  mapJob,
  mapMessage,
  mapNotification,
  type RawApplication,
  type RawMessage,
} from "@/features/employer/api";
import type { EmployerJob } from "@/features/employer/types";
import { vietnamToday } from "@/features/jobs/formatters";
import { parseAiState, type AiState } from "@/features/employer/ai";

function useEmployerState(initial: EmployerData) {
  const apiMode = initial.mode === "api";
  const [company, setCompany] = useState(initial.company);
  const [logo, setLogo] = useState<File | null>(null);
  const [jobs, setJobs] = useState(initial.jobs);
  const [applications, setApplications] = useState(initial.applications);
  const [conversations, setConversations] = useState(initial.conversations);
  const chat = useChatMessages(
    initial.messages,
    apiMode,
    (raw) => mapMessage(raw as RawMessage),
    initial.user.id,
  );
  const { messages, setMessages, loadMessages } = chat;
  const [notifications, setNotifications] = useState(initial.notifications);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const revision = useRef(0);
  const [loadError, setLoadError] = useState("");
  const mock = {
    ...initial,
    company,
    logo,
    setLogo,
    jobs,
    applications,
    conversations,
    messages,
    notifications,
    drafts,
    saveCompany: (values: CompanyValues) => {
      const errors = validateCompany(values);
      if (!Object.keys(errors).length)
        setCompany((current) => ({ ...current, ...values }));
      return errors;
    },
    saveJob: (
      values: JobValues,
      id?: number,
    ): { id?: number; errors: Record<string, string> } => {
      const today = vietnamToday(new Date());
      const errors = validateJob(values, today);
      if (!companyReady(company))
        errors.company = "Hoàn thiện hồ sơ công ty trước khi đăng tin.";
      if (
        !initial.categories.some(
          (category) => category.id === values.category_id,
        )
      )
        errors.category_id = "Ngành nghề không hợp lệ.";
      if (
        !values.skill_ids.every((skill) =>
          initial.skills.some((item) => item.id === skill),
        )
      )
        errors.skill_ids = "Kỹ năng không hợp lệ.";
      const previous =
        id === undefined
          ? undefined
          : jobs.find((job) => job.id === id && job.company_id === company.id);
      if (id !== undefined && !previous)
        errors.job = "Không tìm thấy tin tuyển dụng.";
      if (Object.keys(errors).length) return { errors };
      const nextId = id ?? Math.max(0, ...jobs.map((job) => job.id)) + 1;
      const job = jobFromValues(
        values,
        company,
        nextId,
        initial.skills,
        previous,
      );
      setJobs((current) =>
        previous
          ? current.map((item) => (item.id === id ? job : item))
          : [job, ...current],
      );
      return { id: nextId, errors: {} };
    },
    changeJobStatus: (id: number, status: "active" | "closed") => {
      const job = jobs.find(
        (item) => item.id === id && item.company_id === company.id,
      );
      if (!job) return "Không tìm thấy tin tuyển dụng.";
      if (
        status === "active" &&
        (job.deadline <= vietnamToday(new Date()) ||
          effectiveJobStatus(job, vietnamToday(new Date())) === "expired")
      )
        return "Cập nhật hạn nộp trong tương lai trước khi mở lại tin.";
      setJobs((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, status, updated_at: new Date().toISOString() }
            : item,
        ),
      );
      return null;
    },
    reviewApplication: (id: number) =>
      setApplications((current) =>
        current.map((app) =>
          app.id === id && app.status === "applied" && app.cv_path
            ? {
                ...app,
                status: "waiting",
                reviewed_at: app.reviewed_at ?? new Date().toISOString(),
              }
            : app,
        ),
      ),
    setApplicationStatus: (id: number, status: ApplicationStatus) => {
      const app = applications.find((item) => item.id === id);
      if (
        !app ||
        app.status === "withdrawn" ||
        !(
          status === "accepted" ||
          status === "rejected" ||
          (status === "waiting" && !!app.reviewed_at)
        )
      )
        return "Không thể cập nhật hồ sơ đã rút hoặc không tồn tại.";
      setApplications((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      return null;
    },
    openConversation: (applicationId: number) => {
      const app = applications.find((item) => item.id === applicationId);
      if (
        !app ||
        !jobs.some(
          (job) => job.id === app.job_id && job.company_id === company.id,
        )
      )
        return null;
      const existing = conversations.find(
        (item) => item.application_id === applicationId,
      );
      if (existing) return existing.id;
      if (app.status === "withdrawn") return null;
      const id = Math.max(0, ...conversations.map((item) => item.id)) + 1;
      setConversations((current) => [
        ...current,
        {
          id,
          application_id: app.id,
          candidate_id: app.candidate_user_id,
          employer_id: initial.user.id,
          job_id: app.job_id,
        },
      ]);
      return id;
    },
    setDraft: (id: number, text: string) =>
      setDrafts((current) => ({ ...current, [id]: text })),
    sendMessage: (id: number) => {
      const message = (drafts[id] ?? "").trim();
      if (!message || message.length > 1000)
        return "Nhập tin nhắn từ 1 đến 1.000 ký tự.";
      if (
        !conversations.some(
          (conv) => conv.id === id && conv.employer_id === initial.user.id,
        )
      )
        return "Không tìm thấy hội thoại.";
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          conversation_id: id,
          sender_id: initial.user.id,
          message,
          created_at: new Date().toISOString(),
          is_read: false,
        },
      ]);
      setDrafts((current) => ({ ...current, [id]: "" }));
      return null;
    },
    markConversationRead: (id: number) =>
      setMessages((current) =>
        current.map((message) =>
          message.conversation_id === id &&
          message.sender_id !== initial.user.id
            ? { ...message, is_read: true }
            : message,
        ),
      ),
    markRead: (id?: number) =>
      setNotifications((current) =>
        current.map((notification) =>
          id === undefined || notification.id === id
            ? {
                ...notification,
                read_at: notification.read_at ?? new Date().toISOString(),
              }
            : notification,
        ),
      ),
  };
  const refresh = useCallback(async () => {
    if (!apiMode || busy.current) return;
    const version = revision.current;
    try {
      const data = await loadEmployerApi(
        apiRequest,
        initial.user,
        initial.cities,
        vietnamToday(new Date()),
      );
      if (busy.current || version !== revision.current) return;
      setCompany(data.company);
      setJobs(data.jobs);
      setApplications(data.applications);
      setConversations(data.conversations);
      setNotifications(data.notifications);
      setMessages((current) => mergeChatMessages(current, data.messages));
      setLoadError("");
    } catch (error) {
      if (busy.current || version !== revision.current) return;
      setLoadError(
        error instanceof Error ? error.message : "Không tải được cập nhật.",
      );
    }
  }, [apiMode, initial.user, initial.cities, setMessages]);
  useLiveRefresh(refresh, apiMode);
  useBackendEvent(
    "backend:message",
    (message) => {
      if (!conversations.some((item) => item.id === message.conversation_id))
        return;
      setMessages((current) =>
        mergeChatMessages(current, [
          mapMessage({
            ...message,
            image_url: message.image_url ?? undefined,
            is_read: Boolean(message.is_read),
          }),
        ]),
      );
    },
    apiMode,
  );
  useBackendEvent(
    "backend:messages-read",
    (receipt) => {
      setMessages((current) =>
        current.map((message) =>
          receiptIncludesMessage(receipt, message, message.sender_id)
            ? { ...message, is_read: true }
            : message,
        ),
      );
    },
    apiMode,
  );
  useBackendEvent(
    "backend:notification",
    (notification) => {
      const mapped = mapNotification(notification);
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
        void refresh();
      else if (
        notification.type === "new_message" &&
        notification.data?.conversation_id &&
        !liveConversations().includes(notification.data.conversation_id)
      ) {
        const id = notification.data.conversation_id;
        void apiRequest<RawMessage[]>(
          `/conversations/${id}/messages?latest=1&per_page=1`,
        )
          .then((response) =>
            setMessages((current) =>
              mergeChatMessages(current, response.data.map(mapMessage)),
            ),
          )
          .catch(() => {});
      }
    },
    apiMode,
  );
  function errors(error: unknown): Record<string, string> {
    const result: Record<string, string> = {};
    if (
      error &&
      typeof error === "object" &&
      "errors" in error &&
      error.errors &&
      typeof error.errors === "object"
    ) {
      for (const [key, value] of Object.entries(error.errors))
        result[
          key === "skills" || key.startsWith("skills.") ? "skill_ids" : key
        ] = Array.isArray(value) ? String(value[0]) : String(value);
    }
    return Object.keys(result).length
      ? result
      : {
          form:
            error instanceof Error
              ? error.message
              : "Không thể lưu thay đổi. Vui lòng thử lại.",
        };
  }
  async function write<T>(operation: () => Promise<T>): Promise<T> {
    if (busy.current) throw new Error("Đang lưu thay đổi, vui lòng chờ.");
    busy.current = true;
    revision.current++;
    setPending(true);
    try {
      return await operation();
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  const loadConversation = useCallback(
    async (id: number, older = false) => {
      if (!apiMode) return;
      try {
        await loadMessages(id, older);
        setLoadError("");
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Không tải được tin nhắn.",
        );
      }
    },
    [apiMode, loadMessages],
  );
  const readAnalysis = useCallback(
    async (id: number, signal?: AbortSignal): Promise<AiState> => {
      const result = parseAiState(
        (
          await apiRequest<unknown>(`/applications/${id}/ai-analysis`, {
            signal,
          })
        ).data,
      );
      revision.current++;
      setApplications((current) =>
        current.map((app) =>
          app.id === id
            ? {
                ...app,
                analysis: result.analysis,
                analysis_status: result.status,
                analysis_error: result.error,
              }
            : app,
        ),
      );
      return result;
    },
    [],
  );
  const requestAnalysis = useCallback(async (id: number): Promise<AiState> => {
    revision.current++;
    const result = parseAiState(
      (
        await apiRequest<unknown>(`/applications/${id}/ai-analyze`, {
          method: "POST",
        })
      ).data,
    );
    revision.current++;
    setApplications((current) =>
      current.map((app) =>
        app.id === id
          ? {
              ...app,
              analysis: result.analysis,
              analysis_status: result.status,
              analysis_error: result.error,
            }
          : app,
      ),
    );
    return result;
  }, []);
  const markConversationRead = useCallback(
    async (id: number) => {
      try {
        if (apiMode)
          await apiRequest(`/conversations/${id}/read`, { method: "PATCH" });
        setMessages((current) =>
          current.map((message) =>
            message.conversation_id === id &&
            message.sender_id !== initial.user.id
              ? { ...message, is_read: true }
              : message,
          ),
        );
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Không cập nhật được tin nhắn.",
        );
      }
    },
    [apiMode, initial.user.id, setMessages],
  );
  return {
    ...mock,
    apiMode,
    pending,
    loadError,
    messageHistory: chat.history,
    messageSending: chat.sending,
    retryMessage: chat.retryMessage,
    refresh,
    readAnalysis,
    requestAnalysis,
    saveCompany: async (values: CompanyValues) => {
      if (!apiMode) return mock.saveCompany(values);
      const issues = validateCompany(values);
      if (Object.keys(issues).length) return issues;
      try {
        await write(async () => {
          const body = new FormData();
          Object.entries(values).forEach(([key, value]) =>
            body.set(key, value ?? ""),
          );
          if (logo) body.set("logo", logo);
          const response = await apiRequest<Parameters<typeof mapCompany>[0]>(
            "/employer/company",
            { method: "POST", body },
          );
          const savedCompany = mapCompany(response.data, initial.user.id);
          setCompany(savedCompany);
          setJobs((current) =>
            current.map((job) => ({ ...job, company: savedCompany })),
          );
          setLogo(null);
        });
        return {};
      } catch (error) {
        return errors(error);
      }
    },
    saveJob: async (values: JobValues, id?: number) => {
      if (!apiMode) return mock.saveJob(values, id);
      const issues = validateJob(values, vietnamToday(new Date()));
      if (Object.keys(issues).length) return { errors: issues };
      try {
        const saved = await write(async () => {
          const response = await apiRequest<EmployerJob>(
            id ? `/employer/jobs/${id}` : "/employer/jobs",
            {
              method: id ? "PUT" : "POST",
              body: JSON.stringify(jobPayload(values)),
            },
          );
          const job = mapJob(response.data, company);
          setJobs((current) => [
            job,
            ...current.filter((item) => item.id !== job.id),
          ]);
          return job.id;
        });
        return { id: saved, errors: {} as Record<string, string> };
      } catch (error) {
        return { errors: errors(error) };
      }
    },
    changeJobStatus: async (id: number, status: "active" | "closed") => {
      if (!apiMode) return mock.changeJobStatus(id, status);
      try {
        await write(async () => {
          await apiRequest(`/employer/jobs/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
          });
          setJobs((current) =>
            current.map((job) =>
              job.id === id
                ? { ...job, status, updated_at: new Date().toISOString() }
                : job,
            ),
          );
        });
        return null;
      } catch (error) {
        return Object.values(errors(error))[0];
      }
    },
    reviewApplication: async (id: number) => {
      if (!apiMode) {
        mock.reviewApplication(id);
        return null;
      }
      try {
        await write(async () => {
          const response = await apiRequest<RawApplication>(
            `/employer/applications/${id}`,
          );
          setApplications((current) =>
            current.map((app) =>
              app.id === id ? mapApplication(response.data) : app,
            ),
          );
        });
        return null;
      } catch (error) {
        return Object.values(errors(error))[0];
      }
    },
    setApplicationStatus: async (id: number, status: ApplicationStatus) => {
      if (!apiMode) return mock.setApplicationStatus(id, status);
      try {
        await write(async () => {
          const response = await apiRequest<RawApplication>(
            `/employer/applications/${id}/status`,
            { method: "PATCH", body: JSON.stringify({ status }) },
          );
          setApplications((current) =>
            current.map((app) =>
              app.id === id
                ? {
                    ...app,
                    status: response.data.status,
                    reviewed_at: response.data.reviewed_at,
                  }
                : app,
            ),
          );
        });
        return null;
      } catch (error) {
        return Object.values(errors(error))[0];
      }
    },
    openConversation: async (applicationId: number) => {
      if (!apiMode) return mock.openConversation(applicationId);
      const app = applications.find((item) => item.id === applicationId);
      if (!app) return null;
      const existing = conversations.find(
        (item) => item.application_id === applicationId,
      );
      if (existing) return existing.id;
      try {
        return await write(async () => {
          const response = await apiRequest<{ id: number }>("/conversations", {
            method: "POST",
            body: JSON.stringify({
              job_id: app.job_id,
              partner_id: app.candidate_user_id,
            }),
          });
          setConversations((current) => [
            ...current.filter((c) => c.id !== response.data.id),
            {
              id: response.data.id,
              application_id: app.id,
              candidate_id: app.candidate_user_id,
              employer_id: initial.user.id,
              job_id: app.job_id,
            },
          ]);
          return response.data.id;
        });
      } catch (error) {
        setLoadError(Object.values(errors(error))[0]);
        return null;
      }
    },
    sendMessage: async (id: number, image?: File | null) => {
      if (!apiMode) return mock.sendMessage(id);
      const message = (drafts[id] ?? "").trim();
      if ((!message && !image) || message.length > 1000)
        return "Nhập tin nhắn từ 1 đến 1.000 ký tự hoặc chọn ảnh.";
      if (
        image &&
        (!/^image\/(jpeg|png|gif|webp)$/.test(image.type) ||
          image.size > 5 * 1024 * 1024)
      )
        return "Chọn ảnh JPEG, PNG, GIF hoặc WebP tối đa 5 MB.";
      if (chat.sending[id]) return "Tin nhắn đang được gửi, vui lòng chờ.";
      setDrafts((current) => ({
        ...current,
        [id]: current[id]?.trim() === message ? "" : current[id],
      }));
      return chat.sendMessage(id, message, image);
    },
    loadConversation,
    markConversationRead,
    markRead: async (id?: number) => {
      if (!apiMode) return mock.markRead(id);
      try {
        await write(async () => {
          await apiRequest(
            id ? `/notifications/${id}/read` : "/notifications/read-all",
            { method: "PATCH" },
          );
          mock.markRead(id);
        });
        return null;
      } catch (error) {
        return Object.values(errors(error))[0];
      }
    },
  };
}
const EmployerContext = createContext<ReturnType<
  typeof useEmployerState
> | null>(null);
export function EmployerProvider({
  initial,
  children,
}: {
  initial: EmployerData;
  children: ReactNode;
}) {
  const state = useEmployerState(initial);
  return (
    <EmployerContext.Provider value={state}>
      {children}
    </EmployerContext.Provider>
  );
}
export function useEmployer() {
  const context = useContext(EmployerContext);
  if (!context) throw new Error("Employer workspace is unavailable.");
  return context;
}
