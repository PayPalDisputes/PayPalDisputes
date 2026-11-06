import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { connection } from "next/server";
import { Amount } from "@/components/app/bits";
import { OutcomeChart, type OutcomeBar } from "@/components/app/Charts";
import { ReasonChart, ShippingProofChart, TrendChart, ValueBandChart, type ProofBar, type ReasonCount } from "@/components/app/InsightsCharts";
import { reasonLabel } from "@/app/_components/dispute-ui";
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
  const { impact, outcomeRows, disputes, tips } = await getInsights(sellerScope(session));
  const { outcomes } = impact;
  const kept = outcomes.kept[0];

  const winRate = outcomes.resolved ? Math.round((outcomes.won / outcomes.resolved) * 100) : null;
  // Four answers, each a number with a few words under it. No paragraphs.
  const stats: { label: string; value: React.ReactNode; hint: string; tone?: string }[] = [
    {
      label: "Money kept",
      value: kept ? (
        <span className="inline-flex items-center gap-1">
          <ArrowUpRight aria-hidden strokeWidth={2} className="size-6" />
          <Amount amount={kept.amount} currency={kept.currency} />
        </span>
      ) : (
        "—"
      ),
      hint: `${outcomes.resolved} resolved`,
      tone: kept && kept.amount > 0 ? "text-ok" : undefined,
    },
    { label: "Win rate", value: winRate === null ? "—" : `${winRate}%`, hint: outcomes.resolved ? `${outcomes.won} of ${outcomes.resolved} won` : "none resolved yet" },
    {
      label: "Sira was right",
      value: outcomes.followed ? `${outcomes.heldUp} of ${outcomes.followed}` : "—",
      hint: "when you followed it",
    },
    {
      label: "Time saved",
      value: <>~{formatHours(impact.hoursSaved)}</>,
      hint: `${impact.handled} disputes handled`,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-9 px-5 pt-8 pb-20 md:px-10 md:pt-9">
      <h1 className="text-[24px] font-[480] tracking-[0.01em] text-fg">Insights</h1>

      {/* The scoreboard: four numbers, nothing to read */}
      <section aria-label="Your results" className="grid grid-cols-2 rounded-xl border border-line bg-canvas lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn("flex flex-col gap-2 border-line px-6 py-[22px]", i % 2 === 1 && "border-l", i >= 2 && "border-t lg:border-t-0", i === 2 && "lg:border-l")}
          >
            <span className="text-[13px] text-fg-muted">{s.label}</span>
            <span className={cn("text-[30px] leading-none font-[480] tabular-nums", s.tone ?? "text-fg")}>{s.value}</span>
            <span className="text-[12.5px] text-fg-muted">{s.hint}</span>
          </div>
        ))}
      </section>
      <p className="-mt-6 text-[12.5px] text-fg-muted">
        Time saved counts {MANUAL_HOURS_PER_DISPUTE} hours per dispute handled by hand, the low end of the 1 to 3 hours industry estimates.
      </p>

      {/* What to do about it: one line each, with the button; the reasoning is on hover */}
      {tips.length > 0 && (
        <section aria-labelledby="prevent" className="flex flex-col gap-3">
          <h2 id="prevent" className="t-section">
            Fix these first
          </h2>
          <ol className="rounded-xl border border-line bg-canvas">
            {tips.map((t, i) => (
              <li key={t.id} title={t.body} className={cn("flex items-center gap-3 px-[22px] py-4", i > 0 && "border-t border-line-subtle")}>
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-bg text-[12.5px] text-accent tabular-nums">{i + 1}</span>
                <span className="flex-1 text-[15px] text-fg">{t.title}</span>
                {t.href && t.action && (
                  <Link href={t.href} className="inline-flex items-center gap-0.5 text-[13.5px] whitespace-nowrap text-accent hover:underline">
                    {t.action}
                    <ChevronRight aria-hidden strokeWidth={1.8} className="size-4" />
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Patterns */}
      <section aria-labelledby="patterns" className="flex flex-col gap-3">
        <h2 id="patterns" className="t-section">
          Why disputes happen
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <ReasonChart rows={reasonCounts(disputes)} />
          <ShippingProofChart bars={proofBars(disputes)} />
          <TrendChart weeks={weeklyCounts(disputes)} />
          <ValueBandChart bands={valueBands(disputes)} />
        </div>
      </section>

      {/* How each dispute ended */}
      <section aria-labelledby="results" className="flex flex-col gap-3">
        <h2 id="results" className="t-section">
          How each one ended
        </h2>
        {outcomeRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-5 py-8 text-center text-[14px] text-fg-muted">
            Results appear here as disputes close.
          </p>
        ) : (
          <OutcomeChart bars={outcomeBars(outcomeRows)} />
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

/** Every dispute (open and resolved) by the reason the buyer gave, most common first. */
function reasonCounts(disputes: InsightDispute[]): ReasonCount[] {
  const by = new Map<string, number>();
  for (const d of disputes) by.set(reasonLabel(d.reason), (by.get(reasonLabel(d.reason)) ?? 0) + 1);
  return [...by.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

const PROOF_ORDER: ShippingProof[] = ["signed", "delivered", "not_delivered", "no_tracking", "no_record"];

function proofBars(disputes: InsightDispute[]): ProofBar[] {
  const notReceived = disputes.filter((d) => d.reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED");
  return PROOF_ORDER.map((p) => ({
    label: SHIPPING_PROOF_LABEL[p],
    value: notReceived.filter((d) => d.proof === p).length,
    urgent: p === "not_delivered" || p === "no_tracking" || p === "no_record",
  }))
    .filter((b) => b.value > 0);
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
  });
}

function valueBands(disputes: InsightDispute[]) {
  return [
    { label: "Under $25", test: (a: number) => a < 25 },
    { label: "$25–100", test: (a: number) => a >= 25 && a < 100 },
    { label: "$100–250", test: (a: number) => a >= 100 && a < 250 },
    { label: "$250+", test: (a: number) => a >= 250 },
  ].map(({ label, test }) => ({ label, value: disputes.filter((d) => test(d.amount)).length }));
}
