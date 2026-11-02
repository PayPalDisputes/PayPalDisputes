import { after } from "next/server";
import { assessDispute } from "@/lib/assess";
import { getDispute, verifyWebhookSignature } from "@/lib/paypal";
import { supabaseAdmin } from "@/lib/supabase";
import { upsertDispute, type PayPalDispute } from "@/lib/disputes";

// Leaves room for the agent, which runs after the response (see `after` below).
export const maxDuration = 60;

type PayPalWebhookEvent = {
  id: string;
  event_type: string;
  create_time: string;
  resource?: Partial<PayPalDispute>;
};

// Quick check that the endpoint is reachable: open the URL in a browser.
export async function GET() {
  return Response.json({ ok: true, route: "paypal webhook receiver" });
}

export async function POST(request: Request) {
  const raw = await request.text();

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Every event must carry a valid PayPal signature. The only exception is local development
  // without PAYPAL_WEBHOOK_ID, so Webhooks Simulator events (which PayPal can't verify) get through
  // during setup. In production a missing id fails closed: nothing unverified is ever processed.
  let verified = false;
  if (process.env.PAYPAL_WEBHOOK_ID) {
    try {
      verified = await verifyWebhookSignature(request.headers, event);
    } catch (err) {
      console.error("[paypal-webhook] could not reach PayPal to verify the signature", err);
      return new Response("Verification unavailable", { status: 503 }); // PayPal retries later
    }
    if (!verified) {
      console.warn(`[paypal-webhook] rejected unverified event ${event.id}`);
      return new Response("Signature verification failed", { status: 400 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("[paypal-webhook] PAYPAL_WEBHOOK_ID is not set; refusing unverified event");
    return new Response("Webhook verification is not configured", { status: 503 });
  }

  const r = event.resource ?? {};
  console.log(
    `[paypal-webhook] ${event.event_type} | dispute=${r.dispute_id ?? "-"} | ` +
      `reason=${r.reason ?? "-"} | status=${r.status ?? "-"} | ` +
      `amount=${r.dispute_amount ? `${r.dispute_amount.value} ${r.dispute_amount.currency_code}` : "-"} | ` +
      `verified=${verified}`,
  );

  const db = supabaseAdmin();

  // PayPal retries deliveries, so the event id primary key makes this idempotent.
  const { data: inserted, error: insertError } = await db
    .from("dispute_events")
    .upsert(
      {
        id: event.id,
        event_type: event.event_type,
        dispute_id: r.dispute_id ?? null,
        verified,
        payload: event,
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");
  if (insertError) {
    console.error("[paypal-webhook] failed to store event", insertError);
    // Non-2xx makes PayPal retry later.
    return new Response("Storage error", { status: 500 });
  }
  if (!inserted?.length) {
    console.log(`[paypal-webhook] duplicate event ${event.id}, skipping`);
    return Response.json({ received: true, duplicate: true });
  }

  if (event.event_type.startsWith("CUSTOMER.DISPUTE.") && r.dispute_id) {
    try {
      await upsertDispute(r as PayPalDispute);
      await db
        .from("dispute_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", event.id);

      // Answer PayPal now; run the agent once the response has been sent. The event's resource
      // may not be the full dispute, so fetch it fresh first so the agent sees everything.
      const disputeId = r.dispute_id;
      after(async () => {
        try {
          await upsertDispute(await getDispute<PayPalDispute>(disputeId));
          const outcome = await assessDispute(disputeId);
          console.log(`[paypal-webhook] assess ${disputeId}:`, outcome);
        } catch (err) {
          console.error(`[paypal-webhook] failed to assess dispute ${disputeId}`, err);
        }
      });
    } catch (err) {
      // The raw event is already stored, so it can be reprocessed later.
      console.error(`[paypal-webhook] failed to sync dispute ${r.dispute_id}`, err);
    }
  }

  return Response.json({ received: true });
}
