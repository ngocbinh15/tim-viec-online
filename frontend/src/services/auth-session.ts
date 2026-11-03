import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthApiError, parseUser } from "@/features/auth/api-contract";
import type { AuthRole, AuthUser } from "@/features/auth/types";
import { safeJobReturnPath } from "@/lib/return-path";
import { authEnabled } from "./auth-mode";
import { authRequest } from "./auth-request";
import { isTrustedAuthOrigin } from "@/lib/auth-origin";

export const SESSION_COOKIE = "timviec_session";

export async function assertAuthOrigin() {
  const reqHeaders = await headers();
  const origin = reqHeaders.get("origin");
  if (!isTrustedAuthOrigin(origin, process.env)) {
    throw new AuthApiError(
      403,
      "invalid_origin",
      "Yêu cầu không hợp lệ. Vui lòng tải lại trang và thử lại.",
    );
  }
}

// React cache deduplicates only within this server render, never across users.
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  // Session expiry must be evaluated at request time, including speculative
  // partial prefetches; never during Cache Components prerendering.
  await connection();
  const jar = await cookies();
  if (!authEnabled()) return null;
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const user = parseUser(await authRequest("/user", { token }));
    return user.status === "active" ? user : null;
  } catch (error) {
    if (error instanceof AuthApiError && [401, 403].includes(error.status))
      return null;
    throw new Error(
      "Không thể xác minh phiên đăng nhập. Vui lòng thử lại sau.",
    );
  }
});

export function roleLanding(role: AuthRole, returnTo?: string): string {
  return safeJobReturnPath(returnTo, role);
}

export async function requireUser(
  role?: AuthRole,
  returnTo?: string,
): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    const params = new URLSearchParams();
    if (role === "employer") params.set("role", role);
    if (returnTo) params.set("returnTo", safeJobReturnPath(returnTo));
    redirect(`/login${params.size ? `?${params}` : ""}`);
  }
  if (role && user.role !== role) redirect(roleLanding(user.role));
  return user;
}

export async function createSession(
  token: string,
  remembered: boolean,
  expiresAt?: string,
) {
  const limit = remembered ? 7 * 24 * 3600 : 3600;
  const backendLifetime = expiresAt
    ? Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)
    : limit;
  const maxAge = Math.min(limit, backendLifetime);
  if (!Number.isFinite(maxAge) || maxAge <= 0)
    throw new AuthApiError(
      401,
      "expired_token",
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}
