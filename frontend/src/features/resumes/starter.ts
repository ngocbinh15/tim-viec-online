import {
  resumeDocumentSchema,
  SECTION_KEYS,
  type ResumeDocument,
} from "./schema";
import legacy from "./legacy-starter.json";

export function addStarterContent(
  current: ResumeDocument,
  starter: ResumeDocument,
): ResumeDocument {
  const next = structuredClone(current);
  for (const key of [
    "full_name",
    "headline",
    "email",
    "phone",
    "city",
    "summary",
  ] as const) {
    if (!next.content.basics[key].trim())
      next.content.basics[key] = starter.content.basics[key];
  }
  if (!next.content.basics.links.length)
    next.content.basics.links = structuredClone(starter.content.basics.links);
  for (const key of SECTION_KEYS) {
    const hasContent = next.content[key].some((entry) =>
      Object.entries(entry).some(
        ([field, value]) =>
          field !== "id" &&
          ((typeof value === "string" && value.trim()) || value === true),
      ),
    );
    if (!hasContent)
      Object.assign(next.content, {
        [key]: structuredClone(starter.content[key]),
      });
  }
  return resumeDocumentSchema.parse(next);
}

export function initializeStarterContent(
  current: ResumeDocument,
  starter: ResumeDocument,
): ResumeDocument {
  if (current.settings.starter_version === 1) return current;
  const next = addStarterContent(current, starter);
  // Replace only exact values from the previous starter, never edited text.
  for (const key of [
    "full_name",
    "headline",
    "email",
    "phone",
    "city",
    "summary",
  ] as const) {
    if (next.content.basics[key] === legacy.basics[key])
      next.content.basics[key] = starter.content.basics[key];
  }
  for (const section of SECTION_KEYS) {
    for (const entry of next.content[section]) {
      for (const [index, previous] of legacy[section].entries()) {
        const replacement = starter.content[section][index] as
          Record<string, unknown> | undefined;
        if (!replacement) continue;
        for (const [key, value] of Object.entries(previous)) {
          if (
            [
              "id",
              "start_month",
              "end_month",
              "issued_month",
              "current",
            ].includes(key)
          )
            continue;
          const record = entry as Record<string, unknown>;
          if (
            typeof value === "string" &&
            value &&
            record[key] === value &&
            typeof replacement[key] === "string"
          )
            record[key] = replacement[key];
        }
      }
    }
  }
  next.settings.starter_version = 1;
  return resumeDocumentSchema.parse(next);
}
