"use client";
import { useEffect, useRef, useState } from "react";
import type { ResumeDocument } from "@/features/resumes/schema";
import { resumeFileUrl } from "@/features/resumes/client";
import { ResumePdfViewer } from "./resume-pdf-viewer";
import { FileText, MoveHorizontal, RectangleVertical } from "lucide-react";
import { Button } from "@/modules/cores/shadcn/components/ui/button";

export function ResumePreview({
  document,
  resumeId,
}: {
  document: ResumeDocument;
  resumeId: number;
}) {
  const worker = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [fit, setFit] = useState<"width" | "page">("width");
  const photoCache = useRef<{ id: number; value: string } | null>(null);
  useEffect(() => {
    const instance = new Worker(
      new URL("../../workers/resume-preview.worker.tsx", import.meta.url),
      { type: "module" },
    );
    worker.current = instance;
    instance.onmessage = ({ data }) => {
      if (data.requestId !== requestId.current) return;
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      setUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(
          new Blob([data.bytes], { type: "application/pdf" }),
        );
      });
      setLoading(false);
      setError("");
    };
    instance.onerror = () => {
      setError(
        "Không tải được bản xem trước. Bạn vẫn có thể lưu nội dung và xuất PDF.",
      );
      setLoading(false);
    };
    return () => {
      worker.current = null;
      instance.terminate();
    };
  }, []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => {
    const current = ++requestId.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const id = document.content.basics.photo_asset_id;
        let photo: string | undefined;
        if (id) {
          if (photoCache.current?.id === id) photo = photoCache.current.value;
          else {
            const response = await fetch(
              resumeFileUrl(`/api/candidate/resumes/${resumeId}/assets/${id}`),
              { signal: controller.signal, cache: "no-store" },
            );
            if (!response.ok) throw new Error("Không tải được ảnh CV.");
            const blob = await response.blob();
            if (
              blob.size > 2097152 ||
              !["image/png", "image/jpeg"].includes(blob.type)
            )
              throw new Error("Ảnh CV không hợp lệ.");
            photo = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(new Error("Không đọc được ảnh."));
              reader.readAsDataURL(blob);
            });
            photoCache.current = { id, value: photo };
          }
        }
        if (current === requestId.current)
          worker.current?.postMessage({ requestId: current, document, photo });
      } catch (e) {
        if (!controller.signal.aborted) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [document, resumeId]);
  return (
    <section className="resume-preview" aria-label="Bản xem trước CV">
      <div className="resume-preview-heading">
        <strong>
          <FileText size={16} aria-hidden="true" /> Bản xem trước
        </strong>
        <div className="resume-preview-controls">
          <span aria-live="polite">
            {loading ? "Đang cập nhật…" : "Khổ A4"}
          </span>
          <div role="group" aria-label="Thu phóng bản xem trước">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Vừa chiều rộng"
              title="Vừa chiều rộng"
              aria-pressed={fit === "width"}
              onClick={() => setFit("width")}
            >
              <MoveHorizontal aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Vừa trang"
              title="Vừa trang"
              aria-pressed={fit === "page"}
              onClick={() => setFit("page")}
            >
              <RectangleVertical aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="resume-error">
          {error}
        </p>
      )}
      {url ? (
        <>
          <ResumePdfViewer url={url} fit={fit} />
          <a href={url} target="_blank" rel="noopener noreferrer">
            Mở bản xem trước ở tab mới
          </a>
        </>
      ) : (
        <div className="resume-preview-placeholder" aria-busy={loading}>
          Đang chuẩn bị bản xem trước…
        </div>
      )}
    </section>
  );
}
