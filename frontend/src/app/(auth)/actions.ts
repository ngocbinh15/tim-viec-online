"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  AuthApiError,
  parseLogin,
  parseUser,
  parsePendingPasswordChange,
  parseConfirmedPasswordChange,
} from "@/features/auth/api-contract";
import type { AuthActionState, AuthKind } from "@/features/auth/types";
import { readAuthForm, validateAuthValues } from "@/features/auth/validation";
import { validateVerificationInput } from "@/features/auth/email-verification";
import { vietnamToday } from "@/features/jobs/formatters";
import { authEnabled, authMockEnabled } from "@/services/auth-mode";
import { authRequest } from "@/services/auth-request";
import {
  assertAuthOrigin,
  createSession,
  getCurrentUser,
  roleLanding,
  SESSION_COOKIE,
} from "@/services/auth-session";

function failure(error: unknown): AuthActionState {
  if (error instanceof AuthApiError)
    return {
      status: "error",
      code: error.code,
      message: Object.keys(error.fieldErrors).length
        ? "Vui lòng kiểm tra lại thông tin đã nhập."
        : error.message,
      errors: Object.fromEntries(
        Object.entries(error.fieldErrors).map(([key, values]) => [
          key,
          values[0],
        ]),
      ),
    };
  return {
    status: "error",
    message: "Chưa thực hiện được yêu cầu. Vui lòng thử lại sau.",
  };
}

async function validate(kind: AuthKind, form: FormData) {
  const values = readAuthForm(kind, form);
  const errors = validateAuthValues(kind, values, vietnamToday());
  if (Object.keys(errors).length)
    return {
      values,
      error: {
        status: "error",
        message: "Vui lòng kiểm tra lại thông tin đã nhập.",
        errors,
      } as AuthActionState,
    };
  if (!authEnabled())
    return {
      values,
      error: {
        status: "preview",
        message: "Hiện chưa thể thực hiện yêu cầu. Vui lòng thử lại sau.",
      } as AuthActionState,
    };
  await assertAuthOrigin();
  return { values, error: null };
}

export async function loginAction(
  returnTo: string,
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  let destination: string;
  let token: string | undefined;
  try {
    const { values, error } = await validate("login", form);
    if (error) return error;
    const remembered = form.get("remember") === "on";
    const login = parseLogin(
      await authRequest("/login", {
        body: { ...values, remember: remembered },
      }),
    );
    token = login.token;
    const user = parseUser(await authRequest("/user", { token }));
    if (user.status !== "active")
      throw new AuthApiError(
        403,
        "account_locked",
        "Tài khoản của bạn đã bị khóa bởi quản trị viên",
      );
    await createSession(token, remembered, login.expires_at);
    revalidatePath("/", "layout");
    destination = roleLanding(user.role, returnTo);
  } catch (error) {
    if (token) await authRequest("/logout", { token }).catch(() => undefined);
    return failure(error);
  }
  redirect(destination);
}

export async function registerAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  let email = "";
  try {
    const { values, error } = await validate("register", form);
    if (error) return error;
    await authRequest("/register", { body: values });
    email = values.email;
  } catch (error) {
    return failure(error);
  }
  redirect(`/verify-email?${new URLSearchParams({ email })}`);
}

