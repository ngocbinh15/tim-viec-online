import { ApiError, apiFailure, type ApiResponse } from "./types";
import { allowedBackendPath } from "./paths";
import { collectPages } from "./pagination";
export { ApiError } from "./types";

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  if (!allowedBackendPath(path, init.method ?? "GET")) throw new ApiError(400, "Yêu cầu không hợp lệ.");
  const headers = new Headers(init.headers);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`/api/backend${path}`, { ...init, headers, credentials: "same-origin", cache: "no-store", signal: init.signal ?? AbortSignal.timeout(25_000) });
  } catch { throw apiFailure(503); }
  if (response.status === 204) return { success: true, data: null as T };
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) throw apiFailure(response.status, value);
  if (!value || typeof value !== "object" || !("success" in value) || value.success !== true) throw apiFailure(502);
  return value as ApiResponse<T>;
}

export const apiAll = <T>(path: string) => collectPages<T>(path, apiRequest<unknown>);
