export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, number>;
  [key: string]: unknown;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiFailure(status: number, value?: unknown): ApiError {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const errors: Record<string, string[]> = {};
  if (body.errors && typeof body.errors === "object") {
    for (const [key, values] of Object.entries(body.errors)) {
      if (Array.isArray(values)) errors[key] = values.filter((v): v is string => typeof v === "string");
    }
  }
  const fallback = status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
    : status === 403 ? "Bạn không có quyền thực hiện thao tác này."
    : status === 429 ? "Bạn thao tác quá nhanh. Vui lòng thử lại sau."
    : "Không thể kết nối dịch vụ. Vui lòng thử lại sau.";
  return new ApiError(status, status < 500 && typeof body.message === "string" ? body.message : fallback, errors);
}
