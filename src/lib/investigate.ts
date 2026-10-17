import { PayPalAgentToolkit } from "@paypal/agent-toolkit/openai";
import type { DisputeInput, InvestigationTools, ToolResult } from "@/lib/agent";
import { getOrder, type OrderEvidence } from "@/lib/dashboard";

// The agent's toolbox: PayPal's Agent Toolkit (read-only) plus our own store-order lookup.
// liveTools() calls PayPal and the database; fixtureTools() answers from an eval case's own data,
// so evals exercise the same investigation without touching PayPal.

/** Read-only PayPal tools. accept_dispute_claim (disputes.create) and anything that writes stays off. */
const READ_ONLY_ACTIONS = {
  disputes: { list: true, get: true },
  shipment: { get: true },
  orders: { get: true },
  transactions: { list: true },
  payments: { getRefunds: true },
};

/** Results are trimmed before going back to the model, to keep each step cheap. */
const MAX_RESULT_CHARS = 6000;

const STORE_ORDER_TOOL = {
  type: "function" as const,
  name: "get_store_order",
  description:
    "Look up the seller's own order and shipping record for a PayPal transaction: carrier, tracking number, " +
    "shipping status, ship and delivery dates, signature, ship-to address (and whether it matches the PayPal " +
    "address), carrier scans and the seller's notes. Pass the dispute's seller_transaction_id.",
  parameters: {
    type: "object",
    properties: { seller_transaction_id: { type: "string", description: "disputed_transactions[0].seller_transaction_id" } },
    required: ["seller_transaction_id"],
    additionalProperties: false,
  },
  strict: true,
};

let toolkit: PayPalAgentToolkit | null = null;
function paypalToolkit(): PayPalAgentToolkit {
  if (toolkit) return toolkit;
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API_BASE } = process.env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing");
  toolkit = new PayPalAgentToolkit({
    clientId: PAYPAL_CLIENT_ID,
    clientSecret: PAYPAL_CLIENT_SECRET,
    configuration: {
      actions: READ_ONLY_ACTIONS,
      context: { sandbox: (PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com").includes("sandbox") },
    },
  });
  return toolkit;
}

/** The toolkit's Chat Completions tool definitions, reshaped for the Responses API. */
function toolDefinitions() {
  const paypal = paypalToolkit()
    .getTools()
    .map((t) => {
      const f = (t as unknown as { function: { name: string; description?: string; parameters?: Record<string, unknown> } }).function;
      return { type: "function" as const, name: f.name, description: f.description ?? "", parameters: f.parameters ?? null, strict: false };
    });
  return [STORE_ORDER_TOOL, ...paypal];
}

const trim = (s: string) => (s.length > MAX_RESULT_CHARS ? `${s.slice(0, MAX_RESULT_CHARS)}…(truncated)` : s);

function storeOrderResult(order: OrderEvidence | null): ToolResult {
  if (!order) return { ok: false, output: JSON.stringify({ found: false }), summary: "No store order record for this transaction" };
  const parts = [
    order.carrier && order.trackingNumber ? `${order.carrier} ${order.trackingNumber}` : "no tracking",
    order.shippingStatus ? order.shippingStatus.toLowerCase().replaceAll("_", " ") : null,
    order.signatureConfirmed ? "signed for" : null,
    order.shipToMatchesPayPal === false ? "ship-to differs from PayPal address" : null,
  ].filter(Boolean);
  return { ok: true, output: trim(JSON.stringify(order)), summary: `Store order ${order.orderNumber ?? ""}: ${parts.join(", ")}`.trim() };
}

/** Short, seller-facing line describing a PayPal tool's result. */
function paypalSummary(name: string, args: Record<string, unknown>, ok: boolean, body: unknown): string {
  const b = body as { status?: string; transaction_details?: unknown[]; trackers?: unknown[]; tracking_number?: string } | null;
  switch (name) {
    case "get_dispute":
      return ok ? `Fetched dispute ${args.dispute_id ?? ""} from PayPal (${b?.status ?? "details"})` : "Couldn't fetch the dispute from PayPal";
    case "list_disputes":
      return ok ? "Listed the seller's disputes on PayPal" : "Couldn't list disputes on PayPal";
    case "get_shipment_tracking":
      return ok ? "Found shipment tracking uploaded to PayPal" : "No shipment tracking uploaded to PayPal for this transaction";
    case "list_transactions":
      return ok ? `Searched PayPal transactions (${b?.transaction_details?.length ?? 0} found)` : "PayPal transaction search unavailable";
    case "get_order":
      return ok ? "Fetched the PayPal order" : "PayPal order not found";
    case "get_refund":
      return ok ? `Verified refund ${args.refund_id ?? ""} on PayPal` : `Refund ${args.refund_id ?? ""} not found on PayPal`;
    default:
      return ok ? `Called ${name}` : `${name} failed`;
  }
}

/** Lists that came back with nothing in them. */
function isEmptyResult(name: string, body: unknown): boolean {
  const b = body as { trackers?: unknown[]; transaction_details?: unknown[]; items?: unknown[] } | null;
  if (name === "get_shipment_tracking") return (b?.trackers?.length ?? 0) === 0 && !(body as { tracking_number?: string } | null)?.tracking_number;
  if (name === "list_transactions") return (b?.transaction_details?.length ?? 0) === 0;
  if (name === "list_disputes") return (b?.items?.length ?? 0) === 0;
  return false;
}

/** Real lookups: PayPal through the Agent Toolkit, the store order through our database. */
export function liveTools(): InvestigationTools {
  return {
    definitions: toolDefinitions(),
    async run(name, args) {
      if (name === "get_store_order") return storeOrderResult(await getOrder(String(args.seller_transaction_id ?? "")));
      const res = await paypalToolkit().handleToolCall({ id: "call", type: "function", function: { name, arguments: JSON.stringify(args) } });
      const content = String(res.content ?? "");
      let body: unknown = null;
      try {
        body = JSON.parse(content);
      } catch {
        // not JSON; keep the text
      }
      const failed = !content || (body as { ok?: boolean; error?: unknown } | null)?.ok === false || !!(body as { error?: unknown } | null)?.error;
      // A successful call can still come back empty, e.g. {"trackers":[]} means no tracking was uploaded.
      const empty = isEmptyResult(name, body);
      return { ok: !failed && !empty, output: trim(content), summary: paypalSummary(name, args, !failed && !empty, body) };
    },
  };
}

/** Eval lookups: the same tools, answered from the test case so nothing reaches PayPal. */
export function fixtureTools(input: DisputeInput): InvestigationTools {
  const notAvailable = (name: string, args: Record<string, unknown>): ToolResult => ({
    ok: false,
    output: JSON.stringify({ ok: false, status: 404, message: "Not found" }),
    summary: paypalSummary(name, args, false, null),
  });
  return {
    definitions: toolDefinitions(),
    async run(name, args) {
      switch (name) {
        case "get_store_order":
          return storeOrderResult(input.order);
        case "get_dispute":
          return { ok: true, output: trim(JSON.stringify(input.dispute)), summary: paypalSummary(name, args, true, input.dispute) };
        default:
          return notAvailable(name, args);
      }
    },
  };
}
