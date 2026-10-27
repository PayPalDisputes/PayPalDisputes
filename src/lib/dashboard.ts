import type { Assessment } from "@/lib/agent";
import { getBuyerHistory, type BuyerHistory } from "@/lib/buyer-history";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase";

export type DisputeRow = {
  id: string;
  sellerName: string | null;
  merchantId: string | null;
  reason: string | null;
  status: string | null;
  stage: string | null;
  amount: number | null;
  currency: string | null;
  dueAt: string | null;
  /** Whole days until the seller's deadline (negative once overdue); null when there's none. */
  daysLeft: number | null;
  updatedAt: string | null;
};

/** The latest AI report on a dispute, as much as the list needs. */
export type ReportSummary = {
  recommendation: "fight" | "refund" | "settle";
  settleAmount: number | null;
  risk: "high" | "medium" | "low" | null;
  status: Decision["status"];
  /** False when PayPal has updated the dispute since this report was written. */
  current: boolean;
};

export type ListedDispute = DisputeRow & { report: ReportSummary | null };

function reportSummary(
  r: { status: string; risk: string | null; settle_amount: number | null; dispute_updated_at: string | null; recommendation: unknown } | undefined,
  paypalUpdatedAt: string | null,
): ReportSummary | null {
  if (!r) return null;
  return {
    recommendation: r.recommendation as ReportSummary["recommendation"],
    settleAmount: r.settle_amount,
    risk: r.risk as ReportSummary["risk"],
    status: r.status as Decision["status"],
    current:
      !paypalUpdatedAt ||
      !r.dispute_updated_at ||
      new Date(r.dispute_updated_at).getTime() >= new Date(paypalUpdatedAt).getTime(),
  };
}

type Money = { value: string; currency_code: string };

/** The parts of PayPal's full dispute object (stored in `disputes.raw`) the detail page reads. */
export type PayPalDisputeDetail = {
  create_time?: string;
  messages?: { posted_by: "BUYER" | "SELLER" | string; time_posted: string; content: string }[];
  evidences?: {
    evidence_type: string;
    source: string;
    date?: string;
    notes?: string;
    evidence_info?: { tracking_info?: { carrier_name: string; tracking_number: string }[]; refund_ids?: string[] };
    documents?: { name: string }[];
  }[];
  offer?: {
    buyer_requested_amount?: Money;
    seller_offered_amount?: Money;
    history?: { offer_time: string; actor: string; event_type: string; offer_amount?: Money }[];
  };
  fund_movements?: { type: string; reason: string; amount: Money }[];
  disputed_transactions?: {
    buyer?: { name?: string };
    items?: { item_name?: string; item_description?: string; item_quantity?: string }[];
    create_time?: string;
    gross_amount?: Money;
    transaction_status?: string;
    seller_transaction_id?: string;
    seller_protection_eligible?: boolean;
    seller_protection_type?: string;
  }[];
  links?: { rel: string; method: string }[];
  buyer_response_due_date?: string;
};

export type ShippingStatus = "NOT_SHIPPED" | "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED_TO_SENDER";

/** The seller's own record of the order behind a dispute (`orders` table). */
export type OrderEvidence = {
  orderNumber: string | null;
  itemDescription: string | null;
  shipToName: string | null;
  shipToAddress: string | null;
  shipToMatchesPayPal: boolean | null;
  carrier: string | null;
  trackingNumber: string | null;
  shippingStatus: ShippingStatus | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  signatureConfirmed: boolean | null;
  trackingEvents: { at: string; location?: string; description: string }[];
  notes: string | null;
  simulated: boolean;
  /** What we last uploaded to PayPal's tracking for this transaction (SHIPPED/DELIVERED), if anything. */
  payPalTrackingStatus: string | null;
  payPalTrackingUploadedAt: string | null;
  payPalTrackingError: string | null;
};

