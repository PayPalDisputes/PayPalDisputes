"use client";

import { useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Download } from "lucide-react";
import type { ItemRow } from "@/lib/insights";
import { formatAmount, reasonLabel } from "@/app/_components/dispute-ui";
import { gridTheme } from "./ag-setup";

/** "2 of 3" delivered with a small bar, red when most disputes had no delivery proof. */
function DeliveredCell({ data }: ICellRendererParams<ItemRow>) {
  if (!data) return null;
  const pct = Math.round(data.deliveredShare * 100);
  return (
    <span className="flex w-full items-center gap-2.5">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={`block h-full rounded-full ${pct < 50 ? "bg-bad" : "bg-ok"}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-10 text-right tabular-nums">{pct}%</span>
    </span>
  );
}

/** Products ranked by how many disputes they draw (AG Grid Community), exportable to CSV. */
export function ItemsGrid({ rows }: { rows: ItemRow[] }) {
  const gridRef = useRef<AgGridReact<ItemRow>>(null);
  const columnDefs = useMemo<ColDef<ItemRow>[]>(
    () => [
      { headerName: "Product", field: "item", pinned: "left", minWidth: 200, flex: 1.4, filter: "agTextColumnFilter", cellClass: "font-medium" },
      { headerName: "Disputes", field: "disputes", type: "rightAligned", sort: "desc", minWidth: 100, filter: "agNumberColumnFilter" },
      { headerName: "Open", field: "open", type: "rightAligned", minWidth: 80 },
      { headerName: "Won", field: "won", type: "rightAligned", minWidth: 80 },
      { headerName: "Lost", field: "lost", type: "rightAligned", minWidth: 80, cellClassRules: { "text-bad font-medium": (p) => (p.value ?? 0) > 0 } },
      { headerName: "Disputed", field: "amount", type: "rightAligned", minWidth: 110, valueFormatter: (p) => (p.data ? formatAmount(p.value, p.data.currency) : ""), filter: "agNumberColumnFilter" },
      { headerName: "Most common reason", colId: "reason", valueGetter: (p) => reasonLabel(p.data?.topReason ?? null), minWidth: 170, filter: "agTextColumnFilter" },
      {
        headerName: "Had delivery proof",
        field: "deliveredShare",
        cellRenderer: DeliveredCell,
        minWidth: 170,
        valueFormatter: (p) => `${Math.round((p.value ?? 0) * 100)}%`,
      },
      {
        headerName: "Last dispute",
        field: "lastOpenedAt",
        minWidth: 120,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"),
      },
    ],
    [],
  );
  // Flex centring keeps cells vertically aligned; right-aligned (number) columns also need their content pushed right.
  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      cellStyle: (p) => ({ display: "flex", alignItems: "center", justifyContent: p.colDef.type === "rightAligned" ? "flex-end" : "flex-start" }),
    }),
    [],
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[12.5px] text-fg-muted">
          {rows.length} product{rows.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() =>
            gridRef.current?.api.exportDataAsCsv({
              fileName: "sira-disputed-products.csv",
              processCellCallback: (p) => (p.column.getColId() === "deliveredShare" ? `${Math.round((p.value ?? 0) * 100)}%` : p.value),
            })
          }
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-canvas px-3.5 text-[13px] font-medium text-fg-heading transition-colors hover:bg-muted"
        >
          <Download aria-hidden strokeWidth={1.75} className="size-4" />
          Export CSV
        </button>
      </div>
      <div style={{ height: Math.min(520, 104 + rows.length * 58) }}>
        <AgGridReact<ItemRow>
          ref={gridRef}
          theme={gridTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(p) => p.data.item}
          suppressCellFocus
        />
      </div>
    </div>
  );
}
