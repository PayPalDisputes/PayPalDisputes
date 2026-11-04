import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ChevronDown, ChevronRight, CircleAlert, Copy, ExternalLink, PackageOpen, PackageSearch, PackageX, ReceiptText, ShieldAlert } from "lucide-react";
import { Amount, Money, Panel, ProgressLine } from "@/components/app/bits";
import { reasonLabel } from "@/app/_components/dispute-ui";
import { AtRiskChart, type RiskPoint } from "@/components/app/HomeCharts";
import { Button } from "@/components/ui/Button";
import { requireSession } from "@/lib/auth";
import { getHomeDataCached, type HomeDispute } from "@/lib/dashboard";
import { getDeliveries, type Delivery } from "@/lib/deliveries";
import { callLabel, dueLabel, stageLabel } from "@/lib/dispute-stage";
import { getInsights } from "@/lib/insights";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Home · Sira" };

const RESOLUTION_CENTER = (process.env.PAYPAL_API_BASE ?? "").includes("sandbox") || !process.env.PAYPAL_API_BASE
  ? "https://www.sandbox.paypal.com/disputes/"
  : "https://www.paypal.com/disputes/";

const DAY = 86_400_000;
const isOpen = (d: HomeDispute) => d.status !== "RESOLVED";
const waitingOnSeller = (d: HomeDispute) => d.status === "WAITING_FOR_SELLER_RESPONSE";
const draftReady = (d: HomeDispute) => isOpen(d) && d.report?.status === "pending_review" && d.report.current;

/** The request's clock, read outside render so the page stays a pure function of its data. */
const nowMs = () => Date.now();


