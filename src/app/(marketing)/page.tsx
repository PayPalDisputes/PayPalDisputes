import type { Metadata } from "next";
import { AgentNote } from "@/components/sections/AgentNote";
import { Bento } from "@/components/sections/Bento";
import { DeveloperSection } from "@/components/sections/DeveloperSection";
import { Faq } from "@/components/sections/Faq";
import { FeatureSection } from "@/components/sections/FeatureSection";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Hero } from "@/components/sections/Hero";
import { LogoCloud } from "@/components/sections/LogoCloud";
import { PricingSection } from "@/components/sections/Pricing";
import { EvidenceCheck, OfferCalculator, SellerAccounts } from "@/components/product/Animated";
import { DecisionCard } from "@/components/product/Cards";
import { faq, features } from "@/data/home";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: `${site.name}: ${site.tagline}`,
  description: site.description,
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <FeatureSection {...features.assessment} visual={<DecisionCard />} orientation="text-left" />
      <FeatureSection {...features.evidence} visual={<EvidenceCheck />} orientation="text-right" />
      <AgentNote />
      <FeatureSection {...features.settle} visual={<OfferCalculator />} orientation="text-left" />
      <FeatureSection {...features.sellers} visual={<SellerAccounts />} orientation="text-right" />
      <Bento />
      <DeveloperSection />
      <PricingSection />
      <Faq title={faq.title} body={faq.body} items={faq.items} />
      <FinalCTA />
    </>
  );
}
