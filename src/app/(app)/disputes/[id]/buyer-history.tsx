import Link from "next/link";
import type { BuyerHistory, BuyerSignal } from "@/lib/buyer-history";
import { reasonLabel } from "@/app/_components/dispute-ui";

const SIGNAL: Record<BuyerSignal, { label: string; style: string }> = {
  possible_serial_disputer: {
    label: "Unusual dispute pattern",
    style: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  repeat_disputer: {
    label: "Has disputed before",
    style: "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
  },
  trusted_customer: {
    label: "Regular customer",
    style: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  first_dispute: {
    label: "First dispute",
    style: "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
  },
};

const SHOWN = 5;

/** The buyer's track record with this seller. Describes the pattern, never judges the person. */
export function BuyerHistoryCard({ history }: { history: BuyerHistory | null }) {
  if (!history) return <p className="text-sm text-zinc-500">No buyer details on this dispute.</p>;
  const signal = SIGNAL[history.signal];
  return (
    <div className="text-sm">
      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${signal.style}`}>{signal.label}</span>
      <p className="mt-3 leading-relaxed">{history.summary}</p>

      {history.otherDisputes.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          {history.otherDisputes.slice(0, SHOWN).map((d) => (
            <li key={d.id} className="flex items-baseline justify-between gap-3">
              <Link href={`/disputes/${d.id}`} className="font-mono text-xs text-sky-700 hover:underline dark:text-sky-400">
                {d.id}
              </Link>
              <span className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                {reasonLabel(d.reason)}
                {d.deliveredParcel && d.reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" && " · parcel was delivered"}
              </span>
            </li>
          ))}
          {history.otherDisputes.length > SHOWN && (
            <li className="text-xs text-zinc-400">and {history.otherDisputes.length - SHOWN} more</li>
          )}
        </ul>
      )}

      <p className="mt-3 text-xs text-zinc-400">
        PayPal decides on evidence, not history. This is context for you, and it&apos;s never shown to the buyer.
      </p>
    </div>
  );
}
