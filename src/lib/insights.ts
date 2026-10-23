import { getOutcomes, type OutcomeSummary, type Result } from "@/lib/outcomes";
import { supabaseAdmin } from "@/lib/supabase";

// Insights: what Sira has saved the seller (impact), and why their disputes happen (prevention).
// Everything here is computed by fixed rules from the seller's own disputes, orders and outcomes,
// so the numbers and tips are reproducible and never invented by a model.

/**
 * Seller time one dispute takes by hand: reading the case, gathering proof, writing the response.
 * Industry estimates run 1–3 hours per dispute; we use the low end so the saving is never overstated.
 */
export const MANUAL_HOURS_PER_DISPUTE = 1.5;

const NOT_RECEIVED = "MERCHANDISE_OR_SERVICE_NOT_RECEIVED";
const NOT_AS_DESCRIBED = "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED";
const DAY = 86_400_000;

/** How strong the seller's shipping proof was for a dispute's order. */
export type ShippingProof = "signed" | "delivered" | "not_delivered" | "no_tracking" | "no_record";

export const SHIPPING_PROOF_LABEL: Record<ShippingProof, string> = {
  signed: "Delivered, signed for",
  delivered: "Delivered, no signature",
  not_delivered: "Shipped, not delivered yet",
  no_tracking: "No tracking number",
  no_record: "No order record",
};

/** One dispute, flattened for the insights page. */
export type InsightDispute = {
  id: string;
  sellerId: string | null;
  reason: string | null;
  amount: number;
  currency: string;
  openedAt: string | null;
  item: string;
  buyerKey: string | null;
  buyerName: string | null;
  proof: ShippingProof;
  /** null while the dispute is still open. */
  result: Result | null;
  overdue: boolean;
};

/** One product's dispute record, for the "Products that get disputed" grid. */
export type ItemRow = {
  item: string;
  disputes: number;
  open: number;
  won: number;
  lost: number;
  /** Disputed amount, in the item's (first) currency. */
  amount: number;
  currency: string;
  topReason: string | null;
  /** Share of this item's disputes whose order had delivery proof (0–1). */
  deliveredShare: number;
  lastOpenedAt: string | null;
};

export type Tip = {
  id: string;
  title: string;
  body: string;
  /** Where the seller can act on it. */
  href?: string;
  action?: string;
};

export type Impact = {
  /** Disputes Sira investigated and drafted a response for (or auto-refunded). */
  handled: number;
  hoursSaved: number;
  autoRefunded: number;
  /** Open disputes past their response deadline with nothing sent. */
  overdue: number;
  outcomes: OutcomeSummary;
};

export type Insights = {
  impact: Impact;
  disputes: InsightDispute[];
  items: ItemRow[];
  tips: Tip[];
};

type DisputeRaw = {
  create_time?: string;
  dispute_outcome?: { outcome_code?: string };
  disputed_transactions?: {
    seller_transaction_id?: string;
    buyer?: { name?: string; payer_id?: string };
    items?: { item_name?: string }[];
  }[];
};

type OrderRow = { paypal_transaction_id: string; item_description: string | null; tracking_number: string | null; shipping_status: string | null; signature_confirmed: boolean | null };

