/** Evidence constants and types shared by the server (lib/evidence.ts) and the browser grid. */

export type ShippingStatus = "NOT_SHIPPED" | "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED_TO_SENDER";

/** Carriers offered in the editor; "Other" covers the rest. */
export const CARRIERS = ["UPS", "USPS", "FedEx", "DHL", "Canada Post", "Purolator", "Royal Mail", "Australia Post", "Other"] as const;
export const SHIPPING_STATUSES: ShippingStatus[] = ["NOT_SHIPPED", "LABEL_CREATED", "IN_TRANSIT", "DELIVERED", "RETURNED_TO_SENDER"];

export type EvidenceField =
  | "orderNumber"
  | "carrier"
  | "trackingNumber"
  | "shippingStatus"
  | "shippedAt"
  | "deliveredAt"
  | "signatureConfirmed"
  | "shipToMatchesPayPal"
  | "notes";

/** One open dispute and the seller's evidence for it: what the Evidence grid edits. */
export type EvidenceRow = {
  disputeId: string;
  /** The seller-side PayPal transaction id: how an order is matched to a dispute. */
  transactionId: string | null;
  buyerName: string | null;
  reason: string | null;
  amount: number | null;
  currency: string | null;
  sellerName: string | null;
  daysLeft: number | null;
  status: string | null;
  orderNumber: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  shippingStatus: ShippingStatus | null;
  shippedAt: string | null; // YYYY-MM-DD
  deliveredAt: string | null; // YYYY-MM-DD
  signatureConfirmed: boolean | null;
  shipToMatchesPayPal: boolean | null;
  notes: string | null;
  /** True for the made-up demo evidence; real edits clear it. */
  simulated: boolean;
  /** The agent's current call, and whether evidence changed after it was made. */
  recommendation: "fight" | "refund" | "settle" | null;
  evidenceChangedSinceReport: boolean;
};

/** Same rule the server enforces, so the import preview can flag bad tracking numbers up front. */
export const TRACKING_PATTERN = /^[A-Za-z0-9 -]{6,40}$/;
