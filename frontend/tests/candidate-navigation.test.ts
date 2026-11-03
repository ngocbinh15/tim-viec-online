import { test } from "node:test";
import assert from "node:assert/strict";
import {
  employerApplicationHref,
  employerCandidateListHref,
} from "../src/features/employer/candidate-navigation";

test("application navigation preserves only supported candidate list filters", () => {
  const query = new URLSearchParams(
    "job_id=2&status=waiting&match_score=80&keyword=react&sort=newest&page=2&application=4&returnTo=https://evil.test&extra=value",
  );
  const expected =
    "job_id=2&status=waiting&match_score=80&keyword=react&sort=newest&page=2";
  assert.equal(
    employerApplicationHref(4, query),
    `/employer/candidates/4?${expected}`,
  );
  assert.equal(
    employerCandidateListHref(query),
    `/employer/candidates?${expected}`,
  );
});

test("candidate navigation rejects malformed filters and never uses an external destination", () => {
  const query = new URLSearchParams(
    "job_id=-1&status=__proto__&match_score=999&sort=bad&page=1e3&returnTo=//evil.test",
  );
  assert.equal(employerCandidateListHref(query), "/employer/candidates");
  for (const id of [0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.equal(employerApplicationHref(id, query), "/employer/candidates");
});
