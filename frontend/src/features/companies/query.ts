import { isJobOpen } from "../jobs/formatters";
import type { Job } from "../jobs/types";

export function companyOpenJobs(
  jobs: Job[],
  companyId: number,
  today: string,
): Job[] {
  return jobs
    .filter((job) => job.company_id === companyId && isJobOpen(job, today))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id);
}

export function companyWebsite(
  value: string | null,
): { href: string; label: string } | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? { href: url.href, label: url.hostname.replace(/^www\./, "") }
      : null;
  } catch {
    return null;
  }
}
