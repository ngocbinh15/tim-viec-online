import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/services/auth-session";
import { WorkspaceContentSkeleton } from "./profile-skeleton";
import { getCandidatePreview } from "@/services/candidate-workspace";
import { MyJobs } from "./my-jobs";
import { CandidateMessages } from "./candidate-messages";
import { CandidateNotifications } from "./candidate-notifications";
import { AccountSettings } from "./account-settings";

const titles = {
  jobs: "Việc làm của tôi",
  messages: "Tin nhắn",
  notifications: "Thông báo của bạn",
  settings: "Quản lý tài khoản",
};
export function AccountWorkspace({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  return (
    <Suspense fallback={<WorkspaceContentSkeleton />}>
      <AccountContent params={params} />
    </Suspense>
  );
}
async function AccountContent({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!Object.hasOwn(titles, section) && section !== "alerts") notFound();
  // Always revalidate the authenticated role close to private data access.
  await requireUser("candidate", `/account/${section}`);
  if (section === "alerts") redirect("/account/notifications");
  await getCandidatePreview();
  if (section === "jobs") return <MyJobs />;
  if (section === "messages") return <CandidateMessages />;
  if (section === "notifications") return <CandidateNotifications />;
  return <AccountSettings />;
}
