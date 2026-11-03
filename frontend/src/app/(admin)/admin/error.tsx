"use client";

import Link from "next/link";
import { Button } from "@/modules/cores/shadcn/components/ui/button";

export default function AdminError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <section className="surface empty-state" role="alert">
      <h1>Chưa thể tải nội dung quản trị</h1>
      <p>Vui lòng kiểm tra kết nối và thử lại.</p>
      <Button type="button" onClick={() => retry()}>
        Thử lại
      </Button>
      <Link href="/admin">Về tổng quan</Link>
    </section>
  );
}
