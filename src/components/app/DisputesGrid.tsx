"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Search } from "lucide-react";
import { formatAmount, reasonLabel } from "@/app/_components/dispute-ui";
import type { HomeDispute } from "@/lib/dashboard";
import { callLabel, dueLabel, stageLabel, stageStep } from "@/lib/dispute-stage";
import { cn } from "@/lib/cn";
import { Amount, ProgressLine } from "./bits";
import { gridTheme } from "./ag-setup";

const REPORT_NOTE: Record<string, string> = {
  submitted: "Sent to PayPal",
  approved: "Sending…",
  rejected: "You rejected it",
  failed: "Sending failed",
};

type Cell = ICellRendererParams<HomeDispute>;

function BuyerCell({ data: d }: Cell) {
  if (!d) return null;
  return (
    <span className="flex min-w-0 flex-col gap-[3px] leading-tight">
      <span className="truncate text-fg">{d.buyerName ?? "Unknown buyer"}</span>
      <span className="truncate text-[13px] text-fg-muted">{d.item ?? (d.sellerName ? d.sellerName : d.id)}</span>
    </span>
  );
}

function StageCell({ data: d }: Cell) {
  if (!d) return null;
  return (
    <span className="flex flex-col gap-1.5 leading-tight">
      <span className="text-fg-body">{stageLabel(d)}</span>
      <ProgressLine step={stageStep(d)} />
    </span>
  );
}

function DeadlineCell({ data: d }: Cell) {
  if (!d) return null;
  const label = d.status === "WAITING_FOR_SELLER_RESPONSE" ? dueLabel(d.daysLeft) : null;
  if (!label) return <span className="text-fg-muted">—</span>;
  return <span className={cn((d.daysLeft ?? 99) <= 0 ? "font-medium text-bad" : "text-fg-body")}>{label}</span>;
}

/** Sira's call in plain words, plus what happened to it once acted on. */
function CallCell({ data: d }: Cell) {
  if (!d) return null;
  const r = d.report;
  if (!r) return <span className="text-fg-muted">{d.status === "WAITING_FOR_SELLER_RESPONSE" ? "Assessing…" : "—"}</span>;
  const note = r.status !== "pending_review" ? REPORT_NOTE[r.status] : !r.current ? "Updating…" : null;
  return (
    <span className="flex flex-col gap-[3px] leading-tight">
      <span className="text-fg-body">{callLabel(r, d.currency)}</span>
      {note && <span className={cn("text-[12.5px]", r.status === "failed" ? "text-bad" : "text-fg-muted")}>{note}</span>}
    </span>
  );
}

function AmountCell({ data: d }: Cell) {
  if (!d) return null;
  return <Amount amount={d.amount} currency={d.currency} className="text-fg" />;
}

/** Phone layout: one tappable card per dispute instead of a wide grid. */
function DisputeCard({ d, href }: { d: HomeDispute; href: string }) {
  return (
    <Link href={href} scroll={false} className="block rounded-xl border border-line bg-canvas p-4 transition-colors active:bg-subtle">
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-[15px] text-fg">{d.buyerName ?? "Unknown buyer"}</span>
          <span className="block text-[13px] text-fg-muted">
            {d.item ?? "Order"} · {reasonLabel(d.reason)}
          </span>
        </span>
        <Amount amount={d.amount} currency={d.currency} className="shrink-0 text-[15px] text-fg" />
      </span>
      <span className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="flex flex-col gap-1.5">
          <span className="text-fg-body">{stageLabel(d)}</span>
          <ProgressLine step={stageStep(d)} />
        </span>
        <span className="text-fg-body">{callLabel(d.report, d.currency) ?? ""}</span>
      </span>
    </Link>
  );
}

/** Soonest deadline first; disputes without one go last. */
const deadlineComparator = (a: number | null, b: number | null) => (a ?? Infinity) - (b ?? Infinity);

/**
 * Sortable, filterable disputes table (AG Grid Community) in the quiet Mock 2 style. Click or press
 * Enter on a row to open it in the side panel. Search matches buyer, item, dispute id, reason and call.
 */
