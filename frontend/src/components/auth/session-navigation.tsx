import { getCurrentUser } from "@/services/auth-session";
import { HeaderControls } from "@/components/layout/header-controls";
import { authApiEnabled } from "@/services/auth-mode";
import { getJobCatalog } from "@/services/jobs";

export function GuestNavigation() {
  return (
    <HeaderControls
      pendingSession
      categories={authApiEnabled() ? [] : undefined}
    />
  );
}
export async function SessionNavigation() {
  let user;
  let sessionUnavailable = false;
  const categories = authApiEnabled()
    ? (await getJobCatalog().catch(() => ({ categories: [] }))).categories
    : undefined;
  try {
    user = await getCurrentUser();
  } catch {
    sessionUnavailable = true;
  }
  return (
    <HeaderControls
      user={user ?? undefined}
      sessionUnavailable={sessionUnavailable}
      categories={categories}
    />
  );
}
