import type { Metadata } from "next";
import Link from "next/link";
import { PixelField } from "@/components/landing/PixelField";
import { PixelFlow } from "@/components/landing/PixelFlow";
import { PixelMarquee } from "@/components/landing/PixelMarquee";
import { landing } from "@/data/landing";
import { site } from "@/data/site";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: `${site.name}: ${site.tagline}`,
  description: site.description,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** One side margin for every section, so all text shares the same left edge. */
const gutter = "px-5 sm:px-8 md:px-12";
const h2 = "text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.04] tracking-[-0.035em]";

/** Mono caps label used above headings and on numbered items. */
function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[11px] tracking-[0.16em] text-[#8a867f] uppercase", className)}>{children}</p>;
}

/** The faint grid that the dot canvases sit on. It fades out at the edges, so it never runs behind text. */
function DotStage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div aria-hidden className="dot-grid absolute inset-0" />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Numbered columns: the one list pattern used across the page. */
function Columns({ items, className }: { items: { title: string; body: string; code?: string }[]; className?: string }) {
  return (
    <ol className={cn("grid gap-x-10 gap-y-12", className)}>
      {items.map((s, i) => (
        <li key={s.title} className="border-t border-[#141312]/12 pt-5">
          <Eyebrow>{s.code ?? pad(i + 1)}</Eyebrow>
          <h3 className="mt-5 text-[22px] tracking-[-0.02em]">{s.title}</h3>
          <p className="mt-2 max-w-xs text-[14.5px] leading-relaxed text-[#6c6862]">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

export default function LandingPage() {
  const { hero, intro, stats, statsNote, editorial, process, stages, cta } = landing;

  return (
    <>
      {/* Hero */}
      <section className={cn(gutter, "grid gap-10 pt-16 pb-10 md:grid-cols-[1fr_20rem] md:items-end md:gap-16 md:pt-28 md:pb-14")}>
        <h1 className="text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.92] font-normal tracking-[-0.045em] uppercase">
          {hero.title.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </h1>
        <div className="flex flex-col gap-5 md:pb-2">
          <Eyebrow className="text-[#141312]">{hero.kicker.join(" ")}</Eyebrow>
          <p className="text-[15px] leading-relaxed text-[#6c6862]">{hero.body}</p>
        </div>
      </section>

      <DotStage>
        <PixelField className="h-[280px] md:h-[400px]" />
      </DotStage>

      {/* Intro statement */}
      <section className={cn(gutter, "py-28 md:py-40")}>
        <p className="mx-auto max-w-4xl text-center text-[clamp(1.75rem,3.8vw,3rem)] leading-[1.1] tracking-[-0.03em]">
          {intro}
        </p>
      </section>

      {/* Numbers */}
      <section className={cn(gutter, "pb-28 md:pb-40")}>
        <dl className="mx-auto grid max-w-4xl gap-12 text-center sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse gap-3">
              <dt className="mx-auto max-w-[14rem] text-[14px] text-[#6c6862]">{s.label}</dt>
              <dd className="text-[clamp(3rem,6vw,4.25rem)] leading-none tracking-[-0.04em] tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-12 text-center font-mono text-[10.5px] tracking-[0.1em] text-[#a9a59c] uppercase">{statsNote}</p>
      </section>

      {/* Editorial sections */}
      {editorial.map((e) => (
        <section key={e.id} id={e.id} className={cn(gutter, "py-20 md:py-28")}>
          <div className="grid gap-8 md:grid-cols-2 md:gap-16">
            <div>
              <Eyebrow>{e.eyebrow}</Eyebrow>
              <h2 className={cn(h2, "mt-4 max-w-md")}>{e.title}</h2>
            </div>
            <div className="flex max-w-xl flex-col gap-5 text-[16.5px] leading-[1.65] text-[#34312e]">
              {e.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {e.columns && (
                <div className="mt-8 grid grid-cols-2 gap-8">
                  {e.columns.map((c) => (
                    <div key={c.label} className="border-t border-[#141312]/12 pt-5">
                      <Eyebrow>{c.label}</Eyebrow>
                      <ul className="mt-4 space-y-2.5 text-[14.5px] text-[#34312e]">
                        {c.items.map((it) => (
                          <li key={it}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      ))}

      {/* Process */}
      <section id={process.id} className="pt-20 pb-24 md:pt-28 md:pb-32">
        <div className={cn(gutter, "text-center")}>
          <Eyebrow>{process.eyebrow}</Eyebrow>
          <h2 className={cn(h2, "mt-4")}>{process.title}</h2>
        </div>
        <DotStage className="mt-12">
          <PixelFlow className="h-[216px]" />
        </DotStage>
        <div className={cn(gutter, "mt-12")}>
          <Columns items={process.steps} className="sm:grid-cols-2 lg:grid-cols-4" />
        </div>
      </section>

      {/* Stages */}
      <section id={stages.id} className={cn(gutter, "py-20 md:py-28")}>
        <div className="grid gap-8 md:grid-cols-2 md:gap-16">
          <div>
            <Eyebrow>{stages.eyebrow}</Eyebrow>
            <h2 className={cn(h2, "mt-4 max-w-md")}>{stages.title}</h2>
          </div>
          <Columns items={stages.items} className="gap-y-10" />
        </div>
      </section>

      {/* CTA */}
      <section className="pt-20 pb-28 md:pt-28 md:pb-36">
        <DotStage>
          <PixelMarquee text={cta.marquee} className="h-[180px]" />
        </DotStage>
        <div className={cn(gutter, "mt-12 flex flex-col items-center text-center")}>
          <h2 className={h2}>{cta.title}</h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#6c6862]">{cta.body}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 font-mono text-[12px] tracking-[0.14em] uppercase">
            <Link href={cta.primary.href} className="bg-[#141312] px-5 py-3 text-white hover:bg-[#34312e]">
              {cta.primary.label}
            </Link>
            <Link href={cta.secondary.href} className="px-5 py-3 text-[#6c6862] hover:text-[#141312]">
              {cta.secondary.label}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
