"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { scenes } from "./ProcessScenes";
import { SpringDots } from "./SpringDots";

type Step = { id: string; meta: string; title: string; body: string };

/**
 * The process, told by scrolling. Steps run down the left with a progress rail; the step in the
 * middle of the screen is "active". On wide screens a dotted panel stays pinned on the right and
 * plays that step's scene; on phones each scene plays inline under its step.
 */
export function Process({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    items.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-14">
      {/* Steps */}
      <ol className="relative">
        <span aria-hidden className="absolute top-3 bottom-3 left-[11px] w-px bg-[#141312]/[0.08]" />
        <span
          aria-hidden
          className="absolute top-3 left-[11px] w-px origin-top bg-[#0070E0] transition-[height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ height: `calc((100% - 24px) * ${active / Math.max(steps.length - 1, 1)})` }}
        />
        {steps.map((s, i) => {
          const Scene = scenes[s.id];
          const on = active === i;
          return (
            <li
              key={s.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              data-index={i}
              className="relative py-8 pl-11 md:flex md:min-h-[78vh] md:flex-col md:justify-center md:py-0"
            >
              <div className="relative">
                <span
                  aria-hidden
                  className={cn(
                    "absolute -top-[3px] -left-11 grid size-[23px] place-items-center rounded-full border font-mono text-[9.5px] transition-colors duration-500",
                    i <= active ? "border-[#0070E0] bg-[#0070E0] text-white" : "border-[#141312]/15 bg-white text-[#8a867f]",
                  )}
                >
                  {pad(i + 1)}
                </span>
                <p className={cn("font-mono text-[10.5px] tracking-[0.12em] uppercase transition-colors duration-500", on ? "text-[#0070E0]" : "text-[#a29e97]")}>
                  {s.meta}
                </p>
                <h3 className={cn("mt-2 text-[clamp(1.4rem,2.3vw,1.9rem)] leading-[1.15] tracking-[-0.025em] transition-colors duration-500", on ? "text-[#141312]" : "text-[#b9b5ae]")}>
                  {s.title}
                </h3>
                <p className={cn("mt-3 max-w-md text-[15px] leading-relaxed transition-colors duration-500", on ? "text-[#55524d]" : "text-[#b9b5ae]")}>{s.body}</p>
              </div>

              {/* Phones: the scene sits under its step */}
              <div
                aria-hidden
                data-play={on ? "on" : "off"}
                className="dot-bg mt-6 flex min-h-[340px] items-center justify-center overflow-hidden rounded-2xl bg-[#f6f6f3] px-4 py-8 md:hidden"
              >
                {Scene && <Scene on={on} />}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Wide screens: one pinned panel playing the active step */}
      <div className="hidden md:block">
        <div className="sticky top-[11vh]">
          <div aria-hidden className="relative isolate h-[78vh] max-h-[620px] min-h-[500px] overflow-hidden rounded-3xl border border-[#141312]/[0.07] bg-[#f6f6f3]">
            <SpringDots className="-z-10 [mask-image:radial-gradient(ellipse_at_center,#000_45%,transparent_90%)]" />
            <div className="absolute top-5 right-6 left-6 flex items-center justify-between font-mono text-[10.5px] tracking-[0.12em] text-[#77736c] uppercase">
              <span>Example dispute</span>
              <span className="tabular-nums">
                Step {pad(active + 1)} / {pad(steps.length)}
              </span>
            </div>
            {steps.map((s, i) => {
              const Scene = scenes[s.id];
              const on = active === i;
              return (
                <div
                  key={s.id}
                  data-play={on ? "on" : "off"}
                  className={cn(
                    "absolute inset-0 flex items-center justify-center px-10 pt-10 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    on ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
                  )}
                >
                  {Scene && <Scene on={on} />}
                </div>
              );
            })}
            <div className="absolute right-6 bottom-5 left-6 flex gap-1.5">
              {steps.map((s, i) => (
                <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#141312]/[0.08]">
                  <span className={cn("block h-full origin-left bg-[#0070E0] transition-transform duration-500", i <= active ? "scale-x-100" : "scale-x-0")} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
