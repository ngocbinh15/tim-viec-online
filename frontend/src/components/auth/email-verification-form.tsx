"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { INITIAL_AUTH_STATE } from "@/features/auth/types";
import {
  verifyEmailAction,
  resendVerificationAction,
} from "@/app/(auth)/actions";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@/modules/cores/shadcn/components/ui/field";

export function EmailVerificationForm({
  email,
  token,
  invalid,
}: {
  email: string;
  token: string;
  invalid: boolean;
}) {
  const [confirmation, confirmAction, confirming] = useActionState(
    verifyEmailAction,
    INITIAL_AUTH_STATE,
  );
  const [resend, resendAction, resending] = useActionState(
    resendVerificationAction,
    INITIAL_AUTH_STATE,
  );
  const expired = confirmation.code === "invalid_verification_token";
  return (
    <div className="auth-form">
      {(invalid || expired) && (
        <p className="auth-status" role="alert">
          Liên kết xác thực đã hết hạn hoặc không hợp lệ. Bạn có thể yêu cầu
          liên kết mới bên dưới.
        </p>
      )}
      {token && !expired && (
        <form action={confirmAction} className="auth-form">
          <p className="auth-form-note">
            Xác nhận địa chỉ email <strong>{email}</strong> để ứng tuyển, đăng
            tin và gửi tin nhắn.
          </p>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="token" value={token} />
          {confirmation.message && (
            <p className="auth-status" role="alert">
              {confirmation.message}
            </p>
          )}
          <Button
            type="submit"
            className="auth-submit"
            disabled={confirming || resending}
          >
            {confirming && (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            )}
            Xác thực email
          </Button>
        </form>
      )}
      {!token && !invalid && (
        <p className="auth-form-note">
          Vui lòng mở thư xác thực và nhấn liên kết trong email. Nếu chưa nhận
          được thư, hãy kiểm tra thư rác hoặc yêu cầu gửi lại.
        </p>
      )}
      {(!token || expired) && (
        <form action={resendAction} className="auth-form">
          <Field data-invalid={!!resend.errors?.email}>
            <FieldLabel htmlFor="verification-email">
              Email nhận liên kết xác thực
            </FieldLabel>
            <Input
              id="verification-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={100}
              required
              defaultValue={email}
              readOnly={Boolean(email)}
              aria-invalid={!!resend.errors?.email}
              aria-describedby={
                resend.errors?.email ? "verification-email-error" : undefined
              }
            />
            {resend.errors?.email && (
              <FieldError id="verification-email-error">
                {resend.errors.email}
              </FieldError>
            )}
          </Field>
          {resend.message && (
            <p
              className={`auth-status${resend.status === "success" ? " auth-status-success" : ""}`}
              role={resend.status === "success" ? "status" : "alert"}
            >
              {resend.message}
            </p>
          )}
          <Button
            type="submit"
            variant="outline"
            className="auth-submit"
            disabled={resending || confirming}
          >
            {resending && (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            )}
            Gửi lại email xác thực
          </Button>
        </form>
      )}
      <Link href="/login" className="auth-return">
        Đến trang đăng nhập
      </Link>
    </div>
  );
}
