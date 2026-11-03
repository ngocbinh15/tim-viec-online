import { Suspense, type ReactNode } from "react";
import { ProfileSkeleton } from "@/components/candidate/profile-skeleton";
import { getCurrentUser } from "@/services/auth-session";

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <PreviewSession>{children}</PreviewSession>
    </Suspense>
  );
}

async function PreviewSession({ children }: { children: ReactNode }) {
  // Leaf aliases independently verify the candidate role before redirecting.
  await getCurrentUser();
  return children;
}
