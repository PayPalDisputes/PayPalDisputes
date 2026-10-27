import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Plus } from "lucide-react";
import { Amount, Money, Panel, ProgressLine, SectionHead } from "@/components/app/bits";
import { AtRiskChart, type RiskPoint } from "@/components/app/HomeCharts";
import { Button } from "@/components/ui/Button";
import { requireSession } from "@/lib/auth";
import { getHomeDataCached, type HomeDispute } from "@/lib/dashboard";
import { callLabel, dueLabel, stageLabel, stageStep } from "@/lib/dispute-stage";
import { getInsights, type InsightDispute } from "@/lib/insights";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Home · Sira" };

const RESOLUTION_CENTER = (process.env.PAYPAL_API_BASE ?? "").includes("sandbox") || !process.env.PAYPAL_API_BASE
  ? "https://www.sandbox.paypal.com/disputes/"
  : "https://www.paypal.com/disputes/";

const DAY = 86_400_000;
const isOpen = (d: HomeDispute) => d.status !== "RESOLVED";
const waitingOnSeller = (d: HomeDispute) => d.status === "WAITING_FOR_SELLER_RESPONSE";
const draftReady = (d: HomeDispute) => isOpen(d) && d.report?.status === "pending_review" && d.report.current;
const firstName = (name: string | null) => name?.split(/\s+/)[0] ?? "A buyer";

