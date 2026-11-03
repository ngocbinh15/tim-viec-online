"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEmployer } from "./employer-provider";
import { ApplicationAnalysis } from "./application-analysis";
import {
  APPLICATION_LABELS,
  JOB_STATUS_LABELS,
  type ApplicationStatus,
  type EmployerApplication,
  type EmployerJob,
} from "@/features/employer/types";
import { effectiveJobStatus } from "@/features/employer/rules";
import { employerCandidateListHref } from "@/features/employer/candidate-navigation";
import { SelectionField } from "@/components/forms/selection-field";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/modules/cores/shadcn/components/ui/dialog";
import "./employer-candidates.css";
import "./employer-application-detail.css";

const dateLabel = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("vi-VN");

export function EmployerApplicationDetail({ id }: { id: number }) {
  const { applications, jobs, company } = useEmployer();
  const params = useSearchParams();
  const application = applications.find((item) => item.id === id);
  const job = jobs.find(
    (item) => item.id === application?.job_id && item.company_id === company.id,
  );
  if (!application || !job)
    return (
      <section className="ep-panel ec-empty" role="status">
        <UserRound size={36} aria-hidden="true" />
        <h1>Hồ sơ không khả dụng</h1>
        <p>
          Hồ sơ không tồn tại hoặc không thuộc tin tuyển dụng của công ty bạn.
        </p>
        <Link className="ep-button" href={employerCandidateListHref(params)}>
          Về danh sách hồ sơ
        </Link>
      </section>
    );
  return (
    <ApplicationContent
      key={application.id}
      application={application}
      job={job}
    />
  );
}

