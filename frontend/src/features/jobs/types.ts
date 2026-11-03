export const JOB_TYPE_LABELS = {
  full_time: "Toàn thời gian",
  part_time: "Bán thời gian",
  remote: "Từ xa",
  internship: "Thực tập",
} as const;

export const JOB_LEVELS = [
  "Intern",
  "Fresher",
  "Junior",
  "Middle",
  "Senior",
  "Lead",
  "Manager",
  "Director",
] as const;

export type JobType = keyof typeof JOB_TYPE_LABELS;
export type JobStatus = "active" | "closed" | "expired";
export type SalaryFilter = "" | "under10" | "10to20" | "over20" | "negotiable";

export const JOB_SORT_LABELS = {
  default: "Mặc định",
  relevance: "Liên quan nhất",
  salary_desc: "Lương (cao - thấp)",
  newest: "Ngày đăng (mới nhất)",
} as const;
export type JobSort = keyof typeof JOB_SORT_LABELS;

export interface Company {
  id: number;
  name: string;
  logo?: string | null;
  avatar?: string | null;
  is_demo?: boolean;
  reference_sources?: { profile_url: string; collected_at: string } | null;
  company_size: string;
  website: string | null;
  address: string;
  city: string;
  description: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Job {
  id: number;
  company_id: number;
  category_id: number;
  title: string;
  job_level: string;
  quantity: number;
  description: string;
  requirements: string;
  benefits: string;
  salary_min: number | null;
  salary_max: number | null;
  is_negotiable: boolean;
  job_type: JobType;
  city: string;
  address: string;
  deadline: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  company: Company;
  skills: { id: number; name: string }[];
}

export interface JobQuery {
  keyword: string;
  category_ids: number[];
  city: string;
  job_type: JobType | "";
  salary: SalaryFilter;
  level: string;
  sort: JobSort;
  page: number;
}

export interface JobPage {
  data: Job[];
  meta: { total: number; page: number; per_page: number; last_page: number };
}
