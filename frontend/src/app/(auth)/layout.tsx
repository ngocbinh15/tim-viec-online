import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { SiteFooter } from "@/components/layout/site-footer";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="auth-header">
        <div className="site-container">
          <Brand />
          <Link href="/jobs">Khám phá việc làm →</Link>
        </div>
      </header>
      <main id="main" className="auth-main">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
