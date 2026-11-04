"use client";

import { AgCharts } from "ag-charts-react";
import { barChart, ChartCard, Empty } from "./Charts";

/* ------------------------------------------------------------------ */
/* Insights page: why disputes happen                                  */
/* ------------------------------------------------------------------ */
// Each chart answers one question in its title, says the answer in a sentence above the bars, and
// uses one colour; red only marks the bars that need attention, and says so.

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export type ReasonCount = { label: string; value: number };

/** Every dispute by the reason the buyer gave PayPal, most common first. */
export function ReasonChart({ rows }: { rows: ReasonCount[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const top = rows[0];
  return (
    <ChartCard
      title="What do buyers dispute?"
      takeaway={top ? `Most of your disputes are “${top.label}”: ${top.value} of ${total}.` : undefined}
      description="Number of disputes by the reason the buyer gave PayPal."
      table={rows.map((r) => ({ label: r.label, value: String(r.value) }))}
    >
      {total === 0 ? (
        <Empty>No disputes yet.</Empty>
      ) : (
        <div style={{ height: Math.max(170, rows.length * 44 + 40) }}>
          <AgCharts options={barChart(rows, { horizontal: true, yName: "Disputes" })} style={{ height: "100%" }} />
        </div>
      )}
    </ChartCard>
  );
}

export type ProofBar = { label: string; value: number; urgent: boolean };

/** "Not received" disputes by the shipping proof the seller had. Red = no delivery proof, the preventable ones. */
export function ShippingProofChart({ bars }: { bars: ProofBar[] }) {
  const total = bars.reduce((s, b) => s + b.value, 0);
  const noProof = bars.filter((b) => b.urgent).reduce((s, b) => s + b.value, 0);
  return (
    <ChartCard
      title="Could you prove delivery?"
      takeaway={
        total === 0
          ? undefined
          : noProof === 0
            ? `You had proof of delivery on all ${plural(total, "“not received” claim")}.`
            : `${noProof} of ${plural(total, "“not received” claim")} had no proof of delivery. Those are the ones you can prevent.`
      }
      description="“Item not received” claims by the shipping proof you had. Red bars had no proof of delivery."
      table={bars.map((b) => ({ label: b.label, value: String(b.value) }))}
    >
      {total === 0 ? (
        <Empty>No &ldquo;not received&rdquo; claims yet.</Empty>
      ) : (
        <div style={{ height: Math.max(170, bars.length * 44 + 40) }}>
          <AgCharts options={barChart(bars, { horizontal: true, yName: "Claims" })} style={{ height: "100%" }} />
        </div>
      )}
    </ChartCard>
  );
}

/** Disputes opened per week, so a spike after a product launch or carrier change stands out. */
export function TrendChart({ weeks }: { weeks: { label: string; value: number }[] }) {
  const total = weeks.reduce((s, w) => s + w.value, 0);
  const recent = weeks.slice(-4).reduce((s, w) => s + w.value, 0);
  const before = weeks.slice(-8, -4).reduce((s, w) => s + w.value, 0);
  const change = recent === before ? "the same as" : recent > before ? "up from" : "down from";
  return (
    <ChartCard
      title="Are disputes going up?"
      takeaway={total === 0 ? undefined : `${plural(recent, "new dispute")} in the last 4 weeks, ${change} ${before} in the 4 weeks before.`}
      description="New disputes each week over the last 12 weeks. Each bar is one week, labelled by the Monday it starts."
      table={weeks.filter((w) => w.value > 0).map((w) => ({ label: `Week of ${w.label}`, value: String(w.value) }))}
    >
      {total === 0 ? (
        <Empty>No disputes in the last 12 weeks.</Empty>
      ) : (
        <div className="h-[220px]">
          <AgCharts options={barChart(weeks, { yName: "New disputes", format: (v) => (v ? String(v) : "") })} style={{ height: "100%" }} />
        </div>
      )}
    </ChartCard>
  );
}

/** Disputes by order value: shows whether small claims are worth an auto-refund rule. */
export function ValueBandChart({ bands }: { bands: { label: string; value: number }[] }) {
  const total = bands.reduce((s, b) => s + b.value, 0);
  const small = bands[0]?.value ?? 0;
  return (
    <ChartCard
      title="How big are the claims?"
      takeaway={
        total === 0
          ? undefined
          : small > 0
            ? `${small} of ${total} disputes ${small === 1 ? "was" : "were"} under $25. An auto-refund rule in Settings could handle ${small === 1 ? "it" : "those"} for you.`
            : `None of your ${total} disputes were under $25.`
      }
      description="Number of disputes by how much the buyer is claiming."
      table={bands.map((b) => ({ label: b.label, value: String(b.value) }))}
    >
      {total === 0 ? (
        <Empty>No disputes yet.</Empty>
      ) : (
        <div className="h-[220px]">
          <AgCharts options={barChart(bands, { yName: "Disputes" })} style={{ height: "100%" }} />
        </div>
      )}
    </ChartCard>
  );
}
