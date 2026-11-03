import { Suspense } from "react";
import { notFound } from "next/navigation";
import { EmployerContent } from "@/components/employer/employer-content";
import { EmployerLoading } from "@/components/employer/employer-loading";
const sections = {
  candidates: "Hồ sơ ứng viên",
  messages: "Tin nhắn",
  notifications: "Thông báo tuyển dụng",
  company: "Hồ sơ công ty",
} as const;
export const metadata = {
  title: "Không gian tuyển dụng",
  robots: { index: false },
};
export default function EmployerSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<EmployerLoading />}>
      <Section params={params} searchParams={searchParams} />
    </Suspense>
  );
}
async function Section({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  if (!Object.hasOwn(sections, section)) notFound();
  return (
    <EmployerContent
      section={section as keyof typeof sections}
      returnTo={`/employer/${section}`}
      searchParams={searchParams}
    />
  );
}
