/** Landing page copy. Edit text here rather than inside the page. Keep the numbers true (see `hero.stats` in home.ts). */
import { hero as home } from "@/data/home";

export const landing = {
  hero: {
    title: ["Your disputes,", "settled."],
    body: "An AI dispute desk for PayPal sellers. It reads every case, recommends what to do, and drafts the response for you to approve.",
    primary: { label: "Open dashboard", href: "/dashboard" },
    secondary: { label: "View pricing", href: "/pricing" },
  },

  /** The ticker under the product stage: kinds of work Sira does on a case (illustrative, not live counts). */
  activity: {
    label: "How a case moves",
    items: [
      { action: "Synced", detail: "New claim from PayPal" },
      { action: "Flagged", detail: "Chargeback, 3 days left" },
      { action: "Matched", detail: "USPS tracking to order" },
      { action: "Checked", detail: "Seller Protection" },
      { action: "Spotted", detail: "Missing delivery signature" },
      { action: "Drafted", detail: "Evidence note" },
      { action: "Suggested", detail: "Partial refund offer" },
      { action: "Waiting", detail: "Your approval" },
      { action: "Sent", detail: "Response to PayPal" },
      { action: "Tracked", detail: "Case outcome" },
    ],
  },

  /** Every reason code PayPal uses. Shown as the proof strip under the hero. */
  reasons: {
    label: "Covers all ten PayPal dispute reasons",
    items: [
      "Item not received",
      "Not as described",
      "Unauthorized",
      "Duplicate transaction",
      "Credit not processed",
      "Incorrect amount",
      "Paid by other means",
      "Canceled recurring billing",
      "Problem with remittance",
      "Other",
    ],
  },

  /** What it does, one card each. */
  jobs: [
    {
      icon: "scale",
      title: "Decide every case",
      body: "Fight, refund or settle, with the reasoning and the Seller Protection check behind each call.",
      href: "/disputes",
    },
    {
      icon: "pen",
      title: "Draft the response",
      body: "Evidence notes, buyer messages and offers written from your order data, ready to edit.",
      href: "/disputes",
    },
    {
      icon: "timer",
      title: "Stay ahead of deadlines",
      body: "Cases sorted by PayPal's response date, with chargebacks and claims flagged first.",
      href: "/dashboard",
    },
  ] as const,

  numbers: {
    title: "Measured, not promised.",
    body: "Every prompt change is scored against the same set of real dispute scenarios.",
    stats: home.stats.map((s) => ({ value: `${s.prefix}${s.value}${s.suffix}`, label: s.label })),
    note: "Time and accuracy measured on our 14-case evaluation set (prompt v5).",
  },

  how: {
    lead: "Sira",
    title: "drafts every response. You decide what gets sent.",
    cta: { label: "Open dashboard", href: "/dashboard" },
    steps: [
      {
        id: "read",
        title: "Reads every case",
        body: "New disputes sync from PayPal every fifteen minutes, with the full claim and message history, sorted by deadline.",
      },
      {
        id: "check",
        title: "Checks the evidence",
        body: "Tracking, delivery and ship-to address are matched against the claim. Missing proof is called out before you respond.",
      },
      {
        id: "draft",
        title: "Drafts the response",
        body: "A recommendation with plain-language reasons, plus the evidence note, buyer message or partial refund offer.",
      },
      {
        id: "approve",
        title: "Waits for your approval",
        body: "Nothing reaches PayPal until you approve it. Edit or reject any draft; the outcome is tracked either way.",
      },
    ],
  },

  rules: {
    title: "Clear about what it will and won't do.",
    body: "Deadlines and Seller Protection come from rules, not guesses. The model reads and writes; a person decides.",
    columns: [
      {
        label: "Good at",
        items: ["Reading long buyer threads", "Matching tracking to the order", "Spotting missing proof", "Drafting a clear, polite reply"],
      },
      {
        label: "Never does",
        items: ["Send without your approval", "Guess a deadline", "Invent evidence", "Refund on its own"],
      },
    ],
  },

  cta: {
    title: "Start with your open disputes.",
    body: "Try it in demo mode without touching PayPal, or connect a sandbox account.",
    primary: { label: "Open dashboard", href: "/dashboard" },
    secondary: { label: "Sign in", href: "/signin" },
  },
};
