import "server-only";
import { AuthApiError, type AuthApiPath } from "@/features/auth/api-contract";
import { apiRequest } from "./auth-api";
import { authMockEnabled } from "./auth-mode";
import { mockAuthRequest } from "./mock-auth";

export type AuthRequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: Record<string, unknown>;
  token?: string;
};

export async function authRequest(
  path: AuthApiPath,
  options: AuthRequestOptions = {},
): Promise<unknown> {
  if (authMockEnabled()) return mockAuthRequest(path, options);
  if (options.token?.startsWith("mock_"))
    throw new AuthApiError(
      401,
      "unauthorized",
      "Phiên đăng nhập không hợp lệ.",
    );
  return apiRequest(path, options);
}
