import type { ApiResponse } from "@/features/api/types";
import { readWorkspaceSnapshot } from "@/features/api/workspace";
import { aiStatus, parseAiAnalysis, safeAiError } from "./ai";
import type { AuthUser } from "@/features/auth/types";
import type { Category } from "@/features/jobs/types";
import type {
  EmployerApplication,
  EmployerCompany,
  EmployerConversation,
  EmployerData,
  EmployerJob,
  EmployerMessage,
  EmployerNotification,
  JobValues,
} from "./types";

export type Requester = <T>(
  path: string,
  init?: RequestInit,
) => Promise<ApiResponse<T>>;
type RawCompany = Partial<EmployerCompany> & { id: number; name: string };
export type RawApplication = Pick<
  EmployerApplication,
  | "id"
  | "job_id"
  | "candidate_id"
  | "status"
  | "reviewed_at"
  | "created_at"
  | "cover_letter"
> & {
  ai_analysis?: unknown;
  ai_analysis_status?: unknown;
  ai_analysis_error?: unknown;
  cv_url: string | null;
  candidate: {
    user_id: number;
    name: string;
    avatar_url?: string | null;
    email: string;
    phone: string | null;
    title: string | null;
    city: string | null;
    experience_years: number;
    skills: { name: string }[];
  };
};
export type RawConversation = {
  id: number;
  job_id: number;
  candidate_id?: number;
  employer_id?: number;
  application_id?: number;
  partner: { id: number };
  last_message: RawMessage | null;
};
export type RawMessage = Omit<EmployerMessage, "id"> & {
  id: number | string;
  image_url?: string | null;
};
type RawNotification = Omit<EmployerNotification, "href" | "type"> & {
  type: string;
  data?: { application_id?: number; conversation_id?: number; job_id?: number };
};

/** Follow the backend's pagination metadata, never truncate silently at a fixed cap. */
export async function allPages<T>(
  request: Requester,
  path: string,
): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  let last = 1;
  do {
    const response = await request<T[]>(
      `${path}${path.includes("?") ? "&" : "?"}per_page=50&page=${page}`,
    );
    if (!Array.isArray(response.data))
      throw new Error("Dữ liệu máy chủ không hợp lệ.");
    rows.push(...response.data);
    last = Number(response.meta?.last_page ?? 1);
    if (!Number.isSafeInteger(last) || last < page)
      throw new Error("Thông tin phân trang không hợp lệ.");
    page++;
  } while (page <= last);
  return rows;
}
export function mapCompany(raw: RawCompany, userId: number): EmployerCompany {
  return {
    id: raw.id,
    user_id: userId,
    name: raw.name,
    logo: raw.logo ?? null,
    website: raw.website ?? null,
    company_size: raw.company_size ?? "",
    address: raw.address ?? "",
    city: raw.city ?? "",
    description: raw.description ?? "",
  };
}
export function mapJob(
  raw: EmployerJob,
  company: EmployerCompany,
): EmployerJob {
  return {
    ...raw,
    company,
    views_count: Number(raw.views_count ?? 0),
    skills: raw.skills ?? [],
    address: raw.address ?? "",
    benefits: raw.benefits ?? "",
    job_level: raw.job_level ?? "",
    deadline: raw.deadline.slice(0, 10),
  };
}
export function mapApplication(raw: RawApplication): EmployerApplication {
  const person = raw.candidate;
  return {
    id: raw.id,
    job_id: raw.job_id,
    candidate_id: raw.candidate_id,
    candidate_user_id: person.user_id,
    name: person.name,
    avatar_url: person.avatar_url ?? null,
    email: person.email,
    phone: person.phone ?? "",
    title: person.title ?? "",
    city: person.city ?? "",
    experience_years: Number(person.experience_years ?? 0),
    skills: (person.skills ?? []).map((s) => s.name),
    cover_letter: raw.cover_letter ?? "",
    status: raw.status,
    reviewed_at: raw.reviewed_at,
    created_at: raw.created_at,
    cv_path: raw.cv_url ? `/api/backend/applications/${raw.id}/cv` : null,
    analysis: raw.ai_analysis ? parseAiAnalysis(raw.ai_analysis) : null,
    analysis_status: aiStatus(raw.ai_analysis_status)
      ? raw.ai_analysis_status
      : raw.ai_analysis
        ? "completed"
        : "deferred",
    analysis_error:
      raw.ai_analysis_status === "failed"
        ? safeAiError(raw.ai_analysis_error)
        : null,
  };
}
export function mapMessage(raw: RawMessage): EmployerMessage {
  return {
    id: String(raw.id),
    conversation_id: raw.conversation_id,
    sender_id: raw.sender_id,
    message: raw.message ?? "",
    created_at: raw.created_at,
    is_read: Boolean(raw.is_read),
    ...(raw.image_url
      ? {
          image_url: `/api/backend/conversations/${raw.conversation_id}/messages/${raw.id}/image`,
        }
      : {}),
  };
}
export function mapConversation(
  raw: RawConversation,
  applications: EmployerApplication[],
  userId: number,
): EmployerConversation {
  const candidateId = raw.candidate_id ?? raw.partner.id;
  const app = applications.find(
    (a) => a.job_id === raw.job_id && a.candidate_user_id === candidateId,
  );
  return {
    id: raw.id,
    job_id: raw.job_id,
    candidate_id: candidateId,
    employer_id: raw.employer_id ?? userId,
    application_id: raw.application_id ?? app?.id ?? 0,
  };
}
export function mapNotification(raw: RawNotification): EmployerNotification {
  const data = raw.data ?? {};
  return {
    ...raw,
    type:
      raw.type === "new_message"
        ? "new_message"
        : raw.type === "withdrawn"
          ? "withdrawn"
          : "new_applicant",
    href: data.conversation_id
      ? `/employer/messages?conversation=${data.conversation_id}`
      : data.application_id
        ? `/employer/candidates/${data.application_id}`
        : data.job_id
          ? `/employer/candidates?job_id=${data.job_id}`
          : "/employer/notifications",
  };
}
export function jobPayload(values: JobValues) {
  return {
    ...values,
    salary_type: values.salary_mode,
    is_negotiable: values.salary_mode === "negotiable",
    salary_min:
      values.salary_mode === "negotiable" ? null : Number(values.salary_min),
    salary_max:
      values.salary_mode === "range" ? Number(values.salary_max) : null,
    skills: values.skill_ids,
  };
}
export async function loadEmployerApi(
  request: Requester,
  user: AuthUser,
  cities: string[],
  today: string,
): Promise<EmployerData> {
  const {
    company: rawCompany,
    jobs: rawJobs,
    applications: rawApplications,
    conversations,
    notifications: rawNotifications,
    categories,
    skills,
  } = await readWorkspaceSnapshot<{
    company: RawCompany;
    jobs: EmployerJob[];
    applications: RawApplication[];
    conversations: RawConversation[];
    notifications: RawNotification[];
    categories: Category[];
    skills: { id: number; name: string }[];
  }>(request, "employer");
  const company = mapCompany(rawCompany, user.id);
  const applications = rawApplications.map(mapApplication);
  return {
    mode: "api",
    user,
    today,
    company,
    jobs: rawJobs.map((j) => mapJob(j, company)),
    applications,
    conversations: conversations.map((c) =>
      mapConversation(c, applications, user.id),
    ),
    messages: conversations.flatMap((c) =>
      c.last_message
        ? [mapMessage({ ...c.last_message, conversation_id: c.id })]
        : [],
    ),
    notifications: rawNotifications.map(mapNotification),
    categories,
    skills,
    cities,
  };
}
