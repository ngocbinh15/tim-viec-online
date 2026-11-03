"use client";

import { useEffect, useRef } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Code2,
  Download,
  FolderGit2,
  GraduationCap,
  Languages,
  Palette,
  UserRound,
} from "lucide-react";
import type { SectionKey } from "@/features/resumes/schema";

export const RESUME_STEPS = [
  { key: "theme", label: "Giao diện", icon: Palette, sections: [] },
  { key: "personal", label: "Cá nhân", icon: UserRound, sections: [] },
  {
    key: "experience",
    label: "Kinh nghiệm",
    icon: BriefcaseBusiness,
    sections: ["experience"],
  },
  {
    key: "education",
    label: "Học vấn",
    icon: GraduationCap,
    sections: ["education"],
  },
  { key: "skills", label: "Kỹ năng", icon: Code2, sections: ["skills"] },
  {
    key: "languages",
    label: "Ngoại ngữ",
    icon: Languages,
    sections: ["languages"],
  },
  { key: "projects", label: "Dự án", icon: FolderGit2, sections: ["projects"] },
  {
    key: "additional",
    label: "Bổ sung",
    icon: BadgeCheck,
    sections: ["certifications", "activities"],
  },
  { key: "export", label: "Xuất PDF", icon: Download, sections: [] },
] as const satisfies readonly {
  key: string;
  label: string;
  icon: typeof Palette;
  sections: readonly SectionKey[];
}[];
export type ResumeStep = (typeof RESUME_STEPS)[number]["key"];

export function ResumeStepper({
  active,
  onChange,
}: {
  active: ResumeStep;
  onChange: (step: ResumeStep) => void;
}) {
  const host = useRef<HTMLElement>(null);
  const index = RESUME_STEPS.findIndex((step) => step.key === active);
  useEffect(() => {
    const nav = host.current;
    const selected = nav?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!nav || !selected) return;
    const item = selected.getBoundingClientRect();
    const viewport = nav.getBoundingClientRect();
    if (item.left < viewport.left || item.right > viewport.right) {
      nav.scrollLeft +=
        item.left - viewport.left - (viewport.width - item.width) / 2;
    }
  }, [active]);
  return (
    <nav ref={host} className="resume-stepper" aria-label="Các bước tạo CV">
      <ol>
        {RESUME_STEPS.map((step, position) => (
          <li
            key={step.key}
            data-past={position < index}
            data-active={step.key === active}
          >
            <button
              type="button"
              aria-current={step.key === active ? "step" : undefined}
              onClick={() => onChange(step.key)}
            >
              <span className="resume-step-icon">
                <step.icon size={18} aria-hidden="true" />
              </span>
              <span>{step.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
