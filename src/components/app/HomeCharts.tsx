"use client";

import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { baseChart, COLORS } from "./ag-setup";

export type MoneyPoint = { label: string; value: number };

/** Money over the last 30 days as one soft olive area (Home uses it for money kept, which only ever climbs). */
export function MoneyChart({ points, currency, name, height = 170 }: { points: MoneyPoint[]; currency: string; name: string; height?: number | string }) {
  const money = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  const options = {
    ...baseChart(),
    padding: { top: 6, right: 2, bottom: 0, left: 2 },
    data: points,
    series: [
      {
        type: "area",
        xKey: "label",
        yKey: "value",
        yName: name,
        stroke: COLORS.ink,
        strokeWidth: 1.6,
        fill: {
          type: "gradient",
          colorStops: [
            { color: COLORS.ink, stop: 0 },
            { color: COLORS.surface, stop: 1 },
          ],
        },
        fillOpacity: 0.16,
        marker: { enabled: false },
        tooltip: { renderer: ({ datum }: { datum: MoneyPoint }) => ({ heading: datum.label, data: [{ label: name, value: money(datum.value) }] }) },
      },
    ],
    axes: {
      x: {
        type: "category",
        position: "bottom",
        line: { enabled: false },
        gridLine: { enabled: false },
        label: {
          color: COLORS.muted,
          fontSize: 12,
          avoidCollisions: false,
          // One date a week; the last point is today, and the chart's label is dropped at the edge anyway.
          formatter: ({ value, index }: { value: string; index: number }) => (index % 7 === 2 && index < points.length - 1 ? value : ""),
        },
        paddingInner: 0,
        paddingOuter: 0,
      },
      y: { type: "number", position: "left", min: 0, label: { enabled: false }, gridLine: { enabled: false }, line: { enabled: false } },
    },
    legend: { enabled: false },
  } as unknown as AgCartesianChartOptions;
  return (
    <div style={{ height }} role="img" aria-label={`${name} over the last 30 days, now ${money(points.at(-1)?.value ?? 0)}`}>
      <AgCharts options={options} style={{ height: "100%" }} />
    </div>
  );
}
