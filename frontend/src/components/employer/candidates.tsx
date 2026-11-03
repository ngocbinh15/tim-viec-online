"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useEmployer } from "./employer-provider";
import {
  APPLICATION_LABELS,
  JOB_STATUS_LABELS,
  type ApplicationStatus,
} from "@/features/employer/types";
import { normalizeSearch } from "@/features/jobs/query";
import { effectiveJobStatus } from "@/features/employer/rules";
import { employerApplicationHref } from "@/features/employer/candidate-navigation";
import { Pagination } from "@/components/layout/pagination";
import { SelectionField } from "@/components/forms/selection-field";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import "./employer-candidates.css";

const PER_PAGE = 6;
const statusOptions = Object.entries(APPLICATION_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const scoreOptions = [
  { value: "80", label: "Từ 80% trở lên" },
  { value: "60", label: "Từ 60% trở lên" },
  { value: "0", label: "Dưới 60%" },
];
const sortOptions = [
  { value: "score", label: "Điểm AI cao nhất" },
  { value: "newest", label: "Ngày nộp mới nhất" },
  { value: "oldest", label: "Ngày nộp cũ nhất" },
];
const dateLabel = (value: string) =>
  new Date(value.slice(0, 10) + "T12:00:00").toLocaleDateString("vi-VN");
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("");
const scoreClass = (score: number) =>
  score >= 80 ? "high" : score >= 60 ? "mid" : "low";

function ApplicationBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`ec-status ec-status-${status}`}>
      {APPLICATION_LABELS[status]}
    </span>
  );
}

