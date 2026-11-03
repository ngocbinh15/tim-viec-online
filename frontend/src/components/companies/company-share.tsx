"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/modules/cores/shadcn/components/ui/button";

export function CompanyShare({ companyId }: { companyId: number }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="company-share"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(
            new URL(`/companies/${companyId}`, window.location.origin).href,
          );
          toast.success("Đã sao chép liên kết hồ sơ công ty.");
        } catch {
          toast.error(
            "Chưa sao chép được. Bạn có thể sao chép địa chỉ trên trình duyệt.",
          );
        }
      }}
    >
      <Share2 size={15} aria-hidden="true" />
      Chia sẻ hồ sơ
    </Button>
  );
}
