import { randomUUID } from "node:crypto";
import { analyzeDispute, PROMPT_VERSION, type Assessment, type DisputeInput } from "@/lib/agent";
import { fixtureTools } from "@/lib/investigate";
import { MODELS } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase";

// Runs the agent on every active case in eval_cases, scores it against the expected answers,
// prints a report and saves each result to eval_results.
// Usage:
//   npm run eval                                  all active cases, smart model
//   npm run eval -- --case inr-in-transit         one case (comma-separate for several)
//   npm run eval -- --model gpt-5.4-nano          try another model
//   npm run eval -- --no-save                     don't write to eval_results

type CaseRow = {
  id: string;
  input: DisputeInput;
  expected_recommendation: string;
  acceptable_recommendations: string[];
  expected_urgency: string;
  expected_risk: string;
};

type Result = {
  c: CaseRow;
  assessment: Assessment | null;
  recommendationOk: boolean;
  urgencyOk: boolean;
  riskOk: boolean;
  passed: boolean;
  draftProblems: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  error: string | null;
};

const CONCURRENCY = 4;

/** The PayPal action a draft must include to carry out each recommendation. */
const REQUIRED_ACTIONS: Record<Assessment["recommendation"], string[]> = {
  fight: ["provide_evidence", "send_message"],
  settle: ["make_offer"],
  refund: ["accept_claim"],
};