/** The agent's latest report on a dispute (`decisions` table). */
export type Decision = {
  id: string;
  status: "pending_review" | "approved" | "rejected" | "submitted" | "failed";
  model: string | null;
  promptVersion: string | null;
  createdAt: string;
  /** False when PayPal has updated the dispute since this report was written. */
  current: boolean;
  assessment: Assessment;
  /** What was sent to PayPal for this report, oldest first. */
  actions: SentAction[];
};

export type SentAction = { actionType: string; success: boolean; createdAt: string; error: string | null };

export type DisputeDetail = DisputeRow & {
  raw: PayPalDisputeDetail;
  order: OrderEvidence | null;
  decision: Decision | null;
  buyerHistory: BuyerHistory | null;
};

/** The newest decision for a dispute, or null if the agent hasn't assessed it. */
async function getLatestDecision(disputeId: string, paypalUpdatedAt: string | null): Promise<Decision | null> {
  const { data: d, error } = await supabaseAdmin()
    .from("decisions")
    .select("id, status, model, prompt_version, created_at, dispute_updated_at, assessment")
    .eq("dispute_id", disputeId)
    .not("assessment", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!d) return null;

  const { data: sent, error: sentError } = await supabaseAdmin()
    .from("actions")
    .select("action_type, success, created_at, response")
    .eq("decision_id", d.id)
    .order("created_at");
  if (sentError) throw sentError;

  return {
    id: d.id,
    status: d.status,
    model: d.model,
    promptVersion: d.prompt_version,
    createdAt: d.created_at,
    current:
      !paypalUpdatedAt ||
      !d.dispute_updated_at ||
      new Date(d.dispute_updated_at).getTime() >= new Date(paypalUpdatedAt).getTime(),
    assessment: d.assessment as Assessment,
    actions: sent.map((a) => {
      const body = (a.response as { body?: { message?: string; details?: { description?: string }[] } } | null)?.body;
      return {
        actionType: a.action_type,
        success: a.success,
        createdAt: a.created_at,
        error: a.success ? null : (body?.details?.[0]?.description ?? body?.message ?? "PayPal rejected it"),
      };
    }),
  };
}

