import test from "node:test";
import assert from "node:assert/strict";
import { readRequestBody } from "../src/features/api/read-body";

test("upload limit rejects oversized declared and chunked bodies before retaining them", async () => {
  await assert.rejects(readRequestBody(new Request("http://localhost", { method: "POST", body: "12345", headers: { "content-length": "5" } }), 4), { status: 413 });
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(3)); controller.enqueue(new Uint8Array(3)); },
    cancel() { cancelled = true; },
  });
  const request = new Request("http://localhost", { method: "POST", body, duplex: "half" } as RequestInit);
  await assert.rejects(readRequestBody(request, 4), { status: 413 });
  assert.equal(cancelled, true);
  const valid = new Request("http://localhost", { method: "POST", body: "test" });
  assert.equal(new TextDecoder().decode(await readRequestBody(valid, 4)), "test");
});
