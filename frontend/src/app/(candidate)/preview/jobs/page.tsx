import { redirectCandidatePreview } from "@/services/candidate-workspace";

export const metadata = { robots: { index: false, follow: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return redirectCandidatePreview("jobs", searchParams);
}
