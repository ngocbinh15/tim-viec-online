import type { Metadata } from "next";
import { AdminContent } from "../../_components/admin-content";

export const metadata: Metadata = {
  title: "Chi tiết kiểm duyệt | Quản trị TimViecOnline",
  robots: { index: false },
};

export default function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <AdminContent section="jobs" params={params} />;
}
