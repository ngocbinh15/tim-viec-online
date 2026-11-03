import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/modules/cores/shadcn/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="companies-page">
      <div className="companies-container company-error">
        <div className="surface empty-state">
          <Building2 size={42} aria-hidden="true" />
          <h1>Không tìm thấy doanh nghiệp</h1>
          <p>Hồ sơ không tồn tại hoặc chưa được công khai.</p>
          <Button asChild className="h-11">
            <Link href="/companies">Khám phá doanh nghiệp</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
