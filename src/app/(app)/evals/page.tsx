import type { Metadata } from "next";
import { connection } from "next/server";
import { EvalLatencyChart, EvalPassChart } from "@/components/app/Charts";
import { EvalGrid } from "@/components/app/EvalGrid";
import { getEvalData } from "@/lib/evals";

export const metadata: Metadata = { title: "Evals · Sira" };

/** Internal: how each prompt version scored on the saved eval cases (`npm run eval`). */
export default async function EvalsPage() {
  await connection();
  const { versions, latest } = await getEvalData();
  const newest = versions.at(-1);
  const previous = versions.at(-2);

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-20 md:px-10 md:pt-10">
      <header>
        <p className="text-[11px] font-medium tracking-[0.04em] text-fg-muted uppercase">Internal</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.01em] text-fg">Agent evals</h1>
        <p className="mt-1 max-w-[640px] text-[13.5px] text-fg-body">
          How each prompt version scored on disputes with known right answers. Run <code className="font-mono">npm run eval</code> to add a run.
        </p>
      </header>

      {!newest ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line-strong p-10 text-center text-[14px] text-fg-body">
          No eval runs yet. Run <code className="font-mono">npm run eval</code>.
        </p>
      ) : (
        <>
          <section aria-label="Latest run" className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Latest run" value={newest.version} hint={newest.model} />
            <Stat
              label="Pass rate"
              value={`${newest.passPct.toFixed(1)}%`}
              hint={previous ? `${newest.passPct >= previous.passPct ? "+" : ""}${(newest.passPct - previous.passPct).toFixed(1)} pts vs ${previous.version}` : undefined}
            />
            <Stat label="Avg time per decision" value={`${newest.avgSeconds.toFixed(1)}s`} />
            <Stat label="Cases" value={String(newest.cases)} hint={new Date(newest.runAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
          </section>

          <section aria-label="Trends" className="mt-6 grid gap-3 lg:grid-cols-2">
            <EvalPassChart versions={versions} />
            <EvalLatencyChart versions={versions} />
          </section>

          <section aria-labelledby="cases" className="mt-12">
            <h2 id="cases" className="mb-4 t-section">
              Latest run, case by case
            </h2>
            <EvalGrid rows={latest} runLabel={`Prompt ${newest.version} · ${latest.length} cases`} />
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas p-5">
      <p className="text-[13px] font-medium text-fg-heading">{label}</p>
      <p className="mt-3 t-figure text-[36px] leading-none text-fg tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-[12px] text-fg-muted">{hint}</p>}
    </div>
  );
}
