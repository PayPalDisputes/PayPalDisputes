import type { DisputeInput } from "@/lib/agent";
import { buyerSignal, type BuyerHistory } from "@/lib/buyer-history";
import type { OrderEvidence } from "@/lib/dashboard";

// The eval set: made-up disputes whose right answers we already know.
// Edit or add cases here, then run `npm run eval:seed` to copy them into the eval_cases table.

type Level = "high" | "medium" | "low";
type Recommendation = "fight" | "refund" | "settle";

export type EvalCase = {
  id: string;
  title: string;
  input: DisputeInput;
  expected: { recommendation: Recommendation; alsoAcceptable?: Recommendation[]; urgency: Level; risk: Level };
  rationale: string;
};

/** Every case is judged as of this moment, so "days left" never drifts. */
const AS_OF = "2026-10-15T12:00:00Z";
const DAY = 86_400_000;
const daysFromAsOf = (days: number) => new Date(new Date(AS_OF).getTime() + days * DAY).toISOString();

type DisputeSpec = {
  id: string;
  reason: string;
  stage?: "INQUIRY" | "CHARGEBACK" | "PRE_ARBITRATION" | "ARBITRATION";
  status?: string;
  amount: number;
  currency?: string;
  /** Days from AS_OF until the seller must respond (negative = overdue). */
  daysLeft: number;
  buyerMessage: string;
  item: string;
  itemType?: "PRODUCT" | "SERVICE" | "DIGITAL";
  sellerProtection: boolean;
  /** Days before AS_OF the buyer paid. */
  paidDaysAgo?: number;
};

/** Builds a PayPal-shaped dispute object (the same shape `disputes.raw` stores). */
function dispute(s: DisputeSpec): Record<string, unknown> {
  const money = { currency_code: s.currency ?? "USD", value: s.amount.toFixed(2) };
  const opened = daysFromAsOf(-3);
  return {
    dispute_id: s.id,
    create_time: opened,
    reason: s.reason,
    status: s.status ?? "WAITING_FOR_SELLER_RESPONSE",
    dispute_life_cycle_stage: s.stage ?? "INQUIRY",
    dispute_amount: money,
    seller_response_due_date: daysFromAsOf(s.daysLeft),
    disputed_transactions: [
      {
        seller_transaction_id: `EVAL${s.id.toUpperCase().replaceAll("-", "").slice(0, 13)}`,
        create_time: daysFromAsOf(-(s.paidDaysAgo ?? 14)),
        gross_amount: money,
        buyer: { name: "Sam Buyer" },
        items: [{ item_name: s.item, item_description: s.item, item_quantity: "1", item_type: s.itemType ?? "PRODUCT", reason: s.reason }],
        seller_protection_eligible: s.sellerProtection,
        ...(s.sellerProtection && { seller_protection_type: "EXPANDED_SELLER_PROTECTION" }),
      },
    ],
    messages: [{ posted_by: "BUYER", time_posted: opened, content: s.buyerMessage }],
    links: [
      { rel: "accept_claim", method: "POST" },
      { rel: "make_offer", method: "POST" },
      { rel: "provide_evidence", method: "POST" },
      { rel: "send_message", method: "POST" },
    ],
  };
}

const PAYPAL_ADDRESS = "742 Evergreen Terrace, Springfield, IL 62704, US";

/** An order record; defaults describe a parcel delivered to the PayPal address without a signature. */
function order(o: Partial<OrderEvidence>): OrderEvidence {
  return {
    orderNumber: "ORD-100231",
    itemDescription: null,
    shipToName: "Sam Buyer",
    shipToAddress: PAYPAL_ADDRESS,
    shipToMatchesPayPal: true,
    carrier: "USPS",
    trackingNumber: "9400111899223100001234",
    shippingStatus: "DELIVERED",
    shippedAt: daysFromAsOf(-12),
    deliveredAt: daysFromAsOf(-9),
    signatureConfirmed: false,
    trackingEvents: [],
    notes: null,
    simulated: true,
    payPalTrackingStatus: null,
    payPalTrackingUploadedAt: null,
    payPalTrackingError: null,
    ...o,
  };
}

const delivered = (signed: boolean) => [
  { at: daysFromAsOf(-12), location: "Columbus, OH", description: "Accepted at origin facility" },
  { at: daysFromAsOf(-10), location: "Chicago, IL", description: "In transit to next facility" },
  { at: daysFromAsOf(-9), location: "Springfield, IL", description: signed ? "Delivered, signed for by recipient" : "Delivered, left at front door" },
];

