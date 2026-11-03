import type { AuthRole } from "@/features/auth/types";
import { ApiError, type ApiResponse } from "./types";

type Requester = <T>(
  path: string,
  init?: RequestInit,
) => Promise<ApiResponse<T>>;
const collections = {
  employer: [
    "jobs",
    "applications",
    "conversations",
    "notifications",
    "categories",
    "skills",
  ],
  candidate: [
    "skills",
    "saved_jobs",
    "applications",
    "conversations",
    "notifications",
    "conversation_jobs",
  ],
  admin: ["users", "jobs", "categories", "skills"],
} as const;

/** A snapshot is private to the current session; never cache it across users. */
export async function readWorkspaceSnapshot<T>(
  request: Requester,
  role: AuthRole,
): Promise<T> {
  const { data } = await request<unknown>("/workspace/bootstrap");
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new ApiError(502, "Dữ liệu không gian làm việc không hợp lệ.");
  const value = data as Record<string, unknown>;
  const detail =
    value[
      role === "employer"
        ? "company"
        : role === "candidate"
          ? "profile"
          : "stats"
    ];
  if (
    value.role !== role ||
    collections[role].some((key) => !Array.isArray(value[key])) ||
    !detail ||
    typeof detail !== "object" ||
    Array.isArray(detail)
  ) {
    throw new ApiError(502, "Dữ liệu không gian làm việc không hợp lệ.");
  }
  return data as T;
}
