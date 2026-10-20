import type { computeUrgency } from "@/lib/agent";
import type { Decision } from "@/lib/dashboard";
import type { ActionsMode } from "@/lib/respond";
import { DRAFT_LABELS, EvidencePackLink, formatAmount, LevelBadge, RECOMMENDATION, RecommendationBadge } from "@/app/_components/dispute-ui";
import { ChatPanel } from "./chat-panel";
import { ReviewForm } from "./review";


const STATUS_LABELS: Record<Decision["status"], string> = {
  pending_review: "Waiting for your review",
  approved: "Approved",
  rejected: "Rejected",
  submitted: "Sent to PayPal",
  failed: "Sending failed",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h3 className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</h3>
      {children}
    </div>
  );
}

/** What was actually sent to PayPal for this report. */
function SentActions({ actions }: { actions: Decision["actions"] }) {
  if (actions.length === 0) return null;
  return (
    <ul className="my-3 space-y-1 text-sm">
      {actions.map((s, i) => (
        <li key={i} className={s.success ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
          {s.success ? "✓ Sent" : "✗ Failed"}: {DRAFT_LABELS[s.actionType as keyof typeof DRAFT_LABELS] ?? s.actionType}
          {s.error && ` (${s.error})`}
          <span className="text-xs text-zinc-400">
            {" "}
            · {new Date(s.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The agent's report: recommendation, risk, urgency, reasoning, other options, evidence and drafts. */
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
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {disputeStatus === "WAITING_FOR_SELLER_RESPONSE"
          ? "Not assessed yet. The agent runs when the dispute arrives or changes; this usually takes under a minute."
          : "No assessment needed right now: PayPal isn't waiting on you."}
      </p>
    );
  }

  const a = decision.assessment;
  const reviewable = decision.current && (decision.status === "pending_review" || decision.status === "failed");
  const assessedAt = new Date(decision.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="text-sm">
      {!decision.current && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          The dispute has changed since this report. A new one will replace it shortly.
        </p>
      )}
      {a.rule === "auto_refund" && (
        <p className="mb-4 rounded-md bg-sky-50 px-3 py-2 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
          Handled by your auto-refund rule. Change it in{" "}
          <a href="/settings" className="font-medium underline">
            Settings
          </a>
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <RecommendationBadge recommendation={a.recommendation} settleAmount={a.settle_amount} currency={currency} />
        <LevelBadge name="Risk" level={a.risk} />
        <LevelBadge name="Urgency" level={urgency.urgency} />
      </div>

      <p className="mt-4 leading-relaxed">{a.reasoning}</p>
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">
        <span className="font-medium">Risk:</span> {a.risk_reason}
      </p>
      <p className="mt-1 text-zinc-500 dark:text-zinc-400">
        <span className="font-medium">Urgency:</span> {urgency.reason}
      </p>

      {a.alternatives.length > 0 && (
        <Section title="Other options">
          <ul className="space-y-2">
            {a.alternatives.map((alt) => (
              <li key={alt.option}>
                <span className="font-medium">{RECOMMENDATION[alt.option]?.label ?? alt.option}:</span>{" "}
                <span className="text-zinc-600 dark:text-zinc-400">{alt.what_happens}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {a.investigation && a.investigation.length > 0 && (
        <Section title="What the agent checked">
          <ul className="space-y-1.5">
            {a.investigation.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className={t.ok ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}>{t.ok ? "✓" : "–"}</span>
                <span className={t.ok ? "" : "text-zinc-500 dark:text-zinc-400"}>{t.summary}</span>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-zinc-400">{t.tool}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Evidence">
        <div className="grid gap-4 sm:grid-cols-2">
          <ul className="space-y-1.5">
            {a.key_evidence.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
          {a.missing_evidence.length > 0 && (
            <ul className="space-y-1.5">
              {a.missing_evidence.map((e, i) => (
                <li key={i} className="flex gap-2 text-zinc-600 dark:text-zinc-400">
                  <span className="text-amber-600 dark:text-amber-400">?</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title={a.drafts.length === 1 ? "Draft" : "Drafts"}>
        {reviewable ? (
          <>
            {mode === "demo" && (
              <p className="mb-3 rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                Demo mode: try Approve or Reject freely. Nothing is sent to PayPal or saved.
              </p>
            )}
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
                <div key={i} className="rounded-md border border-zinc-200 dark:border-zinc-800">
                  <p className="border-b border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    {DRAFT_LABELS[d.action] ?? d.action} → {d.recipient === "paypal" ? "PayPal" : "buyer"}
                    {d.action === "provide_evidence" && <EvidencePackLink disputeId={disputeId} />}
                  </p>
                  <p className="whitespace-pre-wrap px-3 py-2 leading-relaxed">{d.text}</p>
                </div>
              ))}
            </div>
            <SentActions actions={decision.actions} />
          </>
        )}
      </Section>

      <div className="mt-5">
        <ChatPanel disputeId={disputeId} />
      </div>

      <p className="mt-5 text-xs text-zinc-400">
        {STATUS_LABELS[decision.status] ?? decision.status} · assessed {assessedAt}
        {decision.model && ` · ${decision.model}`}
        {decision.promptVersion && ` · prompt ${decision.promptVersion}`}
      </p>
    </div>
  );
}
