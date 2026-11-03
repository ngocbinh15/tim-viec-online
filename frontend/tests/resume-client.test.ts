import test from "node:test";
import assert from "node:assert/strict";
import { fetchResumes } from "../src/features/resumes/client";

test("deleting the final CV on page two returns the remaining CVs on page one", async () => {
  const previous = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    const page = Number(new URL(url, "http://test").searchParams.get("page"));
    return Response.json({
      success: true,
      data:
        page === 1
          ? [
              {
                id: 1,
                name: "Remaining CV",
                template_key: "classic",
                revision: 1,
                updated_at: "2026-10-29T00:00:00Z",
                latest_export: null,
              },
            ]
          : [],
      meta: { current_page: page, last_page: 1, total: 12, enabled: true },
    });
  };
  try {
    const result = await fetchResumes(2);
    assert.equal(result.items[0]?.id, 1);
    assert.equal(result.meta.current_page, 1);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = previous;
  }
});
