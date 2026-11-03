import type { AdminDatabase, AdminUserStatus } from "./types";

export type AdminCommand =
  | { type: "save-category" | "save-skill"; id?: number; name: string }
  | { type: "delete-category" | "delete-skill"; id: number }
  | { type: "set-user-status"; id: number; status: AdminUserStatus }
  | { type: "delete-job"; id: number; reason: string; confirmed: boolean };

export type AdminFailure = {
  success: false;
  code:
    | "validation"
    | "not_found"
    | "conflict"
    | "forbidden"
    | "unavailable"
    | "busy";
  message: string;
  field?: "name" | "reason" | "confirmed";
};
export type AdminMutationResult =
  { success: true; data: AdminDatabase } | AdminFailure;

/** UI-facing contract, not a claim that a Laravel endpoint already exists.
 * A real adapter maps Resource DTOs and refreshes affected projections after writes.
 * It must reject failed writes, never return an optimistic mock success.
 */
export interface AdminWorkspaceAdapter {
  execute(command: AdminCommand): Promise<AdminMutationResult>;
  reset(): AdminDatabase;
}
