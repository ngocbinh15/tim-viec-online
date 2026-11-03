import assert from "node:assert/strict";
import test from "node:test";
import { RESUME_TEMPLATES } from "../src/features/resumes/templates";
import {
  emptyResume,
  resumeDocumentSchema,
  validateForExport,
} from "../src/features/resumes/schema";

test("all six template choices accept the same document without changing its content", () => {
  const keys = [
    "classic",
    "modern",
    "minimal",
    "executive",
    "elegant",
    "technical",
  ];
  assert.deepEqual(
    RESUME_TEMPLATES.map((item) => item.key),
    keys,
  );
  const doc = emptyResume();
  doc.content.basics.full_name = "Nguyễn Minh An";
  doc.content.basics.headline = "Kỹ sư phần mềm";
  doc.content.basics.email = "an@example.test";
  doc.content.skills.push({
    id: crypto.randomUUID(),
    name: "TypeScript",
    detail: "React",
  });
  for (const template_key of keys) {
    const parsed = validateForExport({ ...doc, template_key });
    assert.equal(parsed.template_key, template_key);
    assert.deepEqual(parsed.content, doc.content);
    assert.deepEqual(parsed.settings, doc.settings);
  }
  assert.equal(
    resumeDocumentSchema.safeParse({ ...doc, template_key: "unknown" }).success,
    false,
  );
});

test("blank drafts are valid; exports require actual identity and content", () => {
  const draft = emptyResume();
  assert.equal(resumeDocumentSchema.safeParse(draft).success, true);
  assert.throws(() => validateForExport(draft));
  draft.content.basics.full_name = "Nguyễn Minh An";
  draft.content.basics.headline = "Lập trình viên";
  draft.content.basics.email = "an@example.test";
  draft.content.skills.push({
    id: crypto.randomUUID(),
    name: "Laravel",
    detail: "REST API",
  });
  assert.doesNotThrow(() => validateForExport(draft));
});

test("schema rejects unknown keys, external image input, unsafe links and repeated sections", () => {
  const draft = emptyResume();
  assert.equal(
    resumeDocumentSchema.safeParse({ ...draft, owner_id: 123 }).success,
    false,
  );
  assert.equal(
    resumeDocumentSchema.safeParse({
      ...draft,
      content: {
        ...draft.content,
        basics: { ...draft.content.basics, photo_url: "http://127.0.0.1/" },
      },
    }).success,
    false,
  );
  draft.content.basics.links.push({
    id: crypto.randomUUID(),
    label: "Portfolio",
    url: "javascript:alert(1)",
  });
  assert.equal(resumeDocumentSchema.safeParse(draft).success, false);
  draft.content.basics.links = [];
  draft.settings.section_order[1] = draft.settings.section_order[0];
  assert.equal(resumeDocumentSchema.safeParse(draft).success, false);
});

test("month ranges, current positions and field limits are enforced", () => {
  const draft = emptyResume();
  draft.content.experience.push({
    id: crypto.randomUUID(),
    company: "A",
    position: "Dev",
    start_month: "2026-12",
    end_month: "2026-01",
    current: false,
    description: "",
  });
  assert.equal(resumeDocumentSchema.safeParse(draft).success, false);
  draft.content.experience[0].end_month = null;
  draft.content.experience[0].current = true;
  assert.equal(resumeDocumentSchema.safeParse(draft).success, true);
  draft.name = "x".repeat(121);
  assert.equal(resumeDocumentSchema.safeParse(draft).success, false);
});
