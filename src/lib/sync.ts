import { getDispute, listDisputeIds } from "@/lib/paypal";
import { assessDispute } from "@/lib/assess";
import { upsertDispute, type PayPalDispute } from "@/lib/disputes";
import { syncTrackingToPayPal, type TrackingSyncResult } from "@/lib/tracking";

/**
 * Pulls every recent dispute from PayPal and upserts it, uploads any shipped orders' tracking to
 * PayPal, then runs the agent on disputes that need a (new) report, in that order so the agent
 * finds the fresh tracking when it checks PayPal. Backstop for webhooks, which the sandbox in
 * particular delivers late or not at all. Assessing is cheap to repeat: unchanged disputes are skipped.
 */
export async function syncDisputes(days = 30, { assess = true } = {}) {
  const ids = await listDisputeIds(days);
  const failed: string[] = [];
  const assessed: string[] = [];

  for (const id of ids) {
    try {
      await upsertDispute(await getDispute<PayPalDispute>(id));
    } catch (err) {
      console.error(`[sync] failed to sync dispute ${id}`, err);
      failed.push(id);
    }
  }

  let tracking: TrackingSyncResult | { error: string };
  try {
    tracking = await syncTrackingToPayPal();
  } catch (err) {
    // Tracking upload is best-effort; it shouldn't stop disputes from being assessed.
    console.error("[sync] failed to upload tracking", err);
    tracking = { error: err instanceof Error ? err.message : String(err) };
  }

  if (assess) {
    for (const id of ids.filter((i) => !failed.includes(i))) {
      try {
        const outcome = await assessDispute(id);
        if (outcome.status === "assessed") assessed.push(id);
      } catch (err) {
        // A failed assessment shouldn't fail the sync; the next sync retries it.
        console.error(`[sync] failed to assess dispute ${id}`, err);
      }
    }
  }
  return { synced: ids.length - failed.length, failed, assessed, tracking };
}
