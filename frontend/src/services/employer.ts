import "server-only";
import { cache } from "react";
import { requireUser } from "./auth-session";
import { authMockEnabled } from "./auth-mode";
import { getProvinceNames } from "./locations";
import { createEmployerData } from "@/mocks/employer";
import { backendRequest } from "./backend-api";
import { loadEmployerApi } from "@/features/employer/api";
import { vietnamToday } from "@/features/jobs/formatters";

// One replacement point for the future Laravel employer read adapter.
// Never substitute another company's public jobs or mock data in API mode.
export const getEmployerData = cache(async () => {
  const user = await requireUser("employer");
  if (!authMockEnabled())
    return loadEmployerApi(
      backendRequest,
      user,
      await getProvinceNames(),
      vietnamToday(new Date()),
    );
  return createEmployerData(user, await getProvinceNames());
});
