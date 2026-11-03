import type { Metadata } from "next";
import { EmployerContent } from "@/components/employer/employer-content";
export const metadata: Metadata = {
  title: "Đăng tin tuyển dụng",
  robots: { index: false },
};
export default function NewJobPage() {
  return <EmployerContent section="post" returnTo="/employer/jobs/new" />;
}
