import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronRight, PenLine, Scale, Timer, X } from "lucide-react";
import { ActivityTicker } from "@/components/landing/ActivityTicker";
import { BandDots } from "@/components/landing/BandDots";
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
const wrap = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const h2 = "text-[clamp(1.75rem,3.2vw,2.5rem)] leading-[1.1] tracking-[-0.03em]";
const card = "rounded-2xl border border-[#141312]/[0.08] bg-white";

function PrimaryButton({ href, children, inverted }: { href: string; children: React.ReactNode; inverted?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-full pr-4 pl-5 text-[14.5px]",
        inverted ? "bg-white text-[#141312] hover:bg-[#ecebe7]" : "bg-[#141312] text-white hover:bg-[#34312e]",
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
        "inline-flex h-11 items-center rounded-full px-5 text-[14.5px]",
        inverted ? "bg-white/10 text-white hover:bg-white/15" : "border border-[#141312]/[0.12] hover:bg-[#f7f7f5]",
      )}
    >
      {children}
    </Link>
  );
}

export default function LandingPage() {
  const { hero, activity, reasons, jobs, numbers, how, rules, cta } = landing;

  return (
    <>
      {/* Hero: white copy on PayPal blue, over a field of soft white spring dots */}
      <section className="relative isolate overflow-hidden bg-[#0062CC] text-white">
        <SpringDots color="255, 255, 255" opacity={0.5} className="-z-10" />
        {/* A faint top-to-bottom shade so the dots sit back from the type */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,48,135,0)_0%,rgba(0,48,135,0.28)_100%)]" />
        <div className={cn(wrap, "pt-20 pb-20 md:pt-32 md:pb-28")}>
          <div className="max-w-[40rem]">
            <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-white/70 uppercase">
              {hero.stat.label}
              <span className="rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 text-[12px] tracking-normal text-white normal-case tabular-nums">
                {hero.stat.value}
              </span>
            </p>
            <h1 className="mt-6 text-[clamp(2.75rem,6.4vw,5.25rem)] leading-[1.0] font-normal tracking-[-0.045em]">
              {hero.title.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </h1>
            <p className="mt-6 max-w-lg text-[18px] leading-relaxed text-white/80">{hero.body}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <PrimaryButton href={hero.primary.href} inverted>
                {hero.primary.label}
              </PrimaryButton>
              <SecondaryButton href={hero.secondary.href} inverted>
                {hero.secondary.label}
              </SecondaryButton>
            </div>
            {/* Where the data comes from. Text only: Sira isn't affiliated with PayPal (see the footer). */}
            <p className="mt-10 flex max-w-md items-center gap-3 border-t border-white/20 pt-5">
              <span className="font-mono text-[10.5px] tracking-[0.12em] text-white/60 uppercase">{hero.builtOn.label}</span>
              <span className="text-[15px] tracking-[-0.01em]">
                <span className="font-semibold text-white">{hero.builtOn.name}</span>{" "}
                <span className="text-white/75">{hero.builtOn.product}</span>
              </span>
            </p>
          </div>
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
            <li key={r} className="rounded-full border border-[#141312]/[0.08] px-3 py-1.5 text-[13px] text-[#55524d]">
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

      {/* Numbers band */}
      <section className="relative isolate bg-[#f7f7f5] py-24">
        <BandDots className="-z-10" />
        <div className={cn(wrap, "text-center")}>
          <h2 className={h2}>{numbers.title}</h2>
          <p className="mt-3 text-[15px] text-[#77736c]">{numbers.body}</p>
          <dl className="mx-auto mt-14 grid max-w-3xl sm:grid-cols-3 sm:divide-x sm:divide-[#141312]/[0.08]">
            {numbers.stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse gap-2 px-6 py-5 sm:py-0">
                <dt className="font-mono text-[10.5px] tracking-[0.12em] text-[#77736c] uppercase">{s.label}</dt>
                <dd className="text-[clamp(2.25rem,4vw,3rem)] leading-none tracking-[-0.04em] tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-12 text-[12px] text-[#9a968e]">{numbers.note}</p>
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

      {/* Closing band */}
      <section className="bg-[#141312] text-white">
        <div className={cn(wrap, "flex flex-col gap-8 py-20 md:flex-row md:items-end md:justify-between")}>
          <div>
            <h2 className={h2}>{cta.title}</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/60">{cta.body}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton href={cta.primary.href} inverted>
              {cta.primary.label}
            </PrimaryButton>
            <SecondaryButton href={cta.secondary.href} inverted>
              {cta.secondary.label}
            </SecondaryButton>
          </div>
        </div>
      </section>
    </>
  );
}
