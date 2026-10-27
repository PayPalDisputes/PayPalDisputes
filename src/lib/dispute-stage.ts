// Plain-language "where it stands" for a dispute, plus the 5-step progress line the dashboard shows
// (Opened → Sira investigated → You responded → Other side's turn → Resolved). Pure: safe on client and server.

export const STAGE_STEPS = ["Opened", "Sira investigated", "You responded", "Buyer or PayPal's turn", "Resolved"] as const;

export type StageInput = {
  status: string | null;
  outcome?: string | null;
  report: { recommendation: "fight" | "refund" | "settle"; status: string; current: boolean } | null;
};

const WON = new Set(["RESOLVED_SELLER_FAVOUR", "CANCELED_BY_BUYER", "DENIED", "RESOLVED_WITH_PAYOUT"]);
const LOST = new Set(["RESOLVED_BUYER_FAVOUR", "ACCEPTED"]);

/** Which step (1–5) the dispute has reached. */
export function stageStep(d: StageInput): number {
  if (d.status === "RESOLVED") return 5;
  if (d.status === "WAITING_FOR_BUYER_RESPONSE" || d.status === "UNDER_REVIEW") return 4;
  if (d.report && (d.report.status === "approved" || d.report.status === "submitted")) return 3;
  if (d.report) return 2;
  return 1;
}

/** "Your turn · draft ready", "Buyer's turn", "Won"… */
export function stageLabel(d: StageInput): string {
  switch (d.status) {
    case "RESOLVED":
      if (d.outcome && WON.has(d.outcome)) return "Won";
      if (d.outcome && LOST.has(d.outcome)) return "Refunded";
      return "Closed";
    case "WAITING_FOR_SELLER_RESPONSE":
      return d.report?.status === "pending_review" && d.report.current ? "Your turn · draft ready" : "Your turn";
    case "WAITING_FOR_BUYER_RESPONSE":
      return "Buyer's turn";
    case "UNDER_REVIEW":
      return "PayPal is reviewing";
    case "OPEN":
      return "Opened";
    default:
      return d.status ? d.status.charAt(0) + d.status.slice(1).toLowerCase().replaceAll("_", " ") : "—";
  }
}

/** "Fight", "Settle for $40.00", "Refund", or null when Sira hasn't assessed it. */
export function callLabel(
  report: { recommendation: "fight" | "refund" | "settle"; settleAmount?: number | null } | null,
  currency: string | null,
): string | null {
  if (!report) return null;
  if (report.recommendation === "settle")
    return report.settleAmount != null
      ? `Settle for ${new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(report.settleAmount)}`
      : "Settle";
  return report.recommendation === "fight" ? "Fight" : "Refund";
}

/** "Due today", "Due in 3 days", "Overdue". */
export function dueLabel(daysLeft: number | null): string | null {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return "Overdue";
  if (daysLeft === 0) return "Due today";
  return `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
}
