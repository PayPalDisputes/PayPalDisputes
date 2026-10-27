import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Money } from "@/components/app/bits";
import { Button } from "@/components/ui/Button";
import { computeUrgency } from "@/lib/agent";
import { canAccessDispute, requireSession, sessionMode } from "@/lib/auth";
import { getDisputeDetail, type OrderEvidence, type PayPalDisputeDetail } from "@/lib/dashboard";
import { dueLabel } from "@/lib/dispute-stage";
import { getDisputeOutcome, type OutcomeRow } from "@/lib/outcomes";
import { EvidencePackLink, formatAmount, humanize, reasonLabel } from "@/app/_components/dispute-ui";
import { cn } from "@/lib/cn";
import { AssessmentReport } from "./assessment";
import { BuyerHistoryCard } from "./buyer-history";

export const metadata: Metadata = { title: "Dispute · Sira" };

const RESOLUTION_CENTER = (process.env.PAYPAL_API_BASE ?? "").includes("sandbox") || !process.env.PAYPAL_API_BASE
  ? "https://www.sandbox.paypal.com/disputes/"
  : "https://www.paypal.com/disputes/";

/** PayPal's action names (the `rel` of each POST link) in seller-facing words. */
const ACTIONS: Record<string, string> = {
  make_offer: "Make an offer",
  provide_evidence: "Provide evidence",
  accept_claim: "Accept the claim",
  send_message: "Send a message",
  escalate: "Escalate to PayPal",
  acknowledge_return_item: "Acknowledge return",
};

const money = (m?: { value: string; currency_code: string }) => (m ? formatAmount(Number(m.value), m.currency_code) : "—");

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** One labelled group inside the right-hand facts panel. */
function Facts({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-b border-line-subtle py-[18px] last:border-b-0">
      <h2 id={id} className="mb-2.5 text-[13px] text-fg-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </>
  );
}

