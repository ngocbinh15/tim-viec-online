import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  SearchX,
  ShieldCheck,
} from "lucide-react";
import { JobFilters } from "@/components/jobs/job-filters";
import { JobSort } from "@/components/jobs/job-sort";
import { Pagination } from "@/components/layout/pagination";
import { JobCard } from "@/components/jobs/job-card";
import { JobsSkeleton } from "@/components/jobs/jobs-skeleton";
import { parseJobQuery, jobQueryString } from "@/features/jobs/query";
import { getJobCatalog, listJobs } from "@/services/jobs";
import { getCurrentUser } from "@/services/auth-session";
import { Button } from "@/modules/cores/shadcn/components/ui/button";

export const metadata: Metadata = {
  title: "Tìm kiếm việc làm",
  description:
    "Tìm việc theo ngành nghề, địa điểm, mức lương và hình thức làm việc.",
};
type SearchProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function JobsPage(props: SearchProps) {
  return (
    <main id="main">
      <section className="page-intro">
        <div className="site-container">
          <p className="eyebrow">CƠ HỘI MỚI, BƯỚC TIẾN MỚI</p>
          <h1>Tìm công việc phù hợp với bạn</h1>
          <p>Khám phá cơ hội theo kỹ năng, địa điểm và mong muốn của bạn.</p>
        </div>
      </section>
      <Suspense fallback={<JobsSkeleton />}>
        <JobsResults {...props} />
      </Suspense>
    </main>
  );
}

async function JobsResults({ searchParams }: SearchProps) {
  const query = parseJobQuery(await searchParams);
  const [result, catalog, user] = await Promise.all([
    listJobs(query),
    getJobCatalog(),
    getCurrentUser().catch(() => null),
  ]);
  const currentQuery = { ...query, page: result.meta.page };
  const pageUrl = (page: number) =>
    `/jobs?${jobQueryString(currentQuery, { page })}`;
  return (
    <div className="site-container page-content">
      <JobFilters query={currentQuery} {...catalog} />
      <div className="results-layout">
        <section aria-label="Kết quả tìm kiếm">
          <div className="results-toolbar">
            <div>
              <h2 aria-live="polite">
                {result.meta.total} việc làm{" "}
                {query.keyword ? `cho “${query.keyword}”` : "phù hợp"}
              </h2>
            </div>
            <JobSort query={currentQuery} />
          </div>
          {result.data.length > 0 ? (
            <>
              <div className="job-list">
                {result.data.map((job) => (
                  <JobCard job={job} key={job.id} viewerRole={user?.role} />
                ))}
              </div>
              <Pagination
                page={result.meta.page}
                lastPage={result.meta.last_page}
                pageUrl={pageUrl}
                label="Phân trang việc làm"
              />
            </>
          ) : (
            <div className="surface empty-state">
              <SearchX aria-hidden="true" size={44} />
              <h3>Không tìm thấy việc làm phù hợp với tiêu chí tìm kiếm</h3>
              <p>Thử từ khóa khác hoặc mở rộng tiêu chí để tìm thêm cơ hội.</p>
              <Button asChild variant="outline" className="h-11">
                <Link href="/jobs">Xóa bộ lọc</Link>
              </Button>
            </div>
          )}
        </section>
        <aside className="discovery-sidebar">
          <section className="career-note">
            <BriefcaseBusiness aria-hidden="true" size={32} />
            <p className="eyebrow">BƯỚC TIẾP THEO CỦA BẠN</p>
            <h2>
              Một cơ hội tốt
              <br />
              bắt đầu từ sự phù hợp.
            </h2>
            <p>
              Tìm theo kỹ năng bạn có. Đọc kỹ yêu cầu và quyền lợi trước khi gửi
              hồ sơ.
            </p>
            <Link href="/jobs?job_type=remote">
              Khám phá việc làm từ xa{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
          <section className="surface search-tips">
            <ShieldCheck aria-hidden="true" size={24} />
            <h2>Tìm việc chủ động</h2>
            <p>
              Kiểm tra thông tin công ty, địa điểm và hạn nộp hồ sơ. Bạn có thể
              chia sẻ liên kết công việc để xem lại sau.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
