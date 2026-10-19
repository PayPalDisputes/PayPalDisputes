/** Homepage copy. Edit text here rather than inside the section components. */

export const hero = {
  eyebrow: "For PayPal sellers",
  title: "Your disputes settled in seconds",
  /** Word in the title set in italic serif. */
  emphasis: "settled",
  /**
   * Rolling numbers under the headline. Keep these true: the time and accuracy figures come from the
   * latest eval run (`npm run eval`, prompt v5, 14 cases); update them when the eval set changes.
   */
  stats: [
    { prefix: "", value: "4.0", suffix: "s", label: "Average time to a decision" },
    { prefix: "", value: "100", suffix: "%", label: "Recommendations matching the expert call" },
    { prefix: "", value: "10", suffix: "", label: "PayPal dispute reasons covered" },
  ],
  /**
   * The hero's cycling dollar figure: example disputes (fictional). Keep every amount in the same
   * shape (#,###.##) so the digits roll up and down in place.
   */
  exampleCases: [
    { amount: "1,240.00", reason: "Unauthorized", decision: "Fight" },
    { amount: "2,875.50", reason: "Item not received", decision: "Fight" },
    { amount: "1,309.00", reason: "Not as described", decision: "Settle" },
    { amount: "4,160.25", reason: "Item not received", decision: "Fight" },
    { amount: "1,039.00", reason: "Duplicate transaction", decision: "Refund" },
  ],
  statsNote: "Time and accuracy measured on our 14-case evaluation set (prompt v5). Dollar amounts are example disputes.",
  primary: { label: "Open dashboard", href: "/dashboard" },
  secondary: { label: "See how it works", href: "#assessment" },
};

/** The three cells under the hero. Each one switches the panel on the right of the hero dashboard. */
export const benefits = [
  {
    icon: "scale",
    title: "Decide every case",
    body: "Fight, refund or settle, with the reasoning and the Seller Protection check behind each call.",
  },
  {
    icon: "pen",
    title: "Draft the response",
    body: "Evidence notes, buyer messages and offers written from your order data, ready to edit.",
  },
  {
    icon: "timer",
    title: "Stay ahead of deadlines",
    body: "Cases sorted by PayPal's response date, with chargebacks and arbitration flagged first.",
  },
] as const;

export const features = {
  assessment: {
    id: "assessment",
    eyebrow: "Assessment",
    title: "A recommendation you can check",
    description:
      "Deadlines and Seller Protection are worked out by rules, not guessed by a model. The agent reads the claim, the buyer's messages and your order, then explains its call.",
    bullets: [
      "Urgency computed from the deadline and lifecycle stage",
      "Seller Protection checked against tracking, item type and amount",
      "Every assessment versioned so results stay comparable",
    ],
    cta: { label: "Open a case", href: "/disputes" },
  },
  evidence: {
    id: "evidence",
    eyebrow: "Evidence",
    title: "Evidence, matched to the claim",
    description:
      "Tracking numbers, invoices and delivery confirmations are pulled from the order and checked against what the buyer says happened.",
    bullets: [
      "Tracking matched to the order and carrier",
      "Delivery address compared with the PayPal transaction",
      "Missing proof called out before you respond",
    ],
  },
  settle: {
    id: "settle",
    eyebrow: "Settlements",
    title: "Know when a partial refund wins",
    description:
      "Some disputes aren't worth fighting in full. When an offer is the better outcome, Sira drafts one with the amount and the note to the buyer.",
    bullets: ["Offer amount suggested alongside the reasoning", "Buyer-facing note drafted in your voice"],
  },
  sellers: {
    id: "sellers",
    eyebrow: "Multi-seller",
    title: "Every storefront in one queue",
    description:
      "Connect several PayPal merchant accounts and work their disputes from one list, sorted by whichever deadline comes first.",
    bullets: ["Per-seller filters and totals", "Disputes linked to sellers by merchant ID"],
  },
};

