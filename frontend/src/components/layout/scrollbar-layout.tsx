"use client";

import { useLayoutEffect } from "react";

/** Retain content width when Radix temporarily hides the native scrollbar. */
export function ScrollbarLayout() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const measure = () => {
      if (document.body.hasAttribute("data-scroll-locked")) return;
      const gap = Math.max(
        0,
        window.innerWidth - root.getBoundingClientRect().width,
      );
      root.style.setProperty("--page-scrollbar-gap", `${gap}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    const resize = () => {
      if (!document.body.hasAttribute("data-scroll-locked")) return measure();
      // The locked root no longer has a gutter. Measure independently when
      // resizing across the desktop breakpoint (or changing browser zoom).
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;top:-9999px;width:100px;height:100px;overflow:scroll;scrollbar-gutter:stable;visibility:hidden;border:0;padding:0";
      document.body.appendChild(probe);
      const gap = probe.offsetWidth - probe.clientWidth;
      probe.remove();
      root.style.setProperty("--page-scrollbar-gap", `${gap}px`);
    };
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      root.style.removeProperty("--page-scrollbar-gap");
    };
  }, []);
  return null;
}
