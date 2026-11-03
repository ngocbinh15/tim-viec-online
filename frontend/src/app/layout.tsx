import type { Metadata } from "next";
import { Suspense } from "react";
import { CandidateWorkspaceSession } from "@/components/candidate/workspace-session";
import { Be_Vietnam_Pro } from "next/font/google";
import { AppToaster } from "@/components/feedback/app-toaster";
import { ScrollbarLayout } from "@/components/layout/scrollbar-layout";
import { BackendRealtimeSession } from "@/components/layout/backend-realtime-session";
import { AppLoading } from "@/components/layout/app-loading";
import "./globals.css";
import "./site.css";
import "./workspace.css";
import "./auth.css";
import "./header.css";
import "./selection.css";
import "./motion.css";
import "./home.css";
import "./application.css";
import "./feedback.css";
import "./loading.css";

const brandFont = Be_Vietnam_Pro({
  variable: "--font-brand",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tìm việc làm | TimViecOnline",
    template: "%s | TimViecOnline",
  },
  description:
    "Khám phá việc làm theo ngành nghề, địa điểm và mức lương phù hợp.",
  icons: {
    icon: { url: "/brand/logo.png", type: "image/png" },
    apple: "/brand/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${brandFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ScrollbarLayout />
        <Suspense fallback={null}>
          <BackendRealtimeSession />
        </Suspense>
        <Suspense fallback={<AppLoading />}>
          <CandidateWorkspaceSession>{children}</CandidateWorkspaceSession>
        </Suspense>
        <AppToaster />
      </body>
    </html>
  );
}
