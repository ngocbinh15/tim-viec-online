import { Suspense, type ReactNode } from "react";
import { ProfileSkeleton } from "@/components/candidate/profile-skeleton";
import { authMockEnabled } from "@/services/auth-mode";
import { getCurrentUser } from "@/services/auth-session";
import { AccountShell } from "@/components/candidate/account-shell";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "../profile.css";
import "../workspace.css";
import "../candidate-chat.css";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<ProfileSkeleton />}>
        <AccountSession>{children}</AccountSession>
      </Suspense>
      <SiteFooter />
    </>
  );
}

async function AccountSession({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  // Each leaf revalidates its role and preserves its own login return path.
  if (!user || user.role !== "candidate") return children;
  return (
    <AccountShell name={user.name} preview={authMockEnabled()}>
      {children}
    </AccountShell>
  );
}
