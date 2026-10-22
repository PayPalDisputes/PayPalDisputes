/** Landing page copy. Edit text here rather than inside the page. Keep the numbers true (see `hero.stats` in home.ts). */
import { hero as home } from "@/data/home";

export const landing = {
  hero: {
    title: ["Your disputes,", "settled."],
    body: "An AI dispute desk for PayPal sellers. It reads every case, recommends what to do, and drafts the response for you to approve.",
    primary: { label: "Open dashboard", href: "/dashboard" },
    secondary: { label: "View pricing", href: "/pricing" },
    /** The figure that scrambles into place above the headline. From the eval set; see numbers.note. */
    stat: { label: "Average decision time on our eval set", value: home.stats[0].value + home.stats[0].suffix },
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
    /** The scroll-through walkthrough: one example dispute, seven steps. Each id has a scene in ProcessScenes. */
    steps: [
      {
        id: "sync",
        meta: "PayPal webhook, plus a sync every 15 minutes",
        title: "A new dispute arrives",
        body: "PayPal tells Sira the moment a case opens, and a regular sync catches anything missed. The case joins your queue, sorted by whichever deadline comes first.",
      },
      {
        id: "read",
        meta: "Claim, reason code, every message",
        title: "It reads the whole case",
        body: "The claim and the full message thread are read end to end, and the facts that matter are pulled out: what the buyer says, what they want, and when you have to answer.",
      },
      {
        id: "evidence",
        meta: "Order, carrier, tracking, address",
        title: "It matches your evidence",
        body: "Tracking is matched to the order and carrier, the delivery address is checked against the PayPal transaction, and anything missing is flagged before you respond.",
      },
      {
        id: "protection",
        meta: "Rules, not guesses",
        title: "It checks Seller Protection",
        body: "Eligibility is worked out in code from PayPal's rules, including the signature requirement on orders of $750 and up, so the model never has to guess.",
      },
      {
        id: "decide",
        meta: "Fight, settle or refund",
        title: "It weighs the options",
        body: "Fighting, offering a partial refund and refunding in full are compared against the evidence, and the recommendation comes with reasons in plain language.",
      },
      {
        id: "draft",
        meta: "Written from your order data",
        title: "It drafts the response",
        body: "The note to PayPal is written from the facts it found, with the tracking history and invoice attached. You can edit any of it.",
      },
      {
        id: "approve",
        meta: "Your approval, then the outcome",
        title: "You approve. It's sent and tracked.",
        body: "Nothing reaches PayPal until you approve it. Once it's sent, Sira follows the case through PayPal's review to the outcome.",
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
