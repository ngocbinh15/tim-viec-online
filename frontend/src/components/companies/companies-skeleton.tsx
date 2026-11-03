import { Skeleton } from "@/modules/cores/shadcn/components/ui/skeleton";

export function CompaniesSkeleton() {
  return (
    <div
      className="companies-container companies-loading"
      role="status"
      aria-label="Đang tải hồ sơ doanh nghiệp"
    >
      <span className="sr-only">Đang tải thông tin doanh nghiệp…</span>
      <Skeleton className="h-52 rounded-3xl" />
      <Skeleton className="h-14 rounded-2xl" />
      <div className="company-loading-detail">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
