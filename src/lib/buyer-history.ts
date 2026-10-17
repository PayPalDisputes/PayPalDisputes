import { getAccessToken, PayPalError } from "@/lib/paypal";
import { supabaseAdmin } from "@/lib/supabase";

/** How the buyer's track record with this seller reads, worked out by fixed rules (not the model). */
export type BuyerSignal = "first_dispute" | "repeat_disputer" | "possible_serial_disputer" | "trusted_customer";

/** One of the buyer's other disputes with this seller. */
export type PastDispute = { id: string; reason: string | null; status: string | null; openedAt: string | null; deliveredParcel: boolean };

export type BuyerHistory = {
  buyerName: string | null;
  /** Other disputes this buyer opened with this seller in the last HISTORY_DAYS, newest first. */
  otherDisputes: PastDispute[];
  otherDisputesLast30Days: number;
  /** "Not received" claims on parcels our records show as delivered: the classic serial-disputer pattern. */
  notReceivedOnDeliveredParcels: number;
  /** Purchases from this seller in the last 31 days, or null when PayPal's transaction search isn't available. */
  recentPurchases: number | null;
  signal: BuyerSignal;
  summary: string;
};

const HISTORY_DAYS = 180;
const DAY = 86_400_000;

type DisputeRaw = {
  disputed_transactions?: { seller_transaction_id?: string; buyer?: { name?: string; payer_id?: string } }[];
};

/** Fixed rules for the signal, so the same history always reads the same way. */
export function buyerSignal(h: Pick<BuyerHistory, "otherDisputes" | "otherDisputesLast30Days" | "notReceivedOnDeliveredParcels" | "recentPurchases">): BuyerSignal {
  if (h.otherDisputesLast30Days >= 3 || h.notReceivedOnDeliveredParcels >= 2) return "possible_serial_disputer";
  if (h.otherDisputes.length > 0) return "repeat_disputer";
  if ((h.recentPurchases ?? 0) >= 5) return "trusted_customer";
  return "first_dispute";
}

function summarize(h: Omit<BuyerHistory, "summary">): string {
  const name = h.buyerName ?? "This buyer";
  const purchases = h.recentPurchases === null ? "" : ` ${h.recentPurchases} purchase${h.recentPurchases === 1 ? "" : "s"} from you in the last month.`;
  switch (h.signal) {
    case "possible_serial_disputer":
      return (
        `${name} has opened ${h.otherDisputes.length} other dispute${h.otherDisputes.length === 1 ? "" : "s"} with you ` +
        `(${h.otherDisputesLast30Days} in the last 30 days)` +
        (h.notReceivedOnDeliveredParcels > 0
          ? `, including ${h.notReceivedOnDeliveredParcels} "not received" claim${h.notReceivedOnDeliveredParcels === 1 ? "" : "s"} on parcels marked delivered`
          : "") +
        `. That's an unusual pattern worth noting.${purchases}`
      );
    case "repeat_disputer":
      return `${name} has opened ${h.otherDisputes.length} other dispute${h.otherDisputes.length === 1 ? "" : "s"} with you in the last ${HISTORY_DAYS / 30} months.${purchases}`;
    case "trusted_customer":
      return `${name} is a regular customer with no previous disputes.${purchases}`;
    case "first_dispute":
      return `This is ${h.buyerName ? `${h.buyerName}'s` : "the buyer's"} first dispute with you.${purchases}`;
  }
}

/**
 * Purchases this buyer made from the seller in the last 31 days, via PayPal's Transaction Search.
 * Returns null when the app doesn't have the Transaction Search permission (or the API fails),
 * so the rest of the history still works.
 */
async function recentPurchaseCount(payerId: string): Promise<number | null> {
  const end = new Date();
  const start = new Date(end.getTime() - 31 * DAY);
  const iso = (d: Date) => `${d.toISOString().slice(0, 19)}Z`;
  const base = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";
  try {
    const res = await fetch(
      `${base}/v1/reporting/transactions?start_date=${iso(start)}&end_date=${iso(end)}&fields=transaction_info,payer_info&page_size=500`,
      { headers: { Authorization: `Bearer ${await getAccessToken()}` } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      transaction_details?: { transaction_info?: { transaction_event_code?: string }; payer_info?: { account_id?: string } }[];
    };
    // T00xx event codes are payments received; count only this buyer's.
    return (body.transaction_details ?? []).filter(
      (t) => t.payer_info?.account_id === payerId && t.transaction_info?.transaction_event_code?.startsWith("T00"),
    ).length;
  } catch (err) {
    if (!(err instanceof PayPalError)) console.error("[buyer-history] transaction search failed", err);
    return null;
  }
}

/** The buyer's track record with this seller, as of `asOf` (disputes opened later are ignored). */
export async function getBuyerHistory(disputeId: string, asOf: string = new Date().toISOString()): Promise<BuyerHistory | null> {
  const db = supabaseAdmin();
  const { data: current, error } = await db.from("disputes").select("id, merchant_id, raw").eq("id", disputeId).maybeSingle();
  if (error) throw error;
  const buyer = (current?.raw as DisputeRaw | undefined)?.disputed_transactions?.[0]?.buyer;
  if (!current || !buyer?.payer_id) return null;

  const since = new Date(new Date(asOf).getTime() - HISTORY_DAYS * DAY).toISOString();
  let query = db
    .from("disputes")
    .select("id, reason, status, paypal_created_at, raw")
    .eq("raw->disputed_transactions->0->buyer->>payer_id", buyer.payer_id)
    .neq("id", disputeId)
    .gte("paypal_created_at", since)
    .lte("paypal_created_at", asOf)
    .order("paypal_created_at", { ascending: false });
  if (current.merchant_id) query = query.eq("merchant_id", current.merchant_id);
  const { data: others, error: othersError } = await query;
  if (othersError) throw othersError;

  // Which of those disputes were on parcels our order records show as delivered.
  const txIds = others.map((o) => (o.raw as DisputeRaw).disputed_transactions?.[0]?.seller_transaction_id).filter((t): t is string => !!t);
  const delivered = new Set<string>();
  if (txIds.length > 0) {
    const { data: orders, error: ordersError } = await db
      .from("orders")
      .select("paypal_transaction_id")
      .in("paypal_transaction_id", txIds)
      .eq("shipping_status", "DELIVERED");
    if (ordersError && ordersError.code !== "PGRST205") throw ordersError;
    for (const o of orders ?? []) delivered.add(o.paypal_transaction_id);
  }

  const otherDisputes: PastDispute[] = others.map((o) => ({
    id: o.id,
    reason: o.reason,
    status: o.status,
    openedAt: o.paypal_created_at,
    deliveredParcel: delivered.has((o.raw as DisputeRaw).disputed_transactions?.[0]?.seller_transaction_id ?? ""),
  }));
  const thirtyDaysAgo = new Date(asOf).getTime() - 30 * DAY;
  const partial = {
    buyerName: buyer.name ?? null,
    otherDisputes,
    otherDisputesLast30Days: otherDisputes.filter((o) => o.openedAt && new Date(o.openedAt).getTime() >= thirtyDaysAgo).length,
    notReceivedOnDeliveredParcels: otherDisputes.filter((o) => o.reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" && o.deliveredParcel).length,
    recentPurchases: await recentPurchaseCount(buyer.payer_id),
  };
  const signal = buyerSignal(partial);
  const history = { ...partial, signal };
  return { ...history, summary: summarize(history) };
}
