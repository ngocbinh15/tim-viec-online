import { SiteHeader } from "@/components/layout/site-header";
import "./companies.css";

export default function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
