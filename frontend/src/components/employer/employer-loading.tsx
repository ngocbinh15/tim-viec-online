import { Skeleton } from "@/modules/cores/shadcn/components/ui/skeleton";
export function EmployerLoading() {
  return (
    <div className="ep-loading" role="status">
      <span className="sr-only">Đang tải không gian tuyển dụng</span>
      <Skeleton className="h-16" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
