import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/services/auth-session";
import { getEmployerData } from "@/services/employer";
import { employerApplicationHref } from "@/features/employer/candidate-navigation";
import { EmployerLoading } from "./employer-loading";
import { EmployerDashboard } from "./dashboard";
import { EmployerJobs } from "./jobs";
import { CompanyForm } from "./company-form";
import { JobForm } from "./job-form";
import { EmployerCandidates } from "./candidates";
import { EmployerApplicationDetail } from "./application-detail";
import { EmployerMessages } from "./messages";
import { EmployerNotifications } from "./notifications";
import type { EmployerSection } from "@/features/employer/types";
export function EmployerContent({
  section,
  returnTo,
  id,
  searchParams,
}: {
  section: EmployerSection;
  returnTo: string;
  id?: number;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<EmployerLoading />}>
      <Content
        section={section}
        returnTo={returnTo}
        id={id}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
async function Content({
  section,
  returnTo,
  id,
  searchParams,
}: {
  section: EmployerSection;
  returnTo: string;
  id?: number;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(
    searchParams ? await searchParams : {},
  )) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  const destination = query.size ? `${returnTo}?${query}` : returnTo;
  await requireUser(
    "employer",
    destination.length <= 1000 ? destination : returnTo,
  );
  switch (section) {
    case "dashboard":
      return <EmployerDashboard />;
    case "jobs":
      return <EmployerJobs />;
    case "company":
      return <CompanyForm />;
    case "post":
      return <JobForm id={id} />;
    case "candidates": {
      if (id !== undefined) {
        const data = await getEmployerData();
        const application = data?.applications.find((item) => item.id === id);
        if (
          !data ||
          !application ||
          !data.jobs.some(
            (job) =>
              job.id === application.job_id &&
              job.company_id === data.company.id,
          )
        )
          notFound();
        return <EmployerApplicationDetail id={id} />;
      }
      const legacyId = query.get("application");
      if (
        legacyId &&
        /^[1-9]\d*$/.test(legacyId) &&
        Number.isSafeInteger(Number(legacyId))
      )
        redirect(employerApplicationHref(Number(legacyId), query));
      return <EmployerCandidates />;
    }
    case "messages":
      return <EmployerMessages />;
    case "notifications":
      return <EmployerNotifications />;
  }
}
