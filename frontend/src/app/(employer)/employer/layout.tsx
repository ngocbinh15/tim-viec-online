import { Suspense, type ReactNode } from "react";
import { getCurrentUser } from "@/services/auth-session";
import { getEmployerData } from "@/services/employer";
import { EmployerProvider } from "@/components/employer/employer-provider";
import { EmployerShell } from "@/components/employer/employer-shell";
import { EmployerLoading } from "@/components/employer/employer-loading";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./employer.css";
export default function EmployerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<EmployerLoading />}>
        <EmployerSession>{children}</EmployerSession>
      </Suspense>
      <SiteFooter />
    </>
  );
}
async function EmployerSession({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user?.role !== "employer") return children;
  const data = await getEmployerData();
  if (!data)
    return (
      <>
        <SiteHeader />
        {children}
      </>
    );
  return (
    <EmployerProvider key={user.id} initial={data}>
      <EmployerShell>{children}</EmployerShell>
    </EmployerProvider>
  );
}
