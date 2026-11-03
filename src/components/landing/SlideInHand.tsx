"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

const HANDS = {
  /** Holding out the olive branch; slides in from the right. */
  offering: { src: "/brand/olive-hand.webp", width: 1400, height: 607 },
  /** Open, reaching for the branch; slides in from the left. */
  receiving: { src: "/brand/receiving-hand.webp", width: 1200, height: 530 },
} as const;

/**
 * One of the closing band's two hands. Driven by scrolling only: as the band scrolls up the screen
 * the hand slides in from its side (`from`) towards its spot and slowly fades in, then stops;
 * scrolling back reverses it. Shown in place for reduced motion.
 */
export function SlideInHand({ hand, from, className }: { hand: keyof typeof HANDS; from: "left" | "right"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const img = HANDS[hand];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--in", "1");
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      // 0 while the band's top is in the lowest tenth of the screen, 1 once it is 60% of the way up.
      const top = el.closest("section")!.getBoundingClientRect().top;
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.9 - top) / (vh * 0.5)));
      el.style.setProperty("--in", p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none [--in:0]", className)}
      style={{
        // starts 60% of its own width off to its side and invisible; the fade lags the slide a little
        transform: `translateX(calc((1 - var(--in)) * ${from === "right" ? "60%" : "-60%"}))`,
        opacity: "calc(var(--in) * var(--in))",
      }}
    >
      <Image src={img.src} alt="" width={img.width} height={img.height} sizes="(min-width: 768px) 40vw, 60vw" className="h-auto w-full" />
    </div>
  );
}
