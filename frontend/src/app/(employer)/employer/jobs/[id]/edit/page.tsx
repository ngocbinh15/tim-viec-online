import { Suspense } from "react";
import { notFound } from "next/navigation";
import { EmployerContent } from "@/components/employer/employer-content";
import { EmployerLoading } from "@/components/employer/employer-loading";
export const metadata = {
  title: "Chỉnh sửa tin tuyển dụng",
  robots: { index: false },
};
export default function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EmployerLoading />}>
      <EditJob params={params} />
    </Suspense>
  );
}
async function EditJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  return (
    <EmployerContent
      section="post"
      id={Number(id)}
      returnTo={`/employer/jobs/${id}/edit`}
    />
  );
}
