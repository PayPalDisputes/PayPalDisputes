import Link from "next/link";
import type { BuyerHistory, BuyerSignal } from "@/lib/buyer-history";
import { reasonLabel } from "@/app/_components/dispute-ui";

// The signal is a coloured word, not a pill: amber for an unusual pattern, green for a regular customer.
const SIGNAL: Record<BuyerSignal, { label: string; style: string }> = {
  possible_serial_disputer: { label: "Unusual dispute pattern", style: "text-warn" },
  repeat_disputer: { label: "Has disputed before", style: "text-fg" },
  trusted_customer: { label: "Regular customer", style: "text-ok" },
  first_dispute: { label: "First dispute", style: "text-fg" },
};

const SHOWN = 5;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The pattern in a few facts ("5 other disputes · 3 in 30 days · …"); the full sentence goes to Ask Sira. */
function facts(h: BuyerHistory): string {
  const parts = [
    h.otherDisputes.length === 0 ? "No other disputes with you" : plural(h.otherDisputes.length, "other dispute"),
    h.otherDisputesLast30Days > 0 && h.otherDisputesLast30Days !== h.otherDisputes.length && `${h.otherDisputesLast30Days} in 30 days`,
    h.otherDisputesLast30Days > 0 && h.otherDisputesLast30Days === h.otherDisputes.length && (h.otherDisputes.length === 1 ? "in the last 30 days" : "all in the last 30 days"),
    h.notReceivedOnDeliveredParcels > 0 && `${plural(h.notReceivedOnDeliveredParcels, '"not received" claim')} on delivered parcels`,
    h.recentPurchases !== null && `${plural(h.recentPurchases, "purchase")} last month`,
  ];
  return parts.filter(Boolean).join(" · ");
}

/** The buyer's track record with this seller. Describes the pattern, never judges the person. */
export function BuyerHistoryCard({ history }: { history: BuyerHistory | null }) {
  if (!history) return <p className="text-[14px] text-fg-muted">No buyer details on this dispute.</p>;
  const signal = SIGNAL[history.signal];
  return (
    <div className="text-[14px]">
      <p className={`font-medium ${signal.style}`}>{signal.label}</p>
      <p className="mt-1.5 leading-[22px] text-fg-body">{facts(history)}</p>

      {history.otherDisputes.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-line-subtle pt-3">
          {history.otherDisputes.slice(0, SHOWN).map((d) => (
            <li key={d.id}>
              <Link href={`/disputes/${d.id}`} className="group flex items-baseline justify-between gap-3">
                <span className="text-fg group-hover:underline">{reasonLabel(d.reason)}</span>
                <span className="shrink-0 text-right text-[12.5px] text-fg-muted">
                  {d.deliveredParcel && d.reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" && "Delivered · "}
                  {d.openedAt ? new Date(d.openedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                </span>
              </Link>
            </li>
          ))}
          {history.otherDisputes.length > SHOWN && (
            <li className="text-[12.5px] text-fg-muted">and {history.otherDisputes.length - SHOWN} more</li>
          )}
        </ul>
      )}

      <p className="mt-3 text-[12px] text-fg-muted">
        Context for you only. PayPal decides on evidence, not history.
      </p>
    </div>
  );
}
