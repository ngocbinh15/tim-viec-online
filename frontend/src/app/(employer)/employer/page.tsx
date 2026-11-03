import type { Metadata } from "next";
import { EmployerContent } from "@/components/employer/employer-content";
export const metadata: Metadata = {
  title: "Tổng quan tuyển dụng",
  robots: { index: false },
};
export default function EmployerPage() {
  return <EmployerContent section="dashboard" returnTo="/employer" />;
}