/** The request's clock, read outside render so the page stays a pure function of its data. */
const nowMs = () => Date.now();

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** "2026-10" for a date, and back to a label. */
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key: string) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const shiftMonth = (key: string, by: number) => {
  const d = new Date(`${key}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return monthKey(d);
};

export default async function DashboardHome({ searchParams }: PageProps<"/dashboard">) {
  await connection();
  const session = await requireSession();
  const { seller, month } = await searchParams;
  const sellerId = session.kind === "seller" ? session.sellerId : typeof seller === "string" ? seller : undefined;
  const [{ disputes, sellers: allSellers }, insights] = await Promise.all([getHomeDataCached(sellerId), getInsights(sellerId)]);
  const sellers = session.kind === "seller" ? allSellers.filter((s) => s.id === session.sellerId) : allSellers;
  const store = sellers.find((s) => s.id === sellerId);
  const storeQuery = store ? `&seller=${encodeURIComponent(store.id)}` : "";

  const open = disputes.filter(isOpen);
  const waiting = disputes.filter(waitingOnSeller).sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  const drafts = disputes.filter(draftReady);
  const proofById = new Map(insights.disputes.map((d) => [d.id, d] as const));
  const needsTracking = waiting.filter((d) => {
    const p = proofById.get(d.id)?.proof;
    return d.reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" && (p === "no_tracking" || p === "no_record" || p === "not_delivered");
  });

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

  // Dispute activity for one month (?month=2026-10), like Mercury's money in / money out.
  const thisMonth = monthKey(new Date());
  const shownMonth = typeof month === "string" && /^\d{4}-\d{2}$/.test(month) ? month : thisMonth;
  const inMonth = resolvedRows.filter((r) => r.resolvedAt && monthKey(new Date(r.resolvedAt)) === shownMonth);
  const itemOf = (id: string) => proofById.get(id)?.item ?? "Order";
  const keptRows = inMonth.filter((r) => r.kept > 0);
  const refundRows = inMonth.filter((r) => r.refunded > 0);

  const recent = [...disputes].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")).slice(0, 6);

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-7 px-5 pt-7 pb-20 md:px-8">
      {/* Welcome + Sira's briefing + actions */}
      <section aria-labelledby="hello" className="flex flex-col gap-[18px]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 id="hello" className="text-[24px] font-[480] tracking-[0.01em] text-fg">
            {greeting()}
            {session.kind === "seller" ? `, ${firstName(session.name)}` : ""}
          </h1>
          {sellers.length > 1 && <StoreSelector stores={sellers} current={store} />}
        </div>
        <Briefing waiting={waiting} drafts={drafts} needsTracking={needsTracking} open={open.length} items={proofById} />
        <div role="group" aria-label="Quick actions" className="flex flex-wrap gap-2">
          {drafts.length > 0 && (
            <Button href="/review" prefetch={false} size="md" className="h-[38px] px-4">
              <ArrowRight aria-hidden strokeWidth={1.8} className="size-[15px]" />
              Review {drafts.length} draft{drafts.length === 1 ? "" : "s"}
            </Button>
          )}
          <Button href="/evidence" variant="soft" size="md" className="h-[38px] px-4 font-normal">
            <Plus aria-hidden strokeWidth={1.6} className="size-[15px]" />
            Add tracking
          </Button>
          <a
            href={RESOLUTION_CENTER}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-[38px] items-center gap-2 rounded-full bg-muted px-4 text-[14px] text-fg transition-colors hover:bg-inset"
          >
            <ExternalLink aria-hidden strokeWidth={1.6} className="size-[15px]" />
            Open in PayPal
          </a>
        </div>
      </section>

      {/* At risk + Waiting on you */}
      <div className="flex flex-wrap gap-5">
        <Panel aria-labelledby="atrisk" className="flex min-w-0 flex-[1.2_1_380px] flex-col px-6 pt-6 pb-3">
          <h2 id="atrisk" className="text-[14px] text-fg-muted">
            At risk
          </h2>
          <Money amount={atRisk} currency={currency} className="mt-2 text-[34px] leading-none font-[480] text-fg" />
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[13px] text-fg-body">
            <span>
              {open.length} open dispute{open.length === 1 ? "" : "s"} · last 30 days
              {byCurrency.length > 1 && (
                <span className="text-fg-muted">
                  {" "}
                  · also{" "}
                  {byCurrency.slice(1).map(([c, t], i) => (
                    <span key={c}>
                      {i > 0 && ", "}
                      <Amount amount={t} currency={c} />
                    </span>
                  ))}
                </span>
              )}
            </span>
            <span className="flex gap-4">
              <span>
                ↗ <Amount amount={kept30} currency={currency} /> kept
              </span>
              <span>
                ↘ <Amount amount={refunded30} currency={currency} /> refunded
              </span>
            </span>
          </div>
          <div className="money mt-2">
            <AtRiskChart points={points} currency={currency} />
          </div>
        </Panel>

        <Panel aria-labelledby="waiting" className="min-w-0 flex-[1_1_340px] px-6 pt-6 pb-3">
          <SectionHead
            id="waiting"
            title="Waiting on you"
            aside={
              <Link href="/disputes?view=needs-response" className="text-[13px] text-fg-muted hover:text-fg">
                View all
              </Link>
            }
          />
          {waiting.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-fg-muted">Nothing is waiting on you.</p>
          ) : (
            <ul className="mt-3">
              {waiting.slice(0, 5).map((d) => (
                <li key={d.id}>
                  <Link href={`/disputes/${d.id}`} className="flex items-center gap-3 border-t border-line-subtle py-3">
                    <Initials name={d.buyerName} />
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="truncate text-[14px] text-fg">{d.buyerName ?? "Buyer"}</span>
                      <span className="truncate text-[13px] text-fg-muted">{d.item ?? "Order"}</span>
                    </span>
                    <span className="flex flex-col items-end gap-[3px]">
                      <Amount amount={d.amount} currency={d.currency} className="text-[14px] text-fg" />
                      <span className={cn("text-[12.5px]", (d.daysLeft ?? 99) <= 0 ? "font-medium text-bad" : "text-fg-muted")}>
                        {dueLabel(d.daysLeft)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Dispute activity, like Mercury's money movement */}
      <section aria-labelledby="activity" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="activity" className="text-[20px] font-[480] tracking-[0.01em] text-fg">
            Dispute activity
          </h2>
          <span className="flex items-center gap-1">
            <Link
              href={`/dashboard?month=${shiftMonth(shownMonth, -1)}${storeQuery}`}
              aria-label="Previous month"
              className="inline-flex size-8 items-center justify-center rounded-lg text-fg-body hover:bg-muted"
            >
              <ChevronLeft strokeWidth={1.8} className="size-4" />
            </Link>
            <span className="text-[14px] text-fg-body">{monthLabel(shownMonth)}</span>
            {shownMonth < thisMonth ? (
              <Link
                href={`/dashboard?month=${shiftMonth(shownMonth, 1)}${storeQuery}`}
                aria-label="Next month"
                className="inline-flex size-8 items-center justify-center rounded-lg text-fg-body hover:bg-muted"
              >
                <ChevronRight strokeWidth={1.8} className="size-4" />
              </Link>
            ) : (
              <span aria-hidden className="inline-flex size-8 items-center justify-center text-line-strong">
                <ChevronRight strokeWidth={1.8} className="size-4" />
              </span>
            )}
          </span>
          <span className="flex-1" />
          <span className="text-[13px] text-fg-body">
            {insights.impact.handled} handled by Sira · about {Number.isInteger(insights.impact.hoursSaved) ? insights.impact.hoursSaved : insights.impact.hoursSaved.toFixed(1)} hours saved
          </span>
        </div>
        <div className="flex flex-wrap gap-5">
          <ActivityCard
            title="Kept"
            subtitle="Won or closed by the buyer"
            total={keptRows.reduce((s, r) => s + r.kept, 0)}
            currency={currency}
            tone="kept"
            rows={keptRows.map((r) => ({ id: r.disputeId, name: r.buyerName, item: itemOf(r.disputeId), amount: r.kept, currency: r.currency }))}
          />
          <ActivityCard
            title="Refunded"
            subtitle="Refunded or settled"
            total={refundRows.reduce((s, r) => s + r.refunded, 0)}
            currency={currency}
            tone="refunded"
            rows={refundRows.map((r) => ({ id: r.disputeId, name: r.buyerName, item: itemOf(r.disputeId), amount: r.refunded, currency: r.currency }))}
          />
        </div>
        {outcomes.resolved === 0 && <p className="text-[13px] text-fg-muted">Results appear here as disputes close.</p>}
      </section>

      {/* Recent disputes */}
      <Panel aria-labelledby="recent" className="px-6 pt-5 pb-2">
        <SectionHead
          id="recent"
          title="Recent disputes"
          aside={
            <Link href="/disputes" className="text-[13px] text-fg-muted hover:text-fg">
              View all
            </Link>
          }
        />
        {recent.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-fg-muted">No disputes yet. They appear here as soon as PayPal sends them.</p>
        ) : (
          <div className="mt-2.5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="text-[12.5px] text-fg-muted">
                  <th scope="col" className="py-2 font-[420]">Buyer</th>
                  <th scope="col" className="py-2 font-[420]">Where it stands</th>
                  <th scope="col" className="py-2 font-[420]">Sira&apos;s call</th>
                  <th scope="col" className="py-2 text-right font-[420]">Amount</th>
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
                        <ProgressLine step={stageStep(d)} className="w-[150px]" />
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
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Sira's note at the top of Home, written by fixed rules from the seller's own disputes:
 * what is due today, which drafts are ready, which orders need tracking.
 */
function Briefing({
  waiting,
  drafts,
  needsTracking,
  open,
  items,
}: {
  waiting: HomeDispute[];
  drafts: HomeDispute[];
  needsTracking: HomeDispute[];
  open: number;
  items: Map<string, InsightDispute>;
}) {
  type Line = { id: string; href: string; who: string; text: string };
  const lines: Line[] = [];
  const seen = new Set<string>();
  const add = (d: HomeDispute, text: string, href: string) => {
    if (seen.has(d.id) || lines.length >= 3) return;
    seen.add(d.id);
    lines.push({ id: d.id, href, who: `${firstName(d.buyerName)}'s ${(d.item ?? items.get(d.id)?.item ?? "order").toLowerCase()}`, text });
  };
  for (const d of waiting.filter((d) => (d.daysLeft ?? 99) <= 1)) add(d, (d.daysLeft ?? 0) < 0 ? "is overdue" : d.daysLeft === 0 ? "is due today" : "is due tomorrow", `/disputes/${d.id}`);
  for (const d of drafts) add(d, "has a reply ready", "/review");
  for (const d of needsTracking) add(d, "needs tracking", "/evidence");
  const rest = Math.max(0, open - lines.length);

  return (
    <p className="max-w-[760px] text-[16px] leading-[26px] text-fg-body">
      {lines.length === 0 ? (
        <>Nothing needs you today. Sira is watching {open === 1 ? "your open dispute" : `your ${open} open disputes`}.</>
      ) : (
        <>
          {lines.length === 1 ? "One dispute needs" : `${lines.length === 2 ? "Two" : "Three"} disputes need`} you today:{" "}
          {lines.map((l, i) => (
            <span key={l.id}>
              {i > 0 && (i === lines.length - 1 ? ", and " : ", ")}
              <Link href={l.href} className="font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
                {l.who}
              </Link>{" "}
              {l.text}
            </span>
          ))}
          .{rest > 0 && ` Sira is watching the other ${rest}.`}
        </>
      )}
    </p>
  );
}

