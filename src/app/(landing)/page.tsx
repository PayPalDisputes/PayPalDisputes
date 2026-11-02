import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronRight, PenLine, Scale, Timer, X } from "lucide-react";
import { ActivityTicker } from "@/components/landing/ActivityTicker";
import { CaseStack } from "@/components/landing/CaseStack";
import { landingWrap } from "@/components/landing/container";
import { SlideInHand } from "@/components/landing/SlideInHand";
import { HeroStage } from "@/components/landing/HeroStage";
import { Process } from "@/components/landing/Process";
import { SpringDots } from "@/components/landing/SpringDots";
import { landing } from "@/data/landing";
import { site } from "@/data/site";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: `${site.name}: ${site.tagline}`,
  description: site.description,
};

const icons = { scale: Scale, pen: PenLine, timer: Timer };

/** Page width and side margin shared by every section. */
const wrap = landingWrap;
const h2 = "text-[clamp(1.75rem,2.6vw,3.25rem)] leading-[1.1] tracking-[-0.03em]";
const card = "rounded-2xl border border-[#141312]/[0.08] bg-white";

function PrimaryButton({ href, children, inverted }: { href: string; children: React.ReactNode; inverted?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-md pr-4 pl-5 text-[14.5px]",
        inverted ? "bg-white font-medium text-[#5a6b2e] hover:bg-[#eef1e3]" : "bg-[#5a6b2e] text-white hover:bg-[#4a5824]",
      )}
    >
      {children}
      <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
    </Link>
  );
}

function SecondaryButton({ href, children, inverted }: { href: string; children: React.ReactNode; inverted?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center rounded-md px-5 text-[14.5px]",
        inverted ? "bg-white/15 text-white hover:bg-white/25" : "border border-[#141312]/[0.12] hover:bg-[#f7f7f5]",
      )}
    >
      {children}
    </Link>
  );
}

