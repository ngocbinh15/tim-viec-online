import { Skeleton } from "@/modules/cores/shadcn/components/ui/skeleton";
export function AuthLoading() {
  return (
    <div
      className="auth-loading surface"
      role="status"
      aria-label="Đang tải form"
    >
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <span className="sr-only">Đang tải form…</span>
    </div>
  );
}
