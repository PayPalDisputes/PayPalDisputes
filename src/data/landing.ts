/** Landing page copy. Edit text here rather than inside the page. Keep the numbers true (see `hero.stats` in home.ts). */
import { hero as home } from "@/data/home";

export const landing = {
  hero: {
    title: ["Your disputes,", "settled."],
    kicker: ["An AI dispute desk", "for PayPal sellers"],
    body: "Sira reads every PayPal dispute, recommends whether to fight, refund or settle, and drafts the response. Nothing is sent until you approve it.",
  },

  intro: "Every claim read in full. Every deadline tracked. Every response checked by you before PayPal sees it.",

  stats: home.stats.map((s) => ({ value: `${s.prefix}${s.value}${s.suffix}`, label: s.label })),
  statsNote: "Time and accuracy measured on our 14-case evaluation set (prompt v5).",

  editorial: [
    {
      id: "deadlines",
      eyebrow: "The problem",
      title: "Every dispute has a deadline.",
      body: [
        "PayPal gives sellers a fixed window to respond, and the window shrinks as a case moves from inquiry to claim to chargeback. Miss it and the case closes in the buyer's favour, whatever the facts were.",
        "Most of the work is reading: the claim, the buyer's messages, the order, the tracking. Sira does that reading for every open case and sorts the queue by whichever deadline comes first.",
      ],
    },
    {
      id: "approval",
      eyebrow: "The rule",
      title: "The agent drafts. You decide.",
      body: [
        "Deadlines and Seller Protection are worked out by rules, not guessed by a model. The model reads the case and explains its recommendation in plain language, with the evidence it relied on.",
        "Nothing reaches PayPal until a person approves it. Every draft can be edited or rejected, and every assessment is versioned so you can see what changed.",
      ],
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
  ],

  process: {
    id: "process",
    eyebrow: "How it works",
    title: "Read. Check. Draft. Approve.",
    steps: [
      { title: "Read", body: "New disputes sync from PayPal every fifteen minutes, with the full claim and message history." },
      { title: "Check", body: "Tracking, delivery address and item type are checked against the claim and Seller Protection." },
      { title: "Draft", body: "A recommendation with reasons, plus the evidence note, buyer message or offer to send." },
      { title: "Approve", body: "You edit, approve or reject. Approved responses go to PayPal; the outcome is tracked." },
    ],
  },

  stages: {
    id: "stages",
    eyebrow: "Coverage",
    title: "Every stage of a dispute.",
    items: [
      {
        code: "S1",
        title: "Inquiry",
        body: "The buyer has opened a dispute but not escalated. Often resolved with a message and tracking.",
      },
      {
        code: "S2",
        title: "Claim",
        body: "Escalated to PayPal for review. Evidence matters most here, and the deadline is firm.",
      },
      {
        code: "S3",
        title: "Chargeback",
        body: "Raised through the buyer's card issuer. Flagged first in the queue, with the strictest window.",
      },
    ],
  },

  cta: {
    marquee: "SETTLED IN SECONDS",
    title: "Open your queue.",
    body: "Try it in demo mode without touching PayPal, or connect a sandbox account.",
    primary: { label: "Open dashboard", href: "/dashboard" },
    secondary: { label: "View pricing", href: "/pricing" },
  },
};
