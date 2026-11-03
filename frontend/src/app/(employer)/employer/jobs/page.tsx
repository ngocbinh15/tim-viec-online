import type { Metadata } from "next";
import { EmployerContent } from "@/components/employer/employer-content";
export const metadata: Metadata = {
  title: "Tin tuyển dụng của bạn",
  robots: { index: false },
};
export default function EmployerJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EmployerContent
      section="jobs"
      returnTo="/employer/jobs"
      searchParams={searchParams}
    />
  );
}
