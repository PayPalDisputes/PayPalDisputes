import { caseFacts, draftsFor, planFor } from "@/lib/agent";
import { easyClaimKind } from "@/lib/easy-claims";
import { CASES } from "../evals/cases";

// Tries Sira's settlement formula and easy-claim rules on the eval set, with no model calls.
// For claims the rules can't judge, the case's expected risk stands in for the model's.
// Usage: npm run experiment            (add --drafts to print the filled-in templates)

const showDrafts = process.argv.includes("--drafts");
let agree = 0;
let easy = 0;

for (const c of CASES) {
  const f = caseFacts(c.input);
  const plan = planFor(c.input, f, c.expected.risk);
  const kind = easyClaimKind(c.input);
  const ok = [c.expected.recommendation, ...(c.expected.alsoAcceptable ?? [])].includes(plan.recommendation);
  if (ok) agree++;
  if (kind) easy++;
  const amount = Number((c.input.dispute as { dispute_amount?: { value: string } }).dispute_amount?.value ?? 0);
  console.log(
    `${ok ? "✓" : "✗"} ${c.id.padEnd(44)} ${String(amount).padStart(6)}  ` +
      `p=${plan.odds.p.toFixed(2)}  ${plan.recommendation.padEnd(6)}${plan.offer ? ` ${plan.offer}` : ""}` +
      `  (expected ${c.expected.recommendation})${kind ? `  easy: ${kind}` : ""}`,
  );
  if (showDrafts) {
    for (const d of draftsFor(c.input, f, plan)) console.log(`\n    [${d.template} → ${d.recipient}]\n    ${d.text.replaceAll("\n", "\n    ")}\n`);
  }
}

console.log(`\nFormula agrees with the expected answer on ${agree}/${CASES.length}; ${easy} are easy claims (no model call).`);
