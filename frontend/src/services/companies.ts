import "server-only";
import { cache } from "react";
import { getJobRepository } from "./jobs";
import { createCompanyProfiles } from "../mocks/companies";
import { companyOpenJobs } from "../features/companies/query";
import { authApiEnabled } from "./auth-mode";
import { backendRequest } from "./backend-api";
import { mapCompanyProfile, mapJob, record } from "@/features/jobs/api";
import { ApiError } from "@/features/api/types";
import { normalizeSearch } from "@/features/jobs/query";

export type CompanyListingQuery = {
  keyword: string;
  city: string;
  page: number;
};

export function parseCompanyListingQuery(
  params: Record<string, string | string[] | undefined>,
): CompanyListingQuery {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  const page = Number(first(params.page));
  return {
    keyword: first(params.keyword).trim().slice(0, 150),
    city: first(params.city).trim().slice(0, 100),
    page:
      Number.isSafeInteger(page) && page > 0 ? Math.min(page, 1_000_000) : 1,
  };
}

export async function getCompanyListing(query: CompanyListingQuery) {
  const perPage = 12;
  if (authApiEnabled()) {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(query.page),
    });
    if (query.keyword) params.set("keyword", query.keyword);
    if (query.city) params.set("city", query.city);
    const load = () =>
      backendRequest<unknown[]>(`/companies?${params}`, {}, false);
    let response = await load();
    const lastPage = Math.max(1, Number(response.meta?.last_page ?? 1));
    if (query.page > lastPage) {
      params.set("page", String(lastPage));
      response = await load();
    }
    return {
      data: response.data.map(mapCompanyProfile),
      meta: {
        total: Number(response.meta?.total ?? 0),
        page: Number(response.meta?.current_page ?? 1),
        last_page: Math.max(1, Number(response.meta?.last_page ?? 1)),
        per_page: perPage,
      },
    };
  }
  const { companies } = await repository();
  const keyword = normalizeSearch(query.keyword);
  const city = (value: string) =>
    normalizeSearch(value).replace(/^(?:tp\.?|thanh pho|tinh)\s+/, "");
  const filtered = companies
    .filter(
      (company) =>
        (!keyword ||
          normalizeSearch(
            `${company.name} ${company.description} ${company.address}`,
          ).includes(keyword)) &&
        (!query.city || city(company.city) === city(query.city)),
    )
    .sort((a, b) => b.id - a.id);
  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
  const page = Math.min(query.page, lastPage);
  return {
    data: filtered.slice((page - 1) * perPage, page * perPage),
    meta: {
      total: filtered.length,
      page,
      last_page: lastPage,
      per_page: perPage,
    },
  };
}

// Replace this read adapter with GET /api/companies when Laravel is ready.
const repository = cache(async () => {
  const { jobs, today } = await getJobRepository();
  return { companies: createCompanyProfiles(jobs, today), jobs, today };
});

// Share one public detail read between metadata, profile and vacancies within a render.
const readCompany = cache(async (id: string) =>
  record((await backendRequest<unknown>(`/companies/${id}`, {}, false)).data),
);

export async function getCompany(id: string | number) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
    return null;
  if (authApiEnabled()) {
    try {
      return mapCompanyProfile(await readCompany(String(id)));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }
  const { companies } = await repository();
  return companies.find((company) => company.id === Number(id)) ?? null;
}

export async function getCompanyJobs(id: number) {
  if (authApiEnabled()) {
    const company = await readCompany(String(id));
    const rows = Array.isArray(company.jobs) ? company.jobs : [];
    // Nested jobs may omit their parent company to avoid recursive resources.
    return rows
      .map((value) => mapJob({ ...record(value), company }))
      .filter((job) => job.status === "active");
  }
  const { jobs, today } = await repository();
  return companyOpenJobs(jobs, id, today);
}
