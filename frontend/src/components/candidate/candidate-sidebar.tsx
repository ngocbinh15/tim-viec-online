"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  BriefcaseBusiness,
  FileUser,
  FileText,
  MessageSquare,
  Settings,
  UserRound,
} from "lucide-react";
import {
  CANDIDATE_PAGES,
  candidateHref,
  type CandidateSection,
} from "@/features/candidate-workspace/types";

const icons = {
  profile: FileUser,
  resumes: FileText,
  jobs: BriefcaseBusiness,
  messages: MessageSquare,
  notifications: Bell,
  settings: Settings,
};
export function CandidateSidebar({
  active,
  preview,
  name,
  avatar,
}: {
  active: CandidateSection;
  preview: boolean;
  name: string;
  avatar?: ReactNode;
}) {
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const container = nav.current;
    const current = container?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (container && current && container.scrollWidth > container.clientWidth) {
      container.scrollLeft +=
        current.getBoundingClientRect().left -
        container.getBoundingClientRect().left -
        (container.clientWidth - current.offsetWidth) / 2;
    }
  }, [active]);
  return (
    <aside className="cu-sidebar" aria-label="Điều hướng tài khoản ứng viên">
      <div className="cu-user-card">
        <div className="cu-user-heading">
          <span className="cu-avatar">
            {avatar ?? <UserRound aria-hidden="true" />}
          </span>
          <strong>{name}</strong>
        </div>
        <div className="cu-user-note">
          <strong>Hồ sơ của bạn</strong>
          <p>Thông tin và CV để ứng tuyển.</p>
          <Link href={`${candidateHref("profile")}#profile-info`}>
            Thiết lập hồ sơ
          </Link>
        </div>
      </div>
      <nav ref={nav} className="cu-nav" aria-label="Tài khoản ứng viên">
        {CANDIDATE_PAGES.map((item) => {
          const Icon = icons[item.key];
          return (
            <Link
              key={item.key}
              href={candidateHref(item.key)}
              scroll={false}
              onClick={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.defaultPrevented
                )
                  return;
                // Start each section at the top; Next's automatic scrolling can
                // retain a small font/scroll-anchor offset and expose the footer.
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
              aria-current={item.key === active ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {preview && (
        <p className="cu-preview-note">
          Dữ liệu mẫu · thay đổi chỉ giữ trong phiên xem trước.
        </p>
      )}
    </aside>
  );
}
