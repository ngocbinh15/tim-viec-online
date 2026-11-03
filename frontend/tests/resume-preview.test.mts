import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEMPLATE_KEYS } from "../src/features/resumes/schema";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
test("the browser worker creates a Vietnamese PDF without blocking the editor thread", async () => {
  const compiled = await build({
    entryPoints: [path.join(root, "src/workers/resume-preview.worker.tsx")],
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
  });
  const fontNames = [
    "BeVietnamPro-Regular.ttf",
    "BeVietnamPro-Bold.ttf",
    "BeVietnamPro-Italic.ttf",
  ];
  const server = createServer(async (req, res) => {
    if (req.url === "/worker.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(compiled.outputFiles[0].contents);
    } else if (fontNames.some((name) => req.url === `/fonts/resumes/${name}`))
      res.end(await readFile(path.join(root, "public", req.url!)));
    else if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end("<!doctype html><html><body>Editor test</body></html>");
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const address = server.address() as { port: number };
    await page.goto(`http://127.0.0.1:${address.port}`);
    const doc = JSON.parse(
      await readFile(
        path.join(root, "../tests/fixtures/resumes/minimal.json"),
        "utf8",
      ),
    );
    for (const template of TEMPLATE_KEYS) {
      const result = await page.evaluate(
        (document) =>
          new Promise<{ header: string; size: number }>((resolve, reject) => {
            const worker = new Worker("/worker.js", { type: "module" });
            const timeout = setTimeout(() => {
              worker.terminate();
              reject(new Error("Preview timed out"));
            }, 15000);
            worker.onerror = (event) => {
              clearTimeout(timeout);
              worker.terminate();
              reject(new Error(event.message));
            };
            worker.onmessage = ({ data }) => {
              clearTimeout(timeout);
              worker.terminate();
              if (data.error) reject(new Error(data.error));
              else
                resolve({
                  header: new TextDecoder().decode(
                    new Uint8Array(data.bytes).subarray(0, 5),
                  ),
                  size: data.bytes.byteLength,
                });
            };
            worker.postMessage({ requestId: 1, document });
          }),
        { ...doc, template_key: template },
      );
      assert.equal(result.header, "%PDF-");
      assert.ok(result.size > 1000 && result.size < 5 * 1024 * 1024);
    }
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
