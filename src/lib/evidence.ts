import { supabaseAdmin } from "@/lib/supabase";
import { SHIPPING_STATUSES, TRACKING_PATTERN, type EvidenceField, type EvidenceRow, type ShippingStatus } from "@/lib/evidence-shared";

export type { EvidenceField, EvidenceRow } from "@/lib/evidence-shared";

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

/**
 * Every dispute that isn't resolved, with its order evidence (if any), soonest deadline first.
 * `sellerId` limits it to one seller's disputes (a signed-in seller); undefined means all (demo).
 */
export async function getEvidenceRows(sellerId?: string): Promise<EvidenceRow[]> {
  const db = supabaseAdmin();
  let disputesQuery = db
    .from("disputes")
    .select(
      "id, seller_id, reason, status, amount, currency, seller_response_due_at, tx:raw->disputed_transactions->0->>seller_transaction_id, buyer:raw->disputed_transactions->0->buyer->>name",
    )
    .neq("status", "RESOLVED")
    .order("seller_response_due_at", { ascending: true, nullsFirst: false });
  if (sellerId) disputesQuery = disputesQuery.eq("seller_id", sellerId);

  const [disputes, sellers, decisions] = await Promise.all([
    disputesQuery,
    db.from("sellers").select("id, name"),
    db
      .from("decisions")
      .select("dispute_id, created_at, recommendation:assessment->>recommendation")
      .not("assessment", "is", null)
      .order("created_at", { ascending: false }),
  ]);
  if (disputes.error) throw disputes.error;
  if (sellers.error) throw sellers.error;
  if (decisions.error) throw decisions.error;

  const txIds = disputes.data.map((d) => d.tx as string | null).filter((t): t is string => !!t);
  const orders = txIds.length
    ? await db.from("orders").select("*").in("paypal_transaction_id", txIds)
    : { data: [], error: null };
  if (orders.error) throw orders.error;

  const orderByTx = new Map(orders.data.map((o) => [o.paypal_transaction_id as string, o]));
  const sellerName = new Map(sellers.data.map((s) => [s.id, s.name as string]));
  const latest = new Map<string, (typeof decisions.data)[number]>();
  for (const r of decisions.data) if (!latest.has(r.dispute_id)) latest.set(r.dispute_id, r);
  const now = Date.now();

  return disputes.data.map((d) => {
    const tx = (d.tx as string | null) ?? null;
    const o = tx ? orderByTx.get(tx) : undefined;
    const report = latest.get(d.id);
    return {
      disputeId: d.id,
      transactionId: tx,
      buyerName: (d.buyer as string | null) ?? null,
      reason: d.reason,
      amount: d.amount,
      currency: d.currency,
      sellerName: d.seller_id ? (sellerName.get(d.seller_id) ?? null) : null,
      daysLeft: d.seller_response_due_at ? Math.ceil((new Date(d.seller_response_due_at).getTime() - now) / 86_400_000) : null,
      status: d.status,
      orderNumber: o?.order_number ?? null,
      carrier: o?.carrier ?? null,
      trackingNumber: o?.tracking_number ?? null,
      shippingStatus: o?.shipping_status ?? null,
      shippedAt: day(o?.shipped_at ?? null),
      deliveredAt: day(o?.delivered_at ?? null),
      signatureConfirmed: o?.signature_confirmed ?? null,
      shipToMatchesPayPal: o?.ship_to_matches_paypal ?? null,
      notes: o?.notes ?? null,
      simulated: o?.simulated ?? false,
      recommendation: (report?.recommendation as EvidenceRow["recommendation"]) ?? null,
      evidenceChangedSinceReport:
        !!o && !!report && new Date(o.updated_at).getTime() > new Date(report.created_at).getTime(),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Writing evidence: one whitelist + validator per editable field       */
/* ------------------------------------------------------------------ */

const text = (max: number) => (v: unknown) => {
  if (v === null || v === undefined || v === "") return { ok: true as const, value: null };
  if (typeof v !== "string" || v.trim().length > max) return { ok: false as const, error: `Keep it under ${max} characters.` };
  return { ok: true as const, value: v.trim() };
};
const date = (v: unknown) => {
  if (v === null || v === undefined || v === "") return { ok: true as const, value: null };
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
    return { ok: false as const, error: "Use a date like 2026-10-02." };
  }
  if (Date.parse(v) > Date.now() + 86_400_000) return { ok: false as const, error: "That date is in the future." };
  return { ok: true as const, value: `${v}T12:00:00Z` };
};
const bool = (v: unknown) =>
  v === null || v === undefined || typeof v === "boolean" ? { ok: true as const, value: v ?? null } : { ok: false as const, error: "Expected yes or no." };

/** Field → [orders column, validator]. Anything not listed here can't be written. */
export const FIELDS: Record<EvidenceField, [string, (v: unknown) => { ok: true; value: unknown } | { ok: false; error: string }]> = {
  orderNumber: ["order_number", text(60)],
  carrier: ["carrier", text(40)],
  trackingNumber: [
    "tracking_number",
    (v) => {
      const t = text(40)(typeof v === "string" ? v.replace(/\s+/g, " ") : v);
      if (t.ok && typeof t.value === "string" && !TRACKING_PATTERN.test(t.value)) {
        return { ok: false, error: "Tracking numbers are 6–40 letters and digits." };
      }
      return t;
    },
  ],
  shippingStatus: [
    "shipping_status",
    (v) =>
      v === null || v === "" || SHIPPING_STATUSES.includes(v as ShippingStatus)
        ? { ok: true, value: v || null }
        : { ok: false, error: "Pick a status from the list." },
  ],
  shippedAt: ["shipped_at", date],
  deliveredAt: ["delivered_at", date],
  signatureConfirmed: ["signature_confirmed", bool],
  shipToMatchesPayPal: ["ship_to_matches_paypal", bool],
  notes: ["notes", text(1000)],
};

/**
 * Writes some evidence fields for the order behind a dispute (creating the order row if needed).
 * Seller-entered evidence is real, so `simulated` is cleared.
 */
export async function writeEvidence(disputeId: string, values: Partial<Record<EvidenceField, unknown>>) {
  const db = supabaseAdmin();
  const { data: d, error } = await db
    .from("disputes")
    .select("id, seller_id, tx:raw->disputed_transactions->0->>seller_transaction_id")
    .eq("id", disputeId)
    .maybeSingle();
  if (error) throw error;
  if (!d) return { ok: false as const, error: "Dispute not found." };
  const tx = d.tx as string | null;
  if (!tx) return { ok: false as const, error: "PayPal didn't include a transaction ID for this dispute, so there's no order to attach evidence to." };

  const row: Record<string, unknown> = { paypal_transaction_id: tx, seller_id: d.seller_id, simulated: false, updated_at: new Date().toISOString() };
  for (const [field, raw] of Object.entries(values) as [EvidenceField, unknown][]) {
    const spec = FIELDS[field];
    if (!spec) return { ok: false as const, error: `Unknown field ${field}.` };
    const checked = spec[1](raw);
    if (!checked.ok) return { ok: false as const, error: checked.error };
    row[spec[0]] = checked.value;
  }

  const { error: upsertError } = await db.from("orders").upsert(row, { onConflict: "paypal_transaction_id" });
  if (upsertError) throw upsertError;
  return { ok: true as const };
}
