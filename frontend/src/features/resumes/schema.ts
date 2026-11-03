import { z } from "zod";

export const SECTION_KEYS = [
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
  "activities",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
export const TEMPLATE_KEYS = [
  "classic",
  "modern",
  "minimal",
  "executive",
  "elegant",
  "technical",
] as const;
export const MAX_DOCUMENT_BYTES = 128 * 1024;
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine(
      (value) => !/<\/?[a-z][^>]*>/i.test(value),
      "Chỉ nhập văn bản, không nhập HTML.",
    );
const id = z.uuid();
const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .nullable();
const url = z
  .string()
  .max(1000)
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return (
        ["http:", "https:"].includes(parsed.protocol) &&
        !parsed.username &&
        !parsed.password
      );
    } catch {
      return false;
    }
  }, "Liên kết phải bắt đầu bằng https:// hoặc http://.");
const entry = z.object({ id }).strict();
const dated = {
  start_month: month,
  end_month: month,
  current: z.boolean(),
  description: text(2000),
};
const datesValid = (value: {
  start_month: string | null;
  end_month: string | null;
  current: boolean;
}) =>
  !(value.current && value.end_month) &&
  !(
    value.start_month &&
    value.end_month &&
    value.start_month > value.end_month
  );
export const resumeContentSchema = z
  .object({
    basics: z
      .object({
        full_name: text(120),
        headline: text(150),
        email: z
          .string()
          .max(254)
          .refine(
            (v) => !v || z.email().safeParse(v).success,
            "Email không hợp lệ.",
          ),
        phone: text(30),
        city: text(150),
        summary: text(2000),
        links: z.array(entry.extend({ label: text(100), url })).max(10),
        photo_asset_id: z.number().int().positive().nullable(),
      })
      .strict(),
    experience: z
      .array(
        entry
          .extend({ company: text(150), position: text(150), ...dated })
          .refine(datesValid, "Khoảng thời gian không hợp lệ."),
      )
      .max(20),
    education: z
      .array(
        entry
          .extend({ school: text(150), qualification: text(150), ...dated })
          .refine(datesValid, "Khoảng thời gian không hợp lệ."),
      )
      .max(20),
    projects: z
      .array(
        entry.extend({
          name: text(150),
          role: text(150),
          url,
          description: text(2000),
        }),
      )
      .max(20),
    skills: z
      .array(entry.extend({ name: text(100), detail: text(500) }))
      .max(20),
    certifications: z
      .array(
        entry.extend({
          name: text(150),
          issuer: text(150),
          issued_month: month,
          url,
        }),
      )
      .max(20),
    languages: z
      .array(entry.extend({ name: text(100), proficiency: text(100) }))
      .max(20),
    activities: z
      .array(
        entry.extend({
          name: text(150),
          role: text(150),
          description: text(2000),
        }),
      )
      .max(20),
  })
  .strict()
  .refine((content) => {
    const ids = [
      ...content.basics.links.map((item) => item.id),
      ...SECTION_KEYS.flatMap((key) => content[key].map((item) => item.id)),
    ];
    return new Set(ids).size === ids.length;
  }, "Các mục phải có ID riêng biệt.");
export const resumeSettingsSchema = z
  .object({
    accent: z.enum(["blue", "teal", "slate"]),
    font_size: z.enum(["small", "normal", "large"]),
    line_spacing: z.enum(["compact", "normal"]),
    section_order: z
      .array(z.enum(SECTION_KEYS))
      .length(SECTION_KEYS.length)
      .refine((v) => new Set(v).size === SECTION_KEYS.length),
    hidden_sections: z
      .array(z.enum(SECTION_KEYS))
      .max(SECTION_KEYS.length)
      .refine((v) => new Set(v).size === v.length),
    starter_version: z.literal(1).optional(),
  })
  .strict();
export const resumeDocumentSchema = z
  .object({
    name: text(120).min(1),
    template_key: z.enum(TEMPLATE_KEYS),
    template_version: z.literal(1),
    schema_version: z.literal(1),
    content: resumeContentSchema,
    settings: resumeSettingsSchema,
  })
  .strict()
  .refine(
    (v) =>
      new TextEncoder().encode(JSON.stringify(v)).byteLength <=
      MAX_DOCUMENT_BYTES,
    "CV không được vượt quá 128 KiB.",
  );
export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;
export type ResumeContent = z.infer<typeof resumeContentSchema>;
export function emptyResume(): ResumeDocument {
  return {
    name: "CV chưa đặt tên",
    template_key: "classic",
    template_version: 1,
    schema_version: 1,
    content: {
      basics: {
        full_name: "",
        headline: "",
        email: "",
        phone: "",
        city: "",
        summary: "",
        links: [],
        photo_asset_id: null,
      },
      experience: [],
      education: [],
      projects: [],
      skills: [],
      certifications: [],
      languages: [],
      activities: [],
    },
    settings: {
      accent: "blue",
      font_size: "normal",
      line_spacing: "normal",
      section_order: [...SECTION_KEYS],
      hidden_sections: [],
    },
  };
}
export function validateForExport(input: unknown): ResumeDocument {
  const value = resumeDocumentSchema.parse(input);
  const basics = value.content.basics;
  if (
    !basics.full_name.trim() ||
    !basics.headline.trim() ||
    !basics.email ||
    !SECTION_KEYS.some(
      (key) =>
        !value.settings.hidden_sections.includes(key) &&
        value.content[key].some((item) =>
          Object.entries(item).some(
            ([k, v]) => k !== "id" && typeof v === "string" && v.trim(),
          ),
        ),
    )
  )
    throw new Error(
      "Bổ sung họ tên, chức danh, email và ít nhất một mục nội dung trước khi xuất PDF.",
    );
  return value;
}
