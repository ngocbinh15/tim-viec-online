import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import { renderResume } from "../src/features/resumes/pdf/render-node";

// Internal CLI: paths are passed only by the backend, never by a web client.
try {
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 4 * 1024 * 1024)
      throw new Error("INPUT_TOO_LARGE");
  }
  const request = JSON.parse(raw);
  const fontDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../public/fonts/resumes",
  );
  const output = process.argv[2];
  if (!output || !path.isAbsolute(output)) throw new Error("INVALID_OUTPUT");
  const buffer = await renderResume(
    request.document,
    fontDirectory,
    request.photo,
  );
  await writeFile(output, buffer, { flag: "wx" });
  process.stdout.write(JSON.stringify({ size: buffer.length }));
} catch (error) {
  const allowed = [
    "PDF_TOO_LARGE",
    "INVALID_PHOTO",
    "INPUT_TOO_LARGE",
    "INVALID_OUTPUT",
  ];
  const error_code =
    error instanceof Error && allowed.includes(error.message)
      ? error.message
      : "RENDER_FAILED";
  process.stderr.write(JSON.stringify({ error_code }) + "\n");
  process.exitCode = 1;
}
