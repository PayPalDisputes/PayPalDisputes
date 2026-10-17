import { finalCta } from "@/data/home";
import { Section } from "../layout/Container";
import { Reveal } from "../motion/Reveal";
import { Button } from "../ui/Button";

/** Hatched closing band with a centered serif headline. */
export function FinalCTA() {
  return (
    <Section className="overflow-hidden" innerClassName="bg-hatch px-5 py-24 md:px-14 md:py-32">
      {/* soft cream wash so the copy reads cleanly over the stripes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 55% 70% at 50% 50%, var(--mk-bg-subtle) 35%, transparent 100%)" }}
      />
      <Reveal className="relative mx-auto flex max-w-[640px] flex-col items-center text-center">
        <h2 className="t-h1 whitespace-pre-line">{finalCta.title}</h2>
        <p className="t-body-lg mt-5 max-w-[460px]">{finalCta.body}</p>
        <div className="mt-9 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
          <Button href={finalCta.primary.href} size="lg" arrow>
            {finalCta.primary.label}
          </Button>
          <Button href={finalCta.secondary.href} size="lg" variant="secondary">
            {finalCta.secondary.label}
          </Button>
        </div>
      </Reveal>
    </Section>
  );
}