export const logos = [
  "Northwind Goods",
  "Juniper & Co",
  "Kestrel Outdoor",
  "Paper Moon",
  "Halcyon Supply",
  "Oakline",
  "Mosaic Print",
  "Lumen Labs",
];

export const bento = {
  id: "capabilities",
  eyebrow: "Capabilities",
  title: "Built around how PayPal disputes actually work",
  body: "Every reason code, lifecycle stage and deadline PayPal uses, handled in one place.",
};

export const finalCta = {
  title: "Every dispute.\nOne calm queue.",
  body: "Connect a PayPal account and see what Sira recommends for your open cases.",
  primary: { label: "Open dashboard", href: "/dashboard" },
  secondary: { label: "View pricing", href: "/pricing" },
};

/* ------------------------------------------------------------------ */
/* Developer section                                                   */
/* The SDK below is illustrative: rename the package in data/site.ts.  */
/* ------------------------------------------------------------------ */

export const developer = {
  id: "developers",
  eyebrow: "Developers",
  title: "Wire it into your stack in minutes",
  body:
    "Listen for PayPal's dispute webhooks, ask for an assessment and approve the response, all from your own code. Typed SDKs and a plain REST API.",
};

export type Lang = "typescript" | "python" | "go" | "curl";
export const languages: { id: Lang; label: string }[] = [
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "curl", label: "cURL" },
];

export const steps: { title: string; body: string; code: Record<Lang, string> }[] = [
  {
    title: "Receive the dispute",
    body: "Verify PayPal's webhook and store the case.",
    code: {
      typescript: `import { Sira } from "@sira/sdk";

const sira = new Sira({ apiKey: process.env.SIRA_API_KEY });

export async function POST(req: Request) {
  const event = await sira.webhooks.verify(req);

  if (event.type === "CUSTOMER.DISPUTE.CREATED") {
    await sira.disputes.sync(event.resource.dispute_id);
  }
  return new Response(null, { status: 200 });
}`,
      python: `from sira import Sira

sira = Sira(api_key=os.environ["SIRA_API_KEY"])

@app.post("/webhooks/paypal")
async def paypal_webhook(request: Request):
    event = await sira.webhooks.verify(request)

    if event.type == "CUSTOMER.DISPUTE.CREATED":
        sira.disputes.sync(event.resource["dispute_id"])
    return {"ok": True}`,
      go: `client := sira.NewClient(os.Getenv("SIRA_API_KEY"))

func paypalWebhook(w http.ResponseWriter, r *http.Request) {
	event, err := client.Webhooks.Verify(r)
	if err != nil {
		http.Error(w, "invalid signature", http.StatusBadRequest)
		return
	}
	if event.Type == "CUSTOMER.DISPUTE.CREATED" {
		client.Disputes.Sync(r.Context(), event.Resource.DisputeID)
	}
	w.WriteHeader(http.StatusOK)
}`,
      curl: `curl https://api.sira.dev/v1/disputes/sync \\
  -H "Authorization: Bearer $SIRA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "dispute_id": "PP-D-48213"
  }'`,
    },
  },
  {
    title: "Assess the case",
    body: "Get a decision, confidence and drafts.",
    code: {
      typescript: `const assessment = await sira.disputes.assess("PP-D-48213");

console.log(assessment.decision);    // "fight"
console.log(assessment.confidence);  // 0.91
console.log(assessment.sellerProtection.status); // "met"

for (const draft of assessment.drafts) {
  console.log(draft.action, draft.text);
}`,
      python: `assessment = sira.disputes.assess("PP-D-48213")

print(assessment.decision)    # "fight"
print(assessment.confidence)  # 0.91
print(assessment.seller_protection.status)  # "met"

for draft in assessment.drafts:
    print(draft.action, draft.text)`,
      go: `assessment, err := client.Disputes.Assess(ctx, "PP-D-48213")
if err != nil {
	log.Fatal(err)
}

fmt.Println(assessment.Decision)   // "fight"
fmt.Println(assessment.Confidence) // 0.91

for _, d := range assessment.Drafts {
	fmt.Println(d.Action, d.Text)
}`,
      curl: `curl https://api.sira.dev/v1/disputes/PP-D-48213/assess \\
  -X POST \\
  -H "Authorization: Bearer $SIRA_API_KEY"

# {
#   "decision": "fight",
#   "confidence": 0.91,
#   "seller_protection": { "status": "met" },
#   "drafts": [{ "action": "provide_evidence", ... }]
# }`,
    },
  },
  {
    title: "Approve and send",
    body: "A person signs off; Sira responds to PayPal.",
    code: {
      typescript: `const result = await sira.decisions.approve(assessment.id, {
  drafts: assessment.drafts.map((d) => ({
    ...d,
    text: d.text.trim(),
  })),
  approvedBy: "ops@northwind.example",
});

console.log(result.status); // "sent"`,
      python: `result = sira.decisions.approve(
    assessment.id,
    drafts=[{**d, "text": d.text.strip()} for d in assessment.drafts],
    approved_by="ops@northwind.example",
)

print(result.status)  # "sent"`,
      go: `result, err := client.Decisions.Approve(ctx, assessment.ID, &sira.ApproveParams{
	Drafts:     assessment.Drafts,
	ApprovedBy: "ops@northwind.example",
})
if err != nil {
	log.Fatal(err)
}

fmt.Println(result.Status) // "sent"`,
      curl: `curl https://api.sira.dev/v1/decisions/dec_7Hq2/approve \\
  -X POST \\
  -H "Authorization: Bearer $SIRA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "approved_by": "ops@northwind.example"
  }'`,
    },
  },
];