function FieldList({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[14px]">{children}</dl>;
}

type TimelineEvent = { at: string; actor: string; kind: "message" | "offer" | "evidence" | "request"; text: string };

/** Messages, offers and evidence merged into one oldest-first history. */
function buildTimeline(raw: PayPalDisputeDetail, currency: string | null): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const m of raw.messages ?? []) {
    events.push({ at: m.time_posted, actor: m.posted_by, kind: "message", text: m.content });
  }
  for (const o of raw.offer?.history ?? []) {
    const amount = o.offer_amount ? money(o.offer_amount) : formatAmount(null, currency);
    events.push({ at: o.offer_time, actor: o.actor, kind: "offer", text: `${humanize(o.event_type)} a ${amount} refund` });
  }
  for (const e of raw.evidences ?? []) {
    if (!e.date || e.evidence_type === "CREATE") continue; // CREATE repeats the buyer's opening message
    if (e.source === "REQUESTED_FROM_SELLER") {
      events.push({ at: e.date, actor: "PAYPAL", kind: "request", text: `Requested from you: ${humanize(e.evidence_type)}` });
      continue;
    }
    const tracking = e.evidence_info?.tracking_info?.map((t) => `${t.carrier_name} ${t.tracking_number}`).join(", ");
    events.push({
      at: e.date,
      actor: e.source === "SUBMITTED_BY_SELLER" ? "SELLER" : "BUYER",
      kind: "evidence",
      text: [
        humanize(e.evidence_type),
        tracking,
        e.evidence_info?.refund_ids?.length ? `refund ${e.evidence_info.refund_ids.join(", ")}` : null,
        e.documents?.length ? `attached ${e.documents.map((doc) => doc.name).join(", ")}` : null,
        e.notes,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

const ACTOR = { BUYER: "Buyer", SELLER: "You", PAYPAL: "PayPal" } as Record<string, string>;
const KIND = { message: "wrote", offer: "", evidence: "submitted", request: "" } as const;

function Timeline({ events, buyer }: { events: TimelineEvent[]; buyer: string }) {
  if (events.length === 0) return <p className="text-[14px] text-fg-muted">No activity yet.</p>;
  return (
    <ol>
      {events.map((e, i) => (
        <li key={i} className={cn("flex gap-4 py-3", i < events.length - 1 && "border-b border-line-subtle")}>
          <span className="w-[72px] shrink-0 text-[13px] text-fg-muted">{formatDate(e.at)}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-1 text-[14px]">
            <span className="text-fg">
              {e.actor === "BUYER" ? buyer : (ACTOR[e.actor] ?? humanize(e.actor))}
              {KIND[e.kind] ? ` ${KIND[e.kind]}` : ""}
            </span>
            <span className={cn("leading-[22px]", e.kind === "message" ? "text-fg-body" : "text-fg-muted")}>
              {e.kind === "message" ? `“${e.text}”` : e.text}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Whether this order's tracking is on the PayPal transaction (uploaded by src/lib/tracking.ts). */
function payPalTracking(order: OrderEvidence) {
  if (order.payPalTrackingUploadedAt) return <span>Uploaded {formatDate(order.payPalTrackingUploadedAt)}</span>;
  if (order.payPalTrackingError) return <span className="text-bad">Upload failed</span>;
  if (order.shippingStatus !== "DELIVERED" && order.shippingStatus !== "IN_TRANSIT") return <span className="text-fg-muted">Nothing to upload yet</span>;
  return <span className="text-fg-muted">Not uploaded yet</span>;
}

export default async function DisputeDetailPage({ params }: PageProps<"/disputes/[id]">) {
  await connection();
  const { id } = await params;
  const session = await requireSession();
  if (!(await canAccessDispute(id))) notFound();
  const [dispute, outcome] = await Promise.all([getDisputeDetail(id), getDisputeOutcome(id)]);
  if (!dispute) notFound();

  const { raw, order } = dispute;
  const tx = raw.disputed_transactions?.[0];
  const item = tx?.items?.[0];
  const buyer = tx?.buyer?.name ?? "Buyer";
  const hold = raw.fund_movements?.find((f) => f.reason === "HOLD_PLACED");
  const allowed = (raw.links ?? []).filter((l) => l.method === "POST").map((l) => l.rel);
  const waiting = dispute.status === "WAITING_FOR_SELLER_RESPONSE";
  const draftReady = dispute.decision?.current && dispute.decision.status === "pending_review" && dispute.status !== "RESOLVED";
  const due = waiting ? dueLabel(dispute.daysLeft) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 px-5 pt-7 pb-20 md:px-10">
      <header className="flex flex-col gap-3.5">
        <nav aria-label="Breadcrumb" className="flex gap-1.5 text-[13px] text-fg-muted">
          <Link href="/disputes" className="text-fg-body hover:text-fg">
            Disputes
          </Link>
          <span aria-hidden>/</span>
          <span className="font-mono text-[12px]">{dispute.id}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[26px] font-[480] tracking-[0.01em] text-fg">{buyer}</h1>
            <p className="text-[15px] text-fg-body">
              {item?.item_name ?? "Order"} · {reasonLabel(dispute.reason)}
            </p>
            <p className="text-[13px] text-fg-muted">
              Opened {formatDate(raw.create_time)}
              {due && (
                <>
                  {" · "}
                  <span className={cn("font-medium", (dispute.daysLeft ?? 99) <= 0 ? "text-bad" : "text-fg")}>
                    Your response is {due.toLowerCase()}
                    {dispute.dueAt ? ` (${formatDate(dispute.dueAt)})` : ""}
                  </span>
                </>
              )}
              {dispute.status === "WAITING_FOR_BUYER_RESPONSE" && raw.buyer_response_due_date && ` · Buyer has until ${formatDate(raw.buyer_response_due_date)}`}
              {" · "}
              {humanize(dispute.stage)} stage
              {dispute.sellerName ? ` · ${dispute.sellerName}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Money amount={dispute.amount} currency={dispute.currency} className="text-[26px] font-[480] text-fg" />
            <div className="flex gap-2">
              <a
                href={RESOLUTION_CENTER}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[38px] items-center rounded-full bg-muted px-4 text-[14px] text-fg hover:bg-inset"
              >
                Open in PayPal
              </a>
              {draftReady && (
                <Button href="/review" prefetch={false} className="h-[38px] px-4">
                  Review draft
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-6">
        {/* Left: Sira's report and the story so far */}
        <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-5">
          <AssessmentReport
            disputeId={dispute.id}
            decision={dispute.decision}
            urgency={computeUrgency(raw as Parameters<typeof computeUrgency>[0], new Date().toISOString())}
            amount={dispute.amount}
            currency={dispute.currency}
            disputeStatus={dispute.status}
            mode={sessionMode(session)}
          />
          <section aria-labelledby="activity" className="rounded-xl border border-line bg-canvas px-6 py-5">
            <h2 id="activity" className="mb-1 text-[13px] font-medium text-accent">
              Activity
            </h2>
            <Timeline events={buildTimeline(raw, dispute.currency)} buyer={buyer} />
          </section>
        </div>

        {/* Right: the facts */}
        <aside aria-label="Details" className="min-w-0 flex-[1_1_300px] rounded-xl border border-line bg-canvas px-[22px]">
          {outcome && (
            <Facts id="outcome" title="Outcome">
              <OutcomeSummary outcome={outcome} />
            </Facts>
          )}
          <Facts id="tx" title="Transaction">
            <FieldList>
              {order?.orderNumber && <Field label="Order">{order.orderNumber}</Field>}
              <Field label="Paid">
                {formatDate(tx?.create_time)}, <span className="money">{money(tx?.gross_amount)}</span>
              </Field>
              <Field label="Status">{humanize(tx?.transaction_status ?? null)}</Field>
              {hold && (
                <Field label="On hold">
                  <span className="money">{money(hold.amount)}</span>
                </Field>
              )}
              <Field label="PayPal ID">
                <span className="font-mono text-[12px]">{tx?.seller_transaction_id ?? "—"}</span>
              </Field>
              <Field label="Protection">
                {tx?.seller_protection_eligible ? <span className="text-ok">Eligible</span> : <span className="text-fg-muted">Not eligible</span>}
              </Field>
            </FieldList>
          </Facts>
          <Facts id="ship" title="Shipping">
            {order ? (
              <FieldList>
                <Field label="Carrier">{order.carrier ?? "—"}</Field>
                <Field label="Tracking">
                  <span className="font-mono text-[12px] break-all">{order.trackingNumber ?? <span className="text-bad">Missing</span>}</span>
                </Field>
                <Field label="Status">{humanize(order.shippingStatus)}</Field>
                {order.deliveredAt && <Field label="Delivered">{formatDate(order.deliveredAt)}</Field>}
                {!order.deliveredAt && order.shippedAt && <Field label="Shipped">{formatDate(order.shippedAt)}</Field>}
                <Field label="Signature">{order.signatureConfirmed ? "Signed for" : "None"}</Field>
                <Field label="Address">{order.shipToMatchesPayPal === null ? "—" : order.shipToMatchesPayPal ? "Matches PayPal" : <span className="text-bad">Differs from PayPal</span>}</Field>
                <Field label="On PayPal">{payPalTracking(order)}</Field>
              </FieldList>
            ) : (
              <p className="text-[14px] text-fg-muted">
                No order record.{" "}
                <Link href="/evidence" className="text-accent hover:underline">
                  Add tracking
                </Link>
              </p>
            )}
            {order?.trackingEvents && order.trackingEvents.length > 0 && (
              <ol className="mt-3 space-y-1.5 border-t border-line-subtle pt-3 text-[13px]">
                {[...order.trackingEvents].reverse().slice(0, 4).map((e, i) => (
                  <li key={i}>
                    <span className="text-fg-body">{e.description}</span>
                    <span className="block text-[12px] text-fg-muted">
                      {formatDateTime(e.at)}
                      {e.location && ` · ${e.location}`}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {order?.simulated && <p className="mt-2 text-[12px] text-fg-muted">Demo data, not from a real carrier.</p>}
          </Facts>
          <Facts id="buyer" title="Buyer">
            <BuyerHistoryCard history={dispute.buyerHistory} />
          </Facts>
          {(raw.offer?.buyer_requested_amount || raw.offer?.seller_offered_amount) && (
            <Facts id="offer" title="Offer">
              <FieldList>
                <Field label="Buyer wants">
                  <span className="money">{money(raw.offer?.buyer_requested_amount)}</span>
                </Field>
                <Field label="You offered">
                  <span className="money">{money(raw.offer?.seller_offered_amount)}</span>
                </Field>
              </FieldList>
            </Facts>
          )}
          <Facts id="evidence" title="Evidence">
            <p className="text-[14px] text-fg-body">
              The PDF Sira attaches when you fight.
              <EvidencePackLink disputeId={dispute.id} />
            </p>
          </Facts>
          <Facts id="allowed" title="PayPal allows right now">
            <p className="text-[14px] leading-[22px] text-fg-body">
              {allowed.length === 0 ? <span className="text-fg-muted">No seller actions available.</span> : allowed.map((rel) => ACTIONS[rel] ?? humanize(rel)).join(" · ")}
            </p>
          </Facts>
        </aside>
      </div>
    </div>
  );
}

const RESULT_TEXT: Record<OutcomeRow["result"], { label: string; className: string }> = {
  won: { label: "Won", className: "text-ok" },
  settled: { label: "Settled", className: "text-warn" },
  lost: { label: "Resolved for the buyer", className: "text-bad" },
  other: { label: "Closed", className: "text-fg-body" },
};
const CHOICE_TEXT = { fight: "Fight", settle: "Settle", refund: "Refund" } as const;

/** How the dispute ended, what was kept, and how that lined up with Sira's advice. */
function OutcomeSummary({ outcome: o }: { outcome: OutcomeRow }) {
  const r = RESULT_TEXT[o.result];
  const advice = o.autoRefunded
    ? "Handled by your auto-refund rule."
    : o.advised && o.did
      ? o.advised === o.did
        ? `Sira advised ${CHOICE_TEXT[o.advised]}, and you followed it.`
        : `Sira advised ${CHOICE_TEXT[o.advised]}; you chose ${CHOICE_TEXT[o.did]}.`
      : o.advised
        ? `Sira advised ${CHOICE_TEXT[o.advised]}; no response was sent.`
        : null;
  return (
    <div className="text-[14px]">
      <p className={cn("text-[16px] font-[480]", r.className)}>{r.label}</p>
      <FieldList>
        <Field label="You kept">
          <span className="money">{formatAmount(o.kept, o.currency)}</span>
        </Field>
        {o.refunded > 0 && (
          <Field label="Refunded">
            <span className="money">{formatAmount(o.refunded, o.currency)}</span>
          </Field>
        )}
        <Field label="Resolved">{formatDate(o.resolvedAt)}</Field>
      </FieldList>
      {advice && <p className="mt-2 text-fg-body">{advice}</p>}
    </div>
  );
}
