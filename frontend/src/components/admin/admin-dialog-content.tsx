"use client";

import { useRef, type ComponentProps } from "react";
import { cn } from "cn";
import { DialogContent } from "@/modules/cores/shadcn/components/ui/dialog";

/** Controlled admin dialogs also restore focus without a Radix Trigger. */
export function AdminDialogContent({
  onOpenAutoFocus,
  onCloseAutoFocus,
  className,
  ...props
}: ComponentProps<typeof DialogContent>) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <DialogContent
      {...props}
      className={cn("admin-page ap-modal", className)}
      onOpenAutoFocus={(event) => {
        opener.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        onOpenAutoFocus?.(event);
      }}
      onCloseAutoFocus={(event) => {
        onCloseAutoFocus?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        const previous = opener.current;
        const target =
          previous?.isConnected &&
          previous.getClientRects().length > 0 &&
          !previous.closest('[hidden],[inert],[aria-hidden="true"]')
            ? previous
            : Array.from(
                document.querySelectorAll<HTMLElement>(".ap-main h1"),
              ).find((el) => el.getClientRects().length > 0);
        if (target) {
          if (!target.hasAttribute("tabindex") && target.tagName === "H1")
            target.tabIndex = -1;
          target.focus({ preventScroll: true });
        }
      }}
    />
  );
}
