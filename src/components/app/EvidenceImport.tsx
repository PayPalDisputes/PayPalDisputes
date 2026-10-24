"use client";

import { useMemo, useState, useTransition } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FileUp, X } from "lucide-react";
import { importEvidence } from "@/app/(app)/evidence/actions";
import { SHIPPING_STATUSES, TRACKING_PATTERN, type EvidenceField, type EvidenceRow, type ShippingStatus } from "@/lib/evidence-shared";
import { Badge } from "../ui/primitives";
import { gridTheme } from "./ag-setup";

/* ------------------------------------------------------------------ */
/* CSV parsing and column matching                                      */
/* ------------------------------------------------------------------ */

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, commas and newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") endField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else field += c;
  }
  if (field || row.length) endRow();
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

type Key = EvidenceField | "transactionId";

/** Header names we recognise (lower-cased, punctuation stripped) → field. Covers Shopify/ShipStation-style exports. */
const HEADER_ALIASES: Record<string, Key> = {
  transactionid: "transactionId",
  paypaltransactionid: "transactionId",
  paypaltransaction: "transactionId",
  order: "orderNumber",
  ordernumber: "orderNumber",
  orderid: "orderNumber",
  name: "orderNumber",
  carrier: "carrier",
  shippingcarrier: "carrier",
  trackingcompany: "carrier",
  tracking: "trackingNumber",
  trackingnumber: "trackingNumber",
  trackingno: "trackingNumber",
  status: "shippingStatus",
  shippingstatus: "shippingStatus",
  fulfillmentstatus: "shippingStatus",
  shipped: "shippedAt",
  shippedat: "shippedAt",
  shipdate: "shippedAt",
  fulfilledat: "shippedAt",
  delivered: "deliveredAt",
  deliveredat: "deliveredAt",
  deliverydate: "deliveredAt",
  signature: "signatureConfirmed",
  signatureconfirmed: "signatureConfirmed",
  addressmatchespaypal: "shipToMatchesPayPal",
  shiptomatchespaypal: "shipToMatchesPayPal",
  notes: "notes",
  note: "notes",
};

const normHeader = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");

/** "Delivered", "in transit", "label_created"… → our status enum. */
function normStatus(v: string): ShippingStatus | null | "invalid" {
  const k = v.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!k) return null;
  if ((SHIPPING_STATUSES as string[]).includes(k)) return k as ShippingStatus;
  if (k === "FULFILLED" || k === "SHIPPED") return "IN_TRANSIT";
  if (k === "UNFULFILLED") return "NOT_SHIPPED";
  if (k === "RETURNED") return "RETURNED_TO_SENDER";
  return "invalid";
}

