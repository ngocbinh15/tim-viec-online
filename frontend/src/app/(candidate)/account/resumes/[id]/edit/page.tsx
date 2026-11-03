import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireResumeAccount } from "@/services/resumes";
import { ResumeEditor } from "@/components/resumes/resume-editor";
import { WorkspaceContentSkeleton } from "@/components/candidate/profile-skeleton";
export const metadata = {
  title: "Chỉnh sửa CV",
  robots: { index: false, follow: false },
};
type Props = { params: Promise<{ id: string }> };
export default function EditResumePage(props: Props) {
  return (
    <Suspense fallback={<WorkspaceContentSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}
async function Content({ params }: Props) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const { connected } = await requireResumeAccount(
    `/account/resumes/${id}/edit`,
  );
  return <ResumeEditor id={Number(id)} connected={connected} />;
}
