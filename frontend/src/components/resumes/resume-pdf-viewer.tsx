"use client";

import { useEffect, useRef } from "react";

// Render the generated PDF itself so desktop and mobile show the same pages.
export function ResumePdfViewer({
  url,
  fit = "width",
}: {
  url: string;
  fit?: "width" | "page";
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let stop: (() => void) | undefined;
    let lastSize = "";
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      const size = `${width}:${height}`;
      if (width < 80 || height < 80 || size === lastSize) return;
      lastSize = size;
      stop?.();
      let cancelled = false;
      const controller = new AbortController();
      let destroy: (() => void) | undefined;
      stop = () => {
        cancelled = true;
        controller.abort();
        destroy?.();
      };
      void (async () => {
        try {
          const pdfjs = await import("pdfjs-dist");
          if (cancelled) return;
          pdfjs.GlobalWorkerOptions.workerSrc =
            "/pdf-viewer/pdf.worker.min.mjs";
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error("PDF_UNAVAILABLE");
          const task = pdfjs.getDocument({
            data: new Uint8Array(await response.arrayBuffer()),
          });
          destroy = () => {
            void task.destroy();
          };
          if (cancelled) {
            destroy();
            return;
          }
          const pdf = await task.promise;
          const pages = document.createDocumentFragment();
          for (let number = 1; number <= Math.min(pdf.numPages, 5); number++) {
            if (cancelled) return;
            const page = await pdf.getPage(number);
            const dimensions = page.getViewport({ scale: 1 });
            const scale =
              fit === "page"
                ? Math.min(width / dimensions.width, height / dimensions.height)
                : width / dimensions.width;
            const viewport = page.getViewport({ scale });
            const density = Math.min(window.devicePixelRatio || 1, 2);
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width * density);
            canvas.height = Math.ceil(viewport.height * density);
            canvas.style.width = `${viewport.width}px`;
            canvas.setAttribute("role", "img");
            canvas.setAttribute("aria-label", `Trang ${number} của CV`);
            await page.render({
              canvas,
              viewport,
              transform:
                density === 1 ? undefined : [density, 0, 0, density, 0, 0],
            }).promise;
            pages.append(canvas);
            page.cleanup();
          }
          if (pdf.numPages > 5) {
            const warning = document.createElement("p");
            warning.textContent =
              "CV vượt quá 5 trang. Hãy rút gọn nội dung trước khi xuất PDF.";
            pages.append(warning);
          }
          if (!cancelled) element.replaceChildren(pages);
        } catch {
          if (!cancelled) {
            const message = document.createElement("p");
            message.textContent =
              "Không mở được bản xem trước. Bạn có thể mở PDF ở tab mới bên dưới.";
            message.setAttribute("role", "alert");
            element.replaceChildren(message);
          }
        }
      })();
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      stop?.();
    };
  }, [url, fit]);
  return (
    <div
      ref={host}
      className="resume-pdf-pages"
      title="Bản PDF xem trước"
      role="region"
      tabIndex={0}
      aria-label="Các trang PDF xem trước"
    />
  );
}
