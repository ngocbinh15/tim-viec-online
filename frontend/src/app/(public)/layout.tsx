import { SiteFooter } from "@/components/layout/site-footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      {children}
      <SiteFooter />
    </>
  );
}
