import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { getDisputeDetail, type OrderEvidence } from "@/lib/dashboard";

// Builds the PDF evidence pack attached when a seller approves "fight": the order, the shipping
// and delivery record, the carrier's scans, the seller's statement and the buyer's own words.
// Generated on demand from our own data and never stored. The buyer's dispute history is left
// out on purpose: PayPal decides on evidence about this order.

/** PayPal's document names allow letters, digits, dashes, underscores, commas and spaces, then an extension. */
export const evidencePackName = (disputeId: string) => `evidence-pack-${disputeId.replace(/[^A-Za-z0-9-_]/g, "")}.pdf`;

/** Refund ids the seller's notes mention, e.g. "refund id 3XL51238A9876543P". */
export function refundIdsFromNotes(notes: string | null): string[] {
  return [...(notes ?? "").matchAll(/refund id[:\s]+([A-Z0-9]{10,})/gi)].map((m) => m[1]);
}

type PackInput = {
  disputeId: string;
  reason: string | null;
  amount: number | null;
  currency: string | null;
  sellerName: string | null;
  openedAt?: string;
  item?: string;
  paidAt?: string;
  paidAmount?: string;
  transactionId?: string;
  buyerName?: string;
  buyerMessages: string[];
  order: OrderEvidence | null;
  /** The seller's statement to PayPal (the approved provide_evidence draft). */
  statement: string | null;
};

// --- Text helpers ---------------------------------------------------------------------------

/** The standard PDF fonts only cover Latin-1 (WinAnsi); swap or drop anything else. */
function safe(text: string): string {
  return text
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•·]/g, "-")
    .replace(/ /g, " ")
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "");
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "-";

const fmtMoney = (amount: number | null, currency: string | null) =>
  amount === null ? "-" : new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(amount);

const REASONS: Record<string, string> = {
  MERCHANDISE_OR_SERVICE_NOT_RECEIVED: "Item not received",
  MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: "Item not as described",
  UNAUTHORISED: "Unauthorized transaction",
  CREDIT_NOT_PROCESSED: "Credit not processed",
  DUPLICATE_TRANSACTION: "Duplicate transaction",
};

// --- Layout ---------------------------------------------------------------------------------

const PAGE = { width: 612, height: 792, margin: 56 }; // US Letter, 0.78in margins
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.42, 0.46);
const RULE = rgb(0.85, 0.85, 0.87);

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    readonly doc: PDFDocument,
    readonly font: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - PAGE.margin;
  }
  private ensure(height: number) {
    if (this.y - height < PAGE.margin + 20) this.newPage();
  }
  private lines(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = [];
    for (const paragraph of safe(text).split(/\r?\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) > width && line) {
          out.push(line);
          line = word;
        } else line = next;
      }
      out.push(line);
    }
    return out;
  }
  text(text: string, { size = 10, font = this.font, color = INK, indent = 0, gap = 4 } = {}) {
    const width = PAGE.width - PAGE.margin * 2 - indent;
    for (const line of this.lines(text, font, size, width)) {
      this.ensure(size + 3);
      this.page.drawText(line, { x: PAGE.margin + indent, y: this.y - size, size, font, color });
      this.y -= size + 3;
    }
    this.y -= gap;
  }
  heading(text: string) {
    this.ensure(40);
    this.y -= 8;
    this.page.drawLine({ start: { x: PAGE.margin, y: this.y }, end: { x: PAGE.width - PAGE.margin, y: this.y }, thickness: 0.6, color: RULE });
    this.y -= 6;
    this.text(text.toUpperCase(), { size: 9, font: this.bold, color: MUTED, gap: 6 });
  }
  /** "Label: value" rows with a fixed label column. */
  rows(pairs: [string, string][]) {
    const labelWidth = 150;
    for (const [label, value] of pairs) {
      const valueLines = this.lines(value, this.font, 10, PAGE.width - PAGE.margin * 2 - labelWidth);
      this.ensure(valueLines.length * 13);
      this.page.drawText(safe(label), { x: PAGE.margin, y: this.y - 10, size: 10, font: this.font, color: MUTED });
      for (const line of valueLines) {
        this.page.drawText(line, { x: PAGE.margin + labelWidth, y: this.y - 10, size: 10, font: this.font, color: INK });
        this.y -= 13;
      }
      this.y -= 2;
    }
    this.y -= 4;
  }
}

