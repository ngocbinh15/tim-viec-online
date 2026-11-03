"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { confirmPasswordChangeAction } from "@/app/(auth)/actions";
import { INITIAL_AUTH_STATE } from "@/features/auth/types";
import { Button } from "@/modules/cores/shadcn/components/ui/button";

export function PasswordChangeConfirmation({
  email,
  token,
  invalid,
}: {
  email: string;
  token: string;
  invalid: boolean;
}) {
  const [state, action, pending] = useActionState(
    confirmPasswordChangeAction,
    INITIAL_AUTH_STATE,
  );
  const expired =
    invalid || !token || state.code === "invalid_password_change_token";
  return (
    <div className="auth-form">
      {expired ? (
        <p className="auth-status" role="alert">
          Liên kết đổi mật khẩu đã hết hạn hoặc không hợp lệ.
        </p>
      ) : (
        <form action={action} className="auth-form">
          <p className="auth-form-note">
            Xác nhận cập nhật mật khẩu cho tài khoản <strong>{email}</strong>.
            Sau khi xác nhận, các phiên đăng nhập của tài khoản này sẽ kết thúc.
          </p>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="token" value={token} />
          {state.message && (
            <p className="auth-status" role="alert">
              {state.message}
            </p>
          )}
          <Button type="submit" className="auth-submit" disabled={pending}>
            {pending && (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            )}
            Xác nhận đổi mật khẩu
          </Button>
        </form>
      )}
      <p className="auth-form-note">
        Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này. Mật khẩu hiện
        tại vẫn sử dụng được khi chưa xác nhận.
      </p>
      <Link href="/account/security" className="auth-return">
        Gửi lại yêu cầu đổi mật khẩu
      </Link>
      <Link href="/login" className="auth-return">
        Đến trang đăng nhập
      </Link>
    </div>
  );
}
