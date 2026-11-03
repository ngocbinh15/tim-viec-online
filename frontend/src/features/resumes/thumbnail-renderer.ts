import { apiRequest } from "@/features/api/client";
import { documentFromDetail, resumeFileUrl } from "./client";
import type { ResumeDocument } from "./schema";
import type { ResumeDetail } from "./types";

// One renderer per library keeps font loading and PDF work out of the UI thread.
// Render cards sequentially: the editor worker intentionally coalesces requests.
export class ResumeThumbnailRenderer {
  private queue: Promise<void> = Promise.resolve();
  private controller = new AbortController();
  private worker: Worker | null = null;
  private requestId = 0;
  private cancelActive?: () => void;

  render(id: number, signal: AbortSignal): Promise<Blob> {
    const combined = AbortSignal.any([signal, this.controller.signal]);
    const result = this.queue.then(() => this.create(id, combined));
    this.queue = result.then(
      () => {},
      () => {},
    );
    return result;
  }

  dispose() {
    this.controller.abort();
    this.cancelActive?.();
    this.worker?.terminate();
    this.worker = null;
  }

  private async create(id: number, requestSignal: AbortSignal): Promise<Blob> {
    const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(30000)]);
    signal.throwIfAborted();
    const response = await apiRequest<ResumeDetail>(
      `/candidate/resumes/${id}`,
      {
        signal,
      },
    );
    const document = documentFromDetail(response.data);
    let photo: string | undefined;
    const photoId = document.content.basics.photo_asset_id;
    if (photoId) {
      const image = await fetch(
        resumeFileUrl(`/api/candidate/resumes/${id}/assets/${photoId}`),
        { signal, cache: "no-store", credentials: "same-origin" },
      );
      if (!image.ok) throw new Error("Không tải được ảnh CV.");
      const blob = await image.blob();
      if (
        blob.size > 2097152 ||
        !["image/png", "image/jpeg"].includes(blob.type)
      )
        throw new Error("Ảnh CV không hợp lệ.");
      photo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Không đọc được ảnh CV."));
        reader.readAsDataURL(blob);
      });
    }
    signal.throwIfAborted();
    const bytes = await this.pdf(document, photo);
    signal.throwIfAborted();
    const pdfjs = await import("pdfjs-dist");
    signal.throwIfAborted();
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-viewer/pdf.worker.min.mjs";
    const task = pdfjs.getDocument({ data: new Uint8Array(bytes) });
    const cancel = () => {
      void task.destroy();
    };
    signal.addEventListener("abort", cancel, { once: true });
    try {
      const pdf = await task.promise;
      const page = await pdf.getPage(1);
      const original = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 640 / original.width });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      signal.throwIfAborted();
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          canvas.width = canvas.height = 0;
          if (blob) resolve(blob);
          else reject(new Error("Không tạo được ảnh xem trước."));
        }, "image/png");
      });
    } finally {
      signal.removeEventListener("abort", cancel);
      await task.destroy();
    }
  }

  private pdf(document: ResumeDocument, photo?: string): Promise<ArrayBuffer> {
    const worker = (this.worker ??= new Worker(
      new URL("../../workers/resume-preview.worker.tsx", import.meta.url),
      { type: "module" },
    ));
    const requestId = ++this.requestId;
    return new Promise((resolve, reject) => {
      const finish = () => {
        clearTimeout(timeout);
        worker.onmessage = null;
        worker.onerror = null;
        this.cancelActive = undefined;
      };
      const fail = () => {
        finish();
        worker.terminate();
        this.worker = null;
        reject(new Error("Không tạo được ảnh xem trước."));
      };
      const timeout = setTimeout(fail, 25000);
      this.cancelActive = fail;
      worker.onerror = fail;
      worker.onmessage = ({ data }) => {
        if (data.requestId !== requestId) return;
        finish();
        if (data.error) reject(new Error(data.error));
        else resolve(data.bytes);
      };
      worker.postMessage({ requestId, document, photo });
    });
  }
}
