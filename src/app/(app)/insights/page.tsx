import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Lightbulb } from "lucide-react";
import { ReasonResultChart, ShippingProofChart, TrendChart, ValueBandChart, type ProofBar, type ReasonResult } from "@/components/app/InsightsCharts";
import { ItemsGrid } from "@/components/app/ItemsGrid";
import { formatAmount, reasonLabel } from "@/app/_components/dispute-ui";
import { requireSession, sellerScope } from "@/lib/auth";
import { getInsights, MANUAL_HOURS_PER_DISPUTE, SHIPPING_PROOF_LABEL, type InsightDispute, type ShippingProof, type Tip } from "@/lib/insights";

export const metadata: Metadata = { title: "Insights · Sira" };

const DAY = 86_400_000;

/** What Sira has saved the seller, and why their disputes happen, so the next one doesn't. */
export default async function InsightsPage() {
  await connection();
  const session = await requireSession();
  const { impact, disputes, items, tips } = await getInsights(sellerScope(session));
  const { outcomes } = impact;
  const kept = outcomes.kept[0];

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-20 md:px-10 md:pt-10">
      <header className="max-w-[720px]">
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-fg">Insights</h1>
        <p className="mt-1 text-[13.5px] leading-5 text-fg-body">
          What Sira has saved you so far, and why your disputes happen, so you can stop the next one before it starts.
        </p>
      </header>

      {/* Impact */}
      <section aria-labelledby="impact" className="mt-8">
        <h2 id="impact" className="text-[15px] font-semibold text-fg">
          What Sira has saved you
        </h2>
        <p className="mt-0.5 text-[12.5px] text-fg-muted">All time</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <ImpactCard
            label="Time saved"
            value={`~${formatHours(impact.hoursSaved)}`}
            hint={`${impact.handled} dispute${impact.handled === 1 ? "" : "s"} investigated and drafted for you`}
            highlight
          />
          <ImpactCard
            label="Money kept"
            value={kept ? formatAmount(kept.amount, kept.currency) : "—"}
            hint={
              outcomes.kept.length > 1
                ? `plus ${outcomes.kept.slice(1).map((k) => formatAmount(k.amount, k.currency)).join(", ")}`
                : `across ${outcomes.resolved} resolved dispute${outcomes.resolved === 1 ? "" : "s"}`
            }
          />
          <ImpactCard
            label="Won or settled"
            value={outcomes.resolved ? `${outcomes.won + outcomes.settled} of ${outcomes.resolved}` : "—"}
            hint={outcomes.autoRefunded ? `${outcomes.autoRefunded} small claim${outcomes.autoRefunded === 1 ? "" : "s"} auto-refunded` : "Resolved disputes"}
          />
          <ImpactCard
            label="Missed deadlines"
            value={String(impact.overdue)}
            hint={impact.overdue ? "Respond now: PayPal rules for the buyer" : "A missed deadline is an automatic loss"}
            bad={impact.overdue > 0}
            href={impact.overdue ? "/disputes?view=needs-response" : undefined}
          />
        </div>
        <p className="mt-3 text-[12px] leading-[18px] text-fg-muted">
          * Time saved assumes {MANUAL_HOURS_PER_DISPUTE} hours per dispute done by hand (reading the case, gathering proof, writing the response).
          Industry estimates run 1 to 3 hours, so this is the conservative end.
        </p>
      </section>

      {/* Tips */}
      <section aria-labelledby="prevent" className="mt-12">
        <h2 id="prevent" className="text-[15px] font-semibold text-fg">
          How to prevent the next one
        </h2>
        <p className="mt-0.5 text-[12.5px] text-fg-muted">Worked out from your own disputes, orders and outcomes</p>
        {tips.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-canvas px-5 py-8 text-center text-[13.5px] text-fg-muted">
            No patterns yet. Tips appear here as Sira sees more of your disputes.
          </p>
        ) : (
          <ol className="mt-4 grid gap-3 lg:grid-cols-3">
            {tips.map((t) => (
              <TipCard key={t.id} tip={t} />
            ))}
          </ol>
        )}
      </section>

      {/* Patterns */}
      <section aria-labelledby="patterns" className="mt-12">
        <h2 id="patterns" className="text-[15px] font-semibold text-fg">
          Why you get disputes
        </h2>
        <p className="mt-0.5 text-[12.5px] text-fg-muted">
          {disputes.length} dispute{disputes.length === 1 ? "" : "s"}, open and resolved
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <ReasonResultChart rows={reasonResults(disputes)} />
          <ShippingProofChart bars={proofBars(disputes)} />
          <TrendChart weeks={weeklyCounts(disputes)} />
          <ValueBandChart bands={valueBands(disputes)} />
        </div>
      </section>

      {/* Products */}
      <section aria-labelledby="products" className="mt-12">
        <h2 id="products" className="text-[15px] font-semibold text-fg">
          Products that get disputed
        </h2>
        <p className="mt-0.5 mb-4 text-[12.5px] text-fg-muted">Sort or filter any column. Low delivery proof means tracking would have helped.</p>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-canvas px-5 py-8 text-center text-[13.5px] text-fg-muted">No disputes yet.</p>
        ) : (
          <ItemsGrid rows={items} />
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function formatHours(h: number) {
  return h < 1 ? `${Math.round(h * 60)} min` : `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
}

function ImpactCard({
  label,
  value,
  hint,
  highlight,
  bad,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
  bad?: boolean;
  href?: string;
}) {
  const className =
    "block rounded-2xl border p-5 " +
    (highlight ? "border-fg bg-fg text-white" : bad ? "border-bad/30 bg-bad-bg" : "border-line bg-canvas") +
    (href ? " transition-shadow hover:shadow-card" : "");
  const inner = (
    <>
      <span className={`text-[13px] font-medium ${highlight ? "text-white/80" : bad ? "text-bad" : "text-fg-heading"}`}>{label}</span>
      <span className={`mt-3 block font-serif text-[32px] leading-none tabular-nums ${highlight ? "text-white" : bad ? "text-bad" : "text-fg"}`}>{value}</span>
      <span className={`mt-2 block text-[12px] leading-4 ${highlight ? "text-white/70" : "text-fg-muted"}`}>{hint}</span>
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

function TipCard({ tip }: { tip: Tip }) {
  return (
    <li className="flex flex-col rounded-2xl border border-line bg-canvas p-5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-warn-bg text-warn">
        <Lightbulb aria-hidden strokeWidth={1.75} className="size-[18px]" />
      </span>
      <h3 className="mt-3 text-[14.5px] leading-5 font-medium text-fg">{tip.title}</h3>
      <p className="mt-1.5 flex-1 text-[13px] leading-5 text-fg-body">{tip.body}</p>
      {tip.href && tip.action && (
        <Link href={tip.href} className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-fg underline-offset-4 hover:underline">
          {tip.action} <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
        </Link>
      )}
    </li>
  );
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
  })).filter((b) => b.value > 0);
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
    { label: "Under 25", test: (a: number) => a < 25 },
    { label: "25–100", test: (a: number) => a >= 25 && a < 100 },
    { label: "100–250", test: (a: number) => a >= 100 && a < 250 },
    { label: "250+", test: (a: number) => a >= 250 },
  ].map(({ label, test }) => ({ label, value: disputes.filter((d) => test(d.amount)).length }));
}
