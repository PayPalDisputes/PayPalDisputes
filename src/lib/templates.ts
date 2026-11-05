import type { PayPalAction } from "@/lib/agent";
import type { OrderEvidence } from "@/lib/dashboard";
import type { Tone } from "@/lib/seller-policy";

// What Sira sends to PayPal and to buyers comes from these templates, filled in with the case's
// facts, never written by the model. Sellers can replace any of them on the Settings page, and can
// still edit the filled-in text on each dispute before sending.
//
// Placeholders are written {like_this}. A line whose placeholder has no value for this case is
// dropped, so a template can list every fact it might use (a signature, a refund id) and only the
// ones this order actually has end up in the text.

export type TemplateId =
  | "evidence_delivered"
  | "evidence_unauthorised"
  | "evidence_refunded"
  | "evidence_as_described"
  | "evidence_general"
  | "message_in_transit"
  | "offer"
  | "accept"
  | "message_refunded";

export type TemplateInfo = {
  id: TemplateId;
  title: string;
  /** When Sira uses it. */
  when: string;
  action: PayPalAction;
  /** Buyer-facing templates have a friendly and a formal version; PayPal-facing ones are always formal. */
  text: string | Record<Tone, string>;
};

export const TEMPLATES: TemplateInfo[] = [
  {
    id: "evidence_delivered",
    title: "Item not received: delivered",
    when: "Sent to PayPal when tracking shows the parcel was delivered.",
    action: "provide_evidence",
    text: `The buyer says they didn't receive order {order_number} ({item}).
We shipped it on {shipped_date} with {carrier}, tracking number {tracking_number}.
{carrier} confirms it was delivered on {delivered_date} to {ship_to_address}, the address on the PayPal transaction.
Delivery was signed for by {signed_by}.
The tracking history and our order record are attached. We ask PayPal to decide this claim in our favour.`,
  },
  {
    id: "evidence_unauthorised",
    title: "Unauthorised: delivered to the account holder",
    when: "Sent to PayPal when the buyer says they didn't make the purchase and the parcel was delivered to their PayPal address.",
    action: "provide_evidence",
    text: `The buyer says they didn't authorise this payment for order {order_number} ({item}).
The order was shipped on {shipped_date} with {carrier}, tracking number {tracking_number}, to {ship_to_address}, the account holder's address on the PayPal transaction.
{carrier} confirms delivery to that address on {delivered_date}.
Delivery was signed for by {signed_by}.
The tracking history and our order record are attached.`,
  },
  {
    id: "evidence_refunded",
    title: "Already refunded",
    when: "Sent to PayPal when your records show the buyer was already refunded.",
    action: "provide_evidence",
    text: `The buyer has already been refunded for order {order_number} ({item}).
Refund ID: {refund_id}.
Accepting this claim would refund the buyer a second time. Our order record is attached.`,
  },
  {
    id: "evidence_as_described",
    title: "Not as described: item matches the listing",
    when: "Sent to PayPal when you contest a 'not as described' claim.",
    action: "provide_evidence",
    text: `The buyer says order {order_number} ({item}) is not as described.
The item was delivered on {delivered_date} with {carrier}, tracking number {tracking_number}, and matches our listing.
In their message the buyer wrote: "{buyer_message}"
Our return policy: {return_policy}
Our order record is attached.`,
  },
  {
    id: "evidence_general",
    title: "Other claims",
    when: "Sent to PayPal when you contest any other kind of claim.",
    action: "provide_evidence",
    text: `We dispute this claim for order {order_number} ({item}).
It was shipped on {shipped_date} with {carrier}, tracking number {tracking_number}.
{carrier} confirms delivery on {delivered_date}.
Our order record is attached.`,
  },
  {
    id: "message_in_transit",
    title: "Parcel still on its way",
    when: "Sent to the buyer when the parcel is in transit and there's time for it to arrive.",
    action: "send_message",
    text: {
      friendly: `Hi {buyer_first_name}, thanks for getting in touch.
Your order ({item}) is on its way: it shipped on {shipped_date} with {carrier}, tracking number {tracking_number}.
The latest update from {carrier}: {latest_scan}.
Could you give it a few more days? If it hasn't arrived by {wait_until}, message us here and we'll sort it out.
{store_name}`,
      formal: `Dear {buyer_name},
Your order {order_number} ({item}) was shipped on {shipped_date} with {carrier}, tracking number {tracking_number}.
The latest carrier update: {latest_scan}.
We ask that you allow a few more days for delivery. If it has not arrived by {wait_until}, please reply here and we will resolve it.
Kind regards,
{store_name}`,
    },
  },
  {
    id: "offer",
    title: "Partial refund offer",
    when: "Sent to the buyer with a partial refund offer.",
    action: "make_offer",
    text: {
      friendly: `Hi {buyer_first_name}, we're sorry about the trouble with your order ({item}).
We'd like to offer a partial refund of {offer_amount}, and you keep the item.
If that works for you, accept the offer and we'll close this out.
{store_name}`,
      formal: `Dear {buyer_name},
We regret the issue with your order {order_number} ({item}).
We would like to offer a partial refund of {offer_amount}; you may keep the item.
If this is acceptable, please accept the offer and we will close the case.
Kind regards,
{store_name}`,
    },
  },
  {
    id: "accept",
    title: "Full refund",
    when: "Sent to PayPal when you accept the claim and PayPal refunds the buyer in full.",
    action: "accept_claim",
    text: `We accept this claim and authorise a full refund of {amount} to the buyer for order {order_number}.`,
  },
  {
    id: "message_refunded",
    title: "Refund note to the buyer",
    when: "Sent to the buyer alongside a full refund.",
    action: "send_message",
    text: {
      friendly: `Hi {buyer_first_name}, we're sorry your order didn't work out.
We've accepted your claim, so PayPal is refunding the full {amount} to you.
{store_name}`,
      formal: `Dear {buyer_name},
We apologise that your order {order_number} did not meet expectations.
We have accepted your claim, and PayPal will refund the full {amount} to you.
Kind regards,
{store_name}`,
    },
  },
];

const BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t])) as Record<TemplateId, TemplateInfo>;

/** A seller's replacements for any of the templates, by id (from Settings). */
export type TemplateOverrides = Partial<Record<TemplateId, string>>;

/** The template text Sira uses for this seller: their own version if they wrote one, else the default in their tone. */
export function templateText(id: TemplateId, tone: Tone, overrides: TemplateOverrides = {}): string {
  const own = overrides[id]?.trim();
  if (own) return own;
  const t = BY_ID[id].text;
  return typeof t === "string" ? t : t[tone];
}

/** Room for the filled-in facts within PayPal's 2,000-character limit. */
export const MAX_TEMPLATE_TEXT = 1500;

export type TemplateValues = Partial<Record<string, string | null>>;

/** Fills {placeholders} in, dropping any line that refers to a value this case doesn't have. */
export function fillTemplate(text: string, values: TemplateValues): string {
  return text
    .split("\n")
    .flatMap((line) => {
      let missing = false;
      const filled = line.replace(/\{([a-z_]+)\}/g, (_, key: string) => {
        const v = values[key];
        if (v === null || v === undefined || v === "") missing = true;
        return v ?? "";
      });
      return missing ? [] : [filled];
    })
    .join("\n")
    .trim();
}

/** The facts a template can use, gathered from the dispute, the order record and the seller. */
export function templateValues(x: {
  dispute: {
    dispute_amount?: { value: string; currency_code: string };
    disputed_transactions?: { buyer?: { name?: string }; items?: { item_name?: string }[] }[];
    messages?: { posted_by?: string; content?: string }[];
  };
  order: OrderEvidence | null;
  storeName: string | null;
  returnPolicy?: string;
  offer?: number | null;
  refundIds?: string[];
  asOf: string;
}): TemplateValues {
  const { dispute: d, order: o } = x;
  const currency = d.dispute_amount?.currency_code ?? "USD";
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  const tx = d.disputed_transactions?.[0];
  const buyerName = o?.shipToName ?? tx?.buyer?.name ?? null;
  const latest = o?.trackingEvents.at(-1);
  const signed = o?.signatureConfirmed ? "the recipient" : null;
  const buyerMessage = d.messages?.find((m) => m.posted_by === "BUYER")?.content ?? null;
  return {
    order_number: o?.orderNumber ?? null,
    item: o?.itemDescription ?? tx?.items?.[0]?.item_name ?? null,
    buyer_name: buyerName,
    buyer_first_name: buyerName?.split(" ")[0] ?? null,
    carrier: o?.carrier ?? null,
    tracking_number: o?.trackingNumber ?? null,
    shipped_date: date(o?.shippedAt),
    delivered_date: o?.shippingStatus === "DELIVERED" ? date(o.deliveredAt) : null,
    ship_to_address: o?.shipToAddress ?? null,
    signed_by: signed,
    latest_scan: latest ? `${latest.description}${latest.location ? `, ${latest.location}` : ""} (${date(latest.at)})` : null,
    wait_until: date(new Date(new Date(x.asOf).getTime() + 5 * 86_400_000).toISOString()),
    buyer_message: buyerMessage,
    return_policy: x.returnPolicy?.trim() || null,
    refund_id: x.refundIds?.length ? x.refundIds.join(", ") : null,
    amount: d.dispute_amount ? money(Number(d.dispute_amount.value)) : null,
    offer_amount: x.offer ? money(x.offer) : null,
    store_name: x.storeName,
  };
}

function date(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : null;
}

/** Which templates carry out a recommendation, given what PayPal allows on this dispute. */
export function templatesFor(x: {
  recommendation: "fight" | "refund" | "settle";
  reason: string;
  earlierRefund: boolean;
  inTransit: boolean;
  allowed: Set<string>;
}): TemplateId[] {
  const ok = (id: TemplateId) => x.allowed.has(BY_ID[id].action);
  const pick = (...ids: TemplateId[]) => ids.filter(ok);
  switch (x.recommendation) {
    case "settle":
      return pick("offer");
    case "refund":
      return pick("accept", "message_refunded");
    case "fight": {
      if (x.inTransit && !x.earlierRefund) return pick("message_in_transit");
      const evidence: TemplateId = x.earlierRefund
        ? "evidence_refunded"
        : x.reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED"
          ? "evidence_delivered"
          : x.reason === "UNAUTHORISED"
            ? "evidence_unauthorised"
            : x.reason === "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED"
              ? "evidence_as_described"
              : "evidence_general";
      return pick(evidence);
    }
  }
}

/** The filled-in drafts for a recommendation, ready for the seller to edit and send. */
export function buildDrafts(ids: TemplateId[], values: TemplateValues, tone: Tone, overrides?: TemplateOverrides) {
  return ids.map((id) => ({ action: BY_ID[id].action, template: id, text: fillTemplate(templateText(id, tone, overrides), values) }));
}
