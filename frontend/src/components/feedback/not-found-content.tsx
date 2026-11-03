import Link from "next/link";
import { Button } from "@/modules/cores/shadcn/components/ui/button";

export function NotFoundContent({
  title = "Không tìm thấy trang",
  description = "Liên kết có thể đã thay đổi hoặc nội dung không còn tồn tại.",
  href = "/jobs",
  label = "Khám phá việc làm",
}: {
  title?: string;
  description?: string;
  href?: string;
  label?: string;
}) {
  return (
    <section className="surface empty-state recovery-card">
      <h1>404</h1>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="recovery-actions">
        <Button asChild className="h-11">
          <Link href={href}>{label}</Link>
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </section>
  );
}
