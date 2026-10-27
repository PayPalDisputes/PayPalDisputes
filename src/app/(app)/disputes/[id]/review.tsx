"use client";

import { useActionState, useSyncExternalStore } from "react";
import type { PayPalAction } from "@/lib/agent";
import { DRAFT_LABELS, EvidencePackLink } from "@/app/_components/dispute-ui";
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
  disputeId,
  drafts,
  mode,
  refundAmount,
  offerAmount,
}: {
  decisionId: string;
  disputeId: string;
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
          <label key={i} className="block">
            <span className="mb-1.5 block text-[13px] text-fg-muted">
              {DRAFT_LABELS[d.action] ?? d.action} → {d.recipient === "paypal" ? "PayPal" : "buyer"}
              {d.action === "provide_evidence" && <EvidencePackLink disputeId={disputeId} />}
            </span>
            <textarea
              name={`draft_${i}`}
              defaultValue={d.text}
              maxLength={MAX_DRAFT_LENGTH}
              rows={Math.min(10, Math.max(3, Math.ceil(d.text.length / 80)))}
              disabled={busy || done}
              className="block w-full resize-y rounded-xl border border-transparent bg-muted/70 px-5 py-4 text-[15px] leading-[25px] text-fg outline-none focus:border-line-strong focus:bg-canvas disabled:opacity-60"
            />
          </label>
        ))}
      </div>

      {!done && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            formAction={approve}
            onClick={confirmApprove}
            disabled={busy}
            className="h-10 rounded-full bg-accent px-5 text-[14px] font-medium text-white hover:bg-[#0062c4] disabled:opacity-50"
          >
            {approving ? "Sending…" : "Approve & send"}
          </button>
          <button
            type="submit"
            formAction={reject}
            disabled={busy}
            className="h-10 rounded-full bg-muted px-[18px] text-[14px] text-fg hover:bg-inset disabled:opacity-50"
          >
            {rejecting ? "Rejecting…" : "Reject"}
          </button>
          <span className="text-[13px] text-fg-muted">You can edit the text before approving.</span>
        </div>
      )}

      {approveState?.kind === "approve" && (
        <div role="status" className="mt-4 rounded-xl border border-line px-5 py-4 text-[14px]">
          {approveState.error ? (
            <p className="text-bad">{approveState.error}</p>
          ) : (
            <>
              <p className="font-medium text-fg">
                {approveState.mode === "demo"
                  ? approveState.ok
                    ? "Demo mode: everything checks out. In live mode this is what would be sent:"
                    : "Demo mode: some steps wouldn't go through:"
                  : approveState.ok
                    ? "Sent to PayPal."
                    : "Some steps failed:"}
              </p>
              <ul className="mt-1.5 space-y-1 text-fg-body">
                {approveState.steps.map((s, i) => (
                  <li key={i} className={s.ok ? "" : "text-bad"}>
                    {DRAFT_LABELS[s.action]}: {s.message}
                  </li>
                ))}
              </ul>
              {approveState.mode === "demo" && <p className="mt-2 text-[12.5px] text-fg-muted">Reload the page to try again.</p>}
            </>
          )}
        </div>
      )}
      {rejectState?.kind === "reject" && (
        <p role="status" className={`mt-4 text-[14px] ${rejectState.ok ? "text-fg-body" : "text-bad"}`}>
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
