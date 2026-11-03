import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { NotFoundContent } from "@/components/feedback/not-found-content";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="site-container page-content recovery-page">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
