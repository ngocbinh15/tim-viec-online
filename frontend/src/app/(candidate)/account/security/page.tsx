import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLoading } from "@/components/auth/auth-loading";
import { requireUser } from "@/services/auth-session";
import { vietnamToday } from "@/features/jobs/formatters";
import { changePasswordAction } from "@/app/(auth)/actions";
import { authApiEnabled } from "@/services/auth-mode";
export const metadata: Metadata = {
  title: "Đổi mật khẩu",
  robots: { index: false },
};
export default function SecurityPage() {
  return (
    <main id="main" className="site-container page-content">
      <Suspense fallback={<AuthLoading />}>
        <SecurityForm />
      </Suspense>
    </main>
  );
}
async function SecurityForm() {
  const user = await requireUser(undefined, "/account/security");
  await connection();
  const verificationRequired =
    authApiEnabled() && user.email_verified_at === null;
  return (
    <section className="surface auth-security">
      <h1>Đổi mật khẩu</h1>
      <p>
        {authApiEnabled()
          ? "Nhập mật khẩu hiện tại và chọn mật khẩu mới. Hệ thống sẽ gửi email xác nhận; mật khẩu chỉ được cập nhật sau khi bạn xác nhận trong email."
          : "Nhập mật khẩu hiện tại và chọn mật khẩu mới cho tài khoản của bạn."}
      </p>
      {verificationRequired && (
        <p className="auth-status" role="status">
          Email {user.email} chưa được xác thực. Vui lòng xác thực email trước
          khi yêu cầu đổi mật khẩu.{" "}
          <Link
            href={`/verify-email?${new URLSearchParams({ email: user.email })}`}
          >
            Xác thực email / gửi lại liên kết
          </Link>
        </p>
      )}
      {user.email_verified_at && (
        <p className="auth-form-note">Email {user.email} đã được xác thực.</p>
      )}
      {!verificationRequired && (
        <AuthForm
          kind="change"
          today={vietnamToday()}
          action={changePasswordAction}
        />
      )}
    </section>
  );
}
