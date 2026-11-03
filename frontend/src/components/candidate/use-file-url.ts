"use client";
import { useEffect, useState } from "react";

export function useFileUrl(file: File | null): string | null {
  const [current, setCurrent] = useState<{ file: File; url: string } | null>(
    null,
  );
  useEffect(() => {
    if (!file) return;
    let disposed = false;
    const url = URL.createObjectURL(
      file.type ? file : new Blob([file], { type: "application/pdf" }),
    );
    Promise.resolve().then(() => {
      if (!disposed) setCurrent({ file, url });
    });
    return () => {
      disposed = true;
      URL.revokeObjectURL(url);
      setCurrent((active) => (active?.url === url ? null : active));
    };
  }, [file]);
  // Null allows callers to fall back to the file already saved on the backend.
  return file && current?.file === file ? current.url : null;
}
