"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { PayPalAction } from "@/lib/agent";
import { DRAFT_LABELS, EvidencePackLink } from "@/app/_components/dispute-ui";
import { approveAction, type ReviewState } from "./actions";

type Draft = { action: PayPalAction; recipient: "buyer" | "paypal"; text: string };

const MAX_DRAFT_LENGTH = 2000; // PayPal's limit on note/message fields

const noSubscribe = () => () => {};

/** False during server render and before hydration; true once the page's JavaScript is running. */
function useHydrated() {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

/** Review drafts: what the decision bar along the bottom needs to step to the next draft. */
export type ReviewBarProps = {
  upNext: { name: string; amount: string } | null;
  /** Skip: leaves this draft for later. */
  skipHref: string;
  /** After approving (in live mode the approved draft leaves the queue, so this can be the same index). */
  doneHref: string;
};

/** What approving actually does, in one sentence. */
function sendsSentence(drafts: Draft[], offer: string | null, refund: string) {
  const parts = drafts.map((d) =>
    d.action === "send_message"
      ? "sends this message to the buyer"
      : d.action === "provide_evidence"
        ? "submits the evidence to PayPal"
        : d.action === "make_offer"
          ? `offers the buyer ${offer ?? "a partial refund"}`
          : `accepts the claim, refunding ${refund}`,
  );
  return `Approving ${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0]}.`;
}

/**
 * Editable drafts and Approve. Nothing is sent until the seller approves. On the dispute page the button
 * sits under the drafts; in Review drafts (`bar`) the buttons sit in a decision bar pinned to the bottom,
 * with Skip, Edit and the next draft.
 */
export function ReviewForm({
  decisionId,
  disputeId,
  drafts,
  mode,
  refundAmount,
  offerAmount,
  recommendation,
  bar,
}: {
  decisionId: string;
  disputeId: string;
  drafts: Draft[];
  mode: "live" | "demo";
  /** Formatted disputed amount, shown in the confirmation when approving a refund. */
  refundAmount: string;
  /** Formatted settle amount, shown in the confirmation when approving an offer. */
  offerAmount: string | null;
  recommendation?: "fight" | "settle" | "refund";
  bar?: ReviewBarProps;
}) {
  const [editing, setEditing] = useState(false);
  const [approveState, approve, approving] = useActionState<ReviewState, FormData>(approveAction, null);
  // Until hydrated, a click would submit the form natively and skip the refund confirmation.
  const hydrated = useHydrated();
  const busy = approving || !hydrated;
  const done = approveState?.kind === "approve" && approveState.mode === "demo" && approveState.ok;
  // In review mode, a successful approval moves the bar on to the next draft.
  const finished = approveState?.kind === "approve" && approveState.ok;
  const approveLabel =
    recommendation === "refund" ? "Approve refund" : recommendation === "settle" && offerAmount ? `Approve ${offerAmount} offer` : "Approve & send";

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
              readOnly={bar ? !editing : false}
              className="block w-full resize-y rounded-xl border border-transparent bg-muted/70 px-5 py-4 text-[15px] leading-[25px] text-fg outline-none focus:border-line-strong focus:bg-canvas disabled:opacity-60 read-only:focus:border-transparent read-only:focus:bg-muted/70"
            />
          </label>
        ))}
      </div>

      {!bar && !done && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            formAction={approve}
            onClick={confirmApprove}
            disabled={busy}
            className="h-10 rounded-md bg-accent px-5 text-[14px] font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {approving ? "Sending…" : approveLabel}
          </button>
          <span className="text-[13px] text-fg-muted">You can edit the text before approving.</span>
        </div>
      )}
      {bar && <p className="mt-3 text-[13px] text-fg-muted">{sendsSentence(drafts, offerAmount, refundAmount)}</p>}

      {/* Review drafts: the decision bar, pinned along the bottom of the screen */}
      {bar && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-2.5 px-5 py-3.5 md:px-10">
            <span className="min-w-[180px] flex-1 text-[13px] text-fg-muted">
              {bar.upNext ? (
                <>
                  Up next: {bar.upNext.name} · <span className="money">{bar.upNext.amount}</span>
                </>
              ) : (
                "Last one"
              )}
            </span>
            {finished ? (
              <Link href={bar.doneHref} className="inline-flex h-10 items-center rounded-md bg-accent px-5 text-[14px] font-medium text-white hover:bg-accent-hover">
                {bar.upNext ? "Next draft" : "Finish"}
              </Link>
            ) : (
              <>
                <Link href={bar.skipHref} className="inline-flex h-10 items-center rounded-md px-4 text-[14px] text-fg-body hover:bg-muted">
                  Skip
                </Link>
                <button type="button" onClick={() => setEditing((e) => !e)} className="h-10 rounded-md bg-muted px-[18px] text-[14px] text-fg hover:bg-inset">
                  {editing ? "Done editing" : drafts.length === 1 ? "Edit draft" : "Edit drafts"}
                </button>
                <button
                  type="submit"
                  formAction={approve}
                  onClick={confirmApprove}
                  disabled={busy}
                  className="h-10 rounded-md bg-accent px-5 text-[14px] font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {approving ? "Sending…" : approveLabel}
                </button>
              </>
            )}
          </div>
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
    </form>
  );
}
