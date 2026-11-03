"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiRequest } from "@/features/api/client";
import { parseAiState } from "@/features/employer/ai";
import type { EmployerApplication } from "@/features/employer/types";
import { AiAssessmentPanel } from "@/components/employer/application-analysis";
import "../employer/employer-candidates.css";
import "../employer/employer-application-detail.css";

export function AdminApplicationDetail({
  application,
  jobTitle,
}: {
  application: EmployerApplication;
  jobTitle: string;
}) {
  const pathname = usePathname();
  const read = useCallback(
    async (id: number, signal?: AbortSignal) =>
      parseAiState(
        (await apiRequest(`/applications/${id}/ai-analysis`, { signal })).data,
      ),
    [],
  );
  const analyze = useCallback(
    async (id: number) =>
      parseAiState(
        (await apiRequest(`/applications/${id}/ai-analyze`, { method: "POST" }))
          .data,
      ),
    [],
  );
  return (
    <div className="ap-content ea-detail ec-page ap-ai-detail">
      <Link href={`/admin/jobs/${application.job_id}`}>
        ← Về tin tuyển dụng
      </Link>
      <section className="ap-panel ap-ai-summary">
        <h1>Hồ sơ {application.name}</h1>
        <p>
          {jobTitle} · Hồ sơ #{application.id}
        </p>
        <p>{application.email}</p>
        {application.cv_path && (
          <a
            href={application.cv_path}
            target="_blank"
            rel="noopener noreferrer"
          >
            Xem CV ứng tuyển (PDF)
          </a>
        )}
      </section>
      <AiAssessmentPanel
        key={application.id}
        application={application}
        jobTitle={jobTitle}
        apiMode
        active={pathname === `/admin/applications/${application.id}`}
        readAnalysis={read}
        requestAnalysis={analyze}
      />
    </div>
  );
}