export default async function DashboardHome({ searchParams }: PageProps<"/dashboard">) {
  await connection();
  const session = await requireSession();
  const { seller } = await searchParams;
  const sellerId = session.kind === "seller" ? session.sellerId : typeof seller === "string" ? seller : undefined;
  const [{ disputes, sellers: allSellers }, insights, deliveries] = await Promise.all([
    getHomeDataCached(sellerId),
    getInsights(sellerId),
    getDeliveries(sellerId),
  ]);
  const sellers = session.kind === "seller" ? allSellers.filter((s) => s.id === session.sellerId) : allSellers;
  const store = sellers.find((s) => s.id === sellerId);
  // Greet the store being viewed (the only store, for the demo); just "Hello" across several stores.
  const greeting = store?.name ?? (sellers.length === 1 ? sellers[0].name : session.kind === "seller" ? session.name : null);

  const open = disputes.filter(isOpen);
  const waiting = disputes.filter(waitingOnSeller).sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  const drafts = disputes.filter(draftReady);
  const overdue = waiting.filter((d) => (d.daysLeft ?? 99) < 0).length;

  // At risk = what buyers claim on open disputes, in the main currency.
  const totals = new Map<string, number>();
  for (const d of open) totals.set(d.currency ?? "USD", (totals.get(d.currency ?? "USD") ?? 0) + (d.amount ?? 0));
  const byCurrency = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const [currency, atRisk] = byCurrency[0] ?? ["USD", 0];

  const now = nowMs();
  const outcomes = insights.impact.outcomes;
  const resolvedRows = insights.outcomeRows;
  const last30 = resolvedRows.filter((r) => r.resolvedAt && now - new Date(r.resolvedAt).getTime() <= 30 * DAY && r.currency === currency);
  const kept30 = last30.reduce((s, r) => s + r.kept, 0);
  const refunded30 = last30.reduce((s, r) => s + r.refunded, 0);

  // Amount at risk on each of the last 30 days: disputes opened by then and not yet resolved.
  const resolvedAt = new Map(resolvedRows.map((r) => [r.disputeId, r.resolvedAt] as const));
  const points: RiskPoint[] = Array.from({ length: 31 }, (_, i) => {
    const day = now - (30 - i) * DAY;
    const value = disputes
      .filter((d) => (d.currency ?? "USD") === currency)
      .filter((d) => d.openedAt && new Date(d.openedAt).getTime() <= day)
      .filter((d) => {
        const r = d.status === "RESOLVED" ? resolvedAt.get(d.id) : null;
        return !r || new Date(r).getTime() > day;
      })
      .reduce((s, d) => s + (d.amount ?? 0), 0);
    return { label: i === 30 ? "Today" : new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value };
  });

  // Dispute activity over the same 30 days as the chart, like Mercury's money in / money out.
  const keptRows = last30.filter((r) => r.kept > 0);
  const refundRows = last30.filter((r) => r.refunded > 0);

  const recent = [...disputes].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")).slice(0, 6);

  // Things to do: every dispute waiting on the seller, soonest deadline first, then parcels that stopped moving.
  const draftIds = new Set(drafts.map((d) => d.id));
  const notMoving = deliveries.counts.not_moving;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-5 pt-8 pb-20 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.01em] text-fg">{greeting ? `Hello, ${greeting}` : "Hello"}</h1>
          <p className="mt-1 text-[15px] text-fg-body">Here&apos;s what&apos;s going on today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sellers.length > 1 && <StoreSelector stores={sellers} current={store} />}
          <a
            href={RESOLUTION_CENTER}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-[38px] items-center gap-2 rounded-md bg-muted px-4 text-[14px] text-fg transition-colors hover:bg-inset"
          >
            <ExternalLink aria-hidden strokeWidth={1.6} className="size-[15px]" />
            Open in PayPal
          </a>
          {drafts.length > 0 && (
            <Button href="/review" prefetch={false} size="md" className="h-[38px] px-4">
              <ArrowRight aria-hidden strokeWidth={1.8} className="size-[15px]" />
              Review {drafts.length} draft{drafts.length === 1 ? "" : "s"}
            </Button>
          )}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Things to do" count={waiting.length + (notMoving > 0 ? 1 : 0)} action={{ href: "/disputes?view=needs-response", label: "View all" }}>
            {waiting.length === 0 && notMoving === 0 ? (
              <p className="px-6 py-10 text-center text-[14px] text-fg-muted">You&apos;re all caught up. Nothing needs you right now.</p>
            ) : (
              <ul>
                {waiting.slice(0, 6).map((d) => {
                  const due = dueLabel(d.daysLeft);
                  const overdue = (d.daysLeft ?? 99) < 0;
                  return (
                    <TodoRow
                      key={d.id}
                      href={`/disputes/${d.id}`}
                      icon={REASON_ICON[d.reason ?? ""] ?? CircleAlert}
                      tone={overdue || (d.daysLeft ?? 99) <= 3 ? "bad" : "accent"}
                      title={`Respond to ${d.buyerName ?? "the buyer"}`}
                      detail={
                        <>
                          {reasonLabel(d.reason)} · <Amount amount={d.amount} currency={d.currency} /> ·{" "}
                          {draftIds.has(d.id) ? "Sira's response is ready to review" : "Sira is preparing a response"}
                        </>
                      }
                      when={due}
                      whenTone={overdue ? "bad" : undefined}
                    />
                  );
                })}
                {notMoving > 0 && (
                  <TodoRow
                    href="/evidence"
                    icon={PackageSearch}
                    tone="warn"
                    title={`Check ${notMoving} parcel${notMoving === 1 ? "" : "s"} that aren't moving`}
                    detail="A label was printed but the carrier never scanned it. Without a scan there's no proof of shipment."
                  />
                )}
              </ul>
            )}
            {waiting.length > 6 && (
              <p className="border-t border-line-subtle px-6 py-3 text-[13px] text-fg-muted">
                And {waiting.length - 6} more in{" "}
                <Link href="/disputes?view=needs-response" className="text-accent hover:underline">
                  Disputes
                </Link>
                .
              </p>
            )}
          </Card>

          <Deliveries {...deliveries} />

          <Card title="Recent disputes" action={{ href: "/disputes", label: "View all" }}>
            {recent.length === 0 ? (
              <p className="px-6 py-10 text-center text-[14px] text-fg-muted">No disputes yet. They appear here as soon as PayPal sends them.</p>
            ) : (
              <div className="overflow-x-auto px-6 pb-2">
                <table className="w-full min-w-[600px] border-collapse text-left text-[14px]">
                  <thead>
                    <tr className="text-[12.5px] text-fg-muted">
                      <th scope="col" className="py-2.5 font-[420]">Buyer</th>
                      <th scope="col" className="py-2.5 font-[420]">Where it stands</th>
                      <th scope="col" className="py-2.5 font-[420]">Sira&apos;s call</th>
                      <th scope="col" className="py-2.5 text-right font-[420]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((d) => (
                      <tr key={d.id} className="group relative border-t border-line-subtle">
                        <td className="py-3 pr-4">
                          {/* the whole row is clickable through this stretched link */}
                          <Link href={`/disputes/${d.id}`} className="flex flex-col gap-[3px] after:absolute after:inset-0">
                            <span className="text-fg group-hover:underline">{d.buyerName ?? "Buyer"}</span>
                            <span className="text-[13px] text-fg-muted">{d.item ?? "Order"}</span>
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="flex flex-col gap-1.5">
                            <span className="text-fg-body">{stageLabel(d)}</span>
                            <ProgressLine dispute={d} className="w-[150px]" />
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-fg-body">{callLabel(d.report, d.currency) ?? <span className="text-fg-muted">Not assessed</span>}</td>
                        <td className="py-3 text-right">
                          <Amount amount={d.amount} currency={d.currency} className="text-fg" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Summary column */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="At risk" action={{ href: "/disputes", label: "View all" }}>
            <div className="px-6 pt-4 pb-3">
              <Money amount={atRisk} currency={currency} className="text-[30px] leading-none font-[480] text-fg" />
              <p className="mt-2 text-[13px] text-fg-muted">Claimed on {open.length} open dispute{open.length === 1 ? "" : "s"}</p>
              <div className="money mt-3">
                <AtRiskChart points={points} currency={currency} />
              </div>
            </div>
          </Card>

          <Card title="Your disputes">
            <SummaryRow href="/disputes?view=needs-response" label="Need your response" value={waiting.length} tone={overdue > 0 ? "bad" : undefined} hint={overdue > 0 ? `${overdue} overdue` : undefined} />
            <SummaryRow href="/review" label="Drafts ready to review" value={drafts.length} />
            <SummaryRow href="/disputes" label="Active with PayPal" value={open.length} last />
          </Card>

          <Card title="Last 30 days" action={{ href: "/insights", label: "Insights" }}>
            <SummaryRow label="Kept" value={<Amount amount={kept30} currency={currency} className={kept30 > 0 ? "text-ok" : undefined} />} hint={`${keptRows.length} dispute${keptRows.length === 1 ? "" : "s"}`} />
            <SummaryRow label="Refunded" value={<Amount amount={refunded30} currency={currency} className={refunded30 > 0 ? "text-bad" : undefined} />} hint={`${refundRows.length} dispute${refundRows.length === 1 ? "" : "s"}`} />
            <SummaryRow
              label="Handled by Sira"
              value={insights.impact.handled}
              hint={`about ${Number.isInteger(insights.impact.hoursSaved) ? insights.impact.hoursSaved : insights.impact.hoursSaved.toFixed(1)} hours saved`}
              last
            />
            {outcomes.resolved === 0 && <p className="px-6 pb-4 text-[13px] text-fg-muted">Results appear here as disputes close.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** A white card with a title row, an optional count and "View all ›", then its content under a divider. */
function Card({ title, count, action, children }: { title: string; count?: number; action?: { href: string; label: string }; children: React.ReactNode }) {
  const id = `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <Panel aria-labelledby={id} className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-6 py-4">
        <h2 id={id} className="text-[17px] font-[480] text-fg">
          {title}
          {count !== undefined && <span className="ml-1.5 text-[14px] font-normal text-fg-muted tabular-nums">({count})</span>}
        </h2>
        {action && (
          <Link href={action.href} className="inline-flex items-center gap-0.5 text-[14px] text-accent hover:underline">
            {action.label}
            <ChevronRight aria-hidden strokeWidth={1.8} className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </Panel>
  );
}

const TILE_TONE = {
  accent: "bg-accent-bg text-accent",
  bad: "bg-bad-bg text-bad",
  warn: "bg-warn-bg text-warn",
} as const;

const REASON_ICON: Record<string, typeof CircleAlert> = {
  MERCHANDISE_OR_SERVICE_NOT_RECEIVED: PackageX,
  MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: PackageOpen,
  UNAUTHORISED: ShieldAlert,
  DUPLICATE_TRANSACTION: Copy,
  CREDIT_NOT_PROCESSED: ReceiptText,
};

/** One thing to do: an icon tile, what to do and why, and when it's due. */
function TodoRow({
  href,
  icon: Icon,
  tone,
  title,
  detail,
  when,
  whenTone,
}: {
  href: string;
  icon: typeof CircleAlert;
  tone: keyof typeof TILE_TONE;
  title: string;
  detail: React.ReactNode;
  when?: string | null;
  whenTone?: "bad";
}) {
  return (
    <li className="border-b border-line-subtle last:border-b-0">
      <Link href={href} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-subtle sm:px-6">
        <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-lg", TILE_TONE[tone])}>
          <Icon aria-hidden strokeWidth={1.7} className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[15px] font-[480] text-fg">{title}</span>
          <span className="text-[13.5px] leading-5 text-fg-body">{detail}</span>
          {/* On phones the date goes under the text instead of squeezing it */}
          {when && <span className={cn("text-[13px] sm:hidden", whenTone === "bad" ? "font-medium text-bad" : "text-fg-muted")}>{when}</span>}
        </span>
        {when && <span className={cn("hidden shrink-0 text-[13px] sm:block", whenTone === "bad" ? "font-medium text-bad" : "text-fg-muted")}>{when}</span>}
      </Link>
    </li>
  );
}

/** A label and its number, one per line, in the summary column. */
function SummaryRow({ href, label, value, hint, tone, last }: { href?: string; label: string; value: React.ReactNode; hint?: string; tone?: "bad"; last?: boolean }) {
  const body = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14px] text-fg">{label}</span>
        {hint && <span className={cn("text-[12.5px]", tone === "bad" ? "font-medium text-bad" : "text-fg-muted")}>{hint}</span>}
      </span>
      <span className="text-[16px] font-[480] text-fg tabular-nums">{value}</span>
    </>
  );
  const cls = cn("flex items-center justify-between gap-3 px-6 py-3.5", !last && "border-b border-line-subtle");
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-subtle")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function StoreSelector({ stores, current }: { stores: { id: string; name: string }[]; current?: { id: string; name: string } }) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1 text-[14px] text-fg-body hover:bg-muted [&::-webkit-details-marker]:hidden">
        {current?.name ?? "All stores"}
        <ChevronDown strokeWidth={1.75} className="size-4 text-fg-muted transition-transform group-open:rotate-180" />
      </summary>
      <ul className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-line bg-canvas p-1.5 shadow-float">
        {[{ id: "", name: "All stores" }, ...stores].map((s) => (
          <li key={s.id || "all"}>
            <Link
              href={s.id ? `/dashboard?seller=${encodeURIComponent(s.id)}` : "/dashboard"}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-[14px] text-fg hover:bg-subtle"
            >
              {s.name}
              {(current?.id ?? "") === s.id && <span className="size-1.5 rounded-full bg-fg" />}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

const DELIVERY_STATUS: Record<string, { label: string; className: string }> = {
  IN_TRANSIT: { label: "In transit", className: "text-fg" },
  DELIVERED: { label: "Delivered", className: "text-ok" },
  LABEL_CREATED: { label: "Label created, not scanned", className: "text-warn" },
  NOT_SHIPPED: { label: "Not shipped", className: "text-warn" },
  RETURNED_TO_SENDER: { label: "Returned to you", className: "text-bad" },
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Every order's delivery at a glance, parcels that need watching first, each linked to the carrier's live tracking. */
function Deliveries({ deliveries, counts, total }: Awaited<ReturnType<typeof getDeliveries>>) {
  const summary = [
    { label: "In transit", value: counts.in_transit },
    { label: "Delivered", value: counts.delivered },
    { label: "Not moving", value: counts.not_moving, tone: counts.not_moving > 0 ? "text-warn" : undefined },
    { label: "Returned", value: counts.returned, tone: counts.returned > 0 ? "text-bad" : undefined },
  ];
  return (
    <Card title="Deliveries" count={total} action={{ href: "/evidence", label: "Add tracking" }}>
      <div className="px-6 pb-2">
      {total === 0 ? (
        <p className="py-10 text-center text-[14px] text-fg-muted">No orders yet. Add tracking and every parcel shows up here.</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summary.map((x) => (
              <div key={x.label} className="rounded-lg bg-muted/60 px-4 py-3">
                <dt className="text-[12.5px] text-fg-muted">{x.label}</dt>
                <dd className={cn("mt-1 text-[20px] leading-none font-[480] text-fg", x.tone)}>{x.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="text-[12.5px] text-fg-muted">
                  <th scope="col" className="py-2 font-[420]">Order</th>
                  <th scope="col" className="py-2 font-[420]">Status</th>
                  <th scope="col" className="py-2 font-[420]">Last scan</th>
                  <th scope="col" className="py-2 text-right font-[420]">Tracking</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <DeliveryRow key={d.id} d={d} />
                ))}
              </tbody>
            </table>
          </div>
          {total > deliveries.length && <p className="py-2.5 text-[13px] text-fg-muted">Showing {deliveries.length} of {total} orders.</p>}
        </>
      )}
      </div>
    </Card>
  );
}

function DeliveryRow({ d }: { d: Delivery }) {
  const status = d.status ? DELIVERY_STATUS[d.status] : null;
  return (
    <tr className="border-t border-line-subtle align-top">
      <td className="py-3 pr-4">
        <span className="flex flex-col gap-[3px]">
          <span className="text-fg">{d.buyerName ?? d.orderNumber ?? "Order"}</span>
          <span className="text-[13px] text-fg-muted">{[d.orderNumber, d.item].filter(Boolean).join(" · ") || "No details"}</span>
        </span>
      </td>
      <td className="py-3 pr-4">
        <span className="flex flex-col gap-[3px]">
          <span className={status?.className ?? "text-fg-muted"}>{status?.label ?? "Unknown"}</span>
          <span className="text-[13px] text-fg-muted">
            {d.status === "DELIVERED" && d.deliveredAt ? shortDate(d.deliveredAt) : d.shippedAt ? `Shipped ${shortDate(d.shippedAt)}` : "Not shipped yet"}
            {d.onPayPal && " · on PayPal"}
          </span>
        </span>
      </td>
      <td className="max-w-[260px] py-3 pr-4 text-[13px] text-fg-body">
        {d.lastScan ? (
          <>
            {d.lastScan.description}
            {d.lastScan.location && <span className="text-fg-muted">, {d.lastScan.location}</span>}
            <span className="block text-fg-muted">{shortDate(d.lastScan.at)}</span>
          </>
        ) : (
          <span className="text-fg-muted">No scans yet</span>
        )}
      </td>
      <td className="py-3 text-right text-[13px]">
        {d.trackingUrl ? (
          <a href={d.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
            {d.carrier}
            <ExternalLink aria-hidden strokeWidth={1.6} className="size-3.5" />
          </a>
        ) : (
          <span className="text-fg-muted">{d.carrier ?? "No tracking"}</span>
        )}
      </td>
    </tr>
  );
}
