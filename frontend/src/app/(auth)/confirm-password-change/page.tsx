import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLoading } from "@/components/auth/auth-loading";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordChangeConfirmation } from "@/components/auth/password-change-confirmation";
import { readVerificationLink } from "@/features/auth/email-verification";

export const metadata: Metadata = {
  title: "Xác nhận đổi mật khẩu",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
type Params = Record<string, string | string[] | undefined>;

export default function ConfirmPasswordChangePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ConfirmationScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function ConfirmationScreen({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const link = readVerificationLink(await searchParams);
  return (
    <AuthShell
      kind="confirm-password-change"
      title="Xác nhận đổi mật khẩu"
      description="Xác nhận yêu cầu trong email để cập nhật mật khẩu tài khoản."
    >
      <PasswordChangeConfirmation {...link} />
    </AuthShell>
  );
}
