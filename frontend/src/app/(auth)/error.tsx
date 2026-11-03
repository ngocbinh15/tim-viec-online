"use client";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
export default function AuthError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section className="auth-loading surface" role="alert">
      <h1>Chưa thực hiện được yêu cầu</h1>
      <p>Vui lòng kiểm tra kết nối và thử lại.</p>
      <Button className="h-11" onClick={() => retry()}>
        Thử lại
      </Button>
    </section>
  );
}