function ActivityCard({
  title,
  subtitle,
  total,
  currency,
  tone,
  rows,
}: {
  title: string;
  subtitle: string;
  total: number;
  currency: string;
  tone: "kept" | "refunded";
  rows: { id: string; name: string | null; item: string; amount: number; currency: string }[];
}) {
  return (
    <Panel className="flex-[1_1_320px] p-6">
      <h3 className="text-[14px] text-fg-muted">{title}</h3>
      <Money
        amount={total}
        currency={currency}
        sign={tone === "refunded" && total > 0 ? "−" : undefined}
        className={cn("mt-2 block text-[26px] leading-none font-[480]", tone === "kept" ? "text-ok" : "text-fg")}
        centsClassName={tone === "kept" ? "text-ok/80" : undefined}
      />
      <p className="mt-5 mb-1 text-[13px] text-fg-muted">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="border-t border-line-subtle pt-3 text-[13.5px] text-fg-muted">None this month.</p>
      ) : (
        rows.slice(0, 4).map((r) => (
          <Link key={r.id} href={`/disputes/${r.id}`} className="flex items-center gap-3 border-t border-line-subtle py-2.5 text-[14px]">
            <Initials name={r.name} size="sm" />
            <span className="flex-1 truncate">{r.item}</span>
            <Amount amount={r.amount} currency={r.currency} className={tone === "refunded" ? "text-fg" : "text-ok"} />
          </Link>
        ))
      )}
    </Panel>
  );
}

function Initials({ name, size = "md" }: { name: string | null; size?: "sm" | "md" }) {
  const initials =
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-line font-medium text-fg-body",
        size === "sm" ? "size-7 text-[11px]" : "size-8 text-[11.5px]",
      )}
    >
      {initials}
    </span>
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
