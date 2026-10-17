"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Download, Search } from "lucide-react";
import { Deadline, formatAmount, humanize, reasonLabel, StatusBadge } from "@/app/_components/dispute-ui";
import type { HomeDispute } from "@/lib/dashboard";
import { cn } from "@/lib/cn";
import { Badge, DecisionBadge } from "../ui/primitives";
import { gridTheme } from "./ag-setup";

const REPORT_STATUS: Record<string, string> = {
  submitted: "Sent to PayPal",
  approved: "Sending…",
  rejected: "You rejected it",
  failed: "Sending failed",
};
const RISK_TONE = { high: "bad", medium: "warn", low: "ok" } as const;
const RECOMMENDATION_LABEL = { fight: "Fight", refund: "Refund", settle: "Settle" } as const;

type Cell = ICellRendererParams<HomeDispute>;

/** The AI's call on a dispute: recommendation (+ settle amount and risk while it awaits review), or what happened to it. */
function AiCell({ data: d }: Cell) {
  if (!d) return null;
  const r = d.report;
  if (!r) {
    return d.status === "WAITING_FOR_SELLER_RESPONSE" ? (
      <span className="text-[12.5px] text-fg-muted">Assessing…</span>
    ) : (
      <span className="text-fg-muted">—</span>
    );
  }
  const note = r.status !== "pending_review" ? REPORT_STATUS[r.status] : !r.current ? "Updating…" : null;
  const awaiting = r.status === "pending_review" && r.current && d.status !== "RESOLVED";
  return (
    <span className="flex flex-col items-start gap-1 leading-none">
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <DecisionBadge decision={r.recommendation} />
        {r.recommendation === "settle" && r.settleAmount != null && (
          <span className="text-[12.5px] text-fg-body tabular-nums">for {formatAmount(r.settleAmount, d.currency)}</span>
        )}
        {r.risk && awaiting && <Badge tone={RISK_TONE[r.risk]}>Risk: {r.risk}</Badge>}
        {awaiting && <Badge tone="info">Needs approval</Badge>}
      </span>
      {note && <span className={cn("text-[12px]", r.status === "failed" ? "text-bad" : "text-fg-muted")}>{note}</span>}
    </span>
  );
}

function BuyerCell({ data: d }: Cell) {
  if (!d) return null;
  return (
    <span className="flex min-w-0 flex-col gap-1 leading-none">
      <span className="truncate font-medium text-fg">{d.buyerName ?? "Unknown buyer"}</span>
      <span className="truncate font-mono text-[11.5px] text-fg-muted">
        {d.id}
        {d.sellerName ? ` · ${d.sellerName}` : d.merchantId ? ` · Unlinked (${d.merchantId})` : ""}
      </span>
    </span>
  );
}

function StatusCell({ data: d }: Cell) {
  if (!d) return null;
  return (
    <span className="flex flex-col items-start gap-1 leading-none">
      <StatusBadge status={d.status} />
      <span className="text-[12px] text-fg-muted">{humanize(d.stage)}</span>
    </span>
  );
}

/** Deadline text plus a thin bar that empties as the 20-day response window runs out. */
function DeadlineCell({ data: d }: Cell) {
  if (!d) return null;
  const waiting = d.status === "WAITING_FOR_SELLER_RESPONSE" && d.daysLeft !== null;
  const share = waiting ? Math.max(0, Math.min(1, (d.daysLeft ?? 0) / 20)) : 0;
  return (
    <span className="flex w-full flex-col gap-1.5 leading-none">
      <span className="text-[13px] whitespace-nowrap">
        <Deadline dueAt={d.dueAt} daysLeft={d.daysLeft} status={d.status} />
      </span>
      {waiting && (
        <span aria-hidden className="h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-muted">
          <span
            className={cn("block h-full rounded-full", (d.daysLeft ?? 0) <= 3 ? "bg-bad" : (d.daysLeft ?? 0) <= 7 ? "bg-warn" : "bg-fg-heading/60")}
            style={{ width: `${Math.max(share * 100, 4)}%` }}
          />
        </span>
      )}
    </span>
  );
}

/** Phone layout: one tappable card per dispute instead of a wide grid. */
function DisputeCard({ d, urgent, href }: { d: HomeDispute; urgent: boolean; href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "block rounded-2xl border bg-canvas p-4 transition-colors active:bg-subtle",
        urgent ? "border-bad/40 bg-bad-bg/40" : "border-line",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium text-fg">{d.buyerName ?? "Unknown buyer"}</span>
          <span className="block text-[13px] text-fg-body">{reasonLabel(d.reason)}</span>
        </span>
        <span className="shrink-0 text-[15px] font-medium text-fg tabular-nums">{formatAmount(d.amount, d.currency)}</span>
      </span>
      <span className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <AiCell {...({ data: d } as Cell)} />
        <span className="text-[12.5px]">
          <Deadline dueAt={d.dueAt} daysLeft={d.daysLeft} status={d.status} />
        </span>
      </span>
    </Link>
  );
}

/** Soonest deadline first; disputes without one go last. */
const deadlineComparator = (a: number | null, b: number | null) => (a ?? Infinity) - (b ?? Infinity);

