"use client";

import { useCallback, useId, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { toast } from "sonner";
import { useAdminData } from "./admin-provider";
import { AdminPagination } from "./admin-pagination";
import { SearchableSelectionField } from "@/components/forms/selection-field";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Eye,
  Flag,
  House,
  Info,
  Search,
} from "lucide-react";
import {
  formatDateVN,
  formatNumber,
  JOB_STATUS_LABELS,
} from "@/features/admin/formatters";
import type { AdminCompany, AdminJob } from "@/features/admin/types";
import "./admin.css";

const PAGE_SIZE = 6;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export function AdminJobs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialReportParam = searchParams.get("report");
  const isPreview =
    pathname.includes("/preview") || searchParams.get("preview") === "true";

  const { db, pending, reset, isMock } = useAdminData();
  const prefix = useId();
  const [query, setQuery] = useState("");
  const [reportFilter, setReportFilter] = useState<"reported" | "all">(
    initialReportParam === "all" ? "all" : "reported",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortFilter, setSortFilter] = useState<string>("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset preview data
  const handleResetPreview = () => {
    reset();
    setQuery("");
    setReportFilter("reported");
    setStatusFilter("all");
    setSortFilter("newest");
    setCurrentPage(1);
    toast.success("Đã khôi phục dữ liệu mẫu ban đầu.");
  };

  // Helper mappings
  const companyFor = useCallback(
    (job: AdminJob): AdminCompany | undefined =>
      db.companies.find((c) => c.id === job.company_id),
    [db.companies],
  );

  // Metrics calculations
  const totalJobsCount = db.jobs.length;
  const activeCount = useMemo(
    () => db.jobs.filter((j) => j.status === "active").length,
    [db.jobs],
  );
  const closedOrExpiredCount = useMemo(
    () => db.jobs.filter((j) => j.status !== "active").length,
    [db.jobs],
  );
  const reportedCount = useMemo(
    () => db.jobs.filter((j) => j.is_reported).length,
    [db.jobs],
  );

  // Filtered rows
  const filteredJobs = useMemo(() => {
    const q = normalize(query);
    return db.jobs
      .filter((job) => {
        const matchesReport = reportFilter === "all" || job.is_reported;
        const matchesStatus =
          statusFilter === "all" || job.status === statusFilter;

        const company = companyFor(job);
        const searchableText = `${job.title} ${company ? company.name : ""}`;
        const matchesQuery = !q || normalize(searchableText).includes(q);

        return matchesReport && matchesStatus && matchesQuery;
      })
      .sort((a, b) => {
        if (sortFilter === "name") {
          return a.title.localeCompare(b.title, "vi");
        }
        const dateA = a.created_at || "";
        const dateB = b.created_at || "";
        const compared = dateA.localeCompare(dateB) || a.id - b.id;
        return sortFilter === "oldest" ? compared : -compared;
      });
  }, [db.jobs, companyFor, query, reportFilter, statusFilter, sortFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedJobs = useMemo(
    () => filteredJobs.slice(startIndex, startIndex + PAGE_SIZE),
    [filteredJobs, startIndex],
  );

  // Clear all filters
  const handleClearFilters = () => {
    setQuery("");
    setReportFilter("all");
    setStatusFilter("all");
    setSortFilter("newest");
    setCurrentPage(1);
  };

  return (
    <>
      {/* Breadcrumb */}
      <nav className="ap-breadcrumb" aria-label="Vị trí trang">
        <House className="ap-icon" aria-hidden="true" />
        <Link href="/admin">Quản trị</Link>
        <span>/</span>
        <span>Kiểm duyệt tin tuyển dụng</span>
      </nav>

      {/* Page Heading */}
      <div className="ap-page-heading">
        <div>
          <h1>Kiểm duyệt tin tuyển dụng</h1>
          <p>Kiểm tra nội dung bị báo cáo và xử lý tin vi phạm chính sách.</p>
        </div>
      </div>

      {/* Preview notification */}
      {isMock && (
        <div className="ap-preview">
          <Info className="ap-icon" aria-hidden="true" />
          <span>
            Dữ liệu minh họa · Thao tác chỉ áp dụng cho bản xem trước.
          </span>
          <button type="button" onClick={handleResetPreview} disabled={pending}>
            Khôi phục mẫu
          </button>
        </div>
      )}

      {/* Metrics Section */}
      <section
        className="ap-metrics"
        id="jobMetrics"
        aria-label="Thống kê tin tuyển dụng"
      >
        {/* Metric 1: Tổng tin tuyển dụng */}
        <article className="ap-metric">
          <div className="ap-metric-top">
            <span>Tổng tin tuyển dụng</span>
            <BriefcaseBusiness className="ap-icon" aria-hidden="true" />
          </div>
          <strong>{formatNumber(totalJobsCount)}</strong>
          <small>Toàn bộ tin hiện có</small>
        </article>

        {/* Metric 2: Đang tuyển */}
        <article className="ap-metric">
          <div className="ap-metric-top">
            <span>Đang tuyển</span>
            <CheckCircle2 className="ap-icon" aria-hidden="true" />
          </div>
          <strong>{formatNumber(activeCount)}</strong>
          <small>Đang nhận hồ sơ ứng tuyển</small>
        </article>

        {/* Metric 3: Đã đóng / Hết hạn */}
        <article className="ap-metric">
          <div className="ap-metric-top">
            <span>Đã đóng / Hết hạn</span>
            <Clock3 className="ap-icon" aria-hidden="true" />
          </div>
          <strong>{formatNumber(closedOrExpiredCount)}</strong>
          <small>Dừng nhận hồ sơ mới</small>
        </article>

        {/* Metric 4: Bị báo cáo */}
        <article className="ap-metric ap-metric-alert">
          <div className="ap-metric-top">
            <span>Bị báo cáo</span>
            <Flag className="ap-icon" aria-hidden="true" />
          </div>
          <strong>{formatNumber(reportedCount)}</strong>
          <small>Ưu tiên kiểm tra nội dung</small>
        </article>
      </section>

      {/* Main Panel */}
      <section className="ap-panel" aria-labelledby={`${prefix}-listTitle`}>
        <div className="ap-panel-heading">
          <div>
            <h2 id={`${prefix}-listTitle`}>Danh sách tin tuyển dụng</h2>
            <p>Tin bị báo cáo được đánh dấu riêng để ưu tiên kiểm tra.</p>
          </div>
          <span className="ap-badge ap-badge-blue">Kiểm duyệt nội dung</span>
        </div>

        {/* Segments Filter */}
        <nav
          className="ap-segments"
          id="jobSegments"
          aria-label="Lọc theo báo cáo"
        >
          <button
            type="button"
            data-report="reported"
            aria-current={reportFilter === "reported" ? "true" : undefined}
            onClick={() => {
              setReportFilter("reported");
              setCurrentPage(1);
            }}
          >
            Bị báo cáo <span>{reportedCount}</span>
          </button>
          <button
            type="button"
            data-report="all"
            aria-current={reportFilter === "all" ? "true" : undefined}
            onClick={() => {
              setReportFilter("all");
              setCurrentPage(1);
            }}
          >
            Tất cả tin <span>{totalJobsCount}</span>
          </button>
        </nav>

        {/* Toolbar Filters */}
        <form
          className="ap-toolbar"
          id={`${prefix}-listFilters`}
          role="search"
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Search Filter */}
          <label className="ap-filter ap-filter-search">
            <span>Tìm kiếm</span>
            <span className="ap-input-wrap">
              <Search className="ap-icon" aria-hidden="true" />
              <Input
                id={`${prefix}-listSearch`}
                type="search"
                placeholder="Tiêu đề công việc hoặc tên công ty…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                autoComplete="off"
              />
            </span>
          </label>

          {/* Status Filter */}
          <div className="ap-filter">
            <span>Trạng thái tin</span>
            <SearchableSelectionField
              name="listStatus"
              label="Trạng thái tin"
              placeholder="Tất cả trạng thái"
              value={statusFilter === "all" ? "" : statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value || "all");
                setCurrentPage(1);
              }}
              options={[
                { value: "active", label: "Đang tuyển" },
                { value: "closed", label: "Đã đóng" },
                { value: "expired", label: "Hết hạn" },
              ]}
            />
          </div>

          {/* Sort Filter */}
          <div className="ap-filter">
            <span>Sắp xếp</span>
            <SearchableSelectionField
              name="listSort"
              label="Sắp xếp"
              placeholder="Mới nhất"
              value={sortFilter === "newest" ? "" : sortFilter}
              onValueChange={(value) => {
                setSortFilter(value || "newest");
                setCurrentPage(1);
              }}
              options={[
                { value: "oldest", label: "Cũ nhất" },
                { value: "name", label: "Tên A → Z" },
              ]}
            />
          </div>

          <button
            type="button"
            className="ap-clear"
            onClick={handleClearFilters}
          >
            Xóa bộ lọc
          </button>
        </form>

        {/* Table View */}
        {filteredJobs.length > 0 ? (
          <div className="ap-table-wrap" id={`${prefix}-listTable`}>
            <table className="ap-table ap-table-responsive">
              <caption className="ap-sr-only">
                Tin tuyển dụng phù hợp với bộ lọc
              </caption>
              <thead>
                <tr>
                  <th scope="col">Vị trí tuyển dụng</th>
                  <th scope="col">Địa điểm</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày đăng</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody id={`${prefix}-listRows`}>
                {paginatedJobs.map((job) => {
                  const company = companyFor(job);
                  const detailUrl = isPreview
                    ? `/admin/jobs/${job.id}?preview=true`
                    : `/admin/jobs/${job.id}`;

                  return (
                    <tr key={job.id}>
                      <td>
                        <Link href={detailUrl} className="ap-cell-title">
                          {job.title}
                        </Link>
                        <span className="ap-cell-sub">
                          {company?.name || "Chưa cập nhật"}
                        </span>
                      </td>
                      <td data-label="Địa điểm">{job.city}</td>
                      <td data-label="Trạng thái">
                        <div className="ap-status-stack">
                          <span className={`ap-badge ap-badge-${job.status}`}>
                            {JOB_STATUS_LABELS[job.status] || job.status}
                          </span>
                          {job.is_reported && (
                            <span className="ap-badge ap-badge-amber">
                              Bị báo cáo
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Ngày đăng" className="ap-number">
                        {formatDateVN(job.created_at)}
                      </td>
                      <td>
                        <div className="ap-actions">
                          <Link
                            href={detailUrl}
                            className="ap-button ap-button-small"
                            aria-label={`Kiểm tra tin ${job.title}`}
                          >
                            <Eye className="ap-icon" aria-hidden="true" />
                            Xem chi tiết
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="ap-empty" id={`${prefix}-listEmpty`}>
            <Search className="ap-icon" aria-hidden="true" />
            <h3>Không tìm thấy kết quả</h3>
            <p>Thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh sách.</p>
            <button
              type="button"
              className="ap-button"
              onClick={handleClearFilters}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        {/* Table Footer & Pagination */}
        <div className="ap-table-footer">
          <span
            id={`${prefix}-listCount`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {filteredJobs.length > 0
              ? `Hiển thị ${startIndex + 1}–${Math.min(
                  startIndex + PAGE_SIZE,
                  filteredJobs.length,
                )} trên ${formatNumber(filteredJobs.length)} tin`
              : "0 tin phù hợp"}
          </span>

          <AdminPagination
            page={safePage}
            lastPage={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </section>
    </>
  );
}
