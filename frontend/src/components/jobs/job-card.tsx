import Link from "next/link";
import Image from "next/image";
import { BriefcaseBusiness, Clock3, MapPin } from "lucide-react";
import type { Job } from "@/features/jobs/types";
import type { AuthRole } from "@/features/auth/types";
import { JOB_TYPE_LABELS } from "@/features/jobs/types";
import { formatDate, formatSalary } from "@/features/jobs/formatters";
import { Badge } from "@/modules/cores/shadcn/components/ui/badge";
import { GuestActions } from "./guest-actions";

export function CompanyMark({
  name,
  logo,
}: {
  name: string;
  logo?: string | null;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return (
    <span className="company-mark" aria-hidden="true">
      {logo ? (
        <Image
          src={logo}
          alt=""
          width={56}
          height={56}
          unoptimized
          className="size-full object-contain"
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function JobCard({
  job,
  viewerRole,
}: {
  job: Job;
  viewerRole?: AuthRole;
}) {
  return (
    <article className="job-card" data-testid="job-card">
      <CompanyMark name={job.company.name} logo={job.company.logo} />
      <div className="job-card-body">
        <div className="job-card-top">
          <div>
            <h2>
              <Link href={`/jobs/${job.id}`}>{job.title}</Link>
            </h2>
            <p className="company-name">
              <Link href={`/companies/${job.company_id}`}>
                {job.company.name}
              </Link>
            </p>
          </div>
          <GuestActions jobId={job.id} compact viewerRole={viewerRole} />
        </div>
        <p className="salary">{formatSalary(job)}</p>
        <div className="job-facts">
          <span>
            <MapPin aria-hidden="true" />
            {job.city}
          </span>
          <span>
            <BriefcaseBusiness aria-hidden="true" />
            {JOB_TYPE_LABELS[job.job_type]}
          </span>
          <span>
            <Clock3 aria-hidden="true" />
            Hạn {formatDate(job.deadline)}
          </span>
        </div>
        <div className="skill-tags">
          {job.skills.slice(0, 4).map((skill) => (
            <Badge key={skill.id} variant="secondary">
              {skill.name}
            </Badge>
          ))}
          {job.job_level && <Badge variant="outline">{job.job_level}</Badge>}
        </div>
      </div>
    </article>
  );
}
