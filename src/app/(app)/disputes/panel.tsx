import { SidePanel } from "@/components/app/SidePanel";
import { computeUrgency } from "@/lib/agent";
import type { DisputeDetail, HomeDispute } from "@/lib/dashboard";
import type { ActionsMode } from "@/lib/respond";
import { Deadline, formatAmount, humanize, reasonLabel, StatusBadge } from "@/app/_components/dispute-ui";
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

  return (
    <SidePanel
      title={`${buyer} · ${reasonLabel(dispute.reason)}`}
      closeHref={listHref}
      fullHref={`/disputes/${dispute.id}`}
      nextHref={next ? withOpen(next.id) : undefined}
      nextLabel={`Next to review (${remaining})`}
    >
      <div className="space-y-6 px-5 py-6 sm:px-7">
        <header>
          <p className="font-mono text-[12px] text-fg-muted">{dispute.id}</p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.01em] text-fg">
            {reasonLabel(dispute.reason)} · {formatAmount(dispute.amount, dispute.currency)}
          </h2>
          <p className="mt-1 text-[13px] text-fg-body">
            {buyer} · {dispute.sellerName ?? "Unlinked seller"} · {humanize(dispute.stage)} stage
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
            <StatusBadge status={dispute.status} />
            <Deadline dueAt={dispute.dueAt} daysLeft={dispute.daysLeft} status={dispute.status} />
          </div>
        </header>

        <section>
          <h3 className="mb-2 t-section">Buyer&apos;s claim</h3>
          <blockquote className="rounded-xl border border-line bg-subtle px-4 py-3 text-[14px] leading-[22px] text-fg-heading">
            {claim ?? <span className="text-fg-muted">The buyer didn&apos;t leave a message.</span>}
          </blockquote>
        </section>

        <section>
          <h3 className="mb-2 t-section">Recommendation</h3>
          <div className="rounded-xl border border-line p-4">
            <AssessmentReport
              disputeId={dispute.id}
              decision={dispute.decision}
              urgency={computeUrgency(raw as Parameters<typeof computeUrgency>[0], new Date().toISOString())}
              amount={dispute.amount}
              currency={dispute.currency}
              disputeStatus={dispute.status}
              mode={mode}
            />
          </div>
        </section>

        {dispute.buyerHistory && <BuyerHistoryCard history={dispute.buyerHistory} />}
      </div>
    </SidePanel>
  );
}
