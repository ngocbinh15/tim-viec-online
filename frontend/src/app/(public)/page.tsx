import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import {
  HomeContent,
  HomeContentSkeleton,
  HomeHero,
} from "@/components/home/home-content";

export const metadata: Metadata = {
  title: "TimViecOnline - Việc Làm Tốt Nhất & Tuyển Dụng Hiệu Quả",
  description:
    "Tìm việc làm, khám phá ngành nghề và kết nối với các doanh nghiệp tuyển dụng tại Việt Nam.",
};

export default function HomePage() {
  return (
    <>
      <SiteHeader variant="home" />
      <main id="main" className="home-page">
        <HomeHero />
        <Suspense fallback={<HomeContentSkeleton />}>
          <HomeContent />
        </Suspense>
      </main>
    </>
  );
}
