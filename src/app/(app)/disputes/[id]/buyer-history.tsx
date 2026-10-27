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

/** The buyer's track record with this seller. Describes the pattern, never judges the person. */
export function BuyerHistoryCard({ history }: { history: BuyerHistory | null }) {
  if (!history) return <p className="text-[14px] text-fg-muted">No buyer details on this dispute.</p>;
  const signal = SIGNAL[history.signal];
  return (
    <div className="text-[14px]">
      <p className={`font-medium ${signal.style}`}>{signal.label}</p>
      <p className="mt-1.5 leading-[22px] text-fg-body">{history.summary}</p>

      {history.otherDisputes.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-line-subtle pt-3">
          {history.otherDisputes.slice(0, SHOWN).map((d) => (
            <li key={d.id} className="flex items-baseline justify-between gap-3">
              <Link href={`/disputes/${d.id}`} className="font-mono text-[12px] text-accent hover:underline">
                {d.id}
              </Link>
              <span className="text-right text-[12.5px] text-fg-muted">
                {reasonLabel(d.reason)}
                {d.deliveredParcel && d.reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" && " · parcel was delivered"}
              </span>
            </li>
          ))}
          {history.otherDisputes.length > SHOWN && (
            <li className="text-[12.5px] text-fg-muted">and {history.otherDisputes.length - SHOWN} more</li>
          )}
        </ul>
      )}

      <p className="mt-3 text-[12px] text-fg-muted">
        PayPal decides on evidence, not history. This is context for you, and it&apos;s never shown to the buyer.
      </p>
    </div>
  );
}
