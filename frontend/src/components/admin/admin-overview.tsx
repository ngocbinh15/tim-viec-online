"use client";
import { AdminDialogContent as DialogContent } from "./admin-dialog-content";

import { useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Eye,
  Files,
  Flag,
  House,
  Info,
  Users,
} from "lucide-react";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/cores/shadcn/components/ui/dialog";
import {
  calculateTrendPoints,
  formatDateVN,
  formatNumber,
  getInitials,
} from "@/features/admin/formatters";
import { formatDate, vietnamToday } from "@/features/jobs/formatters";
import type { AdminCompany, AdminJob, AdminUser } from "@/features/admin/types";
import { useAdminData } from "./admin-provider";

export function AdminOverview() {
  const { db, pending, reset, isMock } = useAdminData();
  const [trendDays, setTrendDays] = useState<number>(7);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  useLayoutEffect(() => () => setSelectedUser(null), []);
  const [chartTooltip, setChartTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Reset preview data
  const handleResetPreview = () => {
    reset();
  };

  // Metrics calculations
  const candidatesCount = useMemo(
    () => db.users.filter((user) => user.role === "candidate").length,
    [db.users],
  );

  const employersCount = useMemo(
    () => db.users.filter((user) => user.role === "employer").length,
    [db.users],
  );

  const activeJobsCount = useMemo(
    () => db.jobs.filter((job) => job.status === "active").length,
    [db.jobs],
  );

  const totalApplications = useMemo(
    () =>
      db.jobs.reduce((total, job) => total + (job.applications_count || 0), 0),
    [db.jobs],
  );

  // Reported jobs
  const reportedJobs = useMemo(
    () =>
      db.jobs
        .filter((job) => job.is_reported)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [db.jobs],
  );

  // Recent 4 users
  const recentUsers = useMemo(
    () =>
      [...db.users]
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
        .slice(0, 4),
    [db.users],
  );

  // Top 4 categories with active jobs
  const activeCategories = useMemo(
    () =>
      db.categories
        .map((cat) => ({
          ...cat,
          count: db.jobs.filter(
            (job) => job.status === "active" && job.category_id === cat.id,
          ).length,
        }))
        .filter((cat) => cat.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 4),
    [db.categories, db.jobs],
  );

  // Company lookup helper
  const getCompany = (job: AdminJob): AdminCompany | undefined =>
    db.companies.find((comp) => comp.id === job.company_id);

  // Trend points for the SVG chart
  const trendPoints = useMemo(
    () =>
      db.stats
        ? db.stats.trends.slice(-trendDays).map((point) => ({
            date: point.date,
            jobs: point.jobs_count,
            applications: point.applications_count,
          }))
        : calculateTrendPoints(db.jobs, db.applications, trendDays),
    [db.stats, db.jobs, db.applications, trendDays],
  );

  // SVG Chart math logic
  const chartConfig = useMemo(() => {
    const days = trendDays;
    const maximum = Math.max(
      5,
      ...trendPoints.map((point) => Math.max(point.applications, point.jobs)),
    );
    const ceiling = Math.ceil(maximum / 5) * 5;
    const width = 620;
    const height = 238;
    const left = 29;
    const right = 14;
    const top = 12;
    const bottom = 34;
    const plotHeight = height - top - bottom;
    const gap = (width - left - right) / days;

    const getX = (index: number) => left + (index + 0.5) * gap;
    const getY = (value: number) =>
      top + plotHeight - (value / ceiling) * plotHeight;

    const gridLines = Array.from({ length: 4 }, (_, index) => {
      const value = (ceiling / 3) * index;
      return {
        value: Math.round(value),
        y: getY(value),
      };
    });

    const barWidth = Math.min(24, gap / 2.5);

    const polylinePoints = trendPoints
      .map((point, index) => `${getX(index)},${getY(point.applications)}`)
      .join(" ");

    return {
      width,
      height,
      left,
      right,
      plotHeight,
      ceiling,
      gap,
      getX,
      getY,
      gridLines,
      barWidth,
      polylinePoints,
    };
  }, [trendDays, trendPoints]);

  const selectedUserCompany = useMemo(() => {
    if (!selectedUser || selectedUser.role !== "employer") return null;
    return db.companies.find((c) => c.user_id === selectedUser.id) ?? null;
  }, [selectedUser, db.companies]);

  const selectedUserJobsCount = useMemo(() => {
    if (!selectedUserCompany) return 0;
    return db.jobs.filter((j) => j.company_id === selectedUserCompany.id)
      .length;
  }, [selectedUserCompany, db.jobs]);

  const todayIso = vietnamToday();
  const todayFormatted = useMemo(() => formatDate(todayIso), [todayIso]);

  return (
    <>
      {/* Breadcrumb */}
      <nav className="ap-breadcrumb" aria-label="Vị trí trang">
        <House className="ap-icon" aria-hidden="true" />
        <Link href="/admin">Quản trị</Link>
        <span>/</span>
        <span>Tổng quan hệ thống</span>
      </nav>

      {/* Page Heading */}
      <div className="ap-page-heading">
        <div>
          <h1>Tổng quan hệ thống</h1>
          <p>Theo dõi hoạt động tuyển dụng và những nội dung cần xử lý.</p>
        </div>
        <div className="ap-date">
          <CalendarDays className="ap-icon" aria-hidden="true" />
          <time dateTime={todayIso} suppressHydrationWarning>
            {todayFormatted}
          </time>
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

      {/* Metrics Cards */}
      <section
        className="ap-metrics"
        id="overviewMetrics"
        aria-label="Số liệu tổng quan"
      >
        {/* Metric 1: Tổng tài khoản */}
        <article className="ap-metric">
          <div className="ap-metric-top">
            <span>Tổng tài khoản</span>
            <Users className="ap-icon" aria-hidden="true" />
          </div>
          <strong>
            {formatNumber(db.stats?.users_count ?? db.users.length)}
          </strong>
          <small>
            {db.stats?.total_candidates ?? candidatesCount} ứng viên ·{" "}
            {db.stats?.total_employers ?? employersCount} nhà tuyển dụng
          </small>
        </article>

        {/* Metric 2: Tin tuyển dụng */}
        <article className="ap-metric">
          <div className="ap-metric-top">
            <span>Tin tuyển dụng</span>
            <BriefcaseBusiness className="ap-icon" aria-hidden="true" />
          </div>
          <strong>
            {formatNumber(db.stats?.total_jobs ?? db.jobs.length)}
          </strong>
          <small>
            {db.stats?.active_jobs ?? activeJobsCount} tin đang tuyển
          </small>
        </article>

        {/* Metric 3: Lượt ứng tuyển */}
        <article className="ap-metric">
          <div className="ap-metric-top">
            <span>Lượt ứng tuyển</span>
            <Files className="ap-icon" aria-hidden="true" />
          </div>
          <strong>
            {formatNumber(db.stats?.total_applications ?? totalApplications)}
          </strong>
          <small>Hồ sơ đã nộp cho các tin hiện có</small>
        </article>

        {/* Metric 4: Tin bị báo cáo */}
        <article className="ap-metric ap-metric-alert">
          <div className="ap-metric-top">
            <span>Tin bị báo cáo</span>
            <Flag className="ap-icon" aria-hidden="true" />
          </div>
          <strong>
            {formatNumber(db.stats?.reported_jobs ?? reportedJobs.length)}
          </strong>
          <small>Cần quản trị viên kiểm tra nội dung</small>
        </article>
      </section>

      {/* Overview Grid 1: Trend Chart & Reported Jobs */}
      <div className="ap-overview-grid">
        {/* Hoạt động tuyển dụng */}
        <section className="ap-panel" aria-labelledby="trendTitle">
          <div className="ap-panel-heading">
            <div>
              <h2 id="trendTitle">Hoạt động tuyển dụng</h2>
              <p>Tin đăng mới và lượt ứng tuyển theo ngày.</p>
            </div>
            <div
              className="ap-chart-period"
              role="group"
              aria-label="Khoảng thời gian thống kê"
            >
              {[7, 14].map((days) => (
                <Button
                  key={days}
                  type="button"
                  size="sm"
                  variant={trendDays === days ? "default" : "outline"}
                  aria-pressed={trendDays === days}
                  onClick={() => setTrendDays(days)}
                >
                  {days} ngày
                </Button>
              ))}
            </div>
          </div>

          <div className="ap-chart">
            <div className="ap-chart-key">
              <span>
                <i className="ap-chart-dot" aria-hidden="true" />
                Tin đăng mới
              </span>
              <span>
                <i
                  className="ap-chart-dot ap-chart-dot-green"
                  aria-hidden="true"
                />
                Lượt ứng tuyển
              </span>
            </div>

            {/* Interactive SVG Chart */}
            <div
              className="ap-chart-plot relative"
              id="trendChart"
              suppressHydrationWarning
            >
              <svg
                viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
                role="img"
                aria-label={`Hoạt động tuyển dụng trong ${trendDays} ngày. Cột xanh là số tin đăng mới, đường xanh lá là lượt ứng tuyển.`}
              >
                {/* Horizontal Grid lines */}
                {chartConfig.gridLines.map((grid, idx) => (
                  <g key={idx}>
                    <line
                      x1={chartConfig.left}
                      y1={grid.y}
                      x2={chartConfig.width - chartConfig.right}
                      y2={grid.y}
                      className="ap-chart-grid"
                    />
                    <text
                      x={chartConfig.left - 9}
                      y={grid.y + 3}
                      textAnchor="end"
                    >
                      {grid.value}
                    </text>
                  </g>
                ))}

                {/* Bars for jobs */}
                {trendPoints.map((point, index) => {
                  const x = chartConfig.getX(index) - chartConfig.barWidth / 2;
                  const y = chartConfig.getY(point.jobs);
                  const barHeight =
                    (chartConfig.plotHeight * point.jobs) / chartConfig.ceiling;
                  const label = `${formatDateVN(point.date)}: ${point.jobs} tin đăng mới`;
                  return (
                    <rect
                      key={`bar-${point.date}`}
                      className="ap-chart-bar cursor-pointer transition-opacity hover:opacity-100"
                      x={x}
                      y={y}
                      width={chartConfig.barWidth}
                      height={barHeight}
                      rx={3}
                      aria-hidden="true"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const parent = e.currentTarget
                          .closest(".ap-chart-plot")
                          ?.getBoundingClientRect();
                        if (parent) {
                          setChartTooltip({
                            x: rect.left - parent.left + rect.width / 2,
                            y: rect.top - parent.top - 8,
                            text: label,
                          });
                        }
                      }}
                      onMouseLeave={() => setChartTooltip(null)}
                    />
                  );
                })}

                {/* Polyline for applications */}
                <polyline
                  className="ap-chart-line"
                  points={chartConfig.polylinePoints}
                />

                {/* Dots on applications polyline */}
                {trendPoints.map((point, index) => {
                  const cx = chartConfig.getX(index);
                  const cy = chartConfig.getY(point.applications);
                  const label = `${formatDateVN(point.date)}: ${point.applications} lượt ứng tuyển`;
                  return (
                    <circle
                      key={`dot-${point.date}`}
                      className="ap-chart-points cursor-pointer transition-transform hover:scale-125"
                      cx={cx}
                      cy={cy}
                      r={3}
                      aria-hidden="true"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const parent = e.currentTarget
                          .closest(".ap-chart-plot")
                          ?.getBoundingClientRect();
                        if (parent) {
                          setChartTooltip({
                            x: rect.left - parent.left + rect.width / 2,
                            y: rect.top - parent.top - 8,
                            text: label,
                          });
                        }
                      }}
                      onMouseLeave={() => setChartTooltip(null)}
                    />
                  );
                })}

                {/* X Axis Labels */}
                {trendPoints
                  .filter(
                    (_, index) =>
                      trendDays === 7 ||
                      index % 2 === 0 ||
                      index === trendDays - 1,
                  )
                  .map((point) => {
                    const originalIndex = trendPoints.indexOf(point);
                    return (
                      <text
                        key={`label-${point.date}`}
                        x={chartConfig.getX(originalIndex)}
                        y={chartConfig.height - 8}
                        textAnchor="middle"
                      >
                        {point.date.slice(8)}/{point.date.slice(5, 7)}
                      </text>
                    );
                  })}
              </svg>

              {/* Interactive Tooltip */}
              {chartTooltip && (
                <div
                  className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-md whitespace-nowrap"
                  style={{ left: chartTooltip.x, top: chartTooltip.y }}
                >
                  {chartTooltip.text}
                </div>
              )}
            </div>

            <p className="ap-chart-footnote">
              {isMock
                ? "Số liệu minh họa đến ngày 16/10/2026."
                : "Số liệu được tổng hợp từ hoạt động trên hệ thống."}
            </p>

            {/* Table Fallback Details */}
            <details className="mt-3">
              <summary className="ap-text-link cursor-pointer">
                Xem số liệu dạng bảng
              </summary>
              <div className="ap-table-wrap mt-3" id="trendData">
                <table className="ap-table">
                  <caption className="ap-sr-only">
                    Số liệu tuyển dụng {trendDays} ngày
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Ngày</th>
                      <th scope="col">Tin đăng mới</th>
                      <th scope="col">Lượt ứng tuyển</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendPoints.map((point) => (
                      <tr key={point.date}>
                        <th scope="row">{formatDateVN(point.date)}</th>
                        <td>{point.jobs}</td>
                        <td>{point.applications}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </section>

        {/* Cần kiểm tra (Reported Jobs) */}
        <section className="ap-panel" aria-labelledby="reportsTitle">
          <div className="ap-panel-heading">
            <div>
              <h2 id="reportsTitle">Cần kiểm tra</h2>
              <p>Tin được đánh dấu báo cáo vi phạm.</p>
            </div>
            <span className="ap-badge ap-badge-amber" id="overviewReportCount">
              {reportedJobs.length} tin
            </span>
          </div>

          <div className="ap-summary-list" id="reportedSummary">
            {reportedJobs.length > 0 ? (
              reportedJobs.slice(0, 3).map((job) => {
                const company = getCompany(job);
                return (
                  <article key={job.id} className="ap-summary-item">
                    <Flag
                      className="ap-icon ap-tone-warning"
                      aria-hidden="true"
                    />
                    <div>
                      <Link
                        className="ap-cell-title"
                        href={`/admin/jobs/${job.id}`}
                      >
                        {job.title}
                      </Link>
                      <p>
                        {company?.name ?? "Doanh nghiệp"} ·{" "}
                        {formatDateVN(job.created_at)}
                      </p>
                      <Link
                        className="ap-text-link"
                        href={`/admin/jobs/${job.id}`}
                      >
                        Kiểm tra nội dung{" "}
                        <ArrowRight className="ap-icon" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="ap-empty">
                <CheckCircle2 className="ap-icon" aria-hidden="true" />
                <h3>Đã xử lý hết hàng chờ</h3>
                <p>Hiện không có tin bị báo cáo.</p>
              </div>
            )}
          </div>

          <div className="ap-panel-bottom">
            <Link className="ap-text-link" href="/admin/jobs?report=reported">
              Đi đến kiểm duyệt{" "}
              <ArrowRight className="ap-icon" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      {/* Overview Grid 2: Recent Users & Active Categories */}
      <div className="ap-overview-grid">
        {/* Tài khoản mới */}
        <section className="ap-panel" aria-labelledby="recentTitle">
          <div className="ap-panel-heading">
            <div>
              <h2 id="recentTitle">Tài khoản mới</h2>
              <p>Các thành viên vừa tham gia nền tảng.</p>
            </div>
            <Link className="ap-text-link" href="/admin/users">
              Xem tất cả <ArrowRight className="ap-icon" aria-hidden="true" />
            </Link>
          </div>

          <div className="ap-table-wrap">
            <table className="ap-table ap-table-responsive">
              <caption className="ap-sr-only">
                Bốn tài khoản đăng ký gần đây
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tài khoản</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Ngày tham gia</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody id="recentUsers">
                {recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="ap-person">
                        <span
                          className={`ap-avatar ${
                            user.role === "employer" ? "ap-avatar-company" : ""
                          }`}
                        >
                          {getInitials(user.name)}
                        </span>
                        <div>
                          <strong className="ap-cell-title">{user.name}</strong>
                          <span className="ap-cell-sub">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Vai trò">
                      {user.role === "admin" && (
                        <span className="ap-badge ap-badge-amber">
                          Quản trị viên
                        </span>
                      )}
                      {user.role === "employer" && (
                        <span className="ap-badge ap-badge-green">
                          Nhà tuyển dụng
                        </span>
                      )}
                      {user.role === "candidate" && (
                        <span className="ap-badge ap-badge-blue">Ứng viên</span>
                      )}
                    </td>
                    <td className="ap-number" data-label="Ngày tham gia">
                      {formatDateVN(user.created_at)}
                    </td>
                    <td>
                      <div className="ap-actions">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-[11px] px-2.5"
                          onClick={() => setSelectedUser(user)}
                          aria-label={`Xem tài khoản ${user.name}`}
                        >
                          <Eye className="size-3.5" aria-hidden="true" />
                          Xem
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Ngành nghề đang tuyển */}
        <section className="ap-panel" aria-labelledby="categoryTitle">
          <div className="ap-panel-heading">
            <div>
              <h2 id="categoryTitle">Ngành nghề đang tuyển</h2>
              <p>Phân bổ tin tuyển dụng đang hoạt động.</p>
            </div>
          </div>

          <div className="ap-summary-list" id="categorySummary">
            {activeCategories.length > 0 ? (
              activeCategories.map((category) => (
                <div key={category.id} className="ap-summary-item">
                  <div>
                    <strong>{category.name}</strong>
                    <small>Tin đang tuyển</small>
                  </div>
                  <span className="ap-badge ap-badge-blue">
                    {category.count} tin
                  </span>
                </div>
              ))
            ) : (
              <div className="ap-empty">
                <p>Chưa có tin đang tuyển.</p>
              </div>
            )}
          </div>

          <div className="ap-panel-bottom">
            <Link className="ap-text-link" href="/admin/categories">
              Quản lý ngành nghề{" "}
              <ArrowRight className="ap-icon" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      {/* User Details Dialog Modal */}
      <Dialog
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      >
        <DialogContent
          className="admin-page ap-modal max-w-[480px] p-6"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>Chi tiết tài khoản</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="pt-2">
              <div className="ap-account-heading">
                <span
                  className={`ap-avatar ${
                    selectedUser.role === "employer" ? "ap-avatar-company" : ""
                  }`}
                >
                  {getInitials(selectedUser.name)}
                </span>
                <div>
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.email}</p>
                </div>
              </div>

              <dl className="ap-account-facts">
                <div>
                  <dt>Vai trò</dt>
                  <dd>
                    {selectedUser.role === "admin" && (
                      <span className="ap-badge ap-badge-amber">
                        Quản trị viên
                      </span>
                    )}
                    {selectedUser.role === "employer" && (
                      <span className="ap-badge ap-badge-green">
                        Nhà tuyển dụng
                      </span>
                    )}
                    {selectedUser.role === "candidate" && (
                      <span className="ap-badge ap-badge-blue">Ứng viên</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>
                    <span
                      className={`ap-badge ${
                        selectedUser.status === "locked"
                          ? "ap-badge-red"
                          : "ap-badge-green"
                      }`}
                    >
                      {selectedUser.status === "locked"
                        ? "Bị khóa"
                        : "Hoạt động"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Số điện thoại</dt>
                  <dd>{selectedUser.phone || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Ngày tham gia</dt>
                  <dd>{formatDateVN(selectedUser.created_at)}</dd>
                </div>
                {selectedUserCompany && (
                  <>
                    <div>
                      <dt>Doanh nghiệp</dt>
                      <dd>{selectedUserCompany.name}</dd>
                    </div>
                    <div>
                      <dt>Tin đã đăng</dt>
                      <dd>{selectedUserJobsCount} tin</dd>
                    </div>
                  </>
                )}
              </dl>

              <DialogFooter className="ap-modal-actions mx-0 mb-0 rounded-none bg-transparent p-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setSelectedUser(null)}
                >
                  Đóng
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
