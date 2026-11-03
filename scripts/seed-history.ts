import { SAMPLE_PREFIX } from "@/lib/sample";
import { supabaseAdmin } from "@/lib/supabase";

// Adds sample history for Northbound Supply: ten resolved disputes from August to October, each
// with Sira's report, the response the seller sent and the store's shipping record, so the home
// chart, Results and Insights have months of history. They never existed in PayPal: ids start with
// SAMPLE-, the app labels them as sample history and never sends anything to PayPal for them.
// Safe to re-run: it replaces the sample rows it made before.
// Usage: npm run seed:history            add (or refresh) the sample history
//        npm run seed:history -- --remove remove it

const SELLER_NAME = "Northbound Supply";
const HOUR = 3_600_000;

type Choice = "fight" | "settle" | "refund";
type Proof = "signed" | "unsigned" | "label_only";

type SampleCase = {
  key: string; // MMDD-NN, also the id suffix
  opened: string; // ISO date the buyer opened it
  resolvedAfterDays: number;
  buyer: string;
  item: string;
  sku: string;
  amount: number;
  reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" | "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED" | "UNAUTHORISED";
  stage?: "INQUIRY" | "CHARGEBACK";
  message: string;
  proof: Proof;
  address: string;
  advised: Choice;
  settleAmount?: number;
  did: Choice;
  respondedAfterHours: number;
  /** PayPal's outcome code and how much went back to the buyer. */
  outcome: "RESOLVED_SELLER_FAVOUR" | "RESOLVED_BUYER_FAVOUR" | "ACCEPTED";
  refunded: number;
  /** "{delivered}" is replaced with the delivery date from the order's tracking, so they always agree. */
  reasoning: string;
  draft: string;
};

