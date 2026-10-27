"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { PayPalAction } from "@/lib/agent";
import { Money } from "@/components/app/bits";
import { DRAFT_LABELS, EvidencePackLink } from "@/app/_components/dispute-ui";
import { approveAction, rejectAction, type ReviewState } from "../disputes/[id]/actions";

export type ReviewCard = {
  disputeId: string;
  decisionId: string;
  buyerName: string;
  item: string;
  meta: string;
  amount: number | null;
  currency: string | null;
  recommendation: "fight" | "refund" | "settle";
  call: string;
  summary: string;
  facts: { label: string; value: string }[];
  drafts: { action: PayPalAction; recipient: "buyer" | "paypal"; text: string }[];
  refundAmount: string;
  offerAmount: string | null;
};

const MAX_DRAFT_LENGTH = 2000; // PayPal's limit on note/message fields
const noSubscribe = () => () => {};

/** What approving actually does, in one sentence. */
function sendsSentence(drafts: ReviewCard["drafts"], offer: string | null, refund: string) {
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

function draftTitle(d: ReviewCard["drafts"][number], firstName: string) {
  if (d.action === "send_message") return `Message to ${firstName}`;
  if (d.action === "make_offer") return `Offer note to ${firstName}`;
  if (d.action === "provide_evidence") return "Evidence for PayPal";
  return DRAFT_LABELS[d.action];
}

/** One draft, Mock 2 style: the case, Sira's call, what it found, the message, and a decision bar. */
export function ReviewDeck({
  card,
  mode,
  nextHref,
  upNext,
}: {
  card: ReviewCard;
  mode: "live" | "demo";
  nextHref: string;
  upNext: { name: string; amount: string } | null;
}) {
  const [editing, setEditing] = useState(false);
  const [approveState, approve, approving] = useActionState<ReviewState, FormData>(approveAction, null);
  const [rejectState, reject, rejecting] = useActionState<ReviewState, FormData>(rejectAction, null);
  // Until hydrated, a click would submit natively and skip the refund confirmation.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const busy = approving || rejecting || !hydrated;
  const finished = (approveState?.kind === "approve" && approveState.ok) || (rejectState?.ok ?? false);
  const firstName = card.buyerName.split(/\s+/)[0];

  function confirmApprove(e: React.MouseEvent<HTMLButtonElement>) {
    const lines: string[] = [];
    if (card.drafts.some((d) => d.action === "accept_claim")) lines.push(`accept the claim: PayPal refunds the buyer ${card.refundAmount}`);
    if (card.drafts.some((d) => d.action === "make_offer")) lines.push(`offer the buyer a ${card.offerAmount ?? "partial"} refund`);
    if (lines.length === 0) return;
    const prefix = mode === "demo" ? "Demo mode, nothing is really sent. " : "";
    if (!window.confirm(`${prefix}This will ${lines.join(" and ")}. Continue?`)) e.preventDefault();
  }

  const approveLabel =
    card.recommendation === "refund" ? "Approve refund" : card.recommendation === "settle" ? `Approve ${card.offerAmount ?? ""} offer`.replace("  ", " ") : "Approve & send";

  return (
    <form className="flex flex-1 flex-col">
      <input type="hidden" name="decisionId" value={card.decisionId} />
      <article aria-labelledby="case-title" className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-9 px-6 pt-12 pb-10 md:px-8">
        <header className="flex flex-col gap-2.5">
          <p className="text-[13px] text-fg-muted">{card.meta}</p>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h1 id="case-title" className="text-[26px] font-[480] tracking-[0.01em] text-fg">
              <Link href={`/disputes/${card.disputeId}`} className="hover:underline">
                {card.buyerName}
              </Link>
            </h1>
            <Money amount={card.amount} currency={card.currency} className="text-[26px] font-[480] text-fg" />
          </div>
          <p className="text-[15px] text-fg-body">{card.item}</p>
        </header>

        <section aria-labelledby="call" className="flex flex-col gap-2.5 border-t border-line pt-7">
          <h2 id="call" className="text-[13px] font-medium text-accent">
            Sira recommends
          </h2>
          <p className="text-[22px] font-[480] text-fg">{card.call}</p>
          <p className="text-[15px] leading-6 text-fg-body">{card.summary}</p>
        </section>

        <section aria-labelledby="found" className="flex flex-col">
          <h2 id="found" className="mb-1.5 text-[13px] text-fg-muted">
            What Sira found
          </h2>
          <dl>
            {card.facts.map((f, n) => (
              <div key={n} className="flex flex-col gap-1 border-b border-line-subtle py-3 text-[14.5px] leading-[22px] sm:flex-row sm:gap-6">
                <dt className={`shrink-0 text-fg-muted sm:w-[130px] ${f.label ? "" : "hidden sm:block"}`}>{f.label}</dt>
                <dd className="min-w-0 flex-1 text-fg [overflow-wrap:anywhere]">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {card.drafts.map((d, n) => (
          <section key={n} aria-labelledby={`draft-${n}`} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`draft-${n}`} className="text-[13px] text-fg-muted">
                {draftTitle(d, firstName)}
                {d.action === "provide_evidence" && <EvidencePackLink disputeId={card.disputeId} />}
              </h2>
              {n === 0 && !finished && (
                <button type="button" onClick={() => setEditing((e) => !e)} className="text-[13px] text-accent hover:underline">
                  {editing ? "Done editing" : "Edit message"}
                </button>
              )}
            </div>
            {/* The textarea is always submitted; it just looks like plain text until you edit. */}
            <textarea
              name={`draft_${n}`}
              aria-label={draftTitle(d, firstName)}
              defaultValue={d.text}
              maxLength={MAX_DRAFT_LENGTH}
              readOnly={!editing}
              disabled={busy && !approving}
              rows={Math.min(12, Math.max(4, Math.ceil(d.text.length / 70) + d.text.split("\n").length))}
              className={
                editing
                  ? "w-full resize-y rounded-xl border border-line-strong bg-canvas px-5 py-4 text-[15px] leading-[25px] text-fg outline-none focus:border-accent"
                  : "w-full resize-none rounded-xl border border-transparent bg-muted/70 px-5 py-4 text-[15px] leading-[25px] text-fg outline-none"
              }
            />
          </section>
        ))}
        <p className="-mt-5 text-[13px] text-fg-muted">{sendsSentence(card.drafts, card.offerAmount, card.refundAmount)}</p>

        {approveState?.kind === "approve" && (
          <div role="status" className="rounded-xl border border-line bg-canvas px-5 py-4 text-[14px]">
            {approveState.error ? (
              <p className="text-bad">{approveState.error}</p>
            ) : (
              <>
                <p className="font-medium text-fg">
                  {approveState.mode === "demo"
                    ? approveState.ok
                      ? "Demo mode: everything checks out. In live mode, this is what would be sent:"
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
              </>
            )}
          </div>
        )}
        {rejectState?.kind === "reject" && (
          <p role="status" className={rejectState.ok ? "text-[14px] text-fg-body" : "text-[14px] text-bad"}>
            {rejectState.ok
              ? rejectState.mode === "demo"
                ? "Demo mode: the draft would be marked rejected and nothing sent."
                : "Rejected. Nothing was sent to PayPal."
              : rejectState.error}
          </p>
        )}
      </article>

      {/* Decision bar */}
      <div className="sticky bottom-0 border-t border-line bg-canvas/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[720px] flex-wrap items-center gap-2.5 px-6 py-3.5 md:px-8">
          <span className="min-w-[180px] flex-1 text-[13px] text-fg-muted">
            {upNext ? (
              <>
                Up next: {upNext.name} · <span className="money">{upNext.amount}</span>
              </>
            ) : (
              "Last one"
            )}
          </span>
          {finished ? (
            <Link href={nextHref} className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-[14px] font-medium text-white hover:bg-[#0062c4]">
              {upNext ? "Next draft" : "Finish"}
            </Link>
          ) : (
            <>
              <button
                type="submit"
                formAction={reject}
                disabled={busy}
                className="h-10 rounded-full px-4 text-[14px] text-fg-muted hover:text-bad disabled:opacity-50"
              >
                {rejecting ? "Rejecting…" : "Reject"}
              </button>
              <Link href={nextHref} className="inline-flex h-10 items-center rounded-full px-4 text-[14px] text-fg-body hover:bg-muted">
                Skip
              </Link>
              <button
                type="button"
                onClick={() => setEditing((e) => !e)}
                className="h-10 rounded-full bg-muted px-[18px] text-[14px] text-fg hover:bg-inset"
              >
                {editing ? "Done editing" : "Edit message"}
              </button>
              <button
                type="submit"
                formAction={approve}
                onClick={confirmApprove}
                disabled={busy}
                className="h-10 rounded-full bg-accent px-5 text-[14px] font-medium text-white hover:bg-[#0062c4] disabled:opacity-50"
              >
                {approving ? "Sending…" : approveLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
