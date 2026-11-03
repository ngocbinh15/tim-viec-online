"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Circle,
  Files,
  Lightbulb,
  Plus,
  ScanText,
  UserCheck,
  MessageSquare,
} from "lucide-react";
import { useEmployer } from "./employer-provider";
import { CompanyLogo } from "./company-logo";
import { effectiveJobStatus } from "@/features/employer/rules";
import { EmployerJobs } from "./jobs";
import "./employer-overview.css";
export function EmployerDashboard() {
  const { company, jobs, applications, notifications, today, apiMode } =
    useEmployer();
  const companyChecks = [
    { label: "Tên công ty", complete: !!company.name.trim() },
    { label: "Giới thiệu công ty", complete: !!company.description.trim() },
    { label: "Địa chỉ trụ sở", complete: !!company.address.trim() },
    { label: "Tỉnh / thành phố", complete: !!company.city.trim() },
  ];
  const completed = companyChecks.filter((check) => check.complete).length;
  const unseen = applications.filter((app) => app.status === "applied").length;
  const unread = notifications.filter((item) => !item.read_at).length;
  const featured = applications
    .filter((app) => app.analysis && app.status !== "withdrawn")
    .sort((a, b) => b.analysis!.match_score - a.analysis!.match_score)
    .slice(0, 3);
  const metrics = [
    {
      label: "Tin đang tuyển",
      value: jobs.filter((job) => effectiveJobStatus(job, today) === "active")
        .length,
      note: `Trong tổng số ${jobs.length} tin tuyển dụng`,
      icon: BriefcaseBusiness,
    },
    {
      label: "Hồ sơ đã nhận",
      value: applications.length,
      note: `${applications.filter((app) => app.status === "applied").length} hồ sơ chưa xem`,
      icon: Files,
    },
    ...[
      {
        label: "CV phù hợp từ 80%",
        value: applications.filter(
          (app) =>
            app.analysis &&
            app.analysis.match_score >= 80 &&
            app.status !== "withdrawn",
        ).length,
        note: "Dựa trên kết quả phân tích CV mẫu",
        icon: ScanText,
      },
    ],
    {
      label: "Hồ sơ trúng tuyển",
      value: applications.filter((app) => app.status === "accepted").length,
      note: "Đã xác nhận tuyển dụng",
      icon: UserCheck,
    },
  ];
  return (
    <div className="ep-overview">
      <div className="ep-page-heading">
        <div>
          <h1>Tổng quan tuyển dụng</h1>
          <p>
            Chào {company.name}, cùng theo dõi hoạt động tuyển dụng hôm nay.
          </p>
        </div>
        <Link className="ep-button ep-button-primary" href="/employer/jobs/new">
          <Plus className="ep-icon" />
          Đăng tin tuyển dụng
        </Link>
      </div>
      <section
        className="ep-overview-actions"
        aria-label="Công việc cần theo dõi"
      >
        <Link href="/employer/candidates?status=applied">
          <Files className="ep-icon" aria-hidden="true" />
          <span>
            <strong>{unseen} hồ sơ mới</strong>
            <small>Xem hồ sơ và bắt đầu xét duyệt</small>
          </span>
          <ArrowRight className="ep-icon" aria-hidden="true" />
        </Link>
        <Link href="/employer/notifications?read=unread">
          <MessageSquare className="ep-icon" aria-hidden="true" />
          <span>
            <strong>{unread} thông báo chưa đọc</strong>
            <small>Theo dõi cập nhật từ ứng viên</small>
          </span>
          <ArrowRight className="ep-icon" aria-hidden="true" />
        </Link>
        <Link href="/employer/company">
          <BriefcaseBusiness className="ep-icon" aria-hidden="true" />
          <span>
            <strong>
              {completed === 4
                ? "Hồ sơ công ty đã sẵn sàng"
                : "Hoàn thiện hồ sơ công ty"}
            </strong>
            <small>{completed}/4 thông tin bắt buộc đã bổ sung</small>
          </span>
          <ArrowRight className="ep-icon" aria-hidden="true" />
        </Link>
      </section>
      <section
        className="ep-metrics"
        data-api={apiMode}
        aria-label="Thống kê tuyển dụng"
      >
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <article key={label} className="ep-metric">
            <div className="ep-metric-top">
              {label}
              <Icon className="ep-icon" aria-hidden="true" />
            </div>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <div className="ep-workspace">
        <div>
          <EmployerJobs compact />
          {
            <section className="ep-panel ep-candidates">
              <div className="ep-panel-heading">
                <div>
                  <h2>Hồ sơ đáng chú ý</h2>
                  <p>Ứng viên đã ứng tuyển với độ phù hợp CV cao.</p>
                </div>
                <Link className="ep-text-link" href="/employer/candidates">
                  Xem tất cả
                  <ArrowRight className="ep-icon" />
                </Link>
              </div>
              {!featured.length && (
                <p className="ep-subtle">
                  Ch?a c? k?t qu? ph?n t?ch CV. K?t qu? s? xu?t hi?n sau khi h?
                  s? ???c x? l?.
                </p>
              )}
              {featured.map((app) => (
                <article className="ep-candidate" key={app.id}>
                  <span className="ep-avatar">
                    {app.name
                      .split(" ")
                      .slice(-2)
                      .map((word) => word[0])
                      .join("")}
                  </span>
                  <div className="ep-candidate-info">
                    <strong>{app.name}</strong>
                    <p>{app.title}</p>
                    <Link
                      className="ep-featured-job"
                      href={`/employer/candidates?job_id=${app.job_id}`}
                    >
                      <BriefcaseBusiness
                        className="ep-icon"
                        aria-hidden="true"
                      />
                      Ứng tuyển:{" "}
                      {jobs.find((job) => job.id === app.job_id)?.title ??
                        "Tin tuyển dụng"}{" "}
                      · #{app.job_id}
                    </Link>
                  </div>
                  <span
                    className="ep-score"
                    data-score-tone={
                      app.analysis!.match_score >= 80
                        ? "high"
                        : app.analysis!.match_score >= 60
                          ? "medium"
                          : "low"
                    }
                    aria-label={`Điểm phù hợp với tin #${app.job_id}: ${app.analysis!.match_score}%`}
                  >
                    {app.analysis!.match_score}%
                  </span>
                  <Link
                    className="ep-text-link"
                    href={`/employer/candidates/${app.id}`}
                  >
                    Xem hồ sơ
                    <ArrowRight className="ep-icon" />
                  </Link>
                </article>
              ))}
              {!featured.length && (
                <div className="ep-empty">
                  <strong>Chưa có hồ sơ được phân tích</strong>
                  <p>Các hồ sơ có kết quả phù hợp CV sẽ xuất hiện tại đây.</p>
                  <Link className="ep-button" href="/employer/candidates">
                    Xem hồ sơ ứng viên
                  </Link>
                </div>
              )}
            </section>
          }
        </div>
        <aside className="ep-aside">
          <section className="ep-panel ep-company">
            <h2>Hồ sơ doanh nghiệp</h2>
            <div className="ep-company-header">
              <CompanyLogo company={company} />
              <div>
                <strong>{company.name}</strong>
                <small>
                  {company.city} · {company.company_size}
                </small>
              </div>
            </div>
            <div className="ep-progress-label">
              <span>Thông tin bắt buộc</span>
              <strong>{completed}/4 đã bổ sung</strong>
            </div>
            <div
              className="ep-progress"
              role="progressbar"
              aria-label="Mức hoàn thiện hồ sơ công ty"
              aria-valuenow={completed * 25}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${completed * 25}%` }} />
            </div>
            <ul className="ep-company-checks">
              {companyChecks.map((check) => (
                <li key={check.label} data-complete={check.complete}>
                  {check.complete ? (
                    <CheckCircle2 className="ep-icon" aria-hidden="true" />
                  ) : (
                    <Circle className="ep-icon" aria-hidden="true" />
                  )}
                  <span>
                    {check.label}
                    {!check.complete && " · Chưa bổ sung"}
                  </span>
                </li>
              ))}
            </ul>
            <Link className="ep-button" href="/employer/company">
              Cập nhật hồ sơ công ty
              <ArrowUpRight className="ep-icon" />
            </Link>
          </section>
          <section className="ep-panel ep-activity">
            <h2>Hoạt động gần đây</h2>
            {[...notifications]
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 3)
              .map((item) => (
                <div className="ep-event" key={item.id}>
                  <span className="ep-event-icon">
                    <Files className="ep-icon" />
                  </span>
                  <div>
                    <p>
                      <Link href={item.href}>{item.title}</Link>
                    </p>
                    <small>
                      {new Date(item.created_at).toLocaleDateString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </small>
                  </div>
                </div>
              ))}
            {!notifications.length && (
              <p className="ep-overview-no-activity">
                Chưa có hoạt động mới. Hồ sơ và tin nhắn từ ứng viên sẽ xuất
                hiện tại đây.
              </p>
            )}
            <Link className="ep-text-link" href="/employer/notifications">
              Xem tất cả thông báo
              <ArrowRight className="ep-icon" />
            </Link>
          </section>
          <section className="ep-panel ep-guide">
            <Lightbulb className="ep-icon" />
            <h2>Một tin đăng tốt tạo nên kết nối tốt.</h2>
            <p>
              Mô tả rõ công việc, kỹ năng cần có và khoảng lương để ứng viên
              hiểu hơn về cơ hội tại công ty.
            </p>
            <Link href="/employer/jobs/new">Tạo tin tuyển dụng mới →</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
