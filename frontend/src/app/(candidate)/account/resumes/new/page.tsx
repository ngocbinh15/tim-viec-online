import { Suspense } from "react";
import { requireResumeAccount } from "@/services/resumes";
import { ResumeLibrary } from "@/components/resumes/resume-list";
import { WorkspaceContentSkeleton } from "@/components/candidate/profile-skeleton";
export const metadata = {
  title: "Tạo CV mới",
  robots: { index: false, follow: false },
};
export default function NewResumePage() {
  return (
    <Suspense fallback={<WorkspaceContentSkeleton />}>
      <Content />
    </Suspense>
  );
}
async function Content() {
  const { connected } = await requireResumeAccount("/account/resumes/new");
  return <ResumeLibrary connected={connected} create />;
}
