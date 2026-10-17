import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { computeUrgency } from "@/lib/agent";
import { actionsMode } from "@/lib/respond";
import { getDisputeDetail, type OrderEvidence, type PayPalDisputeDetail } from "@/lib/dashboard";
import { Deadline, formatAmount, humanize, reasonLabel, StatusBadge } from "@/app/_components/dispute-ui";
import { AssessmentReport } from "./assessment";
import { BuyerHistoryCard } from "./buyer-history";

/** PayPal's action names (the `rel` of each POST link) in seller-facing words. */
const ACTIONS: Record<string, string> = {
  make_offer: "Make an offer",
  provide_evidence: "Submit evidence",
  accept_claim: "Accept & refund",
  send_message: "Message buyer",
  escalate: "Escalate to PayPal",
  acknowledge_return_item: "Acknowledge return",
};

const money = (m?: { value: string; currency_code: string }) => (m ? formatAmount(Number(m.value), m.currency_code) : "—");

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
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
      events.push({ at: e.date, actor: "PAYPAL", kind: "request", text: `Requested from seller: ${humanize(e.evidence_type)}` });
      continue;
    }
    const tracking = e.evidence_info?.tracking_info?.map((t) => `${t.carrier_name} ${t.tracking_number}`).join(", ");
    events.push({
      at: e.date,
      actor: e.source === "SUBMITTED_BY_SELLER" ? "SELLER" : "BUYER",
      kind: "evidence",
      text: [humanize(e.evidence_type), tracking, e.notes].filter(Boolean).join(" · "),
    });
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

