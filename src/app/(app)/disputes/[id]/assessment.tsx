import type { computeUrgency } from "@/lib/agent";
import type { Decision } from "@/lib/dashboard";
import type { ActionsMode } from "@/lib/respond";
import { DRAFT_LABELS, EvidencePackLink, formatAmount, RECOMMENDATION } from "@/app/_components/dispute-ui";
import { cn } from "@/lib/cn";
import { ChatPanel } from "./chat-panel";
import { ReviewForm } from "./review";

const STATUS_LABELS: Record<Decision["status"], string> = {
  pending_review: "Waiting for your review",
  approved: "Approved",
  rejected: "Rejected",
  submitted: "Sent to PayPal",
  failed: "Sending failed",
};

/** Risk and urgency as coloured words (no pills): high red, medium amber, low green. */
const LEVEL_TEXT = { high: "text-bad", medium: "text-warn", low: "text-ok" } as const;
const LEVEL_WORD = { high: "High", medium: "Medium", low: "Low" } as const;

/** What each lookup the agent made means to a seller. */
const TOOL_LABELS: Record<string, string> = {
  get_store_order: "Your order",
  get_shipment_tracking: "Tracking on PayPal",
  get_refund: "Refunds",
  get_dispute: "The dispute",
  get_order: "PayPal order",
  list_transactions: "Transactions",
};

