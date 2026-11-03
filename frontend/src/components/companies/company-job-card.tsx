import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Job } from "@/features/jobs/types";
import type { AuthRole } from "@/features/auth/types";
import { formatDate, formatSalary } from "@/features/jobs/formatters";
import { Badge } from "@/modules/cores/shadcn/components/ui/badge";
import { GuestActions } from "@/components/jobs/guest-actions";

export function CompanyJobCard({
  job,
  viewerRole,
}: {
  job: Job;
  viewerRole?: AuthRole;
}) {
  return (
    <article className="company-job-card" data-testid="company-job-card">
      <div className="company-job-heading">
        <div>
          <h3>
            <Link href={`/jobs/${job.id}`}>{job.title}</Link>
          </h3>
          <p className="company-job-salary">{formatSalary(job)}</p>
        </div>
        <GuestActions jobId={job.id} compact viewerRole={viewerRole} />
      </div>
      <div className="company-job-tags">
        <Badge variant="secondary">
          <MapPin size={12} aria-hidden="true" />
          {job.city}
        </Badge>
        <Badge variant="secondary">{job.job_level}</Badge>
        {job.skills.slice(0, 2).map((skill) => (
          <Badge
            key={skill.id}
            className="company-job-skill"
            variant="secondary"
          >
            {skill.name}
          </Badge>
        ))}
      </div>
      <div className="company-job-bottom">
        <span>Hạn nộp: {formatDate(job.deadline)}</span>
        <Link href={`/jobs/${job.id}`}>Xem việc làm</Link>
      </div>
    </article>
  );
}
