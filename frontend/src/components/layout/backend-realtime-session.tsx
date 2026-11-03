import { authApiEnabled } from "@/services/auth-mode";
import { getCurrentUser } from "@/services/auth-session";
import { BackendRealtime } from "./backend-realtime";
import { publicRealtimeConfig } from "@/features/api/realtime-config";

export async function BackendRealtimeSession() {
  if (!authApiEnabled()) return null;
  const config = publicRealtimeConfig(process.env);
  if (!config) return null;
  const user = await getCurrentUser();
  return user ? (
    <BackendRealtime key={user.id} userId={user.id} config={config} />
  ) : null;
}
