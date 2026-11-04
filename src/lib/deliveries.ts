import type { ShippingStatus } from "@/lib/evidence-shared";
import { supabaseAdmin } from "@/lib/supabase";

// Every order's delivery, for the Deliveries section on Home: where each parcel is, as of the
// carrier's last scan, with a link to the carrier's own live tracking page.

export type Delivery = {
  id: string;
  orderNumber: string | null;
  item: string | null;
  buyerName: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  status: ShippingStatus | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  lastScan: { at: string; location?: string; description: string } | null;
  /** The carrier's live tracking page, when we know the carrier. */
  trackingUrl: string | null;
  /** Whether the tracking is on the PayPal transaction (SHIPPED/DELIVERED), which helps stop claims. */
  onPayPal: boolean;
};

export type DeliveryCounts = Record<"in_transit" | "delivered" | "not_moving" | "returned", number>;

const TRACKING_URL: Record<string, (n: string) => string> = {
  usps: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  ups: (n) => `https://www.ups.com/track?tracknum=${n}`,
  fedex: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  dhl: (n) => `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${n}`,
  "canada post": (n) => `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${n}`,
};

export function trackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null;
  const url = TRACKING_URL[carrier.trim().toLowerCase()];
  return url ? url(encodeURIComponent(trackingNumber)) : null;
}

/** The seller's orders, newest shipment first, and how many are in each state. `sellerId` undefined means all (demo). */
export async function getDeliveries(sellerId?: string, limit = 8): Promise<{ deliveries: Delivery[]; counts: DeliveryCounts; total: number }> {
  let query = supabaseAdmin()
    .from("orders")
    .select(
      "id, order_number, item_description, ship_to_name, carrier, tracking_number, shipping_status, shipped_at, delivered_at, tracking_events, paypal_tracking_status, updated_at",
    )
    .order("shipped_at", { ascending: false, nullsFirst: true });
  if (sellerId) query = query.eq("seller_id", sellerId);
  const { data, error } = await query;
  if (error) throw error;

  const counts: DeliveryCounts = { in_transit: 0, delivered: 0, not_moving: 0, returned: 0 };
  for (const o of data) {
    const s = o.shipping_status as ShippingStatus | null;
    if (s === "IN_TRANSIT") counts.in_transit++;
    else if (s === "DELIVERED") counts.delivered++;
    else if (s === "RETURNED_TO_SENDER") counts.returned++;
    else counts.not_moving++;
  }

  // Parcels that need watching (not moving, in transit, returned) come before delivered ones.
  const rank = (s: string | null) => (s === "DELIVERED" ? 1 : 0);
  const sorted = [...data].sort((a, b) => rank(a.shipping_status) - rank(b.shipping_status));

  const deliveries = sorted.slice(0, limit).map((o): Delivery => {
    const events = (o.tracking_events ?? []) as Delivery["lastScan"][];
    return {
      id: o.id,
      orderNumber: o.order_number,
      item: o.item_description,
      buyerName: o.ship_to_name,
      carrier: o.carrier,
      trackingNumber: o.tracking_number,
      status: o.shipping_status as ShippingStatus | null,
      shippedAt: o.shipped_at,
      deliveredAt: o.delivered_at,
      lastScan: events.at(-1) ?? null,
      trackingUrl: trackingUrl(o.carrier, o.tracking_number),
      onPayPal: o.paypal_tracking_status === "SHIPPED" || o.paypal_tracking_status === "DELIVERED",
    };
  });
  return { deliveries, counts, total: data.length };
}
