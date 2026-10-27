import { SidePanel } from "@/components/app/SidePanel";
import { computeUrgency } from "@/lib/agent";
import type { DisputeDetail, HomeDispute } from "@/lib/dashboard";
import type { ActionsMode } from "@/lib/respond";
import { Money } from "@/components/app/bits";
import { dueLabel, stageLabel } from "@/lib/dispute-stage";
import { humanize, reasonLabel } from "@/app/_components/dispute-ui";
import { AssessmentReport } from "./[id]/assessment";
import { BuyerHistoryCard } from "./[id]/buyer-history";

const awaitingApproval = (d: HomeDispute) => d.status !== "RESOLVED" && d.report?.status === "pending_review" && d.report.current;
const byDeadline = (a: HomeDispute, b: HomeDispute) =>
  (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity);

/**
 * A dispute opened from the list (`/disputes?open=<id>`): the essentials and the approve/reject form
 * in a side panel over the list. "Next" walks the review queue in deadline order.
 */
export function DisputePanel({
  dispute,
  disputes,
  listHref,
  mode,
}: {
  /** Live/demo for the signed-in session (the demo account is always demo). */
  mode: ActionsMode;
  dispute: DisputeDetail;
  disputes: HomeDispute[];
  /** The list URL (with its current view) that the panel opens on top of. */
  listHref: string;
}) {
  const queue = disputes.filter(awaitingApproval).sort(byDeadline);
  const position = queue.findIndex((d) => d.id === dispute.id);
  // Wraps to the start so "Next" always leads to whatever is still waiting.
  const next = (position >= 0 ? queue[position + 1] : undefined) ?? queue.find((d) => d.id !== dispute.id);
  const remaining = queue.filter((d) => d.id !== dispute.id).length;
  const withOpen = (id: string) => `${listHref}${listHref.includes("?") ? "&" : "?"}open=${encodeURIComponent(id)}`;

  const { raw } = dispute;
  const claim = raw.messages?.find((m) => m.posted_by === "BUYER")?.content;
  const buyer = raw.disputed_transactions?.[0]?.buyer?.name ?? "Buyer";
  const due = dispute.status === "WAITING_FOR_SELLER_RESPONSE" ? dueLabel(dispute.daysLeft) : null;

  return (
    <SidePanel
      title={`${buyer} · ${reasonLabel(dispute.reason)}`}
      closeHref={listHref}
      fullHref={`/disputes/${dispute.id}`}
      nextHref={next ? withOpen(next.id) : undefined}
      nextLabel={`Next to review (${remaining})`}
    >
      <div className="flex flex-col gap-5 bg-subtle px-5 py-6 sm:px-7">
        <header className="flex flex-col gap-1.5">
          <p className="font-mono text-[12px] text-fg-muted">{dispute.id}</p>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[22px] font-[480] tracking-[0.01em] text-fg">{buyer}</h2>
            <Money amount={dispute.amount} currency={dispute.currency} className="text-[22px] font-[480] text-fg" />
          </div>
          <p className="text-[14px] text-fg-body">
            {raw.disputed_transactions?.[0]?.items?.[0]?.item_name ?? "Order"} · {reasonLabel(dispute.reason)}
          </p>
          <p className="text-[13px] text-fg-muted">
            {stageLabel({ status: dispute.status, report: dispute.decision ? { recommendation: dispute.decision.assessment.recommendation, status: dispute.decision.status, current: dispute.decision.current } : null })}
            {due && (
              <>
                {" · "}
                <span className={(dispute.daysLeft ?? 99) <= 0 ? "font-medium text-bad" : ""}>{due}</span>
              </>
            )}
            {" · "}
            {humanize(dispute.stage)} stage
          </p>
        </header>

        {claim && (
          <section aria-label="Buyer's claim" className="rounded-xl border border-line bg-canvas px-6 py-4">
            <h3 className="mb-1.5 text-[13px] text-fg-muted">{buyer.split(/\s+/)[0]} wrote</h3>
            <p className="text-[14.5px] leading-[22px] text-fg-body">&ldquo;{claim}&rdquo;</p>
          </section>
        )}

        <AssessmentReport
          disputeId={dispute.id}
          decision={dispute.decision}
          urgency={computeUrgency(raw as Parameters<typeof computeUrgency>[0], new Date().toISOString())}
          amount={dispute.amount}
          currency={dispute.currency}
          disputeStatus={dispute.status}
          mode={mode}
        />

        {dispute.buyerHistory && (
          <section aria-label="Buyer history" className="rounded-xl border border-line bg-canvas px-6 py-4">
            <BuyerHistoryCard history={dispute.buyerHistory} />
          </section>
        )}
      </div>
    </SidePanel>
  );
}
