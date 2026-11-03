export type AdminRole = "admin" | "employer" | "candidate";
export type AdminUserStatus = "active" | "locked";
export type AdminJobStatus = "active" | "closed" | "expired";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  status: AdminUserStatus;
  created_at: string;
}

export interface AdminCompany {
  id: number;
  user_id: number;
  name: string;
  city: string;
  company_size: string;
  address: string;
  description: string;
}

export interface AdminJob {
  id: number;
  company_id: number;
  category_id: number;
  title: string;
  job_level: string;
  quantity: number;
  salary_min: number | null;
  salary_max: number | null;
  is_negotiable: boolean;
  job_type: "full_time" | "part_time" | "remote" | "internship";
  city: string;
  deadline: string;
  status: AdminJobStatus;
  is_reported: boolean;
  created_at: string;
  skills: number[];
  description: string;
  requirements: string;
  benefits: string;
  applications_count?: number;
  address?: string;
}

export interface AdminCategory {
  id: number;
  name: string;
}

export interface AdminSkill {
  id: number;
  name: string;
  candidates_count?: number;
}

export interface AdminApplication {
  id: number;
  job_id: number;
  candidate_user_id: number;
  created_at: string;
}

export interface AdminDatabase {
  stats?: AdminStats;
  categories: AdminCategory[];
  skills: AdminSkill[];
  users: AdminUser[];
  companies: AdminCompany[];
  jobs: AdminJob[];
  applications: AdminApplication[];
}

export interface AdminStats {
  users_count: number;
  total_candidates: number;
  total_employers: number;
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  reported_jobs: number;
  trends: { date: string; jobs_count: number; applications_count: number }[];
}

export interface TrendPoint {
  date: string;
  jobs: number;
  applications: number;
}

export type AdminPageKey =
  "overview" | "jobs" | "users" | "categories" | "skills";

export interface AdminNavItem {
  key: AdminPageKey;
  label: string;
  href: string;
  iconName: string;
  showReportCount?: boolean;
}