/** Builds the evidence pack PDF. */
export async function buildEvidencePack(p: PackInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Dispute evidence ${p.disputeId}`);
  doc.setAuthor(p.sellerName ?? "Seller");
  doc.setCreator("Sira");
  const w = new Writer(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));
  const o = p.order;

  w.text("Dispute evidence", { size: 20, font: w.bold, gap: 2 });
  w.text(`${p.disputeId} - ${REASONS[p.reason ?? ""] ?? p.reason ?? "Dispute"} - ${fmtMoney(p.amount, p.currency)}`, { size: 11, color: MUTED, gap: 2 });
  w.text(`Submitted by ${p.sellerName ?? "the seller"} - prepared ${fmtDate(new Date().toISOString())}`, { size: 9, color: MUTED, gap: 8 });

  if (p.statement) {
    w.heading("Seller's statement");
    w.text(p.statement, { gap: 6 });
  }

  w.heading("Order");
  w.rows([
    ["Item", p.item ?? o?.itemDescription ?? "-"],
    ["Amount paid", p.paidAmount ?? fmtMoney(p.amount, p.currency)],
    ["Paid on", fmtDate(p.paidAt)],
    ["PayPal transaction", p.transactionId ?? "-"],
    ["Order number", o?.orderNumber ?? "-"],
    ["Buyer", p.buyerName ?? o?.shipToName ?? "-"],
  ]);

  w.heading("Shipping and delivery");
  if (!o) {
    w.text("No order record was found for this transaction.", { color: MUTED });
  } else {
    w.rows([
      ["Carrier", o.carrier ?? "-"],
      ["Tracking number", o.trackingNumber ?? "-"],
      ["Status", (o.shippingStatus ?? "-").toLowerCase().replaceAll("_", " ")],
      ["Shipped", fmtDate(o.shippedAt)],
      ["Delivered", fmtDate(o.deliveredAt)],
      ["Signature on delivery", o.signatureConfirmed === null ? "-" : o.signatureConfirmed ? "Yes, signed for by the recipient" : "No"],
      ["Ship-to address", [o.shipToName, o.shipToAddress].filter(Boolean).join(", ") || "-"],
      ["Matches PayPal address", o.shipToMatchesPayPal === null ? "-" : o.shipToMatchesPayPal ? "Yes" : "No"],
      ["Tracking on PayPal", o.payPalTrackingUploadedAt ? `Uploaded ${fmtDate(o.payPalTrackingUploadedAt)}` : "Not uploaded"],
    ]);
    if (o.trackingEvents.length > 0) {
      w.text("Carrier scans", { size: 10, font: w.bold, gap: 3 });
      for (const e of o.trackingEvents) w.text(`${fmtDate(e.at)} - ${e.description}${e.location ? ` (${e.location})` : ""}`, { indent: 10, gap: 1 });
      w.y -= 6;
    }
    if (o.notes) w.rows([["Seller's notes", o.notes]]);
    const refunds = refundIdsFromNotes(o.notes);
    if (refunds.length > 0) w.rows([["Refund issued", `PayPal refund id ${refunds.join(", ")}`]]);
  }

  if (p.buyerMessages.length > 0) {
    w.heading("Buyer's messages");
    for (const m of p.buyerMessages) w.text(`"${m}"`, { indent: 10, gap: 6 });
  }

  // Footnote pinned to the bottom of the last page, so it never spills onto a page of its own.
  if (o?.simulated) {
    w.page.drawText("Sandbox demo: the shipping and order details in this pack are simulated test data.", {
      x: PAGE.margin,
      y: PAGE.margin / 2,
      size: 8,
      font: w.font,
      color: MUTED,
    });
  }
  return doc.save();
}

/** Loads a dispute and builds its evidence pack; `statement` defaults to the latest report's evidence draft. */
export async function evidencePackFor(disputeId: string, statement?: string): Promise<Uint8Array | null> {
  const d = await getDisputeDetail(disputeId);
  if (!d) return null;
  const tx = d.raw.disputed_transactions?.[0];
  const item = tx?.items?.[0];
  return buildEvidencePack({
    disputeId: d.id,
    reason: d.reason,
    amount: d.amount,
    currency: d.currency,
    sellerName: d.sellerName,
    openedAt: d.raw.create_time,
    item: item?.item_description ?? item?.item_name,
    paidAt: tx?.create_time,
    paidAmount: tx?.gross_amount ? fmtMoney(Number(tx.gross_amount.value), tx.gross_amount.currency_code) : undefined,
    transactionId: tx?.seller_transaction_id,
    buyerName: tx?.buyer?.name,
    buyerMessages: (d.raw.messages ?? []).filter((m) => m.posted_by === "BUYER").map((m) => m.content),
    order: d.order,
    statement: statement ?? d.decision?.assessment.drafts.find((dr) => dr.action === "provide_evidence")?.text ?? null,
  });
}
