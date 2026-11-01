import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ChevronDown, ExternalLink, Plus } from "lucide-react";
import { Amount, Money, Panel, ProgressLine, SectionHead } from "@/components/app/bits";
import { AtRiskChart, type RiskPoint } from "@/components/app/HomeCharts";
import { Button } from "@/components/ui/Button";
import { requireSession } from "@/lib/auth";
import { getHomeDataCached, type HomeDispute } from "@/lib/dashboard";
import { callLabel, dueLabel, stageLabel } from "@/lib/dispute-stage";
import { getInsights } from "@/lib/insights";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Home · Sira" };

const RESOLUTION_CENTER = (process.env.PAYPAL_API_BASE ?? "").includes("sandbox") || !process.env.PAYPAL_API_BASE
  ? "https://www.sandbox.paypal.com/disputes/"
  : "https://www.paypal.com/disputes/";

const DAY = 86_400_000;
/** The demo account's stand-in name for the greeting. */
const DEMO_FIRST_NAME = "John";
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
  const [{ disputes, sellers: allSellers }, insights] = await Promise.all([getHomeDataCached(sellerId), getInsights(sellerId)]);
  const sellers = session.kind === "seller" ? allSellers.filter((s) => s.id === session.sellerId) : allSellers;
  const store = sellers.find((s) => s.id === sellerId);

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

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-7 px-5 pt-7 pb-20 md:px-8">
      {/* Headline numbers + actions */}
      <section aria-labelledby="overview" className="flex flex-col gap-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 id="overview" className="text-[24px] font-semibold tracking-[-0.01em] text-fg">
            Hello, {session.kind === "seller" && session.name ? session.name.split(/\s+/)[0] : DEMO_FIRST_NAME}
          </h1>
          {sellers.length > 1 && <StoreSelector stores={sellers} current={store} />}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:max-w-[520px]">
          <CountCard
            href="/disputes?view=needs-response"
            label="Need your response"
            value={waiting.length}
            hint={
              waiting.length === 0
                ? "Nothing needs you"
                : overdue > 0
                  ? `${overdue} overdue`
                  : drafts.length > 0
                    ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} ready`
                    : "Sira is drafting"
            }
            tone={overdue > 0 ? "bad" : undefined}
          />
          <CountCard href="/disputes" label="Active disputes" value={open.length} hint="Open with PayPal" />
        </div>
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
            className="inline-flex h-[38px] items-center gap-2 rounded-md bg-muted px-4 text-[14px] text-fg transition-colors hover:bg-inset"
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
              Last 30 days
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
          <span className="text-[14px] text-fg-body">Last 30 days</span>
          <span className="flex-1" />
          <span className="text-[13px] text-fg-body">
            {insights.impact.handled} handled by Sira · about {Number.isInteger(insights.impact.hoursSaved) ? insights.impact.hoursSaved : insights.impact.hoursSaved.toFixed(1)} hours saved
          </span>
        </div>
        <div className="flex flex-wrap gap-5">
          <ActivityCard title="Kept" subtitle="Won or closed by the buyer" total={keptRows.reduce((s, r) => s + r.kept, 0)} count={keptRows.length} currency={currency} tone="kept" />
          <ActivityCard title="Refunded" subtitle="Refunded or settled" total={refundRows.reduce((s, r) => s + r.refunded, 0)} count={refundRows.length} currency={currency} tone="refunded" />
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
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** A headline count at the top of Home, linking to the disputes it counts. */
function CountCard({ href, label, value, hint, tone }: { href: string; label: string; value: number; hint: string; tone?: "bad" }) {
  return (
    <Link href={href} className="group flex flex-col gap-2 rounded-xl border border-line bg-canvas px-5 py-4 transition-colors hover:border-line-strong">
      <span className="text-[13px] text-fg-body">{label}</span>
      <span className="text-[32px] leading-none font-[480] text-fg tabular-nums">{value}</span>
      <span className={cn("text-[12.5px]", tone === "bad" ? "font-medium text-bad" : "text-fg-muted")}>{hint}</span>
    </Link>
  );
}

function ActivityCard({
  title,
  subtitle,
  total,
  count,
  currency,
  tone,
}: {
  title: string;
  subtitle: string;
  total: number;
  count: number;
  currency: string;
  tone: "kept" | "refunded";
}) {
  // Refunds read in red, but only when there's something refunded; nothing to show stays neutral.
  const color = total === 0 ? "text-fg" : tone === "kept" ? "text-ok" : "text-bad";
  return (
    <Panel className="flex-[1_1_320px] p-6">
      <h3 className="text-[14px] text-fg-muted">{title}</h3>
      <Money amount={total} currency={currency} className={cn("mt-2 block text-[26px] leading-none font-[480]", color)} centsClassName={cn(color, "opacity-80")} />
      <p className="mt-3 text-[13px] text-fg-muted">
        {subtitle} · {count === 0 ? "none yet" : `${count} dispute${count === 1 ? "" : "s"}`}
      </p>
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
