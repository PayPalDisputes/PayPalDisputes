"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { AgGridReact } from "ag-grid-react";
import type { CellValueChangedEvent, ColDef, ICellRendererParams } from "ag-grid-community";
import { ExternalLink, RefreshCw, Upload } from "lucide-react";
import { reasonLabel } from "@/app/_components/dispute-ui";
import { reassess, saveEvidence } from "@/app/(app)/evidence/actions";
import { CARRIERS, SHIPPING_STATUSES, type EvidenceField, type EvidenceRow } from "@/lib/evidence-shared";
import { cn } from "@/lib/cn";
import { trackingUrl } from "@/lib/tracking-url";
import { Amount } from "./bits";
import { gridTheme } from "./ag-setup";
import { EvidenceImport } from "./EvidenceImport";

const shortDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const STATUS_LABEL: Record<string, string> = {
  NOT_SHIPPED: "Not shipped",
  LABEL_CREATED: "Label created",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  RETURNED_TO_SENDER: "Returned to sender",
};

/** Reasons where proof of shipping/delivery decides the case, so missing tracking is flagged. */
const NEEDS_TRACKING = new Set(["MERCHANDISE_OR_SERVICE_NOT_RECEIVED", "UNAUTHORISED"]);

type Cell = ICellRendererParams<EvidenceRow>;
type Toast = { tone: "ok" | "bad"; text: string } | null;

function DisputeCell({ data: d }: Cell) {
  if (!d) return null;
  return (
    <span className="flex min-w-0 flex-col gap-1 leading-none">
      <span className="flex items-center gap-1.5">
        <span className="truncate text-fg">{d.buyerName ?? "Unknown buyer"}</span>
        {d.simulated && <span className="text-[12px] text-fg-muted">· demo data</span>}
      </span>
      <span className="truncate text-[12.5px] text-fg-muted">
        {d.orderNumber ? `${d.orderNumber} · ` : ""}
        {reasonLabel(d.reason)} · <Amount amount={d.amount} currency={d.currency} />
      </span>
    </span>
  );
}

/**
 * The seller's evidence for every open dispute, editable in place (AG Grid Community cell editing).
 * Each change saves immediately and can be undone with Cmd/Ctrl+Z.
 */
