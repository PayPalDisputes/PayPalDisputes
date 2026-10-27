/**
 * Sira's plans for the pricing page (Mercury-style: three plans, monthly or annual billing).
 * Every plan gets every feature; plans differ only by how many disputes Sira handles a month.
 * Sira is free during the beta, so these are the planned prices after launch.
 */

export type PlanId = "starter" | "growth" | "scale";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  /** Per month, billed monthly. */
  monthly: number;
  /** Per month, billed annually. */
  annual: number;
  disputes: string;
  includesLabel: string;
  features: string[];
  cta: { label: string; href: string };
};

export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For a single store getting its first disputes under control.",
    monthly: 0,
    annual: 0,
    disputes: "Up to 10 disputes a month",
    includesLabel: "Includes",
    features: [
      "Sira investigates every dispute",
      "Fight, refund or settle advice",
      "Drafted replies and evidence PDF",
      "Nothing sent until you approve",
      "Ask Sira about any dispute",
    ],
    cta: { label: "Log in with PayPal", href: "/signin" },
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "For stores that see disputes every week.",
    monthly: 19,
    annual: 15,
    disputes: "Up to 100 disputes a month",
    includesLabel: "Everything in Starter, plus",
    features: ["Auto-refund rule for small claims", "Tracking uploaded to PayPal for you", "Insights and prevention tips", "CSV import and export"],
    cta: { label: "Log in with PayPal", href: "/signin" },
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "For busy stores where disputes are a daily job.",
    monthly: 59,
    annual: 49,
    disputes: "Unlimited disputes",
    includesLabel: "Everything in Growth, plus",
    features: ["No monthly dispute limit", "Priority email support", "Help setting up your policies"],
    cta: { label: "Log in with PayPal", href: "/signin" },
  },
];

/** Comparison table: text in every cell (no tick marks), grouped like Mercury's. */
export const comparison: { section: string; rows: { label: string; values: [string, string, string] }[] }[] = [
  {
    section: "Volume",
    rows: [
      { label: "Disputes Sira handles each month", values: ["10", "100", "Unlimited"] },
      { label: "Cut of money you win back", values: ["None", "None", "None"] },
    ],
  },
  {
    section: "Investigation",
    rows: [
      { label: "Checks orders, tracking, refunds and Seller Protection", values: ["Included", "Included", "Included"] },
      { label: "Buyer history and repeat-dispute warnings", values: ["Included", "Included", "Included"] },
      { label: "Fight, refund or settle advice with reasons", values: ["Included", "Included", "Included"] },
    ],
  },
  {
    section: "Responding",
    rows: [
      { label: "Drafted replies, offers and evidence notes", values: ["Included", "Included", "Included"] },
      { label: "Evidence pack (PDF) attached to PayPal", values: ["Included", "Included", "Included"] },
      { label: "Review drafts one by one, then approve", values: ["Included", "Included", "Included"] },
      { label: "Ask Sira about a dispute", values: ["Included", "Included", "Included"] },
      { label: "Auto-refund rule for small claims", values: ["—", "Included", "Included"] },
      { label: "Tracking uploaded to PayPal", values: ["—", "Included", "Included"] },
    ],
  },
  {
    section: "Insights",
    rows: [
      { label: "Time and money saved", values: ["Included", "Included", "Included"] },
      { label: "Prevention tips and product breakdown", values: ["—", "Included", "Included"] },
      { label: "CSV import and export", values: ["—", "Included", "Included"] },
    ],
  },
  {
    section: "Support",
    rows: [
      { label: "Email support", values: ["Within 2 days", "Within 1 day", "Priority"] },
      { label: "Help setting up your policies", values: ["—", "—", "Included"] },
    ],
  },
];

export const pricingFaq: { q: string; a: string }[] = [
  {
    q: "Is Sira free right now?",
    a: "Yes. Sira is in beta and every feature is free while it is. The prices on this page are what we plan to charge after launch, and we'll tell you well before anything changes.",
  },
  {
    q: "Do you take a cut of the money I win back?",
    a: "No. Some dispute services charge around 25% of every dispute they win for you. Sira is a flat monthly price, so a big win costs you nothing extra, and Sira has no reason to fight a dispute that isn't worth fighting.",
  },
  {
    q: "Does Sira send anything to PayPal without me?",
    a: "No. Every reply, offer, refund and evidence submission waits for you to approve it. The only exception is the auto-refund rule, which is off until you turn it on and only covers claims under the limit you set.",
  },
  {
    q: "What counts as a dispute?",
    a: "One PayPal dispute that Sira investigates and drafts a response for, from the first message to the final outcome. If the buyer replies or escalates, Sira re-checks it at no extra cost.",
  },
  {
    q: "What happens if I go over my plan's limit?",
    a: "Sira keeps working on the disputes you already have open. New ones still sync from PayPal so you can see them, and we'll suggest moving up a plan rather than cutting you off mid-dispute.",
  },
  {
    q: "What do I need to get started?",
    a: "A PayPal business account. You sign in with Log in with PayPal, Sira reads your disputes and orders, and you can try everything first in the demo without connecting anything.",
  },
];
