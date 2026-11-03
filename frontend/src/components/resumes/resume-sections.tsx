"use client";
import { useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import type { ResumeDocument, SectionKey } from "@/features/resumes/schema";
import { SECTION_LABELS } from "@/features/resumes/templates";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";
import { ResumeMonthField } from "./resume-month-field";

const FIELDS: Record<SectionKey, Record<string, string>> = {
  experience: {
    company: "Công ty",
    position: "Vị trí",
    start_month: "Từ tháng",
    end_month: "Đến tháng",
    description: "Mô tả kinh nghiệm",
  },
  education: {
    school: "Trường",
    qualification: "Chuyên ngành / bằng cấp",
    start_month: "Từ tháng",
    end_month: "Đến tháng",
    description: "Thông tin học vấn",
  },
  skills: { name: "Tên kỹ năng", detail: "Mô tả kỹ năng" },
  projects: {
    name: "Tên dự án",
    role: "Vai trò",
    url: "Liên kết dự án",
    description: "Mô tả dự án",
  },
  certifications: {
    name: "Tên chứng chỉ",
    issuer: "Đơn vị cấp",
    issued_month: "Tháng cấp",
    url: "Liên kết chứng chỉ",
  },
  languages: { name: "Ngôn ngữ", proficiency: "Trình độ" },
  activities: {
    name: "Tên hoạt động",
    role: "Vai trò",
    description: "Mô tả hoạt động",
  },
};
function entryName(entry: object) {
  const record = entry as Record<string, unknown>;
  return String(
    record.name ||
      record.position ||
      record.qualification ||
      record.company ||
      record.school ||
      "",
  );
}

function EntryPanel({
  title,
  label,
  children,
  defaultExpanded = false,
}: {
  title: string;
  label: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || !title);
  const id = useId();
  return (
    <div className="resume-entry">
      <button
        type="button"
        className="resume-entry-toggle"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        <span>
          <small>{label}</small>
          <strong>{title || "Nội dung mới"}</strong>
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
      <div id={id} className="resume-entry-content" hidden={!expanded}>
        {children}
      </div>
    </div>
  );
}
export function ResumeSections({
  document: doc,
  onChange,
  sections,
  wizard = false,
}: {
  document: ResumeDocument;
  onChange: (value: ResumeDocument) => void;
  sections?: readonly SectionKey[];
  wizard?: boolean;
}) {
  const sectionId = useId();
  const [closed, setClosed] = useState<Set<SectionKey>>(
    () =>
      new Set(
        doc.settings.section_order.filter((key) => !doc.content[key].length),
      ),
  );
  function update(action: (next: ResumeDocument) => void) {
    const next = structuredClone(doc);
    action(next);
    onChange(next);
  }
  function move(section: SectionKey, index: number, direction: number) {
    update((next) => {
      const array = next.content[section];
      [array[index], array[index + direction]] = [
        array[index + direction],
        array[index],
      ];
    });
  }
  return (
    <>
      {doc.settings.section_order
        .filter((section) => !sections || sections.includes(section))
        .map((section) => {
          const order = doc.settings.section_order.indexOf(section);
          return (
            <section
              className="resume-section-editor resume-content-section"
              key={section}
            >
              <header>
                <h2>
                  {wizard ? (
                    SECTION_LABELS[section]
                  ) : (
                    <button
                      type="button"
                      className="resume-section-toggle"
                      aria-expanded={!closed.has(section)}
                      aria-controls={`${sectionId}-${section}`}
                      onClick={() =>
                        setClosed((previous) => {
                          const next = new Set(previous);
                          if (next.has(section)) next.delete(section);
                          else next.add(section);
                          return next;
                        })
                      }
                    >
                      <ChevronDown aria-hidden="true" />
                      {SECTION_LABELS[section]}
                      <span className="resume-section-count" aria-hidden="true">
                        {doc.content[section].length}
                      </span>
                    </button>
                  )}
                </h2>
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={order === 0}
                    aria-label={`Đưa ${SECTION_LABELS[section]} lên`}
                    onClick={() =>
                      update((next) => {
                        const list = next.settings.section_order;
                        [list[order - 1], list[order]] = [
                          list[order],
                          list[order - 1],
                        ];
                      })
                    }
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={order === doc.settings.section_order.length - 1}
                    aria-label={`Đưa ${SECTION_LABELS[section]} xuống`}
                    onClick={() =>
                      update((next) => {
                        const list = next.settings.section_order;
                        [list[order + 1], list[order]] = [
                          list[order],
                          list[order + 1],
                        ];
                      })
                    }
                  >
                    <ArrowDown size={16} />
                  </Button>
                </div>
              </header>
              <div
                id={`${sectionId}-${section}`}
                className="resume-section-content"
                hidden={!wizard && closed.has(section)}
              >
                <label className="resume-check">
                  <input
                    type="checkbox"
                    checked={!doc.settings.hidden_sections.includes(section)}
                    onChange={(e) =>
                      update((next) => {
                        next.settings.hidden_sections = e.target.checked
                          ? next.settings.hidden_sections.filter(
                              (key) => key !== section,
                            )
                          : [...next.settings.hidden_sections, section];
                      })
                    }
                  />
                  Hiện trong CV
                </label>
                {doc.content[section].map((entry, index) => (
                  <EntryPanel
                    key={entry.id}
                    title={entryName(entry)}
                    label={`${SECTION_LABELS[section]} ${index + 1}`}
                    defaultExpanded={wizard}
                  >
                    <div className="resume-entry-actions">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Đưa mục ${index + 1} lên`}
                        disabled={index === 0}
                        onClick={() => move(section, index, -1)}
                      >
                        <ArrowUp size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Đưa mục ${index + 1} xuống`}
                        disabled={index === doc.content[section].length - 1}
                        onClick={() => move(section, index, 1)}
                      >
                        <ArrowDown size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Xóa mục ${index + 1}`}
                        onClick={() =>
                          update((next) => {
                            next.content[section].splice(index, 1);
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    {Object.entries(FIELDS[section]).map(([key, label]) => {
                      const record = entry as unknown as Record<
                        string,
                        string | null | boolean
                      >;
                      const isMonth = key.endsWith("month");
                      const long = key === "description" || key === "detail";
                      const max =
                        key === "description"
                          ? 2000
                          : key === "detail"
                            ? 500
                            : key === "url"
                              ? 1000
                              : ["skills", "languages"].includes(section)
                                ? 100
                                : 150;
                      return (
                        <label key={key}>
                          {label}
                          {long ? (
                            <Textarea
                              rows={3}
                              value={String(record[key] ?? "")}
                              maxLength={max}
                              onChange={(e) =>
                                update((next) => {
                                  (
                                    next.content[section][
                                      index
                                    ] as unknown as Record<string, unknown>
                                  )[key] = e.target.value;
                                })
                              }
                            />
                          ) : isMonth ? (
                            <ResumeMonthField
                              label={label}
                              value={record[key] as string | null}
                              onChange={(value) =>
                                update((next) => {
                                  (
                                    next.content[section][
                                      index
                                    ] as unknown as Record<string, unknown>
                                  )[key] = value;
                                })
                              }
                            />
                          ) : (
                            <Input
                              type={key === "url" ? "url" : "text"}
                              maxLength={max}
                              disabled={
                                key === "end_month" && record.current === true
                              }
                              value={String(record[key] ?? "")}
                              onChange={(e) =>
                                update((next) => {
                                  (
                                    next.content[section][
                                      index
                                    ] as unknown as Record<string, unknown>
                                  )[key] = e.target.value;
                                })
                              }
                            />
                          )}
                        </label>
                      );
                    })}
                    {"current" in entry && (
                      <label className="resume-check">
                        <input
                          type="checkbox"
                          checked={entry.current}
                          onChange={(e) =>
                            update((next) => {
                              const item = next.content[section][index] as {
                                current: boolean;
                                end_month: string | null;
                              };
                              item.current = e.target.checked;
                              if (item.current) item.end_month = null;
                            })
                          }
                        />
                        Đang tiếp tục
                      </label>
                    )}
                  </EntryPanel>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={doc.content[section].length >= 20}
                  onClick={() =>
                    update((next) => {
                      const value: Record<string, unknown> = {
                        id: crypto.randomUUID(),
                      };
                      for (const key of Object.keys(FIELDS[section]))
                        value[key] = key.endsWith("month") ? null : "";
                      if (section === "experience" || section === "education")
                        value.current = false;
                      (next.content[section] as unknown[]).push(value);
                    })
                  }
                >
                  <Plus size={16} />
                  Thêm {SECTION_LABELS[section].toLocaleLowerCase("vi")}
                </Button>
              </div>
            </section>
          );
        })}
    </>
  );
}
