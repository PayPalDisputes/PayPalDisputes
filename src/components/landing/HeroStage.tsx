"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Minus, MousePointer2 } from "lucide-react";
import { useReducedMotion } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";
import { SpringDots } from "./SpringDots";

/**
 * The product stage under the hero, after ramp.com: a rounded panel of spring dots with a looping
 * demo of one (fictional) dispute moving through Sira. A case arrives, the evidence checks tick
 * in, the recommendation appears, a cursor approves the draft, and it's sent to PayPal.
 * Plays only while on screen; with reduced motion it shows the finished state.
 */

/** When each step starts, in ms from the start of a loop. */
const TIMELINE = [0, 400, 1500, 2100, 2700, 3700, 4900, 5900, 6300];
const LOOP_MS = 9800;
const DONE = TIMELINE.length - 1;

const checks = [
  { label: "Tracking matches the order", ok: true },
  { label: "Delivered Oct 12, before the claim", ok: true },
  { label: "Signature on delivery", ok: false },
];

const reasons = [
  "Carrier shows delivery to the PayPal address",
  "Claim opened 9 days after delivery",
  "Add the delivery photo; no signature was taken",
];

/** Thin corner ticks around a floating card, like crop marks on a proof. */
function CropMarks() {
  const tick = "absolute size-2.5 border-[#141312]/30";
  return (
    <span aria-hidden className="pointer-events-none absolute -inset-2">
      <span className={cn(tick, "top-0 left-0 border-t border-l")} />
      <span className={cn(tick, "top-0 right-0 border-t border-r")} />
      <span className={cn(tick, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(tick, "right-0 bottom-0 border-r border-b")} />
    </span>
  );
}

const enter = (on: boolean) =>
  cn("transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]", on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3");

export function HeroStage() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(-1);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !onScreen) return;
    const timers: number[] = [];
    const run = () => {
      TIMELINE.forEach((at, i) => timers.push(window.setTimeout(() => setStep(i), at)));
      timers.push(window.setTimeout(() => setStep(-1), LOOP_MS - 500)); // fade everything out
      timers.push(window.setTimeout(run, LOOP_MS));
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, [reduced, onScreen]);

  const s = reduced ? DONE : step;
  const sent = s >= 8;

  return (
    <div ref={ref} className="relative isolate overflow-hidden rounded-3xl border border-[#141312]/[0.07] bg-[#f6f6f3]">
      <SpringDots className="-z-10 [mask-image:radial-gradient(ellipse_at_center,#000_40%,transparent_85%)]" />

      <p className="absolute top-5 left-6 font-mono text-[10.5px] tracking-[0.12em] text-[#77736c] uppercase">Example dispute</p>

      <div className="relative mx-auto flex max-w-[780px] flex-col gap-6 px-5 pt-16 pb-10 md:block md:h-[440px] md:px-0 md:pt-0 md:pb-0">
        {/* The case */}
        <div className={cn("relative md:absolute md:top-[72px] md:right-0 md:w-[330px]", enter(s >= 1))}>
          <CropMarks />
          <div className="rounded-xl border border-[#141312]/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(20,19,18,0.04),0_12px_32px_-12px_rgba(20,19,18,0.12)]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.12em] text-[#77736c] uppercase">New dispute</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] transition-colors duration-500",
                  sent ? "bg-[#0070E0] text-white" : "bg-[#141312]/[0.06] text-[#55524d]",
                )}
              >
                {sent ? "Responded" : "Open"}
              </span>
            </div>
            <p className="mt-3 text-[15px] font-medium">Item not received</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-[24px] tracking-[-0.02em] tabular-nums">$2,875.50</span>
              <span className="text-[12px] text-[#77736c]">Respond within 2 days</span>
            </div>
            <ul className="mt-4 space-y-2 border-t border-[#141312]/[0.06] pt-4 text-[12.5px]">
              {checks.map((c, i) => (
                <li key={c.label} className={cn("flex items-center gap-2.5", enter(s >= 2 + i))}>
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-full",
                      c.ok ? "bg-[#0070E0] text-white" : "border border-dashed border-[#141312]/35 text-[#77736c]",
                    )}
                  >
                    {c.ok ? <Check className="size-2.5" strokeWidth={3} /> : <Minus className="size-2.5" strokeWidth={3} />}
                  </span>
                  <span className={c.ok ? "" : "text-[#77736c]"}>{c.label}</span>
                  {!c.ok && <span className="ml-auto font-mono text-[9.5px] tracking-[0.08em] text-[#b4552f] uppercase">Missing</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* The recommendation and draft */}
        <div className={cn("relative md:absolute md:top-[40px] md:left-0 md:w-[380px]", enter(s >= 5))}>
          <CropMarks />
          <div className="rounded-xl border border-[#141312]/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(20,19,18,0.04),0_12px_32px_-12px_rgba(20,19,18,0.12)]">
            <span className="font-mono text-[10px] tracking-[0.12em] text-[#77736c] uppercase">Recommendation</span>
            <p className="mt-2 text-[26px] tracking-[-0.03em]">Fight</p>
            <ul className="mt-3 space-y-1.5 text-[12.5px] text-[#55524d]">
              {reasons.map((r, i) => (
                <li
                  key={r}
                  className={cn("flex gap-2", enter(s >= 5))}
                  style={{ transitionDelay: s >= 5 && s < 6 ? `${150 + i * 140}ms` : undefined }}
                >
                  <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-[#0070E0]" />
                  {r}
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-lg bg-[#f6f6f3] p-3">
              <p className="font-mono text-[9.5px] tracking-[0.12em] text-[#77736c] uppercase">Draft to PayPal</p>
              <div className="mt-2 space-y-1.5">
                {["100%", "92%", "64%"].map((wd) => (
                  <span key={wd} className="block h-1.5 rounded-full bg-[#141312]/[0.08]" style={{ width: wd }} />
                ))}
              </div>
            </div>
            <div className="mt-4 flex gap-2 text-[12.5px]">
              <span
                className={cn(
                  "rounded-full bg-[#0070e0] px-4 py-1.5 text-white transition-transform duration-150",
                  s === 7 && "scale-95 bg-[#0062c4]",
                )}
              >
                {sent ? "Approved" : "Approve"}
              </span>
              <span className="rounded-full border border-[#141312]/[0.12] px-4 py-1.5">Edit</span>
            </div>
          </div>
        </div>

        {/* The cursor glides in and clicks Approve (desktop only) */}
        <MousePointer2
          aria-hidden
          className={cn(
            "absolute hidden size-5 fill-[#141312] text-white drop-shadow transition-all duration-1000 ease-[cubic-bezier(0.65,0,0.35,1)] md:block",
            s >= 6 && s < 9 ? "opacity-100" : "opacity-0",
            s >= 6 ? "top-[333px] left-[57px]" : "top-[420px] left-[300px]",
            s === 7 && "scale-90",
          )}
        />

        {/* Sent */}
        <div
          className={cn(
            "flex w-fit items-center gap-2 self-center rounded-full bg-[#141312] py-2 pr-4 pl-2 text-[13px] text-white md:absolute md:bottom-6 md:left-1/2 md:-translate-x-1/2",
            "transition-[opacity,transform] duration-500",
            sent ? "opacity-100 md:translate-y-0" : "opacity-0 md:translate-y-2",
          )}
        >
          <span className="grid size-5 place-items-center rounded-full bg-[#0070E0]">
            <Check className="size-3" strokeWidth={3} />
          </span>
          Response sent to PayPal
        </div>
      </div>
    </div>
  );
}
