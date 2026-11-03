import assert from "node:assert/strict";
import test from "node:test";
import { validateProfile } from "../src/features/candidate-profile/validation";
import {
  candidateApplicationFromApi,
  candidateMessageFromApi,
  candidateMessageBody,
  candidateNotificationFromApi,
  candidateProfileFromApi,
  candidateProfilePayload,
} from "../src/features/candidate-workspace/api-adapter";

test("candidate application allowlist strips AI and maps protected CV to same origin", () => {
  const application = candidateApplicationFromApi({
    id: 12,
    job_id: 9,
    status: "withdrawn",
    created_at: "2026-10-26T10:00:00Z",
    cv_url: "https://backend.invalid/api/applications/12/cv",
    can_withdraw: false,
    ai_analysis: { match_score: 93 },
    ai_analysis_error: "private",
    ai_analysis_status: "completed",
  });
  assert.equal(application.status, "withdrawn");
  assert.equal(application.cv_url, "/api/backend/applications/12/cv");
  assert.equal(application.can_withdraw, false);
  assert.equal(
    Object.keys(application).some((key) => key.startsWith("ai_")),
    false,
  );
});

test("profile round trip uses backend skills and never invents missing account values", () => {
  const profile = candidateProfileFromApi({
    user: {
      name: "Candidate",
      email: "candidate@example.test",
      dob: "2000-01-02T00:00:00.000Z",
    },
    profile: {
      skills: [{ id: 42, name: "Rust" }],
      social_links: { github: "https://github.com/example" },
    },
  });
  assert.equal(profile.dob, "2000-01-02");
  assert.deepEqual(profile.skill_ids, [42]);
  assert.equal(profile.city, "");
  assert.deepEqual(candidateProfilePayload(profile).social_links, {
    github: "https://github.com/example",
  });
  assert.deepEqual(candidateProfilePayload(profile).skills, [42]);
  assert.equal(candidateProfilePayload(profile).phone, null);
  assert.equal(
    Object.hasOwn(candidateProfilePayload({ ...profile, dob: "" }), "dob"),
    false,
  );
});

test("notification routing reads persisted resource data rather than fixture IDs", () => {
  const item = candidateNotificationFromApi({
    id: 11,
    type: "new_message",
    title: "Message",
    content: "Hello",
    read_at: null,
    created_at: "2026-10-26T10:00:00Z",
    data: { conversation_id: 78, application_id: 45 },
  });
  assert.equal(item.conversation_id, 78);
  assert.equal(item.application_id, 45);
  assert.equal(item.read_at, null);
});

test("live profile validation accepts backend catalog IDs and enforces backend limits", () => {
  const profile = candidateProfileFromApi({
    user: { name: "Candidate", email: "candidate@example.test" },
    profile: { skills: [{ id: 42 }] },
  });
  assert.deepEqual(
    validateProfile(profile, "2026-10-26", [{ id: 42 }], 50, 2000),
    {},
  );
  assert.ok(validateProfile(profile, "2026-10-26").skill_ids);
  const errors = validateProfile(
    { ...profile, bio: "x".repeat(2001), experience_years: 51 },
    "2026-10-26",
    [{ id: 42 }],
    50,
    2000,
  );
  assert.ok(errors.bio);
  assert.ok(errors.experience_years);
});

test("message mapping preserves server IDs, ownership and read receipt with protected attachments", () => {
  const item = candidateMessageFromApi(
    {
      id: 83,
      sender_id: 7,
      message: "Hello",
      image_url: "https://backend.invalid/storage/private.jpg",
      read_at: "2026-10-26T10:01:00Z",
      created_at: "2026-10-26T10:00:00Z",
    },
    7,
    78,
  );
  assert.equal(item.id, "83");
  assert.equal(item.outgoing, true);
  assert.equal(item.preview, undefined);
  assert.equal(
    item.image_url,
    "/api/backend/conversations/78/messages/83/image",
  );
  assert.equal(item.read_at, "2026-10-26T10:01:00Z");
});

test("chat attachments use multipart bytes while text-only sends use JSON", async () => {
  const file = new File([new Uint8Array([137, 80, 78, 71])], "attachment.png", {
    type: "image/png",
  });
  const body = candidateMessageBody("  Hello  ", file);
  assert.ok(body instanceof FormData);
  assert.equal(body.get("message"), "Hello");
  const uploaded = body.get("image");
  assert.ok(uploaded instanceof File);
  assert.equal(uploaded.name, "attachment.png");
  assert.deepEqual(
    new Uint8Array(await uploaded.arrayBuffer()),
    new Uint8Array([137, 80, 78, 71]),
  );
  assert.deepEqual(JSON.parse(candidateMessageBody("  Hello  ") as string), {
    message: "Hello",
  });
});
