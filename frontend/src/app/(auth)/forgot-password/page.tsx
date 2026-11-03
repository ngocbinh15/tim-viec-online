import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AuthLoading } from "@/components/auth/auth-loading";
export const metadata: Metadata = { title: "Quên mật khẩu" };
export default function ForgotPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthScreen kind="forgot" searchParams={searchParams} />
    </Suspense>
  );
}
