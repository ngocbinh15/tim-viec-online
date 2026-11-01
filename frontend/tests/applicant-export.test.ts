import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedBackendPath,
  protectedFilePath,
  invalidatesPublicDirectory,
} from "../src/features/api/paths";
import {
  exportFilename,
  requestApplicantExport,
} from "../src/features/employer/applicant-export";

test("applicant exports use an authenticated POST binary route without invalidating public data", () => {
  const path = "/employer/applications/export";
  assert.equal(allowedBackendPath(path, "POST"), true);
  for (const method of ["GET", "DELETE", "PUT"])
    assert.equal(allowedBackendPath(path, method), false);
  assert.equal(protectedFilePath(path), true);
  assert.equal(invalidatesPublicDirectory(path, "POST"), false);
});

test("download names preserve Vietnamese and remove path separators and controls", () => {
  assert.equal(
    exportFilename(
      "attachment; filename=applicants.xlsx; filename*=utf-8''%E1%BB%A8ng%20vi%C3%AAn.xlsx",
      "xlsx",
    ),
    "Ứng viên.xlsx",
  );
  assert.equal(
    exportFilename('attachment; filename="../unsafe.xlsx"', "xlsx"),
    ".._unsafe.xlsx",
  );
  assert.equal(
    exportFilename("attachment; filename*=utf-8''%ZZ", "zip"),
    "danh-sach-ung-vien.zip",
  );
  assert.equal(
    exportFilename('attachment; filename="page.html"', "xlsx"),
    "danh-sach-ung-vien.xlsx",
  );
});

test("export request posts the full selection and returns a binary workbook", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "/api/backend/employer/applications/export");
    assert.equal(init.method, "POST");
    assert.equal(init.credentials, "same-origin");
    assert.deepEqual(JSON.parse(init.body as string), {
      job_ids: [11, 24],
      mode: "workbook",
    });
    return new Response(new Uint8Array([0x50, 0x4b, 3, 4, 1]), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": "attachment; filename=export.xlsx",
      },
    });
  });
  const result = await requestApplicantExport([11, 24], "workbook");
  assert.equal(result.filename, "export.xlsx");
  assert.equal(result.blob.size, 5);
});

test("failed or unexpected responses never become downloads", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { success: false, message: "Không tìm thấy tin tuyển dụng." },
      { status: 404 },
    ),
  );
  await assert.rejects(
    requestApplicantExport([1], "workbook"),
    /Không tìm thấy tin tuyển dụng/,
  );
  fetchMock.mock.mockImplementation(
    async () =>
      new Response("<html>login</html>", {
        headers: { "content-type": "text/html" },
      }),
  );
  await assert.rejects(
    requestApplicantExport([1], "workbook"),
    /File xuất không hợp lệ/,
  );
  fetchMock.mock.mockImplementation(
    async () =>
      new Response("not a zip", {
        headers: { "content-type": "application/zip" },
      }),
  );
  await assert.rejects(
    requestApplicantExport([1], "separate"),
    /File xuất không hợp lệ/,
  );
});

test("network failures have a Vietnamese retry message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(
    requestApplicantExport([1], "workbook"),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "Không thể tải danh sách. Vui lòng thử lại.",
  );
});

test("ZIP is supported, cancellation is propagated and empty selections never fetch", async (t) => {
  const controller = new AbortController();
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      assert.equal(init.signal?.aborted, false);
      return new Response(new Uint8Array([0x50, 0x4b, 3, 4]), {
        headers: { "content-type": "application/zip" },
      });
    },
  );
  await assert.rejects(
    requestApplicantExport([], "workbook"),
    /Chọn từ 1 đến 50 tin/,
  );
  assert.equal(fetchMock.mock.callCount(), 0);
  const result = await requestApplicantExport(
    [1, 2],
    "separate",
    controller.signal,
  );
  assert.equal(result.filename.endsWith(".zip"), true);
  fetchMock.mock.mockImplementation(async () => {
    controller.abort();
    return new Response(new Uint8Array([0x50, 0x4b, 3, 4]), {
      headers: { "content-type": "application/zip" },
    });
  });
  await assert.rejects(
    requestApplicantExport([1, 2], "separate", controller.signal),
    { name: "AbortError" },
  );
});
