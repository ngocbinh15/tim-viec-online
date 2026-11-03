import type { AuthUser } from "@/features/auth/types";

export type AuthApiKind =
  | "login"
  | "register"
  | "verify-email"
  | "resend-verification"
  | "forgot-password"
  | "verify-reset-token"
  | "reset-password"
  | "logout"
  | "user"
  | "change-password"
  | "confirm-password-change";

export type AuthApiPath =
  | "/login"
  | "/register"
  | "/email/verify"
  | "/email/resend"
  | "/forgot-password"
  | "/verify-reset-token"
  | "/reset-password"
  | "/logout"
  | "/user"
  | "/user/change-password"
  | "/password/change/confirm";

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidResponse(): never {
  throw new AuthApiError(
    502,
    "invalid_response",
    "Dịch vụ xác thực trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.",
  );
}

export function parsePendingPasswordChange(
  value: unknown,
  email: string,
): { email: string } {
  if (
    !record(value) ||
    value.confirmation_required !== true ||
    value.email !== email
  )
    return invalidResponse();
  return { email };
}

export function parseConfirmedPasswordChange(
  value: unknown,
  email: string,
): { email: string } {
  if (!record(value) || value.confirmed !== true || value.email !== email)
    return invalidResponse();
  return { email };
}

export function parseUser(value: unknown): AuthUser {
  if (!record(value)) return invalidResponse();
  const { id, name, email, role, status } = value;
  if (
    !Number.isSafeInteger(id) ||
    Number(id) <= 0 ||
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 255 ||
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof role !== "string" ||
    !["candidate", "employer", "admin"].includes(role) ||
    typeof status !== "string" ||
    !["active", "locked"].includes(status)
  )
    return invalidResponse();
  const verifiedAt = value.email_verified_at;
  if (
    verifiedAt !== undefined &&
    verifiedAt !== null &&
    (typeof verifiedAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(
        verifiedAt,
      ) ||
      !Number.isFinite(Date.parse(verifiedAt)))
  )
    return invalidResponse();
  return {
    id: id as number,
    name,
    email,
    role: role as AuthUser["role"],
    status: status as AuthUser["status"],
    ...(verifiedAt !== undefined
      ? { email_verified_at: verifiedAt as string | null }
      : {}),
  };
}

export function parseLogin(value: unknown): {
  token: string;
  expires_at?: string;
} {
  if (!record(value)) return invalidResponse();
  const token = value.access_token ?? value.token;
  if (
    typeof token !== "string" ||
    !token.trim() ||
    token.length > 2000 ||
    /[\s\x00-\x1f\x7f]/.test(token)
  ) {
    return invalidResponse();
  }
  if (value.expires_at !== undefined) {
    const expiration = value.expires_at;
    if (
      typeof expiration !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(
        expiration,
      ) ||
      !Number.isFinite(Date.parse(expiration)) ||
      Date.parse(expiration) <= Date.now()
    )
      return invalidResponse();
    return { token, expires_at: expiration };
  }
  return { token };
}

const allowedFields: Record<AuthApiKind, readonly string[]> = {
  login: ["email", "password"],
  "verify-email": ["email", "token"],
  "resend-verification": ["email"],
  register: [
    "name",
    "email",
    "password",
    "password_confirmation",
    "role",
    "phone",
    "dob",
  ],
  "forgot-password": ["email"],
  "verify-reset-token": ["email", "token"],
  "reset-password": ["email", "token", "password", "password_confirmation"],
  logout: [],
  user: [],
  "change-password": ["current_password", "password", "password_confirmation"],
  "confirm-password-change": ["email", "token"],
};

