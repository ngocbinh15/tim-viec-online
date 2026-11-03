import type { FieldErrors } from "./types";

const emailValid = (email: string) =>
  email.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email);
const tokenValid = (token: string) => /^[a-zA-Z0-9]{64}$/.test(token);

export function validateVerificationInput(
  values: { email?: string; token?: string },
  confirm: boolean,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.email || !emailValid(values.email))
    errors.email = "Vui lòng nhập địa chỉ email hợp lệ, tối đa 100 ký tự.";
  if (confirm && !tokenValid(values.token ?? ""))
    errors.token = "Liên kết xác thực đã hết hạn hoặc không hợp lệ.";
  return errors;
}

export function readVerificationLink(
  params: Record<string, string | string[] | undefined>,
) {
  const email =
    typeof params.email === "string" && params.email.length <= 102
      ? params.email.trim().toLowerCase()
      : "";
  const hasToken = params.token !== undefined;
  const token =
    typeof params.token === "string" && tokenValid(params.token)
      ? params.token
      : "";
  const invalid =
    Array.isArray(params.email) ||
    Array.isArray(params.token) ||
    (params.email !== undefined && !emailValid(email)) ||
    (hasToken && (!token || !emailValid(email)));
  return { email, token: invalid ? "" : token, invalid };
}
