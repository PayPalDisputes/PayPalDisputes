import { supabaseAdmin } from "@/lib/supabase";
import type { PayPalDisputeDetail, ShippingStatus } from "@/lib/dashboard";

// Fills the `orders` table with made-up shipping evidence for every dispute in the database,
// so the dashboard and the agent have something to judge claims against.
// Safe to re-run: it only ever overwrites rows it created (simulated = true).
// Usage: npm run seed:orders

const DAY = 86_400_000;
/** Length of every scenario's timeline, in days after payment. */
const TIMELINE_DAYS = 5;

type Ctx = {
  usd: boolean;
  /** A point in the order's history, `days` after payment (0 to TIMELINE_DAYS). */
  at: (days: number) => string;
};

type Scenario = {
  name: string;
  build: (ctx: Ctx) => {
    carrier: string | null;
    tracking_number: string | null;
    shipping_status: ShippingStatus;
    shipped_at: string | null;
    delivered_at: string | null;
    signature_confirmed: boolean;
    ship_to_matches_paypal: boolean;
    ship_to_address: string;
    tracking_events: { at: string; location: string; description: string }[];
    notes: string;
  };
};

const ADDRESS = { usd: "742 Evergreen Terrace, Springfield, IL 62704, US", cad: "88 Queen St W, Toronto, ON M5H 2N2, CA" };

/** A parcel that was accepted, moved and delivered (with or without a signature). */
function delivered({ usd, at }: Ctx, carrier: string, tracking: string, signed: boolean) {
  return {
    carrier,
    tracking_number: tracking,
    shipping_status: "DELIVERED" as const,
    shipped_at: at(1),
    delivered_at: at(4),
    signature_confirmed: signed,
    ship_to_matches_paypal: true,
    ship_to_address: usd ? ADDRESS.usd : ADDRESS.cad,
    tracking_events: [
      { at: at(1), location: usd ? "Louisville, KY" : "Mississauga, ON", description: "Accepted at origin facility" },
      { at: at(2.5), location: usd ? "Chicago, IL" : "Toronto, ON", description: "In transit to next facility" },
      { at: at(3.8), location: usd ? "Springfield, IL" : "Toronto, ON", description: "Out for delivery" },
      { at: at(4), location: usd ? "Springfield, IL" : "Toronto, ON", description: signed ? "Delivered, signed for by recipient" : "Delivered, left at front door" },
    ],
  };
}

const SCENARIOS = {
  deliveredSigned: {
    name: "delivered with signature",
    build: (ctx) => ({
      // USD matches the UPS tracking already submitted to PayPal for PP-R-DUI-10190261.
      ...delivered(ctx, ctx.usd ? "UPS" : "Canada Post", ctx.usd ? "1Z999AA10123456784" : "7023210039414604", true),
      notes: "Signature on file from the carrier. Shipped to the address on the PayPal transaction.",
    }),
  },
  deliveredUnsigned: {
    name: "delivered, no signature",
    build: (ctx) => ({
      ...delivered(ctx, ctx.usd ? "USPS" : "Canada Post", ctx.usd ? "9400111899223197428490" : "7023210039414611", false),
      notes: "Carrier shows delivered to the PayPal address, but no signature was required.",
    }),
  },
  labelOnly: {
    name: "label created, never scanned",
    build: ({ usd, at }) => ({
      carrier: usd ? "USPS" : "Canada Post",
      tracking_number: usd ? "9400111899223197428506" : "7023210039414628",
      shipping_status: "LABEL_CREATED",
      shipped_at: null,
      delivered_at: null,
      signature_confirmed: false,
      ship_to_matches_paypal: true,
      ship_to_address: usd ? ADDRESS.usd : ADDRESS.cad,
      tracking_events: [{ at: at(1), location: usd ? "Columbus, OH" : "Mississauga, ON", description: "Shipping label created, awaiting item" }],
      notes: "Label was printed but the carrier never received the parcel.",
    }),
  },
  deliveredDamageClaim: {
    name: "delivered, buyer reports damage",
    build: (ctx) => ({
      ...delivered(ctx, "USPS", "9400111899223197428513", false),
      notes: "Packed in a single box with bubble wrap; no 'fragile' label and no shipping insurance. No photos taken before shipping.",
    }),
  },
  deliveredAsListed: {
    name: "delivered, matches the listing",
    build: (ctx) => ({
      ...delivered(ctx, "USPS", "9400111899223197428520", false),
      notes: "Item shipped matches the listing photos and description (wool knit sweater, size M, charcoal). Return policy on the listing: buyer pays return shipping for change-of-mind returns.",
    }),
  },
} satisfies Record<string, Scenario>;