const ACTOR_STYLES: Record<string, string> = {
  BUYER: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  SELLER: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  PAYPAL: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-zinc-500">No activity yet.</p>;
  return (
    <ol className="space-y-4">
      {events.map((e, i) => (
        <li key={i} className="flex gap-3">
          <span className={`h-fit shrink-0 rounded px-2 py-0.5 text-xs font-medium ${ACTOR_STYLES[e.actor] ?? ACTOR_STYLES.PAYPAL}`}>
            {e.actor === "PAYPAL" ? "PayPal" : humanize(e.actor)}
          </span>
          <div className="min-w-0 text-sm">
            <p className={e.kind === "message" ? "" : "italic text-zinc-600 dark:text-zinc-400"}>{e.text}</p>
            <p className="mt-0.5 text-xs text-zinc-400">{formatDateTime(e.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const SHIPPING_STYLES: Record<string, string> = {
  DELIVERED: "text-emerald-700 dark:text-emerald-400",
  IN_TRANSIT: "text-sky-700 dark:text-sky-400",
  LABEL_CREATED: "text-amber-600 dark:text-amber-400",
  NOT_SHIPPED: "text-amber-600 dark:text-amber-400",
  RETURNED_TO_SENDER: "text-red-600 dark:text-red-400",
};

const yesNo = (value: boolean | null, good: string, bad: string) =>
  value === null ? "—" : value ? <span className="text-emerald-700 dark:text-emerald-400">{good}</span> : <span className="text-red-600 dark:text-red-400">{bad}</span>;

/** Whether this order's tracking is on the PayPal transaction (uploaded by src/lib/tracking.ts). */
function PayPalTracking({ order }: { order: OrderEvidence }) {
  if (order.payPalTrackingUploadedAt) {
    return (
      <span className="text-emerald-700 dark:text-emerald-400">
        Uploaded ✓ <span className="text-xs text-zinc-400">{formatDateTime(order.payPalTrackingUploadedAt)}</span>
      </span>
    );
  }
  if (order.payPalTrackingError) return <span className="text-red-600 dark:text-red-400">Upload failed: {order.payPalTrackingError}</span>;
  if (order.shippingStatus !== "DELIVERED" && order.shippingStatus !== "IN_TRANSIT") {
    return <span className="text-zinc-500 dark:text-zinc-400">Not shipped, nothing to upload</span>;
  }
  return <span className="text-zinc-500 dark:text-zinc-400">Not uploaded yet</span>;
}

/** The seller's order record: carrier, tracking, delivery and the carrier's scan history. */
function Shipping({ order }: { order: OrderEvidence | null }) {
  if (!order) return <p className="text-sm text-zinc-500">No order record for this transaction.</p>;
  return (
    <>
      <dl>
        <Field label="Order">{order.orderNumber ?? "—"}</Field>
        <Field label="Carrier">{order.carrier ?? "—"}</Field>
        <Field label="Tracking">
          <span className="font-mono text-xs">{order.trackingNumber ?? "—"}</span>
        </Field>
        <Field label="Status">
          <span className={SHIPPING_STYLES[order.shippingStatus ?? ""] ?? ""}>{humanize(order.shippingStatus)}</span>
        </Field>
        <Field label="Shipped">{formatDateTime(order.shippedAt ?? undefined)}</Field>
        <Field label="Delivered">{formatDateTime(order.deliveredAt ?? undefined)}</Field>
        <Field label="Signature">{yesNo(order.signatureConfirmed, "Confirmed", "None")}</Field>
        <Field label="Ship to">
          {order.shipToName && <span className="block">{order.shipToName}</span>}
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{order.shipToAddress ?? "—"}</span>
        </Field>
        <Field label="Matches PayPal address">{yesNo(order.shipToMatchesPayPal, "Yes", "No")}</Field>
        <Field label="Tracking on PayPal">
          <PayPalTracking order={order} />
        </Field>
      </dl>

      {order.trackingEvents.length > 0 && (
        <ol className="mt-4 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {[...order.trackingEvents].reverse().map((e, i) => (
            <li key={i} className="text-sm">
              <p>{e.description}</p>
              <p className="text-xs text-zinc-400">
                {formatDateTime(e.at)}
                {e.location && ` · ${e.location}`}
              </p>
            </li>
          ))}
        </ol>
      )}

      {order.notes && <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{order.notes}</p>}
      {order.simulated && <p className="mt-3 text-xs text-zinc-400">Demo data, not from a real carrier.</p>}
    </>
  );
}

export default async function DisputeDetailPage({ params }: PageProps<"/disputes/[id]">) {
  await connection();
  const { id } = await params;
  const dispute = await getDisputeDetail(id);
  if (!dispute) notFound();

  const { raw } = dispute;
  const tx = raw.disputed_transactions?.[0];
  const item = tx?.items?.[0];
  const claim = raw.messages?.find((m) => m.posted_by === "BUYER")?.content;
  const hold = raw.fund_movements?.find((f) => f.reason === "HOLD_PLACED");
  const allowed = (raw.links ?? []).filter((l) => l.method === "POST").map((l) => l.rel);

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-20 md:px-10 md:pt-10">
      <Link href="/disputes" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
        ← All disputes
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-zinc-500">{dispute.id}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {reasonLabel(dispute.reason)} · {formatAmount(dispute.amount, dispute.currency)}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {dispute.sellerName ?? `Unlinked seller (${dispute.merchantId ?? "unknown"})`} · {humanize(dispute.stage)} stage
            · opened {formatDateTime(raw.create_time)}
          </p>
        </div>
        <div className="text-sm sm:text-right">
          <StatusBadge status={dispute.status} />
          {dispute.status === "WAITING_FOR_SELLER_RESPONSE" && (
            <div className="mt-2">
              <Deadline dueAt={dispute.dueAt} daysLeft={dispute.daysLeft} status={dispute.status} />
            </div>
          )}
          {dispute.status === "WAITING_FOR_BUYER_RESPONSE" && raw.buyer_response_due_date && (
            <p className="mt-2 text-xs text-zinc-400">Buyer has until {formatDateTime(raw.buyer_response_due_date)}</p>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Buyer's claim">
            <blockquote className="border-l-2 border-zinc-300 pl-3 text-sm dark:border-zinc-700">
              {claim ?? <span className="text-zinc-400">The buyer didn&apos;t leave a message.</span>}
            </blockquote>
          </Card>

          <Card title="AI assessment">
            <AssessmentReport
              decision={dispute.decision}
              urgency={computeUrgency(raw as Parameters<typeof computeUrgency>[0], new Date().toISOString())}
              amount={dispute.amount}
              currency={dispute.currency}
              disputeStatus={dispute.status}
              mode={actionsMode()}
            />
          </Card>

          <Card title="Activity">
            <Timeline events={buildTimeline(raw, dispute.currency)} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Transaction">
            <dl>
              <Field label="Item">{item?.item_description ?? item?.item_name ?? "—"}</Field>
              <Field label="Paid">{money(tx?.gross_amount)}</Field>
              <Field label="Date">{formatDateTime(tx?.create_time)}</Field>
              <Field label="Status">{humanize(tx?.transaction_status ?? null)}</Field>
              {hold && <Field label="On hold">{money(hold.amount)}</Field>}
              <Field label="Seller Protection">
                {tx?.seller_protection_eligible ? (
                  <span className="text-emerald-700 dark:text-emerald-400">Eligible ({humanize(tx.seller_protection_type ?? null)})</span>
                ) : (
                  "Not eligible"
                )}
              </Field>
            </dl>
          </Card>

          <Card title="Buyer history">
            <BuyerHistoryCard history={dispute.buyerHistory} />
          </Card>

          <Card title="Shipping">
            <Shipping order={dispute.order} />
          </Card>

          <Card title="Offer">
            <dl>
              <Field label="Buyer wants">{money(raw.offer?.buyer_requested_amount)}</Field>
              <Field label="Seller offered">{money(raw.offer?.seller_offered_amount)}</Field>
            </dl>
          </Card>

          <Card title="PayPal allows right now">
            {allowed.length === 0 ? (
              <p className="text-sm text-zinc-500">No seller actions available.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {allowed.map((rel) => (
                  <li key={rel} className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs dark:border-zinc-700">
                    {ACTIONS[rel] ?? humanize(rel)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
