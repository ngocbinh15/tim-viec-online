import type { ReactNode } from "react";
import { getCurrentUser } from "@/services/auth-session";
import { getCandidatePreview } from "@/services/candidate-workspace";
import { WorkspaceProvider } from "./workspace-provider";

// One authenticated workspace spans public job pages and the account area.
// API mode loads only Laravel data; private pages keep their DAL guards.
export async function CandidateWorkspaceSession({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (user?.role !== "candidate") return children;
  const initial = await getCandidatePreview();
  return (
    <WorkspaceProvider key={`candidate:${user.id}`} initial={initial}>
      {children}
    </WorkspaceProvider>
  );
}
