import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAiAnalysis, parseAiState } from "../src/features/employer/ai";
import { analysis } from "./fixtures/ai-analysis";

test("AI parser preserves genuine completed output including zero score and empty missing skills", () => {
  assert.deepEqual(parseAiAnalysis(analysis), analysis);
  assert.equal(parseAiAnalysis({ ...analysis, match_score: 0 }).match_score, 0);
  assert.deepEqual(
    parseAiAnalysis({ ...analysis, criteria_scores: null }).criteria_scores,
    null,
  );
  assert.equal(
    parseAiState({
      status: "completed",
      analysis,
      error: null,
      retryable: false,
    }).analysis?.match_score,
    84,
  );
});

test("AI parser rejects malformed or fabricated assessment rather than assigning fallback scores", () => {
  for (const input of [
    { ...analysis, match_score: 101 },
    { ...analysis, match_score: -1 },
    { ...analysis, match_score: 84.2 },
    { ...analysis, match_score: "84" },
    { ...analysis, strengths: ["Only one"] },
    { ...analysis, missing_skills: ["1", "2", "3", "4", "5"] },
    { ...analysis, summary: "word ".repeat(80) },
    { ...analysis, criteria_scores: { skills: 900 } },
    {
      ...analysis,
      criteria_scores: { ...analysis.criteria_scores, skills: 90.5 },
    },
  ])
    assert.throws(() => parseAiAnalysis(input));
  assert.throws(() =>
    parseAiState({
      status: "completed",
      analysis: null,
      retryable: false,
      error: null,
    }),
  );
  assert.throws(() =>
    parseAiState({
      status: "unknown",
      analysis: null,
      retryable: true,
      error: null,
    }),
  );
});

test("safe actionable CV failure messages remain visible and stalled work is explicitly retryable", () => {
  const message =
    "Không đọc được nội dung CV. Vui lòng dùng PDF có văn bản thay vì ảnh scan.";
  assert.equal(
    parseAiState({
      status: "failed",
      analysis: null,
      error: message,
      retryable: true,
    }).error,
    message,
  );
  const state = parseAiState({
    status: "pending",
    analysis: null,
    error: null,
    retryable: true,
  });
  assert.equal(state.status, "pending");
  assert.equal(state.retryable, true);
});

test("AI lifecycle keeps pending, processing, deferred and failure distinct without leaking raw provider errors", () => {
  for (const status of ["pending", "processing", "deferred", "failed"]) {
    const state = parseAiState({
      status,
      analysis: null,
      retryable: true,
      error: "private API credentials",
    });
    assert.equal(state.status, status);
    assert.equal(state.analysis, null);
    assert.doesNotMatch(state.error ?? "", /private API credentials/);
  }
});
