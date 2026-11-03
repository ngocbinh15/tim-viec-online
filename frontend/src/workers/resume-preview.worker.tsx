/// <reference lib="webworker" />
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { ResumeDocument } from "../features/resumes/pdf/resume-document";
import { registerResumeFonts } from "../features/resumes/pdf/font-registry";
import { resumeDocumentSchema } from "../features/resumes/schema";

registerResumeFonts(`${self.location.origin}/fonts/resumes`);
let pending: { requestId: number; document: unknown; photo?: string } | null =
  null;
let running = false;
self.onmessage = async ({ data }) => {
  pending = data;
  if (running) return;
  running = true;
  try {
    while (pending) {
      const request = pending;
      pending = null;
      try {
        const document = resumeDocumentSchema.parse(request.document);
        if (
          request.photo &&
          !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(request.photo)
        )
          throw new Error();
        const blob = await pdf(
          <ResumeDocument document={document} photo={request.photo} />,
        ).toBlob();
        const bytes = await blob.arrayBuffer();
        self.postMessage(
          { requestId: request.requestId, bytes },
          { transfer: [bytes] },
        );
      } catch {
        self.postMessage({
          requestId: request.requestId,
          error: "Không thể tạo bản xem trước. Kiểm tra nội dung và thử lại.",
        });
      }
    }
  } finally {
    running = false;
  }
};
