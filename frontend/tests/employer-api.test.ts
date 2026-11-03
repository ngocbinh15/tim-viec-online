import assert from "node:assert/strict";
import test from "node:test";
import { analysis } from "./fixtures/ai-analysis";
import {
  allPages,
  jobPayload,
  mapApplication,
  mapConversation,
  mapNotification,
  mapMessage,
  type RawApplication,
  type Requester,
} from "../src/features/employer/api";

const raw: RawApplication = {
  id: 27,
  job_id: 8,
  candidate_id: 4,
  status: "withdrawn",
  reviewed_at: null,
  created_at: "2026-10-26T12:00:00Z",
  cover_letter: "Cover",
  cv_url: "https://untrusted.example/cv.pdf",
  candidate: {
    user_id: 101,
    name: "Candidate",
    email: "candidate@example.test",
    phone: null,
    title: null,
    city: null,
    experience_years: 2,
    skills: [{ name: "PHP" }],
  },
};
test("employer application uses authenticated local CV route and preserves missing AI without inventing a result", () => {
  const application = mapApplication(raw);
  assert.equal(application.cv_path, "/api/backend/applications/27/cv");
  assert.equal(application.analysis, null);
  assert.equal(application.status, "withdrawn");
  assert.deepEqual(application.skills, ["PHP"]);
});

test("employer application preserves the current candidate avatar and clears a removed avatar", () => {
  const first = mapApplication({
    ...raw,
    candidate: {
      ...raw.candidate,
      avatar_url: "https://example.test/storage/avatars/first.jpg",
    },
  });
  assert.equal(
    first.avatar_url,
    "https://example.test/storage/avatars/first.jpg",
  );
  const updated = mapApplication({
    ...raw,
    candidate: {
      ...raw.candidate,
      avatar_url: "https://example.test/storage/avatars/updated.jpg",
    },
  });
  assert.equal(
    updated.avatar_url,
    "https://example.test/storage/avatars/updated.jpg",
  );
  assert.equal(
    mapApplication({
      ...raw,
      candidate: { ...raw.candidate, avatar_url: null },
    }).avatar_url,
    null,
  );
  assert.equal(mapApplication(raw).avatar_url, null);
});

test("employer adapter maps completed AI and keeps pending/failure apart from zero", () => {
  const completed = mapApplication({
    ...raw,
    ai_analysis: analysis,
    ai_analysis_status: "completed",
  });
  assert.equal(completed.analysis?.match_score, 84);
  assert.equal(completed.analysis_status, "completed");
  const failed = mapApplication({
    ...raw,
    ai_analysis_status: "failed",
    ai_analysis_error: "private credentials",
  });
  assert.equal(failed.analysis, null);
  assert.equal(failed.analysis_status, "failed");
  assert.doesNotMatch(failed.analysis_error ?? "", /private credentials/);
  assert.equal(
    mapApplication({ ...raw, ai_analysis_status: "pending" }).analysis_status,
    "pending",
  );
  assert.throws(() =>
    mapApplication({ ...raw, ai_analysis: { ...analysis, match_score: "84" } }),
  );
});
test("existing conversation retains association with withdrawn application", () => {
  assert.deepEqual(
    mapConversation(
      { id: 3, job_id: 8, partner: { id: 101 }, last_message: null },
      [mapApplication(raw)],
      202,
    ),
    {
      id: 3,
      job_id: 8,
      candidate_id: 101,
      employer_id: 202,
      application_id: 27,
    },
  );
});
test("notification destinations use structured data rather than backend supplied URL", () => {
  const base = {
    id: 1,
    type: "new_application",
    title: "New",
    content: "Application",
    read_at: null,
    created_at: raw.created_at,
  };
  assert.equal(
    mapNotification({ ...base, data: { application_id: 27 } }).href,
    "/employer/candidates/27",
  );
  assert.equal(
    mapNotification({
      ...base,
      type: "new_message",
      data: { conversation_id: 9 },
    }).href,
    "/employer/messages?conversation=9",
  );
});
test("all pages are read beyond first page and errors are propagated", async () => {
  const calls: string[] = [];
  const request: Requester = async <T>(path: string) => {
    calls.push(path);
    return { success: true, data: [calls.length] as T, meta: { last_page: 3 } };
  };
  assert.deepEqual(
    await allPages<number>(request, "/employer/applications"),
    [1, 2, 3],
  );
  assert.match(calls[2], /page=3/);
  const failed: Requester = async () => {
    throw new Error("offline");
  };
  await assert.rejects(allPages(failed, "/employer/applications"), /offline/);
});
test("messages never embed arbitrary provider image URLs", () => {
  const message = mapMessage({
    id: 1,
    conversation_id: 7,
    sender_id: 101,
    message: "",
    image_url: "https://unsafe/image",
    created_at: raw.created_at,
    is_read: false,
  });
  assert.equal(
    message.image_url,
    "/api/backend/conversations/7/messages/1/image",
  );
});
test("salary modes send Laravel contract values and skills", () => {
  const payload = jobPayload({
    salary_mode: "starting",
    salary_min: "15000000",
    salary_max: "20000000",
    skill_ids: [2],
  } as Parameters<typeof jobPayload>[0]);
  assert.equal(payload.salary_type, "starting");
  assert.equal(payload.salary_min, 15000000);
  assert.equal(payload.salary_max, null);
  assert.deepEqual(payload.skills, [2]);
});