async function submitVerification(
  form: FormData,
  confirm: boolean,
): Promise<AuthActionState> {
  try {
    await assertAuthOrigin();
    if (!authEnabled())
      return {
        status: "preview",
        message:
          "Chức năng xác thực email chưa sẵn sàng. Vui lòng thử lại sau.",
      };
    const rawEmail = form.get("email");
    const rawToken = form.get("token");
    const email =
      typeof rawEmail === "string"
        ? rawEmail.slice(0, 1000).trim().toLowerCase()
        : "";
    const token = typeof rawToken === "string" ? rawToken.slice(0, 1000) : "";
    const errors = validateVerificationInput({ email, token }, confirm);
    if (Object.keys(errors).length)
      return {
        status: "error",
        message: "Vui lòng kiểm tra lại thông tin xác thực.",
        errors,
      };
    const result = await authRequest(
      confirm ? "/email/verify" : "/email/resend",
      {
        body: confirm ? { email, token } : { email },
      },
    );
    if (
      typeof result !== "object" ||
      result === null ||
      (confirm
        ? !(
            "verified" in result &&
            result.verified === true &&
            "email" in result &&
            result.email === email
          )
        : !("accepted" in result && result.accepted === true))
    ) {
      throw new AuthApiError(
        502,
        "invalid_response",
        "Dịch vụ xác thực trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.",
      );
    }
    if (confirm) revalidatePath("/", "layout");
    return {
      status: "success",
      message: confirm
        ? "Xác thực email thành công."
        : "Nếu email cần xác thực, liên kết mới sẽ được gửi đến hộp thư. Vui lòng kiểm tra cả thư rác.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function verifyEmailAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  const state = await submitVerification(form, true);
  if (state.status === "success") redirect("/login?notice=verified");
  return state;
}

export async function resendVerificationAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  return submitVerification(form, false);
}

export async function forgotAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  try {
    const { values, error } = await validate("forgot", form);
    if (error) return error;
    await authRequest("/forgot-password", { body: values });
    return {
      status: "success",
      message:
        "Nếu email đã đăng ký và được xác thực, bạn sẽ nhận được liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến và thư rác.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function resetAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  try {
    const { values, error } = await validate("reset", form);
    if (error) return error;
    await authRequest("/reset-password", { body: values });
  } catch (error) {
    return failure(error);
  }
  redirect("/login?notice=reset");
}

export async function changePasswordAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  try {
    const { values, error } = await validate("change", form);
    if (error) return error;
    const user = await getCurrentUser();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!user || !token)
      throw new AuthApiError(
        401,
        "unauthorized",
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      );
    const result = await authRequest("/user/change-password", {
      method: "PUT",
      body: values,
      token,
    });
    if (authMockEnabled())
      return { status: "success", message: "Đổi mật khẩu thành công." };
    parsePendingPasswordChange(result, user.email);
    return {
      status: "success",
      message: `Yêu cầu đổi mật khẩu đã được gửi đến ${user.email}. Vui lòng mở email và xác nhận để cập nhật mật khẩu. Mật khẩu hiện tại vẫn sử dụng được cho đến khi xác nhận.`,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function confirmPasswordChangeAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  try {
    await assertAuthOrigin();
    if (!authEnabled() || authMockEnabled())
      return {
        status: "preview",
        message:
          "Chức năng xác nhận đổi mật khẩu chưa sẵn sàng. Vui lòng thử lại sau.",
      };
    const rawEmail = form.get("email");
    const rawToken = form.get("token");
    const email =
      typeof rawEmail === "string"
        ? rawEmail.slice(0, 1000).trim().toLowerCase()
        : "";
    const token = typeof rawToken === "string" ? rawToken.slice(0, 1000) : "";
    const errors = validateVerificationInput({ email, token }, true);
    if (Object.keys(errors).length)
      return {
        status: "error",
        code: "invalid_password_change_token",
        message: "Liên kết đổi mật khẩu đã hết hạn hoặc không hợp lệ.",
      };
    // Capture the current identity before confirmation revokes the target account's tokens.
    // An unrelated account logged into this browser keeps its session.
    const currentUser = await getCurrentUser().catch(() => undefined);
    parseConfirmedPasswordChange(
      await authRequest("/password/change/confirm", { body: { email, token } }),
      email,
    );
    if (currentUser === null || currentUser?.email.toLowerCase() === email)
      (await cookies()).delete(SESSION_COOKIE);
    revalidatePath("/", "layout");
  } catch (error) {
    return failure(error);
  }
  redirect("/login?notice=changed");
}

export async function logoutAction() {
  if (authEnabled()) await assertAuthOrigin();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && authEnabled())
    await authRequest("/logout", { token }).catch(() => undefined);
  jar.delete(SESSION_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login?notice=logout");
}
