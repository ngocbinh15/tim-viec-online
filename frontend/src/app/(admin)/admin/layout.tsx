import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/services/auth-session";
import { getAdminData } from "@/services/admin";
import { authMockEnabled } from "@/services/auth-mode";
import { AdminProvider } from "@/components/admin/admin-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminWorkspaceLoading } from "@/components/admin/admin-loading";
import { SiteFooter } from "@/components/layout/site-footer";
import { AdminUnavailable } from "./_components/admin-content";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<AdminWorkspaceLoading />}>
        <AdminSession>{children}</AdminSession>
      </Suspense>
      <SiteFooter />
    </>
  );
}

async function AdminSession({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  // Let the leaf guard preserve its exact login destination for guests.
  if (user?.role !== "admin") return children;
  const data = await getAdminData();
  if (!data) return <AdminUnavailable />;
  return (
    <AdminProvider key={user.id} initial={data} isMock={authMockEnabled()}>
      <AdminShell user={user}>{children}</AdminShell>
    </AdminProvider>
  );
}
