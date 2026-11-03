import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLoading } from "@/components/auth/auth-loading";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailVerificationForm } from "@/components/auth/email-verification-form";
import { readVerificationLink } from "@/features/auth/email-verification";
import { getCurrentUser } from "@/services/auth-session";

export const metadata: Metadata = {
  title: "Xác thực email",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Params = Record<string, string | string[] | undefined>;
export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense fallback={<AuthLoading />}>
      <VerificationScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function VerificationScreen({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const currentUser =
    params.email === undefined && params.token === undefined
      ? await getCurrentUser()
      : null;
  const link = readVerificationLink(
    currentUser ? { ...params, email: currentUser.email } : params,
  );
  return (
    <AuthShell
      kind="verify"
      title="Xác thực email"
      description="Xác nhận email để sử dụng các tính năng tuyển dụng."
    >
      <EmailVerificationForm {...link} />
    </AuthShell>
  );
}
