import { getAccessToken } from "@/lib/paypal";

// Creates sandbox purchases to open demo disputes on. Sandbox only.
// Usage:
//   npm run demo:orders -- create [name]           create the demo orders (or just those whose name contains [name])
//   npm run demo:orders -- capture <id> [<id>...]  complete the payments once the buyer has approved them

const API_BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";
if (!API_BASE.includes("sandbox")) {
  console.error("Refusing to run: PAYPAL_API_BASE is not the sandbox.");
  process.exit(1);
}

/** One purchase per demo story; the dispute reason and message are opened by hand afterwards. */
export const DEMO_ITEMS = [
  { name: "Wireless headphones", amount: "89.00" },
  { name: "Linen throw pillow", amount: "34.00" },
  { name: "Ceramic table lamp", amount: "120.00" },
  { name: "Wool knit sweater", amount: "58.00" },
];

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await getAccessToken()}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function create(filter?: string) {
  const items = DEMO_ITEMS.filter((i) => !filter || i.name.toLowerCase().includes(filter.toLowerCase()));
  if (items.length === 0) throw new Error(`No demo item matches "${filter}"`);
  const ids: string[] = [];
  for (const item of items) {
    const money = { currency_code: "USD", value: item.amount };
    const order = await call("POST", "/v2/checkout/orders", {
      intent: "CAPTURE",
      purchase_units: [
        {
          description: item.name,
          amount: { ...money, breakdown: { item_total: money } },
          items: [{ name: item.name, quantity: "1", unit_amount: money, category: "PHYSICAL_GOODS" }],
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Demo Store",
            shipping_preference: "GET_FROM_FILE", // ship to the buyer's sandbox address
            user_action: "PAY_NOW",
            return_url: "https://example.com/paid",
            cancel_url: "https://example.com/cancelled",
          },
        },
      },
    });
    const link = order.links.find((l: { rel: string }) => l.rel === "payer-action" || l.rel === "approve")?.href;
    ids.push(order.id);
    console.log(`\n${item.name} ($${item.amount})  order ${order.id}\n  Pay here: ${link}`);
  }
  console.log(`\nAfter paying all of them, run:\n  npm run demo:orders -- capture ${ids.join(" ")}`);
}

async function capture(ids: string[]) {
  for (const id of ids) {
    try {
      const order = await call("POST", `/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {});
      const cap = order.purchase_units?.[0]?.payments?.captures?.[0];
      console.log(`✓ ${id}: ${cap?.status ?? order.status} (capture ${cap?.id ?? "?"})`);
    } catch (err) {
      console.log(`✗ ${id}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

async function main() {
  const [command, ...ids] = process.argv.slice(2);
  if (command === "create") return create(ids[0]);
  if (command === "capture" && ids.length > 0) return capture(ids);
  console.error("Usage: npm run demo:orders -- create | capture <order-id> [<order-id>...]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
