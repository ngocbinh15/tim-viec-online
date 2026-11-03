"use client";
import { AdminDialogContent as DialogContent } from "./admin-dialog-content";

import { useId, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { toast } from "sonner";
import { useAdminData } from "./admin-provider";
import { AdminPagination } from "./admin-pagination";
import { SearchableSelectionField } from "@/components/forms/selection-field";
import {
  Building2,
  Eye,
  House,
  Info,
  LockKeyhole,
  LockKeyholeOpen,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/cores/shadcn/components/ui/dialog";
import {
  formatDateVN,
  formatNumber,
  getInitials,
} from "@/features/admin/formatters";
import type {
  AdminCompany,
  AdminUser,
  AdminUserStatus,
} from "@/features/admin/types";
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

export function AdminUsers() {
  const { db, execute, pending, reset, isMock } = useAdminData();
  const prefix = useId();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);
  const [togglingUser, setTogglingUser] = useState<AdminUser | null>(null);

  useLayoutEffect(
    () => () => {
      setViewingUser(null);
      setTogglingUser(null);
    },
    [],
  );

  // Reset preview data
  const handleResetPreview = () => {
    reset();
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
    toast.success("Đã khôi phục dữ liệu mẫu ban đầu.");
  };

  // Metrics calculations
  const totalUsers = db.users.length;
  const candidatesCount = useMemo(
    () => db.users.filter((u) => u.role === "candidate").length,
    [db.users],
  );
  const employersCount = useMemo(
    () => db.users.filter((u) => u.role === "employer").length,
    [db.users],
  );
  const lockedCount = useMemo(
    () => db.users.filter((u) => u.status === "locked").length,
    [db.users],
  );

  // Filtered rows
  const filteredUsers = useMemo(() => {
    const q = normalize(query);
    return db.users
      .filter((user) => {
        const matchesQuery =
          !q ||
          normalize(user.name).includes(q) ||
          normalize(user.email).includes(q);
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        const matchesStatus =
          statusFilter === "all" || user.status === statusFilter;
        return matchesQuery && matchesRole && matchesStatus;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  }, [db.users, query, roleFilter, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedUsers = useMemo(
    () => filteredUsers.slice(startIndex, startIndex + PAGE_SIZE),
    [filteredUsers, startIndex],
  );

  // Clear all filters
  const handleClearFilters = () => {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  // Toggle user status (lock / unlock)
  const handleConfirmToggle = async () => {
    if (!togglingUser || togglingUser.role === "admin") return;
    const isLocking = togglingUser.status === "active";
    const nextStatus: AdminUserStatus = isLocking ? "locked" : "active";

    const result = await execute({
      type: "set-user-status",
      id: togglingUser.id,
      status: nextStatus,
    });
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    const actionText = isLocking ? "khóa" : "mở khóa";
    toast.success(
      `Đã ${actionText} tài khoản ${togglingUser.name}${isMock ? " trong dữ liệu mẫu" : ""}.`,
    );
    setTogglingUser(null);
  };

  // Helper get company of user
  const getUserCompany = (user: AdminUser): AdminCompany | undefined => {
    if (user.role !== "employer") return undefined;
    return db.companies.find((c) => c.user_id === user.id);
  };

  const viewingCompany = viewingUser ? getUserCompany(viewingUser) : undefined;
  const viewingJobsCount = viewingCompany
    ? db.jobs.filter((j) => j.company_id === viewingCompany.id).length
    : 0;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="ap-breadcrumb" aria-label="Vị trí trang">
        <House className="ap-icon" aria-hidden="true" />
        <Link href="/admin">Quản trị</Link>
        <span>/</span>
        <span>Tài khoản người dùng</span>
      </nav>

      {/* Page Heading */}
      <div className="ap-page-heading">
        <div>
          <h1>Tài khoản người dùng</h1>
          <p>Tra cứu thành viên và quản lý quyền truy cập nền tảng.</p>
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
        id="userMetrics"
        aria-label="Thống kê tài khoản"
      >
        {/* Metric 1: Tổng tài khoản */}
        <article className="ap-metric">
          <div className="ap-metric-top">
            <span>Tổng tài khoản</span>
            <Users className="ap-icon" aria-hidden="true" />
          </div>
          <strong>{formatNumber(totalUsers)}</strong>
          <small>Bao gồm tài khoản quản trị</small>
        </article>

        {/* Metric 2: Ứng viên */}
        <article className="ap-metric">
          <div className="ap-metric-top">
            <span>Ứng viên</span>
            <UserRound className="ap-icon" aria-hidden="true" />
          </div>
          <strong>{formatNumber(candidatesCount)}</strong>
          <small>Tài khoản tìm kiếm việc làm</small>
        </article>

        {/* Metric 3: Nhà tuyển dụng */}
        <article className="ap-metric">
          <div className="ap-metric-top">
            <span>Nhà tuyển dụng</span>
            <Building2 className="ap-icon" aria-hidden="true" />
          </div>
          <strong>{formatNumber(employersCount)}</strong>
          <small>Tài khoản đại diện doanh nghiệp</small>
        </article>

        {/* Metric 4: Tài khoản bị khóa */}
        <article className="ap-metric ap-metric-alert">
          <div className="ap-metric-top">
            <span>Tài khoản bị khóa</span>
            <LockKeyhole className="ap-icon" aria-hidden="true" />
          </div>
          <strong>{formatNumber(lockedCount)}</strong>
          <small>Đã hạn chế quyền truy cập</small>
        </article>
      </section>

      {/* Main Table Panel */}
      <section className="ap-panel" aria-labelledby={`${prefix}-listTitle`}>
        <div className="ap-panel-heading">
          <div>
            <h2 id={`${prefix}-listTitle`}>Danh sách tài khoản</h2>
            <p>Tìm theo tên, email và lọc theo vai trò hoặc trạng thái.</p>
          </div>
          <span className="ap-badge ap-badge-blue">Quản lý truy cập</span>
        </div>

        {/* Toolbar Filters */}
        <form
          className="ap-toolbar"
          id={`${prefix}-listFilters`}
          role="search"
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Search Field */}
          <label className="ap-filter ap-filter-search">
            <span>Tìm kiếm</span>
            <span className="ap-input-wrap">
              <Search className="ap-icon" aria-hidden="true" />
              <Input
                id={`${prefix}-listSearch`}
                data-list-search
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Họ tên hoặc địa chỉ email…"
                autoComplete="off"
              />
            </span>
          </label>

          {/* Role Filter */}
          <div className="ap-filter">
            <span>Vai trò</span>
            <SearchableSelectionField
              name="listRole"
              label="Vai trò"
              placeholder="Tất cả vai trò"
              value={roleFilter === "all" ? "" : roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value || "all");
                setCurrentPage(1);
              }}
              options={[
                { value: "candidate", label: "Ứng viên" },
                { value: "employer", label: "Nhà tuyển dụng" },
                { value: "admin", label: "Quản trị viên" },
              ]}
            />
          </div>

          {/* Status Filter */}
          <div className="ap-filter">
            <span>Trạng thái</span>
            <SearchableSelectionField
              name="listStatus"
              label="Trạng thái"
              placeholder="Tất cả trạng thái"
              value={statusFilter === "all" ? "" : statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value || "all");
                setCurrentPage(1);
              }}
              options={[
                { value: "active", label: "Hoạt động" },
                { value: "locked", label: "Bị khóa" },
              ]}
            />
          </div>

          {/* Clear Button */}
          <button
            type="button"
            className="ap-clear"
            data-clear-filters
            onClick={handleClearFilters}
          >
            Xóa bộ lọc
          </button>
        </form>

        {/* Table of Users */}
        {filteredUsers.length > 0 ? (
          <div className="ap-table-wrap" id={`${prefix}-listTable`}>
            <table className="ap-table ap-table-responsive">
              <caption className="ap-sr-only">
                Tài khoản người dùng phù hợp với bộ lọc
              </caption>
              <thead>
                <tr>
                  <th scope="col">Họ tên & Email</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày tham gia</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody id={`${prefix}-listRows`}>
                {paginatedUsers.map((user) => {
                  const isLocked = user.status === "locked";
                  const isAdmin = user.role === "admin";
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="ap-person">
                          <span
                            className={`ap-avatar ${
                              user.role === "employer"
                                ? "ap-avatar-company"
                                : ""
                            }`}
                          >
                            {getInitials(user.name)}
                          </span>
                          <div>
                            <strong className="ap-cell-title">
                              {user.name}
                            </strong>
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
                          <span className="ap-badge ap-badge-blue">
                            Ứng viên
                          </span>
                        )}
                      </td>
                      <td data-label="Trạng thái">
                        {isLocked ? (
                          <span className="ap-badge ap-badge-red">Bị khóa</span>
                        ) : (
                          <span className="ap-badge ap-badge-green">
                            Hoạt động
                          </span>
                        )}
                      </td>
                      <td className="ap-number" data-label="Ngày tham gia">
                        {formatDateVN(user.created_at)}
                      </td>
                      <td>
                        <div className="ap-actions">
                          {/* View button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-[11px] px-2.5"
                            onClick={() => setViewingUser(user)}
                            aria-label={`Xem tài khoản ${user.name}`}
                          >
                            <Eye className="size-3.5" aria-hidden="true" />
                            Xem
                          </Button>

                          {/* Admin protection or Lock/Unlock toggle */}
                          {isAdmin ? (
                            <span
                              className="ap-badge"
                              title="Tài khoản quản trị được bảo vệ"
                            >
                              <ShieldCheck
                                className="ap-icon ap-tone-brand size-3"
                                aria-hidden="true"
                              />
                              Được bảo vệ
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant={isLocked ? "default" : "outline"}
                              size="sm"
                              className="min-h-11 gap-1 px-2.5"
                              onClick={() => setTogglingUser(user)}
                              aria-label={`${
                                isLocked ? "Mở khóa" : "Khóa"
                              } tài khoản ${user.name}`}
                            >
                              {isLocked ? (
                                <>
                                  <LockKeyholeOpen
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                  Mở khóa
                                </>
                              ) : (
                                <>
                                  <LockKeyhole
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                  Khóa
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ap-empty" id={`${prefix}-listEmpty`}>
            <Search className="ap-icon" aria-hidden="true" />
            <h3>Không tìm thấy kết quả</h3>
            <p>Thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh sách.</p>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}

        {/* Table Footer & Pagination */}
        <div className="ap-table-footer">
          <span id={`${prefix}-listCount`} role="status" aria-live="polite">
            {filteredUsers.length > 0
              ? `Hiển thị ${startIndex + 1}–${Math.min(
                  startIndex + PAGE_SIZE,
                  filteredUsers.length,
                )} trên ${formatNumber(filteredUsers.length)} tài khoản`
              : "0 tài khoản phù hợp"}
          </span>

          <AdminPagination
            page={safePage}
            lastPage={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </section>

      {/* Security notice card under panel */}
      <div className="ap-notice mt-6">
        <ShieldCheck className="ap-icon ap-tone-brand" aria-hidden="true" />
        <div>
          <strong>
            Khóa tài khoản là quyết định ảnh hưởng đến quyền truy cập.
          </strong>
          <p>
            Trong hệ thống thực tế, tài khoản bị khóa phải bị thu hồi phiên đăng
            nhập ngay theo chính sách của nền tảng.
          </p>
        </div>
      </div>

      {/* Dialog 1: View User Detail Modal */}
      <Dialog
        open={!!viewingUser}
        onOpenChange={(open) => !open && setViewingUser(null)}
      >
        <DialogContent className="admin-page ap-modal sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Chi tiết tài khoản</DialogTitle>
            <DialogDescription>
              Thông tin đăng ký, vai trò và trạng thái truy cập của tài khoản.
            </DialogDescription>
          </DialogHeader>

          {viewingUser && (
            <div className="pt-2">
              <div className="ap-account-heading">
                <span
                  className={`ap-avatar ${
                    viewingUser.role === "employer" ? "ap-avatar-company" : ""
                  }`}
                >
                  {getInitials(viewingUser.name)}
                </span>
                <div>
                  <h3>{viewingUser.name}</h3>
                  <p>{viewingUser.email}</p>
                </div>
              </div>

              <dl className="ap-account-facts">
                <div>
                  <dt>Vai trò</dt>
                  <dd>
                    {viewingUser.role === "admin" && (
                      <span className="ap-badge ap-badge-amber">
                        Quản trị viên
                      </span>
                    )}
                    {viewingUser.role === "employer" && (
                      <span className="ap-badge ap-badge-green">
                        Nhà tuyển dụng
                      </span>
                    )}
                    {viewingUser.role === "candidate" && (
                      <span className="ap-badge ap-badge-blue">Ứng viên</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>
                    <span
                      className={`ap-badge ${
                        viewingUser.status === "locked"
                          ? "ap-badge-red"
                          : "ap-badge-green"
                      }`}
                    >
                      {viewingUser.status === "locked"
                        ? "Bị khóa"
                        : "Hoạt động"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Số điện thoại</dt>
                  <dd>{viewingUser.phone || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Ngày tham gia</dt>
                  <dd>{formatDateVN(viewingUser.created_at)}</dd>
                </div>

                {viewingCompany && (
                  <>
                    <div>
                      <dt>Doanh nghiệp</dt>
                      <dd>{viewingCompany.name}</dd>
                    </div>
                    <div>
                      <dt>Tin đã đăng</dt>
                      <dd>{viewingJobsCount} tin</dd>
                    </div>
                  </>
                )}
              </dl>

              <DialogFooter className="ap-modal-actions mx-0 mb-0 rounded-none bg-transparent p-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setViewingUser(null)}
                >
                  Đóng
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Confirm Toggle Status (Lock / Unlock) Modal */}
      <Dialog
        open={!!togglingUser}
        onOpenChange={(open) => !open && setTogglingUser(null)}
      >
        <DialogContent className="admin-page ap-modal sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {togglingUser?.status === "locked"
                ? "Mở khóa tài khoản?"
                : "Khóa tài khoản?"}
            </DialogTitle>
            <DialogDescription>
              Kiểm tra tài khoản và ảnh hưởng của thay đổi trước khi xác nhận.
            </DialogDescription>
          </DialogHeader>

          {togglingUser && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bạn đang {togglingUser.status === "locked" ? "mở khóa" : "khóa"}{" "}
                tài khoản <strong>{togglingUser.name}</strong> (
                {togglingUser.email}).
              </p>

              <div
                className={`ap-notice ${
                  togglingUser.status === "locked" ? "" : "ap-notice-amber"
                }`}
              >
                {togglingUser.status === "locked" ? (
                  <LockKeyholeOpen
                    className="ap-icon ap-tone-success"
                    aria-hidden="true"
                  />
                ) : (
                  <ShieldCheck
                    className="ap-icon ap-tone-warning"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <p>
                    {togglingUser.status === "locked"
                      ? "Tài khoản được phép đăng nhập trở lại sau khi mở khóa."
                      : "Mọi phiên đăng nhập của tài khoản này sẽ bị thu hồi ngay. Tin đăng và hồ sơ được giữ lại."}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                {isMock
                  ? "Thao tác hiện tại chỉ cập nhật dữ liệu minh họa."
                  : "Quyết định này áp dụng cho tài khoản trên hệ thống."}
              </p>

              <DialogFooter className="ap-modal-actions mx-0 mb-0 rounded-none bg-transparent p-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setTogglingUser(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant={
                    togglingUser.status === "locked" ? "default" : "destructive"
                  }
                  onClick={handleConfirmToggle}
                  disabled={pending}
                  className="min-h-11"
                >
                  {togglingUser.status === "locked"
                    ? "Mở khóa tài khoản"
                    : "Khóa tài khoản"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