const CASES: SampleCase[] = [
  {
    key: "0806-01", opened: "2026-08-06T15:12:00Z", resolvedAfterDays: 13,
    buyer: "Olivia Grant", item: "Down jacket", sku: "NB-JKT-DN", amount: 249,
    reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    message: "My down jacket never arrived. It's been almost two weeks and the package isn't at my building.",
    proof: "signed", address: "1180 Oak Grove Ave, Portland, OR 97214, US",
    advised: "fight", did: "fight", respondedAfterHours: 3,
    outcome: "RESOLVED_SELLER_FAVOUR", refunded: 0,
    reasoning: "UPS shows the jacket delivered and signed for at the address on the PayPal transaction, so Seller Protection is met. Send the tracking and signature to PayPal.",
    draft: "The buyer reports the down jacket was not received. UPS tracking shows it was delivered on {delivered} and signed for by the recipient at the address on the PayPal transaction. Tracking and signature details are attached.",
  },
  {
    key: "0814-02", opened: "2026-08-14T18:40:00Z", resolvedAfterDays: 1,
    buyer: "Ryan Patel", item: "LED headlamp", sku: "NB-LMP-HD", amount: 29,
    reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    message: "Ordered a headlamp over two weeks ago and never got it. No tracking was ever sent to me.",
    proof: "label_only", address: "42 Willow St, Denver, CO 80206, US",
    advised: "refund", did: "refund", respondedAfterHours: 2,
    outcome: "ACCEPTED", refunded: 29,
    reasoning: "The label was printed but the carrier never scanned the parcel, so there's no proof of shipment and Seller Protection isn't met. At $29, refunding is cheaper than a losing fight.",
    draft: "We're sorry, the headlamp never left our warehouse. We've accepted the claim so you get a full refund.",
  },
  {
    key: "0827-03", opened: "2026-08-27T09:05:00Z", resolvedAfterDays: 8,
    buyer: "Chloe Martin", item: "Down sleeping bag", sku: "NB-SLP-DN", amount: 219,
    reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
    message: "The zipper on the sleeping bag split on the first night of my trip. It's not usable like this.",
    proof: "unsigned", address: "905 Lakeview Dr, Madison, WI 53703, US",
    advised: "settle", settleAmount: 60, did: "settle", respondedAfterHours: 5,
    outcome: "RESOLVED_BUYER_FAVOUR", refunded: 60,
    reasoning: "A broken zipper on first use is a credible defect claim and the bag wasn't inspected before shipping. A partial refund to cover a zipper repair keeps most of the sale.",
    draft: "Sorry about the zipper. We'd like to offer a $60 partial refund to cover a repair at any outdoor gear shop, and you keep the bag.",
  },
  {
    key: "0903-04", opened: "2026-09-03T21:30:00Z", resolvedAfterDays: 15,
    buyer: "Marcus Reid", item: "Merino base layer top", sku: "NB-BL-MER", amount: 68,
    reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    message: "Never received my base layer. Please refund.",
    proof: "unsigned", address: "3317 Pine St, Seattle, WA 98101, US",
    advised: "fight", did: "fight", respondedAfterHours: 4,
    outcome: "RESOLVED_SELLER_FAVOUR", refunded: 0,
    reasoning: "USPS shows the parcel delivered to the PayPal address. No signature is needed under $750, so Seller Protection is met.",
    draft: "The buyer reports the base layer was not received. USPS tracking shows it was delivered on {delivered} to the address on the PayPal transaction. Tracking details are attached.",
  },
  {
    key: "0911-05", opened: "2026-09-11T13:18:00Z", resolvedAfterDays: 1,
    buyer: "Noah Kim", item: "Hiking socks (3-pack)", sku: "NB-SCK-3P", amount: 24,
    reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    message: "My socks never showed up and the tracking hasn't moved in ten days.",
    proof: "label_only", address: "77 Maple Ave, Burlington, VT 05401, US",
    advised: "refund", did: "refund", respondedAfterHours: 1,
    outcome: "ACCEPTED", refunded: 24,
    reasoning: "The tracking never shows a carrier scan, so the parcel likely never shipped. Refund and reship if the buyer still wants them.",
    draft: "Sorry, it looks like your socks never left us. We've refunded you in full.",
  },
  {
    key: "0919-06", opened: "2026-09-19T16:45:00Z", resolvedAfterDays: 17,
    buyer: "Ava Thompson", item: "Trail running shoes", sku: "NB-SHO-TR", amount: 132,
    reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
    message: "The soles started separating from the shoes after a week of light trail running.",
    proof: "unsigned", address: "2150 Elm St, Boulder, CO 80302, US",
    advised: "settle", settleAmount: 45, did: "fight", respondedAfterHours: 9,
    outcome: "RESOLVED_BUYER_FAVOUR", refunded: 132,
    reasoning: "Sole separation within a week points to a defect, and there are no photos of the shoes before shipping to argue otherwise. Offer a partial refund rather than risk the full amount.",
    draft: "Sorry the shoes let you down. We'd like to offer a $45 partial refund, and you're welcome to keep them.",
  },
  {
    key: "0926-07", opened: "2026-09-26T11:02:00Z", resolvedAfterDays: 21, stage: "CHARGEBACK",
    buyer: "Isabella Rossi", item: "65L trekking backpack", sku: "NB-PACK-65", amount: 239,
    reason: "UNAUTHORISED",
    message: "I don't recognize this charge.",
    proof: "signed", address: "68 Harbor View Rd, San Diego, CA 92101, US",
    advised: "fight", did: "fight", respondedAfterHours: 6,
    outcome: "RESOLVED_SELLER_FAVOUR", refunded: 0,
    reasoning: "The backpack was signed for at the cardholder's own verified PayPal address, which meets Seller Protection for unauthorized claims. Send the delivery proof.",
    draft: "The buyer reports this payment as unauthorized. The 65L backpack was shipped to the verified address on the buyer's PayPal account and UPS shows it signed for on {delivered}. Tracking and signature are attached.",
  },
  {
    key: "1004-08", opened: "2026-10-04T19:25:00Z", resolvedAfterDays: 12,
    buyer: "James O'Connor", item: "Folding camp chair", sku: "NB-CHR-FC", amount: 79,
    reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    message: "The chair never came. Can I get my money back?",
    proof: "unsigned", address: "410 Birch Ln, Ann Arbor, MI 48104, US",
    advised: "fight", did: "fight", respondedAfterHours: 2,
    outcome: "RESOLVED_SELLER_FAVOUR", refunded: 0,
    reasoning: "USPS shows delivery to the PayPal address on {delivered}, which meets Seller Protection for an order under $750.",
    draft: "The buyer reports the camp chair was not received. USPS tracking shows it was delivered on {delivered} to the address on the PayPal transaction. Tracking details are attached.",
  },
  {
    key: "1013-09", opened: "2026-10-13T08:50:00Z", resolvedAfterDays: 7,
    buyer: "Mia Fernandez", item: "Waterproof gloves", sku: "NB-GLV-WP", amount: 45,
    reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
    message: "These are sold as waterproof but my hands were soaked after an hour of light rain.",
    proof: "unsigned", address: "15 Cedar Ct, Asheville, NC 28801, US",
    advised: "settle", settleAmount: 15, did: "settle", respondedAfterHours: 3,
    outcome: "RESOLVED_BUYER_FAVOUR", refunded: 15,
    reasoning: "The listing says water-resistant, not waterproof, but the product title says waterproof. Fault is shared, so a small partial refund is the cheapest way to close it.",
    draft: "Sorry the gloves didn't keep you dry. We'd like to offer a $15 partial refund, and we've fixed the product title.",
  },
  {
    key: "1021-10", opened: "2026-10-21T14:35:00Z", resolvedAfterDays: 9,
    buyer: "Liam Walker", item: "Titanium cook set", sku: "NB-COOK-TI", amount: 89,
    reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    message: "Cook set never arrived.",
    proof: "signed", address: "2600 Riverside Dr, Austin, TX 78741, US",
    advised: "fight", did: "fight", respondedAfterHours: 4,
    outcome: "RESOLVED_SELLER_FAVOUR", refunded: 0,
    reasoning: "UPS shows the cook set delivered and signed for at the PayPal address on {delivered}. Seller Protection is met.",
    draft: "The buyer reports the cook set was not received. UPS tracking shows it was delivered on {delivered} and signed for at the address on the PayPal transaction. Tracking and signature are attached.",
  },
];

