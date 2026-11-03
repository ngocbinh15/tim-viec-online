"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useEmployer } from "./employer-provider";
import type { EmployerApplication } from "@/features/employer/types";
import type { AiAnalysis, AiState } from "@/features/employer/ai";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Skeleton } from "@/modules/cores/shadcn/components/ui/skeleton";

const criteria = [
  { key: "skills", label: "Kỹ năng", weight: 40 },
  { key: "experience", label: "Kinh nghiệm", weight: 30 },
  { key: "education", label: "Học vấn & chứng chỉ", weight: 15 },
  { key: "orientation", label: "Định hướng & ngôn ngữ", weight: 15 },
] as const;

export function AnalysisResult({ analysis }: { analysis: AiAnalysis }) {
  return (
    <>
      <div className="ec-ai-score">
        <div>
          <strong>
            {analysis.match_score}
            <span>%</span>
          </strong>
          <p>
            {analysis.match_score >= 80
              ? "Rất phù hợp với vị trí"
              : analysis.match_score >= 60
                ? "Có kỹ năng phù hợp với vị trí"
                : "Cần xem xét thêm kinh nghiệm"}
          </p>
        </div>
        <span className="ec-ai-label">Match Score</span>
      </div>
      <div
        className="ec-score-track"
        role="meter"
        aria-label="Điểm phù hợp với vị trí"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={analysis.match_score}
      >
        <span style={{ width: `${analysis.match_score}%` }} />
      </div>
      <p className="ec-ai-summary">{analysis.summary}</p>
      {analysis.criteria_scores && (
        <dl className="ea-ai-criteria">
          {criteria.map(({ key, label, weight }) => (
            <div key={key}>
              <dt>
                {label} ({weight}%)
              </dt>
              <dd>{analysis.criteria_scores![key]}/100</dd>
            </div>
          ))}
        </dl>
      )}
      <h3>Điểm mạnh</h3>
      <ul className="ec-ai-strengths">
        {analysis.strengths.map((text, index) => (
          <li key={index}>{text}</li>
        ))}
      </ul>
      {analysis.matched_skills.length > 0 && (
        <>
          <h3>Kỹ năng đáp ứng</h3>
          <div className="ec-skill-list">
            {analysis.matched_skills.map((skill, index) => (
              <span key={index}>{skill}</span>
            ))}
          </div>
        </>
      )}
      <h3>Kỹ năng cần bổ sung</h3>
      <div className="ec-skill-list ec-missing-skills">
        {analysis.missing_skills.length ? (
          analysis.missing_skills.map((skill, index) => (
            <span key={index}>{skill}</span>
          ))
        ) : (
          <p className="ec-cover-letter">Không ghi nhận kỹ năng còn thiếu.</p>
        )}
      </div>
      {analysis.recommendations.length > 0 && (
        <details className="ec-ai-details">
          <summary>Khuyến nghị chi tiết</summary>
          <ul className="ec-ai-strengths">
            {analysis.recommendations.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </details>
      )}
      {analysis.created_at && (
        <p className="ec-ai-note">
          Phân tích ngày {new Date(analysis.created_at).toLocaleString("vi-VN")}
        </p>
      )}
    </>
  );
}

export function ApplicationAnalysis({
  application,
  jobTitle,
}: {
  application: EmployerApplication;
  jobTitle: string;
}) {
  const pathname = usePathname();
  const { apiMode, readAnalysis, requestAnalysis } = useEmployer();
  return (
    <AiAssessmentPanel
      key={application.id}
      application={application}
      jobTitle={jobTitle}
      apiMode={apiMode}
      active={pathname === `/employer/candidates/${application.id}`}
      readAnalysis={readAnalysis}
      requestAnalysis={requestAnalysis}
    />
  );
}

export function AiAssessmentPanel({
  application,
  jobTitle,
  apiMode,
  active,
  readAnalysis,
  requestAnalysis,
}: {
  application: EmployerApplication;
  jobTitle: string;
  apiMode: boolean;
  active: boolean;
  readAnalysis: (id: number, signal?: AbortSignal) => Promise<AiState>;
  requestAnalysis: (id: number) => Promise<AiState>;
}) {
  const id = useId();
  const [remote, setRemote] = useState<AiState | null>(null);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const state: AiState = remote ?? {
    status:
      application.analysis_status ??
      (application.analysis ? "completed" : "deferred"),
    analysis: application.analysis,
    error: application.analysis_error ?? null,
    retryable: false,
  };
  useEffect(() => {
    if (!apiMode || !active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      if (document.visibilityState === "hidden") {
        timer = setTimeout(() => void poll(), 3000);
        return;
      }
      attempts += 1;
      try {
        const next = await readAnalysis(application.id, controller.signal);
        if (stopped) return;
        setRemote(next);
        setError("");
        if (
          ["pending", "processing"].includes(next.status) &&
          !next.retryable
        ) {
          if (attempts < 20) timer = setTimeout(() => void poll(), 3000);
          else setPaused(true);
        }
      } catch {
        if (!stopped)
          setError(
            "Không tải được đánh giá AI. Vui lòng thử tải lại; hồ sơ ứng tuyển vẫn được giữ nguyên.",
          );
      }
    };
    void poll();
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [apiMode, active, application.id, readAnalysis, cycle]);
  async function analyze() {
    setRequesting(true);
    setError("");
    try {
      setRemote(await requestAnalysis(application.id));
      setPaused(false);
      setCycle((value) => value + 1);
    } catch {
      setError(
        "Chưa thể đưa CV vào phân tích. Vui lòng thử lại sau; hồ sơ ứng tuyển vẫn được giữ nguyên.",
      );
    } finally {
      setRequesting(false);
    }
  }
  const queued = state.status === "pending" || state.status === "processing";
  const stalled = queued && state.retryable;
  const analysis = state.status === "completed" ? state.analysis : null;
  return (
    <section
      className="ep-panel ec-ai-panel ea-panel"
      data-score={
        analysis
          ? analysis.match_score >= 80
            ? "high"
            : analysis.match_score >= 60
              ? "mid"
              : "low"
          : "pending"
      }
      aria-labelledby={`${id}-ai`}
    >
      <div className="ec-ai-title">
        <Sparkles size={18} aria-hidden="true" />
        <h2 id={`${id}-ai`}>Đánh giá độ phù hợp</h2>
      </div>
      <p className="ec-ai-job">
        Đối chiếu với: <strong>{jobTitle}</strong>
      </p>
      {!apiMode && analysis && (
        <p className="ec-preview-label">Phân tích AI minh họa</p>
      )}
      {analysis ? (
        <AnalysisResult analysis={analysis} />
      ) : stalled ? (
        <p className="ec-ai-note" role="status">
          Phân tích chưa hoàn tất. Bạn có thể yêu cầu phân tích lại.
        </p>
      ) : queued ? (
        <div role="status" aria-live="polite">
          <p className="ec-ai-note">
            {state.status === "processing"
              ? "Đang phân tích CV…"
              : "CV đang chờ phân tích…"}
          </p>
          <div className="ea-ai-skeleton" aria-hidden="true">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      ) : (
        <p className="ec-ai-note" role="status">
          {state.status === "failed"
            ? (state.error ?? "Chưa thể phân tích CV.")
            : "Hồ sơ này chưa có kết quả phân tích AI."}
        </p>
      )}
      <p className="ec-ai-note">
        Trọng số: kỹ năng 40%, kinh nghiệm 30%, học vấn & chứng chỉ 15%, định
        hướng & ngôn ngữ 15%.
      </p>
      {error && (
        <p className="ec-ai-note" role="alert">
          {error}
        </p>
      )}
      {apiMode && (error || paused) && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPaused(false);
            setCycle((value) => value + 1);
          }}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Tải lại đánh giá
        </Button>
      )}
      {paused && (
        <p className="ec-ai-note" role="status">
          Phân tích đang mất thêm thời gian. Bạn có thể tải lại đánh giá sau.
        </p>
      )}
      {apiMode && (!queued || stalled) && !analysis && state.retryable && (
        <Button
          type="button"
          variant="outline"
          disabled={
            requesting ||
            !application.cv_path ||
            application.status === "withdrawn"
          }
          onClick={() => void analyze()}
        >
          {requesting && (
            <LoaderCircle
              size={15}
              aria-hidden="true"
              className="animate-spin"
            />
          )}
          {state.status === "failed" || stalled
            ? "Thử phân tích lại"
            : "Phân tích CV"}
        </Button>
      )}
      {apiMode && !application.cv_path && (
        <p className="ec-ai-note">Chưa có tệp CV để phân tích.</p>
      )}
      <p className="ec-ai-note">
        Điểm AI hỗ trợ sàng lọc ban đầu. Hãy kết hợp xem CV và trao đổi trực
        tiếp để đánh giá ứng viên.
      </p>
    </section>
  );
}
