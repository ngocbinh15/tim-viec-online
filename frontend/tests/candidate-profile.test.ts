import assert from "node:assert/strict";
import test from "node:test";
import { createProfilePreview } from "../src/mocks/candidate-profile";
import { MAX_CV_BYTES } from "../src/features/candidate-profile/types";
import {
  profileCompletion,
  validateAvatar,
  validateCv,
  validateProfile,
} from "../src/features/candidate-profile/validation";

test("profile validation follows SQL limits, age and the ten-skill maximum", () => {
  const profile = createProfilePreview();
  assert.deepEqual(validateProfile(profile, "2026-10-19"), {});
  for (const [key, value] of Object.entries({
    name: "a",
    title: "x".repeat(101),
    address: "x".repeat(256),
    city: "x".repeat(101),
    experience_years: 81,
    bio: "x".repeat(5001),
    dob: "2026-02-30",
    phone: "0123",
    linkedin: "javascript:alert(1)",
    github: "https://user:secret@example.com",
    portfolio: "not-url",
    skill_ids: Array.from({ length: 11 }, (_, index) => index + 1),
  })) {
    assert.ok(
      validateProfile({ ...profile, [key]: value }, "2026-10-19")[key],
      key,
    );
  }
  assert.ok(
    validateProfile({ ...profile, skill_ids: [1, 1] }, "2026-10-19").skill_ids,
  );
  assert.ok(
    validateProfile({ ...profile, skill_ids: [999] }, "2026-10-19").skill_ids,
  );
  assert.deepEqual(
    validateProfile(
      {
        ...profile,
        dob: "2011-10-19",
        skill_ids: Array.from({ length: 10 }, (_, index) => index + 1),
      },
      "2026-10-19",
    ),
    {},
  );
  assert.ok(
    validateProfile({ ...profile, dob: "2011-10-20" }, "2026-10-19").dob,
  );
});

test("CV checks exact five-MiB boundary, extension, MIME and signature without claiming text extraction", async () => {
  const header = new TextEncoder().encode("%PDF-1.4\n");
  const boundary = new Uint8Array(MAX_CV_BYTES);
  boundary.set(header);
  assert.equal(
    await validateCv(
      new File([boundary], "cv.PDF", { type: "application/pdf" }),
    ),
    null,
  );
  assert.equal(await validateCv(new File([header], "cv.pdf")), null);
  for (const file of [
    new File([boundary, "x"], "large.pdf", { type: "application/pdf" }),
    new File([], "empty.pdf", { type: "application/pdf" }),
    new File([header], "cv.txt", { type: "application/pdf" }),
    new File([header], "cv.pdf", { type: "text/html" }),
    new File(["not a pdf"], "fake.pdf", { type: "application/pdf" }),
  ])
    assert.ok(await validateCv(file));
});

test("CV accepts leading line breaks and a UTF-8 BOM without accepting disguised non-PDF files", async () => {
  const pdf = "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF";
  for (const prefix of ["\n", "\r\n", " \t\n", "\uFEFF\n"]) {
    assert.equal(
      await validateCv(
        new File([prefix, pdf], "cv.pdf", { type: "application/pdf" }),
      ),
      null,
    );
  }
  for (const prefix of [
    "<html>\n",
    "<script>alert(1)</script>\n",
    "MZ",
    " ".repeat(1024),
  ]) {
    assert.ok(
      await validateCv(
        new File([prefix, pdf], "fake.pdf", { type: "application/pdf" }),
      ),
    );
  }
});

test("avatar rejects executable formats and MIME-disguised image data", async () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(
    await validateAvatar(new File([png], "avatar.png", { type: "image/png" })),
    null,
  );
  for (const file of [
    new File(["<svg/>"], "avatar.svg", { type: "image/svg+xml" }),
    new File(["<script/>"], "fake.png", { type: "image/png" }),
    new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", {
      type: "image/png",
    }),
  ])
    assert.ok(await validateAvatar(file));
});

test("completion is computed from actual fields and selected files", () => {
  const profile = createProfilePreview();
  assert.equal(profileCompletion(profile, false, false), 50);
  assert.equal(profileCompletion(profile, true, true), 70);
  assert.equal(
    profileCompletion(
      {
        ...profile,
        phone: "0901234567",
        bio: "Mục tiêu nghề nghiệp",
        portfolio: "https://example.com",
      },
      true,
      true,
    ),
    100,
  );
});
