import { assessDispute } from "@/lib/assess";
import { isSample } from "@/lib/sample";
import { supabaseAdmin } from "@/lib/supabase";

// Runs the agent on disputes already in the database and saves each report to `decisions`.
// Usage:
//   npm run assess -- PP-R-IXN-10196061            one dispute
//   npm run assess -- --all                         every dispute that needs a new report
//   npm run assess -- PP-R-IXN-10196061 --force     re-run even if it was already assessed

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  let ids = args.filter((a) => !a.startsWith("--"));

  if (args.includes("--all")) {
    const { data, error } = await supabaseAdmin().from("disputes").select("id").order("id");
    if (error) throw error;
    ids = data.map((d) => d.id).filter((id) => !isSample(id)); // sample history keeps its seeded reports
  }
  if (ids.length === 0) {
    console.error("Give a dispute id, or --all. Example: npm run assess -- PP-R-IXN-10196061");
    process.exit(1);
  }

  for (const id of ids) {
    const outcome = await assessDispute(id, { force });
    console.log(
      outcome.status === "assessed"
        ? `✓ ${id}: ${outcome.recommendation} (decision ${outcome.decisionId})`
        : outcome.status === "auto_refunded"
          ? `✓ ${id}: auto-refunded by the seller's rule${outcome.sent ? " (sent to PayPal)" : " (demo mode: not sent)"}`
          : outcome.status === "easy_claim"
            ? `✓ ${id}: easy claim (${outcome.kind}), no model call${outcome.sent ? " (sent to PayPal)" : ""}`
            : `- ${id}: skipped, ${outcome.reason}`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
