import { analyzeDispute, PROMPT_VERSION, type Assessment } from "@/lib/agent";
import { getBuyerHistory } from "@/lib/buyer-history";
import { liveTools } from "@/lib/investigate";
import { getOrder, type PayPalDisputeDetail } from "@/lib/dashboard";
import { supabaseAdmin } from "@/lib/supabase";

/** Our recommendation → the `decisions.action` values (named after the PayPal action that carries it out). */
const DECISION_ACTION: Record<Assessment["recommendation"], "fight" | "accept" | "offer_refund"> = {
  fight: "fight",
  refund: "accept",
  settle: "offer_refund",
};

export type AssessOutcome =
  | { status: "assessed"; decisionId: string; recommendation: string }
  | { status: "skipped"; reason: string };

/**
 * Runs the agent on a stored dispute and saves its report as a new `decisions` row.
 * The newest row for a dispute is its current report; older ones are kept as history.
 * Skips (without calling the model) when the seller doesn't need to act, or when this exact
 * version of the dispute was already assessed with the current prompt. `force` skips neither.
 */
export async function assessDispute(disputeId: string, { force = false } = {}): Promise<AssessOutcome> {
  const db = supabaseAdmin();

  const { data: dispute, error } = await db
    .from("disputes")
    .select("id, status, paypal_updated_at, raw")
    .eq("id", disputeId)
    .maybeSingle();
  if (error) throw error;
  if (!dispute) return { status: "skipped", reason: "dispute not in database" };

  if (!force && dispute.status !== "WAITING_FOR_SELLER_RESPONSE") {
    return { status: "skipped", reason: `not waiting on the seller (${dispute.status})` };
  }

  if (!force) {
    const { data: latest, error: latestError } = await db
      .from("decisions")
      .select("dispute_updated_at, prompt_version")
      .eq("dispute_id", disputeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;
    const sameVersion =
      latest?.prompt_version === PROMPT_VERSION &&
      latest.dispute_updated_at !== null &&
      dispute.paypal_updated_at !== null &&
      new Date(latest.dispute_updated_at).getTime() === new Date(dispute.paypal_updated_at).getTime();
    if (sameVersion) return { status: "skipped", reason: "already assessed at this version" };
  }

  const raw = dispute.raw as PayPalDisputeDetail & Record<string, unknown>;
  const asOf = new Date().toISOString();
  const [order, buyerHistory] = await Promise.all([
    getOrder(raw.disputed_transactions?.[0]?.seller_transaction_id),
    getBuyerHistory(disputeId, asOf),
  ]);
  const { assessment: a, model, inputTokens, outputTokens } = await analyzeDispute(
    { asOf, dispute: raw, order, buyerHistory },
    { tools: liveTools() },
  );

  const { data: inserted, error: insertError } = await db
    .from("decisions")
    .insert({
      dispute_id: disputeId,
      action: DECISION_ACTION[a.recommendation],
      confidence: a.confidence,
      reasoning: a.reasoning,
      draft_response: a.drafts[0]?.text ?? null,
      evidence: { key: a.key_evidence, missing: a.missing_evidence },
      model,
      risk: a.risk,
      urgency: a.urgency,
      settle_amount: a.settle_amount,
      assessment: a,
      prompt_version: PROMPT_VERSION,
      dispute_updated_at: dispute.paypal_updated_at,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  return { status: "assessed", decisionId: inserted.id, recommendation: a.recommendation };
}
