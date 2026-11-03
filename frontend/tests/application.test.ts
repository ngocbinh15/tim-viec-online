import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicationError,
  MAX_COVER_LETTER,
} from "../src/features/candidate-workspace/application";
import { createJobFixtures } from "../src/mocks/jobs";

const today = "2026-10-20";
const jobs = createJobFixtures(new Date(`${today}T05:00:00Z`));
const job = jobs[8];

test("application accepts an open job through its deadline, including the optional letter boundary", () => {
  assert.equal(
    applicationError({ ...job, deadline: today }, [], "", today),
    null,
  );
  assert.equal(
    applicationError(job, [], "a".repeat(MAX_COVER_LETTER), today),
    null,
  );
  assert.ok(applicationError(job, [], "a".repeat(MAX_COVER_LETTER + 1), today));
});

test("application rejects missing, closed and expired jobs and duplicates in every review status", () => {
  assert.ok(applicationError(undefined, [], "", today));
  for (const changed of [
    { ...job, status: "closed" as const },
    { ...job, deadline: "2026-10-19" },
  ])
    assert.ok(applicationError(changed, [], "", today));
  for (const status of ["applied", "waiting", "accepted", "rejected"] as const)
    assert.ok(
      applicationError(
        job,
        [{ id: 1, job_id: job.id, status, created_at: today }],
        "",
        today,
      ),
    );
});