export function mapAuthApiError(
  status: number,
  body: unknown,
  kind: AuthApiKind,
): AuthApiError {
  const code =
    record(body) && typeof body.code === "string" ? body.code : undefined;
  if (
    status === 400 &&
    kind === "confirm-password-change" &&
    code === "invalid_password_change_token"
  )
    return new AuthApiError(
      400,
      code,
      "Liên kết đổi mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng gửi yêu cầu mới tại trang bảo mật.",
    );
  if (
    status === 503 &&
    kind === "change-password" &&
    code === "mail_delivery_failed"
  )
    return new AuthApiError(
      503,
      code,
      "Chưa thể gửi email xác nhận. Mật khẩu của bạn chưa thay đổi. Vui lòng thử lại sau.",
    );
  if (
    status === 400 &&
    kind === "verify-email" &&
    code === "invalid_verification_token"
  )
    return new AuthApiError(
      400,
      code,
      "Liên kết xác thực đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu liên kết mới.",
    );
  if (status === 403 && code === "email_verification_required")
    return new AuthApiError(
      403,
      code,
      kind === "change-password"
        ? "Vui lòng xác thực email trước khi yêu cầu đổi mật khẩu."
        : "Vui lòng xác thực email trước khi ứng tuyển, đăng tin hoặc gửi tin nhắn.",
    );
  if (
    status === 400 &&
    (kind === "reset-password" || kind === "verify-reset-token") &&
    code === "invalid_reset_token"
  ) {
    return new AuthApiError(
      400,
      "invalid_reset_token",
      "Liên kết xác thực đã hết hạn hoặc không hợp lệ",
    );
  }
  if (
    status === 400 &&
    kind === "change-password" &&
    code === "invalid_current_password"
  ) {
    return new AuthApiError(
      400,
      "invalid_current_password",
      "Mật khẩu hiện tại không chính xác",
      { current_password: ["Mật khẩu hiện tại không chính xác"] },
    );
  }
  if (
    status === 400 &&
    kind === "change-password" &&
    code === "password_unchanged"
  ) {
    return new AuthApiError(
      400,
      "password_unchanged",
      "Mật khẩu mới không được trùng với mật khẩu hiện tại",
      { password: ["Mật khẩu mới không được trùng với mật khẩu hiện tại"] },
    );
  }
  if (status === 401)
    return new AuthApiError(
      401,
      "unauthorized",
      kind === "login"
        ? "Email hoặc mật khẩu không chính xác"
        : "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    );
  if (status === 403 && code === "account_locked")
    return new AuthApiError(
      403,
      "account_locked",
      "Tài khoản của bạn đã bị khóa bởi quản trị viên",
    );
  if (status === 403 && code === "temporarily_locked")
    return new AuthApiError(
      403,
      "temporarily_locked",
      "Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản",
    );
  if (status === 403)
    return new AuthApiError(
      403,
      "forbidden",
      "Bạn không có quyền thực hiện thao tác này hoặc tài khoản đã bị khóa.",
    );
  if (status === 419)
    return new AuthApiError(
      419,
      "session_expired",
      "Phiên làm việc đã hết hạn. Vui lòng tải lại trang.",
    );
  if (status === 429)
    return new AuthApiError(
      429,
      "rate_limited",
      "Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.",
    );
  if (status === 422) {
    const errors = record(body) && record(body.errors) ? body.errors : {};
    const fieldErrors: Record<string, string[]> = {};
    for (const field of allowedFields[kind]) {
      if (Object.hasOwn(errors, field)) {
        fieldErrors[field] = [
          field.includes("password")
            ? "Mật khẩu không hợp lệ. Vui lòng kiểm tra lại."
            : "Thông tin không hợp lệ. Vui lòng kiểm tra lại.",
        ];
      }
    }
    if (
      kind === "register" &&
      (Object.hasOwn(errors, "email") ||
        (record(body) && body.code === "email_taken"))
    ) {
      fieldErrors.email = ["Email đã được sử dụng"];
    }
    return new AuthApiError(
      422,
      "validation_failed",
      "Vui lòng kiểm tra lại thông tin đã nhập.",
      fieldErrors,
    );
  }
  if (status === 404 || status === 405 || status === 501) {
    return new AuthApiError(
      503,
      "not_available",
      "Dịch vụ xác thực chưa sẵn sàng. Vui lòng thử lại sau.",
    );
  }
  return new AuthApiError(
    503,
    "service_unavailable",
    "Không thể kết nối dịch vụ xác thực. Vui lòng thử lại sau.",
  );
}
