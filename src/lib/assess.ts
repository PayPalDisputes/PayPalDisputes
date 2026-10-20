import { analyzeDispute, computeUrgency, findEarlierRefund, PROMPT_VERSION, type Assessment } from "@/lib/agent";
import { getBuyerHistory } from "@/lib/buyer-history";
import { liveTools } from "@/lib/investigate";
import { actionsMode, approveDecision } from "@/lib/respond";
import { getSellerPolicy, type SellerPolicy } from "@/lib/seller-policy";
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
  | { status: "auto_refunded"; decisionId: string; sent: boolean }
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
    .select("id, seller_id, status, amount, currency, paypal_updated_at, raw")
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
  const [order, buyerHistory, policy] = await Promise.all([
    getOrder(raw.disputed_transactions?.[0]?.seller_transaction_id),
    getBuyerHistory(disputeId, asOf),
    getSellerPolicy(dispute.seller_id),
  ]);

  // The seller's auto-refund rule, checked before spending anything on the model.
  const allowed = new Set((raw.links ?? []).filter((l) => l.method === "POST").map((l) => l.rel));
  const amount = Number(dispute.amount);
  if (
    policy.autoRefundEnabled &&
    policy.autoRefundUnder !== null &&
    amount > 0 &&
    amount < policy.autoRefundUnder &&
    dispute.status === "WAITING_FOR_SELLER_RESPONSE" &&
    allowed.has("accept_claim") &&
    !findEarlierRefund(order).found
  ) {
    const a = autoRefundAssessment(raw, asOf, amount, dispute.currency, policy);
    const decisionId = await saveDecision(disputeId, a, "rule:auto_refund", dispute.paypal_updated_at, 0, 0);
    if (actionsMode() !== "live") return { status: "auto_refunded", decisionId, sent: false };
    const result = await approveDecision(decisionId, []);
    return { status: "auto_refunded", decisionId, sent: result.ok };
  }

  const { assessment: a, model, inputTokens, outputTokens } = await analyzeDispute(
    { asOf, dispute: raw, order, buyerHistory, sellerPolicy: policy },
    { tools: liveTools() },
  );
  const decisionId = await saveDecision(disputeId, a, model, dispute.paypal_updated_at, inputTokens, outputTokens);
  return { status: "assessed", decisionId, recommendation: a.recommendation };
}

const money = (amount: number, currency: string | null) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(amount);

/** The report for a dispute the seller's auto-refund rule handles: no model call, just the refund. */
function autoRefundAssessment(
  raw: PayPalDisputeDetail & Record<string, unknown>,
  asOf: string,
  amount: number,
  currency: string | null,
  policy: SellerPolicy,
): Assessment {
  const urgency = computeUrgency(raw as Parameters<typeof computeUrgency>[0], asOf);
  const limit = money(policy.autoRefundUnder ?? 0, currency);
  return {
    rule: "auto_refund",
    recommendation: "refund",
    settle_amount: null,
    risk: "low",
    risk_reason: "Handled by your auto-refund rule, so there's nothing left to contest.",
    confidence: 1,
    reasoning: `Your auto-refund rule refunds disputes under ${limit}. This one is for ${money(amount, currency)}, so Sira accepts the claim and PayPal refunds the buyer. Change the rule in Settings.`,
    alternatives: [],
    key_evidence: [`Dispute amount ${money(amount, currency)} is under your auto-refund limit of ${limit}.`],
    missing_evidence: [],
    drafts: [
      {
        action: "accept_claim",
        recipient: "paypal",
        text: `We accept this claim and authorise a full refund of ${money(amount, currency)} to the buyer, under our policy of refunding small disputes promptly.`,
      },
    ],
    urgency: urgency.urgency,
    urgency_reason: urgency.reason,
    investigation: [],
  };
}

async function saveDecision(
  disputeId: string,
  a: Assessment,
  model: string,
  disputeUpdatedAt: string | null,
  inputTokens: number | null,
  outputTokens: number | null,
): Promise<string> {
  const { data: inserted, error: insertError } = await supabaseAdmin()
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
      dispute_updated_at: disputeUpdatedAt,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return inserted.id;
}

