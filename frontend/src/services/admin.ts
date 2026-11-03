import "server-only";
import { cache } from "react";
import { requireUser } from "./auth-session";
import { authMockEnabled } from "./auth-mode";
import { getInitialDatabase } from "@/mocks/admin";
import { backendRequest } from "./backend-api";
import {
  mapAdminJob,
  readAdminDatabase,
  type AdminJobDto,
} from "@/features/admin/api-data";

// Protected reads use the same UI projection for mock and Laravel modes.
export const getAdminData = cache(async () => {
  await requireUser("admin");
  if (!authMockEnabled()) return readAdminDatabase(backendRequest);
  return getInitialDatabase();
});

// Detail lookup stays behind the adapter: a paginated backend list must not
// decide that an otherwise valid detail ID does not exist.
export const getAdminJob = cache(async (id: number) => {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  await requireUser("admin");
  if (!authMockEnabled()) {
    try {
      return mapAdminJob(
        (await backendRequest<AdminJobDto>(`/admin/jobs/${id}`)).data,
      );
    } catch (error) {
      if ((error as { status?: number }).status === 404) return null;
      throw error;
    }
  }
  const data = await getAdminData();
  return data?.jobs.find((job) => job.id === id) ?? null;
});
