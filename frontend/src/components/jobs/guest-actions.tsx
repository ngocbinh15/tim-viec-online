"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/features/api/client";
import { mapJob } from "@/features/jobs/api";
import { Bookmark, ArrowRight, Heart } from "lucide-react";
import { toast } from "sonner";
import type { AuthRole } from "@/features/auth/types";
import { useOptionalWorkspace } from "@/components/candidate/workspace-provider";
import { ApplyDialog } from "./apply-dialog";
import { Button } from "@/modules/cores/shadcn/components/ui/button";

export function GuestActions({
  jobId,
  open = true,
  compact = false,
  viewerRole,
  appearance = "default",
}: {
  jobId: number;
  open?: boolean;
  compact?: boolean;
  viewerRole?: AuthRole;
  appearance?: "default" | "home";
}) {
  const workspace = useOptionalWorkspace();
  const candidate = viewerRole === "candidate" ? workspace : null;
  const job = candidate?.jobs.find((item) => item.id === jobId);
  const candidateRef = useRef(candidate);
  useEffect(() => {
    candidateRef.current = candidate;
  });
  const [jobError, setJobError] = useState("");
  const isApi = candidate?.isApi;
  useEffect(() => {
    if (!isApi || compact || job) return;
    let active = true;
    apiRequest<unknown>(`/jobs/${jobId}`)
      .then((response) => {
        if (active) candidateRef.current?.registerJob(mapJob(response.data));
      })
      .catch((error) => {
        if (active)
          setJobError(
            error instanceof Error ? error.message : "Không thể tải công việc.",
          );
      });
    return () => {
      active = false;
    };
  }, [isApi, compact, job, jobId]);
  const saved = candidate?.savedIds.includes(jobId) ?? false;
  const SaveIcon = appearance === "home" ? Heart : Bookmark;
  const loginUrl = `/login?returnTo=${encodeURIComponent(`/jobs/${jobId}`)}`;
  return (
    <div
      className={
        appearance === "home"
          ? "home-save"
          : compact
            ? "job-save"
            : "guest-actions"
      }
    >
      {!compact &&
        (open && candidate && job ? (
          <ApplyDialog job={job} />
        ) : open && viewerRole ? (
          <Button
            className="apply-button h-11 flex-1"
            disabled={viewerRole !== "candidate" || !job}
            title={jobError || "Đang chuẩn bị thông tin ứng tuyển"}
            onClick={() =>
              toast.info(
                jobError || "Đang tải thông tin ứng tuyển. Vui lòng thử lại.",
              )
            }
          >
            {viewerRole === "candidate"
              ? "Ứng tuyển ngay"
              : "Chỉ dành cho ứng viên"}
          </Button>
        ) : open ? (
          <Button asChild className="apply-button h-11 flex-1">
            <Link href={loginUrl}>
              Ứng tuyển ngay <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button disabled className="h-11 flex-1">
            Đã ngừng nhận hồ sơ
          </Button>
        ))}
      {candidate && (job || candidate.isApi) ? (
        <Button
          variant="outline"
          className={compact ? "size-11 rounded-full" : "h-11"}
          aria-label={saved ? "Bỏ lưu việc làm" : "Lưu việc làm"}
          aria-pressed={saved}
          disabled={candidate.pending[`saved:${jobId}`]}
          onClick={async () => {
            try {
              await candidate.toggleSaved(jobId);
              toast.success(
                candidate.isApi
                  ? saved
                    ? "Đã bỏ lưu việc làm."
                    : "Đã lưu việc làm."
                  : saved
                    ? "Đã bỏ lưu việc làm trong phiên xem trước."
                    : "Đã lưu việc làm trong phiên xem trước.",
              );
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Không thể lưu việc làm.",
              );
            }
          }}
        >
          <SaveIcon aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          {!compact && (saved ? "Đã lưu" : "Lưu việc làm")}
        </Button>
      ) : !viewerRole ? (
        <Button
          asChild
          variant="outline"
          className={compact ? "size-11 rounded-full" : "h-11"}
        >
          <Link href={loginUrl} aria-label="Lưu việc làm">
            <SaveIcon aria-hidden="true" />
            {!compact && "Lưu việc làm"}
          </Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          className={compact ? "size-11 rounded-full" : "h-11"}
          aria-label="Lưu việc làm"
          disabled={viewerRole !== "candidate"}
          onClick={() =>
            toast.info("Đang tải thông tin việc làm. Vui lòng thử lại.")
          }
        >
          <SaveIcon aria-hidden="true" />
          {!compact && "Lưu việc làm"}
        </Button>
      )}
      {!compact && (
        <Button
          variant="ghost"
          className="h-11 px-3"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              toast.success("Đã sao chép liên kết việc làm");
            } catch {
              toast.error(
                "Chưa sao chép được. Bạn có thể sao chép địa chỉ trên trình duyệt.",
              );
            }
          }}
        >
          Chia sẻ
        </Button>
      )}
    </div>
  );
}
