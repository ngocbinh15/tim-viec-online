"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { CANDIDATE_PAGES } from "@/features/candidate-workspace/types";
import { CandidateSidebar } from "./candidate-sidebar";
import { useOptionalWorkspace } from "./workspace-provider";
import { useFileUrl } from "./use-file-url";

const AccountShellContext = createContext(false);
export const useInAccountShell = () => useContext(AccountShellContext);

// Mounted in the shared layout: navigating changes the content slot and active
// item, while the sidebar, avatar and header retain their existing DOM/state.
export function AccountShell({
  children,
  name,
  preview,
}: {
  children: ReactNode;
  name: string;
  preview: boolean;
}) {
  const pathname = usePathname();
  const section = CANDIDATE_PAGES.find(
    (item) => pathname === `/account/${item.key}` || (item.key === "resumes" && pathname.startsWith("/account/resumes/")),
  )?.key;
  const workspace = useOptionalWorkspace();
  const localAvatar = useFileUrl(workspace?.avatar ?? null);
  const avatar = localAvatar ?? workspace?.avatarUrl;
  if (section === "resumes" && /\/resumes\/\d+\/edit$/.test(pathname)) return <main id="main" className="resume-workspace">{children}</main>;
  if (!section) return children;
  return (
    <AccountShellContext.Provider value>
      <main
        id="main"
        className={`candidate-area${section === "messages" ? " candidate-messaging" : ""}`}
      >
        <CandidateSidebar
          active={section}
          preview={preview}
          name={workspace?.profile.name ?? name}
          avatar={
            avatar ? (
              <Image
                unoptimized
                src={avatar}
                width={68}
                height={68}
                alt="Ảnh đại diện đã chọn"
              />
            ) : undefined
          }
        />
        <div className="cu-content">{children}</div>
      </main>
    </AccountShellContext.Provider>
  );
}