/** A buyer track record; the signal and summary follow the same rules as production. */
function history(h: { disputes: number; last30: number; notReceivedDelivered: number; purchases: number | null }): BuyerHistory {
  const otherDisputes = Array.from({ length: h.disputes }, (_, i) => ({
    id: `PP-R-PAST-${i}`,
    reason: i < h.notReceivedDelivered ? "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" : "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
    status: "RESOLVED",
    openedAt: daysFromAsOf(i < h.last30 ? -5 - i : -60 - i),
    deliveredParcel: i < h.notReceivedDelivered,
  }));
  const partial = {
    buyerName: "Sam Buyer",
    otherDisputes,
    otherDisputesLast30Days: h.last30,
    notReceivedOnDeliveredParcels: h.notReceivedDelivered,
    recentPurchases: h.purchases,
  };
  const signal = buyerSignal(partial);
  const summary =
    signal === "possible_serial_disputer"
      ? `Sam Buyer has opened ${h.disputes} other disputes with you (${h.last30} in the last 30 days), including ${h.notReceivedDelivered} "not received" claims on parcels marked delivered. That's an unusual pattern worth noting.`
      : signal === "trusted_customer"
        ? `Sam Buyer is a regular customer with no previous disputes. ${h.purchases} purchases from you in the last month.`
        : `This is Sam Buyer's first dispute with you.`;
  return { ...partial, signal, summary };
}

const c = (
  x: Omit<EvalCase, "input"> & { dispute: DisputeSpec; order: OrderEvidence | null; buyerHistory?: BuyerHistory },
): EvalCase => ({
  id: x.id,
  title: x.title,
  input: { asOf: AS_OF, dispute: dispute(x.dispute), order: x.order, buyerHistory: x.buyerHistory },
  expected: x.expected,
  rationale: x.rationale,
});

