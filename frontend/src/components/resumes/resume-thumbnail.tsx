"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FileText } from "lucide-react";

export type RenderResumeThumbnail = (
  id: number,
  signal: AbortSignal,
) => Promise<Blob>;

export function ResumeThumbnail({
  id,
  render,
}: {
  id: number;
  render: RenderResumeThumbnail;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const controller = new AbortController();
    let url: string | null = null;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      void render(id, controller.signal)
        .then((blob) => {
          if (controller.signal.aborted) return;
          url = URL.createObjectURL(blob);
          setImage(url);
          setFailed(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        });
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          start();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      controller.abort();
      if (url) URL.revokeObjectURL(url);
      setImage(null);
    };
  }, [id, render]);

  return (
    <span ref={host} className="resume-thumbnail" aria-hidden="true">
      {image ? (
        <Image src={image} alt="" width={640} height={906} unoptimized />
      ) : failed ? (
        <span className="resume-thumbnail-empty">
          <FileText size={28} />
          <span>Mở CV để xem nội dung</span>
        </span>
      ) : (
        <span className="resume-thumbnail-loading">
          Đang tải ảnh xem trước…
        </span>
      )}
    </span>
  );
}