export function EvidenceGrid({ rows, demo = false }: { rows: EvidenceRow[]; /** Demo account: edits stay on screen but aren't saved. */ demo?: boolean }) {
  const gridRef = useRef<AgGridReact<EvidenceRow>>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [importing, setImporting] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = (t: Toast) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  async function recheck(d: EvidenceRow) {
    setChecking(d.disputeId);
    const res = await reassess(d.disputeId);
    setChecking(null);
    if (res.ok) {
      const node = gridRef.current?.api.getRowNode(d.disputeId);
      node?.setData({ ...d, recommendation: res.recommendation as EvidenceRow["recommendation"], evidenceChangedSinceReport: false });
      show({ tone: "ok", text: `Sira now recommends: ${({ fight: "Fight", settle: "Settle", refund: "Refund" } as Record<string, string>)[res.recommendation ?? ""] ?? res.recommendation}.` });
    } else show({ tone: "bad", text: res.error });
  }

  const columnDefs = useMemo<ColDef<EvidenceRow>[]>(
    () => [
      // Nine columns that fit a laptop screen: order # sits under the buyer, the dates under the status, notes wrap.
      {
        headerName: "Dispute",
        colId: "dispute",
        valueGetter: (p) => p.data?.buyerName,
        getQuickFilterText: (p) => [p.data?.buyerName, p.data?.orderNumber].filter(Boolean).join(" "),
        cellRenderer: DisputeCell,
        width: 220,
        editable: false,
      },
      {
        headerName: "Carrier",
        field: "carrier",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["", ...CARRIERS] },
        width: 95,
      },
      {
        headerName: "Tracking #",
        field: "trackingNumber",
        width: 200,
        cellClass: "font-mono text-[12px]",
        // Missing tracking reads as an empty field to fill in (dashed), not a warning colour.
        cellClassRules: { "evidence-missing": (p) => !p.value && !!p.data && NEEDS_TRACKING.has(p.data.reason ?? "") },
        cellRenderer: ({ value, data }: Cell) => {
          if (!value) return data && NEEDS_TRACKING.has(data.reason ?? "") ? <span className="font-sans text-[13px] text-fg-muted">Add tracking number</span> : null;
          const url = trackingUrl(data?.carrier ?? null, value);
          if (!url) return value;
          // The number opens the carrier's live tracking; double-clicking the cell still edits it.
          return (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title={`Track on ${data?.carrier}`}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              {value}
              <ExternalLink aria-hidden strokeWidth={1.6} className="size-3.5 shrink-0" />
            </a>
          );
        },
        tooltipValueGetter: (p) => (!p.value && p.data && NEEDS_TRACKING.has(p.data.reason ?? "") ? "Add tracking: it's the strongest proof for this kind of claim." : undefined),
      },
      {
        headerName: "Shipping status",
        field: "shippingStatus",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["", ...SHIPPING_STATUSES] },
        valueFormatter: (p) => (p.value ? STATUS_LABEL[p.value] : ""),
        // The status, with the delivered (or shipped) date under it; dates come from the carrier or a CSV import.
        cellRenderer: ({ value, data }: Cell) => {
          const date = value === "DELIVERED" && data?.deliveredAt ? `Delivered ${shortDate(data.deliveredAt)}` : data?.shippedAt ? `Shipped ${shortDate(data.shippedAt)}` : null;
          return (
            <span className="flex min-w-0 flex-col gap-[3px] leading-tight">
              <span className="truncate">{value ? STATUS_LABEL[value] : <span className="text-fg-muted">Not set</span>}</span>
              {date && <span className="truncate text-[12px] text-fg-muted">{date}</span>}
            </span>
          );
        },
        width: 140,
      },
      { headerName: "Signed", headerTooltip: "The buyer signed for the parcel.", field: "signatureConfirmed", cellDataType: "boolean", cellEditor: "agCheckboxCellEditor", width: 80 },
      {
        headerName: "To PayPal address",
        headerTooltip: "Tick if you shipped to the address on the buyer's PayPal payment.",
        field: "shipToMatchesPayPal",
        cellDataType: "boolean",
        cellEditor: "agCheckboxCellEditor",
        wrapHeaderText: true,
        autoHeaderHeight: true,
        width: 100,
      },
      {
        headerName: "Notes",
        field: "notes",
        cellEditor: "agLargeTextCellEditor",
        cellEditorPopup: true,
        cellEditorParams: { maxLength: 1000 },
        // Up to three lines show in the row; the whole note shows on hover. Double-click still edits it.
        cellRenderer: ({ value }: Cell) =>
          value ? (
            <span title={value} className="line-clamp-3 text-[13px] leading-[18px] whitespace-normal text-fg-body">
              {value}
            </span>
          ) : (
            <span className="text-[13px] text-fg-muted">Add a note</span>
          ),
        minWidth: 200,
        flex: 1,
      },
      {
        headerName: "Sira's call",
        colId: "agent",
        editable: false,
        sortable: false,
        width: 150,
        cellRenderer: ({ data: d }: Cell) =>
          d ? (
            <span className="flex items-center gap-2">
              {d.recommendation ? (
                <span className="text-fg-body">{{ fight: "Fight", settle: "Settle", refund: "Refund" }[d.recommendation]}</span>
              ) : (
                <span className="text-[12.5px] text-fg-muted">Not assessed</span>
              )}
              {(d.evidenceChangedSinceReport || !d.recommendation) && d.status === "WAITING_FOR_SELLER_RESPONSE" && (
                <button
                  type="button"
                  onClick={() => recheck(d)}
                  disabled={checking === d.disputeId}
                  className="inline-flex h-7 items-center gap-1 rounded-md bg-muted px-2.5 text-[12.5px] text-fg hover:bg-inset disabled:opacity-60"
                >
                  <RefreshCw aria-hidden strokeWidth={1.75} className={cn("size-3", checking === d.disputeId && "animate-spin-slow")} />
                  {checking === d.disputeId ? "Checking…" : "Re-check"}
                </button>
              )}
            </span>
          ) : null,
      },
    ],
    // recheck/checking change the Agent cell only; the grid re-renders it via refreshCells below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checking],
  );

  const defaultColDef = useMemo<ColDef<EvidenceRow>>(
    () => ({ editable: true, sortable: true, resizable: false, cellStyle: { display: "flex", alignItems: "center" } }),
    [],
  );

  function onCellValueChanged(e: CellValueChangedEvent<EvidenceRow>) {
    const field = e.colDef.field as EvidenceField | undefined;
    // "rollback" is our own revert after a rejected save: it must not be saved again.
    if (!field || !e.data || e.oldValue === e.newValue || e.source === "rollback") return;
    const { disputeId } = e.data;
    startTransition(async () => {
      const res = await saveEvidence(disputeId, field, e.newValue ?? null);
      if (res.ok && res.demo) {
        show({ tone: "ok", text: "Demo account: not saved." });
      } else if (res.ok) {
        e.node.setData({ ...e.data, simulated: false, evidenceChangedSinceReport: !!e.data.recommendation });
        show({ tone: "ok", text: "Saved." });
      } else {
        e.node.setDataValue(field, e.oldValue, "rollback");
        show({ tone: "bad", text: res.error });
      }
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setImporting((v) => !v)}
          className="inline-flex h-[38px] items-center gap-1.5 rounded-md bg-accent px-4 text-[14px] font-medium text-white hover:bg-accent-hover"
        >
          <Upload aria-hidden strokeWidth={1.75} className="size-3.5" />
          Import CSV
        </button>
        <span className="text-[12.5px] text-fg-muted">
          {demo ? "Double-click a cell to try editing. Demo changes aren't saved." : "Double-click a cell to edit. Changes save as you go; Cmd/Ctrl+Z undoes the last one."}
        </span>
      </div>

      {importing && <EvidenceImport existing={rows} onClose={() => setImporting(false)} />}

      <AgGridReact<EvidenceRow>
        ref={gridRef}
        theme={gridTheme}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={(p) => p.data.disputeId}
        domLayout="autoHeight"
        rowHeight={76}
        undoRedoCellEditing
        undoRedoCellEditingLimit={50}
        stopEditingWhenCellsLoseFocus
        tooltipShowDelay={300}
        onCellValueChanged={onCellValueChanged}
        overlayNoRowsTemplate='<span style="color:var(--mk-fg-muted)">No open disputes need evidence right now.</span>'
      />

      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        {toast && (
          <span
            className={cn(
              "animate-fade-up inline-block rounded-full px-4 py-2 text-[13px] font-medium shadow-float",
              toast.tone === "ok" ? "bg-fg text-white" : "bg-bad text-white",
            )}
          >
            {toast.text}
          </span>
        )}
      </div>
    </div>
  );
}
