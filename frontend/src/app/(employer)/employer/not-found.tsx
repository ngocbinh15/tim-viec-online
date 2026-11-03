"use client";

import { NotFoundContent } from "@/components/feedback/not-found-content";
import { useInEmployerShell } from "@/components/employer/employer-shell";

export default function EmployerNotFound() {
  const inShell = useInEmployerShell();
  const content = (
    <NotFoundContent
      title="Không tìm thấy nội dung tuyển dụng"
      description="Hồ sơ hoặc tin tuyển dụng không tồn tại, hoặc liên kết không còn hợp lệ."
      href="/employer/jobs"
      label="Về tin tuyển dụng"
    />
  );
  return inShell ? (
    content
  ) : (
    <main id="main" className="site-container page-content recovery-page">
      {content}
    </main>
  );
}
