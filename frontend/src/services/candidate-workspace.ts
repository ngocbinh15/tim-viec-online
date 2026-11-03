import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { authMockEnabled } from "./auth-mode";
import { requireUser } from "./auth-session";
import { getJobRepository } from "./jobs";
import { createCandidateWorkspace } from "@/mocks/candidate-workspace";
import { createProfilePreview } from "@/mocks/candidate-profile";
import type { CandidateSection } from "@/features/candidate-workspace/types";
import { backendRequest } from "./backend-api";
import { readWorkspaceSnapshot } from "@/features/api/workspace";
import { mapJob } from "@/features/jobs/api";
import {
  candidateApplicationFromApi,
  candidateMessageFromApi,
  candidateNotificationFromApi,
  candidateProfileFromApi,
  record,
  rows,
} from "@/features/candidate-workspace/api-adapter";
import { vietnamToday } from "@/features/jobs/formatters";

// Mock fixtures are private account data and never substitute for Laravel data.
export const getCandidatePreview = cache(async () => {
  const user = await requireUser("candidate");
  await connection();
  if (!authMockEnabled()) {
    const {
      profile,
      skills,
      saved_jobs: saved,
      applications,
      conversations,
      notifications,
      conversation_jobs: conversationJobs,
    } = await readWorkspaceSnapshot<Record<string, unknown>>(
      backendRequest,
      "candidate",
    );
    const conversationRows = rows(conversations);
    const applicationRows = rows(applications);
    const jobs = [
      ...rows(saved).map(mapJob),
      ...applicationRows
        .filter((item) => item.job)
        .map((item) => mapJob(item.job)),
      ...rows(conversationJobs).map(mapJob),
    ];
    const profileData = record(record(profile).profile);
    return {
      mode: "api" as const,
      userId: user.id,
      emailVerifiedAt: user.email_verified_at ?? null,
      jobs: Array.from(new Map(jobs.map((job) => [job.id, job])).values()),
      today: vietnamToday(),
      profile: candidateProfileFromApi(profile),
      cvUrl: profileData.cv_url ? "/api/backend/candidate/cv/file" : null,
      avatarUrl:
        typeof profileData.avatar_url === "string"
          ? profileData.avatar_url
          : null,
      skills: rows(skills).map((item) => ({
        id: Number(item.id),
        name: String(item.name),
      })),
      applications: applicationRows.map(candidateApplicationFromApi),
      savedIds: rows(saved).map((item) => Number(item.id)),
      conversations: conversationRows.map((item) => ({
        id: Number(item.id),
        job_id: Number(item.job_id),
        contact: String(record(item.partner).name ?? "Nhà tuyển dụng"),
      })),
      messages: conversationRows
        .filter((item) => item.last_message)
        .map((item) =>
          candidateMessageFromApi(
            item.last_message,
            Number(user.id),
            Number(item.id),
          ),
        ),
      notifications: rows(notifications).map(candidateNotificationFromApi),
    };
  }
  const { jobs, today } = await getJobRepository();
  return {
    mode: "mock" as const,
    ...createCandidateWorkspace(jobs, today),
    profile: { ...createProfilePreview(), name: user.name, email: user.email },
  };
});

export async function redirectCandidatePreview(
  section: CandidateSection,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
) {
  await requireUser("candidate", `/account/${section}`);
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  redirect(`/account/${section}${query.size ? `?${query}` : ""}`);
}
