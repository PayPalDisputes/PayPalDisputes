import type { BuyerSignal } from "@/lib/buyer-history";
import type { SellerProtectionStatus } from "@/lib/agent";

// Sira's settlement formula: whether to fight, refund, or offer a partial refund, and how much.
// Worked out in code from the case facts, never by the model.
//
//   p     = the chance the seller loses if they fight (see lossOdds)
//   A     = the disputed amount
//   F     = PayPal's dispute fee, paid on top of the refund when the seller loses
//
//   cost of fighting     C = p × (A + F)     what the seller expects to lose by contesting
//   buyer's fair share   B = p × A           what the buyer expects to get by waiting for PayPal
//   offer                O = (B + C) / 2 = p × (A + F/2)
//
// Any offer between B and C leaves both sides better off than letting PayPal decide; the offer
// sits halfway, so the buyer has a reason to take it and the seller still saves money.
// Below LOW_ODDS the seller should fight; above HIGH_ODDS, or when the offer comes within 10% of
// the full amount, a full refund is simpler.

/** PayPal's standard dispute fee, in the dispute's currency. */
export const DISPUTE_FEE = 15;
const LOW_ODDS = 0.25;
const HIGH_ODDS = 0.75;

export type LossOddsInput = {
  reason: string;
  sellerProtection: { status: SellerProtectionStatus; problems: string[] };
  earlierRefund: boolean;
  daysLeft: number | null;
  buyerSignal?: BuyerSignal | null;
  /** The model's risk, used only for claims the rules can't judge (not as described, other). */
  modelRisk?: "high" | "medium" | "low";
};

export type LossOdds = { p: number; basis: string; ruleBased: boolean };

const MODEL_RISK_ODDS = { low: 0.15, medium: 0.5, high: 0.85 } as const;

/** The chance the seller loses if they fight, and why. */
export function lossOdds(x: LossOddsInput): LossOdds {
  const odds = baseOdds(x);
  // A buyer with an unusual dispute pattern makes a borderline case a little stronger for the seller,
  // but never turns a losing case into a fight.
  if (x.buyerSignal === "possible_serial_disputer" && odds.p > LOW_ODDS && odds.p < HIGH_ODDS) {
    return { ...odds, p: round2(odds.p * 0.8), basis: `${odds.basis}; the buyer's dispute pattern lowers it a little` };
  }
  return odds;
}

function baseOdds(x: LossOddsInput): LossOdds {
  if (x.earlierRefund) return { p: 0.05, basis: "The buyer was already refunded, so the refund id answers the claim", ruleBased: true };

  if (x.reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" || x.reason === "UNAUTHORISED") {
    const sp = x.sellerProtection;
    if (sp.status === "met") return { p: 0.1, basis: "Delivery to the PayPal address is proven, so Seller Protection applies", ruleBased: true };
    if (sp.status === "pending_delivery") {
      return x.daysLeft !== null && x.daysLeft < 3
        ? { p: 0.5, basis: "The parcel is still in transit and the deadline is close", ruleBased: true }
        : { p: 0.2, basis: "The parcel is in transit with time to arrive before the deadline", ruleBased: true };
    }
    const text = sp.problems.join(" ");
    // Delivered, but over the signature threshold without one: PayPal can still side with the seller.
    if (sp.problems.length === 1 && /signature confirmation/.test(text)) {
      return { p: 0.6, basis: "Delivered, but there's no signature on an order that needs one", ruleBased: true };
    }
    if (/isn't on the PayPal transaction/.test(text)) return { p: 0.9, basis: "Shipped to an address that isn't on the PayPal transaction", ruleBased: true };
    return { p: 0.95, basis: "There's no proof of delivery that PayPal accepts", ruleBased: true };
  }

  const risk = x.modelRisk ?? "medium";
  return { p: MODEL_RISK_ODDS[risk], basis: `Judged from the buyer's claim and the evidence (${risk} risk)`, ruleBased: false };
}

export type SettlementPlan = {
  recommendation: "fight" | "refund" | "settle";
  /** The partial refund to offer when settling, else null. */
  offer: number | null;
  odds: LossOdds;
  /** The numbers behind the plan, for the seller to see. */
  costOfFighting: number;
  buyerFairShare: number;
};

/** Whether to fight, refund or settle, and the offer, from the loss odds and the amount. */
export function settlementPlan(amount: number, odds: LossOdds, fee = DISPUTE_FEE): SettlementPlan {
  const costOfFighting = round2(odds.p * (amount + fee));
  const buyerFairShare = round2(odds.p * amount);
  const base = { odds, costOfFighting, buyerFairShare };
  if (odds.p <= LOW_ODDS) return { ...base, recommendation: "fight", offer: null };
  if (odds.p >= HIGH_ODDS) return { ...base, recommendation: "refund", offer: null };
  const offer = roundOffer((buyerFairShare + costOfFighting) / 2);
  if (offer >= amount * 0.9) return { ...base, recommendation: "refund", offer: null };
  return { ...base, recommendation: "settle", offer };
}

/** Whole amounts under 100, multiples of 5 above, so the offer reads as a considered number. */
function roundOffer(x: number) {
  return x < 100 ? Math.ceil(x) : Math.ceil(x / 5) * 5;
}

const round2 = (x: number) => Math.round(x * 100) / 100;
