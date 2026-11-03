import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/services/auth-session";
import { EmployerContent } from "@/components/employer/employer-content";
import { EmployerLoading } from "@/components/employer/employer-loading";
import { employerApplicationHref } from "@/features/employer/candidate-navigation";

export const metadata = {
  title: "Chi tiết hồ sơ ứng tuyển",
  robots: { index: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function EmployerApplicationPage(props: PageProps) {
  return (
    <Suspense fallback={<EmployerLoading />}>
      <Application {...props} />
    </Suspense>
  );
}

async function Application({ params, searchParams }: PageProps) {
  const { id } = await params;
  const validId = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0] !== undefined)
      query.set(key, value[0]);
  }
  const returnTo = validId
    ? employerApplicationHref(Number(id), query)
    : "/employer/candidates";
  // Authenticate the leaf before revealing whether an application exists.
  await requireUser("employer", returnTo);
  if (!validId) notFound();
  return (
    <EmployerContent section="candidates" id={Number(id)} returnTo={returnTo} />
  );
}
