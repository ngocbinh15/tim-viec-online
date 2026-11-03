import type { ApiResponse } from "@/features/api/types";
import { readWorkspaceSnapshot } from "@/features/api/workspace";
import type {
  AdminCompany,
  AdminDatabase,
  AdminJob,
  AdminStats,
  AdminUser,
} from "./types";

export type AdminRequest = <T>(
  path: string,
  init?: RequestInit,
) => Promise<ApiResponse<T>>;
export type AdminJobDto = Omit<
  AdminJob,
  "skills" | "description" | "requirements" | "benefits"
> & {
  description?: string;
  requirements?: string;
  benefits?: string;
  is_expired?: boolean;
  skills?: { id: number; name: string }[];
  company?: AdminCompany;
};
type UserDto = AdminUser & { company?: AdminCompany | null };

export function mapAdminJob(dto: AdminJobDto): AdminJob {
  return {
    id: dto.id,
    company_id: dto.company_id,
    category_id: dto.category_id,
    title: dto.title,
    job_level: dto.job_level,
    quantity: dto.quantity,
    salary_min: dto.salary_min,
    salary_max: dto.salary_max,
    is_negotiable: dto.is_negotiable,
    job_type: dto.job_type,
    city: dto.city,
    address: dto.address,
    deadline: dto.deadline,
    is_reported: dto.is_reported,
    description: dto.description ?? "",
    requirements: dto.requirements ?? "",
    benefits: dto.benefits ?? "",
    applications_count: dto.applications_count,
    status: dto.status === "active" && dto.is_expired ? "expired" : dto.status,
    skills: (dto.skills ?? []).map((skill) => skill.id),
    created_at: dto.created_at?.slice(0, 10) ?? "",
  };
}

/** Exhaust every backend page; never treat the first page as the full workspace. */
export async function readAdminPages<T>(
  request: AdminRequest,
  path: string,
): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const response = await request<T[]>(
      `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
    );
    if (!Array.isArray(response.data))
      throw new Error("Dữ liệu quản trị không hợp lệ.");
    rows.push(...response.data);
    lastPage = Number(response.meta?.last_page ?? 1);
    if (!Number.isSafeInteger(lastPage) || lastPage < page)
      throw new Error("Phân trang quản trị không hợp lệ.");
    page++;
  } while (page <= lastPage);
  return rows;
}

export async function readAdminDatabase(
  request: AdminRequest,
): Promise<AdminDatabase> {
  const { users, jobs, categories, skills, stats } =
    await readWorkspaceSnapshot<{
      users: UserDto[];
      jobs: AdminJobDto[];
      categories: AdminDatabase["categories"];
      skills: (AdminDatabase["skills"][number] & {
        candidate_profiles_count?: number;
      })[];
      stats: AdminStats;
    }>(request, "admin");
  const companies = new Map<number, AdminCompany>();
  for (const user of users) {
    if (user.company)
      companies.set(user.company.id, { ...user.company, user_id: user.id });
  }
  for (const job of jobs) {
    if (job.company && !companies.has(job.company.id))
      companies.set(job.company.id, job.company);
  }
  return {
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone ?? "",
      created_at: user.created_at?.slice(0, 10) ?? "",
    })),
    companies: [...companies.values()],
    jobs: jobs.map(mapAdminJob),
    categories,
    skills: skills.map((skill) => ({
      ...skill,
      candidates_count:
        skill.candidate_profiles_count ?? skill.candidates_count ?? 0,
    })),
    applications: [],
    stats,
  };
}
