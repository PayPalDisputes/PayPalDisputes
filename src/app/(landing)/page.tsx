import type { Metadata } from "next";
import Link from "next/link";
import { PixelField } from "@/components/landing/PixelField";
import { PixelFlow } from "@/components/landing/PixelFlow";
import { PixelMarquee } from "@/components/landing/PixelMarquee";
import { landing } from "@/data/landing";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: `${site.name}: ${site.tagline}`,
  description: site.description,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Mono caps label used above headings and on numbered items. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] tracking-[0.16em] text-[#6c6862] uppercase">{children}</p>;
}

/** Caps spread across the full width of their box, as on a title page. */
function Spread({ lines }: { lines: string[] }) {
  return (
    <div className="font-mono text-[12px] leading-[1.9] tracking-[0.2em] uppercase">
      {lines.map((l) => (
        <span key={l} className="flex justify-between">
          {l.split(" ").map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </span>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const { hero, intro, stats, statsNote, editorial, process, evidence, stages, cta } = landing;

  return (
    <>
      {/* Hero */}
      <section className="grid gap-10 px-4 pt-10 pb-12 sm:px-6 md:grid-cols-[1fr_minmax(0,22rem)] md:gap-16 md:pt-20 md:pb-16">
        <h1 className="text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.92] font-normal tracking-[-0.045em] uppercase">
          {hero.title.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </h1>
        <div className="flex flex-col gap-6 md:border-l md:border-[#141312]/15 md:pl-8">
          <Spread lines={hero.kicker} />
          <div aria-hidden className="grid w-fit grid-cols-3 gap-px">
            {[1, 0, 1, 0, 1, 0, 1, 1, 1].map((on, i) => (
              <span key={i} className={on ? "size-[7px] bg-[#141312]" : "size-[7px]"} />
            ))}
          </div>
          <p className="text-[15px] leading-relaxed text-[#34312e] md:text-right">{hero.body}</p>
        </div>
      </section>

      <PixelField className="h-[300px] md:h-[420px]" />

      {/* Intro statement */}
      <section className="px-4 py-24 sm:px-6 md:py-36">
        <p className="mx-auto max-w-5xl text-center text-[clamp(1.75rem,4vw,3.25rem)] leading-[1.08] tracking-[-0.03em]">
          {intro}
        </p>
      </section>

      {/* Numbers */}
      <section className="px-4 pb-24 sm:px-6 md:pb-36">
        <div className="mx-auto grid max-w-5xl gap-px border border-[#141312]/15 bg-[#141312]/15 sm:grid-cols-3">
          {stats.map((s, i) => (
            <div key={s.label} className="flex flex-col justify-between gap-12 bg-[#f3f2ee] p-6">
              <Eyebrow>{pad(i + 1)}</Eyebrow>
              <div>
                <p className="text-[clamp(3rem,6vw,4.5rem)] leading-none tracking-[-0.04em] tabular-nums">{s.value}</p>
                <p className="mt-3 text-[14px] text-[#6c6862]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-4 max-w-5xl text-center font-mono text-[11px] tracking-[0.08em] text-[#a9a59c] uppercase">
          {statsNote}
        </p>
      </section>

      {/* Editorial sections */}
      {editorial.map((e) => (
        <section key={e.id} id={e.id} className="border-t border-[#141312]/15 px-4 py-20 sm:px-6 md:py-28">
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <Eyebrow>{e.eyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-md text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.02] tracking-[-0.035em]">
                {e.title}
              </h2>
            </div>
            <div className="flex max-w-xl flex-col gap-5 text-[16.5px] leading-[1.6] text-[#34312e]">
              {e.body.map((p) => (
                <p key={p} className="text-justify hyphens-auto">
                  {p}
                </p>
              ))}
              {e.columns && (
                <div className="mt-6 grid grid-cols-2 gap-8 border-t border-[#141312]/15 pt-6">
                  {e.columns.map((c) => (
                    <div key={c.label}>
                      <Eyebrow>{c.label}</Eyebrow>
                      <ul className="mt-3 space-y-2 text-[14px]">
                        {c.items.map((it) => (
                          <li key={it} className="flex gap-2.5">
                            <span aria-hidden className="mt-[7px] size-[5px] shrink-0 bg-[#141312]" />
                            {it}
                          </li>
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
      <section id={process.id} className="border-t border-[#141312]/15 py-20 md:py-28">
        <div className="px-4 text-center sm:px-6">
          <Eyebrow>{process.eyebrow}</Eyebrow>
          <h2 className="mt-4 text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.02] tracking-[-0.035em]">{process.title}</h2>
        </div>
        <PixelFlow className="mt-14 h-[216px]" />
        <ol className="mt-14 grid gap-px border-y border-[#141312]/15 bg-[#141312]/15 sm:grid-cols-2 lg:grid-cols-4">
          {process.steps.map((s, i) => (
            <li key={s.title} className="bg-[#f3f2ee] px-4 py-6 sm:px-6">
              <Eyebrow>{pad(i + 1)}</Eyebrow>
              <h3 className="mt-6 text-[22px] tracking-[-0.02em]">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6c6862]">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Evidence */}
      <section id={evidence.id} className="border-t border-[#141312]/15 px-4 py-20 sm:px-6 md:py-28">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <Eyebrow>{evidence.eyebrow}</Eyebrow>
            <h2 className="mt-4 max-w-md text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.02] tracking-[-0.035em]">
              {evidence.title}
            </h2>
            <p className="mt-6 max-w-md text-[16.5px] leading-[1.6] text-[#34312e]">{evidence.body}</p>
          </div>
          <dl className="divide-y divide-[#141312]/15 border-y border-[#141312]/15">
            {evidence.parts.map((p, i) => (
              <div key={p.label} className="grid grid-cols-[3rem_8rem_1fr] items-baseline gap-2 py-4 max-sm:grid-cols-[2.5rem_1fr]">
                <span className="font-mono text-[11px] tracking-[0.16em] text-[#a9a59c]">{pad(i + 1)}</span>
                <dt className="font-mono text-[12px] tracking-[0.16em] uppercase">{p.label}</dt>
                <dd className="text-[15px] text-[#34312e] max-sm:col-start-2">{p.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Stages */}
      <section id={stages.id} className="border-t border-[#141312]/15 px-4 py-20 sm:px-6 md:py-28">
        <div className="text-center">
          <Eyebrow>{stages.eyebrow}</Eyebrow>
          <h2 className="mt-4 text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.02] tracking-[-0.035em]">{stages.title}</h2>
        </div>
        <div className="mx-auto mt-14 grid max-w-6xl gap-px border border-[#141312]/15 bg-[#141312]/15 md:grid-cols-3">
          {stages.items.map((s, i) => (
            <article key={s.code} className="flex flex-col bg-[#f3f2ee] p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] tracking-[0.16em]">{s.code}</span>
                {/* Filled squares show how far the dispute has escalated. */}
                <span aria-hidden className="flex gap-[3px]">
                  {stages.items.map((_, j) => (
                    <span key={j} className={j <= i ? "size-2 bg-[#141312]" : "size-2 bg-[#d9d6cf]"} />
                  ))}
                </span>
              </div>
              <h3 className="mt-16 text-[28px] tracking-[-0.03em]">{s.title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#6c6862]">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#141312]/15 pt-20 pb-24 md:pt-28 md:pb-32">
        <PixelMarquee text={cta.marquee} className="h-[156px]" />
        <div className="mt-14 flex flex-col items-center px-4 text-center sm:px-6">
          <h2 className="text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.02] tracking-[-0.035em]">{cta.title}</h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#6c6862]">{cta.body}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 font-mono text-[12px] tracking-[0.14em] uppercase">
            <Link href={cta.primary.href} className="bg-[#141312] px-5 py-3 text-white hover:bg-[#34312e]">
              {cta.primary.label}
            </Link>
            <Link href={cta.secondary.href} className="border border-[#141312] px-5 py-3 hover:bg-[#141312] hover:text-white">
              {cta.secondary.label}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
