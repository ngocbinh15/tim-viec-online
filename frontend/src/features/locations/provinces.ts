import snapshot from "./provinces.snapshot.json";

export const PROVINCES_URL =
  "https://www.tinhthanhpho.com/api/v1/new-provinces";
export type Province = { code: string; name: string };
type ProvincePage = {
  data: Province[];
  total: number;
  page: number;
  limit: number;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseProvincePage(value: unknown): ProvincePage {
  if (
    !record(value) ||
    value.success !== true ||
    !Array.isArray(value.data) ||
    !record(value.metadata)
  )
    throw new Error("Invalid province response");
  const { total, page, limit } = value.metadata;
  if (
    !Number.isSafeInteger(total) ||
    (total as number) < 1 ||
    (total as number) > 1000 ||
    !Number.isSafeInteger(page) ||
    (page as number) < 1 ||
    !Number.isSafeInteger(limit) ||
    (limit as number) < 1 ||
    (limit as number) > 1000 ||
    value.data.length === 0 ||
    value.data.length > (limit as number)
  )
    throw new Error("Invalid province pagination");
  const data = value.data.map((item): Province => {
    if (
      !record(item) ||
      typeof item.code !== "string" ||
      !/^\d{2}$/.test(item.code) ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 100
    )
      throw new Error("Invalid province entry");
    return { code: item.code, name: item.name.trim() };
  });
  return {
    data,
    total: total as number,
    page: page as number,
    limit: limit as number,
  };
}

/** Fetch every page, even if the provider caps the requested limit. Never expose a partial catalog. */
export async function fetchProvinces(
  fetcher: typeof fetch = fetch,
): Promise<Province[]> {
  const provinces: Province[] = [];
  const signal = AbortSignal.timeout(5000);
  let expectedTotal: number | undefined;
  let expectedLimit: number | undefined;
  for (let page = 1; page <= 10; page++) {
    const response = await fetcher(`${PROVINCES_URL}?limit=100&page=${page}`, {
      headers: { Accept: "application/json" },
      signal,
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) throw new Error("Province service unavailable");
    const result = parseProvincePage(await response.json());
    expectedTotal ??= result.total;
    expectedLimit ??= result.limit;
    if (
      result.page !== page ||
      result.total !== expectedTotal ||
      result.limit !== expectedLimit
    )
      throw new Error("Province pagination changed during retrieval");
    provinces.push(...result.data);
    if (
      new Set(provinces.map((province) => province.code)).size !==
        provinces.length ||
      new Set(provinces.map((province) => province.name)).size !==
        provinces.length ||
      provinces.length > expectedTotal
    )
      throw new Error("Duplicate or inconsistent province data");
    if (provinces.length === expectedTotal)
      return provinces.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    if (result.data.length !== result.limit)
      throw new Error("Incomplete province page");
  }
  throw new Error("Province pagination exceeded its safe limit");
}

export async function loadProvinceCatalog(
  fetcher: typeof fetch = fetch,
): Promise<{
  provinces: Province[];
  source: "api" | "snapshot";
}> {
  try {
    return { provinces: await fetchProvinces(fetcher), source: "api" };
  } catch {
    // Verified from this same API, keeping the full selector usable offline.
    return {
      provinces: snapshot.provinces.map((province) => ({ ...province })),
      source: "snapshot",
    };
  }
}
