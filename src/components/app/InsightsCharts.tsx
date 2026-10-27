"use client";

import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { barChart, ChartCard, Empty, twoLines } from "./Charts";
import { baseChart, BLUES, COLORS } from "./ag-setup";

/* ------------------------------------------------------------------ */
/* Insights page: why disputes happen                                  */
/* ------------------------------------------------------------------ */

export type ReasonResult = { label: string; open: number; won: number; settled: number; lost: number };

/** Every dispute (open and resolved) by reason, stacked by how it ended so far. */
export function ReasonResultChart({ rows }: { rows: ReasonResult[] }) {
  const total = rows.reduce((s, r) => s + r.open + r.won + r.settled + r.lost, 0);
  const series = [
    { yKey: "open", yName: "Still open", fill: BLUES[2] },
    { yKey: "won", yName: "Won", fill: BLUES[0] },
    { yKey: "settled", yName: "Settled", fill: BLUES[1] },
    { yKey: "lost", yName: "Lost", fill: COLORS.urgent },
  ] as const;
  return (
    <ChartCard
      title="What buyers dispute"
      description="All your disputes by the reason the buyer gave PayPal, and how they ended."
      table={rows.map((r) => ({ label: r.label, value: `${r.open} open · ${r.won} won · ${r.settled} settled · ${r.lost} lost` }))}
    >
      {total === 0 ? (
        <Empty>No disputes yet.</Empty>
      ) : (
        <div style={{ height: Math.max(170, rows.length * 48 + 80) }}>
          <AgCharts
            options={
              {
                ...baseChart(),
                data: rows,
                series: series.map((s) => ({
                  type: "bar",
                  direction: "horizontal",
                  xKey: "label",
                  yKey: s.yKey,
                  yName: s.yName,
                  stacked: true,
                  fill: s.fill,
                  cornerRadius: 3,
                })),
                legend: { enabled: true, position: "bottom", item: { label: { color: COLORS.text, fontSize: 12 } } },
                axes: {
                  x: { type: "category", position: "left", line: { enabled: false }, label: { color: COLORS.text, fontSize: 12, formatter: ({ value }: { value: string }) => twoLines(String(value)) }, paddingInner: 0.45 },
                  y: { type: "number", position: "bottom", min: 0, interval: { step: 1 }, label: { color: COLORS.muted, fontSize: 11 } },
                },
              } as AgCartesianChartOptions
            }
            style={{ height: "100%" }}
          />
        </div>
      )}
    </ChartCard>
  );
}

export type ProofBar = { label: string; value: number; urgent: boolean; color?: string };

/** "Not received" disputes by the shipping proof the seller had. Red = no delivery proof, the preventable ones. */
export function ShippingProofChart({ bars }: { bars: ProofBar[] }) {
  const total = bars.reduce((s, b) => s + b.value, 0);
  return (
    <ChartCard
      title="Shipping proof on “not received” claims"
      description="What proof you had when a buyer said the item never arrived. The deepest blue had no proof of delivery."
      table={bars.map((b) => ({ label: b.label, value: String(b.value) }))}
    >
      {total === 0 ? (
        <Empty>No &ldquo;not received&rdquo; claims yet.</Empty>
      ) : (
        <div style={{ height: Math.max(170, bars.length * 44 + 40) }}>
          <AgCharts options={barChart(bars, { horizontal: true, yName: "Disputes" })} style={{ height: "100%" }} />
        </div>
      )}
    </ChartCard>
  );
}

/** Disputes opened per week, so a spike after a product launch or carrier change stands out. */
export function TrendChart({ weeks }: { weeks: { label: string; value: number; color?: string }[] }) {
  const total = weeks.reduce((s, w) => s + w.value, 0);
  return (
    <ChartCard
      title="Disputes over time"
      description="New disputes per week, last 12 weeks. A sudden spike usually has one cause worth finding."
      table={weeks.filter((w) => w.value > 0).map((w) => ({ label: `Week of ${w.label}`, value: String(w.value) }))}
    >
      {total === 0 ? (
        <Empty>No disputes in the last 12 weeks.</Empty>
      ) : (
        <div className="h-[220px]">
          <AgCharts options={barChart(weeks, { yName: "Disputes", format: (v) => (v ? String(v) : "") })} style={{ height: "100%" }} />
        </div>
      )}
    </ChartCard>
  );
}

/** Disputes by order value: shows whether small claims are worth an auto-refund rule. */
export function ValueBandChart({ bands }: { bands: { label: string; value: number; color?: string }[] }) {
  const total = bands.reduce((s, b) => s + b.value, 0);
  return (
    <ChartCard
      title="Disputes by order value"
      description="Lots of small claims? An auto-refund rule can settle them while you focus on the big ones."
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
