import type { Job } from "@/features/jobs/types";
import { isJobOpen, vietnamToday } from "@/features/jobs/formatters";
import type { Application } from "./types";

export const MAX_COVER_LETTER = 5000;

// Client-only command contract: a future adapter can send this as multipart data.
export type ApplyInput = {
  jobId: number;
  resumeExportId?: number;
  cv: File | null;
  useProfileCv?: boolean;
  coverLetter: string;
};
export type ApplyResult =
  | { success: true; application: Application }
  | { success: false; message: string };

export function applicationError(
  job: Job | undefined,
  applications: readonly Application[],
  coverLetter: string,
  today = vietnamToday(),
): string | null {
  if (!job) return "Không tìm thấy việc làm này.";
  if (applications.some((item) => item.job_id === job.id))
    return "Bạn đã ứng tuyển công việc này rồi.";
  if (!isJobOpen(job, today)) return "Tin đã đóng hoặc hết hạn nhận hồ sơ.";
  if (coverLetter.trim().length > MAX_COVER_LETTER)
    return "Thư giới thiệu không quá 5.000 ký tự.";
  return null;
}
