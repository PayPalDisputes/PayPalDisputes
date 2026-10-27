import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Amount } from "@/components/app/bits";
import { OutcomeChart, type OutcomeBar } from "@/components/app/Charts";
import { ReasonResultChart, ShippingProofChart, TrendChart, ValueBandChart, type ProofBar, type ReasonResult } from "@/components/app/InsightsCharts";
import { ItemsGrid } from "@/components/app/ItemsGrid";
import { OutcomesGrid } from "@/components/app/OutcomesGrid";
import { reasonLabel } from "@/app/_components/dispute-ui";
import { BLUES } from "@/lib/palette";
import { requireSession, sellerScope } from "@/lib/auth";
import { getInsights, MANUAL_HOURS_PER_DISPUTE, SHIPPING_PROOF_LABEL, type InsightDispute, type ShippingProof } from "@/lib/insights";
import type { OutcomeRow } from "@/lib/outcomes";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Insights · Sira" };

const DAY = 86_400_000;

/** What Sira has saved the seller, why their disputes happen, and how each one ended (Mock 2). */
export default async function InsightsPage() {
  await connection();
  const session = await requireSession();
  const { impact, outcomeRows, disputes, items, tips } = await getInsights(sellerScope(session));
  const { outcomes } = impact;
  const kept = outcomes.kept[0];

  const stats = [
    {
      label: "Time saved",
      value: <>~{formatHours(impact.hoursSaved)}</>,
      hint: `${impact.handled} dispute${impact.handled === 1 ? "" : "s"} handled by Sira`,
    },
    {
      label: "Money kept",
      value: kept ? <Amount amount={kept.amount} currency={kept.currency} /> : "—",
      hint: `across ${outcomes.resolved} resolved dispute${outcomes.resolved === 1 ? "" : "s"}`,
      tone: "text-ok",
    },
    {
      label: "Won or settled",
      value: outcomes.resolved ? `${outcomes.won + outcomes.settled} of ${outcomes.resolved}` : "—",
      hint: outcomes.autoRefunded ? `${outcomes.autoRefunded} small claim${outcomes.autoRefunded === 1 ? "" : "s"} auto-refunded` : "resolved disputes",
    },
    {
      label: "Missed deadlines",
      value: String(impact.overdue),
      hint: impact.overdue ? "respond now: PayPal rules for the buyer" : "a missed deadline is an automatic loss",
      tone: impact.overdue ? "text-bad" : undefined,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-9 px-5 pt-8 pb-20 md:px-10 md:pt-9">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[24px] font-[480] tracking-[0.01em] text-fg">Insights</h1>
        <p className="text-[14.5px] text-fg-body">What Sira has saved you, why your disputes happen, and how each one ended.</p>
      </header>

      {/* Impact: one strip of four numbers, divided by hairlines */}
      <section aria-labelledby="saved" className="flex flex-col gap-3">
        <h2 id="saved" className="t-section">
          What Sira has saved you
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] rounded-xl border border-line bg-canvas">
          {stats.map((s, i) => (
            <div key={s.label} className={cn("flex flex-col gap-2 px-6 py-[22px]", i > 0 && "border-l border-line")}>
              <span className="text-[13px] text-fg-body">{s.label}</span>
              <span className={cn("text-[28px] leading-none font-[480] tabular-nums", s.tone ?? "text-fg")}>{s.value}</span>
              <span className="text-[12.5px] text-fg-muted">{s.hint}</span>
            </div>
          ))}
        </div>
        <p className="text-[12.5px] text-fg-muted">
          Time saved counts {MANUAL_HOURS_PER_DISPUTE} hours per dispute handled by hand, the low end of the 1 to 3 hours industry estimates.
        </p>
      </section>

      {/* Prevention: a numbered list, no icons */}
      <section aria-labelledby="prevent" className="flex flex-col gap-3">
        <h2 id="prevent" className="t-section">
          How to prevent the next one
        </h2>
        {tips.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-5 py-8 text-center text-[14px] text-fg-muted">
            No patterns yet. Tips appear here as Sira sees more of your disputes.
          </p>
        ) : (
          <ol className="rounded-xl border border-line bg-canvas">
            {tips.map((t, i) => (
              <li key={t.id} className={cn("flex gap-3 px-[22px] py-[18px]", i > 0 && "border-t border-line-subtle")}>
                <span className="w-7 shrink-0 text-[14px] text-fg-muted tabular-nums">{i + 1}</span>
                <span className="flex flex-1 flex-col gap-1">
                  <span className="text-[15px] font-[480] text-fg">{t.title}</span>
                  <span className="text-[14px] leading-[22px] text-fg-body">{t.body}</span>
                </span>
                {t.href && t.action && (
                  <Link href={t.href} className="self-center text-[13.5px] whitespace-nowrap text-accent hover:underline">
                    {t.action}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Patterns */}
      <section aria-labelledby="patterns" className="flex flex-col gap-3">
        <h2 id="patterns" className="t-section">
          Why you get disputes
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <ReasonResultChart rows={reasonResults(disputes)} />
          <ShippingProofChart bars={proofBars(disputes)} />
          <TrendChart weeks={weeklyCounts(disputes)} />
          <ValueBandChart bands={valueBands(disputes)} />
        </div>
      </section>

      {/* Products */}
      <section aria-labelledby="products" className="flex flex-col gap-3">
        <h2 id="products" className="t-section">
          Products that get disputed
        </h2>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-5 py-8 text-center text-[14px] text-fg-muted">No disputes yet.</p>
        ) : (
          <ItemsGrid rows={items} />
        )}
      </section>

      {/* How each dispute ended */}
      <section aria-labelledby="results" className="flex flex-col gap-3">
        <h2 id="results" className="t-section">
          How your disputes ended
        </h2>
        {outcomeRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-5 py-8 text-center text-[14px] text-fg-muted">
            Results appear here as disputes close: what you kept, and whether following Sira&apos;s advice paid off.
          </p>
        ) : (
          <>
            <p className="text-[14px] text-fg-body">
              {outcomes.followed ? `Sira's call held up ${outcomes.heldUp} of ${outcomes.followed} times you followed it.` : "Results so far."}
              {outcomes.fought ? ` You won ${outcomes.foughtWon} of ${outcomes.fought} you fought.` : ""}
              {outcomes.avgResponseHours !== null ? ` Average time to respond: ${formatHours(outcomes.avgResponseHours)}.` : ""}
            </p>
            <div className="grid gap-5 lg:grid-cols-3">
              <OutcomeChart bars={outcomeBars(outcomeRows)} />
              <div className="lg:col-span-2">
                <OutcomesGrid rows={outcomeRows} />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function formatHours(h: number) {
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h >= 48 ? `${(h / 24).toFixed(1)} days` : `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
}

/** Resolved disputes by what the seller did, split by how they ended. */
function outcomeBars(rows: OutcomeRow[]): OutcomeBar[] {
  return (
    [
      { label: "Fought", match: (r: OutcomeRow) => r.did === "fight" },
      { label: "Offered to settle", match: (r: OutcomeRow) => r.did === "settle" },
      { label: "Refunded", match: (r: OutcomeRow) => r.did === "refund" },
      { label: "No response", match: (r: OutcomeRow) => r.did === null },
    ] as const
  )
    .map(({ label, match }) => {
      const group = rows.filter(match);
      return {
        label,
        won: group.filter((r) => r.result === "won").length,
        settled: group.filter((r) => r.result === "settled").length,
        lost: group.filter((r) => r.result === "lost").length,
      };
    })
    .filter((b) => b.won + b.settled + b.lost > 0);
}

/* Chart data, all from the same dispute rows. */

function reasonResults(disputes: InsightDispute[]): ReasonResult[] {
  const by = new Map<string, ReasonResult>();
  for (const d of disputes) {
    const label = reasonLabel(d.reason);
    const row = by.get(label) ?? { label, open: 0, won: 0, settled: 0, lost: 0 };
    if (d.result === null) row.open++;
    else if (d.result === "won") row.won++;
    else if (d.result === "settled") row.settled++;
    else if (d.result === "lost") row.lost++;
    by.set(label, row);
  }
  return [...by.values()].sort((a, b) => b.open + b.won + b.settled + b.lost - (a.open + a.won + a.settled + a.lost));
}

const PROOF_ORDER: ShippingProof[] = ["signed", "delivered", "not_delivered", "no_tracking", "no_record"];

function proofBars(disputes: InsightDispute[]): ProofBar[] {
  const notReceived = disputes.filter((d) => d.reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED");
  return PROOF_ORDER.map((p) => ({
    label: SHIPPING_PROOF_LABEL[p],
    value: notReceived.filter((d) => d.proof === p).length,
    urgent: p === "not_delivered" || p === "no_tracking" || p === "no_record",
  }))
    .filter((b) => b.value > 0)
    // The preventable ones (no delivery proof) get the deepest blue; the rest step lighter.
    .map((b, i) => ({ ...b, color: b.urgent ? BLUES[0] : BLUES[Math.min(1 + i, BLUES.length - 1)] }));
}

function weeklyCounts(disputes: InsightDispute[]) {
  // Weeks start on Monday (UTC); the last bar is the current week.
  const now = new Date();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
  return Array.from({ length: 12 }, (_, i) => {
    const start = monday.getTime() - (11 - i) * 7 * DAY;
    return {
      label: new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      value: disputes.filter((d) => {
        const t = d.openedAt ? new Date(d.openedAt).getTime() : NaN;
        return t >= start && t < start + 7 * DAY;
      }).length,
    };
  }).map((w) => ({ ...w, color: w.value >= 3 ? BLUES[0] : w.value === 2 ? BLUES[1] : BLUES[2] })); // busier weeks are deeper blue
}

function valueBands(disputes: InsightDispute[]) {
  return [
    { label: "Under 25", test: (a: number) => a < 25 },
    { label: "25–100", test: (a: number) => a >= 25 && a < 100 },
    { label: "100–250", test: (a: number) => a >= 100 && a < 250 },
    { label: "250+", test: (a: number) => a >= 250 },
  ].map(({ label, test }, i) => ({ label, value: disputes.filter((d) => test(d.amount)).length, color: BLUES[i] }));
}
