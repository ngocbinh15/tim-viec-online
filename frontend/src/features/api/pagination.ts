import { ApiError, type ApiResponse } from "./types";

export async function collectPages<T>(
  path: string,
  request: (path: string) => Promise<ApiResponse<unknown>>,
): Promise<T[]> {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  if (!params.has("per_page")) params.set("per_page", pathname === "/notifications" ? "50" : "100");
  const result: T[] = [];
  let page = 1;
  while (true) {
    params.set("page", String(page));
    const response = await request(`${pathname}?${params}`);
    const nested = response.data && typeof response.data === "object" && !Array.isArray(response.data)
      ? response.data as Record<string, unknown> : null;
    const items = Array.isArray(response.data) ? response.data : nested?.data;
    if (!Array.isArray(items)) throw new ApiError(502, "Danh sách trả về không hợp lệ.");
    result.push(...items as T[]);
    const pagination = response.meta ?? response.pagination ?? nested;
    const last = pagination && typeof pagination === "object" && "last_page" in pagination
      ? Number(pagination.last_page) : page;
    if (!Number.isSafeInteger(last) || last < 1) throw new ApiError(502, "Phân trang trả về không hợp lệ.");
    if (page >= last) return result;
    if (!items.length) throw new ApiError(502, "Dữ liệu phân trang chưa đầy đủ. Vui lòng thử lại.");
    page += 1;
  }
}
