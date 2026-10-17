"use client";

import { cn } from "@/lib/cn";
import { useInView } from "./Reveal";

const DIGITS = "012345678901234567890123456789"; // three loops: the first roll spins past two full cycles

/**
 * Odometer-style number: each digit is a vertical strip that rolls into place once the element
 * scrolls into view, leftmost digit first. When `value` changes later, digits roll up or down
 * to the new value (keep the same number of characters). Non-digit characters render as-is.
 * Screen readers get the final value; reduced motion skips the roll (see globals.css).
 */
export function RollingNumber({
  value,
  prefix = "",
  suffix = "",
  className,
  delay = 0,
  stagger = 180,
  cycle = 0,
}: {
  value: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** ms before the first digit starts rolling */
  delay?: number;
  /** extra ms of delay for each digit after the first */
  stagger?: number;
  /**
   * Bump this each time `value` changes. Even and odd cycles land on different loops of the strip,
   * so every change makes a long roll (alternately down and up) instead of a one-step tick.
   */
  cycle?: number;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>({ threshold: 0.2 });
  const chars = [...value];
  const band = cycle % 2 === 0 ? 20 : 10;
  let digitIndex = 0;

  return (
    <span ref={ref} className={cn("inline-flex items-baseline tabular-nums", className)}>
      <span className="sr-only">
        {prefix}
        {value}
        {suffix}
      </span>
      <span aria-hidden className="inline-flex">
        {prefix}
        {chars.map((ch, i) => {
          if (!/\d/.test(ch)) return <span key={i}>{ch}</span>;
          const n = Number(ch);
          const order = digitIndex++;
          return (
            <span key={i} className="relative inline-block h-[1em] overflow-hidden leading-none">
              {/* invisible "0" gives every digit the same width, so nothing clips mid-roll */}
              <span className="invisible">0</span>
              <span
                className="rolling-strip absolute inset-x-0 top-0 flex flex-col"
                style={{
                  transform: `translateY(${inView ? -(band + n) : 0}em)`,
                  transitionDelay: `${delay + order * stagger}ms`,
                }}
              >
                {[...DIGITS].map((d, j) => (
                  <span key={j} className="block h-[1em] text-center leading-none">
                    {d}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
        {suffix && <span className="ml-0.5 text-[0.62em] text-fg-muted">{suffix}</span>}
      </span>
    </span>
  );
}
