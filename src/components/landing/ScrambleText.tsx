"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/components/motion/Reveal";

/**
 * Text whose digits flicker through random values and then lock in, left to right, after
 * ramp.com's live counter. Only digits scramble; punctuation and units stay put so the width holds.
 * Screen readers and reduced motion get the final text straight away.
 */
export function ScrambleText({ text, delay = 300, duration = 1100, className }: { text: string; delay?: number; duration?: number; className?: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (reduced) return;
    const digits = [...text].map((ch, i) => (/\d/.test(ch) ? i : -1)).filter((i) => i >= 0);
    const start = performance.now() + delay;
    const id = window.setInterval(() => {
      const t = (performance.now() - start) / duration;
      if (t >= 1) {
        setShown(text);
        window.clearInterval(id);
        return;
      }
      const locked = Math.max(0, Math.floor(t * (digits.length + 1)) - 1);
      setShown(
        [...text]
          .map((ch, i) => {
            const k = digits.indexOf(i);
            return k >= 0 && (t < 0 || k >= locked) ? String(Math.floor(Math.random() * 10)) : ch;
          })
          .join(""),
      );
    }, 55);
    return () => window.clearInterval(id);
  }, [text, delay, duration, reduced]);

  return (
    <span className={className}>
      <span aria-hidden className="tabular-nums">
        {reduced ? text : shown}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
