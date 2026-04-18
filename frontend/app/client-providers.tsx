"use client";

import { useEffect } from "react";
import { AppProviders } from "../providers/AppProviders";
import { FhevmProvider } from "../providers/FhevmProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-reveal");

    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>(".credora-animate-in"));
    if (!revealTargets.length) return;

    // Reveal immediately if IntersectionObserver is not supported.
    if (!("IntersectionObserver" in window)) {
      revealTargets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          target.classList.add("is-visible");
          observer.unobserve(target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.14,
      }
    );

    revealTargets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);

  return (
    <AppProviders>
      <FhevmProvider>{children}</FhevmProvider>
    </AppProviders>
  );
}
