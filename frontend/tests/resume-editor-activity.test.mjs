import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import test from "node:test";

test("cached editor navigation preserves drafts, revisions, save failures and conflicts", async () => {
  const fixture = JSON.parse(
    await readFile("../tests/fixtures/resumes/minimal.json", "utf8"),
  );
  fixture.settings.starter_version = 1;
  const source = `
import React, { Activity, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ResumeEditor } from './src/components/resumes/resume-editor';
window.calls = [];
window.fault = 0;
window.detail = ${JSON.stringify({ ...fixture, id: 1, revision: 1, assets: [], capabilities: { edit: true }, latest_export: null })};
window.mockRequest = async (path, init = {}) => {
  window.calls.push({ path, method: init.method || 'GET', body: init.body });
  if ((!init.method || init.method === 'GET') && window.getFault)
    throw Object.assign(new Error('Mock resume-load failure'), { status: 503 });
  if (init.method === 'PUT') {
    if (window.fault) throw Object.assign(new Error('Mock failure'), { status: window.fault });
    const body = JSON.parse(init.body);
    if (body.base_revision !== window.detail.revision)
      throw Object.assign(new Error('Mock revision conflict'), { status: 409 });
    window.detail = { ...body, id: 1, revision: window.detail.revision + 1, assets: [], capabilities: { edit: true }, latest_export: null };
  }
  return { success: true, data: structuredClone(window.detail) };
};
function App() {
  const [show, setShow] = useState(true);
  window.show = setShow;
  return <Activity mode={show ? 'visible' : 'hidden'}><ResumeEditor id={1} connected={true} /></Activity>;
}
createRoot(document.getElementById('root')).render(<App />);
`;
  const compiled = await build({
    stdin: { contents: source, loader: "tsx", resolveDir: process.cwd() },
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    jsx: "automatic",
    plugins: [
      {
        name: "mock-editor-integrations",
        setup(builder) {
          builder.onResolve(
            { filter: /^next\/(navigation|link|dynamic)$/ },
            (args) => ({ path: args.path, namespace: "mock" }),
          );
          builder.onResolve(
            { filter: /^@\/features\/api\/client$/ },
            (args) => ({ path: args.path, namespace: "mock" }),
          );
          builder.onResolve({ filter: /^\.\/resume-preview$/ }, () => ({
            path: "preview",
            namespace: "mock",
          }));
          builder.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
            contents:
              args.path === "next/navigation"
                ? `export const useRouter = () => ({ push() {} });`
                : args.path === "next/link"
                  ? `import React from 'react'; export default props => React.createElement('a', props);`
                  : args.path === "next/dynamic"
                    ? `export default () => () => null;`
                    : args.path === "preview"
                      ? `export const ResumePreview = () => null;`
                      : `export const apiRequest = (...args) => window.mockRequest(...args);`,
            loader: "js",
            resolveDir: process.cwd(),
          }));
        },
      },
    ],
  });
  const server = createServer((request, response) => {
    response.setHeader(
      "Content-Type",
      request.url === "/app.js" ? "text/javascript" : "text/html",
    );
    response.end(
      request.url === "/app.js"
        ? compiled.outputFiles[0].contents
        : '<html><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) =>
      console.error("Browser error:", error.message),
    );
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const name = page.locator(".resume-name input");
    const save = page.locator(".resume-editor-toolbar button").nth(0);
    const inspect = () =>
      page.evaluate(() => ({
        display: document.querySelector(".resume-name input").value,
        status: document
          .querySelector(".resume-save-status")
          .getAttribute("data-status"),
        error:
          document.querySelector(".resume-error")?.textContent.trim() || "",
        server: window.detail.name,
        revision: window.detail.revision,
        puts: window.calls.filter((call) => call.method === "PUT").length,
      }));
    const cycle = async () => {
      await page.evaluate(() => window.show(false));
      await page.waitForTimeout(100);
      await page.evaluate(() => window.show(true));
      await page.waitForTimeout(1500);
    };
    await name.fill("ACTIVITY DRAFT ONE");
    await cycle();
    const hiddenSave = await inspect();
    assert.equal(hiddenSave.display, "ACTIVITY DRAFT ONE");
    assert.equal(hiddenSave.server, "ACTIVITY DRAFT ONE");
    assert.equal(hiddenSave.status, "saved");
    assert.equal(hiddenSave.revision, 2);
    await save.click();
    assert.equal((await inspect()).revision, 2);

    await name.fill("ACTIVITY DRAFT TWO");
    await save.click();
    await page.waitForTimeout(100);
    assert.equal((await inspect()).revision, 3);
    assert.equal((await inspect()).status, "saved");

    await page.evaluate(() => {
      window.fault = 422;
    });
    await name.fill("RETRY AFTER HIDDEN ERROR");
    await cycle();
    const hiddenFailure = await inspect();
    assert.equal(hiddenFailure.display, "RETRY AFTER HIDDEN ERROR");
    assert.equal(hiddenFailure.server, "ACTIVITY DRAFT TWO");
    assert.equal(hiddenFailure.status, "error");
    assert.equal(hiddenFailure.error, "Mock failure");
    await page.evaluate(() => {
      window.fault = 0;
    });
    await save.click();
    await page.waitForTimeout(100);
    assert.equal((await inspect()).server, "RETRY AFTER HIDDEN ERROR");
    assert.equal((await inspect()).revision, 4);

    await page.evaluate(() => {
      window.detail.revision++;
    });
    await name.fill("PRESERVED CONFLICT DRAFT");
    await cycle();
    const conflict = await inspect();
    assert.equal(conflict.display, "PRESERVED CONFLICT DRAFT");
    assert.equal(conflict.server, "RETRY AFTER HIDDEN ERROR");
    assert.equal(conflict.status, "conflict");
    assert.equal(await save.isDisabled(), true);
    await cycle();
    assert.equal((await inspect()).status, "conflict");
    assert.equal((await inspect()).display, "PRESERVED CONFLICT DRAFT");
    {
      await page.evaluate(() => {
        window.getFault = true;
      });
      await cycle();
      assert.equal(
        await name.count(),
        1,
        "Reactivation load failure must retain the existing editor and conflict draft",
      );
      assert.equal((await inspect()).display, "PRESERVED CONFLICT DRAFT");
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
