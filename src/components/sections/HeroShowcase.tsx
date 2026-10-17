"use client";

import { useEffect, useRef, useState } from "react";
import { PenLine, Scale, Timer } from "lucide-react";
import { benefits } from "@/data/home";
import { featuredCase } from "@/data/dashboard";
import { site } from "@/data/site";
import { cn } from "@/lib/cn";
import { Section } from "../layout/Container";
import { prefersReducedMotion } from "../motion/Reveal";
import { AssessmentPanel, DeadlinesPanel, DraftPanel } from "../product/CasePanels";
import { DashboardSidebar, DashboardTopbar, DashboardWindow, DisputeTable } from "../product/Dashboard";
import { IconTile } from "../ui/primitives";

const benefitIcons = { scale: Scale, pen: PenLine, timer: Timer } as const;
const panels = [AssessmentPanel, DraftPanel, DeadlinesPanel];

/**
 * The three benefit cells act as tabs: each one swaps the detail panel in the dashboard below.
 * The dashboard drifts up a few pixels as you scroll (max 32px).
 */
export function HeroShowcase() {
  const [active, setActive] = useState(0);
  const Panel = panels[active];

  return (
    <>
      <FeatureIntroGrid active={active} onSelect={setActive} />
      <Section innerClassName="px-3 pt-10 pb-0 sm:px-6 md:px-10 md:pt-14" aria-label="Product preview">
        {/* warm glow behind the product, Brillance-style */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 h-[260px] w-[min(720px,90%)] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(226,150,96,0.35), rgba(247,214,170,0.18) 55%, transparent)" }}
        />
        <ParallaxRise>
          <div
            id="hero-panel"
            role="tabpanel"
            aria-labelledby={`benefit-tab-${active}`}
            className="relative"
            style={{
              maskImage: "linear-gradient(to bottom, black 62%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 62%, transparent 100%)",
            }}
          >
            <DashboardWindow>
              <div className="flex h-[600px] md:h-[640px]">
                <DashboardSidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                  <DashboardTopbar />
                  <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <DisputeTable selectedId={featuredCase.id} />
                    </div>
                    <div key={active} className="animate-fade-up order-first flex border-b border-line lg:order-none lg:border-b-0">
                      <Panel />
                    </div>
                  </div>
                </div>
              </div>
            </DashboardWindow>
          </div>
        </ParallaxRise>
      </Section>
    </>
  );
}

/** Three columns separated by rules; the selected one gets a top indicator and a tinted background. */
export function FeatureIntroGrid({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  return (
    <Section hatched innerClassName="p-0">
      <div role="tablist" aria-label={`What ${site.name} does`} className="group/tabs grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {benefits.map((b, i) => {
          const Icon = benefitIcons[b.icon];
          const selected = active === i;
          return (
            <button
              key={b.title}
              id={`benefit-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls="hero-panel"
              onClick={() => onSelect(i)}
              className={cn(
                "group/ben relative flex items-start gap-4 px-5 py-7 text-left transition-colors duration-200 md:flex-col md:items-center md:px-8 md:py-10 md:text-center",
                selected ? "bg-canvas" : "hover:bg-canvas/60",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg",
              )}
            >
              {/* top rule + auto-advance progress (pauses while hovering the row) */}
              <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-line-subtle max-md:hidden" />
              {selected && (
                <span
                  aria-hidden
                  onAnimationEnd={() => onSelect((i + 1) % benefits.length)}
                  className="animate-progress absolute inset-x-0 top-0 h-[2px] bg-fg group-hover/tabs:[animation-play-state:paused] group-focus-within/tabs:[animation-play-state:paused] max-md:hidden"
                />
              )}
              <IconTile dark={selected} className="transition-colors duration-200">
                <Icon strokeWidth={1.6} className="size-4" />
              </IconTile>
              <span>
                <span className="block text-[16px] font-medium tracking-[-0.01em] text-fg-heading">{b.title}</span>
                <span className="mt-1.5 block text-[14px] leading-[21px] text-fg-body md:mx-auto md:max-w-[300px]">{b.body}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/** Translates children up to `max` px as the section scrolls through the viewport. */
function ParallaxRise({ children, max = 32 }: { children: React.ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, 1 - rect.top / window.innerHeight));
      el.style.transform = `translate3d(0, ${(-progress * max).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [max]);
  return (
    <div ref={ref} className="will-change-transform">
      {children}
    </div>
  );
}