/** The order matching a seller-side PayPal transaction id, or null if there's no record. */
export async function getOrder(paypalTransactionId: string | undefined): Promise<OrderEvidence | null> {
  if (!paypalTransactionId) return null;
  const { data: o, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("paypal_transaction_id", paypalTransactionId)
    .maybeSingle();
  if (error) {
    // PGRST205: table doesn't exist yet (supabase/orders.sql not run). Show no evidence rather than crash.
    if (error.code === "PGRST205") return null;
    throw error;
  }
  if (!o) return null;

  return {
    orderNumber: o.order_number,
    itemDescription: o.item_description,
    shipToName: o.ship_to_name,
    shipToAddress: o.ship_to_address,
    shipToMatchesPayPal: o.ship_to_matches_paypal,
    carrier: o.carrier,
    trackingNumber: o.tracking_number,
    shippingStatus: o.shipping_status,
    shippedAt: o.shipped_at,
    deliveredAt: o.delivered_at,
    signatureConfirmed: o.signature_confirmed,
    trackingEvents: o.tracking_events ?? [],
    notes: o.notes,
    simulated: o.simulated,
    payPalTrackingStatus: o.paypal_tracking_status ?? null,
    payPalTrackingUploadedAt: o.paypal_tracking_uploaded_at ?? null,
    payPalTrackingError: o.paypal_tracking_error ?? null,
  };
}

/** One dispute with PayPal's full object, or null if it isn't in the database. */
export async function getDisputeDetail(id: string): Promise<DisputeDetail | null> {
  const db = supabaseAdmin();
  const { data: d, error } = await db
    .from("disputes")
    .select("id, seller_id, merchant_id, reason, status, lifecycle_stage, amount, currency, seller_response_due_at, paypal_updated_at, raw, sellers(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!d) return null;

  const seller = d.sellers as { name: string } | { name: string }[] | null;
  const raw = d.raw as PayPalDisputeDetail;
  const [order, decision, buyerHistory] = await Promise.all([
    getOrder(raw.disputed_transactions?.[0]?.seller_transaction_id),
    getLatestDecision(d.id, d.paypal_updated_at),
    getBuyerHistory(d.id),
  ]);
  return {
    id: d.id,
    sellerName: (Array.isArray(seller) ? seller[0]?.name : seller?.name) ?? null,
    merchantId: d.merchant_id,
    reason: d.reason,
    status: d.status,
    stage: d.lifecycle_stage,
    amount: d.amount,
    currency: d.currency,
    dueAt: d.seller_response_due_at,
    daysLeft: d.seller_response_due_at
      ? Math.ceil((new Date(d.seller_response_due_at).getTime() - Date.now()) / 86_400_000)
      : null,
    updatedAt: d.paypal_updated_at,
    raw,
    order,
    decision,
    buyerHistory,
  };
}

/** A dispute as the dashboard pages show it: the list row plus buyer, outcome and the latest AI report. */
export type HomeDispute = ListedDispute & {
  sellerId: string | null;
  buyerName: string | null;
  /** PayPal's outcome code once resolved, e.g. RESOLVED_SELLER_FAVOUR. */
  outcome: string | null;
  /** The first disputed item's name, as the buyer saw it. */
  item: string | null;
  openedAt: string | null;
};

/** Everything the dashboard home needs, optionally narrowed to one seller. */
export async function getHomeData(sellerId?: string): Promise<{ disputes: HomeDispute[]; sellers: { id: string; name: string }[] }> {
  const db = supabaseAdmin();
  let disputesQuery = db
    .from("disputes")
    .select(
      "id, seller_id, merchant_id, reason, status, lifecycle_stage, amount, currency, seller_response_due_at, paypal_created_at, paypal_updated_at, buyer:raw->disputed_transactions->0->buyer->>name, outcome:raw->dispute_outcome->>outcome_code, item:raw->disputed_transactions->0->items->0->>item_name",
    )
    .order("paypal_updated_at", { ascending: false, nullsFirst: false });
  if (sellerId) disputesQuery = disputesQuery.eq("seller_id", sellerId);

  const [disputes, sellers, decisions] = await Promise.all([
    disputesQuery,
    db.from("sellers").select("id, name").order("name"),
    db
      .from("decisions")
      .select("dispute_id, status, risk, settle_amount, dispute_updated_at, recommendation:assessment->>recommendation")
      .not("assessment", "is", null)
      .order("created_at", { ascending: false }),
  ]);
  if (disputes.error) throw disputes.error;
  if (sellers.error) throw sellers.error;
  if (decisions.error) throw decisions.error;

  // Newest decision per dispute (rows are already newest first).
  const latest = new Map<string, (typeof decisions.data)[number]>();
  for (const d of decisions.data) if (!latest.has(d.dispute_id)) latest.set(d.dispute_id, d);

  const now = Date.now();
  const sellerNames = new Map(sellers.data.map((s) => [s.id, s.name as string]));

  return {
    sellers: sellers.data as { id: string; name: string }[],
    disputes: disputes.data.map((d) => {
      return {
        id: d.id,
        sellerId: d.seller_id,
        sellerName: d.seller_id ? (sellerNames.get(d.seller_id) ?? null) : null,
        merchantId: d.merchant_id,
        reason: d.reason,
        status: d.status,
        stage: d.lifecycle_stage,
        amount: d.amount,
        currency: d.currency,
        dueAt: d.seller_response_due_at,
        daysLeft: d.seller_response_due_at
          ? Math.ceil((new Date(d.seller_response_due_at).getTime() - now) / 86_400_000)
          : null,
        updatedAt: d.paypal_updated_at,
        buyerName: (d.buyer as string | null) ?? null,
        outcome: (d.outcome as string | null) ?? null,
        item: (d.item as string | null)?.trim() || null,
        openedAt: d.paypal_created_at,
        report: reportSummary(latest.get(d.id), d.paypal_updated_at),
      };
    }),
  };
}

/** Per-request memo so the app layout and the page can both ask without querying twice. */
export const getHomeDataCached = cache(getHomeData);
