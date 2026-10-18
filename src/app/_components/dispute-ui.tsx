import type { PayPalAction } from "@/lib/agent";
import type { DisputeRow } from "@/lib/dashboard";

export type Recommendation = "fight" | "refund" | "settle";
export type Level = "high" | "medium" | "low";

export const RECOMMENDATION: Record<Recommendation, { label: string; style: string }> = {
  fight: { label: "Fight", style: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200" },
  refund: { label: "Refund", style: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" },
  settle: { label: "Settle", style: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200" },
};

const LEVEL_STYLES: Record<Level, string> = {
  high: "border-red-200 text-red-700 dark:border-red-900 dark:text-red-400",
  medium: "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-400",
  low: "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400",
};

/** "Fight", "Refund" or "Settle for $12.00" in the recommendation's colour. */
export function RecommendationBadge({
  recommendation,
  settleAmount,
  currency,
  size = "md",
}: {
  recommendation: Recommendation;
  settleAmount?: number | null;
  currency?: string | null;
  size?: "sm" | "md";
}) {
  const rec = RECOMMENDATION[recommendation];
  const sizing = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-base";
  return (
    <span className={`inline-block whitespace-nowrap rounded-md font-semibold ${sizing} ${rec.style}`}>
      {rec.label}
      {recommendation === "settle" && settleAmount != null && ` for ${formatAmount(settleAmount, currency ?? null)}`}
    </span>
  );
}

export function LevelBadge({ name, level }: { name: string; level: Level }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEVEL_STYLES[level]}`}>
      {name}: {level}
    </span>
  );
}

/** "Evidence pack (PDF)" link shown on evidence drafts; opens the preview in a new tab. */
export function EvidencePackLink({ disputeId }: { disputeId: string }) {
  return (
    <a
      href={`/api/disputes/${encodeURIComponent(disputeId)}/evidence-pack`}
      target="_blank"
      rel="noopener"
      className="float-right font-medium text-sky-700 hover:underline dark:text-sky-400"
    >
      📎 Evidence pack (PDF)
    </a>
  );
}

/** What each agent draft does once sent, in seller-facing words. */
export const DRAFT_LABELS: Record<PayPalAction, string> = {
  provide_evidence: "Submit evidence",
  send_message: "Message",
  make_offer: "Offer note",
  accept_claim: "Accept & refund note",
};

const REASONS: Record<string, string> = {
  MERCHANDISE_OR_SERVICE_NOT_RECEIVED: "Item not received",
  MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: "Not as described",
  UNAUTHORISED: "Unauthorized",
  CREDIT_NOT_PROCESSED: "Credit not processed",
  DUPLICATE_TRANSACTION: "Duplicate transaction",
  INCORRECT_AMOUNT: "Incorrect amount",
  PAYMENT_BY_OTHER_MEANS: "Paid by other means",
  CANCELED_RECURRING_BILLING: "Canceled subscription",
  PROBLEM_WITH_REMITTANCE: "Problem with remittance",
  OTHER: "Other",
};

export function reasonLabel(reason: string | null) {
  return reason ? (REASONS[reason] ?? humanize(reason)) : "—";
}

/** Turns PayPal's ENUM_STYLE values into "Enum style". */
export function humanize(value: string | null) {
  if (!value) return "—";
  const words = value.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(amount);
}

/** "5 days left" / "Due today" / "Overdue", coloured by urgency. Only meaningful while PayPal waits on the seller. */
export function Deadline({ dueAt, daysLeft: days, status }: Pick<DisputeRow, "dueAt" | "daysLeft" | "status">) {
  if (status !== "WAITING_FOR_SELLER_RESPONSE" || !dueAt || days === null) {
    return <span className="text-zinc-400">—</span>;
  }
  const date = new Date(dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const [label, colour] =
    days < 0
      ? ["Overdue", "text-red-600 dark:text-red-400"]
      : days === 0
        ? ["Due today", "text-red-600 dark:text-red-400"]
        : [`${days} day${days === 1 ? "" : "s"} left`, days <= 3 ? "text-amber-600 dark:text-amber-400" : ""];
  return (
    <span className={colour}>
      {label} <span className="text-zinc-400">· {date}</span>
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  WAITING_FOR_SELLER_RESPONSE: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  WAITING_FOR_BUYER_RESPONSE: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  UNDER_REVIEW: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  RESOLVED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function StatusBadge({ status }: { status: string | null }) {
  const label = status === "WAITING_FOR_SELLER_RESPONSE" ? "Needs response" : humanize(status?.replace(/^WAITING_FOR_/, "Waiting for ") ?? null);
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status ?? ""] ?? STATUS_STYLES.RESOLVED
      }`}
    >
      {label}
    </span>
  );
}
