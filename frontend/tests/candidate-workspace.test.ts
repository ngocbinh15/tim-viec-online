import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseWorkspaceQuery,
  pageSlice,
  validateMessage,
} from "../src/features/candidate-workspace/rules";
import { createCandidateWorkspace } from "../src/mocks/candidate-workspace";
import { createJobFixtures } from "../src/mocks/jobs";
import { APPLICATION_LABELS } from "../src/features/candidate-workspace/types";

test("workspace query rejects malformed page/status and clamps after deletion", () => {
  for (const page of ["0", "-1", "NaN", "Infinity", "1e2", "9007199254740992"])
    assert.equal(parseWorkspaceQuery(new URLSearchParams({ page })).page, 1);
  assert.deepEqual(
    parseWorkspaceQuery(new URLSearchParams("tab=saved&page=2&status=waiting")),
    { tab: "saved", page: 2, status: "waiting" },
  );
  assert.equal(
    parseWorkspaceQuery(new URLSearchParams("status=__proto__&tab=bad")).status,
    "",
  );
  assert.deepEqual(pageSlice([1, 2, 3], 999, 2), {
    page: 2,
    lastPage: 2,
    items: [3],
  });
  assert.deepEqual(pageSlice([], 99), { page: 1, lastPage: 1, items: [] });
});
test("chat validates trimmed content at the exact thousand-character boundary", () => {
  for (const value of ["", " \n\r\t "]) assert.ok(validateMessage(value));
  assert.equal(validateMessage(" a "), null);
  assert.equal(validateMessage("a".repeat(1000)), null);
  assert.ok(validateMessage("a".repeat(1001)));
});
test("workspace fixtures link every conversation to an application and retain a closed job", () => {
  const jobs = createJobFixtures(new Date("2026-10-19T08:00:00Z"));
  const data = createCandidateWorkspace(jobs, "2026-10-19");
  assert.deepEqual(
    new Set(data.applications.map((item) => item.status)),
    new Set(Object.keys(APPLICATION_LABELS)),
  );
  for (const conversation of data.conversations) {
    assert.ok(
      data.applications.some((item) => item.job_id === conversation.job_id),
    );
    assert.ok(jobs.some((item) => item.id === conversation.job_id));
  }
  assert.ok(
    data.conversations.some(
      (room) => jobs.find((job) => job.id === room.job_id)?.status === "closed",
    ),
  );
  assert.equal(
    new Set(data.applications.map((item) => item.job_id)).size,
    data.applications.length,
  );
});