export function DisputesGrid({
  rows,
  listHref,
  csvName = "disputes",
  initialQuery = "",
}: {
  rows: HomeDispute[];
  /** The current list URL; opening a dispute adds `open=<id>` to it so the side panel shows over the list. */
  listHref: string;
  csvName?: string;
  /** Pre-filled search, e.g. from the top bar (`?q=`). */
  initialQuery?: string;
}) {
  const router = useRouter();
  const openHref = (id: string) => `${listHref}${listHref.includes("?") ? "&" : "?"}open=${encodeURIComponent(id)}`;
  const openDispute = (id: string) => router.push(openHref(id), { scroll: false });
  const gridRef = useRef<AgGridReact<HomeDispute>>(null);
  const [query, setQuery] = useState(initialQuery);
  const [shown, setShown] = useState(rows.length);

  const columnDefs = useMemo<ColDef<HomeDispute>[]>(
    () => [
      {
        headerName: "Buyer",
        colId: "buyer",
        valueGetter: (p) => p.data?.buyerName ?? "Unknown buyer",
        getQuickFilterText: (p) => [p.data?.buyerName, p.data?.item, p.data?.id, p.data?.sellerName].filter(Boolean).join(" "),
        cellRenderer: BuyerCell,
        filter: "agTextColumnFilter",
        pinned: "left",
        minWidth: 200,
        flex: 1.3,
      },
      {
        headerName: "Reason",
        colId: "reason",
        valueGetter: (p) => reasonLabel(p.data?.reason ?? null),
        filter: "agTextColumnFilter",
        cellClass: "text-fg-body",
        minWidth: 140,
        flex: 1,
      },
      {
        headerName: "Where it stands",
        colId: "stage",
        valueGetter: (p) => (p.data ? stageLabel(p.data) : ""),
        cellRenderer: StageCell,
        filter: "agTextColumnFilter",
        minWidth: 190,
        flex: 1.2,
      },
      {
        headerName: "Deadline",
        colId: "deadline",
        valueGetter: (p) => (p.data?.status === "WAITING_FOR_SELLER_RESPONSE" ? p.data.daysLeft : null),
        comparator: deadlineComparator,
        cellRenderer: DeadlineCell,
        filter: "agNumberColumnFilter",
        sort: "asc",
        minWidth: 130,
      },
      {
        headerName: "Sira's call",
        colId: "call",
        valueGetter: (p) => (p.data ? (callLabel(p.data.report, p.data.currency) ?? "") : ""),
        cellRenderer: CallCell,
        filter: "agTextColumnFilter",
        minWidth: 150,
        flex: 1,
      },
      {
        headerName: "Amount",
        colId: "amount",
        field: "amount",
        type: "rightAligned",
        valueFormatter: (p) => formatAmount(p.value ?? null, p.data?.currency ?? null),
        cellRenderer: AmountCell,
        filter: "agNumberColumnFilter",
        minWidth: 110,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      cellStyle: (p) => ({ display: "flex", alignItems: "center", justifyContent: p.colDef.type === "rightAligned" ? "flex-end" : "flex-start" }),
    }),
    [],
  );

  const q = query.toLowerCase();
  const phoneRows = rows.filter(
    (d) => !q || [d.buyerName, d.item, d.id, d.sellerName, reasonLabel(d.reason)].join(" ").toLowerCase().includes(q),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[10px] border border-line bg-canvas px-3 focus-within:border-line-strong sm:max-w-[320px]">
          <span className="sr-only">Search disputes</span>
          <Search aria-hidden strokeWidth={1.8} className="size-[15px] text-fg-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buyer, item or dispute ID"
            className="h-full flex-1 bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-muted"
          />
        </label>
        <span className="text-[12.5px] text-fg-muted tabular-nums" aria-live="polite">
          Showing {shown} of {rows.length}
        </span>
        <button
          type="button"
          onClick={() => gridRef.current?.api.exportDataAsCsv({ fileName: `${csvName}.csv` })}
          className="ml-auto text-[13.5px] text-fg-body hover:text-fg"
        >
          Export CSV
        </button>
      </div>

      <ul className="space-y-2 md:hidden">
        {phoneRows.map((d) => (
          <li key={d.id}>
            <DisputeCard d={d} href={openHref(d.id)} />
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <AgGridReact<HomeDispute>
          ref={gridRef}
          theme={gridTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(p) => p.data.id}
          quickFilterText={query}
          domLayout="autoHeight"
          rowHeight={64}
          pagination={rows.length > 25}
          paginationPageSize={25}
          paginationPageSizeSelector={false}
          rowClass="cursor-pointer"
          onRowClicked={(e) => e.data && openDispute(e.data.id)}
          onCellKeyDown={(e) => {
            const key = (e.event as KeyboardEvent | undefined)?.key;
            if (key === "Enter" && e.data) openDispute(e.data.id);
          }}
          onModelUpdated={(e) => setShown(e.api.getDisplayedRowCount())}
          overlayNoRowsTemplate='<span style="color:#70707d">No disputes match.</span>'
        />
      </div>
    </div>
  );
}
