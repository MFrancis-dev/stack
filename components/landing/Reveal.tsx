"use client";

/**
 * Turns on the landing page's entrances: marks <html> as scripted (content stays visible without
 * script) and reveals `.rv` and `.lp-shutter` elements once as they enter the screen.
 * Roadmap: K6.1
 */

import { useEffect } from "react";

export function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");
    const targets = document.querySelectorAll<HTMLElement>(".rv, .lp-shutter");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
