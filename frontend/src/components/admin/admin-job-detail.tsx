"use client";
import { AdminDialogContent as DialogContent } from "./admin-dialog-content";

import { useId, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Flag,
  House,
  Inbox,
  Info,
  MapPin,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/cores/shadcn/components/ui/dialog";
import {
  formatDateVN,
  formatSalary,
  getInitials,
  JOB_STATUS_LABELS,
  JOB_TYPE_LABELS,
} from "@/features/admin/formatters";
import { useAdminData } from "./admin-provider";
import { Checkbox } from "@/modules/cores/shadcn/components/ui/checkbox";
import type { AdminJob } from "@/features/admin/types";
import { AdminJobApplications } from "./admin-job-applications";

interface AdminJobDetailProps {
  jobId: number | string;
  preview?: boolean;
  initialJob?: AdminJob;
}

export function AdminJobDetail({
  jobId,
  preview = false,
  initialJob,
}: AdminJobDetailProps) {
  const prefix = useId();
  const { db, execute, pending, reset, isMock } = useAdminData();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteReasonError, setDeleteReasonError] = useState<string | null>(
    null,
  );
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Deleted state after deletion action
  const [deletedInfo, setDeletedInfo] = useState<{
    title: string;
    reason: string;
  } | null>(null);

  // Owner detail modal
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  useLayoutEffect(
    () => () => {
      setShowDeleteModal(false);
      setShowOwnerModal(false);
    },
    [],
  );

  const numericId = typeof jobId === "string" ? Number(jobId) : jobId;
  const workspaceJob = db.jobs.find((j) => j.id === numericId);
  // API bootstrap contains summaries. The protected detail read supplies the
  // narratives; mock edits continue to come from the persistent workspace.
  const job = isMock
    ? (workspaceJob ?? initialJob)
    : initialJob
      ? {
          ...initialJob,
          ...workspaceJob,
          description: initialJob.description,
          requirements: initialJob.requirements,
          benefits: initialJob.benefits,
        }
      : workspaceJob;

  const company = job
    ? db.companies.find((c) => c.id === job.company_id)
    : undefined;
  const category = job
    ? db.categories.find((c) => c.id === job.category_id)
    : undefined;
  const owner = company
    ? db.users.find((u) => u.id === company.user_id)
    : undefined;

  const backUrl = preview ? "/admin/jobs/preview" : "/admin/jobs";

  const handleResetPreview = () => {
    reset();
    setDeletedInfo(null);
    setShowDeleteModal(false);
    setShowOwnerModal(false);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    const trimmedReason = deleteReason.trim();
    if (!trimmedReason || trimmedReason.length > 255) {
      setDeleteReasonError("Vui lòng nhập lý do vi phạm từ 1 đến 255 ký tự.");
      return;
    }

    if (!deleteConfirmed) {
      setConfirmError(
        "Vui lòng xác nhận đã kiểm tra nội dung và hiểu ảnh hưởng của thao tác.",
      );
      return;
    }

    const result = await execute({
      type: "delete-job",
      id: job.id,
      reason: trimmedReason,
      confirmed: deleteConfirmed,
    });
    if (!result.success) {
      if (result.field === "confirmed") setConfirmError(result.message);
      else setDeleteReasonError(result.message);
      return;
    }

    setDeletedInfo({
      title: job.title,
      reason: trimmedReason,
    });
    setShowDeleteModal(false);
  };

  const skillNames = job
    ? job.skills
        .map((id) => db.skills.find((s) => s.id === id)?.name)
        .filter(Boolean)
    : [];

  return (
    <>
      {/* Breadcrumb */}
      <nav className="ap-breadcrumb" aria-label="Vị trí trang">
        <House className="ap-icon" aria-hidden="true" />
        <Link href="/admin">Quản trị</Link>
        <span>/</span>
        <Link href={backUrl}>Kiểm duyệt tin</Link>
        <span>/</span>
        <span>Chi tiết</span>
      </nav>

      {/* Page Heading */}
      <div className="ap-page-heading">
        <div>
          <h1>Chi tiết kiểm duyệt</h1>
          <p>Đọc toàn bộ nội dung và thông tin liên quan trước khi xử lý.</p>
        </div>
        <Link className="ap-button" href={backUrl}>
          <ArrowLeft className="ap-icon" aria-hidden="true" />
          Danh sách tin
        </Link>
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

      {/* Case 1: Job was just deleted */}
      {deletedInfo ? (
        <section className="ap-panel">
          <div className="ap-empty">
            <CheckCircle2
              className="ap-icon ap-tone-success"
              aria-hidden="true"
            />
            <h2>
              {isMock
                ? "Đã xóa tin trong bản xem trước"
                : "Đã xóa tin tuyển dụng"}
            </h2>
            <p>
              Tài khoản nhà tuyển dụng được giữ nguyên. Chưa có dữ liệu thực tế
              bị xóa hoặc thông báo được gửi đi.
            </p>
            <Link className="ap-button ap-button-primary" href={backUrl}>
              Về danh sách kiểm duyệt
            </Link>
          </div>
          <section className="ap-detail-section">
            <h3>Nội dung thông báo dự kiến</h3>
            <p>
              Tin tuyển dụng “{deletedInfo.title}” vi phạm chính sách tuyển
              dụng. Lý do: {deletedInfo.reason}
            </p>
          </section>
        </section>
      ) : !job ? (
        /* Case 2: Job not found */
        <section className="ap-panel ap-empty">
          <Inbox className="ap-icon" aria-hidden="true" />
          <h2>Không tìm thấy tin tuyển dụng</h2>
          <p>Tin có thể đã bị xóa hoặc liên kết không còn hợp lệ.</p>
          <Link className="ap-button ap-button-primary" href={backUrl}>
            Về danh sách tin
          </Link>
        </section>
      ) : (
        /* Case 3: Display Job Detail */
        <div id="jobDetail" aria-live="polite">
          {job.is_reported && (
            <div className="ap-notice ap-notice-amber">
              <Flag
                className="ap-icon ap-tone-warning shrink-0"
                aria-hidden="true"
              />
              <div>
                <strong>Tin tuyển dụng này đã bị báo cáo.</strong>
                <p>
                  Đối chiếu nội dung với chính sách tuyển dụng trước khi đưa ra
                  quyết định xử lý.
                </p>
              </div>
            </div>
          )}

          <div className="ap-content-grid">
            {/* Left Column: Job Description and Requirements */}
            <article className="ap-panel">
              <div className="ap-detail-header">
                <div className="ap-tags">
                  <span className={`ap-badge ap-badge-${job.status}`}>
                    {JOB_STATUS_LABELS[job.status] || job.status}
                  </span>
                  {job.is_reported && (
                    <span className="ap-badge ap-badge-amber">Bị báo cáo</span>
                  )}
                </div>
                <h2>{job.title}</h2>
                <p>{company?.name || "Chưa cập nhật tên công ty"}</p>
                <div className="ap-detail-meta">
                  <span>
                    <MapPin className="ap-icon" aria-hidden="true" />
                    {job.city}
                  </span>
                  <span>
                    <Banknote className="ap-icon" aria-hidden="true" />
                    {formatSalary(job)}
                  </span>
                </div>
              </div>

              <section className="ap-detail-section">
                <h3>Mô tả công việc</h3>
                <p>{job.description}</p>
              </section>

              <section className="ap-detail-section">
                <h3>Yêu cầu chuyên môn</h3>
                <p>{job.requirements}</p>
              </section>

              <section className="ap-detail-section">
                <h3>Quyền lợi &amp; đãi ngộ</h3>
                <p>{job.benefits}</p>
              </section>

              <section className="ap-detail-section">
                <h3>Kỹ năng yêu cầu</h3>
                <div className="ap-tags">
                  {skillNames.length > 0 ? (
                    skillNames.map((name, idx) => <span key={idx}>{name}</span>)
                  ) : (
                    <p>Chưa có kỹ năng được gắn.</p>
                  )}
                </div>
              </section>

              <section className="ap-detail-section">
                <h3>Địa điểm làm việc</h3>
                <p>{job.address || company?.address || job.city}</p>
              </section>
            </article>

            {/* Right Column: Facts, Company Card & Actions */}
            <aside
              className="ap-stack"
              aria-label="Thông tin và quyết định kiểm duyệt"
            >
              {/* Facts Section */}
              <section className="ap-panel">
                <div className="ap-panel-heading">
                  <h2>Thông tin tuyển dụng</h2>
                </div>
                <dl className="ap-facts">
                  <div>
                    <dt>Ngành nghề</dt>
                    <dd>{category?.name || "Chưa phân loại"}</dd>
                  </div>
                  <div>
                    <dt>Cấp bậc</dt>
                    <dd>{job.job_level}</dd>
                  </div>
                  <div>
                    <dt>Số lượng tuyển</dt>
                    <dd>{job.quantity} người</dd>
                  </div>
                  <div>
                    <dt>Hình thức</dt>
                    <dd>{JOB_TYPE_LABELS[job.job_type] || job.job_type}</dd>
                  </div>
                  <div>
                    <dt>Hạn nộp hồ sơ</dt>
                    <dd>{formatDateVN(job.deadline)}</dd>
                  </div>
                  <div>
                    <dt>Ngày đăng</dt>
                    <dd>{formatDateVN(job.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Hồ sơ đã nhận</dt>
                    <dd>{job.applications_count} hồ sơ</dd>
                  </div>
                </dl>
              </section>

              {!isMock && <AdminJobApplications jobId={job.id} />}
              {/* Company Card Section */}
              {company && (
                <section className="ap-panel ap-company-card">
                  <div className="ap-person">
                    <span className="ap-avatar ap-avatar-company">
                      {getInitials(company.name)}
                    </span>
                    <div>
                      <strong className="ap-cell-title">{company.name}</strong>
                      <span className="ap-cell-sub">
                        {company.company_size}
                      </span>
                    </div>
                  </div>
                  <p>{company.description}</p>
                  {owner && (
                    <div style={{ marginTop: "16px" }}>
                      <span
                        className={`ap-badge ${
                          owner.status === "locked"
                            ? "ap-badge-red"
                            : "ap-badge-green"
                        }`}
                      >
                        {owner.status === "locked" ? "Bị khóa" : "Hoạt động"}
                      </span>
                    </div>
                  )}
                  {owner && (
                    <button
                      type="button"
                      className="ap-button ap-button-small"
                      style={{ marginTop: "16px" }}
                      onClick={() => setShowOwnerModal(true)}
                    >
                      <UserRound className="ap-icon" aria-hidden="true" />
                      Xem tài khoản chủ tin
                    </button>
                  )}
                </section>
              )}

              {/* Danger Zone: Delete Violation */}
              <section className="ap-panel ap-danger-section">
                <h3>Xử lý tin vi phạm</h3>
                <p>
                  Xóa tin sẽ xóa các hồ sơ ứng tuyển, hội thoại và dữ liệu liên
                  quan. Thao tác này không tự động khóa tài khoản nhà tuyển
                  dụng.
                </p>
                <button
                  type="button"
                  className="ap-button ap-button-danger"
                  onClick={() => {
                    setDeleteReason("");
                    setDeleteConfirmed(false);
                    setDeleteReasonError(null);
                    setConfirmError(null);
                    setShowDeleteModal(true);
                  }}
                >
                  <Trash2 className="ap-icon" aria-hidden="true" />
                  Xóa tin vi phạm
                </button>
              </section>
            </aside>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Delete Job Confirmation Dialog                           */}
      {/* ======================================================== */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent
          className="admin-page ap-modal max-w-md p-6"
          aria-describedby={`${prefix}-delete-job-dialog-desc`}
        >
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Xóa tin tuyển dụng vi phạm?
            </DialogTitle>
          </DialogHeader>

          {job && (
            <form
              onSubmit={handleConfirmDelete}
              aria-busy={pending}
              className="space-y-4 pt-1"
            >
              <div>
                <p className="font-semibold text-sm text-[var(--ap-navy)]">
                  {job.title}
                </p>
                <p className="text-xs text-[var(--ap-muted)]">
                  {company?.name}
                </p>
              </div>

              <div
                className="ap-notice ap-notice-red"
                id={`${prefix}-delete-job-dialog-desc`}
              >
                <AlertTriangle
                  className="ap-icon shrink-0 ap-tone-danger"
                  aria-hidden="true"
                />
                <p className="text-xs leading-relaxed">
                  Quyết định xóa sẽ ảnh hưởng đến{" "}
                  <strong>{job.applications_count} hồ sơ ứng tuyển</strong>, hội
                  thoại, tin nhắn, kết quả phân tích CV và lượt lưu liên quan.
                </p>
              </div>

              <label
                className="ap-field block"
                htmlFor={`${prefix}-deleteReason`}
              >
                <span className="text-xs font-semibold text-[var(--ap-navy)] block mb-1">
                  Lý do vi phạm
                </span>
                <Textarea
                  id={`${prefix}-deleteReason`}
                  name="reason"
                  maxLength={255}
                  required
                  rows={3}
                  aria-invalid={!!deleteReasonError}
                  aria-describedby={
                    deleteReasonError
                      ? `${prefix}-delete-reason-error`
                      : undefined
                  }
                  value={deleteReason}
                  onChange={(e) => {
                    setDeleteReason(e.target.value);
                    if (deleteReasonError) setDeleteReasonError(null);
                  }}
                  placeholder="Nêu rõ nội dung vi phạm chính sách tuyển dụng…"
                  className="min-h-11"
                />
                <small className="text-[11px] text-[var(--ap-muted)] block mt-1">
                  Bắt buộc · Tối đa 255 ký tự.
                </small>
                {deleteReasonError && (
                  <p
                    id={`${prefix}-delete-reason-error`}
                    className="ap-field-error text-xs ap-tone-danger mt-1"
                    role="alert"
                  >
                    {deleteReasonError}
                  </p>
                )}
              </label>

              <label className="ap-confirm-check flex items-start gap-2 cursor-pointer mt-2">
                <Checkbox
                  id={`${prefix}-confirmDelete`}
                  checked={deleteConfirmed}
                  onCheckedChange={(checked) => {
                    setDeleteConfirmed(checked === true);
                    if (confirmError) setConfirmError(null);
                  }}
                  className="mt-1"
                />
                <span className="text-xs text-[var(--ap-text)] leading-snug">
                  Tôi đã kiểm tra nội dung và hiểu ảnh hưởng của quyết định xóa
                  tin.
                </span>
              </label>
              {confirmError && (
                <p
                  className="ap-field-error text-xs ap-tone-danger"
                  role="alert"
                >
                  {confirmError}
                </p>
              )}

              <p className="text-[11px] text-[var(--ap-muted)] mt-2">
                {isMock
                  ? "Bản xem trước chỉ xóa tin mẫu. Thông báo cho nhà tuyển dụng và xóa dữ liệu thực tế cần được hệ thống xử lý."
                  : "Tin và dữ liệu liên quan sẽ bị xóa. Nhà tuyển dụng sẽ nhận thông báo về quyết định này."}
              </p>

              <DialogFooter className="ap-modal-actions mx-0 mb-0 rounded-none bg-transparent p-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={pending}
                  variant="destructive"
                  className="min-h-11"
                >
                  Xác nhận xóa tin
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* Employer Account Detail Modal                            */}
      {/* ======================================================== */}
      <Dialog open={showOwnerModal} onOpenChange={setShowOwnerModal}>
        <DialogContent
          className="admin-page ap-modal max-w-md p-6"
          aria-describedby={`${prefix}-owner-account-desc`}
        >
          <DialogHeader>
            <DialogTitle>Chi tiết tài khoản chủ tin</DialogTitle>
          </DialogHeader>

          {owner && (
            <div className="pt-2" id={`${prefix}-owner-account-desc`}>
              <div className="ap-account-heading">
                <span className="ap-avatar ap-avatar-company">
                  {getInitials(owner.name)}
                </span>
                <div>
                  <h3>{owner.name}</h3>
                  <p>{owner.email}</p>
                </div>
              </div>

              <dl className="ap-account-facts">
                <div>
                  <dt>Vai trò</dt>
                  <dd>
                    <span className="ap-badge ap-badge-green">
                      Nhà tuyển dụng
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>
                    <span
                      className={`ap-badge ${
                        owner.status === "locked"
                          ? "ap-badge-red"
                          : "ap-badge-green"
                      }`}
                    >
                      {owner.status === "locked" ? "Bị khóa" : "Hoạt động"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Số điện thoại</dt>
                  <dd>{owner.phone || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Ngày tham gia</dt>
                  <dd>{formatDateVN(owner.created_at)}</dd>
                </div>
                {company && (
                  <>
                    <div>
                      <dt>Doanh nghiệp</dt>
                      <dd>{company.name}</dd>
                    </div>
                    <div>
                      <dt>Tin đã đăng</dt>
                      <dd>
                        {
                          db.jobs.filter((j) => j.company_id === company.id)
                            .length
                        }{" "}
                        tin
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              <DialogFooter className="ap-modal-actions mx-0 mb-0 rounded-none bg-transparent p-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setShowOwnerModal(false)}
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
