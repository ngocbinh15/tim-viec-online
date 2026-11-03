import "server-only";
import { requireUser } from "./auth-session";

export async function getCandidateProfileAccount() {
  const user = await requireUser("candidate", "/account/profile");
  // Authentication is checked again before private profile data is read.
  return {
    user,
    capabilities: {
      readProfile: true,
      saveProfile: true,
      uploadCv: true,
    } as const,
  };
}
