"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Replays on Activity reveal without remounting the workspace or its forms. */
export function AdminPageEntrance({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;
    const style = getComputedStyle(document.documentElement);
    // CSS minification can shorten 240ms to .24s; WAAPI always expects ms.
    const time = style.getPropertyValue("--motion-content").trim();
    const duration = parseFloat(time) * (time.endsWith("ms") ? 1 : 1000) || 240;
    const easing =
      style.getPropertyValue("--motion-ease-out").trim() || "ease-out";
    // Opacity keeps sticky children and portal positioning in their original
    // containing blocks. Only the short page heading moves by six pixels.
    const animations = [
      node.animate([{ opacity: 0.65 }, { opacity: 1 }], { duration, easing }),
    ];
    const heading = node.querySelector<HTMLElement>(".ap-page-heading");
    if (heading)
      animations.push(
        heading.animate(
          [{ transform: "translateY(6px)" }, { transform: "none" }],
          { duration, easing },
        ),
      );
    const cancel = () => animations.forEach((animation) => animation.cancel());
    const onPreferenceChange = () => {
      if (preference.matches) cancel();
    };
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      cancel();
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, []);
  return (
    <div ref={ref} className="ap-content-slot">
      {children}
    </div>
  );
}
