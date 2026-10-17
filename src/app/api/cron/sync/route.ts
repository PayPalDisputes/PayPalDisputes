import { syncDisputes } from "@/lib/sync";

// Pulling every dispute and running the agent on changed ones can take a while.
export const maxDuration = 300;

/**
 * Scheduled backstop for PayPal webhooks (the sandbox never sends dispute events):
 * pulls the last 30 days of disputes and assesses any that changed.
 * Called by .github/workflows/sync-disputes.yml with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET is not configured", { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const started = Date.now();
  const result = await syncDisputes(30);
  console.log("[cron-sync]", result, `${Date.now() - started}ms`);
  return Response.json({ ok: result.failed.length === 0, ...result, ms: Date.now() - started });
}
