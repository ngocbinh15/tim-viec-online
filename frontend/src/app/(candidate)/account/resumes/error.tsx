"use client";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
export default function ResumeError({ reset }: { reset: () => void }) {
  return (
    <section className="resume-error" role="alert">
      <h1>Chưa thể mở CV</h1>
      <p>Vui lòng kiểm tra kết nối và thử lại.</p>
      <Button onClick={reset}>Thử lại</Button>
    </section>
  );
}
