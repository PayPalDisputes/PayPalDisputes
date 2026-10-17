import { paypalPost } from "@/lib/paypal";
import { actionsMode } from "@/lib/respond";
import { supabaseAdmin } from "@/lib/supabase";

// Uploads shipment tracking to PayPal for orders that have actually shipped. With tracking on the
// transaction, PayPal can see the delivery itself: it strengthens Seller Protection and helps stop
// "item not received" claims before they become disputes. Runs on every sync (and so on the cron).

/** PayPal's carrier codes for the carriers our orders use; anything else is sent as OTHER. */
const CARRIERS: Record<string, string> = {
  usps: "USPS",
  ups: "UPS",
  fedex: "FEDEX",
  dhl: "DHL",
  "canada post": "CANADA_POST",
};

type OrderRow = {
  id: string;
  paypal_transaction_id: string;
  carrier: string | null;
  tracking_number: string | null;
  shipping_status: string | null;
  paypal_tracking_status: string | null;
  paypal_tracking_error: string | null;
};

/**
 * The tracking status to give PayPal, or null when there's nothing honest to upload: a printed
 * label the carrier never scanned isn't a shipment, so it must not look like one on PayPal.
 */
export function payPalTrackingStatus(shippingStatus: string | null): "SHIPPED" | "DELIVERED" | null {
  if (shippingStatus === "DELIVERED") return "DELIVERED";
  if (shippingStatus === "IN_TRANSIT") return "SHIPPED";
  return null;
}

export type TrackingSyncResult = { mode: "live" | "demo"; uploaded: string[]; failed: { order: string; error: string }[]; skipped: number };

/** Uploads tracking for every shipped order whose PayPal tracking is missing or out of date. */
export async function syncTrackingToPayPal(): Promise<TrackingSyncResult> {
  const mode = actionsMode();
  const db = supabaseAdmin();
  const { data: orders, error } = await db
    .from("orders")
    .select("id, paypal_transaction_id, carrier, tracking_number, shipping_status, paypal_tracking_status, paypal_tracking_error")
    .not("tracking_number", "is", null);
  if (error) throw error;

  const due = (orders as OrderRow[]).filter((o) => {
    const status = payPalTrackingStatus(o.shipping_status);
    // A transaction on another seller's account will never accept our tracking; don't retry it every sync.
    if (/not authori[sz]ed/i.test(o.paypal_tracking_error ?? "")) return false;
    return status !== null && status !== o.paypal_tracking_status;
  });
  const result: TrackingSyncResult = { mode, uploaded: [], failed: [], skipped: orders.length - due.length };
  // Demo mode never writes to PayPal (same rule as Approve), so the public site stays read-only.
  if (mode === "demo") return { ...result, skipped: orders.length };

  for (const o of due) {
    const status = payPalTrackingStatus(o.shipping_status)!;
    const carrier = CARRIERS[(o.carrier ?? "").toLowerCase()];
    const tracker = {
      transaction_id: o.paypal_transaction_id,
      tracking_number: o.tracking_number,
      status,
      carrier: carrier ?? "OTHER",
      ...(carrier ? {} : { carrier_name_other: o.carrier ?? "Other" }),
    };
    const res = await paypalPost("/v1/shipping/trackers-batch", { trackers: [tracker] });
    const body = res.body as { errors?: { message?: string; details?: { description?: string }[] }[]; message?: string } | null;
    const batchError = body?.errors?.[0];
    const errorText = !res.ok
      ? (body?.message ?? `PayPal returned ${res.status}`)
      : batchError
        ? (batchError.details?.[0]?.description ?? batchError.message ?? "PayPal rejected the tracker")
        : null;

    const { error: updateError } = await db
      .from("orders")
      .update(
        errorText
          ? { paypal_tracking_error: errorText }
          : { paypal_tracking_status: status, paypal_tracking_uploaded_at: new Date().toISOString(), paypal_tracking_error: null },
      )
      .eq("id", o.id);
    if (updateError) throw updateError;
    if (errorText) result.failed.push({ order: o.paypal_transaction_id, error: errorText });
    else result.uploaded.push(o.paypal_transaction_id);
  }
  return result;
}