function proofFor(order: OrderRow | undefined): ShippingProof {
  if (!order) return "no_record";
  if (!order.tracking_number) return "no_tracking";
  if (order.shipping_status === "DELIVERED") return order.signature_confirmed ? "signed" : "delivered";
  return "not_delivered";
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Impact numbers, prevention breakdowns and tips for one seller, or every seller when sellerId is omitted. */
export async function getInsights(sellerId?: string): Promise<Insights> {
  const db = supabaseAdmin();
  let query = db.from("disputes").select("id, seller_id, reason, status, amount, currency, paypal_created_at, seller_response_due_at, raw");
  if (sellerId) query = query.eq("seller_id", sellerId);
  const [{ data: rows, error }, outcomes] = await Promise.all([query, getOutcomes(sellerId)]);
  if (error) throw error;

  const ids = rows.map((d) => d.id);
  const txIds = rows.map((d) => (d.raw as DisputeRaw).disputed_transactions?.[0]?.seller_transaction_id).filter((t): t is string => !!t);
  const [decisions, orders] = await Promise.all([
    ids.length
      ? db.from("decisions").select("dispute_id, status, rule:assessment->>rule").in("dispute_id", ids).not("assessment", "is", null)
      : Promise.resolve({ data: [] as { dispute_id: string; status: string; rule: string | null }[], error: null }),
    txIds.length
      ? db.from("orders").select("paypal_transaction_id, item_description, tracking_number, shipping_status, signature_confirmed").in("paypal_transaction_id", txIds)
      : Promise.resolve({ data: [] as OrderRow[], error: null }),
  ]);
  if (decisions.error) throw decisions.error;
  // PGRST205: the orders table doesn't exist yet; insights still work without shipping proof.
  if (orders.error && orders.error.code !== "PGRST205") throw orders.error;

  const orderByTx = new Map((orders.data ?? []).map((o) => [o.paypal_transaction_id, o as OrderRow]));
  const resultById = new Map(outcomes.rows.map((r) => [r.disputeId, r.result]));
  const now = Date.now();

  const disputes: InsightDispute[] = rows.map((d) => {
    const raw = d.raw as DisputeRaw;
    const tx = raw.disputed_transactions?.[0];
    const order = tx?.seller_transaction_id ? orderByTx.get(tx.seller_transaction_id) : undefined;
    const item = tx?.items?.[0]?.item_name?.trim() || order?.item_description?.trim() || "Unnamed item";
    return {
      id: d.id,
      sellerId: d.seller_id,
      reason: d.reason,
      amount: Number(d.amount ?? 0),
      currency: d.currency ?? "USD",
      openedAt: d.paypal_created_at ?? raw.create_time ?? null,
      item,
      // Group a buyer's disputes per seller: the same PayPal buyer at two stores is two relationships.
      buyerKey: tx?.buyer?.payer_id ? `${d.seller_id}:${tx.buyer.payer_id}` : null,
      buyerName: tx?.buyer?.name ?? null,
      proof: proofFor(order),
      result: d.status === "RESOLVED" ? (resultById.get(d.id) ?? "other") : null,
      overdue:
        d.status === "WAITING_FOR_SELLER_RESPONSE" && !!d.seller_response_due_at && new Date(d.seller_response_due_at).getTime() < now,
    };
  });

  // Impact: every dispute Sira assessed is one the seller didn't have to work through by hand.
  const handledIds = new Set((decisions.data ?? []).map((d) => d.dispute_id));
  const autoRefunded = new Set((decisions.data ?? []).filter((d) => d.rule === "auto_refund" && d.status === "submitted").map((d) => d.dispute_id)).size;
  const impact: Impact = {
    handled: handledIds.size,
    hoursSaved: handledIds.size * MANUAL_HOURS_PER_DISPUTE,
    autoRefunded,
    overdue: disputes.filter((d) => d.overdue).length,
    outcomes: outcomes.summary,
  };

  const items = itemRows(disputes);
  return { impact, disputes, items, tips: tips(disputes, items, now) };
}

function itemRows(disputes: InsightDispute[]): ItemRow[] {
  const groups = new Map<string, InsightDispute[]>();
  for (const d of disputes) groups.set(d.item, [...(groups.get(d.item) ?? []), d]);
  return [...groups].map(([item, ds]) => {
    const currency = ds[0].currency;
    const reasons = new Map<string, number>();
    for (const d of ds) if (d.reason) reasons.set(d.reason, (reasons.get(d.reason) ?? 0) + 1);
    return {
      item,
      disputes: ds.length,
      open: ds.filter((d) => d.result === null).length,
      won: ds.filter((d) => d.result === "won").length,
      lost: ds.filter((d) => d.result === "lost").length,
      amount: ds.filter((d) => d.currency === currency).reduce((s, d) => s + d.amount, 0),
      currency,
      topReason: [...reasons].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      deliveredShare: ds.filter((d) => d.proof === "signed" || d.proof === "delivered").length / ds.length,
      lastOpenedAt: ds.map((d) => d.openedAt).filter(Boolean).sort().at(-1) ?? null,
    };
  }).sort((a, b) => b.disputes - a.disputes || b.amount - a.amount);
}

/** Up to three prevention tips, strongest evidence first. Each one is a rule over the seller's own data. */
function tips(disputes: InsightDispute[], items: ItemRow[], now: number): Tip[] {
  const out: (Tip & { weight: number })[] = [];
  const notReceived = disputes.filter((d) => d.reason === NOT_RECEIVED);

  // 1. "Not received" claims on orders without delivery proof: the most preventable kind.
  const unproven = notReceived.filter((d) => d.proof === "no_tracking" || d.proof === "no_record" || d.proof === "not_delivered");
  if (unproven.length > 0) {
    out.push({
      id: "tracking",
      weight: unproven.length * 3,
      title: `${unproven.length} of ${plural(notReceived.length, "“not received” claim")} had no proof of delivery`,
      body:
        "Without a delivered scan, PayPal usually sides with the buyer on these. Ship with tracking, and add it on the Evidence page so Sira can upload it to PayPal before a buyer complains.",
      href: "/evidence",
      action: "Add tracking",
    });
  }

  // 2. "Not received" claims on parcels the carrier says were delivered, with no signature.
  const deliveredUnsigned = notReceived.filter((d) => d.proof === "delivered");
  if (deliveredUnsigned.length > 0) {
    const priciest = deliveredUnsigned.reduce((a, b) => (b.amount > a.amount ? b : a));
    const price = new Intl.NumberFormat("en-US", { style: "currency", currency: priciest.currency }).format(priciest.amount);
    out.push({
      id: "signature",
      weight: deliveredUnsigned.length * 2,
      title: `${plural(deliveredUnsigned.length, "\u201cnot received\u201d claim")} came on delivered parcels`,
      body: `Tracking showed ${deliveredUnsigned.length === 1 ? "it" : "these"} as delivered, but nobody signed. On pricier orders (like the ${price} one here), signature confirmation turns these into easy wins.`,
    });
  }

  // 3. "Not as described" claims clustering on one product: usually a listing problem.
  const inad = disputes.filter((d) => d.reason === NOT_AS_DESCRIBED);
  const inadByItem = new Map<string, number>();
  for (const d of inad) inadByItem.set(d.item, (inadByItem.get(d.item) ?? 0) + 1);
  const [inadItem, inadCount] = [...inadByItem].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (inadItem && inadCount) {
    out.push({
      id: "listing",
      weight: inadCount * 2 + (inadCount / inad.length >= 0.5 ? 1 : 0),
      title: `“${inadItem}” gets “not as described” claims`,
      body: `${inadCount} of your ${plural(inad.length, "“not as described” dispute")} ${inadCount === 1 ? "is" : "are"} about this item. Check its photos, size and materials match what ships, and say clearly what's included.`,
    });
  }

  // 4. One product with several disputes of any kind.
  const hot = items.find((i) => i.disputes >= 2 && i.item !== inadItem);
  if (hot) {
    out.push({
      id: "item",
      weight: hot.disputes,
      title: `“${hot.item}” has ${plural(hot.disputes, "dispute")}, the most of any product`,
      body: "Look at how it's packed, described and shipped. A small fix to one listing can remove a whole group of disputes.",
    });
  }

  // 5. Buyers who keep opening disputes.
  const byBuyer = new Map<string, InsightDispute[]>();
  for (const d of disputes) if (d.buyerKey) byBuyer.set(d.buyerKey, [...(byBuyer.get(d.buyerKey) ?? []), d]);
  const repeat = [...byBuyer.values()].filter((ds) => ds.length >= 2).sort((a, b) => b.length - a.length);
  if (repeat.length > 0) {
    const theirs = repeat.flat();
    const recent = theirs.filter((d) => d.openedAt && now - new Date(d.openedAt).getTime() <= 30 * DAY).length;
    out.push({
      id: "buyers",
      weight: repeat[0].length * 2,
      title:
        repeat.length === 1
          ? `${repeat[0][0].buyerName ?? "One buyer"} has opened ${plural(repeat[0].length, "dispute")} with you`
          : `${repeat.length} buyers have opened ${theirs.length} disputes between them`,
      body: `${recent > 1 ? `${recent} of those came in the last 30 days. ` : ""}Sira flags repeat disputers on every new case. For buyers like this, require a signature on delivery or consider declining future orders.`,
      href: "/disputes",
      action: "See your disputes",
    });
  }

  // 6. Many small disputes: an auto-refund rule saves time on cases not worth fighting.
  const small = disputes.filter((d) => d.amount < 25);
  if (small.length >= 2) {
    out.push({
      id: "auto-refund",
      weight: small.length,
      title: `${plural(small.length, "dispute")} ${small.length === 1 ? "was" : "were"} for under $25`,
      body: "Fighting a small claim can cost more of your time than it's worth. An auto-refund rule lets Sira settle these instantly, while you still review everything else.",
      href: "/settings",
      action: "Set a rule",
    });
  }

  return out
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((t): Tip => ({ id: t.id, title: t.title, body: t.body, href: t.href, action: t.action }));
}