/** Problems with the drafts: actions PayPal doesn't allow here, or none that carries out the recommendation. */
function draftProblems(c: CaseRow, a: Assessment): string[] {
  const links = (c.input.dispute as { links?: { rel: string; method: string }[] }).links ?? [];
  const allowed = new Set(links.filter((l) => l.method === "POST").map((l) => l.rel));
  const problems = a.drafts.filter((d) => !allowed.has(d.action)).map((d) => `${d.action} isn't allowed on this dispute`);
  for (const d of a.drafts) {
    if (/\b(fraud\w*|scam\w*)\b/i.test(d.text)) problems.push(`${d.action} draft calls the buyer a fraud/scam`);
    if (d.recipient === "buyer" && /other disputes?|previous disputes?|dispute history/i.test(d.text)) {
      problems.push(`${d.action} draft (read by the buyer) mentions their dispute history`);
    }
  }
  if (!a.drafts.some((d) => REQUIRED_ACTIONS[a.recommendation].includes(d.action))) {
    problems.push(`no ${REQUIRED_ACTIONS[a.recommendation].join(" or ")} draft for "${a.recommendation}"`);
  }
  return problems;
}

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function runCase(c: CaseRow, model: string): Promise<Result> {
  const started = Date.now();
  try {
    const { assessment, inputTokens, outputTokens } = await analyzeDispute(c.input, { model, tools: fixtureTools(c.input) });
    const recommendationOk = [c.expected_recommendation, ...c.acceptable_recommendations].includes(assessment.recommendation);
    const urgencyOk = assessment.urgency === c.expected_urgency;
    const riskOk = assessment.risk === c.expected_risk;
    return {
      c, assessment, recommendationOk, urgencyOk, riskOk,
      passed: recommendationOk && urgencyOk && riskOk,
      draftProblems: draftProblems(c, assessment),
      inputTokens, outputTokens, latencyMs: Date.now() - started, error: null,
    };
  } catch (err) {
    return {
      c, assessment: null, recommendationOk: false, urgencyOk: false, riskOk: false, passed: false, draftProblems: [],
      inputTokens: null, outputTokens: null, latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Runs `fn` over `items`, at most `limit` at a time, keeping the original order. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const mark = (ok: boolean) => (ok ? "✓" : "✗");
const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((100 * n) / d)}%`);

function printReport(results: Result[], model: string) {
  const width = Math.max(...results.map((r) => r.c.id.length));
  console.log(`\nModel ${model} · prompt ${PROMPT_VERSION} · ${results.length} cases\n`);
  for (const r of results) {
    const id = r.c.id.padEnd(width);
    if (!r.assessment) {
      console.log(`✗ ${id}  ERROR: ${r.error}`);
      continue;
    }
    const a = r.assessment;
    const cell = (ok: boolean, got: string, want: string) => `${mark(ok)} ${got}${ok ? "" : ` (want ${want})`}`;
    console.log(
      `${mark(r.passed)} ${id}  ` +
        [
          cell(r.recommendationOk, a.recommendation, r.c.expected_recommendation),
          `urgency ${cell(r.urgencyOk, a.urgency, r.c.expected_urgency)}`,
          `risk ${cell(r.riskOk, a.risk, r.c.expected_risk)}`,
          `conf ${a.confidence.toFixed(2)}`,
          `drafts ${a.drafts.map((d) => `${d.action}→${d.recipient}`).join(", ")}`,
          `looked up ${(a.investigation ?? []).map((t) => t.tool).join(", ") || "nothing"}`,
        ].join("   "),
    );
    for (const p of r.draftProblems) console.log(`    ! draft: ${p}`);
  }

  const n = results.length;
  const count = (f: (r: Result) => boolean) => results.filter(f).length;
  const avgConf = (rs: Result[]) =>
    rs.length === 0 ? "—" : (rs.reduce((s, r) => s + (r.assessment?.confidence ?? 0), 0) / rs.length).toFixed(2);
  const answered = results.filter((r) => r.assessment);
  const tokensIn = results.reduce((s, r) => s + (r.inputTokens ?? 0), 0);
  const tokensOut = results.reduce((s, r) => s + (r.outputTokens ?? 0), 0);

  console.log(`
Passed (all 3 right)  ${count((r) => r.passed)}/${n}  ${pct(count((r) => r.passed), n)}
Recommendation        ${pct(count((r) => r.recommendationOk), n)}
Urgency               ${pct(count((r) => r.urgencyOk), n)}
Risk                  ${pct(count((r) => r.riskOk), n)}
Drafts ok             ${pct(count((r) => !!r.assessment && r.draftProblems.length === 0), n)}
Checked store order   ${pct(count((r) => !!r.assessment?.investigation?.some((t) => t.tool === "get_store_order")), n)}
Avg confidence        ${avgConf(answered.filter((r) => r.recommendationOk))} when right · ${avgConf(answered.filter((r) => !r.recommendationOk))} when wrong
Errors                ${count((r) => r.error !== null)}
Tokens                ${tokensIn} in · ${tokensOut} out`);
}

async function main() {
  const model = arg("model") ?? MODELS.smart;
  const only = arg("case")?.split(",");
  const save = !process.argv.includes("--no-save");
  const db = supabaseAdmin();

  let query = db
    .from("eval_cases")
    .select("id, input, expected_recommendation, acceptable_recommendations, expected_urgency, expected_risk")
    .eq("active", true)
    .order("id");
  if (only) query = query.in("id", only);
  const { data: cases, error } = await query;
  if (error) {
    if (error.code === "PGRST205") {
      console.error("The eval tables don't exist yet. Run supabase/evals.sql in the Supabase SQL Editor first.");
      process.exit(1);
    }
    throw error;
  }
  if (cases.length === 0) {
    console.error(only ? `No active cases match: ${only.join(", ")}` : "No active cases. Run `npm run eval:seed` first.");
    process.exit(1);
  }

  console.log(`Running ${cases.length} cases on ${model}...`);
  const results = await pool(cases as CaseRow[], CONCURRENCY, (c) => runCase(c, model));
  printReport(results, model);

  if (save) {
    const runId = randomUUID();
    const { error: saveError } = await db.from("eval_results").insert(
      results.map((r) => ({
        run_id: runId,
        case_id: r.c.id,
        model,
        prompt_version: PROMPT_VERSION,
        output: r.assessment,
        recommendation_ok: r.assessment ? r.recommendationOk : null,
        urgency_ok: r.assessment ? r.urgencyOk : null,
        risk_ok: r.assessment ? r.riskOk : null,
        passed: r.passed,
        confidence: r.assessment?.confidence ?? null,
        input_tokens: r.inputTokens,
        output_tokens: r.outputTokens,
        latency_ms: r.latencyMs,
        error: r.error,
      })),
    );
    if (saveError) throw saveError;
    console.log(`\nSaved to eval_results (run_id ${runId})`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