const ACTION: Record<Choice, string> = { fight: "provide_evidence", settle: "make_offer", refund: "accept_claim" };
const DECISION_ACTION: Record<Choice, string> = { fight: "fight", settle: "offer_refund", refund: "accept" };
const at = (iso: string, hours: number) => new Date(new Date(iso).getTime() + hours * HOUR).toISOString();
const city = (address: string) => address.split(", ").slice(1, 3).join(", ");
/** Paid about nine days before the dispute was opened; delivered four days after paying. */
const paidAt = (c: SampleCase) => at(c.opened, -9 * 24);
const deliveredAt = (c: SampleCase) => at(paidAt(c), 4 * 24);
const withDates = (c: SampleCase, text: string) =>
  text.replaceAll("{delivered}", new Date(deliveredAt(c)).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }));

function order(c: SampleCase, sellerId: string, txId: string) {
  const ups = c.proof === "signed";
  const paid = paidAt(c);
  const tracking = ups ? `1Z999AA1${c.key.replace("-", "")}0${c.amount}` : `94001118992231${c.key.replace("-", "")}${c.amount}`.slice(0, 22);
  const base = {
    seller_id: sellerId,
    paypal_transaction_id: txId,
    order_number: `ORD-${c.key.replace("-", "")}`,
    item_description: c.item,
    ship_to_name: c.buyer,
    ship_to_address: c.address,
    ship_to_matches_paypal: true,
    carrier: ups ? "UPS" : "USPS",
    tracking_number: tracking,
    simulated: true,
  };
  if (c.proof === "label_only") {
    return {
      ...base,
      shipping_status: "LABEL_CREATED",
      shipped_at: null as string | null,
      delivered_at: null as string | null,
      signature_confirmed: false,
      tracking_events: [{ at: at(paid, 20), location: "Bend, OR", description: "Shipping label created, awaiting item" }],
      notes: "Label printed but the parcel was never handed to the carrier.",
    };
  }
  return {
    ...base,
    shipping_status: "DELIVERED",
    shipped_at: at(paid, 20) as string | null,
    delivered_at: deliveredAt(c) as string | null,
    signature_confirmed: ups,
    tracking_events: [
      { at: at(paid, 20), location: "Bend, OR", description: "Accepted at origin facility" },
      { at: at(paid, 2 * 24), location: "Portland, OR", description: "In transit to next facility" },
      { at: at(paid, 4 * 24 - 4), location: city(c.address), description: "Out for delivery" },
      { at: at(paid, 4 * 24), location: city(c.address), description: ups ? "Delivered, signed for by recipient" : "Delivered, left at front door" },
    ],
    notes: ups ? "Signature on file from the carrier." : "Delivered to the PayPal address; no signature required.",
  };
}

