import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Eyebrow, Section } from "../layout/Container";
import { Reveal } from "../motion/Reveal";
import { ArrowLink } from "../ui/Button";
import { VisualFrame } from "../product/Cards";

type Props = {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets?: readonly string[];
  visual: React.ReactNode;
  /** "text-left" puts copy on the left and the visual on the right. */
  orientation?: "text-left" | "text-right";
  cta?: { label: string; href: string };
};

/** Two-column feature band: copy on one side, a product visual on the other, split by a rule. */
export function FeatureSection({ id, eyebrow, title, description, bullets, visual, orientation = "text-left", cta }: Props) {
  const textRight = orientation === "text-right";
  return (
    <Section id={id} innerClassName="grid lg:grid-cols-2">
      <div
        className={cn(
          "flex flex-col justify-center px-5 py-16 md:px-10 md:py-20 lg:px-14 lg:py-28",
          textRight && "lg:order-2 lg:border-l lg:border-line",
        )}
      >
        <Reveal>
          <Eyebrow className="mb-5">{eyebrow}</Eyebrow>
          <h2 className="t-h2 max-w-[460px]">{title}</h2>
          <p className="t-body-lg mt-5 max-w-[460px]">{description}</p>
        </Reveal>
        {bullets && (
          <ul className="mt-8 max-w-[460px] divide-y divide-line border-y border-line">
            {bullets.map((b, i) => (
              <Reveal as="li" key={b} delay={80 + i * 70} className="flex items-start gap-3 py-3 text-[14.5px] leading-[22px] text-fg-heading">
                <Check aria-hidden strokeWidth={1.75} className="mt-[3px] size-4 shrink-0 text-fg-muted" />
                {b}
              </Reveal>
            ))}
          </ul>
        )}
        {cta && (
          <div className="mt-8">
            <ArrowLink href={cta.href}>{cta.label}</ArrowLink>
          </div>
        )}
      </div>
      <div className={cn("px-3 pb-3 sm:px-5 sm:pb-5 lg:p-5", !textRight && "lg:border-l lg:border-line")}>
        <Reveal delay={120} className="h-full">
          <VisualFrame className="h-full">{visual}</VisualFrame>
        </Reveal>
      </div>
    </Section>
  );
}
