import "server-only";
import { cookies } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { SESSION_COOKIE } from "./auth-session";
import { authApiEnabled } from "./auth-mode";
import {
  allowedBackendPath,
  cacheablePublicRead,
  isPublicBackendRead,
} from "@/features/api/paths";
import { ApiError, apiFailure, type ApiResponse } from "@/features/api/types";
import { collectPages } from "@/features/api/pagination";

export function backendBase(): URL {
  try {
    const url = new URL(
      process.env.AUTH_API_URL || process.env.NEXT_PUBLIC_API_URL || "",
    );
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (process.env.NODE_ENV === "production" &&
        url.protocol !== "https:" &&
        !local)
    )
      throw new Error();
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
    return url;
  } catch {
    throw new ApiError(
      503,
      "Backend chưa được cấu hình. Vui lòng thử lại sau.",
    );
  }
}

export async function backendFetch(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<Response> {
  if (!authApiEnabled())
    throw new ApiError(503, "Kết nối backend chưa được bật.");
  const method = (init.method ?? "GET").toUpperCase();
  if (!allowedBackendPath(path, method))
    throw new ApiError(400, "Yêu cầu không hợp lệ.");
  const token =
    authenticated || !isPublicBackendRead(path)
      ? (await cookies()).get(SESSION_COOKIE)?.value
      : undefined;
  if (authenticated && !token)
    throw new ApiError(401, "Vui lòng đăng nhập để tiếp tục.");
  if (token && (token.length > 2000 || /[\s\x00-\x1f\x7f]/.test(token)))
    throw new ApiError(401, "Phiên đăng nhập không hợp lệ.");
  const headers = new Headers({ Accept: "application/json" });
  // Only the server reads the Sanctum token; caller headers cannot override it.
  if (token && (authenticated || !isPublicBackendRead(path)))
    headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string")
    headers.set("Content-Type", "application/json");
  try {
    return await fetch(new URL(path.slice(1), backendBase()), {
      method,
      headers,
      body: init.body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(
        path === "/employer/applications/export" && method === "POST"
          ? 85_000
          : 20_000,
      ),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw apiFailure(503);
  }
}

export async function decodeBackend<T>(
  response: Response,
): Promise<ApiResponse<T>> {
  if (response.status === 204) return { success: true, data: null as T };
  let value: unknown;
  try {
    const reader = response.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > 8 * 1024 * 1024) throw new Error();
        chunks.push(chunk.value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw apiFailure(response.ok ? 502 : response.status);
  }
  if (!response.ok) throw apiFailure(response.status, value);
  if (
    !value ||
    typeof value !== "object" ||
    !("success" in value) ||
    value.success !== true
  )
    throw apiFailure(502);
  return value as ApiResponse<T>;
}

export async function backendRequest<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<ApiResponse<T>> {
  if (
    !authenticated &&
    !init.body &&
    cacheablePublicRead(path, (init.method ?? "GET").toUpperCase())
  ) {
    // Keep builds independent of an online API; cache directory data only
    // after a real request reaches the server.
    await connection();
    return publicDirectoryRead(path, backendBase().href) as Promise<
      ApiResponse<T>
    >;
  }
  return decodeBackend<T>(await backendFetch(path, init, authenticated));
}

async function publicDirectoryRead(
  path: string,
  origin: string,
): Promise<ApiResponse<unknown>> {
  "use cache";
  cacheLife({ stale: 5, revalidate: 10, expire: 60 });
  cacheTag("public-directory");
  // The API origin is part of the cache key so local, test and deployed
  // backends can never reuse one another's directory responses.
  let response: Response;
  try {
    response = await fetch(new URL(path.slice(1), origin), {
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw apiFailure(503);
  }
  return decodeBackend(response);
}

export const backendAll = <T>(path: string, authenticated = true) =>
  collectPages<T>(path, (page) =>
    backendRequest<unknown>(page, {}, authenticated),
  );
