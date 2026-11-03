import { Skeleton } from "@/modules/cores/shadcn/components/ui/skeleton";

export function JobsSkeleton() {
  return (
    <div
      className="site-container page-content"
      role="status"
      aria-label="Đang tải việc làm"
    >
      <span className="sr-only">Đang tải việc làm…</span>
      <Skeleton className="h-56 min-[601px]:h-20 w-full rounded-xl mb-6" />
      <div className="results-layout">
        <div className="grid gap-4">
          {[1, 2, 3].map((id) => (
            <div className="surface p-6 grid gap-3" key={id}>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl hidden lg:block" />
      </div>
    </div>
  );
}
