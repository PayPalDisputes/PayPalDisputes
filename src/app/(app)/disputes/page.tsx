import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Amount } from "@/components/app/bits";
import { DisputesGrid } from "@/components/app/DisputesGrid";
import { Button } from "@/components/ui/Button";
import { canAccessDispute, requireSession, sellerScope, sessionMode } from "@/lib/auth";
import { getDisputeDetail, getHomeDataCached, type HomeDispute } from "@/lib/dashboard";
import { Suspense } from "react";
import { SidePanelSkeleton } from "@/components/app/SidePanel";
import { DisputePanel } from "./panel";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Disputes · Sira" };

const draftReady = (d: HomeDispute) => d.status !== "RESOLVED" && d.report?.status === "pending_review" && d.report.current;

/** Tabs, most urgent first. "Needs your response" covers both disputes waiting on the seller and drafts to approve. */
const VIEWS = {
  "needs-response": {
    label: "Needs your response",
    match: (d: HomeDispute) => d.status === "WAITING_FOR_SELLER_RESPONSE" || Boolean(draftReady(d)),
  },
  all: { label: "All", match: () => true },
  "due-this-week": {
    label: "Due this week",
    match: (d: HomeDispute) => d.status === "WAITING_FOR_SELLER_RESPONSE" && d.daysLeft !== null && d.daysLeft <= 7,
  },
  "high-value": { label: "Over $200", match: (d: HomeDispute) => d.status !== "RESOLVED" && (d.amount ?? 0) > 200 },
  chargebacks: { label: "Chargebacks", match: (d: HomeDispute) => d.stage === "CHARGEBACK" || d.stage === "ARBITRATION" },
  resolved: { label: "Resolved", match: (d: HomeDispute) => d.status === "RESOLVED" },
} as const;
type View = keyof typeof VIEWS;

/** Most urgent first: soonest seller deadline, then other open disputes, then resolved ones. */
const urgency = (d: HomeDispute) => (d.status === "RESOLVED" ? 2 : d.dueAt ? 0 : 1);
const byUrgency = (a: HomeDispute, b: HomeDispute) =>
  urgency(a) - urgency(b) || (a.dueAt ? new Date(a.dueAt).getTime() : 0) - (b.dueAt ? new Date(b.dueAt).getTime() : 0);

export default async function DisputesPage({ searchParams }: PageProps<"/disputes">) {
  await connection(); // always read fresh rows from Supabase, never a build-time snapshot
  const { view: rawView, open, q } = await searchParams;
  const session = await requireSession();
  const { disputes } = await getHomeDataCached(sellerScope(session));
  // Old links used ?view=approval for drafts; they now land on the merged tab.
  const requested = rawView === "approval" ? "needs-response" : rawView;
  const needsYou = disputes.filter(VIEWS["needs-response"].match).length;
  const view: View =
    typeof requested === "string" && requested in VIEWS ? (requested as View) : needsYou > 0 ? "needs-response" : "all";
  const listHref = `/disputes?view=${view}`;
  const rows = disputes.filter(VIEWS[view].match).sort(byUrgency);

  const open_ = disputes.filter((d) => d.status !== "RESOLVED");
  const drafts = disputes.filter(draftReady).length;
  const atRisk = new Map<string, number>();
  for (const d of open_) atRisk.set(d.currency ?? "USD", (atRisk.get(d.currency ?? "USD") ?? 0) + (d.amount ?? 0));
  const [riskCurrency, riskTotal] = [...atRisk.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["USD", 0];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-5 pt-8 pb-20 md:px-10 md:pt-9">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[24px] font-[480] tracking-[0.01em] text-fg">Disputes</h1>
          <p className="text-[14px] text-fg-muted">
            {open_.length} open · <Amount amount={riskTotal} currency={riskCurrency} /> at risk · {needsYou} need your response
          </p>
        </div>
        {drafts > 0 && (
          <Button href="/review" prefetch={false} className="h-[38px] px-4">
            Review {drafts} draft{drafts === 1 ? "" : "s"}
          </Button>
        )}
      </header>

      <nav aria-label="Filter disputes" className="flex gap-[22px] overflow-x-auto border-b border-line [scrollbar-width:none]">
        {(Object.keys(VIEWS) as View[]).map((key) => {
          const count = disputes.filter(VIEWS[key].match).length;
          const active = key === view;
          if (count === 0 && !active && key !== "all" && key !== "needs-response") return null;
          return (
            <Link
              key={key}
              href={`/disputes?view=${key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-[14px] whitespace-nowrap transition-colors",
                active ? "border-fg text-fg" : "border-transparent text-fg-body hover:text-fg",
              )}
            >
              {VIEWS[key].label}
              <span className="text-fg-muted tabular-nums">{count}</span>
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-10 text-center text-[14px] text-fg-body">
          {disputes.length === 0 ? (
            <>
              No disputes yet. Run <code className="font-mono">npm run sync</code> to pull them from PayPal.
            </>
          ) : (
            "Nothing here right now."
          )}
        </p>
      ) : (
        <DisputesGrid rows={rows} listHref={listHref} csvName={`sira-disputes-${view}`} initialQuery={typeof q === "string" ? q : ""} />
      )}

      {/* The panel opens at once with a skeleton; the dispute streams in behind it */}
      {typeof open === "string" && (
        <Suspense key={open} fallback={<SidePanelSkeleton closeHref={listHref} fullHref={`/disputes/${encodeURIComponent(open)}`} />}>
          <OpenDispute id={open} listHref={listHref} mode={sessionMode(session)} />
        </Suspense>
      )}
    </div>
  );
}

/** Loads one dispute for the side panel (only if this session may see it). */
async function OpenDispute({ id, listHref, mode }: { id: string; listHref: string; mode: ReturnType<typeof sessionMode> }) {
  const dispute = (await canAccessDispute(id)) ? await getDisputeDetail(id) : null;
  return dispute ? <DisputePanel dispute={dispute} listHref={listHref} mode={mode} /> : null;
}
