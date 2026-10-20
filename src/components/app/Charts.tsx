"use client";

import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { cn } from "@/lib/cn";
import { baseChart, COLORS } from "./ag-setup";

/* ------------------------------------------------------------------ */
/* Card shell: title, one-line explainer, chart, and a data table      */
/* ------------------------------------------------------------------ */

export function ChartCard({
  title,
  description,
  table,
  className,
  children,
}: {
  title: string;
  description: string;
  /** Rows for the "Show data" table, so values are never colour- or hover-only. */
  table: { label: string; value: string }[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col rounded-2xl border border-line bg-canvas p-5", className)}>
      <h3 className="text-[14px] font-semibold text-fg">{title}</h3>
      <p className="mt-0.5 text-[12.5px] leading-[18px] text-fg-muted">{description}</p>
      <div className="mt-3 flex-1">{children}</div>
      <details className="group mt-2 text-[12px]">
        <summary className="cursor-pointer list-none text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Show data</span>
          <span className="hidden group-open:inline">Hide data</span>
        </summary>
        <table className="mt-2 w-full text-left">
          <tbody className="divide-y divide-line-subtle">
            {table.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="py-1.5 font-normal text-fg-body">
                  {r.label}
                </th>
                <td className="py-1.5 text-right font-medium text-fg tabular-nums">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="flex h-[200px] items-center justify-center text-center text-[13px] text-fg-muted">{children}</p>;
}

/** Common bar styling: thin rounded bars, recessive axes, integer ticks. */
function barChart(
  data: { label: string; value: number; urgent?: boolean; color?: string }[],
  opts: { horizontal?: boolean; yName: string; format?: (v: number) => string },
): AgCartesianChartOptions {
  const format = opts.format ?? ((v: number) => String(v));
  // Headroom past the longest bar so its outside label isn't clipped.
  const max = Math.max(1, Math.ceil(Math.max(...data.map((d) => d.value), 0) * 1.25));
  return {
    ...baseChart(),
    data,
    series: [
      {
        type: "bar",
        xKey: "label",
        yKey: "value",
        yName: opts.yName,
        direction: opts.horizontal ? "horizontal" : "vertical",
        cornerRadius: 4,
        fill: COLORS.ink,
        itemStyler: ({ datum }) => ({ fill: datum.color ?? (datum.urgent ? COLORS.urgent : COLORS.ink) }),
        label: { enabled: true, color: COLORS.text, fontWeight: 500, placement: "outside-end", formatter: ({ value }) => format(value) },
        tooltip: { renderer: ({ datum }) => ({ heading: datum.label, data: [{ label: opts.yName, value: format(datum.value) }] }) },
      },
    ],
    axes: {
      x: {
        type: "category",
        position: opts.horizontal ? "left" : "bottom",
        line: { enabled: false },
        label: { color: COLORS.text, fontSize: 12 },
        paddingInner: 0.45,
        paddingOuter: 0.2,
      },
      y: {
        type: "number",
        position: opts.horizontal ? "bottom" : "left",
        min: 0,
        max,
        nice: false,
        interval: { minSpacing: 40 },
        label: { color: COLORS.muted, fontSize: 11, formatter: ({ value }) => (Number.isInteger(value) ? format(value) : "") },
        gridLine: { enabled: true },
      },
    },
    legend: { enabled: false },
  } as AgCartesianChartOptions;
}

/* ------------------------------------------------------------------ */
/* Dashboard home                                                       */
/* ------------------------------------------------------------------ */

export type Bucket = { label: string; value: number; urgent: boolean };

/** Disputes waiting on the seller, grouped by days left. Red = PayPal decides within 3 days. */
export function DeadlineChart({ buckets }: { buckets: Bucket[] }) {
  const total = buckets.reduce((s, b) => s + b.value, 0);
  return (
    <ChartCard
      title="Deadline radar"
      description="Disputes waiting on you, by days left to respond. Red bars are due within 3 days."
      table={buckets.map((b) => ({ label: b.label, value: String(b.value) }))}
    >
      {total === 0 ? (
        <Empty>Nothing is waiting on you.</Empty>
      ) : (
        <div className="h-[220px]">
          <AgCharts options={barChart(buckets, { yName: "Disputes" })} style={{ height: "100%" }} />
        </div>
      )}
    </ChartCard>
  );
}

/** Open disputes by PayPal reason. */
export function ReasonChart({ reasons }: { reasons: { label: string; value: number }[] }) {
  return (
    <ChartCard
      title="Why buyers are disputing"
      description="Open disputes by the reason the buyer gave PayPal."
      table={reasons.map((r) => ({ label: r.label, value: String(r.value) }))}
    >
      {reasons.length === 0 ? (
        <Empty>No open disputes.</Empty>
      ) : (
        <div style={{ height: Math.max(140, reasons.length * 44 + 40) }}>
          <AgCharts options={barChart(reasons, { horizontal: true, yName: "Disputes" })} style={{ height: "100%" }} />
        </div>
      )}
    </ChartCard>
  );
}

const RECOMMENDATION_COLORS = { Fight: COLORS.fight, Settle: COLORS.settle, Refund: COLORS.refund } as const;

/** What the agent recommends across open disputes. Each option keeps its own colour; the axis names it too. */
export function RecommendationChart({ mix }: { mix: { label: "Fight" | "Settle" | "Refund"; value: number }[] }) {
  const total = mix.reduce((s, m) => s + m.value, 0);
  const data = mix.map((m) => ({ ...m, color: RECOMMENDATION_COLORS[m.label] }));
  return (
    <ChartCard
      title="What the agent recommends"
      description="The agent's call on open disputes. You still approve every response."
      table={mix.map((m) => ({ label: m.label, value: `${m.value}${total ? ` (${Math.round((m.value / total) * 100)}%)` : ""}` }))}
    >
      {total === 0 ? (
        <Empty>No assessed disputes yet.</Empty>
      ) : (
        <div className="h-[180px]">
          <AgCharts options={barChart(data, { horizontal: true, yName: "Disputes" })} style={{ height: "100%" }} />
        </div>
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Evals                                                               */
/* ------------------------------------------------------------------ */

export type VersionStat = { version: string; passPct: number; avgSeconds: number; cases: number };

/** Pass rate per prompt version (latest run of each). One measure per chart, never two y-axes. */
export function EvalPassChart({ versions }: { versions: VersionStat[] }) {
  return (
    <ChartCard
      title="Pass rate by prompt version"
      description="Share of eval cases where recommendation, urgency and risk were all correct."
      table={versions.map((v) => ({ label: `${v.version} (${v.cases} cases)`, value: `${v.passPct.toFixed(1)}%` }))}
    >
      <div className="h-[240px]">
        <AgCharts
          options={
            {
              ...baseChart(),
              data: versions,
              series: [
                {
                  type: "line",
                  xKey: "version",
                  yKey: "passPct",
                  yName: "Pass rate",
                  stroke: COLORS.fight,
                  strokeWidth: 2,
                  marker: { enabled: true, size: 8, fill: COLORS.fight, stroke: COLORS.surface, strokeWidth: 2 },
                  label: { enabled: true, color: COLORS.text, formatter: ({ value }: { value: number }) => `${Math.round(value)}%` },
                  tooltip: {
                    renderer: ({ datum }: { datum: VersionStat }) => ({
                      heading: `Prompt ${datum.version}`,
                      data: [
                        { label: "Pass rate", value: `${datum.passPct.toFixed(1)}%` },
                        { label: "Cases", value: String(datum.cases) },
                      ],
                    }),
                  },
                },
              ],
              axes: {
                x: { type: "category", position: "bottom", line: { enabled: false }, label: { color: COLORS.text } },
                y: {
                  type: "number",
                  position: "left",
                  min: 0,
                  max: 110, // headroom so the point labels near 100% aren't clipped
                  interval: { values: [0, 25, 50, 75, 100] },
                  label: { color: COLORS.muted, fontSize: 11, formatter: ({ value }: { value: number }) => `${value}%` },
                },
              },
              legend: { enabled: false },
            } as AgCartesianChartOptions
          }
          style={{ height: "100%" }}
        />
      </div>
    </ChartCard>
  );
}

/** Average seconds per assessment, per prompt version. */
export function EvalLatencyChart({ versions }: { versions: VersionStat[] }) {
  const data = versions.map((v) => ({ label: v.version, value: Number(v.avgSeconds.toFixed(1)) }));
  return (
    <ChartCard
      title="Average time per decision"
      description="Seconds from sending a dispute to the model to getting its report, per prompt version."
      table={data.map((d) => ({ label: d.label, value: `${d.value}s` }))}
    >
      <div className="h-[240px]">
        <AgCharts options={barChart(data, { yName: "Seconds", format: (v) => `${v.toFixed(1)}s` })} style={{ height: "100%" }} />
      </div>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Outcomes                                                            */
/* ------------------------------------------------------------------ */

export type OutcomeBar = { label: string; won: number; settled: number; lost: number };

/** Resolved disputes by what the seller did, split by how they ended (stacked; labels in the data table too). */
export function OutcomeChart({ bars }: { bars: OutcomeBar[] }) {
  const total = bars.reduce((s, b) => s + b.won + b.settled + b.lost, 0);
  const series = [
    { yKey: "won", yName: "Won", fill: COLORS.refund },
    { yKey: "settled", yName: "Settled", fill: COLORS.settle },
    { yKey: "lost", yName: "Lost", fill: COLORS.urgent },
  ] as const;
  return (
    <ChartCard
      title="How disputes ended"
      description="Resolved disputes by what you did, and how PayPal closed them."
      table={bars.map((b) => ({ label: b.label, value: `${b.won} won · ${b.settled} settled · ${b.lost} lost` }))}
    >
      {total === 0 ? (
        <Empty>No resolved disputes yet.</Empty>
      ) : (
        <div className="h-[200px]">
          <AgCharts
            options={
              {
                ...baseChart(),
                data: bars,
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
                  x: { type: "category", position: "left", line: { enabled: false }, label: { color: COLORS.text, fontSize: 12 }, paddingInner: 0.45 },
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
