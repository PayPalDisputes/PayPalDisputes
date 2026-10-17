import { syncTrackingToPayPal } from "@/lib/tracking";

// Uploads tracking to PayPal for every shipped order that doesn't have it there yet.
// Only sends in PAYPAL_ACTIONS_MODE=live (demo mode reports what it would skip and sends nothing).
// Usage: npm run tracking:push
syncTrackingToPayPal()
  .then((r) => {
    if (r.mode === "demo") console.log("Demo mode: nothing sent. Set PAYPAL_ACTIONS_MODE=live to upload tracking.");
    for (const tx of r.uploaded) console.log(`✓ ${tx}: tracking uploaded to PayPal`);
    for (const f of r.failed) console.log(`✗ ${f.order}: ${f.error}`);
    console.log(`${r.uploaded.length} uploaded, ${r.failed.length} failed, ${r.skipped} skipped (not shipped or already up to date)`);
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
