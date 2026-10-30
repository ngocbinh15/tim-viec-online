"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { downloadApplicantExport } from "@/features/employer/applicant-export";
import type { EmployerJob } from "@/features/employer/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/cores/shadcn/components/ui/dialog";
import "./applicant-export.css";

export function ApplicantExportDialog({
  jobs,
  open,
  onOpenChange,
  apiMode,
}: {
  jobs: EmployerJob[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiMode: boolean;
}) {
  const id = useId();
  const [mode, setMode] = useState<"workbook" | "separate">("workbook");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  function changeOpen(next: boolean) {
    if (!next) request.current?.abort();
    setError("");
    onOpenChange(next);
  }

  async function exportApplicants() {
    if (request.current || !apiMode || !jobs.length || jobs.length > 50) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError("");
    try {
      await downloadApplicantExport(
        jobs.map((job) => job.id),
        mode,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      toast.success("Đã tải danh sách ứng viên.");
      onOpenChange(false);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Không thể xuất danh sách. Vui lòng thử lại.",
        );
    } finally {
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        className="applicant-export-dialog"
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (opener.current?.isConnected) opener.current.focus();
          opener.current = null;
        }}
      >
        <DialogHeader>
          <DialogTitle>Xuất danh sách ứng viên</DialogTitle>
          <DialogDescription>
            {jobs.length} tin tuyển dụng · Bao gồm tất cả hồ sơ của các tin đã
            chọn.
          </DialogDescription>
        </DialogHeader>
        <ul
          className="applicant-export-jobs"
          aria-label="Tin tuyển dụng đã chọn"
        >
          {jobs.map((job) => (
            <li key={job.id}>
              <span>#{job.id}</span>
              {job.title}
            </li>
          ))}
        </ul>
        <fieldset className="applicant-export-modes" disabled={pending}>
          <legend>Cách xuất file</legend>
          <label data-selected={mode === "workbook"}>
            <input
              type="radio"
              name={`${id}-mode`}
              value="workbook"
              checked={mode === "workbook"}
              onChange={() => setMode("workbook")}
            />
            <span>
              <strong>Một file Excel</strong>
              <small>Mỗi tin tuyển dụng nằm trong một sheet.</small>
            </span>
          </label>
          <label data-selected={mode === "separate"}>
            <input
              type="radio"
              name={`${id}-mode`}
              value="separate"
              checked={mode === "separate"}
              onChange={() => setMode("separate")}
            />
            <span>
              <strong>File riêng cho từng tin</strong>
              <small>
                {jobs.length > 1
                  ? "Các file Excel được tải chung trong một file ZIP."
                  : "Tải một file Excel cho tin đã chọn."}
              </small>
            </span>
          </label>
        </fieldset>
        {!apiMode && (
          <p className="applicant-export-error" role="alert">
            Xuất danh sách chỉ dùng được khi kết nối máy chủ.
          </p>
        )}
        {error && (
          <p className="applicant-export-error" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <button
            type="button"
            className="ep-button"
            onClick={() => changeOpen(false)}
          >
            Hủy
          </button>
          <button
            type="button"
            className="ep-button ep-button-blue"
            disabled={
              pending || !apiMode || jobs.length === 0 || jobs.length > 50
            }
            onClick={exportApplicants}
          >
            {pending ? (
              <LoaderCircle
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Download size={16} aria-hidden="true" />
            )}
            {pending ? "Đang xuất…" : "Tải danh sách"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
