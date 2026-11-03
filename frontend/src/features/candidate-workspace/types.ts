import type { Job } from "@/features/jobs/types";

export const APPLICATION_LABELS = {
  applied: "Đã ứng tuyển",
  waiting: "Đang xem xét",
  accepted: "Trúng tuyển",
  rejected: "Từ chối",
} as const;
export const API_APPLICATION_LABELS = {
  ...APPLICATION_LABELS,
  withdrawn: "Đã rút hồ sơ",
} as const;
export type ApplicationStatus = keyof typeof API_APPLICATION_LABELS;
export type CandidateSection =
  "profile" | "resumes" | "jobs" | "messages" | "notifications" | "settings";
export type Application = {
  id: number;
  job_id: number;
  status: ApplicationStatus;
  created_at: string;
  cv_name?: string;
  cover_letter?: string;
  cv_url?: string;
  can_withdraw?: boolean;
};
export type PreviewMessage = {
  delivery?: "sending" | "failed";
  id: string;
  conversation_id: number;
  message: string;
  outgoing: boolean;
  created_at: string;
  preview?: boolean;
  image_url?: string;
  read_at?: string | null;
};
export type Conversation = { id: number; job_id: number; contact: string };
export type CandidateNotification = {
  id: number;
  title: string;
  content: string;
  type: "new_message" | "app_status_changed";
  read_at: string | null;
  created_at: string;
  conversation_id?: number;
  application_id?: number;
};
export type CandidatePreviewData = {
  mode?: "mock" | "api";
  userId?: number;
  emailVerifiedAt?: string | null;
  cvUrl?: string | null;
  avatarUrl?: string | null;
  skills?: { id: number; name: string }[];
  jobs: Job[];
  today: string;
  applications: Application[];
  savedIds: number[];
  conversations: Conversation[];
  messages: PreviewMessage[];
  notifications: CandidateNotification[];
};

export function profileEmailVerifiedAt(
  previousEmail: string,
  nextEmail: string,
  previousTimestamp: string | null,
  serverTimestamp: unknown,
): string | null {
  if (serverTimestamp === null) return null;
  if (serverTimestamp !== undefined)
    return typeof serverTimestamp === "string" &&
      /^\d{4}-\d\d-\d\dT/.test(serverTimestamp) &&
      Number.isFinite(Date.parse(serverTimestamp))
      ? serverTimestamp
      : null;
  return previousEmail.trim().toLowerCase() === nextEmail.trim().toLowerCase()
    ? previousTimestamp
    : null;
}

export const CANDIDATE_PAGES: { key: CandidateSection; label: string }[] = [
  { key: "profile", label: "Hồ sơ của tôi" },
  { key: "resumes", label: "CV của tôi" },
  { key: "jobs", label: "Việc làm của tôi" },
  { key: "messages", label: "Tin nhắn" },
  { key: "notifications", label: "Thông báo" },
  { key: "settings", label: "Quản lý tài khoản" },
];

export function candidateHref(section: CandidateSection) {
  return `/account/${section}`;
}
