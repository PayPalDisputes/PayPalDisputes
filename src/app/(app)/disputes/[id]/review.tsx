"use client";

import { useActionState, useSyncExternalStore } from "react";
import type { PayPalAction } from "@/lib/agent";
import { DRAFT_LABELS } from "@/app/_components/dispute-ui";
import { approveAction, rejectAction, type ReviewState } from "./actions";

type Draft = { action: PayPalAction; recipient: "buyer" | "paypal"; text: string };

const MAX_DRAFT_LENGTH = 2000; // PayPal's limit on note/message fields

const noSubscribe = () => () => {};

/** False during server render and before hydration; true once the page's JavaScript is running. */
function useHydrated() {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

/** Editable drafts with Approve & send / Reject. Nothing is sent until the seller approves. */
export function ReviewForm({
  decisionId,
  drafts,
  mode,
  refundAmount,
  offerAmount,
}: {
  decisionId: string;
  drafts: Draft[];
  mode: "live" | "demo";
  /** Formatted disputed amount, shown in the confirmation when approving a refund. */
  refundAmount: string;
  /** Formatted settle amount, shown in the confirmation when approving an offer. */
  offerAmount: string | null;
}) {
  const [approveState, approve, approving] = useActionState<ReviewState, FormData>(approveAction, null);
  const [rejectState, reject, rejecting] = useActionState<ReviewState, FormData>(rejectAction, null);
  // Until hydrated, a click would submit the form natively and skip the refund confirmation.
  const hydrated = useHydrated();
  const busy = approving || rejecting || !hydrated;
  const done = (approveState?.kind === "approve" && approveState.mode === "demo" && approveState.ok) ||
    (rejectState?.ok ?? false);

  function confirmApprove(e: React.MouseEvent<HTMLButtonElement>) {
    const lines: string[] = [];
    if (drafts.some((d) => d.action === "accept_claim")) lines.push(`accept the claim: PayPal refunds the buyer ${refundAmount}`);
    if (drafts.some((d) => d.action === "make_offer")) lines.push(`offer the buyer a ${offerAmount ?? "partial"} refund`);
    if (lines.length === 0) return;
    const prefix = mode === "demo" ? "Demo mode, nothing is really sent. " : "";
    if (!window.confirm(`${prefix}This will ${lines.join(" and ")}. Continue?`)) e.preventDefault();
  }

  return (
    <form>
      <input type="hidden" name="decisionId" value={decisionId} />
      <div className="space-y-3">
        {drafts.map((d, i) => (
          <label key={i} className="block rounded-md border border-zinc-200 dark:border-zinc-800">
            <span className="block border-b border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {DRAFT_LABELS[d.action] ?? d.action} → {d.recipient === "paypal" ? "PayPal" : "buyer"}
            </span>
            <textarea
              name={`draft_${i}`}
              defaultValue={d.text}
              maxLength={MAX_DRAFT_LENGTH}
              rows={Math.min(10, Math.max(3, Math.ceil(d.text.length / 80)))}
              disabled={busy || done}
              className="block w-full resize-y rounded-b-md bg-transparent px-3 py-2 leading-relaxed outline-none focus:bg-zinc-50 disabled:opacity-60 dark:focus:bg-zinc-900"
            />
          </label>
        ))}
      </div>

      {!done && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            formAction={approve}
            onClick={confirmApprove}
            disabled={busy}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {approving ? "Sending…" : "Approve & send"}
          </button>
          <button
            type="submit"
            formAction={reject}
            disabled={busy}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {rejecting ? "Rejecting…" : "Reject"}
          </button>
          <span className="text-xs text-zinc-400">You can edit the drafts before approving.</span>
        </div>
      )}

      {approveState?.kind === "approve" && (
        <div className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900">
          {approveState.error ? (
            <p className="text-red-600 dark:text-red-400">{approveState.error}</p>
          ) : (
            <>
              <p className="font-medium">
                {approveState.mode === "demo"
                  ? approveState.ok
                    ? "Demo mode: everything checks out. In live mode this is what would be sent:"
                    : "Demo mode: some steps wouldn't go through:"
                  : approveState.ok
                    ? "Sent to PayPal."
                    : "Some steps failed:"}
              </p>
              <ul className="mt-1 space-y-1">
                {approveState.steps.map((s, i) => (
                  <li key={i} className={s.ok ? "" : "text-red-600 dark:text-red-400"}>
                    {s.ok ? "✓" : "✗"} {DRAFT_LABELS[s.action]}: {s.message}
                  </li>
                ))}
              </ul>
              {approveState.mode === "demo" && <p className="mt-2 text-xs text-zinc-400">Reload the page to try again.</p>}
            </>
          )}
        </div>
      )}
      {rejectState?.kind === "reject" && (
        <p className={`mt-4 text-sm ${rejectState.ok ? "text-zinc-600 dark:text-zinc-400" : "text-red-600 dark:text-red-400"}`}>
          {rejectState.ok
            ? rejectState.mode === "demo"
              ? "Demo mode: the report would be marked rejected and nothing sent. Reload the page to try again."
              : "Rejected. Nothing was sent to PayPal."
            : rejectState.error}
        </p>
      )}
    </form>
  );
}
