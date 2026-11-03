// Run against the isolated frontend E2E PHP server, never a production URL.
import { execFileSync, spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
const php = process.env.PHP_BINARY || "php";
const port = process.env.RESUME_BENCHMARK_PORT || "8127";
if (!["8127", "8137"].includes(port))
  throw new Error("Use an isolated loopback benchmark port.");
const base = `http://127.0.0.1:${port}/api`;
const helper = "../backend/scripts/frontend-e2e-cv-benchmark.php";
execFileSync(php, [helper], { stdio: "ignore" });
const rows = JSON.parse(
  await readFile(
    "../backend/storage/framework/testing/frontend-e2e/cv-benchmark.json",
    "utf8",
  ),
);
const document = JSON.parse(
  await readFile("../tests/fixtures/resumes/minimal.json", "utf8"),
);
async function request(row, path, body) {
  const start = performance.now();
  const response = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${row.token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  await response.arrayBuffer();
  return performance.now() - start;
}
function stats(values) {
  const sorted = values.toSorted((a, b) => a - b);
  return {
    count: values.length,
    p50_ms: Math.round(sorted[Math.ceil(sorted.length * 0.5) - 1]),
    p95_ms: Math.round(sorted[Math.ceil(sorted.length * 0.95) - 1]),
    max_ms: Math.round(sorted.at(-1)),
  };
}
async function batch(promises) {
  const results = await Promise.allSettled(promises);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length)
    throw new Error(
      `${failures.length} benchmark requests failed: ${failures[0].reason.message}`,
    );
  return results.map((result) => result.value);
}
try {
  const list = await batch(
    rows.map((row) => request(row, "/candidate/resumes")),
  );
  const save = await batch(
    rows.map(async (row) => {
      const start = performance.now();
      const response = await fetch(
        `${base}/candidate/resumes/${row.resume_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${row.token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...document, base_revision: 1 }),
          signal: AbortSignal.timeout(180000),
        },
      );
      if (!response.ok) throw new Error(`Save HTTP ${response.status}`);
      await response.arrayBuffer();
      return performance.now() - start;
    }),
  );
  await Promise.all(
    rows.slice(0, 2).map((row) =>
      request(row, `/candidate/resumes/${row.resume_id}/exports`, {
        revision: 2,
      }),
    ),
  );
  const render = await Promise.all(
    [0, 1].map(
      () =>
        new Promise((resolve, reject) => {
          const start = performance.now();
          const worker = spawn(
            php,
            ["../backend/scripts/frontend-e2e-cv-worker.php"],
            { stdio: "ignore" },
          );
          worker.on("error", reject);
          worker.on("exit", (code) =>
            code === 0
              ? resolve(performance.now() - start)
              : reject(new Error(`Worker exited ${code}`)),
          );
        }),
    ),
  );
  const result = {
    environment: {
      os: os.platform(),
      cpu: os.cpus()[0]?.model,
      logical_cpus: os.cpus().length,
      memory_gib: Math.round(os.totalmem() / 1024 ** 3),
      node: process.version,
      api: `${port === "8127" ? "PHP built-in single worker" : "Apache threaded PHP"}; isolated MySQL33063; loopback HTTP`,
    },
    concurrent_users: rows.length,
    list: stats(list),
    save: stats(save),
    two_export_workers: stats(render),
  };
  await mkdir("test-results/resume-benchmark", { recursive: true });
  await writeFile(
    "test-results/resume-benchmark/result.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  execFileSync(php, [helper, "cleanup"], { stdio: "ignore" });
}
