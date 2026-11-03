import type { Metadata } from "next";
import { Suspense } from "react";
import { getCandidateProfileAccount } from "@/services/candidate-profile";
import { WorkspaceContentSkeleton } from "@/components/candidate/profile-skeleton";
import { ProfileEditor } from "@/components/candidate/profile-editor";
import { getCandidatePreview } from "@/services/candidate-workspace";
import { getProvinceNames } from "@/services/locations";
import { vietnamToday } from "@/features/jobs/formatters";

export const metadata: Metadata = {
  title: "Hồ sơ của tôi",
  robots: { index: false },
};
export default function AccountProfilePage() {
  return (
    <Suspense fallback={<WorkspaceContentSkeleton />}>
      <AccountProfile />
    </Suspense>
  );
}
async function AccountProfile() {
  await getCandidateProfileAccount();
  const [initial, cities] = await Promise.all([
    getCandidatePreview(),
    getProvinceNames(),
  ]);
  return (
    <ProfileEditor
      initial={initial.profile}
      cities={cities}
      today={vietnamToday()}
    />
  );
}
