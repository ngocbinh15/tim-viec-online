import { Skeleton } from "@/modules/cores/shadcn/components/ui/skeleton";
export function WorkspaceContentSkeleton() {
  return (
    <div
      className="grid gap-4"
      role="status"
      aria-label="Đang tải nội dung tài khoản"
    >
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <span className="sr-only">Đang tải nội dung…</span>
    </div>
  );
}
export function ProfileSkeleton() {
  return (
    <div
      className="candidate-area"
      role="status"
      aria-label="Đang tải hồ sơ ứng viên"
    >
      <Skeleton className="h-80 rounded-xl" />
      <div className="grid gap-4">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <span className="sr-only">Đang tải hồ sơ…</span>
    </div>
  );
}