/** Fixed scenario for the original sandbox disputes. */
const BY_DISPUTE: Record<string, Scenario> = {
  "PP-R-DUI-10190261": SCENARIOS.deliveredSigned, // $49.99 USD (Sandbox Seller 2)
  "PP-R-XOR-10190262": SCENARIOS.deliveredUnsigned, // $25 CAD (Sandbox Test Seller)
  "PP-R-NBP-10190260": SCENARIOS.labelOnly, // $10 CAD (Sandbox Test Seller)
};

/** The demo purchases (scripts/demo-orders.ts), matched by item name and dispute reason. */
function demoScenario(item: string | undefined): Scenario | null {
  switch (item) {
    case "Wireless headphones":
      return SCENARIOS.deliveredSigned; // fight
    case "Linen throw pillow":
      return SCENARIOS.labelOnly; // refund
    case "Ceramic table lamp":
      // Filed as "not as described": settle. Filed (by mistake) as "not received": the buyer's own
      // message says it arrived, so the same delivered-parcel evidence makes it a fight.
      return SCENARIOS.deliveredDamageClaim;
    case "Wool knit sweater":
      return SCENARIOS.deliveredAsListed; // fight
    default:
      return null;
  }
}

const ROTATION: Scenario[] = [SCENARIOS.deliveredSigned, SCENARIOS.deliveredUnsigned, SCENARIOS.labelOnly];

async function main() {
  const db = supabaseAdmin();
  const { data: disputes, error } = await db.from("disputes").select("id, seller_id, currency, paypal_created_at, raw").order("id");
  if (error) throw error;

  const { data: existing, error: existingError } = await db.from("orders").select("paypal_transaction_id, simulated");
  if (existingError) {
    if (existingError.code === "PGRST205") {
      console.error("The orders table doesn't exist yet. Run supabase/orders.sql in the Supabase SQL Editor first.");
      process.exit(1);
    }
    throw existingError;
  }
  const real = new Set(existing.filter((o) => !o.simulated).map((o) => o.paypal_transaction_id));

  let i = 0;
  for (const d of disputes) {
    const tx = (d.raw as PayPalDisputeDetail).disputed_transactions?.[0];
    const txId = tx?.seller_transaction_id;
    if (!txId) {
      console.log(`- ${d.id}: no seller transaction id, skipped`);
      continue;
    }
    if (real.has(txId)) {
      console.log(`- ${d.id}: has a real (non-simulated) order, left alone`);
      continue;
    }

    const item = tx.items?.[0];
    const scenario = BY_DISPUTE[d.id] ?? demoScenario(item?.item_name) ?? ROTATION[i++ % ROTATION.length];

    // Spread the timeline over TIMELINE_DAYS after payment, squeezed to end before the dispute was
    // opened (and never after now): sandbox disputes are often opened minutes after paying.
    const paidAt = tx.create_time ? new Date(tx.create_time).getTime() : Date.now() - TIMELINE_DAYS * DAY;
    const end = Math.min(Date.now(), d.paypal_created_at ? new Date(d.paypal_created_at).getTime() : Date.now());
    const span = Math.max(0, Math.min(TIMELINE_DAYS * DAY, end - paidAt));
    const at = (days: number) => new Date(paidAt + (days / TIMELINE_DAYS) * span).toISOString();

    const buyerName = tx.buyer?.name ?? "Sandbox Buyer";
    const { error: upsertError } = await db.from("orders").upsert(
      {
        seller_id: d.seller_id,
        paypal_transaction_id: txId,
        order_number: `ORD-${txId.slice(-6)}`,
        item_description: item?.item_description ?? item?.item_name ?? null,
        ship_to_name: buyerName,
        ...scenario.build({ usd: d.currency !== "CAD", at }),
        simulated: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paypal_transaction_id" },
    );
    if (upsertError) throw upsertError;
    console.log(`✓ ${d.id} (${item?.item_name ?? "?"}): ${scenario.name}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