/* ------------------------------------------------------------------ */
/* Agent notes: real-format reasoning excerpts on fictional cases.      */
/* Used instead of customer testimonials until there are real ones.    */
/* ------------------------------------------------------------------ */

export const agentNotes = [
  {
    decision: "Fight",
    quote:
      "Carrier tracking shows delivery to the buyer's PayPal shipping address on Oct 2. The order meets Seller Protection, so submitting proof of delivery is the strongest response.",
    caseId: "PP-D-48213",
    meta: "Item not received · $184.00",
  },
  {
    decision: "Settle",
    quote:
      "The listing photos don't show the scuffed finish the buyer describes, but there's no evidence either way. A 40% partial refund costs less than a likely loss on appeal.",
    caseId: "PP-D-48161",
    meta: "Not as described · A$309.00",
  },
  {
    decision: "Refund",
    quote:
      "The buyer was charged twice for one order and only one parcel shipped. This is a genuine duplicate, so refund the second charge and apologise.",
    caseId: "PP-D-48188",
    meta: "Duplicate transaction · €39.00",
  },
];

export const faq = {
  title: "Frequently asked questions",
  body: "How the agent decides, what it sends, and what stays in your hands.",
  items: [
    {
      q: "What is Sira and who is it for?",
      a: "Sira is a dispute desk for sellers who take payments through PayPal. It reads each dispute, checks it against your order, recommends whether to fight, refund or settle, and drafts the response.",
    },
    {
      q: "Does Sira send anything to PayPal without me?",
      a: "No. Every response, refund and offer waits for a person to approve it. Demo mode lets you try the whole flow without contacting PayPal at all.",
    },
    {
      q: "How does it decide whether to fight?",
      a: "Deadlines, urgency and Seller Protection are computed by fixed rules. The model then weighs the claim, the buyer's messages and your order evidence, and explains its recommendation with a confidence score.",
    },
    {
      q: "Which dispute types are supported?",
      a: "All ten PayPal dispute reasons, from item not received to canceled subscriptions, across inquiry, claim, chargeback and arbitration stages.",
    },
    {
      q: "Can I connect more than one store?",
      a: "Yes. Connect several PayPal merchant accounts and work every dispute from one queue, filtered by seller.",
    },
  ],
};
