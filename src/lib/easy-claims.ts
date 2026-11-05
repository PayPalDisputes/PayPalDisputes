import { caseFacts, draftsFor, planFor, settlementSummary, type Assessment, type DisputeInput } from "@/lib/agent";
import type { EasyClaimKind } from "@/lib/easy-claim-kinds";

// Easy claims: cases simple enough that the facts settle them, so Sira prepares the response from
// its templates without calling the model (instant, and free). Anything with judgement in it (a
// damage claim, a missing signature, a parcel sent to the wrong address, a chargeback) still gets
// the full investigation and waits for the seller.

const REASONING: Record<EasyClaimKind, string> = {
  delivered:
    "The carrier confirms delivery to the address on the PayPal transaction, which is what Seller Protection asks for. Sending PayPal the tracking and the order record should settle this in your favour.",
  already_refunded:
    "Your records show the buyer was already refunded. Accepting the claim would refund them twice, so Sira sends PayPal the refund id instead.",
  in_transit:
    "The parcel is still moving and there's time before the deadline. Sira shares the tracking with the buyer and asks them to wait; evidence can follow once it's delivered.",
};

/** Which kind of easy claim this is, or null when it needs the full investigation. */
export function easyClaimKind(input: DisputeInput): EasyClaimKind | null {
  const f = caseFacts(input);
  const stage = (input.dispute as { dispute_life_cycle_stage?: string }).dispute_life_cycle_stage;
  if (stage === "CHARGEBACK" || stage === "ARBITRATION" || stage === "PRE_ARBITRATION") return null;

  const reason = f.d.reason ?? "";
  if (f.earlierRefund.found && f.allowed.has("provide_evidence") && /refund id/i.test(input.order?.notes ?? "")) return "already_refunded";
  if (f.earlierRefund.found) return null;
  if (reason !== "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" && reason !== "UNAUTHORISED") return null;
  if (f.sellerProtection.status === "met" && f.allowed.has("provide_evidence")) return "delivered";
  if (
    reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" &&
    f.sellerProtection.status === "pending_delivery" &&
    (f.urgency.daysLeft ?? 0) >= 3 &&
    f.allowed.has("send_message")
  ) {
    return "in_transit";
  }
  return null;
}

/** The report for an easy claim: the formula's plan and the filled-in templates, no model call. */
export function easyClaimAssessment(input: DisputeInput, kind: EasyClaimKind): Assessment {
  const f = caseFacts(input);
  const plan = planFor(input, f);
  const o = input.order;
  const key_evidence = [
    o?.carrier && o.trackingNumber ? `${o.carrier} tracking ${o.trackingNumber}` : null,
    o?.deliveredAt && o.shippingStatus === "DELIVERED" ? `Delivered ${new Date(o.deliveredAt).toUTCString().slice(5, 16)} to the PayPal address` : null,
    o?.signatureConfirmed ? "Signed for on delivery" : null,
    kind === "already_refunded" ? "Refund already issued (refund id in your notes)" : null,
  ].filter((x): x is string => x !== null);
  return {
    rule: "easy_claim",
    risk: "low",
    risk_reason: plan.odds.basis + ".",
    recommendation: plan.recommendation,
    settle_amount: plan.offer,
    settlement: settlementSummary(plan),
    confidence: 0.9,
    reasoning: REASONING[kind],
    alternatives: [],
    key_evidence,
    missing_evidence: [],
    drafts: draftsFor(input, f, plan),
    urgency: f.urgency.urgency,
    urgency_reason: f.urgency.reason,
    investigation: [],
  };
}
