import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AuthLoading } from "@/components/auth/auth-loading";
export const metadata: Metadata = { title: "Tạo tài khoản" };
export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthScreen kind="register" searchParams={searchParams} />
    </Suspense>
  );
}
