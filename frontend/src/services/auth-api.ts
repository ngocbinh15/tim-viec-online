import "server-only";

import {
  AuthApiError,
  mapAuthApiError,
  type AuthApiKind,
  type AuthApiPath,
} from "@/features/auth/api-contract";
import { authApiEnabled } from "./auth-mode";
export { authApiEnabled } from "./auth-mode";

const routes: Record<
  AuthApiPath,
  { kind: AuthApiKind; method: "GET" | "POST" | "PUT" }
> = {
  "/login": { kind: "login", method: "POST" },
  "/register": { kind: "register", method: "POST" },
  "/email/verify": { kind: "verify-email", method: "POST" },
  "/email/resend": { kind: "resend-verification", method: "POST" },
  "/forgot-password": { kind: "forgot-password", method: "POST" },
  "/verify-reset-token": { kind: "verify-reset-token", method: "POST" },
  "/reset-password": { kind: "reset-password", method: "POST" },
  "/logout": { kind: "logout", method: "POST" },
  "/user": { kind: "user", method: "GET" },
  "/user/change-password": { kind: "change-password", method: "PUT" },
  "/password/change/confirm": {
    kind: "confirm-password-change",
    method: "POST",
  },
};

const permitsEmptyData = new Set<AuthApiPath>(["/forgot-password", "/logout"]);

function configuredBase(): URL {
  try {
    const raw = process.env.AUTH_API_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!raw) throw new Error();
    const url = new URL(raw);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (process.env.NODE_ENV === "production" &&
        url.protocol !== "https:" &&
        !loopback)
    )
      throw new Error();
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
    return url;
  } catch {
    throw new AuthApiError(
      503,
      "configuration_error",
      "Dịch vụ xác thực chưa được cấu hình. Vui lòng thử lại sau.",
    );
  }
}

async function responseBody(response: Response): Promise<unknown> {
  const limit = 64 * 1024;
  if (Number(response.headers.get("content-length")) > limit || !response.body)
    throw new Error();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) throw new Error();
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function apiRequest(
  path: AuthApiPath,
  options: {
    method?: "GET" | "POST" | "PUT";
    body?: Record<string, unknown>;
    token?: string;
  } = {},
): Promise<unknown> {
  if (!authApiEnabled())
    throw new AuthApiError(
      503,
      "preview_mode",
      "Chức năng xác thực đang chờ kết nối backend.",
    );
  if (!Object.hasOwn(routes, path))
    throw new AuthApiError(400, "invalid_route", "Yêu cầu không hợp lệ.");
  const route = routes[path];
  const method = options.method ?? route.method;
  if (
    method !== route.method ||
    (method === "GET" && options.body !== undefined)
  )
    throw new AuthApiError(400, "invalid_request", "Yêu cầu không hợp lệ.");
  if (
    options.token !== undefined &&
    (!options.token ||
      options.token.length > 2000 ||
      /[\s\x00-\x1f\x7f]/.test(options.token))
  ) {
    throw new AuthApiError(
      401,
      "unauthorized",
      "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
    );
  }
  const url = new URL(path.slice(1), configuredBase());
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    let body: unknown;
    try {
      body = await responseBody(response);
    } catch {
      if (!response.ok)
        throw mapAuthApiError(response.status, undefined, route.kind);
      throw new AuthApiError(
        502,
        "invalid_response",
        "Dịch vụ xác thực trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.",
      );
    }
    if (!response.ok) throw mapAuthApiError(response.status, body, route.kind);
    if (
      typeof body !== "object" ||
      body === null ||
      !("success" in body) ||
      body.success !== true ||
      (!("data" in body) && !permitsEmptyData.has(path))
    ) {
      throw new AuthApiError(
        502,
        "invalid_response",
        "Dịch vụ xác thực trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.",
      );
    }
    return "data" in body ? body.data : null;
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    throw mapAuthApiError(503, undefined, route.kind);
  }
}