export const CASES: EvalCase[] = [
  // --- Buyer history: it informs, but never overrides the evidence. ---
  c({
    id: "history-serial-disputer-delivered-signed",
    title: "Serial disputer, and the parcel was delivered with signature",
    dispute: { id: "history-serial-disputer-delivered-signed", reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", amount: 75, daysLeft: 12, buyerMessage: "My order never arrived.", item: "Bluetooth speaker", sellerProtection: true },
    order: order({ signatureConfirmed: true, trackingEvents: delivered(true) }),
    buyerHistory: history({ disputes: 4, last30: 4, notReceivedDelivered: 3, purchases: null }),
    expected: { recommendation: "fight", urgency: "low", risk: "low" },
    rationale: "Strong evidence and a pattern of 'not received' claims on delivered parcels: fight, and the pattern can be noted to PayPal (never to the buyer).",
  }),
  c({
    id: "history-serial-disputer-never-shipped",
    title: "Serial disputer, but the seller never shipped",
    dispute: { id: "history-serial-disputer-never-shipped", reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", amount: 40, daysLeft: 12, buyerMessage: "Nothing has arrived and tracking hasn't moved.", item: "Desk organiser", sellerProtection: true },
    order: order({
      shippingStatus: "LABEL_CREATED",
      shippedAt: null,
      deliveredAt: null,
      trackingEvents: [{ at: daysFromAsOf(-10), location: "Columbus, OH", description: "Shipping label created, awaiting item" }],
      notes: "Label was printed but the carrier never received the parcel.",
    }),
    buyerHistory: history({ disputes: 5, last30: 5, notReceivedDelivered: 3, purchases: null }),
    expected: { recommendation: "refund", urgency: "low", risk: "high" },
    rationale: "History must not override the evidence: with no proof of shipment the buyer is right this time.",
  }),
  c({
    id: "history-trusted-customer-damaged",
    title: "Trusted customer reports damage",
    dispute: { id: "history-trusted-customer-damaged", reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED", amount: 140, daysLeft: 7, buyerMessage: "The mirror arrived with a cracked frame. Photos attached.", item: "Wall mirror", sellerProtection: false },
    order: order({ trackingEvents: delivered(false), notes: "Packed in a single box with bubble wrap; no insurance." }),
    buyerHistory: history({ disputes: 0, last30: 0, notReceivedDelivered: 0, purchases: 9 }),
    expected: { recommendation: "settle", alsoAcceptable: ["refund"], urgency: "medium", risk: "medium" },
    rationale: "Credible damage claim from a loyal customer: settle or refund; definitely not fight.",
  }),

  c({
    id: "inr-delivered-signed",
    title: "Not received, but delivered with signature to the PayPal address",
    dispute: { id: "inr-delivered-signed", reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", amount: 49.99, daysLeft: 12, buyerMessage: "I never got my order.", item: "Ceramic coffee mug set", sellerProtection: true },
    order: order({ signatureConfirmed: true, trackingEvents: delivered(true) }),
    expected: { recommendation: "fight", urgency: "low", risk: "low" },
    rationale: "Tracking shows signed delivery to the address on the transaction: meets Seller Protection. 12 days left.",
  }),
  c({
    id: "inr-delivered-signed-due-soon",
    title: "Same strong evidence, but the deadline is tomorrow",
    dispute: { id: "inr-delivered-signed-due-soon", reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", amount: 64, daysLeft: 1, buyerMessage: "Package never arrived.", item: "Wireless earbuds", sellerProtection: true },
    order: order({ signatureConfirmed: true, trackingEvents: delivered(true) }),
    expected: { recommendation: "fight", urgency: "high", risk: "low" },
    rationale: "Strong evidence, so fight; 1 day left makes it urgent.",
  }),
  c({
    id: "inr-delivered-no-signature-low-value",
    title: "Not received, delivered without signature, under $750",
    dispute: { id: "inr-delivered-no-signature-low-value", reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", amount: 25, currency: "CAD", daysLeft: 9, buyerMessage: "I haven't received my item.", item: "Phone case", sellerProtection: true },
    order: order({ carrier: "Canada Post", trackingNumber: "7023210039414611", shipToAddress: "88 Queen St W, Toronto, ON M5H 2N2, CA", trackingEvents: delivered(false) }),
    expected: { recommendation: "fight", urgency: "medium", risk: "low" },
    rationale: "Signature is only required at 750 USD and up; online tracking to the PayPal address is enough here. 9 days left.",
  }),
  c({
    id: "inr-delivered-no-signature-high-value",
    title: "Not received, delivered without signature, $900",
    dispute: { id: "inr-delivered-no-signature-high-value", reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", amount: 900, daysLeft: 6, buyerMessage: "Tracking says delivered but there was nothing at my door.", item: "Road bike frame", sellerProtection: true },
    order: order({ trackingEvents: delivered(false) }),
    expected: { recommendation: "settle", alsoAcceptable: ["refund"], urgency: "medium", risk: "high" },
    rationale: "Over 750 USD without signature confirmation fails Seller Protection, so fighting likely loses the full amount.",
  }),
  c({
    id: "inr-label-never-scanned",
    title: "Not received, label printed but never scanned by the carrier",
    dispute: { id: "inr-label-never-scanned", reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", amount: 10, currency: "CAD", daysLeft: 15, buyerMessage: "I haven't received my item and the tracking hasn't moved.", item: "Sticker pack", sellerProtection: true },
    order: order({
      carrier: "Canada Post",
      trackingNumber: "7023210039414628",
      shippingStatus: "LABEL_CREATED",
      shippedAt: null,
      deliveredAt: null,
      trackingEvents: [{ at: daysFromAsOf(-11), location: "Mississauga, ON", description: "Shipping label created, awaiting item" }],
      notes: "Label was printed but the carrier never received the parcel.",
    }),
    expected: { recommendation: "refund", urgency: "low", risk: "high" },
    rationale: "No proof the item ever shipped; the buyer is right.",
  }),
  c({
    id: "inr-no-order-record",
    title: "Not received, and the seller has no order record at all",
    dispute: { id: "inr-no-order-record", reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", amount: 35, daysLeft: 6, buyerMessage: "Paid two weeks ago, nothing arrived and no reply to my emails.", item: "Scented candle", sellerProtection: true },
    order: null,
    expected: { recommendation: "refund", urgency: "medium", risk: "high" },
    rationale: "Nothing to fight with.",
  }),
  c({
    id: "inr-wrong-address",
    title: "Not received, delivered with signature but to a different address",
    dispute: { id: "inr-wrong-address", reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", amount: 120, daysLeft: 2, buyerMessage: "This was sent to my old apartment, not the address on my PayPal.", item: "Mechanical keyboard", sellerProtection: true },
    order: order({
      shipToAddress: "15 Old Mill Rd Apt 3, Peoria, IL 61602, US",
      shipToMatchesPayPal: false,
      signatureConfirmed: true,
      trackingEvents: delivered(true),
      notes: "Buyer emailed a different address after checkout; we shipped there.",
    }),
    expected: { recommendation: "refund", alsoAcceptable: ["settle"], urgency: "high", risk: "high" },
    rationale: "Delivery to an address that isn't on the transaction voids Seller Protection. 2 days left.",
  }),
  c({
    id: "inr-in-transit",
    title: "Not received, parcel is still in transit",
    dispute: { id: "inr-in-transit", reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", amount: 60, daysLeft: 14, buyerMessage: "Where is my order?", item: "Linen tablecloth", sellerProtection: true, paidDaysAgo: 5 },
    order: order({
      shippingStatus: "IN_TRANSIT",
      shippedAt: daysFromAsOf(-3),
      deliveredAt: null,
      trackingEvents: [
        { at: daysFromAsOf(-3), location: "Columbus, OH", description: "Accepted at origin facility" },
        { at: daysFromAsOf(-1), location: "Chicago, IL", description: "In transit to next facility" },
      ],
    }),
    expected: { recommendation: "fight", urgency: "low", risk: "medium" },
    rationale: "Shipped 3 days ago and moving: share tracking and ask the buyer to wait. Not delivered yet, so some risk.",
  }),
  c({
    id: "snad-damaged-with-photos",
    title: "Not as described: arrived cracked, buyer sent photos",
    dispute: { id: "snad-damaged-with-photos", reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED", amount: 300, daysLeft: 7, buyerMessage: "The vase arrived with a large crack down the side. Photos attached.", item: "Hand-blown glass vase", sellerProtection: false },
    order: order({ trackingEvents: delivered(false), notes: "Packed in a single box with bubble wrap." }),
    expected: { recommendation: "settle", alsoAcceptable: ["refund"], urgency: "medium", risk: "medium" },
    rationale: "Credible damage claim and not-as-described isn't covered by Seller Protection; a partial refund is reasonable.",
  }),
  c({
    id: "snad-buyer-remorse",
    title: "Not as described, but the buyer admits it matches the listing",
    dispute: { id: "snad-buyer-remorse", reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED", amount: 80, daysLeft: 5, buyerMessage: "It's exactly like the photos, it's just not my style. I don't want it anymore.", item: "Wool throw blanket", sellerProtection: false },
    order: order({ trackingEvents: delivered(false), notes: "Listing photos and description match the item shipped. Our return policy: buyer pays return shipping." }),
    expected: { recommendation: "fight", urgency: "medium", risk: "low" },
    rationale: "The buyer's own message says the item matches the listing; this is a change of mind, not a defect.",
  }),
  c({
    id: "chargeback-unauthorized-delivered-signed",
    title: "Unauthorized chargeback on an order delivered with signature",
    dispute: { id: "chargeback-unauthorized-delivered-signed", reason: "UNAUTHORISED", stage: "CHARGEBACK", amount: 500, daysLeft: 9, buyerMessage: "I did not make this purchase.", item: "Espresso machine", sellerProtection: true },
    order: order({ signatureConfirmed: true, trackingEvents: delivered(true) }),
    expected: { recommendation: "fight", urgency: "high", risk: "low" },
    rationale: "Signed delivery to the PayPal address meets Seller Protection for unauthorized claims. Chargeback stage is always urgent.",
  }),
  c({
    id: "unauthorized-digital-download",
    title: "Unauthorized claim on a digital download",
    dispute: { id: "unauthorized-digital-download", reason: "UNAUTHORISED", stage: "INQUIRY", amount: 15, daysLeft: 8, buyerMessage: "Someone used my account to buy this.", item: "Photo preset pack (download)", itemType: "DIGITAL", sellerProtection: false },
    order: order({
      carrier: null,
      trackingNumber: null,
      shippingStatus: "NOT_SHIPPED",
      shipToAddress: null,
      shipToMatchesPayPal: null,
      shippedAt: null,
      deliveredAt: null,
      notes: "Digital download; link emailed to the buyer's PayPal email. Downloaded once.",
    }),
    expected: { recommendation: "refund", urgency: "medium", risk: "high" },
    rationale: "Digital goods aren't covered by Seller Protection and there's no delivery proof that counts; $15 isn't worth fighting.",
  }),
  c({
    id: "credit-not-processed-already-refunded",
    title: "Credit not processed, but the refund was already issued",
    dispute: { id: "credit-not-processed-already-refunded", reason: "CREDIT_NOT_PROCESSED", amount: 45, daysLeft: 3, buyerMessage: "I returned the shoes two weeks ago and never got my money back.", item: "Running shoes", sellerProtection: false },
    order: order({
      trackingEvents: delivered(false),
      notes: "Return received Oct 3. Full refund of 45.00 USD issued Oct 4 via PayPal, refund id 3XL51238A9876543P.",
    }),
    expected: { recommendation: "fight", urgency: "high", risk: "low" },
    rationale: "The refund already happened; show the refund id. 3 days left is urgent.",
  }),
  c({
    id: "duplicate-charge-confirmed",
    title: "Duplicate transaction, seller's records confirm two charges",
    dispute: { id: "duplicate-charge-confirmed", reason: "DUPLICATE_TRANSACTION", amount: 30, daysLeft: 10, buyerMessage: "I was charged twice for the same order.", item: "Herbal tea sampler", sellerProtection: false },
    order: order({ trackingEvents: delivered(false), notes: "Two payments 2 minutes apart for identical carts (ORD-100231 and ORD-100232). Only one parcel was shipped." }),
    expected: { recommendation: "refund", urgency: "medium", risk: "high" },
    rationale: "The seller's own records confirm the double charge.",
  }),
];