/**
 * Sortable, filterable disputes table (AG Grid Community). Click or press Enter on a row to open it
 * in the side panel.
 * Search matches buyer, dispute id, seller, reason, status and recommendation.
 */
export function DisputesGrid({
  rows,
  listHref,
  csvName = "disputes",
}: {
  rows: HomeDispute[];
  /** The current list URL; opening a dispute adds `open=<id>` to it so the side panel shows over the list. */
  listHref: string;
  csvName?: string;
}) {
  const router = useRouter();
  const openHref = (id: string) => `${listHref}${listHref.includes("?") ? "&" : "?"}open=${encodeURIComponent(id)}`;
  const openDispute = (id: string) => router.push(openHref(id), { scroll: false });
  const gridRef = useRef<AgGridReact<HomeDispute>>(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(rows.length);

  // Overdue or due within 2 days stay pinned on top while scrolling. While searching they rejoin
  // the list so the search covers everything.
  const isUrgent = (d: HomeDispute) => d.status === "WAITING_FOR_SELLER_RESPONSE" && d.daysLeft !== null && d.daysLeft <= 2;
  const pinned = query ? [] : rows.filter(isUrgent);
  const body = query ? rows : rows.filter((d) => !isUrgent(d));

  const columnDefs = useMemo<ColDef<HomeDispute>[]>(
    () => [
      {
        headerName: "Buyer",
        colId: "buyer",
        valueGetter: (p) => p.data?.buyerName ?? "Unknown buyer",
        getQuickFilterText: (p) => [p.data?.buyerName, p.data?.id, p.data?.sellerName].filter(Boolean).join(" "),
        cellRenderer: BuyerCell,
        filter: "agTextColumnFilter",
        pinned: "left",
        minWidth: 210,
        flex: 1.2,
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
        headerName: "Status",
        colId: "status",
        valueGetter: (p) => (p.data?.status === "WAITING_FOR_SELLER_RESPONSE" ? "Needs response" : humanize(p.data?.status ?? null)),
        cellRenderer: StatusCell,
        filter: "agTextColumnFilter",
        minWidth: 160,
        flex: 1,
      },
      {
        headerName: "Recommendation",
        colId: "recommendation",
        valueGetter: (p) => (p.data?.report ? RECOMMENDATION_LABEL[p.data.report.recommendation] : ""),
        cellRenderer: AiCell,
        filter: "agTextColumnFilter",
        minWidth: 220,
        flex: 1.3,
      },
      {
        headerName: "Respond by",
        colId: "deadline",
        valueGetter: (p) => (p.data?.status === "WAITING_FOR_SELLER_RESPONSE" ? p.data.daysLeft : null),
        comparator: deadlineComparator,
        cellRenderer: DeadlineCell,
        filter: "agNumberColumnFilter",
        sort: "asc",
        minWidth: 150,
      },
      {
        headerName: "Amount",
        colId: "amount",
        field: "amount",
        type: "rightAligned",
        valueFormatter: (p) => formatAmount(p.value ?? null, p.data?.currency ?? null),
        filter: "agNumberColumnFilter",
        cellClass: "font-medium tabular-nums",
        minWidth: 110,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({ sortable: true, resizable: true, suppressHeaderMenuButton: false, cellStyle: { display: "flex", alignItems: "center" } }),
    [],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-[220px] flex-1 items-center sm:max-w-[340px]">
          <span className="sr-only">Search disputes</span>
          <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute left-3 size-4 text-fg-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buyer, dispute ID, reason…"
            className="h-10 w-full rounded-full border border-line bg-canvas pr-4 pl-9 text-[13.5px] text-fg placeholder:text-fg-muted focus:border-line-strong focus:outline-none"
          />
        </label>
        <span className="text-[12.5px] text-fg-muted tabular-nums" aria-live="polite">
          {shown + pinned.length} of {rows.length}
          {pinned.length > 0 && <span className="ml-2 text-bad">· {pinned.length} due within 2 days, pinned on top</span>}
        </span>
        <button
          type="button"
          onClick={() => gridRef.current?.api.exportDataAsCsv({ fileName: `${csvName}.csv` })}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-canvas px-3.5 text-[13px] font-medium text-fg-heading transition-colors hover:bg-muted"
        >
          <Download aria-hidden strokeWidth={1.75} className="size-3.5" />
          Export CSV
        </button>
      </div>

      <ul className="space-y-2 md:hidden">
        {[...pinned, ...body]
          .filter((d) => !query || [d.buyerName, d.id, d.sellerName, reasonLabel(d.reason)].join(" ").toLowerCase().includes(query.toLowerCase()))
          .map((d) => (
            <li key={d.id}>
              <DisputeCard d={d} urgent={isUrgent(d)} href={openHref(d.id)} />
            </li>
          ))}
      </ul>

      <div className="hidden md:block">
        <AgGridReact<HomeDispute>
          ref={gridRef}
          theme={gridTheme}
          rowData={body}
          pinnedTopRowData={pinned}
          getRowClass={(p) => (p.node.rowPinned ? "bg-bad-bg/60" : undefined)}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(p) => p.data.id}
          quickFilterText={query}
          domLayout="autoHeight"
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
          overlayNoRowsTemplate='<span style="color:#8f8681">No disputes match.</span>'
        />
      </div>
    </div>
  );
}
