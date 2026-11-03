"use client";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
export default function ProtectedError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section className="site-container page-content">
      <section className="surface empty-state" role="alert">
        <h1>Chưa xác minh được phiên đăng nhập</h1>
        <p>Vui lòng kiểm tra kết nối và thử lại.</p>
        <Button className="h-11" onClick={() => retry()}>
          Thử lại
        </Button>
      </section>
    </section>
  );
}
