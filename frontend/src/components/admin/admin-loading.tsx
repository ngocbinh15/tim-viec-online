import type { AdminPageKey } from "@/features/admin/types";
import { Skeleton } from "@/modules/cores/shadcn/components/ui/skeleton";
import "./admin.css";

type LoadingSection = AdminPageKey | "detail";
const labels: Record<LoadingSection, string> = {
  overview: "tổng quan hệ thống",
  users: "tài khoản người dùng",
  jobs: "kiểm duyệt tin",
  categories: "ngành nghề",
  skills: "kỹ năng",
  detail: "chi tiết tin tuyển dụng",
};

export function AdminLoading({
  section = "overview",
}: {
  section?: LoadingSection;
}) {
  const catalog = section === "categories" || section === "skills";
  return (
    <div
      className="ap-loading"
      data-admin-loading={section}
      role="status"
      aria-busy="true"
      aria-label="Đang tải dữ liệu quản trị"
    >
      <span className="sr-only">Đang tải {labels[section]}…</span>
      <div aria-hidden="true" className="ap-loading-content">
        <Skeleton className="h-4 w-48 max-w-full" />
        <div className="ap-loading-heading">
          <div className="space-y-3 min-w-0">
            <Skeleton className="h-8 w-72 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-11 w-32 shrink-0" />
        </div>
        {!catalog && section !== "detail" && (
          <div className="ap-metrics">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="ap-metric space-y-4" key={index}>
                <Skeleton className="h-4 w-28 max-w-full" />
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-3 w-36 max-w-full" />
              </div>
            ))}
          </div>
        )}
        {section === "overview" ? (
          <div className="ap-overview-grid">
            <div className="ap-panel p-6 space-y-6">
              <Skeleton className="h-5 w-52 max-w-full" />
              <Skeleton className="h-4 w-72 max-w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="ap-panel p-6 space-y-6">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          </div>
        ) : section === "detail" ? (
          <div className="ap-content-grid">
            <div className="ap-panel p-6 space-y-6">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              ))}
            </div>
            <div className="ap-panel p-6 space-y-5">
              <Skeleton className="size-14 rounded-xl" />
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="ap-panel ap-loading-filters">
              <Skeleton className="h-11 flex-1 min-w-0" />
              {!catalog && (
                <>
                  <Skeleton className="h-11 w-40" />
                  <Skeleton className="h-11 w-40" />
                </>
              )}
            </div>
            <div className="ap-panel ap-loading-table">
              <div className="ap-loading-table-heading">
                <Skeleton className="h-5 w-48 max-w-full" />
              </div>
              {Array.from({ length: 6 }, (_, index) => (
                <div className="ap-loading-row" key={index}>
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                  <div className="space-y-3 flex-1 min-w-0">
                    <Skeleton className="h-4 w-56 max-w-full" />
                    <Skeleton className="h-3 w-36 max-w-full" />
                  </div>
                  <Skeleton className="h-6 w-20 shrink-0" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** The layout itself waits for authentication and the first private snapshot. */
export function AdminWorkspaceLoading() {
  return (
    <div className="admin-page ap-loading-workspace">
      <div className="ap-header" aria-hidden="true">
        <Skeleton className="h-9 w-56 max-w-[60%]" />
        <Skeleton className="size-10 rounded-full" />
      </div>
      <div className="ap-layout">
        <aside className="ap-sidebar space-y-6" aria-hidden="true">
          <Skeleton className="h-3 w-40 max-w-full" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton className="h-11 w-full" key={index} />
          ))}
        </aside>
        <main className="ap-main">
          <AdminLoading />
        </main>
      </div>
    </div>
  );
}