export function EmployerCandidates() {
  const searchId = useId();
  const filterId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { applications, jobs, today, apiMode } = useEmployer();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const jobId = params.get("job_id") ?? "";
  const status = params.get("status") ?? "";
  const minimum = params.get("match_score") ?? "";
  const keyword = params.get("keyword") ?? "";
  const sort = params.get("sort") ?? (apiMode ? "newest" : "score");
  const selectedJob = jobs.find((job) => String(job.id) === jobId);
  const jobApplications = applications.filter(
    (application) => !jobId || String(application.job_id) === jobId,
  );
  const search = normalizeSearch(keyword);
  const filtered = jobApplications
    .filter((application) => {
      const score = application.analysis?.match_score;
      return (
        (!status || application.status === status) &&
        (!search ||
          normalizeSearch(`${application.name} ${application.email}`).includes(
            search,
          )) &&
        (!minimum ||
          (score !== undefined &&
            (minimum === "0" ? score < 60 : score >= Number(minimum))))
      );
    })
    .sort((a, b) =>
      sort === "newest"
        ? b.created_at.localeCompare(a.created_at)
        : sort === "oldest"
          ? a.created_at.localeCompare(b.created_at)
          : (b.analysis?.match_score ?? -1) - (a.analysis?.match_score ?? -1),
    );
  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const requestedPage = Number(params.get("page") ?? "1");
  const page = Number.isSafeInteger(requestedPage)
    ? Math.max(1, Math.min(requestedPage, lastPage))
    : 1;
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function url(changes: Record<string, string>, resetPage = true) {
    const next = new URLSearchParams(params.toString());
    if (resetPage) {
      next.delete("page");
      next.delete("application");
    }
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return `${pathname}${next.size ? `?${next}` : ""}`;
  }
  function filter(key: string, value: string) {
    router.replace(url({ [key]: value }), { scroll: false });
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    filter(
      "keyword",
      String(new FormData(event.currentTarget).get("keyword") ?? "").trim(),
    );
  }

  return (
    <div className="ec-page ec-list-page">
      <div className="ep-page-heading">
        <div>
          <h1>Hồ sơ ứng viên</h1>
          <p>
            Xem hồ sơ theo từng tin tuyển dụng, đánh giá CV và theo dõi kết quả
            xét duyệt.
          </p>
        </div>
        <Link className="ep-button" href="/employer/messages">
          <MessageSquare size={16} aria-hidden="true" />
          Tin nhắn ứng viên
        </Link>
      </div>
      <section
        className="ec-overview"
        data-api={apiMode}
        aria-label="Thống kê hồ sơ"
      >
        {[
          {
            label: "Tổng hồ sơ",
            count: jobApplications.length,
            note: jobId ? "Cho vị trí đang chọn" : "Tất cả tin tuyển dụng",
          },
          {
            label: "Hồ sơ mới",
            count: jobApplications.filter((a) => a.status === "applied").length,
            note: "Chưa xem CV ứng tuyển",
          },
          ...[
            {
              label: "Phù hợp từ 80%",
              count: jobApplications.filter(
                (a) =>
                  a.status !== "withdrawn" &&
                  (a.analysis?.match_score ?? 0) >= 80,
              ).length,
              note: "Đánh giá theo tin ứng tuyển",
            },
          ],
          {
            label: "Đã trúng tuyển",
            count: jobApplications.filter((a) => a.status === "accepted")
              .length,
            note: "Hoàn tất xét duyệt",
          },
        ].map((stat) => (
          <div className="ec-stat" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.count}</strong>
            <small>{stat.note}</small>
          </div>
        ))}
      </section>
      <section
        className="ep-panel ec-filter-panel"
        data-expanded={filtersOpen}
        aria-labelledby="filter-heading"
      >
        <div className="ec-filter-heading">
          <h2 id="filter-heading">Lọc hồ sơ</h2>
          <button
            type="button"
            className="ep-button ec-filter-toggle"
            aria-controls={filterId}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((value) => !value)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Bộ lọc
          </button>
          {selectedJob && (
            <span
              className={`ec-active-job ec-job-${effectiveJobStatus(selectedJob, today)}`}
            >
              {JOB_STATUS_LABELS[effectiveJobStatus(selectedJob, today)]}
            </span>
          )}
        </div>
        <p className="ec-filter-summary">
          {selectedJob
            ? `Tin #${selectedJob.id} · ${selectedJob.title}`
            : "Tất cả tin tuyển dụng"}
          {status || minimum || keyword ? " · Đang áp dụng bộ lọc" : ""}
        </p>
        <div id={filterId} className="ec-filter-content">
          <div className="ec-filters">
            <div className="ep-field ec-job-field">
              <span className="ec-field-label">Tin tuyển dụng</span>
              <SelectionField
                name="job_id"
                label="Lọc theo tin tuyển dụng"
                placeholder="Tất cả tin tuyển dụng"
                options={jobs.map((job) => ({
                  value: String(job.id),
                  label: `${job.title} · #${job.id}`,
                }))}
                value={jobId}
                onValueChange={(value) => filter("job_id", value)}
              />
            </div>
            <form className="ep-field" onSubmit={submitSearch}>
              <label htmlFor={searchId}>Tìm ứng viên</label>
              <div className="ec-search">
                <Input
                  key={keyword}
                  id={searchId}
                  name="keyword"
                  type="search"
                  maxLength={80}
                  placeholder="Họ tên hoặc email"
                  defaultValue={keyword}
                />
                <button type="submit" aria-label="Tìm ứng viên">
                  <Search size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
            <div className="ep-field">
              <span className="ec-field-label">Trạng thái</span>
              <SelectionField
                name="status"
                label="Lọc trạng thái hồ sơ"
                placeholder="Tất cả trạng thái"
                options={statusOptions}
                value={status}
                onValueChange={(value) => filter("status", value)}
              />
            </div>
            {
              <div className="ep-field">
                <span className="ec-field-label">Điểm phù hợp AI</span>
                <SelectionField
                  name="match_score"
                  label="Lọc điểm phù hợp AI"
                  placeholder="Tất cả mức điểm"
                  options={scoreOptions}
                  value={minimum}
                  onValueChange={(value) => filter("match_score", value)}
                />
              </div>
            }
          </div>
          <div className="ec-job-meta">
            {selectedJob ? (
              <>
                <strong className="ec-filtered-title">
                  {selectedJob.title}
                </strong>
                <span>
                  Mã tin <strong>#{selectedJob.id}</strong>
                </span>
                <span>{selectedJob.city}</span>
                <span>
                  Hạn nhận hồ sơ:{" "}
                  <strong>{dateLabel(selectedJob.deadline)}</strong>
                </span>
                <Link href={`/employer/jobs/${selectedJob.id}/edit`}>
                  Xem / sửa tin <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
              </>
            ) : (
              <span>
                Hồ sơ và hội thoại vẫn được giữ lại khi tin tuyển dụng đã đóng.
              </span>
            )}
            {(jobId || status || minimum || keyword) && (
              <button
                type="button"
                className="ec-text-button"
                onClick={() => router.replace(pathname, { scroll: false })}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </section>
      <section
        className="ep-panel ec-list"
        aria-labelledby="candidate-list-heading"
      >
        <div className="ec-list-heading">
          <div>
            <h2 id="candidate-list-heading" tabIndex={-1}>
              Danh sách ứng viên <span>{filtered.length}</span>
            </h2>
            <p>
              Tin ứng tuyển luôn hiển thị cùng hồ sơ. Chọn một hồ sơ để xem chi
              tiết.
            </p>
          </div>
          <div className="ec-sort">
            <span className="ec-field-label">Sắp xếp</span>
            <SelectionField
              name="sort"
              label="Sắp xếp hồ sơ"
              placeholder="Điểm AI cao nhất"
              clearable={false}
              options={sortOptions}
              value={sort}
              onValueChange={(value) => filter("sort", value || "score")}
            />
          </div>
        </div>
        <div className="ec-candidate-list">
          {visible.map((application, index) => {
            const job = jobs.find((item) => item.id === application.job_id);
            return (
              <article className="ec-candidate" key={application.id}>
                <Link
                  className="ec-candidate-toggle ec-candidate-link"
                  href={employerApplicationHref(application.id, params)}
                  aria-label={`Xem hồ sơ ${application.name} cho ${job?.title ?? `tin #${application.job_id}`}`}
                >
                  <span
                    className={`ec-avatar ec-avatar-${["blue", "green", "orange"][index % 3]}`}
                    aria-hidden="true"
                  >
                    {initials(application.name)}
                  </span>
                  <span className="ec-person">
                    <strong>
                      {application.name}
                      {application.status === "applied" && (
                        <span className="ec-new-label">Mới</span>
                      )}
                    </strong>
                    <small>
                      {application.title} · {application.experience_years} năm
                      kinh nghiệm
                    </small>
                    <span className="ec-applied-job">
                      <BriefcaseBusiness size={14} aria-hidden="true" />
                      <span>
                        <span className="ec-applied-label">
                          Ứng tuyển vào tin
                        </span>
                        <span className="ec-applied-title">
                          {job?.title ?? "Tin không còn khả dụng"}
                        </span>
                      </span>
                    </span>
                    <span className="ec-person-meta">
                      Tin #{application.job_id} · Hồ sơ #{application.id} ·{" "}
                      {application.city} · Nộp{" "}
                      {dateLabel(application.created_at)}
                    </span>
                  </span>
                  <span className="ec-row-status">
                    {application.analysis ? (
                      <span
                        className={`ec-score ec-score-${scoreClass(application.analysis.match_score)}`}
                      >
                        {application.analysis.match_score}%{" "}
                        <small>phù hợp</small>
                      </span>
                    ) : (
                      <span className="ec-analysis-pending">
                        Chưa có điểm AI
                      </span>
                    )}
                    <ApplicationBadge status={application.status} />
                  </span>
                  <span className="ec-open-profile">
                    Xem hồ sơ
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              </article>
            );
          })}
          {!visible.length && (
            <div className="ec-empty" role="status">
              <Users size={34} aria-hidden="true" />
              <h3>Không tìm thấy hồ sơ phù hợp</h3>
              <p>Thử chọn tin tuyển dụng khác hoặc xóa bộ lọc.</p>
              <button
                className="ep-button"
                type="button"
                onClick={() => router.replace(pathname, { scroll: false })}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
        <div className="ec-list-footer" role="status">
          Hiển thị {visible.length} trên {filtered.length} hồ sơ
        </div>
        <Pagination
          page={page}
          lastPage={lastPage}
          pageUrl={(next) =>
            url({ page: String(next), application: "" }, false)
          }
          label="Phân trang hồ sơ ứng viên"
        />
      </section>
    </div>
  );
}