/** Accepts 2026-10-02, 10/02/2026 or anything Date can read; returns YYYY-MM-DD. */
function normDate(v: string): string | null | "invalid" {
  const t = v.trim();
  if (!t) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T12:00:00Z` : t);
  return Number.isNaN(d.getTime()) ? "invalid" : d.toISOString().slice(0, 10);
}

function normBool(v: string): boolean | null | "invalid" {
  const t = v.trim().toLowerCase();
  if (!t) return null;
  if (["yes", "y", "true", "1"].includes(t)) return true;
  if (["no", "n", "false", "0"].includes(t)) return false;
  return "invalid";
}

type PreviewRow = {
  line: number;
  match: EvidenceRow | null;
  matchedBy: "transaction" | "order" | null;
  values: Partial<Record<EvidenceField, unknown>>;
  problems: string[];
};

function buildPreview(table: string[][], existing: EvidenceRow[]): { rows: PreviewRow[]; unknownHeaders: string[]; usedHeaders: string[] } {
  const [header = [], ...body] = table;
  const keys = header.map((h) => HEADER_ALIASES[normHeader(h)] ?? null);
  const byTx = new Map(existing.filter((e) => e.transactionId).map((e) => [e.transactionId!.toLowerCase(), e]));
  const byOrder = new Map(existing.filter((e) => e.orderNumber).map((e) => [e.orderNumber!.toLowerCase().replace(/^#/, ""), e]));

  const rows = body.map((cells, i) => {
    const values: Partial<Record<EvidenceField, unknown>> = {};
    const problems: string[] = [];
    let tx = "";
    keys.forEach((key, c) => {
      const raw = (cells[c] ?? "").trim();
      if (!key || raw === "") return;
      if (key === "transactionId") tx = raw;
      else if (key === "shippingStatus") {
        const s = normStatus(raw);
        if (s === "invalid") problems.push(`Unknown status "${raw}"`);
        else values.shippingStatus = s;
      } else if (key === "shippedAt" || key === "deliveredAt") {
        const d = normDate(raw);
        if (d === "invalid") problems.push(`Can't read date "${raw}"`);
        else values[key] = d;
      } else if (key === "signatureConfirmed" || key === "shipToMatchesPayPal") {
        const b = normBool(raw);
        if (b === "invalid") problems.push(`Expected yes/no, got "${raw}"`);
        else values[key] = b;
      } else if (key === "trackingNumber") {
        if (!TRACKING_PATTERN.test(raw)) problems.push(`Tracking "${raw}" doesn't look valid`);
        else values.trackingNumber = raw;
      } else values[key] = raw;
    });

    const order = typeof values.orderNumber === "string" ? values.orderNumber.toLowerCase().replace(/^#/, "") : "";
    const byTransaction = tx ? byTx.get(tx.toLowerCase()) : undefined;
    const byOrderNumber = order ? byOrder.get(order) : undefined;
    const match = byTransaction ?? byOrderNumber ?? null;
    if (!match) problems.push(tx || order ? "No open dispute matches this row" : "Needs a PayPal transaction ID or order number");
    if (Object.keys(values).filter((k) => k !== "orderNumber").length === 0) problems.push("No evidence columns found");

    return { line: i + 2, match, matchedBy: byTransaction ? "transaction" : byOrderNumber ? "order" : null, values, problems } as PreviewRow;
  });

  return {
    rows,
    usedHeaders: header.filter((_, c) => keys[c]),
    unknownHeaders: header.filter((h, c) => !keys[c] && h.trim()),
  };
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

const FIELD_LABEL: Record<EvidenceField, string> = {
  orderNumber: "Order #",
  carrier: "Carrier",
  trackingNumber: "Tracking #",
  shippingStatus: "Status",
  shippedAt: "Shipped",
  deliveredAt: "Delivered",
  signatureConfirmed: "Signature",
  shipToMatchesPayPal: "To PayPal address",
  notes: "Notes",
};

