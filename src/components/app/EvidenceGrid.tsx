"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { AgGridReact } from "ag-grid-react";
import type { CellValueChangedEvent, ColDef, ICellRendererParams } from "ag-grid-community";
import { Redo2, RefreshCw, Undo2, Upload } from "lucide-react";
import { formatAmount, reasonLabel } from "@/app/_components/dispute-ui";
import { reassess, saveEvidence } from "@/app/(app)/evidence/actions";
import { CARRIERS, SHIPPING_STATUSES, type EvidenceField, type EvidenceRow } from "@/lib/evidence-shared";
import { cn } from "@/lib/cn";
import { Badge, DecisionBadge } from "../ui/primitives";
import { gridTheme } from "./ag-setup";
import { EvidenceImport } from "./EvidenceImport";

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
        <span className="truncate font-medium text-fg">{d.buyerName ?? "Unknown buyer"}</span>
        {d.simulated && <Badge>Demo data</Badge>}
      </span>
      <span className="truncate text-[12px] text-fg-muted">
        {reasonLabel(d.reason)} · {formatAmount(d.amount, d.currency)}
      </span>
    </span>
  );
}

/**
 * The seller's evidence for every open dispute, editable in place (AG Grid Community cell editing).
 * Each change saves immediately and can be undone (Cmd/Ctrl+Z or the buttons).
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
      show({ tone: "ok", text: `Agent now recommends: ${res.recommendation}.` });
    } else show({ tone: "bad", text: res.error });
  }

  const columnDefs = useMemo<ColDef<EvidenceRow>[]>(
    () => [
      { headerName: "Dispute", colId: "dispute", valueGetter: (p) => p.data?.buyerName, cellRenderer: DisputeCell, pinned: "left", minWidth: 220, editable: false },
      { headerName: "Order #", field: "orderNumber", minWidth: 120 },
      {
        headerName: "Carrier",
        field: "carrier",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["", ...CARRIERS] },
        minWidth: 130,
      },
      {
        headerName: "Tracking #",
        field: "trackingNumber",
        minWidth: 180,
        cellClass: "font-mono text-[12.5px]",
        cellClassRules: { "bg-warn-bg": (p) => !p.value && !!p.data && NEEDS_TRACKING.has(p.data.reason ?? "") },
        tooltipValueGetter: (p) => (!p.value && p.data && NEEDS_TRACKING.has(p.data.reason ?? "") ? "Add tracking: it's the strongest proof for this kind of claim." : undefined),
      },
      {
        headerName: "Shipping status",
        field: "shippingStatus",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["", ...SHIPPING_STATUSES] },
        valueFormatter: (p) => (p.value ? STATUS_LABEL[p.value] : ""),
        minWidth: 150,
      },
      { headerName: "Shipped", field: "shippedAt", cellEditor: "agDateStringCellEditor", minWidth: 120 },
      { headerName: "Delivered", field: "deliveredAt", cellEditor: "agDateStringCellEditor", minWidth: 120 },
      { headerName: "Signature", field: "signatureConfirmed", cellDataType: "boolean", cellEditor: "agCheckboxCellEditor", minWidth: 105 },
      { headerName: "To PayPal address", field: "shipToMatchesPayPal", cellDataType: "boolean", cellEditor: "agCheckboxCellEditor", minWidth: 150 },
      { headerName: "Notes", field: "notes", cellEditor: "agLargeTextCellEditor", cellEditorPopup: true, cellEditorParams: { maxLength: 1000 }, minWidth: 200, flex: 1 },
      {
        headerName: "Agent",
        colId: "agent",
        pinned: "right",
        editable: false,
        sortable: false,
        minWidth: 190,
        cellRenderer: ({ data: d }: Cell) =>
          d ? (
            <span className="flex items-center gap-2">
              {d.recommendation ? <DecisionBadge decision={d.recommendation} /> : <span className="text-[12px] text-fg-muted">Not assessed</span>}
              {(d.evidenceChangedSinceReport || !d.recommendation) && d.status === "WAITING_FOR_SELLER_RESPONSE" && (
                <button
                  type="button"
                  onClick={() => recheck(d)}
                  disabled={checking === d.disputeId}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-line-strong bg-canvas px-2.5 text-[12px] font-medium text-fg-heading hover:bg-muted disabled:opacity-60"
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
    () => ({ editable: true, sortable: true, resizable: true, cellStyle: { display: "flex", alignItems: "center" } }),
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
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-fg px-4 text-[13px] font-medium text-white hover:bg-[#37322f]"
        >
          <Upload aria-hidden strokeWidth={1.75} className="size-3.5" />
          Import CSV
        </button>
        <span className="text-[12.5px] text-fg-muted">
          {demo ? "Double-click a cell to try editing. Demo changes aren't saved." : "Double-click a cell to edit. Changes save as you go."}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Undo"
            onClick={() => gridRef.current?.api.undoCellEditing()}
            className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-canvas text-fg-heading hover:bg-muted"
          >
            <Undo2 strokeWidth={1.75} className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Redo"
            onClick={() => gridRef.current?.api.redoCellEditing()}
            className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-canvas text-fg-heading hover:bg-muted"
          >
            <Redo2 strokeWidth={1.75} className="size-4" />
          </button>
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
        undoRedoCellEditing
        undoRedoCellEditingLimit={50}
        stopEditingWhenCellsLoseFocus
        tooltipShowDelay={300}
        onCellValueChanged={onCellValueChanged}
        overlayNoRowsTemplate='<span style="color:#8f8681">No open disputes need evidence right now.</span>'
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
