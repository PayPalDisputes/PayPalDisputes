import { hero } from "@/data/home";
import { Section } from "../layout/Container";
import { Button } from "../ui/Button";
import { GridBackground } from "../ui/GridBackground";
import { RollingNumber } from "../motion/RollingNumber";
import { HeroAmount } from "./HeroAmount";
import { HeroShowcase } from "./HeroShowcase";

export function Hero() {
  return (
    <>
      <Section rule={false} className="-mt-[68px] overflow-hidden" innerClassName="px-5 pt-36 pb-20 md:px-10 md:pt-44 md:pb-24">
        <GridBackground />
        <div className="relative mx-auto max-w-[960px] text-center">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-line bg-canvas/80 py-1 pr-3 pl-1.5 text-[12.5px] text-fg-body shadow-[0_1px_1px_rgba(28,25,20,0.04)]">
            <span className="rounded-full bg-fg px-2 py-0.5 text-[11px] font-medium text-white">Beta</span>
            {hero.eyebrow}
          </p>
          <h1 className="t-display animate-fade-up mx-auto mt-6 max-w-[820px]" style={{ animationDelay: "60ms" }}>
            <Emphasized text={hero.title} word={hero.emphasis} />
          </h1>
          <HeroStats />
          <div
            className="animate-fade-up mt-9 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center"
            style={{ animationDelay: "180ms" }}
          >
            <Button href={hero.primary.href} size="lg" arrow>
              {hero.primary.label}
            </Button>
            <Button href={hero.secondary.href} size="lg" variant="secondary">
              {hero.secondary.label}
            </Button>
          </div>
        </div>
      </Section>
      <HeroShowcase />
    </>
  );
}

/** Renders `text` with one word in italic serif (a Brillance-style accent). */
function Emphasized({ text, word }: { text: string; word?: string }) {
  if (!word || !text.includes(word)) return <>{text}</>;
  const [before, after] = text.split(word);
  return (
    <>
      {before}
      <em className="font-serif text-fg italic">{word}</em>
      {after}
    </>
  );
}

/** Rolling numbers under the headline: a cycling example amount plus measured stats. */
function HeroStats() {
  return (
    <div className="animate-fade-up mx-auto mt-12 max-w-[920px]" style={{ animationDelay: "120ms" }}>
      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-[0_1px_2px_rgba(55,50,47,0.04)] md:flex-row">
        <div className="border-line max-md:border-b md:w-[40%] md:border-r">
          <HeroAmount />
        </div>
        <dl className="grid flex-1 grid-cols-3">
          {hero.stats.map((s, i) => (
            <div key={s.label} className={`flex flex-col items-center justify-center gap-2 border-line px-2 py-6 ${i > 0 ? "border-l" : ""}`}>
              <dt className="order-2 max-w-[150px] text-[12px] leading-[16px] text-fg-body">{s.label}</dt>
              <dd className="order-1 font-serif text-[36px] leading-none text-fg md:text-[44px]">
                <RollingNumber value={s.value} prefix={s.prefix} suffix={s.suffix} delay={700 + i * 300} stagger={220} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mx-auto mt-3 max-w-[620px] text-[11.5px] leading-4 text-fg-muted">{hero.statsNote}</p>
    </div>
  );
}

