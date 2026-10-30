import type { Category, Company, Job, JobStatus } from "@/features/jobs/types";
import type { AuthUser } from "@/features/auth/types";
import type { AiAnalysis, AiStatus } from "./ai";

export const EMPLOYER_PAGES = [
  { key: "dashboard", href: "/employer", label: "Tổng quan" },
  { key: "jobs", href: "/employer/jobs", label: "Tin tuyển dụng" },
  { key: "candidates", href: "/employer/candidates", label: "Hồ sơ ứng viên" },
  { key: "messages", href: "/employer/messages", label: "Tin nhắn" },
  { key: "notifications", href: "/employer/notifications", label: "Thông báo" },
  { key: "company", href: "/employer/company", label: "Hồ sơ công ty" },
  { key: "post", href: "/employer/jobs/new", label: "Đăng tin tuyển dụng" },
] as const;
export type EmployerSection = (typeof EMPLOYER_PAGES)[number]["key"];
export const APPLICATION_LABELS = {
  applied: "Đã ứng tuyển",
  waiting: "Đang xem xét",
  accepted: "Trúng tuyển",
  rejected: "Từ chối",
  withdrawn: "Đã rút đơn",
} as const;
export type ApplicationStatus = keyof typeof APPLICATION_LABELS;
export type EmployerCompany = Company & {
  user_id: number;
  logo: string | null;
};
export type EmployerJob = Job & { views_count: number };
export type CompanyValues = Pick<
  EmployerCompany,
  "name" | "website" | "company_size" | "city" | "address" | "description"
>;
export type SalaryMode = "range" | "starting" | "negotiable";
export type JobValues = Pick<
  Job,
  | "title"
  | "category_id"
  | "job_level"
  | "quantity"
  | "city"
  | "address"
  | "job_type"
  | "deadline"
  | "description"
  | "requirements"
  | "benefits"
> & {
  salary_mode: SalaryMode;
  salary_min: string;
  salary_max: string;
  skill_ids: number[];
};
export interface EmployerApplication {
  id: number;
  job_id: number;
  candidate_id: number;
  candidate_user_id: number;
  name: string;
  avatar_url?: string | null;
  title: string;
  email: string;
  phone: string;
  city: string;
  experience_years: number;
  skills: string[];
  cover_letter: string;
  status: ApplicationStatus;
  reviewed_at: string | null;
  created_at: string;
  cv_path: string | null;
  analysis: AiAnalysis | null;
  analysis_status?: AiStatus;
  analysis_error?: string | null;
}
export interface EmployerConversation {
  id: number;
  job_id: number;
  candidate_id: number;
  employer_id: number;
  application_id: number;
}
export interface EmployerMessage {
  delivery?: "sending" | "failed";
  image_url?: string;
  id: string;
  conversation_id: number;
  sender_id: number;
  message: string;
  created_at: string;
  is_read: boolean;
}
export interface EmployerNotification {
  id: number;
  type: "new_applicant" | "new_message" | "withdrawn";
  title: string;
  content: string;
  href: string;
  read_at: string | null;
  created_at: string;
}
export interface EmployerData {
  mode?: "mock" | "api";
  user: AuthUser;
  today: string;
  company: EmployerCompany;
  jobs: EmployerJob[];
  applications: EmployerApplication[];
  conversations: EmployerConversation[];
  messages: EmployerMessage[];
  notifications: EmployerNotification[];
  categories: Category[];
  skills: { id: number; name: string }[];
  cities: string[];
}
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  active: "Đang tuyển",
  closed: "Đã đóng",
  expired: "Hết hạn",
};
