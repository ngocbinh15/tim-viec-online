import { Skeleton } from "@/modules/cores/shadcn/components/ui/skeleton";

export default function CompaniesLoading() {
  return (
    <main
      id="main"
      className="companies-page"
      role="status"
      aria-label="Đang tải danh sách doanh nghiệp"
    >
      <span className="sr-only">Đang tải doanh nghiệp tuyển dụng…</span>
      <section className="page-intro">
        <div className="site-container">
          <Skeleton className="mb-4 h-4 w-56" />
          <Skeleton className="mb-4 h-10 w-full max-w-lg" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
      </section>
      <div className="site-container page-content">
        <Skeleton className="mb-7 h-28 rounded-2xl" />
        <Skeleton className="mb-6 h-6 w-44" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
