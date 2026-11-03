import type { Company, Job, JobQuery } from "./types";
import type { CompanyProfile } from "../companies/types";
import { ApiError } from "../api/types";

export const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) => (typeof value === "string" ? value : "");
const amount = (value: unknown) =>
  value === null || value === undefined ? null : Number(value);

export function mapCompany(value: unknown): Company {
  const dto = record(value);
  const id = Number(dto.id);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new ApiError(502, "Dữ liệu công ty không hợp lệ.");
  return {
    id,
    name: text(dto.name),
    logo:
      typeof dto.avatar === "string"
        ? dto.avatar
        : typeof dto.logo === "string"
          ? dto.logo
          : null,
    avatar: typeof dto.avatar === "string" ? dto.avatar : null,
    is_demo: dto.is_demo === true,
    reference_sources:
      typeof record(dto.reference_sources).profile_url === "string"
        ? {
            profile_url: text(record(dto.reference_sources).profile_url),
            collected_at: text(record(dto.reference_sources).collected_at),
          }
        : null,
    company_size: text(dto.company_size ?? dto.size),
    website: typeof dto.website === "string" ? dto.website : null,
    address: text(dto.address),
    city: text(dto.city),
    description: text(dto.description),
  };
}

export function mapCompanyProfile(value: unknown): CompanyProfile {
  const dto = record(value);
  const company = mapCompany(dto);
  return {
    ...company,
    short_name: company.name,
    mark: company.name
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 3)
      .join(""),
    brand: "generic",
    industry_label: "Doanh nghiệp tuyển dụng",
    sectors: [],
    subtitle: company.city,
    summary: company.description,
    introduction: company.description.split(/\n+/).filter(Boolean),
    locations: company.address
      ? [{ city: company.city, address: company.address }]
      : [],
    active_jobs_count: Number(
      dto.active_jobs_count ?? (Array.isArray(dto.jobs) ? dto.jobs.length : 0),
    ),
  };
}

export function mapJob(value: unknown): Job {
  const dto = record(value);
  const id = Number(dto.id);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new ApiError(502, "Dữ liệu việc làm không hợp lệ.");
  const skills = Array.isArray(dto.skills)
    ? dto.skills
        .map(record)
        .map((s) => ({ id: Number(s.id), name: text(s.name) }))
    : [];
  const status =
    dto.status === "closed" || dto.status === "expired" ? dto.status : "active";
  const type = ["full_time", "part_time", "remote", "internship"].includes(
    String(dto.job_type),
  )
    ? (dto.job_type as Job["job_type"])
    : "full_time";
  return {
    id,
    company_id: Number(dto.company_id),
    category_id: Number(dto.category_id),
    title: text(dto.title),
    job_level: text(dto.job_level),
    quantity: Number(dto.quantity ?? 1),
    description: text(dto.description),
    requirements: text(dto.requirements),
    benefits: text(dto.benefits),
    salary_min: amount(dto.salary_min),
    salary_max: amount(dto.salary_max),
    is_negotiable: !!dto.is_negotiable,
    job_type: type,
    city: text(dto.city),
    address: text(dto.address),
    deadline: text(dto.deadline).slice(0, 10),
    status,
    created_at: text(dto.created_at),
    updated_at: text(dto.updated_at),
    company: mapCompany(dto.company),
    skills,
  };
}

export function backendJobQuery(query: JobQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    per_page: "6",
    sort: query.sort,
  });
  if (query.keyword) params.set("keyword", query.keyword.slice(0, 150));
  if (query.category_ids.length)
    params.set("category_id", query.category_ids.join(","));
  if (query.city) params.set("city", query.city);
  if (query.job_type) params.set("job_type", query.job_type);
  if (query.level) params.set("level", query.level);
  const salaries = {
    under10: "under_10m",
    "10to20": "10m_20m",
    over20: "above_20m",
    negotiable: "negotiable",
  };
  if (query.salary) params.set("salary_range", salaries[query.salary]);
  return `/jobs?${params}`;
}
