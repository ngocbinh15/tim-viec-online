import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import {
  formatSalary,
  isJobOpen,
  vietnamToday,
} from "../features/jobs/formatters";
import { filterJobs, paginateJobs } from "../features/jobs/query";
import { JOB_LEVELS, type Job, type JobQuery } from "../features/jobs/types";
import { createJobFixtures, JOB_CATEGORIES } from "../mocks/jobs";
import {
  createHomeJobFixtures,
  HOME_CATEGORIES,
  HOME_COMPANIES,
  HOME_FEATURED,
} from "../mocks/home";
import type {
  HomeJobCard,
  HomeCategory,
  HomeCompany,
} from "../features/home/types";
import { getProvinceNames } from "./locations";
import { authApiEnabled } from "./auth-mode";
import { backendAll, backendRequest } from "./backend-api";
import { ApiError } from "@/features/api/types";
import {
  mapJob,
  mapCompanyProfile,
  backendJobQuery,
  record,
} from "@/features/jobs/api";

// React cache deduplicates reads within one server render without caching private data across users.
export const getJobRepository = cache(async () => {
  await connection();
  const now = new Date();
  if (authApiEnabled())
    return {
      jobs: (await backendAll<unknown>("/jobs", false)).map(mapJob),
      today: vietnamToday(now),
    };
  return {
    jobs: [...createJobFixtures(now), ...createHomeJobFixtures(now)],
    today: vietnamToday(now),
  };
});

export const getHomeContent = cache(async function getHomeContent(): Promise<{
  jobs: HomeJobCard[];
  categories: HomeCategory[];
  companies: HomeCompany[];
}> {
  if (authApiEnabled()) {
    const [jobs, categoryResponse, companyResponse] = await Promise.all([
      getFeaturedHomeJobs(),
      backendRequest<unknown[]>("/categories", {}, false),
      backendRequest<unknown[]>("/companies?per_page=18", {}, false),
    ]);
    return {
      jobs,
      categories: categoryResponse.data.map((value) => {
        const category = record(value);
        return {
          name: String(category.name ?? ""),
          count: Number(category.jobs_count ?? category.active_jobs_count ?? 0),
          icon: "briefcase" as const,
          href: `/jobs?category_ids=${Number(category.id)}`,
        };
      }),
      companies: companyResponse.data.map(mapCompanyProfile).map((company) => ({
        id: company.id,
        name: company.name,
        mark: company.mark,
        logo: company.logo,
        brand: "generic",
        count: company.active_jobs_count,
        location: company.city,
      })),
    };
  }
  const { jobs, today } = await getJobRepository();
  const active = jobs.filter((job) => isJobOpen(job, today));
  const featuredIds = new Set(HOME_FEATURED.map((job) => job.id));
  const ordered = [
    ...HOME_FEATURED.flatMap((spec) =>
      active.filter((job) => job.id === spec.id),
    ),
    ...active.filter((job) => !featuredIds.has(job.id)),
  ];
  const cards: HomeJobCard[] = ordered.map((job) => {
    const presentation = HOME_FEATURED.find((spec) => spec.id === job.id);
    return {
      id: job.id,
      title: job.title,
      company: job.company.name,
      salary: formatSalary(job),
      city: job.city,
      mark:
        presentation?.mark ??
        job.company.name
          .split(" ")
          .map((word) => word[0])
          .slice(0, 3)
          .join(""),
      brand: presentation?.brand ?? "generic",
      featured: !!presentation,
    };
  });
  return {
    jobs: cards,
    categories: HOME_CATEGORIES,
    companies: HOME_COMPANIES.map((company) => ({
      ...company,
      count: active.filter((job) => job.company_id === company.id).length,
    })),
  };
});

// The shared header needs only job suggestions, not the homepage company catalog.
export const getFeaturedHomeJobs = cache(async (): Promise<HomeJobCard[]> => {
  if (!authApiEnabled()) return (await getHomeContent()).jobs;
  const listing = await backendRequest<unknown[]>(
    "/jobs?per_page=12",
    {},
    false,
  );
  return listing.data.map(mapJob).map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company.name,
    salary: formatSalary(job),
    city: job.city,
    logo: job.company.logo,
    mark: job.company.name
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 3)
      .join(""),
    brand: "generic",
    featured: false,
  }));
});

export async function listJobs(query: JobQuery) {
  if (authApiEnabled()) {
    const response = await backendRequest<unknown[]>(
      backendJobQuery(query),
      {},
      false,
    );
    const meta = response.meta;
    return {
      data: response.data.map(mapJob),
      meta: {
        total: Number(meta?.total ?? 0),
        page: Number(meta?.current_page ?? query.page),
        per_page: Number(meta?.per_page ?? 6),
        last_page: Math.max(1, Number(meta?.last_page ?? 1)),
      },
    };
  }
  const { jobs, today } = await getJobRepository();
  return paginateJobs(filterJobs(jobs, query, today), query.page);
}

export const getJob = cache(async function getJob(
  id: string | number,
): Promise<Job | null> {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
    return null;
  if (authApiEnabled()) {
    try {
      return mapJob(
        (await backendRequest<unknown>(`/jobs/${id}`, {}, false)).data,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }
  const { jobs } = await getJobRepository();
  return jobs.find((job) => job.id === Number(id)) ?? null;
});

export const getJobCatalog = cache(async function getJobCatalog() {
  if (authApiEnabled()) {
    const [response, cities] = await Promise.all([
      backendRequest<unknown[]>("/categories", {}, false),
      getProvinceNames(),
    ]);
    return {
      categories: response.data.map((value) => {
        const dto = record(value);
        return { id: Number(dto.id), name: String(dto.name) };
      }),
      cities,
      levels: [...JOB_LEVELS],
    };
  }
  return {
    categories: JOB_CATEGORIES,
    cities: await getProvinceNames(),
    levels: [...JOB_LEVELS],
  };
});

export async function findRelatedJobs(job: Job, limit = 3): Promise<Job[]> {
  if (authApiEnabled()) {
    const count =
      Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 99) : 3;
    const response = await backendRequest<unknown[]>(
      `/jobs?category_id=${job.category_id}&per_page=${count + 1}`,
      {},
      false,
    );
    return response.data
      .map(mapJob)
      .filter((item) => item.id !== job.id)
      .slice(0, count);
  }
  const { jobs, today } = await getJobRepository();
  const count = Number.isSafeInteger(limit) && limit > 0 ? limit : 3;
  return jobs
    .filter(
      (candidate) =>
        candidate.id !== job.id &&
        candidate.category_id === job.category_id &&
        isJobOpen(candidate, today),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id)
    .slice(0, count);
}
