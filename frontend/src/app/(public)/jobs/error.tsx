"use client";

import { Button } from "@/modules/cores/shadcn/components/ui/button";
export default function JobsError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main id="main" className="site-container page-content">
      <div className="surface empty-state" role="alert">
        <h1>Chưa tải được thông tin việc làm</h1>
        <p>Vui lòng thử lại sau ít phút.</p>
        <Button onClick={() => retry()} className="h-11">
          Thử lại
        </Button>
      </div>
    </main>
  );
}
