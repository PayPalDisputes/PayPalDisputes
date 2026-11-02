"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * The closing band's illustration: a hand offering an olive branch that rises out of the band's
 * bottom edge as it scrolls into view, tilting up as it comes, then floats gently once it has
 * settled. Tied to scroll position (it sinks again on the way back up). Still for reduced motion.
 */
export function OfferingHand({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--rise", "1");
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      // 0 while the band's top is in the lowest tenth of the screen, 1 once it is 65% of the way up,
      // so the whole rise plays where it can be seen.
      const top = el.parentElement!.getBoundingClientRect().top;
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.9 - top) / (vh * 0.55)));
      el.style.setProperty("--rise", easeOut(p).toFixed(4));
      el.dataset.settled = p >= 1 ? "true" : "false"; // starts the idle float once it has risen
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
      className={cn("group pointer-events-none [--rise:0]", className)}
      style={{
        transform: "translateY(calc((1 - var(--rise)) * 75%)) rotate(calc((1 - var(--rise)) * -9deg))",
        opacity: "calc(0.25 + var(--rise) * 0.75)",
        transformOrigin: "85% 100%",
      }}
    >
      <div className="group-data-[settled=true]:motion-safe:animate-[mk-float_5s_ease-in-out_infinite]">
        <Image src="/brand/olive-hand.webp" alt="" width={1400} height={607} sizes="(min-width: 768px) 46vw, 90vw" className="h-auto w-full drop-shadow-[0_18px_30px_rgba(29,32,22,0.25)]" />
      </div>
    </div>
  );
}
