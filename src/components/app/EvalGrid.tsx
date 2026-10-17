"use client";

import { useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Check, Download, Minus, Search, X } from "lucide-react";
import type { EvalRow } from "@/lib/evals";
import { Badge } from "../ui/primitives";
import { gridTheme } from "./ag-setup";

type Cell = ICellRendererParams<EvalRow>;

/** ✓ / ✗ with words for screen readers; "—" when the field wasn't scored (e.g. the run errored). */
function OkCell({ value }: Cell) {
  if (value === null || value === undefined) return <Minus aria-label="Not scored" strokeWidth={1.75} className="size-4 text-fg-muted" />;
  return value ? (
    <Check aria-label="Correct" strokeWidth={2} className="size-4 text-ok" />
  ) : (
    <X aria-label="Wrong" strokeWidth={2} className="size-4 text-bad" />
  );
}

function PassedCell({ data }: Cell) {
  if (!data) return null;
  if (data.error) return <Badge tone="bad">Error</Badge>;
  return data.passed ? <Badge tone="ok">Pass</Badge> : <Badge tone="warn">Fail</Badge>;
}

function CaseCell({ data }: Cell) {
  if (!data) return null;
  return (
    <span className="flex min-w-0 flex-col gap-1 leading-none">
      <span className="truncate font-medium text-fg">{data.title}</span>
      <span className="truncate font-mono text-[11.5px] text-fg-muted">{data.caseId}</span>
    </span>
  );
}

/** Case-by-case results of one eval run (AG Grid Community). Failures sort first. */
export function EvalGrid({ rows, runLabel }: { rows: EvalRow[]; runLabel: string }) {
  const gridRef = useRef<AgGridReact<EvalRow>>(null);
  const [query, setQuery] = useState("");

  const columnDefs = useMemo<ColDef<EvalRow>[]>(
    () => [
      { headerName: "Case", colId: "case", valueGetter: (p) => p.data?.title, cellRenderer: CaseCell, pinned: "left", minWidth: 260, flex: 1.6, filter: "agTextColumnFilter" },
      {
        headerName: "Result",
        colId: "passed",
        valueGetter: (p) => (p.data?.error ? "Error" : p.data?.passed ? "Pass" : "Fail"),
        cellRenderer: PassedCell,
        sort: "asc",
        comparator: (a: string, b: string) => ["Error", "Fail", "Pass"].indexOf(a) - ["Error", "Fail", "Pass"].indexOf(b),
        minWidth: 100,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Expected",
        colId: "expected",
        valueGetter: (p) => [p.data?.expected, ...(p.data?.acceptable ?? [])].filter((v, i, a) => v && a.indexOf(v) === i).join(" / "),
        minWidth: 120,
        cellClass: "capitalize",
      },
      { headerName: "Agent said", colId: "got", valueGetter: (p) => p.data?.got ?? "—", minWidth: 110, cellClass: "capitalize font-medium" },
      { headerName: "Decision", field: "recommendationOk", cellRenderer: OkCell, minWidth: 96, maxWidth: 110 },
      { headerName: "Urgency", field: "urgencyOk", cellRenderer: OkCell, minWidth: 96, maxWidth: 110 },
      { headerName: "Risk", field: "riskOk", cellRenderer: OkCell, minWidth: 80, maxWidth: 100 },
      {
        headerName: "Confidence",
        field: "confidence",
        type: "rightAligned",
        valueFormatter: (p) => (p.value == null ? "—" : `${Math.round(p.value * 100)}%`),
        filter: "agNumberColumnFilter",
        minWidth: 110,
      },
      {
        headerName: "Time",
        field: "latencyMs",
        type: "rightAligned",
        valueFormatter: (p) => (p.value == null ? "—" : `${(p.value / 1000).toFixed(1)}s`),
        filter: "agNumberColumnFilter",
        minWidth: 90,
      },
      {
        headerName: "Tokens",
        field: "tokens",
        type: "rightAligned",
        valueFormatter: (p) => (p.value == null ? "—" : p.value.toLocaleString("en-US")),
        minWidth: 100,
      },
      { headerName: "Error", field: "error", minWidth: 180, flex: 1, cellClass: "text-bad", tooltipField: "error", hide: rows.every((r) => !r.error) },
    ],
    [rows],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({ sortable: true, resizable: true, cellStyle: { display: "flex", alignItems: "center" } }),
    [],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-[220px] flex-1 items-center sm:max-w-[340px]">
          <span className="sr-only">Search eval cases</span>
          <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute left-3 size-4 text-fg-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases…"
            className="h-10 w-full rounded-full border border-line bg-canvas pr-4 pl-9 text-[13.5px] text-fg placeholder:text-fg-muted focus:border-line-strong focus:outline-none"
          />
        </label>
        <span className="text-[12.5px] text-fg-muted">{runLabel}</span>
        <button
          type="button"
          onClick={() => gridRef.current?.api.exportDataAsCsv({ fileName: "kaleshi-eval-latest.csv" })}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-canvas px-3.5 text-[13px] font-medium text-fg-heading transition-colors hover:bg-muted"
        >
          <Download aria-hidden strokeWidth={1.75} className="size-3.5" />
          Export CSV
        </button>
      </div>
      <AgGridReact<EvalRow>
        ref={gridRef}
        theme={gridTheme}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={(p) => p.data.caseId}
        quickFilterText={query}
        domLayout="autoHeight"
        tooltipShowDelay={300}
      />
    </div>
  );
}
