import { apiRequest } from "@/features/api/client";
import type { ResumeDetail, ResumeList, ResumeSummary } from "./types";
import { resumeDocumentSchema } from "./schema";
import { z } from "zod";

export const resumeFileUrl = (url: string) =>
  /^\/api\/candidate\/(?:resumes\/[1-9]\d*\/assets\/[1-9]\d*|resume-exports\/[1-9]\d*\/file)$/.test(
    url,
  )
    ? `/api/backend${url.slice(4)}`
    : "";
export async function fetchResumes(page = 1): Promise<ResumeList> {
  const response = await apiRequest<ResumeSummary[]>(
    `/candidate/resumes?page=${page}&per_page=12`,
  );
  const meta = z
    .object({
      current_page: z.number().int().positive(),
      last_page: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      enabled: z.boolean(),
    })
    .parse(response.meta);
  if (page > meta.last_page) return fetchResumes(meta.last_page);
  return { items: response.data, meta };
}
export function documentFromDetail(value: ResumeDetail) {
  return resumeDocumentSchema.parse({
    name: value.name,
    template_key: value.template_key,
    template_version: value.template_version,
    schema_version: value.schema_version,
    content: value.content,
    settings: value.settings,
  });
}
