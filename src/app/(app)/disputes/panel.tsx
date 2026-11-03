import { SidePanel } from "@/components/app/SidePanel";
import { computeUrgency } from "@/lib/agent";
import { DueCountdown } from "@/components/app/DueCountdown";
import type { DisputeDetail } from "@/lib/dashboard";
import type { ActionsMode } from "@/lib/respond";
import { Money } from "@/components/app/bits";
import { stageLabel } from "@/lib/dispute-stage";
import { EvidencePackButton, humanize, reasonLabel } from "@/app/_components/dispute-ui";
import { AssessmentReport } from "./[id]/assessment";
import { BuyerHistoryCard } from "./[id]/buyer-history";

/**
 * A dispute opened from the list (`/disputes?open=<id>`): the deadline, the case, and the
 * approve/reject form in a side panel over the list.
 */
export function DisputePanel({
  dispute,
  listHref,
  mode,
}: {
  /** Live/demo for the signed-in session (the demo account is always demo). */
  mode: ActionsMode;
  dispute: DisputeDetail;
  /** The list URL (with its current view) that the panel opens on top of. */
  listHref: string;
}) {
  const { raw } = dispute;
  const claim = raw.messages?.find((m) => m.posted_by === "BUYER")?.content;
  const item = raw.disputed_transactions?.[0]?.items?.[0]?.item_name;
  const stage = stageLabel({
    id: dispute.id,
    status: dispute.status,
    report: dispute.decision ? { recommendation: dispute.decision.assessment.recommendation, status: dispute.decision.status, current: dispute.decision.current } : null,
  });
  const buyer = raw.disputed_transactions?.[0]?.buyer?.name ?? "Buyer";
  const waitingOnYou = dispute.status === "WAITING_FOR_SELLER_RESPONSE" && dispute.dueAt;

  return (
    <SidePanel
      title={`${buyer} · ${reasonLabel(dispute.reason)}`}
      closeHref={listHref}
      fullHref={`/disputes/${dispute.id}`}
    >
      <div className="flex flex-col gap-5 bg-subtle px-5 py-6 sm:px-7">
        <header className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[24px] font-[480] tracking-[0.01em] text-fg">{item ?? "Order"}</h2>
            <Money amount={dispute.amount} currency={dispute.currency} className="text-[24px] font-[480] text-fg" />
          </div>
          <p className="text-[14px] text-fg-body">
            {buyer} · {reasonLabel(dispute.reason)} · <span className="text-fg-muted">{stage}</span>
          </p>
        </header>

        {waitingOnYou && <DueCountdown dueAt={waitingOnYou} />}

        <div className="flex flex-wrap gap-2">
          <EvidencePackButton disputeId={dispute.id} />
        </div>

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

        {/* PayPal's case id: kept for support conversations, out of the way */}
        <p className="text-[12px] text-fg-muted">
          PayPal case <span className="font-mono">{dispute.id}</span> · {humanize(dispute.stage)} stage
        </p>
      </div>
    </SidePanel>
  );
}
