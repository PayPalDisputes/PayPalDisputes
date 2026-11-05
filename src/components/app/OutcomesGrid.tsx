"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Search } from "lucide-react";
import type { Choice, OutcomeRow, Result } from "@/lib/outcomes";
import { formatAmount, reasonLabel } from "@/app/_components/dispute-ui";
import { gridTheme } from "./ag-setup";

type Row = OutcomeRow & { totals?: boolean };
type Cell = ICellRendererParams<Row>;

const CHOICE: Record<Choice, string> = { fight: "Fight", settle: "Settle", refund: "Refund" };
const RESULT: Record<Result, { label: string; tone: "ok" | "warn" | "bad" | "neutral" }> = {
  won: { label: "Won", tone: "ok" },
  settled: { label: "Settled", tone: "warn" },
  lost: { label: "Lost", tone: "bad" },
  other: { label: "Closed", tone: "neutral" },
};

function DisputeCell({ data }: Cell) {
  if (!data) return null;
  if (data.totals) return <span className="font-semibold text-fg">Total</span>;
  return (
    <span className="flex min-w-0 flex-col gap-[3px] leading-tight">
      <Link href={`/disputes/${data.disputeId}`} className="truncate font-medium text-fg hover:underline">
        {data.buyerName ?? "Buyer"}
      </Link>
      <span className="truncate text-[12.5px] text-fg-muted">{reasonLabel(data.reason)}</span>
    </span>
  );
}

const RESULT_TEXT = { ok: "text-ok", warn: "text-warn", bad: "text-bad", neutral: "text-fg-body" } as const;

function ResultCell({ data }: Cell) {
  if (!data || data.totals) return null;
  const r = RESULT[data.result];
  return <span className={`font-medium ${RESULT_TEXT[r.tone]}`}>{r.label}</span>;
}

/** "Fight", plus "followed Sira" when the seller did what Sira advised. */
function DidCell({ data }: Cell) {
  if (!data || data.totals) return null;
  if (data.autoRefunded) return <span>Refund (auto rule)</span>;
  if (!data.did) return <span className="text-fg-muted">No response</span>;
  return (
    <span className="flex flex-col gap-1 leading-none">
      <span>{CHOICE[data.did]}</span>
      {data.advised && (
        <span className={`text-[11.5px] ${data.did === data.advised ? "text-ok" : "text-fg-muted"}`}>
          {data.did === data.advised ? "Followed Sira" : "Differed from Sira"}
        </span>
      )}
    </span>
  );
}

/** Resolved disputes: what Sira advised, what the seller did, and how it ended (AG Grid Community). */
export function OutcomesGrid({ rows }: { rows: OutcomeRow[] }) {
  const gridRef = useRef<AgGridReact<Row>>(null);
  const [query, setQuery] = useState("");

  // Totals row pinned at the bottom: money kept, in one currency when they all match.
  const totals = useMemo<Row[]>(() => {
    const currencies = new Set(rows.map((r) => r.currency));
    if (rows.length === 0 || currencies.size !== 1) return [];
    const [currency] = currencies;
    return [
      {
        ...rows[0],
        disputeId: "",
        totals: true,
        buyerName: null,
        reason: null,
        advised: null,
        did: null,
        autoRefunded: false,
        outcomeCode: null,
        amount: rows.reduce((s, r) => s + r.amount, 0),
        kept: rows.reduce((s, r) => s + r.kept, 0),
        refunded: rows.reduce((s, r) => s + r.refunded, 0),
        currency,
        respondedHours: null,
        resolvedAt: null,
      },
    ];
  }, [rows]);

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      // Five columns that fit beside the chart: who, what you did (and whether it was Sira's call), how it ended, what you kept, when.
      {
        headerName: "Dispute",
        colId: "dispute",
        valueGetter: (p) => p.data?.buyerName,
        getQuickFilterText: (p) => [p.data?.buyerName, p.data?.disputeId, reasonLabel(p.data?.reason ?? null)].filter(Boolean).join(" "),
        cellRenderer: DisputeCell,
        minWidth: 170,
        flex: 1.6,
      },
      { headerName: "You did", colId: "did", valueGetter: (p) => (p.data?.did ? CHOICE[p.data.did] : ""), cellRenderer: DidCell, minWidth: 120, flex: 1.1 },
      { headerName: "Outcome", colId: "result", valueGetter: (p) => (p.data && !p.data.totals ? RESULT[p.data.result].label : ""), cellRenderer: ResultCell, minWidth: 90, flex: 0.8 },
      {
        headerName: "Kept",
        field: "kept",
        type: "rightAligned",
        sort: "desc",
        valueFormatter: (p) => (p.data ? formatAmount(p.value, p.data.currency) : ""),
        cellClass: "font-medium",
        minWidth: 95,
        flex: 0.9,
      },
      {
        headerName: "Closed",
        field: "resolvedAt",
        type: "rightAligned",
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""),
        minWidth: 80,
        flex: 0.7,
      },
    ],
    [],
  );
  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: false,
      cellStyle: (p) => ({ display: "flex", alignItems: "center", justifyContent: p.colDef.type === "rightAligned" ? "flex-end" : "flex-start" }),
    }),
    [],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-[220px] flex-1 items-center sm:max-w-[340px]">
          <span className="sr-only">Search resolved disputes</span>
          <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute left-3 size-4 text-fg-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buyer, dispute, outcome…"
            className="h-9 w-full rounded-md border border-line bg-canvas pr-4 pl-9 text-[13.5px] text-fg placeholder:text-fg-muted focus:border-line-strong focus:outline-none"
          />
        </label>
        <span className="text-[12.5px] text-fg-muted">
          {rows.length} resolved
        </span>
        <button
          type="button"
          onClick={() => gridRef.current?.api.exportDataAsCsv({ fileName: "sira-dispute-outcomes.csv" })}
          className="ml-auto text-[13.5px] text-fg-body hover:text-fg"
        >
          Export CSV
        </button>
      </div>
      <div>
        <AgGridReact<Row>
          ref={gridRef}
          theme={gridTheme}
          rowData={rows}
          pinnedBottomRowData={totals}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={query}
          getRowId={(p) => p.data.disputeId || "totals"}
          domLayout="autoHeight"
          suppressHorizontalScroll
          suppressCellFocus
        />
      </div>
    </div>
  );
}