/** Upload a CSV of orders → preview every row with its match and problems → save the good ones. */
export function EvidenceImport({ existing, onClose }: { existing: EvidenceRow[]; onClose: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReturnType<typeof buildPreview> | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  async function onFile(file: File | undefined) {
    setResult(null);
    if (!file) return;
    if (file.size > 2_000_000) {
      setResult("That file is over 2 MB. Export just the orders with open disputes.");
      return;
    }
    setFileName(file.name);
    setPreview(buildPreview(parseCsv(await file.text()), existing));
  }

  const good = preview?.rows.filter((r) => r.match && r.problems.length === 0) ?? [];

  const columnDefs = useMemo<ColDef<PreviewRow>[]>(
    () => [
      { headerName: "Row", field: "line", width: 70 },
      {
        headerName: "Matches",
        colId: "match",
        minWidth: 220,
        flex: 1,
        valueGetter: (p) => p.data?.match?.buyerName ?? "",
        cellRenderer: ({ data: r }: ICellRendererParams<PreviewRow>) =>
          r?.match ? (
            <span className="flex flex-col gap-1 leading-none">
              <span className="font-medium text-fg">{r.match.buyerName ?? r.match.disputeId}</span>
              <span className="text-[11.5px] text-fg-muted">by {r.matchedBy === "transaction" ? "PayPal transaction ID" : "order number"}</span>
            </span>
          ) : (
            <Badge tone="bad">No match</Badge>
          ),
      },
      {
        headerName: "Evidence found",
        colId: "values",
        minWidth: 260,
        flex: 1.4,
        valueGetter: (p) =>
          Object.entries(p.data?.values ?? {})
            .filter(([k]) => k !== "orderNumber")
            .map(([k, v]) => `${FIELD_LABEL[k as EvidenceField]}: ${v === true ? "yes" : v === false ? "no" : v}`)
            .join(" · "),
        tooltipValueGetter: (p) => p.value,
      },
      {
        headerName: "Status",
        colId: "problems",
        minWidth: 240,
        flex: 1.2,
        sort: "desc",
        valueGetter: (p) => (p.data?.problems.length ? p.data.problems.join("; ") : ""),
        comparator: (a: string, b: string) => (a ? 1 : 0) - (b ? 1 : 0),
        cellRenderer: ({ data: r }: ICellRendererParams<PreviewRow>) =>
          r && r.problems.length === 0 ? <Badge tone="ok">Ready</Badge> : <span className="text-[12.5px] text-bad">{r?.problems.join("; ")}</span>,
        tooltipValueGetter: (p) => p.value || undefined,
      },
    ],
    [],
  );

  return (
    <section aria-label="Import evidence from CSV" className="mb-4 rounded-2xl border border-line bg-subtle p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="t-section">Import tracking from a CSV</h2>
          <p className="mt-1 max-w-[620px] text-[13px] leading-5 text-fg-body">
            Export orders from Shopify, ShipStation or a spreadsheet. We match rows by <strong className="font-medium">PayPal transaction ID</strong> or{" "}
            <strong className="font-medium">order number</strong>, and read columns like Tracking number, Carrier, Status, Shipped and Delivered. Nothing
            saves until you confirm.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close import" className="inline-flex size-8 items-center justify-center rounded-full text-fg-muted hover:bg-muted hover:text-fg">
          <X strokeWidth={1.75} className="size-4" />
        </button>
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-canvas px-4 py-6 text-[13.5px] text-fg-body transition-colors hover:border-fg-muted hover:text-fg">
        <FileUp aria-hidden strokeWidth={1.75} className="size-4" />
        {fileName ? `Loaded ${fileName}. Choose another file` : "Choose a .csv file"}
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>

      {preview && (
        <div className="mt-4">
          <p className="mb-3 text-[12.5px] text-fg-body">
            {preview.rows.length} rows · <span className="font-medium text-ok">{good.length} ready</span> ·{" "}
            <span className="font-medium text-bad">{preview.rows.length - good.length} need attention</span>
            {preview.usedHeaders.length > 0 && <> · reading {preview.usedHeaders.join(", ")}</>}
            {preview.unknownHeaders.length > 0 && <span className="text-fg-muted"> · ignoring {preview.unknownHeaders.join(", ")}</span>}
          </p>
          <AgGridReact<PreviewRow>
            theme={gridTheme}
            rowData={preview.rows}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, resizable: true, cellStyle: { display: "flex", alignItems: "center" } }}
            domLayout={preview.rows.length > 12 ? "normal" : "autoHeight"}
            containerStyle={preview.rows.length > 12 ? { height: 520 } : undefined}
            tooltipShowDelay={300}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={good.length === 0 || saving}
              onClick={() =>
                startSaving(async () => {
                  const res = await importEvidence(good.map((r) => ({ disputeId: r.match!.disputeId, values: r.values })));
                  if (res.demo) {
                    setResult(`Demo account: ${good.length} row${good.length === 1 ? " was" : "s were"} ready, but nothing was saved. Sign in with PayPal to import for real.`);
                    return;
                  }
                  setResult(
                    `Saved evidence for ${res.saved} dispute${res.saved === 1 ? "" : "s"}.` +
                      (res.failed.length ? ` ${res.failed.length} failed: ${res.failed.map((f) => f.error).join("; ")}` : " Use Re-check to have the agent take another look."),
                  );
                  setPreview(null);
                  setFileName(null);
                })
              }
              className="inline-flex h-10 items-center rounded-full bg-fg px-5 text-[13.5px] font-medium text-white hover:bg-fg/85 disabled:opacity-50"
            >
              {saving ? "Saving…" : `Save ${good.length} ready row${good.length === 1 ? "" : "s"}`}
            </button>
            <span className="text-[12.5px] text-fg-muted">Rows that need attention are skipped.</span>
          </div>
        </div>
      )}
      {result && <p className="mt-3 text-[13px] text-fg" role="status">{result}</p>}
    </section>
  );
}