export default function LandingPage() {
  const { hero, activity, reasons, jobs, how, rules, cta } = landing;

  return (
    <>
      {/* Hero: fills the first screen, copy on the left and the case stack across the right half */}
      <section id="hero" className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-[#fafaf7]">
        <SpringDots color="90, 107, 46" opacity={0.3} className="-z-10" />
        {/* Top padding includes the 64px nav, which floats over this section */}
        <div className={cn(wrap, "grid items-center gap-12 pt-32 pb-16 md:pt-36 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-[clamp(2rem,4vw,6rem)]")}>
          <div className="max-w-[min(52rem,100%)]">
            <p className="font-mono text-[11px] tracking-[0.12em] text-[#77736c] uppercase">{hero.eyebrow}</p>
            <h1 className="mt-6 text-[clamp(2.75rem,5.4vw,7rem)] leading-[1.0] font-normal tracking-[-0.045em]">
              {hero.title.map((l) => (
                <span key={l} className="block lg:whitespace-nowrap">
                  {l}
                </span>
              ))}
            </h1>
            <p className="mt-6 max-w-[34em] text-[clamp(1.0625rem,1.1vw,1.375rem)] leading-relaxed text-[#77736c]">{hero.body}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <PrimaryButton href={hero.primary.href}>{hero.primary.label}</PrimaryButton>
              <SecondaryButton href={hero.secondary.href}>{hero.secondary.label}</SecondaryButton>
            </div>
            {/* Where the data comes from. Text only: Sira isn't affiliated with PayPal (see the footer). */}
            <p className="mt-10 flex max-w-md items-center gap-3 border-t border-[#141312]/[0.08] pt-5">
              <span className="font-mono text-[10.5px] tracking-[0.12em] text-[#8a867f] uppercase">{hero.builtOn.label}</span>
              <span className="text-[15px] tracking-[-0.01em]">
                <span className="font-medium text-[#003087]">{hero.builtOn.name}</span>{" "}
                <span className="text-[#55524d]">{hero.builtOn.product}</span>
              </span>
            </p>
          </div>
          {/* Grows with its half of the screen, but never taller than the window */}
          <CaseStack theme="light" className="mx-auto max-w-[min(880px,calc((100svh-12rem)*0.82))] lg:mr-0" />
        </div>
      </section>

      {/* Product stage: one example dispute played through, then what Sira keeps doing */}
      <section className={cn(wrap, "pt-14 pb-10")}>
        <HeroStage />
        <ActivityTicker label={activity.label} items={activity.items} className="mt-5" />
      </section>

      {/* Proof strip: what's covered, in place of a logo wall */}
      <section className={cn(wrap, "pt-12 pb-20")}>
        <p className="text-center text-[13px] text-[#9a968e]">{reasons.label}</p>
        <ul className="mx-auto mt-5 flex max-w-4xl flex-wrap justify-center gap-2">
          {reasons.items.map((r) => (
            <li key={r} className="rounded-md border border-[#141312]/[0.08] px-3 py-1.5 text-[13px] text-[#55524d]">
              {r}
            </li>
          ))}
        </ul>
      </section>

      {/* What it does */}
      <section className={cn(wrap, "pb-28")}>
        <div className="grid gap-4 md:grid-cols-3">
          {jobs.map((j) => {
            const Icon = icons[j.icon];
            return (
              <Link key={j.title} href={j.href} className={cn(card, "group p-6 transition-colors hover:border-[#141312]/20")}>
                <div className="flex items-start justify-between">
                  <Icon aria-hidden className="size-5" strokeWidth={1.6} />
                  <ChevronRight
                    aria-hidden
                    className="size-4 text-[#9a968e] transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2}
                  />
                </div>
                <h2 className="mt-8 text-[16px] font-medium">{j.title}</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#77736c]">{j.body}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How it works: statement + action, then the process told by scrolling */}
      <section id="how" className={cn(wrap, "py-28")}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h2 className={cn(h2, "max-w-2xl text-[#9a968e]")}>
            <span className="text-[#141312]">{how.lead}</span> {how.title}
          </h2>
          <div className="shrink-0">
            <SecondaryButton href={how.cta.href}>{how.cta.label}</SecondaryButton>
          </div>
        </div>
        <div className="mt-16">
          <Process steps={how.steps} />
        </div>
      </section>

      {/* Guardrails */}
      <section className={cn(wrap, "pb-28")}>
        <div className="grid gap-10 border-t border-[#141312]/[0.08] pt-16 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <div>
            <h2 className={h2}>{rules.title}</h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#77736c]">{rules.body}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {rules.columns.map((c, i) => {
              const Mark = i === 0 ? Check : X;
              return (
                <div key={c.label} className={cn(card, "p-6")}>
                  <p className="font-mono text-[10.5px] tracking-[0.12em] text-[#77736c] uppercase">{c.label}</p>
                  <ul className="mt-5 space-y-3 text-[14px]">
                    {c.items.map((it) => (
                      <li key={it} className="flex items-start gap-2.5">
                        <Mark aria-hidden className="mt-0.5 size-4 shrink-0 text-[#9a968e]" strokeWidth={2} />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Closing band: the line on the left; on the right, one hand offers an olive branch and the other reaches in for it */}
      <section className="overflow-hidden bg-[#5a6b2e] text-white">
        <div className={cn(wrap, "flex flex-col gap-8 py-20 md:flex-row md:items-center md:justify-between")}>
          <div>
            <h2 className={h2}>{cta.title}</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/85">{cta.body}</p>
          </div>
          <div className="flex shrink-0 items-center self-end md:self-center">
            <SlideInHand hand="receiving" from="left" className="w-[150px] md:w-[280px]" />
            <SlideInHand hand="offering" from="right" className="-ml-[6%] w-[160px] md:w-[320px]" />
          </div>
        </div>
      </section>
    </>
  );
}
