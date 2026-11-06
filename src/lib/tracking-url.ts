// Links to each carrier's own live tracking page. Shared by Home's Deliveries and the Shipping proof table.

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
