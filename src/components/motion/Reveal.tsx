"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

/**
 * Fades and lifts its children (16px) into view once, when scrolled to.
 * `delay` staggers siblings; prefers-reduced-motion disables it in CSS.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  style,
  children,
  ...props
}: {
  as?: "div" | "li" | "section" | "span";
  delay?: number;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-visible={visible}
      className={cn("reveal", className)}
      style={{ "--reveal-delay": `${delay}ms`, ...style } as React.CSSProperties}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** True once the element has scrolled into view; used to start one-off product animations. */
export function useInView<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, options ?? { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView] as const;
}

/** True when the user asked the OS for reduced motion. */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const reducedQuery = "(prefers-reduced-motion: reduce)";

/** Live reduced-motion preference; false during server render. */
export function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(reducedQuery);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
}
