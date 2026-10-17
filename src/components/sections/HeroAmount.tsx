"use client";

import { useEffect, useState } from "react";
import { hero } from "@/data/home";
import { RollingNumber } from "../motion/RollingNumber";
import { Badge } from "../ui/primitives";

const CYCLE_MS = 6000; // long enough for the slow roll (~4.5s) to finish and sit for a beat

/** Big dollar figure that rolls up and down through example disputes, with what the agent recommended. */
export function HeroAmount() {
  const cases = hero.exampleCases;
  // Ever-increasing tick (not the index) so even/odd alternates even when the list wraps around.
  const [tick, setTick] = useState(0);
  const index = tick % cases.length;

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [cases.length]);

  const c = cases[index];
  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-7 md:py-8">
      <p className="text-[11.5px] font-medium tracking-[0.02em] text-fg-muted">Example dispute</p>
      <p className="font-serif text-[54px] leading-none text-fg md:text-[64px]">
        <RollingNumber value={c.amount} prefix="$" delay={300} stagger={200} cycle={tick} />
      </p>
      <p key={tick} className="animate-fade-up flex items-center gap-2 text-[12.5px] text-fg-body" aria-live="polite">
        {c.reason}
        <span aria-hidden className="text-line-strong">→</span>
        <Badge tone={c.decision === "Fight" ? "outline" : c.decision === "Settle" ? "warn" : "neutral"}>{c.decision}</Badge>
      </p>
    </div>
  );
}