/** A quiet white card with a blue section label: the dashboard's container for Sira's report. */
function Block({ id, title, aside, children, className }: { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("rounded-xl border border-line bg-canvas px-6 py-5", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[13px] font-medium text-accent">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: { label: string; value: React.ReactNode; muted?: boolean }[] }) {
  return (
    <dl>
      {rows.map((r, i) => (
        <div key={i} className={cn("flex flex-col gap-1 py-3 text-[14.5px] leading-[22px] sm:flex-row sm:gap-5", i < rows.length - 1 && "border-b border-line-subtle")}>
          {/* stacks on a phone; long ids (tracking numbers) may break anywhere */}
          <dt className={cn("shrink-0 text-fg-muted sm:w-[140px]", !r.label && "hidden sm:block")}>{r.label}</dt>
          <dd className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", r.muted ? "text-fg-muted" : "text-fg")}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** What was actually sent to PayPal for this report. */
function SentActions({ actions }: { actions: Decision["actions"] }) {
  if (actions.length === 0) return null;
  return (
    <ul className="mt-4 space-y-1 text-[13.5px]">
      {actions.map((s, i) => (
        <li key={i} className={s.success ? "text-ok" : "text-bad"}>
          {s.success ? "Sent" : "Failed"}: {DRAFT_LABELS[s.actionType as keyof typeof DRAFT_LABELS] ?? s.actionType}
          {s.error && ` (${s.error})`}
          <span className="text-fg-muted">
            {" "}
            · {new Date(s.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Sira's report on a dispute, Mock 2 style: the recommendation, what Sira checked, the other options,
 * the drafts (with Approve / Reject) and the Ask Sira chat, each in its own quiet card.
 */
export function AssessmentReport({
  disputeId,
  decision,
  urgency,
  amount,
  currency,
  disputeStatus,
  mode,
}: {
  disputeId: string;
  decision: Decision | null;
  /** Worked out when the page loads, so it tracks the deadline instead of the report's age. */
  urgency: ReturnType<typeof computeUrgency>;
  amount: number | null;
  currency: string | null;
  disputeStatus: string | null;
  mode: ActionsMode;
}) {
  if (!decision) {
    return (
      <Block id="rec" title="Sira recommends">
        <p className="text-[14.5px] text-fg-body">
          {disputeStatus === "WAITING_FOR_SELLER_RESPONSE"
            ? "Not assessed yet. Sira runs when the dispute arrives or changes; this usually takes under a minute."
            : "Nothing to decide right now: PayPal isn't waiting on you."}
        </p>
      </Block>
    );
  }

  const a = decision.assessment;
  const reviewable = decision.current && (decision.status === "pending_review" || decision.status === "failed");
  const assessedAt = new Date(decision.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const call =
    a.recommendation === "settle" && a.settle_amount != null
      ? `Settle for ${formatAmount(a.settle_amount, currency)}`
      : a.recommendation === "refund"
        ? `Refund ${formatAmount(amount, currency)}`
        : (RECOMMENDATION[a.recommendation]?.label ?? a.recommendation);

  const checked = [
    ...(a.investigation ?? []).map((t) => ({ label: TOOL_LABELS[t.tool] ?? t.tool, value: t.summary, muted: !t.ok })),
    ...a.key_evidence.map((value, i) => ({ label: i === 0 ? "Supports" : "", value })),
    ...a.missing_evidence.map((value, i) => ({ label: i === 0 ? "Missing" : "", value, muted: true })),
  ];

  return (
    <div className="flex flex-col gap-5">
      {!decision.current && (
        <p className="rounded-xl border border-line bg-canvas px-5 py-3 text-[14px] text-warn">
          The dispute has changed since this report. A new one will replace it shortly.
        </p>
      )}

      <Block id="rec" title="Sira recommends" aside={<span className="text-[12.5px] text-fg-muted">Updated {assessedAt}</span>}>
        {a.rule === "auto_refund" && (
          <p className="mb-2 text-[13.5px] text-fg-body">
            Handled by your auto-refund rule.{" "}
            <a href="/settings" className="text-accent hover:underline">
              Change it in Settings
            </a>
          </p>
        )}
        <p className="text-[22px] font-[480] text-fg">{call}</p>
        <p className="mt-2 text-[15px] leading-6 text-fg-body">{a.reasoning}</p>
        <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 border-t border-line-subtle pt-3.5 text-[13.5px]">
          <span title={urgency.reason}>
            <span className="text-fg-muted">Urgency </span>
            <span className={cn("font-medium", LEVEL_TEXT[urgency.urgency])}>{LEVEL_WORD[urgency.urgency]}</span>
          </span>
          <span title={a.risk_reason}>
            <span className="text-fg-muted">Risk if you fight </span>
            <span className={cn("font-medium", LEVEL_TEXT[a.risk])}>{LEVEL_WORD[a.risk]}</span>
          </span>
          <span>
            <span className="text-fg-muted">Confidence </span>
            <span className="font-medium text-fg">{Math.round(a.confidence * 100)}%</span>
          </span>
        </div>
        <p className="mt-2 text-[13px] leading-5 text-fg-muted">
          {a.risk_reason} {urgency.reason}
        </p>
      </Block>

      {checked.length > 0 && (
        <Block id="checked" title="What Sira checked">
          <Rows rows={checked} />
        </Block>
      )}

      {a.alternatives.length > 0 && (
        <Block id="options" title="Other options">
          <Rows rows={a.alternatives.map((alt) => ({ label: RECOMMENDATION[alt.option]?.label ?? alt.option, value: alt.what_happens }))} />
        </Block>
      )}

      <Block id="drafts" title={reviewable ? "Your response" : a.drafts.length === 1 ? "Draft" : "Drafts"}>
        {reviewable ? (
          <>
            {mode === "demo" && <p className="mb-3 text-[13px] text-fg-muted">Demo mode: try Approve or Reject freely. Nothing is sent to PayPal or saved.</p>}
            {decision.status === "failed" && <SentActions actions={decision.actions} />}
            <ReviewForm
              key={a.drafts.map((d) => d.text).join("|")}
              decisionId={decision.id}
              disputeId={disputeId}
              drafts={a.drafts}
              mode={mode}
              refundAmount={formatAmount(amount, currency)}
              offerAmount={a.settle_amount !== null ? formatAmount(a.settle_amount, currency) : null}
            />
          </>
        ) : (
          <>
            <div className="space-y-3">
              {a.drafts.map((d, i) => (
                <div key={i}>
                  <p className="mb-1.5 text-[13px] text-fg-muted">
                    {DRAFT_LABELS[d.action] ?? d.action} → {d.recipient === "paypal" ? "PayPal" : "buyer"}
                    {d.action === "provide_evidence" && <EvidencePackLink disputeId={disputeId} />}
                  </p>
                  <p className="rounded-xl bg-muted/70 px-5 py-4 text-[15px] leading-[25px] whitespace-pre-wrap text-fg">{d.text}</p>
                </div>
              ))}
            </div>
            <SentActions actions={decision.actions} />
          </>
        )}
      </Block>

      <ChatPanel disputeId={disputeId} />

      <p className="text-[12px] text-fg-muted">
        {STATUS_LABELS[decision.status] ?? decision.status} · assessed {assessedAt}
        {decision.model && ` · ${decision.model}`}
        {decision.promptVersion && ` · prompt ${decision.promptVersion}`}
      </p>
    </div>
  );
}
