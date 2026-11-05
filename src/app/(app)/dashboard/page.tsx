import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ChevronDown, ChevronRight, CircleAlert, Copy, ExternalLink, PackageOpen, PackageSearch, PackageX, ReceiptText, ShieldAlert } from "lucide-react";
import { Amount, Money, Panel } from "@/components/app/bits";
import { reasonLabel } from "@/app/_components/dispute-ui";
import { AtRiskChart, type RiskPoint } from "@/components/app/HomeCharts";
import { Button } from "@/components/ui/Button";
import { requireSession } from "@/lib/auth";
import { getHomeDataCached, type HomeDispute } from "@/lib/dashboard";
import { getDeliveries, type Delivery } from "@/lib/deliveries";
import { dueLabel } from "@/lib/dispute-stage";
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* At risk: the big number, what came back and went out over 30 days, and the trend */}
        <Panel aria-labelledby="atrisk" className="flex min-w-0 flex-col px-6 pt-6 pb-3">
          <h2 id="atrisk" className="text-[14px] text-fg-muted">
            At risk
          </h2>
          <Money amount={atRisk} currency={currency} className="mt-2 text-[34px] leading-none font-[480] text-fg" />
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[13px] text-fg-body">
            <span>
              Claimed on your {open.length} open dispute{open.length === 1 ? "" : "s"} · last 30 days
            </span>
            <span className="flex gap-4">
              <span className="text-ok">
                ↗ <Amount amount={kept30} currency={currency} /> kept
              </span>
              <span className="text-bad">
                ↘ <Amount amount={refunded30} currency={currency} /> refunded
              </span>
            </span>
          </div>
          <div className="money mt-2 min-h-[220px] flex-1">
            <AtRiskChart points={points} currency={currency} height="100%" />
          </div>
        </Panel>
        {/* Summary column */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Your disputes">
            <SummaryRow href="/disputes?view=needs-response" label="Need your response" value={waiting.length} tone={overdue > 0 ? "bad" : undefined} hint={overdue > 0 ? `${overdue} overdue` : undefined} />
            <SummaryRow href="/review" label="Drafts ready to review" value={drafts.length} />
            <SummaryRow href="/disputes" label="Open disputes" value={open.length} />
            <SummaryRow
              label="Handled by Sira"
              value={insights.impact.handled}
              hint={`since you started · about ${Math.round(insights.impact.hoursSaved)} hours saved`}
              last
            />
          </Card>

        </div>
      </div>

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
                        {draftIds.has(d.id) ? "Response ready to review" : "Sira is preparing a response"}
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
                  detail="No carrier scan yet, so there's no proof of shipment. Add tracking or check with the carrier."
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
    <Card title="Deliveries" count={total} action={{ href: "/evidence", label: "Shipping proof" }}>
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
          {total > deliveries.length && (
            <p className="py-2.5 text-[13px] text-fg-muted">
              Showing {deliveries.length} of {total} orders.{" "}
              <Link href="/evidence" className="text-accent hover:underline">
                See all in Shipping proof
              </Link>
            </p>
          )}
        </>
      )}
      </div>
    </Card>
  );
}

function DeliveryRow({ d }: { d: Delivery }) {
  const status = d.status ? DELIVERY_STATUS[d.status] : null;
  const sub = d.status === "DELIVERED" && d.deliveredAt ? shortDate(d.deliveredAt) : d.shippedAt ? `Shipped ${shortDate(d.shippedAt)}` : null;
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
          <span className={status?.className ?? "text-warn"}>{status?.label ?? "No tracking yet"}</span>
          {(sub || d.onPayPal) && (
            <span className="text-[13px] text-fg-muted">{[sub, d.onPayPal && "tracking sent to PayPal"].filter(Boolean).join(" · ")}</span>
          )}
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
