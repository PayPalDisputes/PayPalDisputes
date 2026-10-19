/**
 * Pricing plans and comparison table.
 * PLACEHOLDER PRICES: nothing here has been decided; replace before launch.
 */

export type Plan = {
  id: string;
  name: string;
  description: string;
  monthly: number | null; // null = custom
  yearly: number | null; // per month, billed annually
  cta: { label: string; href: string };
  highlighted?: boolean;
  includesLabel: string;
  features: string[];
};

export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For a single store getting its first disputes under control.",
    monthly: 0,
    yearly: 0,
    cta: { label: "Start free", href: "/dashboard" },
    includesLabel: "What's included",
    features: ["1 PayPal seller account", "25 assessments / month", "Evidence and message drafts", "Demo mode", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    description: "For growing stores that see disputes every week.",
    monthly: 49,
    yearly: 39,
    cta: { label: "Start 14-day trial", href: "/dashboard" },
    highlighted: true,
    includesLabel: "Everything in Starter, plus",
    features: ["Up to 5 seller accounts", "500 assessments / month", "Settlement offer drafts", "Webhooks and API access", "Team approvals"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For marketplaces and agencies running many storefronts.",
    monthly: null,
    yearly: null,
    cta: { label: "Talk to us", href: "#" },
    includesLabel: "Everything in Growth, plus",
    features: ["Unlimited seller accounts", "Custom assessment volume", "Custom evidence rules", "SSO and audit log", "Dedicated support"],
  },
];

export type Cell = boolean | string;
export const comparison: { section: string; rows: { label: string; values: [Cell, Cell, Cell] }[] }[] = [
  {
    section: "Usage",
    rows: [
      { label: "Seller accounts", values: ["1", "5", "Unlimited"] },
      { label: "Assessments per month", values: ["25", "500", "Custom"] },
      { label: "Team members", values: ["1", "10", "Unlimited"] },
    ],
  },
  {
    section: "Agent",
    rows: [
      { label: "Fight / refund / settle recommendation", values: [true, true, true] },
      { label: "Seller Protection check", values: [true, true, true] },
      { label: "Evidence and message drafts", values: [true, true, true] },
      { label: "Settlement offer drafts", values: [false, true, true] },
      { label: "Custom evidence rules", values: [false, false, true] },
    ],
  },
  {
    section: "Platform",
    rows: [
      { label: "Demo mode", values: [true, true, true] },
      { label: "Webhooks", values: [false, true, true] },
      { label: "REST API and SDKs", values: [false, true, true] },
      { label: "SSO and audit log", values: [false, false, true] },
    ],
  },
];

export const pricingFaq = [
  {
    q: "Does Sira send anything to PayPal without me?",
    a: "No. Every response, refund and offer waits for a person to approve it. Demo mode lets you try the whole flow without contacting PayPal at all.",
  },
  {
    q: "What counts as an assessment?",
    a: "One run of the agent on one dispute: the decision, its reasoning and the drafts. Re-running a case after new evidence arrives counts again.",
  },
  {
    q: "Which dispute types are supported?",
    a: "All ten PayPal dispute reasons, from item not received to canceled subscriptions, across inquiry, claim, chargeback and arbitration stages.",
  },
];