function ApplicationContent({
  application,
  job,
}: {
  application: EmployerApplication;
  job: EmployerJob;
}) {
  const headingId = useId();
  const params = useSearchParams();
  const router = useRouter();
  const {
    today,
    apiMode,
    pending,
    conversations,
    openConversation,
    reviewApplication,
    setApplicationStatus,
  } = useEmployer();
  const [nextStatus, setNextStatus] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewTrigger = useRef<HTMLButtonElement>(null);
  const previewClose = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // App Router can hide this route with Activity while preserving its state.
  useLayoutEffect(() => () => setPreviewOpen(false), []);
  const withdrawn = application.status === "withdrawn";
  const canMessage =
    !withdrawn ||
    conversations.some((item) => item.application_id === application.id);
  const jobStatus = effectiveJobStatus(job, today);
  // Only the bundled mock PDF or an authenticated local proxy may be embedded.
  const cvPath =
    application.cv_path === "/demo/employer-cv.pdf" ||
    (apiMode &&
      application.cv_path === `/api/backend/applications/${application.id}/cv`)
      ? application.cv_path
      : null;
  const options = Object.entries(APPLICATION_LABELS)
    .filter(
      ([value]) =>
        value === "accepted" ||
        value === "rejected" ||
        (value === "waiting" && !!application.reviewed_at),
    )
    .map(([value, label]) => ({ value, label, disabled: false }));
  if (!options.some((option) => option.value === application.status))
    options.unshift({
      value: application.status,
      label: APPLICATION_LABELS[application.status],
      disabled: true,
    });

  async function message() {
    const id = await openConversation(application.id);
    if (id === null)
      return toast.error("Không thể mở hội thoại cho hồ sơ này.");
    router.push(`/employer/messages?conversation=${id}`);
  }
  async function preview() {
    if (!cvPath || withdrawn) return;
    const error = await reviewApplication(application.id);
    if (error) return void toast.error(error);
    setPreviewOpen(true);
  }
  async function updateStatus() {
    if (!nextStatus || withdrawn) return;
    const error = await setApplicationStatus(
      application.id,
      nextStatus as ApplicationStatus,
    );
    if (error) toast.error(error);
    else {
      toast.success("Đã cập nhật trạng thái hồ sơ.");
      setNextStatus(null);
    }
  }

  return (
    <div className="ec-page ea-detail">
      <Link className="ea-back" href={employerCandidateListHref(params)}>
        <ArrowLeft size={16} aria-hidden="true" />
        Danh sách hồ sơ
      </Link>
      <section
        className="ep-panel ea-identity"
        aria-labelledby={`${headingId}-profile`}
      >
        <div className="ea-identity-main">
          <span
            className="ec-avatar ec-avatar-blue ea-avatar"
            aria-hidden="true"
          >
            {application.name
              .trim()
              .split(/\s+/)
              .slice(-2)
              .map((part) => part[0])
              .join("")}
          </span>
          <div>
            <p className="ec-eyebrow">HỒ SƠ ỨNG TUYỂN #{application.id}</p>
            <h1 id={`${headingId}-profile`} ref={heading} tabIndex={-1}>
              {application.name}
            </h1>
            <p className="ea-person-description">
              {application.title} · {application.experience_years} năm kinh
              nghiệm
            </p>
            <div className="ea-person-meta">
              <span>{application.city}</span>
              <span>
                <CalendarDays size={14} aria-hidden="true" />
                Nộp ngày {dateLabel(application.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="ea-identity-actions">
          <span className={`ec-status ec-status-${application.status}`}>
            {APPLICATION_LABELS[application.status]}
          </span>
          <button
            type="button"
            className="ep-button ep-button-blue"
            onClick={message}
            disabled={pending || !canMessage}
          >
            <MessageSquare size={16} aria-hidden="true" />
            Nhắn tin cho ứng viên
          </button>
        </div>
      </section>

      <section
        className="ep-panel ea-job-context"
        aria-label="Tin tuyển dụng đã ứng tuyển"
      >
        <span className="ea-context-icon">
          <BriefcaseBusiness size={21} aria-hidden="true" />
        </span>
        <div className="ea-job-title">
          <p className="ec-applied-label">
            Tin tuyển dụng đã ứng tuyển · Tin #{job.id}
          </p>
          <h2>{job.title}</h2>
          <span className={`ec-active-job ec-job-${jobStatus}`}>
            {JOB_STATUS_LABELS[jobStatus]}
          </span>
        </div>
        <div className="ec-context-actions ea-job-links">
          <Link href={`/employer/candidates?job_id=${job.id}`}>
            Hồ sơ cùng tin
          </Link>
          <Link href={`/employer/jobs/${job.id}/edit`}>
            Xem / sửa tin
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        {jobStatus !== "active" && (
          <p className="ea-closed-note">
            Tin tuyển dụng đã đóng / hết hạn. Bạn vẫn có thể xét duyệt hồ sơ và
            tiếp tục trao đổi.
          </p>
        )}
      </section>

      <div className="ea-content-grid">
        <div className="ea-main-column">
          <section
            className="ep-panel ea-panel"
            aria-labelledby={`${headingId}-cv`}
          >
            <div className="ea-section-heading">
              <FileText size={19} aria-hidden="true" />
              <h2 id={`${headingId}-cv`}>CV ứng tuyển</h2>
            </div>
            <div className="ea-cv-card">
              <div className="ec-cv-file">
                <span className="ec-pdf-label">PDF</span>
                <div>
                  <strong>
                    {cvPath ? "employer-cv.pdf" : "Chưa có tệp CV để xem"}
                  </strong>
                  <small>
                    Nộp cùng hồ sơ ngày {dateLabel(application.created_at)}
                  </small>
                </div>
              </div>
              {cvPath && !withdrawn && (
                <button
                  type="button"
                  ref={previewTrigger}
                  className="ep-button ep-button-primary"
                  disabled={pending}
                  onClick={preview}
                >
                  Xem CV ứng tuyển
                </button>
              )}
            </div>
            <p className="ec-cover-letter ec-cv-note">
              {withdrawn
                ? "Ứng viên đã rút đơn. Hồ sơ không còn trong quá trình xét duyệt."
                : !cvPath
                  ? "Bản xem trước chưa có tệp PDF của ứng viên. Trạng thái chưa xem CV được giữ nguyên."
                  : !application.reviewed_at && application.status === "applied"
                    ? "Lần mở CV đầu tiên sẽ chuyển hồ sơ sang Đang xem xét."
                    : application.reviewed_at
                      ? `Đã xem CV ngày ${dateLabel(application.reviewed_at)}.`
                      : "CV được đính kèm cùng hồ sơ ứng tuyển."}
            </p>
            {!apiMode && cvPath && !withdrawn && (
              <p className="ec-preview-label">
                PDF minh họa cho bản xem trước, chưa phải CV thực tế của ứng
                viên.
              </p>
            )}
          </section>

          <section
            className="ep-panel ea-panel"
            aria-labelledby={`${headingId}-contact`}
          >
            <div className="ea-section-heading">
              <UserRound size={19} aria-hidden="true" />
              <h2 id={`${headingId}-contact`}>Thông tin ứng viên</h2>
            </div>
            <dl className="ea-contact-grid">
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${application.email}`}>
                    <Mail size={15} aria-hidden="true" />
                    {application.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Số điện thoại</dt>
                <dd>
                  {application.phone ? (
                    <a href={`tel:${application.phone.replace(/\s/g, "")}`}>
                      <Phone size={15} aria-hidden="true" />
                      {application.phone}
                    </a>
                  ) : (
                    "Chưa cập nhật"
                  )}
                </dd>
              </div>
              <div>
                <dt>Nơi ở hiện tại</dt>
                <dd>{application.city || "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>Kinh nghiệm</dt>
                <dd>{application.experience_years} năm kinh nghiệm</dd>
              </div>
            </dl>
            <div className="ea-profile-section">
              <h3>Kỹ năng chuyên môn</h3>
              <div className="ec-skill-list">
                {application.skills.length ? (
                  application.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))
                ) : (
                  <p className="ec-cover-letter">
                    Ứng viên chưa cập nhật kỹ năng.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section
            className="ep-panel ea-panel"
            aria-labelledby={`${headingId}-cover`}
          >
            <div className="ea-section-heading">
              <MessageSquare size={19} aria-hidden="true" />
              <h2 id={`${headingId}-cover`}>Thư giới thiệu</h2>
            </div>
            <p className="ec-cover-letter ea-cover-letter">
              {application.cover_letter ||
                "Ứng viên không đính kèm thư giới thiệu."}
            </p>
          </section>
        </div>

        <div className="ea-review-column">
          <section
            className="ep-panel ea-panel ec-review"
            aria-labelledby={`${headingId}-review`}
          >
            <h2 id={`${headingId}-review`}>Xét duyệt hồ sơ</h2>
            <p className="ea-section-description">
              Cập nhật kết quả cho hồ sơ #{application.id} của tin #{job.id}.
            </p>
            {withdrawn ? (
              <p className="ec-cover-letter">
                Không thể cập nhật trạng thái của đơn đã rút.
              </p>
            ) : (
              <>
                <SelectionField
                  name="application_status"
                  label="Trạng thái xét duyệt"
                  placeholder={APPLICATION_LABELS[application.status]}
                  value={nextStatus ?? application.status}
                  clearable={false}
                  options={options}
                  onValueChange={setNextStatus}
                />
                <button
                  type="button"
                  className="ep-button ep-button-primary"
                  disabled={
                    pending || !nextStatus || nextStatus === application.status
                  }
                  onClick={updateStatus}
                >
                  Cập nhật trạng thái
                </button>
              </>
            )}
            {withdrawn && !canMessage && (
              <p className="ec-cover-letter ec-cv-note">
                Chưa có hội thoại trước khi rút đơn nên không thể mở trao đổi
                mới.
              </p>
            )}
          </section>

          <ApplicationAnalysis application={application} jobTitle={job.title} />
        </div>
      </div>

      <Dialog
        open={previewOpen && !!cvPath && !withdrawn}
        onOpenChange={setPreviewOpen}
      >
        <DialogContent
          className="ec-pdf-dialog"
          showCloseButton={false}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            previewClose.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = previewTrigger.current?.isConnected
              ? previewTrigger.current
              : heading.current;
            target?.focus({ preventScroll: true });
          }}
        >
          <DialogHeader>
            <DialogTitle>CV ứng tuyển — {application.name}</DialogTitle>
            <DialogDescription>
              {apiMode
                ? "CV do ứng viên nộp cho vị trí này."
                : "PDF minh họa cho bản xem trước, chưa phải CV thực tế của ứng viên."}
            </DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button
              ref={previewClose}
              type="button"
              variant="ghost"
              size="icon-sm"
              className="dialog-dismiss absolute top-3 right-3"
            >
              <X aria-hidden="true" />
              <span className="sr-only">Đóng</span>
            </Button>
          </DialogClose>
          {previewOpen && cvPath && !withdrawn && (
            <>
              <iframe
                src={cvPath}
                title={`CV của ${application.name}`}
                tabIndex={-1}
                referrerPolicy="no-referrer"
              />
              <a
                className="ep-button"
                href={cvPath}
                download={apiMode ? "CV.pdf" : "CV_minh_hoa.pdf"}
              >
                {apiMode ? "Tải CV" : "Tải CV minh họa"}
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
