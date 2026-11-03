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
  AlertCircle,
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
import type { AdminCategory } from "@/features/admin/types";
import "./admin.css";

const PAGE_SIZE = 6;
const MAX_CATEGORY_LENGTH = 150;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export function AdminCategories() {
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
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(
    null,
  );
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingCategory, setDeletingCategory] =
    useState<AdminCategory | null>(null);

  const showToast = (message: string) => {
    toast.success(message);
  };

  useLayoutEffect(
    () => () => {
      setIsEditOpen(false);
      setDeletingCategory(null);
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
    setDeletingCategory(null);
    showToast("Đã khôi phục dữ liệu mẫu ban đầu.");
  };

  // Helper count jobs for a category
  const jobsCountFor = useCallback(
    (categoryId: number): number =>
      db.jobs.filter((j) => j.category_id === categoryId).length,
    [db.jobs],
  );

  // Metrics summary
  const totalCategories = db.categories.length;
  const usedCount = useMemo(
    () => db.categories.filter((c) => jobsCountFor(c.id) > 0).length,
    [db.categories, jobsCountFor],
  );
  const unusedCount = totalCategories - usedCount;

  // Filtered rows
  const filteredCategories = useMemo(() => {
    const q = normalize(query);
    return db.categories
      .filter((cat) => {
        const matchesQuery = !q || normalize(cat.name).includes(q);
        const count = jobsCountFor(cat.id);
        const matchesUsage =
          usageFilter === "all" ||
          (usageFilter === "used" ? count > 0 : count === 0);
        return matchesQuery && matchesUsage;
      })
      .sort((a, b) => {
        if (sortFilter === "name") {
          return a.name.localeCompare(b.name, "vi");
        }
        if (sortFilter === "usage") {
          const countA = jobsCountFor(a.id);
          const countB = jobsCountFor(b.id);
          return countB - countA || a.name.localeCompare(b.name, "vi");
        }
        // newest
        return b.id - a.id;
      });
  }, [db.categories, jobsCountFor, query, usageFilter, sortFilter]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedCategories = useMemo(
    () => filteredCategories.slice(startIndex, startIndex + PAGE_SIZE),
    [filteredCategories, startIndex],
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
    setEditingCategory(null);
    setFormName("");
    setFormError(null);
    setIsEditOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (category: AdminCategory) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormError(null);
    setIsEditOpen(true);
  };

  // Save (Create or Update) Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim().replace(/\s+/g, " ");

    const result = await execute({
      type: "save-category",
      id: editingCategory?.id,
      name: trimmed,
    });
    if (!result.success) {
      setFormError(result.message);
      return;
    }
    if (editingCategory) {
      showToast(
        isMock
          ? "Đã cập nhật ngành nghề trong dữ liệu mẫu."
          : "Đã cập nhật ngành nghề.",
      );
    } else {
      setQuery(trimmed);
      setUsageFilter("all");
      setCurrentPage(1);
      showToast(
        isMock
          ? "Đã thêm ngành nghề trong dữ liệu mẫu."
          : "Đã thêm ngành nghề.",
      );
    }

    setIsEditOpen(false);
  };

  // Confirm delete category
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    const cat = deletingCategory;
    const count = jobsCountFor(cat.id);

    if (count > 0) return; // Prevent deleting used category

    const result = await execute({
      type: "delete-category",
      id: deletingCategory.id,
    });
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setDeletingCategory(null);
    showToast(
      isMock ? "Đã xóa ngành nghề trong dữ liệu mẫu." : "Đã xóa ngành nghề.",
    );
  };

  const deletingJobsCount = deletingCategory
    ? jobsCountFor(deletingCategory.id)
    : 0;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="ap-breadcrumb" aria-label="Vị trí trang">
        <House className="ap-icon" aria-hidden="true" />
        <Link href="/admin">Quản trị</Link>
        <span>/</span>
        <span>Danh mục ngành nghề</span>
      </nav>

      {/* Page Heading */}
      <div className="ap-page-heading">
        <div>
          <h1>Danh mục ngành nghề</h1>
          <p>Tổ chức ngành nghề để ứng viên tìm được công việc phù hợp.</p>
        </div>
        <button
          type="button"
          className="ap-button ap-button-primary"
          onClick={handleOpenCreate}
        >
          <Plus className="ap-icon" aria-hidden="true" />
          Thêm ngành nghề
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
          Ngành nghề đang có tin tuyển dụng cần được giữ lại. Bạn có thể sửa tên
          để làm rõ cách phân loại.
        </p>
      </div>

      {/* Panel */}
      <section className="ap-panel" aria-labelledby={`${prefix}-listTitle`}>
        <div className="ap-panel-heading">
          <div>
            <h2 id={`${prefix}-listTitle`}>Danh sách ngành nghề</h2>
            <p id="catalogSummary">
              {totalCategories} mục · {usedCount} đang được sử dụng ·{" "}
              {unusedCount} chưa sử dụng
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
                placeholder="Tìm tên ngành nghề…"
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
        {filteredCategories.length > 0 ? (
          <div className="ap-table-wrap" id={`${prefix}-listTable`}>
            <table className="ap-table ap-table-responsive">
              <caption className="ap-sr-only">
                Danh mục ngành nghề và số tin tuyển dụng liên quan
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tên ngành nghề</th>
                  <th scope="col">Tin tuyển dụng</th>
                  <th scope="col">Tình trạng sử dụng</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody id={`${prefix}-listRows`}>
                {paginatedCategories.map((cat) => {
                  const count = jobsCountFor(cat.id);
                  const isUsed = count > 0;

                  return (
                    <tr key={cat.id}>
                      <td>
                        <strong className="ap-cell-title">{cat.name}</strong>
                      </td>
                      <td data-label="Tin tuyển dụng" className="ap-number">
                        {formatNumber(count)} tin
                      </td>
                      <td data-label="Tình trạng sử dụng">
                        {isUsed ? (
                          <span className="ap-badge ap-badge-green">
                            Đang sử dụng
                          </span>
                        ) : (
                          <span className="ap-badge">Chưa sử dụng</span>
                        )}
                      </td>
                      <td>
                        <div className="ap-actions">
                          <button
                            type="button"
                            className="ap-icon-button"
                            onClick={() => handleOpenEdit(cat)}
                            aria-label={`Sửa ${cat.name}`}
                          >
                            <Pencil className="ap-icon" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="ap-icon-button"
                            onClick={() => setDeletingCategory(cat)}
                            aria-label={`Xóa ${cat.name}`}
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
            {filteredCategories.length > 0
              ? `Hiển thị ${startIndex + 1}–${Math.min(
                  startIndex + PAGE_SIZE,
                  filteredCategories.length,
                )} trên ${formatNumber(filteredCategories.length)} mục`
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
      {/* Modal 1: Create / Edit Category                          */}
      {/* ======================================================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent
          className="admin-page ap-modal max-w-[480px] p-6"
          aria-describedby={`${prefix}-edit-cat-desc`}
        >
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Sửa" : "Thêm"} ngành nghề
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSaveCategory}
            aria-busy={pending}
            className="space-y-4 pt-2"
          >
            <DialogDescription id={`${prefix}-edit-cat-desc`}>
              Tên rõ ràng, nhất quán giúp việc tìm kiếm và phân loại chính xác
              hơn.
            </DialogDescription>

            <label className="ap-field block" htmlFor={`${prefix}-catalogName`}>
              <span className="text-xs font-semibold text-[var(--ap-navy)] block mb-1">
                Tên ngành nghề
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
                maxLength={MAX_CATEGORY_LENGTH}
                required
                autoComplete="off"
                placeholder="Ví dụ: Công nghệ thông tin / Phần mềm"
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="min-h-11"
              />
              <small className="text-[11px] text-[var(--ap-muted)] block mt-1">
                Bắt buộc · Tối đa {MAX_CATEGORY_LENGTH} ký tự.
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
                {isMock ? "Lưu vào bản xem trước" : "Lưu ngành nghề"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* Modal 2: Delete Category                                 */}
      {/* ======================================================== */}
      <Dialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <DialogContent
          className="admin-page ap-modal max-w-[480px] p-6"
          aria-describedby={`${prefix}-delete-cat-desc`}
        >
          <DialogHeader>
            <DialogTitle>
              {deletingJobsCount > 0
                ? "Ngành nghề đang được sử dụng"
                : "Xóa ngành nghề?"}
            </DialogTitle>
          </DialogHeader>

          {deletingCategory && (
            <div className="space-y-4 pt-2" id={`${prefix}-delete-cat-desc`}>
              {deletingJobsCount > 0 ? (
                /* Cannot delete when in use */
                <>
                  <div className="ap-notice ap-notice-amber">
                    <AlertCircle
                      className="ap-icon shrink-0 ap-tone-warning"
                      aria-hidden="true"
                    />
                    <p className="text-xs leading-relaxed">
                      <strong>{deletingCategory.name}</strong> đang có{" "}
                      {deletingJobsCount} tin tuyển dụng. Hãy chuyển các tin
                      sang ngành nghề phù hợp trước khi xóa.
                    </p>
                  </div>
                  <p className="text-xs text-[var(--ap-muted)]">
                    Bạn vẫn có thể sửa tên ngành nghề trong danh sách.
                  </p>
                  <DialogFooter className="ap-modal-actions mx-0 mb-0 rounded-none bg-transparent p-0 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => setDeletingCategory(null)}
                    >
                      Đóng
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                /* Can delete when unused */
                <>
                  <p className="text-xs text-[var(--ap-text)]">
                    Bạn muốn xóa <strong>{deletingCategory.name}</strong> khỏi
                    danh mục?
                  </p>
                  <p className="text-[11px] text-[var(--ap-muted)]">
                    {isMock
                      ? "Thao tác này chỉ áp dụng cho dữ liệu minh họa."
                      : "Ngành nghề sẽ bị xóa khỏi danh mục hệ thống."}
                  </p>
                  <DialogFooter className="ap-modal-actions mx-0 mb-0 rounded-none bg-transparent p-0 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => setDeletingCategory(null)}
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
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
