import type { ResumeDocument } from "./schema";
export type ResumeExport = {
  id: number;
  resume_id: number;
  revision: number;
  status: "pending" | "processing" | "ready" | "failed";
  error_code: string | null;
  retryable: boolean;
  file_url: string | null;
  file_name?: string;
  page_count: number | null;
};
export type ResumeSummary = {
  id: number;
  name: string;
  template_key: ResumeDocument["template_key"];
  revision: number;
  updated_at: string;
  latest_export: ResumeExport | null;
};
export type ResumeDetail = ResumeDocument &
  ResumeSummary & {
    assets: { id: number; url: string }[];
    capabilities: { edit: boolean };
  };
export type ResumeList = {
  items: ResumeSummary[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    enabled: boolean;
  };
};
