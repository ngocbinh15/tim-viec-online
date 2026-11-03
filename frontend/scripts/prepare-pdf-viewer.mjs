import { copyFile, mkdir } from "node:fs/promises";
const target = new URL("../public/pdf-viewer/", import.meta.url);
await mkdir(target, { recursive: true });
await copyFile(
  new URL(
    "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ),
  new URL("pdf.worker.min.mjs", target),
);
