import { supabaseAdmin } from "@/lib/supabase";

/** One case's result in an eval run, joined with what the right answer was. */
export type EvalRow = {
  caseId: string;
  title: string;
  expected: string;
  acceptable: string[];
  got: string | null;
  recommendationOk: boolean | null;
  urgencyOk: boolean | null;
  riskOk: boolean | null;
  passed: boolean;
  confidence: number | null;
  latencyMs: number | null;
  tokens: number | null;
  error: string | null;
};

export type EvalVersion = {
  /** Prompt version, plus the model when that version was run with more than one (e.g. "v6 luna"). */
  version: string;
  promptVersion: string;
  model: string;
  runId: string;
  runAt: string;
  cases: number;
  passPct: number;
  avgSeconds: number;
};

/** The most recent run of every prompt version × model (oldest first), plus the newest run's case-by-case results. */
export async function getEvalData(): Promise<{ versions: EvalVersion[]; latest: EvalRow[] }> {
  const db = supabaseAdmin();
  const [results, cases] = await Promise.all([
    db
      .from("eval_results")
      .select("run_id, case_id, model, prompt_version, output, recommendation_ok, urgency_ok, risk_ok, passed, confidence, input_tokens, output_tokens, latency_ms, error, created_at")
      .order("created_at", { ascending: true }),
    db.from("eval_cases").select("id, title, expected_recommendation, acceptable_recommendations"),
  ]);
  if (results.error) throw results.error;
  if (cases.error) throw cases.error;

  // Group rows into runs, then keep the newest run per prompt version × model.
  const runs = new Map<string, typeof results.data>();
  for (const r of results.data) runs.set(r.run_id, [...(runs.get(r.run_id) ?? []), r]);
  const newestRun = new Map<string, string>();
  for (const [runId, rows] of runs) newestRun.set(`${rows[0].prompt_version}|${rows[0].model}`, runId); // runs arrive oldest first
  const modelsPerVersion = new Map<string, Set<string>>();
  for (const key of newestRun.keys()) {
    const [version, model] = key.split("|");
    modelsPerVersion.set(version, (modelsPerVersion.get(version) ?? new Set()).add(model));
  }

  const versions: EvalVersion[] = [...newestRun.values()].map((runId) => {
    const rows = runs.get(runId)!;
    const timed = rows.filter((r) => r.latency_ms != null);
    const { prompt_version: version, model } = rows[0];
    return {
      version: modelsPerVersion.get(version)!.size > 1 ? `${version} ${model.split("-").pop()}` : version,
      promptVersion: version,
      model,
      runId,
      runAt: rows[0].created_at,
      cases: rows.length,
      passPct: (100 * rows.filter((r) => r.passed).length) / rows.length,
      avgSeconds: timed.length ? timed.reduce((s, r) => s + r.latency_ms!, 0) / timed.length / 1000 : 0,
    };
  });
  versions.sort((a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime());

  const caseById = new Map(cases.data.map((c) => [c.id, c]));
  const newest = versions.at(-1);
  const latest: EvalRow[] = (newest ? runs.get(newest.runId)! : []).map((r) => {
    const c = caseById.get(r.case_id);
    return {
      caseId: r.case_id,
      title: c?.title ?? r.case_id,
      expected: c?.expected_recommendation ?? "—",
      acceptable: (c?.acceptable_recommendations as string[] | null) ?? [],
      got: ((r.output as { recommendation?: string } | null)?.recommendation as string | undefined) ?? null,
      recommendationOk: r.recommendation_ok,
      urgencyOk: r.urgency_ok,
      riskOk: r.risk_ok,
      passed: r.passed,
      confidence: r.confidence,
      latencyMs: r.latency_ms,
      tokens: r.input_tokens != null && r.output_tokens != null ? r.input_tokens + r.output_tokens : null,
      error: r.error,
    };
  });

  return { versions, latest };
}
