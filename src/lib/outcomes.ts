import { supabaseAdmin } from "@/lib/supabase";

// Outcome tracking: for each resolved dispute, what Sira advised, what the seller actually did,
// and how PayPal resolved it. Powers the dashboard's Results section and each dispute's Outcome card.

export type Choice = "fight" | "settle" | "refund";
export type Result = "won" | "settled" | "lost" | "other";

export type OutcomeRow = {
  disputeId: string;
  buyerName: string | null;
  reason: string | null;
  amount: number;
  currency: string;
  /** Sira's recommendation (the report the seller acted on, or the latest one). */
  advised: Choice | null;
  /** What the seller sent PayPal; null if they never responded. */
  did: Choice | null;
  /** True when the seller's auto-refund rule handled it. */
  autoRefunded: boolean;
  result: Result;
  /** PayPal's outcome code, e.g. RESOLVED_SELLER_FAVOUR. */
  outcomeCode: string | null;
  refunded: number;
  kept: number;
  /** Hours from the dispute opening to the seller's first response. */
  respondedHours: number | null;
  resolvedAt: string | null;
};

export type OutcomeSummary = {
  resolved: number;
  won: number;
  settled: number;
  lost: number;
  /** Money kept, per currency (largest first). */
  kept: { currency: string; amount: number }[];
  /** Disputes the seller fought, and how many of those they won. */
  fought: number;
  foughtWon: number;
  /** Where the seller followed Sira's advice, how often it ended the way that advice expects. */
  followed: number;
  heldUp: number;
  avgResponseHours: number | null;
  autoRefunded: number;
};

const WON = new Set(["RESOLVED_SELLER_FAVOUR", "CANCELED_BY_BUYER", "DENIED", "RESOLVED_WITH_PAYOUT"]);
const LOST = new Set(["RESOLVED_BUYER_FAVOUR", "ACCEPTED"]);

/** The PayPal action that carries out each choice. */
const ACTION_CHOICE: Record<string, Choice> = {
  provide_evidence: "fight",
  send_message: "fight",
  make_offer: "settle",
  accept_claim: "refund",
};
/** Strongest action first: an accepted claim or an offer decides what the seller "did", over a message. */
const ACTION_WEIGHT = ["accept_claim", "make_offer", "provide_evidence", "send_message"];

/** What following each piece of advice is expected to lead to. */
const EXPECTED: Record<Choice, Result> = { fight: "won", settle: "settled", refund: "lost" };

type DisputeRaw = {
  create_time?: string;
  update_time?: string;
  dispute_outcome?: { outcome_code?: string; amount_refunded?: { value: string; currency_code: string } };
  disputed_transactions?: { buyer?: { name?: string } }[];
};

export function classify(outcomeCode: string | null, amount: number, refunded: number): { result: Result; kept: number } {
  if (outcomeCode && WON.has(outcomeCode)) return { result: "won", kept: amount };
  if (outcomeCode && LOST.has(outcomeCode)) {
    if (refunded > 0 && refunded < amount) return { result: "settled", kept: amount - refunded };
    return { result: "lost", kept: Math.max(0, amount - (refunded || amount)) };
  }
  return { result: "other", kept: Math.max(0, amount - refunded) };
}

/** One resolved dispute's outcome, or null if it isn't resolved. */
export async function getDisputeOutcome(disputeId: string): Promise<OutcomeRow | null> {
  return (await getOutcomes(undefined, disputeId)).rows[0] ?? null;
}

/** Resolved disputes with their outcome, newest first; optionally for one seller (or one dispute) only. */
export async function getOutcomes(sellerId?: string, disputeId?: string): Promise<{ rows: OutcomeRow[]; summary: OutcomeSummary }> {
  const db = supabaseAdmin();
  let query = db.from("disputes").select("id, reason, amount, currency, paypal_created_at, raw").eq("status", "RESOLVED");
  if (sellerId) query = query.eq("seller_id", sellerId);
  if (disputeId) query = query.eq("id", disputeId);
  const { data: disputes, error } = await query;
  if (error) throw error;

  const ids = disputes.map((d) => d.id);
  const [decisions, actions] = ids.length
    ? await Promise.all([
        db.from("decisions").select("dispute_id, status, created_at, assessment").in("dispute_id", ids).not("assessment", "is", null).order("created_at", { ascending: false }),
        db.from("actions").select("dispute_id, action_type, success, created_at").in("dispute_id", ids).eq("success", true).order("created_at"),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (decisions.error) throw decisions.error;
  if (actions.error) throw actions.error;

  const rows: OutcomeRow[] = disputes.map((d) => {
    const raw = d.raw as DisputeRaw;
    const amount = Number(d.amount ?? 0);
    const currency = d.currency ?? "USD";
    const outcomeCode = raw.dispute_outcome?.outcome_code ?? null;
    const refunded = Number(raw.dispute_outcome?.amount_refunded?.value ?? 0);
    const { result, kept } = classify(outcomeCode, amount, refunded);

    // The report the seller acted on (submitted/approved), else the newest one.
    const reports = (decisions.data ?? []).filter((r) => r.dispute_id === d.id);
    const acted = reports.find((r) => r.status === "submitted" || r.status === "approved") ?? reports[0];
    const assessment = acted?.assessment as { recommendation?: Choice; rule?: string } | undefined;

    const sent = (actions.data ?? []).filter((a) => a.dispute_id === d.id);
    const strongest = [...sent].sort((a, b) => ACTION_WEIGHT.indexOf(a.action_type) - ACTION_WEIGHT.indexOf(b.action_type))[0];
    const first = sent[0];
    const openedAt = d.paypal_created_at ?? raw.create_time ?? null;

    return {
      disputeId: d.id,
      buyerName: raw.disputed_transactions?.[0]?.buyer?.name ?? null,
      reason: d.reason,
      amount,
      currency,
      advised: assessment?.recommendation ?? null,
      did: strongest ? (ACTION_CHOICE[strongest.action_type] ?? null) : null,
      autoRefunded: assessment?.rule === "auto_refund" && acted?.status === "submitted",
      result,
      outcomeCode,
      refunded,
      kept,
      respondedHours:
        first && openedAt ? Math.max(0, (new Date(first.created_at).getTime() - new Date(openedAt).getTime()) / 3_600_000) : null,
      resolvedAt: raw.update_time ?? null,
    };
  });
  rows.sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""));

  const keptBy = new Map<string, number>();
  for (const r of rows) keptBy.set(r.currency, (keptBy.get(r.currency) ?? 0) + r.kept);
  const followed = rows.filter((r) => r.advised && r.did === r.advised);
  const responded = rows.filter((r) => r.respondedHours !== null);
  const fought = rows.filter((r) => r.did === "fight");

  return {
    rows,
    summary: {
      resolved: rows.length,
      won: rows.filter((r) => r.result === "won").length,
      settled: rows.filter((r) => r.result === "settled").length,
      lost: rows.filter((r) => r.result === "lost").length,
      kept: [...keptBy].map(([currency, amount]) => ({ currency, amount })).sort((a, b) => b.amount - a.amount),
      fought: fought.length,
      foughtWon: fought.filter((r) => r.result === "won").length,
      followed: followed.length,
      heldUp: followed.filter((r) => EXPECTED[r.advised!] === r.result).length,
      avgResponseHours: responded.length ? responded.reduce((s, r) => s + r.respondedHours!, 0) / responded.length : null,
      autoRefunded: rows.filter((r) => r.autoRefunded).length,
    },
  };
}
