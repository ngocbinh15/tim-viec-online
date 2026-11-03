import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  MapPin,
  Users,
} from "lucide-react";
import { getJob, findRelatedJobs } from "@/services/jobs";
import { getCurrentUser } from "@/services/auth-session";
import {
  formatDate,
  formatSalary,
  isJobOpen,
  vietnamToday,
} from "@/features/jobs/formatters";
import { JOB_TYPE_LABELS } from "@/features/jobs/types";
import { GuestActions } from "@/components/jobs/guest-actions";
import { FloatingJobChat } from "@/components/jobs/floating-job-chat";
import { JobCard, CompanyMark } from "@/components/jobs/job-card";
import { JobsSkeleton } from "@/components/jobs/jobs-skeleton";
import { Badge } from "@/modules/cores/shadcn/components/ui/badge";
import { authApiEnabled } from "@/services/auth-mode";

type DetailProps = { params: Promise<{ id: string }> };
export async function generateMetadata({
  params,
}: DetailProps): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  return job
    ? {
        title: `${job.title} tại ${job.company.name}`,
        description: job.description.slice(0, 160),
      }
    : {
        title: "Không tìm thấy việc làm",
        robots: { index: false, follow: false },
      };
}
export default function JobDetailPage(props: DetailProps) {
  return (
    <main id="main">
      <Suspense fallback={<JobsSkeleton />}>
        <JobDetail {...props} />
      </Suspense>
    </main>
  );
}
async function JobDetail({ params }: DetailProps) {
  await connection();
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  const job = await getJob(Number(id));
  if (!job) notFound();
  const open = isJobOpen(job, vietnamToday());
  const related = await findRelatedJobs(job, 3);
  const user = await getCurrentUser().catch(() => null);
  return (
    <div className="site-container page-content">
      <nav className="breadcrumbs" aria-label="Đường dẫn">
        <Link href="/jobs">
          <ArrowLeft size={15} aria-hidden="true" />
          Tất cả việc làm
        </Link>
        <span aria-hidden="true">/</span>
        <span>{job.company.name}</span>
      </nav>
      <section className="surface detail-summary">
        <div className="detail-heading">
          <CompanyMark name={job.company.name} logo={job.company.logo} />
          <div>
            <p className="company-name">
              <Link href={`/companies/${job.company_id}`}>
                {job.company.name}
              </Link>
            </p>
            <h1>{job.title}</h1>
            <p className="salary">{formatSalary(job)}</p>
          </div>
          <Badge
            variant="secondary"
            className={open ? "status-open" : "status-closed"}
          >
            {open ? "Đang tuyển" : "Đã ngừng tuyển"}
          </Badge>
        </div>
        <div className="detail-facts">
          <span>
            <MapPin aria-hidden="true" />
            {job.city}
          </span>
          <span>
            <Building2 aria-hidden="true" />
            {JOB_TYPE_LABELS[job.job_type]}
          </span>
          <span>
            <Users aria-hidden="true" />
            Tuyển {job.quantity} người
          </span>
          <span>
            <CalendarDays aria-hidden="true" />
            Hạn nộp: {formatDate(job.deadline)}
          </span>
        </div>
        {!open && (
          <p className="closed-notice" role="status">
            Tin tuyển dụng này đã đóng hoặc hết hạn nộp hồ sơ.
          </p>
        )}
        <GuestActions jobId={job.id} open={open} viewerRole={user?.role} />
        {!authApiEnabled() && (
          <p className="detail-demo">Dữ liệu việc làm minh họa.</p>
        )}
      </section>
      <div className="results-layout detail-layout">
        <div>
          <article className="surface job-description">
            {[
              { title: "Mô tả công việc", text: job.description },
              { title: "Yêu cầu chuyên môn", text: job.requirements },
              { title: "Quyền lợi", text: job.benefits },
              { title: "Địa điểm làm việc", text: job.address || job.city },
            ].map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.text}</p>
              </section>
            ))}
            <section>
              <h2>Kỹ năng yêu cầu</h2>
              <div className="skill-tags">
                {job.skills.map((skill) => (
                  <Badge key={skill.id} variant="secondary">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </section>
          </article>
          {related.length > 0 && (
            <section className="related-jobs">
              <h2>Những cơ hội tương tự</h2>
              <div className="job-list">
                {related.map((item) => (
                  <JobCard key={item.id} job={item} viewerRole={user?.role} />
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="discovery-sidebar">
          <section className="surface company-summary" id="company">
            <CompanyMark name={job.company.name} logo={job.company.logo} />
            <h2>
              <Link href={`/companies/${job.company_id}`}>
                {job.company.name}
              </Link>
            </h2>
            <dl>
              <div>
                <dt>Quy mô</dt>
                <dd>{job.company.company_size || "Chưa xác minh"}</dd>
              </div>
              <div>
                <dt>Trụ sở</dt>
                <dd>{job.company.address || job.company.city}</dd>
              </div>
              {job.job_level && (
                <div>
                  <dt>Cấp bậc tuyển dụng</dt>
                  <dd>{job.job_level}</dd>
                </div>
              )}
            </dl>
            <p>{job.company.description}</p>
            <Link
              className="company-jobs-link"
              href={`/companies/${job.company_id}`}
            >
              Xem hồ sơ và việc làm tại công ty →
            </Link>
          </section>
        </aside>
      </div>
      {user?.role === "candidate" && <FloatingJobChat job={job} />}
    </div>
  );
}