async function main() {
  const db = supabaseAdmin();
  const like = `${SAMPLE_PREFIX}%`;

  // Remove earlier sample rows first (children before the disputes they point to).
  for (const table of ["actions", "decisions", "chat_messages"]) {
    const { error } = await db.from(table).delete().like("dispute_id", like);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  for (const [table, column] of [["orders", "paypal_transaction_id"], ["disputes", "id"]] as const) {
    const { error } = await db.from(table).delete().like(column, like);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  if (process.argv.includes("--remove")) {
    console.log("Sample history removed.");
    return;
  }

  const { data: seller, error: sellerError } = await db.from("sellers").select("id, paypal_merchant_id").eq("name", SELLER_NAME).single();
  if (sellerError) throw new Error(`No seller named ${SELLER_NAME}: ${sellerError.message}`);

  for (const c of CASES) {
    const id = `${SAMPLE_PREFIX}${c.key}`;
    const txId = `${SAMPLE_PREFIX}TX-${c.key}`;
    const resolvedAt = at(c.opened, c.resolvedAfterDays * 24);
    const stage = c.stage ?? "INQUIRY";
    const amount = { currency_code: "USD", value: c.amount.toFixed(2) };
    const buyerSlug = c.buyer.toLowerCase().replace(/[^a-z]+/g, ".");

    const raw = {
      sample: true,
      dispute_id: id,
      create_time: c.opened,
      update_time: resolvedAt,
      reason: c.reason,
      status: "RESOLVED",
      dispute_state: "RESOLVED",
      dispute_life_cycle_stage: stage,
      dispute_channel: stage === "CHARGEBACK" ? "EXTERNAL" : "INTERNAL",
      dispute_amount: amount,
      dispute_outcome: {
        outcome_code: c.outcome,
        ...(c.refunded ? { amount_refunded: { currency_code: "USD", value: c.refunded.toFixed(2) } } : {}),
      },
      messages: [{ posted_by: "BUYER", time_posted: c.opened, content: c.message }],
      disputed_transactions: [
        {
          seller_transaction_id: txId,
          buyer_transaction_id: `${SAMPLE_PREFIX}BTX-${c.key}`,
          create_time: paidAt(c),
          transaction_status: "COMPLETED",
          gross_amount: amount,
          buyer: { name: c.buyer, email: `${buyerSlug}@personal.example.com`, payer_id: `SAMPLE${c.key.replace("-", "")}` },
          seller: { name: SELLER_NAME, merchant_id: seller.paypal_merchant_id },
          items: [{ item_id: c.sku, item_name: c.item, item_type: "PRODUCT", item_quantity: "1", reason: c.reason }],
          seller_protection_eligible: true,
        },
      ],
      links: [],
    };

    const { error: disputeError } = await db.from("disputes").insert({
      id,
      seller_id: seller.id,
      merchant_id: seller.paypal_merchant_id,
      buyer_transaction_id: raw.disputed_transactions[0].buyer_transaction_id,
      reason: c.reason,
      status: "RESOLVED",
      dispute_state: "RESOLVED",
      lifecycle_stage: stage,
      amount: c.amount,
      currency: "USD",
      seller_response_due_at: null,
      paypal_created_at: c.opened,
      paypal_updated_at: resolvedAt,
      raw,
      synced_at: resolvedAt,
    });
    if (disputeError) throw new Error(`${id}: ${disputeError.message}`);

    const { error: orderError } = await db.from("orders").insert(order(c, seller.id, txId));
    if (orderError) throw new Error(`${id} order: ${orderError.message}`);

    const toBuyer = c.advised !== "fight";
    const reasoning = withDates(c, c.reasoning);
    const draft = withDates(c, c.draft);
    const assessment = {
      recommendation: c.advised,
      settle_amount: c.settleAmount ?? null,
      risk: c.advised === "fight" ? "low" : c.advised === "settle" ? "medium" : "high",
      risk_reason: reasoning,
      urgency: "medium",
      urgency_reason: stage === "CHARGEBACK" ? "Card issuer deadline in 10 days." : "PayPal deadline in 20 days.",
      reasoning,
      confidence: c.advised === "fight" ? 0.92 : 0.81,
      alternatives: (["fight", "settle", "refund"] as Choice[])
        .filter((o) => o !== c.advised)
        .map((option) => ({
          option,
          what_happens:
            option === "fight"
              ? "Contesting without stronger proof would likely lose the full amount."
              : option === "refund"
                ? `Refunding the full $${c.amount} closes it today but gives up the sale.`
                : "A partial refund offer could close it for less, if the buyer accepts.",
        })),
      key_evidence: [c.proof === "label_only" ? "No carrier scan after the label was created." : `${c.proof === "signed" ? "UPS" : "USPS"} shows delivery to the address on the PayPal transaction.`],
      missing_evidence: [],
      drafts: [{ action: ACTION[c.advised], recipient: toBuyer ? "buyer" : "paypal", text: draft }],
      investigation: [{ tool: "get_store_order", args: { seller_transaction_id: txId }, ok: true, summary: `Store order ORD-${c.key.replace("-", "")}` }],
    };
    const { data: decision, error: decisionError } = await db
      .from("decisions")
      .insert({
        dispute_id: id,
        action: DECISION_ACTION[c.advised],
        confidence: assessment.confidence,
        reasoning,
        draft_response: draft,
        evidence: { key: assessment.key_evidence, missing: [] },
        model: "sample",
        status: "submitted",
        created_at: at(c.opened, 0.05),
        reviewed_at: at(c.opened, c.respondedAfterHours),
        risk: assessment.risk,
        urgency: assessment.urgency,
        settle_amount: assessment.settle_amount,
        assessment,
        prompt_version: "sample",
        dispute_updated_at: resolvedAt, // matches paypal_updated_at, so the report reads as current
      })
      .select("id")
      .single();
    if (decisionError) throw new Error(`${id} decision: ${decisionError.message}`);

    const { error: actionError } = await db.from("actions").insert({
      dispute_id: id,
      decision_id: decision.id,
      action_type: ACTION[c.did],
      request: { sample: true, summary: c.did === c.advised ? "Sent Sira's draft" : "Seller sent their own response" },
      response: { status: 200, body: { sample: true } },
      success: true,
      created_at: at(c.opened, c.respondedAfterHours),
    });
    if (actionError) throw new Error(`${id} action: ${actionError.message}`);

    console.log(`✓ ${id} ${c.buyer}, ${c.item} $${c.amount}: advised ${c.advised}, did ${c.did}, ${c.outcome}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
