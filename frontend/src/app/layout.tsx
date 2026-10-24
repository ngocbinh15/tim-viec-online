import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TimViecOnline — Tìm việc phù hợp",
  description: "Nền tảng tìm kiếm việc làm và kết nối ứng viên với nhà tuyển dụng.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
