import "server-only";
import { requireUser } from "./auth-session";
import { authApiEnabled } from "./auth-mode";
export async function requireResumeAccount(returnTo: string) {
  await requireUser("candidate", returnTo);
  return { connected: authApiEnabled() };
}
