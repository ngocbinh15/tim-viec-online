import { Suspense } from "react";
import { Brand } from "./brand";
import { HeaderSearch } from "./header-search";
import { getFeaturedHomeJobs, getJobCatalog } from "@/services/jobs";
import {
  GuestNavigation,
  SessionNavigation,
} from "@/components/auth/session-navigation";

async function SearchNavigation() {
  const [{ cities }, jobs] = await Promise.all([
    getJobCatalog(),
    getFeaturedHomeJobs(),
  ]);
  return (
    <HeaderSearch
      cities={cities}
      jobs={jobs.map(({ id, title, company, salary }) => ({
        id,
        title,
        company,
        salary,
      }))}
    />
  );
}

export function SiteHeader({
  variant = "default",
}: {
  variant?: "default" | "home";
}) {
  return (
    <header
      className={`site-header${variant === "home" ? " site-header--home" : ""}`}
    >
      <div className="header-inner">
        <Brand />
        {variant !== "home" && (
          <Suspense
            fallback={<div className="header-search" aria-hidden="true" />}
          >
            <SearchNavigation />
          </Suspense>
        )}
        <Suspense fallback={<GuestNavigation />}>
          <SessionNavigation />
        </Suspense>
      </div>
    </header>
  );
}
