"use client";

import { Button } from "@/modules/cores/shadcn/components/ui/button";

export default function CompaniesError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main id="main" className="companies-page">
      <div className="companies-container company-error">
        <div className="surface empty-state" role="alert">
          <h1>Chưa tải được thông tin doanh nghiệp</h1>
          <p>Vui lòng thử lại sau ít phút.</p>
          <Button className="h-11" onClick={() => retry()}>
            Thử lại
          </Button>
        </div>
      </div>
    </main>
  );
}
