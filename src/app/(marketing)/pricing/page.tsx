import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { Faq } from "@/components/sections/Faq";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { ComparisonTable, PricingSection } from "@/components/sections/Pricing";
import { pricingFaq } from "@/data/pricing";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: `Pricing · ${site.name}`,
  description: `Plans for ${site.name}, from a single store to marketplaces running many PayPal seller accounts.`,
};

export default function PricingPage() {
  return (
    <>
      <PricingSection headingLevel="h1" />
      <Section innerClassName="px-4 py-20 sm:px-6 md:px-10 md:py-24">
        <Reveal>
          <SectionHeading title="Compare plans" align="left" className="mb-10" />
        </Reveal>
        <ComparisonTable />
      </Section>
      <Faq title="Questions" body="Anything else? Get in touch and we'll answer within a day." items={pricingFaq} />
      <FinalCTA />
    </>
  );
}
