"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Download, Search } from "lucide-react";
import type { Choice, OutcomeRow, Result } from "@/lib/outcomes";
import { formatAmount, reasonLabel } from "@/app/_components/dispute-ui";
import { Badge } from "../ui/primitives";
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
    <span className="flex min-w-0 flex-col gap-1 leading-none">
      <span className="truncate font-medium text-fg">{data.buyerName ?? "Buyer"}</span>
      <Link href={`/disputes/${data.disputeId}`} className="truncate font-mono text-[11.5px] text-fg-muted hover:text-fg hover:underline">
        {data.disputeId}
      </Link>
    </span>
  );
}

function ResultCell({ data }: Cell) {
  if (!data || data.totals) return null;
  const r = RESULT[data.result];
  return <Badge tone={r.tone}>{r.label}</Badge>;
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

const hours = (h: number | null) => (h === null ? "—" : h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days`);

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
      { headerName: "Dispute", colId: "dispute", valueGetter: (p) => p.data?.buyerName, cellRenderer: DisputeCell, pinned: "left", minWidth: 220, flex: 1.4, filter: "agTextColumnFilter" },
      { headerName: "Reason", colId: "reason", valueGetter: (p) => (p.data?.totals ? "" : reasonLabel(p.data?.reason ?? null)), minWidth: 150, filter: "agTextColumnFilter" },
      { headerName: "Sira advised", colId: "advised", valueGetter: (p) => (p.data?.advised ? CHOICE[p.data.advised] : p.data?.totals ? "" : "—"), minWidth: 120, filter: "agTextColumnFilter" },
      { headerName: "You did", colId: "did", valueGetter: (p) => (p.data?.did ? CHOICE[p.data.did] : ""), cellRenderer: DidCell, minWidth: 140, filter: "agTextColumnFilter" },
      { headerName: "Outcome", colId: "result", valueGetter: (p) => (p.data && !p.data.totals ? RESULT[p.data.result].label : ""), cellRenderer: ResultCell, minWidth: 110, filter: "agTextColumnFilter" },
      { headerName: "Disputed", field: "amount", type: "rightAligned", valueFormatter: (p) => (p.data ? formatAmount(p.value, p.data.currency) : ""), filter: "agNumberColumnFilter", minWidth: 110 },
      {
        headerName: "Kept",
        field: "kept",
        type: "rightAligned",
        sort: "desc",
        valueFormatter: (p) => (p.data ? formatAmount(p.value, p.data.currency) : ""),
        cellClass: "font-medium",
        filter: "agNumberColumnFilter",
        minWidth: 110,
      },
      { headerName: "Responded in", field: "respondedHours", type: "rightAligned", valueFormatter: (p) => (p.data?.totals ? "" : hours(p.value)), filter: "agNumberColumnFilter", minWidth: 120 },
      {
        headerName: "Resolved",
        field: "resolvedAt",
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""),
        minWidth: 110,
      },
    ],
    [],
  );
  const defaultColDef = useMemo<ColDef>(() => ({ sortable: true, resizable: true, cellStyle: { display: "flex", alignItems: "center" } }), []);

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
            className="h-10 w-full rounded-full border border-line bg-canvas pr-4 pl-9 text-[13.5px] text-fg placeholder:text-fg-muted focus:border-line-strong focus:outline-none"
          />
        </label>
        <span className="text-[12.5px] text-fg-muted">
          {rows.length} resolved
        </span>
        <button
          type="button"
          onClick={() => gridRef.current?.api.exportDataAsCsv({ fileName: "sira-dispute-outcomes.csv" })}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-canvas px-3.5 text-[13px] font-medium text-fg-heading transition-colors hover:bg-muted"
        >
          <Download aria-hidden strokeWidth={1.75} className="size-4" />
          Export CSV
        </button>
      </div>
      <div style={{ height: Math.min(560, 104 + (rows.length + totals.length) * 58) }}>
        <AgGridReact<Row>
          ref={gridRef}
          theme={gridTheme}
          rowData={rows}
          pinnedBottomRowData={totals}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={query}
          getRowId={(p) => p.data.disputeId || "totals"}
          suppressCellFocus
        />
      </div>
    </div>
  );
}
