"use client";
import { AdminDialogContent as DialogContent } from "./admin-dialog-content";

import { useCallback, useId, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { toast } from "sonner";
import { useAdminData } from "./admin-provider";
import { AdminPagination } from "./admin-pagination";
import { SearchableSelectionField } from "@/components/forms/selection-field";
import {
  AlertTriangle,
  House,
  Info,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/cores/shadcn/components/ui/dialog";
import { formatNumber } from "@/features/admin/formatters";
import type { AdminSkill } from "@/features/admin/types";
import "./admin.css";

const PAGE_SIZE = 6;
const MAX_SKILL_LENGTH = 100;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export function AdminSkills() {
  const { db, execute, pending, reset, isMock } = useAdminData();
  const prefix = useId();
  const [query, setQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<"all" | "used" | "unused">(
    "all",
  );
  const [sortFilter, setSortFilter] = useState<"name" | "usage" | "newest">(
    "name",
  );
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<AdminSkill | null>(null);
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingSkill, setDeletingSkill] = useState<AdminSkill | null>(null);

  const showToast = (message: string) => {
    toast.success(message);
  };

  useLayoutEffect(
    () => () => {
      setIsEditOpen(false);
      setDeletingSkill(null);
    },
    [],
  );

  // Reset preview data
  const handleResetPreview = () => {
    reset();
    setQuery("");
    setUsageFilter("all");
    setSortFilter("name");
    setCurrentPage(1);
    setIsEditOpen(false);
    setDeletingSkill(null);
    showToast("Đã khôi phục dữ liệu mẫu ban đầu.");
  };

  // Helper count jobs for a skill
  const jobsCountFor = useCallback(
    (skillId: number): number =>
      db.jobs.filter((j) => j.skills.includes(skillId)).length,
    [db.jobs],
  );

  // Total usage (jobs + candidate CVs)
  const totalUsageFor = useCallback(
    (skill: AdminSkill): number =>
      jobsCountFor(skill.id) + (skill.candidates_count || 0),
    [jobsCountFor],
  );

  // Metrics summary
  const totalSkills = db.skills.length;
  const usedCount = useMemo(
    () => db.skills.filter((s) => totalUsageFor(s) > 0).length,
    [db.skills, totalUsageFor],
  );
  const unusedCount = totalSkills - usedCount;

  // Filtered rows
  const filteredSkills = useMemo(() => {
    const q = normalize(query);
    return db.skills
      .filter((skill) => {
        const matchesQuery = !q || normalize(skill.name).includes(q);
        const usage = totalUsageFor(skill);
        const matchesUsage =
          usageFilter === "all" ||
          (usageFilter === "used" ? usage > 0 : usage === 0);
        return matchesQuery && matchesUsage;
      })
      .sort((a, b) => {
        if (sortFilter === "name") {
          return a.name.localeCompare(b.name, "vi");
        }
        if (sortFilter === "usage") {
          const usageA = totalUsageFor(a);
          const usageB = totalUsageFor(b);
          return usageB - usageA || a.name.localeCompare(b.name, "vi");
        }
        // newest
        return b.id - a.id;
      });
  }, [db.skills, totalUsageFor, query, usageFilter, sortFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSkills.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedSkills = useMemo(
    () => filteredSkills.slice(startIndex, startIndex + PAGE_SIZE),
    [filteredSkills, startIndex],
  );

  // Clear filters
  const handleClearFilters = () => {
    setQuery("");
    setUsageFilter("all");
    setSortFilter("name");
    setCurrentPage(1);
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingSkill(null);
    setFormName("");
    setFormError(null);
    setIsEditOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (skill: AdminSkill) => {
    setEditingSkill(skill);
    setFormName(skill.name);
    setFormError(null);
    setIsEditOpen(true);
  };

  // Save (Create or Update) Skill
  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim().replace(/\s+/g, " ");

    const result = await execute({
      type: "save-skill",
      id: editingSkill?.id,
      name: trimmed,
    });
    if (!result.success) {
      setFormError(result.message);
      return;
    }
    if (editingSkill) {
      showToast(
        isMock
          ? "Đã cập nhật kỹ năng trong dữ liệu mẫu."
          : "Đã cập nhật kỹ năng.",
      );
    } else {
      setQuery(trimmed);
      setUsageFilter("all");
      setCurrentPage(1);
      showToast(
        isMock ? "Đã thêm kỹ năng trong dữ liệu mẫu." : "Đã thêm kỹ năng.",
      );
    }

    setIsEditOpen(false);
  };

  // Confirm delete skill (cascades unlinking from jobs)
  const handleConfirmDelete = async () => {
    if (!deletingSkill) return;

    const result = await execute({
      type: "delete-skill",
      id: deletingSkill.id,
    });
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setDeletingSkill(null);
    showToast(isMock ? "Đã xóa kỹ năng trong dữ liệu mẫu." : "Đã xóa kỹ năng.");
  };

  const deletingJobsCount = deletingSkill ? jobsCountFor(deletingSkill.id) : 0;
  const deletingCandidatesCount = deletingSkill
    ? deletingSkill.candidates_count || 0
    : 0;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="ap-breadcrumb" aria-label="Vị trí trang">
        <House className="ap-icon" aria-hidden="true" />
        <Link href="/admin">Quản trị</Link>
        <span>/</span>
        <span>Danh mục kỹ năng</span>
      </nav>

      {/* Page Heading */}
      <div className="ap-page-heading">
        <div>
          <h1>Danh mục kỹ năng</h1>
          <p>Chuẩn hóa kỹ năng cho hồ sơ ứng viên và yêu cầu tuyển dụng.</p>
        </div>
        <button
          type="button"
          className="ap-button ap-button-primary"
          onClick={handleOpenCreate}
        >
          <Plus className="ap-icon" aria-hidden="true" />
          Thêm kỹ năng
        </button>
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

      {/* Info notice */}
      <div className="ap-notice">
        <Info className="ap-icon" aria-hidden="true" />
        <p>
          Xóa kỹ năng sẽ gỡ kỹ năng đó khỏi tin tuyển dụng và hồ sơ ứng viên
          liên quan. Nội dung tin và hồ sơ được giữ lại.
        </p>
      </div>

      {/* Panel */}
      <section className="ap-panel" aria-labelledby={`${prefix}-listTitle`}>
        <div className="ap-panel-heading">
          <div>
            <h2 id={`${prefix}-listTitle`}>Danh sách kỹ năng</h2>
            <p id="catalogSummary">
              {totalSkills} mục · {usedCount} đang được sử dụng · {unusedCount}{" "}
              chưa sử dụng
            </p>
          </div>
          <span className="ap-badge ap-badge-blue">Danh mục hệ thống</span>
        </div>

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
                placeholder="Tìm tên kỹ năng…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                autoComplete="off"
              />
            </span>
          </label>

          {/* Usage Filter */}
          <div className="ap-filter">
            <span>Tình trạng sử dụng</span>
            <SearchableSelectionField
              name="listUsage"
              label="Tình trạng sử dụng"
              placeholder="Tất cả"
              value={usageFilter === "all" ? "" : usageFilter}
              onValueChange={(value) => {
                setUsageFilter((value || "all") as "all" | "used" | "unused");
                setCurrentPage(1);
              }}
              options={[
                { value: "used", label: "Đang được sử dụng" },
                { value: "unused", label: "Chưa được sử dụng" },
              ]}
            />
          </div>

          {/* Sort Filter */}
          <div className="ap-filter">
            <span>Sắp xếp</span>
            <SearchableSelectionField
              name="listSort"
              label="Sắp xếp"
              placeholder="Tên A → Z"
              value={sortFilter === "name" ? "" : sortFilter}
              onValueChange={(value) => {
                setSortFilter((value || "name") as "name" | "usage" | "newest");
                setCurrentPage(1);
              }}
              options={[
                { value: "usage", label: "Được dùng nhiều nhất" },
                { value: "newest", label: "Thêm gần đây" },
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
        {filteredSkills.length > 0 ? (
          <div className="ap-table-wrap" id={`${prefix}-listTable`}>
            <table className="ap-table ap-table-responsive">
              <caption className="ap-sr-only">
                Danh mục kỹ năng và số liên kết sử dụng
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tên kỹ năng</th>
                  <th scope="col">Tin tuyển dụng</th>
                  <th scope="col">Hồ sơ ứng viên</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody id={`${prefix}-listRows`}>
                {paginatedSkills.map((skill) => {
                  const jobCount = jobsCountFor(skill.id);
                  const candidateCount = skill.candidates_count || 0;

                  return (
                    <tr key={skill.id}>
                      <td>
                        <strong className="ap-cell-title">{skill.name}</strong>
                      </td>
                      <td data-label="Tin tuyển dụng" className="ap-number">
                        {formatNumber(jobCount)} tin
                      </td>
                      <td data-label="Hồ sơ ứng viên" className="ap-number">
                        {formatNumber(candidateCount)} hồ sơ
                      </td>
                      <td>
                        <div className="ap-actions">
                          <button
                            type="button"
                            className="ap-icon-button"
                            onClick={() => handleOpenEdit(skill)}
                            aria-label={`Sửa ${skill.name}`}
                          >
                            <Pencil className="ap-icon" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="ap-icon-button"
                            onClick={() => setDeletingSkill(skill)}
                            aria-label={`Xóa ${skill.name}`}
                          >
                            <Trash2 className="ap-icon" aria-hidden="true" />
                          </button>
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
            {filteredSkills.length > 0
              ? `Hiển thị ${startIndex + 1}–${Math.min(
                  startIndex + PAGE_SIZE,
                  filteredSkills.length,
                )} trên ${formatNumber(filteredSkills.length)} mục`
              : "0 mục phù hợp"}
          </span>

          <AdminPagination
            page={safePage}
            lastPage={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </section>

      {/* ======================================================== */}
      {/* Modal 1: Create / Edit Skill                             */}
      {/* ======================================================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent
          className="admin-page ap-modal max-w-[480px] p-6"
          aria-describedby={`${prefix}-edit-skill-desc`}
        >
          <DialogHeader>
            <DialogTitle>{editingSkill ? "Sửa" : "Thêm"} kỹ năng</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSaveSkill}
            aria-busy={pending}
            className="space-y-4 pt-2"
          >
            <DialogDescription id={`${prefix}-edit-skill-desc`}>
              Tên rõ ràng, nhất quán giúp việc tìm kiếm và phân loại chính xác
              hơn.
            </DialogDescription>

            <label className="ap-field block" htmlFor={`${prefix}-catalogName`}>
              <span className="text-xs font-semibold text-[var(--ap-navy)] block mb-1">
                Tên kỹ năng
              </span>
              <Input
                id={`${prefix}-catalogName`}
                aria-invalid={!!formError}
                aria-describedby={
                  formError ? `${prefix}-catalog-error` : undefined
                }
                name="name"
                type="text"
                value={formName}
                maxLength={MAX_SKILL_LENGTH}
                required
                autoComplete="off"
                placeholder="Ví dụ: ReactJS, TypeScript, Docker…"
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="min-h-11"
              />
              <small className="text-[11px] text-[var(--ap-muted)] block mt-1">
                Bắt buộc · Tối đa {MAX_SKILL_LENGTH} ký tự.
              </small>
            </label>

            {formError && (
              <p
                id={`${prefix}-catalog-error`}
                className="ap-field-error text-xs ap-tone-danger"
                role="alert"
              >
                {formError}
              </p>
            )}

            <DialogFooter className="ap-modal-actions mx-0 mb-0 rounded-none bg-transparent p-0 pt-4">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setIsEditOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={pending}
                variant="default"
                className="min-h-11"
              >
                {isMock ? "Lưu vào bản xem trước" : "Lưu kỹ năng"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* Modal 2: Delete Skill                                    */}
      {/* ======================================================== */}
      <Dialog
        open={!!deletingSkill}
        onOpenChange={(open) => !open && setDeletingSkill(null)}
      >
        <DialogContent
          className="admin-page ap-modal max-w-[480px] p-6"
          aria-describedby={`${prefix}-delete-skill-desc`}
        >
          <DialogHeader>
            <DialogTitle>Xóa kỹ năng?</DialogTitle>
          </DialogHeader>

          {deletingSkill && (
            <div className="space-y-4 pt-2" id={`${prefix}-delete-skill-desc`}>
              <p className="text-xs text-[var(--ap-text)]">
                Bạn muốn xóa <strong>{deletingSkill.name}</strong> khỏi danh
                mục?
              </p>

              {(deletingJobsCount > 0 || deletingCandidatesCount > 0) && (
                <div className="ap-notice ap-notice-amber">
                  <AlertTriangle
                    className="ap-icon shrink-0 ap-tone-warning"
                    aria-hidden="true"
                  />
                  <p className="text-xs leading-relaxed">
                    Kỹ năng sẽ được gỡ khỏi{" "}
                    <strong>{deletingJobsCount} tin tuyển dụng</strong> và{" "}
                    <strong>{deletingCandidatesCount} hồ sơ ứng viên</strong>.
                    Tin và hồ sơ vẫn được giữ lại.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-[var(--ap-muted)]">
                {isMock
                  ? "Thao tác này chỉ áp dụng cho dữ liệu minh họa."
                  : "Kỹ năng sẽ bị xóa khỏi danh mục và các liên kết hiện có."}
              </p>

              <DialogFooter className="ap-modal-actions mx-0 mb-0 rounded-none bg-transparent p-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setDeletingSkill(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="min-h-11"
                  onClick={handleConfirmDelete}
                  disabled={pending}
                >
                  Xóa khỏi danh mục
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
