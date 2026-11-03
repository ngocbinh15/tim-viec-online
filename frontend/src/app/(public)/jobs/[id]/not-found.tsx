import Link from "next/link";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
export default function JobNotFound() {
  return (
    <main id="main" className="site-container page-content">
      <section className="surface empty-state">
        <h1>Không tìm thấy việc làm</h1>
        <p>Công việc không tồn tại hoặc đã bị xóa.</p>
        <Button asChild className="h-11">
          <Link href="/jobs">Khám phá việc làm khác</Link>
        </Button>
      </section>
    </main>
  );
}
