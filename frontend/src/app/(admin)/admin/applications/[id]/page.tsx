import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/services/auth-session";
import { backendRequest } from "@/services/backend-api";
import { mapApplication, type RawApplication } from "@/features/employer/api";
import { AdminApplicationDetail } from "@/components/admin/admin-application-detail";
import { AdminLoading } from "@/components/admin/admin-loading";

export const metadata: Metadata = {
  title: "Đánh giá hồ sơ ứng tuyển",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function AdminApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<AdminLoading section="detail" />}>
      <Detail params={params} />
    </Suspense>
  );
}
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser("admin", `/admin/applications/${id}`);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  let raw: RawApplication & { job?: { title: string } };
  try {
    raw = (
      await backendRequest<RawApplication & { job?: { title: string } }>(
        `/admin/applications/${id}`,
      )
    ).data;
  } catch (error) {
    if ((error as { status?: number }).status === 404) notFound();
    throw error;
  }
  return (
    <AdminApplicationDetail
      application={mapApplication(raw)}
      jobTitle={raw.job?.title ?? `Tin tuyển dụng #${raw.job_id}`}
    />
  );
}
