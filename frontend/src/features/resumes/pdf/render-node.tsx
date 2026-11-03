import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { validateForExport } from "../schema";
import { ResumeDocument } from "./resume-document";
import { registerResumeFonts } from "./font-registry";

export async function renderResume(
  input: unknown,
  fontDirectory: string,
  photo?: string,
): Promise<Buffer> {
  const doc = validateForExport(input);
  if (
    photo &&
    (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(photo) ||
      photo.length > 3 * 1024 * 1024)
  )
    throw new Error("INVALID_PHOTO");
  registerResumeFonts(fontDirectory);
  const buffer = await renderToBuffer(
    <ResumeDocument document={doc} photo={photo} />,
  );
  if (buffer.length > 5 * 1024 * 1024) throw new Error("PDF_TOO_LARGE");
  return buffer;
}
