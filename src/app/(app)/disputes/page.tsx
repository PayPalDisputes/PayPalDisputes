import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DisputesGrid } from "@/components/app/DisputesGrid";
import { canAccessDispute, requireSession, sellerScope, sessionMode } from "@/lib/auth";
import { getDisputeDetail, getHomeDataCached, type HomeDispute } from "@/lib/dashboard";
import { DisputePanel } from "./panel";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Disputes · Sira" };

const VIEWS = {
  all: { label: "All", match: () => true },
  approval: {
    label: "Waiting for approval",
    match: (d: HomeDispute) => d.status !== "RESOLVED" && d.report?.status === "pending_review" && d.report.current,
  },
  "needs-response": { label: "Needs response", match: (d: HomeDispute) => d.status === "WAITING_FOR_SELLER_RESPONSE" },
  "due-this-week": {
    label: "Due this week",
    match: (d: HomeDispute) => d.status === "WAITING_FOR_SELLER_RESPONSE" && d.daysLeft !== null && d.daysLeft <= 7,
  },
  "high-value": { label: "High value (200+)", match: (d: HomeDispute) => d.status !== "RESOLVED" && (d.amount ?? 0) > 200 },
  chargebacks: { label: "Chargebacks", match: (d: HomeDispute) => d.stage === "CHARGEBACK" || d.stage === "ARBITRATION" },
  resolved: { label: "Resolved", match: (d: HomeDispute) => d.status === "RESOLVED" },
} as const;
type View = keyof typeof VIEWS;

/** Soonest seller deadline first; disputes without one go last. */
const byDeadline = (a: HomeDispute, b: HomeDispute) =>
  (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity);

export default async function DisputesPage({ searchParams }: PageProps<"/disputes">) {
  await connection(); // always read fresh rows from Supabase, never a build-time snapshot
  const { view: rawView, open } = await searchParams;
  const view: View = typeof rawView === "string" && rawView in VIEWS ? (rawView as View) : "all";
  const listHref = view === "all" ? "/disputes" : `/disputes?view=${view}`;
  const session = await requireSession();
  const canOpen = typeof open === "string" && (await canAccessDispute(open));
  const [{ disputes }, opened] = await Promise.all([
    getHomeDataCached(sellerScope(session)),
    canOpen ? getDisputeDetail(open) : Promise.resolve(null),
  ]);
  const rows = disputes.filter(VIEWS[view].match).sort(byDeadline);

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-20 md:px-10 md:pt-10">
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-fg">Disputes</h1>
        <p className="mt-1 text-[13.5px] text-fg-body">
          Every response waits for your approval before it reaches PayPal.
        </p>
      </header>

      <nav aria-label="Filter disputes" className="mt-6 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {(Object.keys(VIEWS) as View[]).map((key) => {
          const count = disputes.filter(VIEWS[key].match).length;
          const active = key === view;
          return (
            <Link
              key={key}
              href={key === "all" ? "/disputes" : `/disputes?view=${key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-11 shrink-0 items-center gap-2 px-3 text-[14px] transition-colors",
                active ? "font-medium text-fg" : "text-fg-body hover:text-fg",
              )}
            >
              {VIEWS[key].label}
              <span className={cn("rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums", active ? "bg-fg text-white" : "bg-muted text-fg-body")}>
                {count}
              </span>
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-fg" />}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line-strong p-10 text-center text-[14px] text-fg-body">
          {disputes.length === 0 ? (
            <>
              No disputes yet. Run <code className="font-mono">npm run sync</code> to pull them from PayPal.
            </>
          ) : (
            "Nothing here right now."
          )}
        </p>
      ) : (
        <div className="mt-6">
          <DisputesGrid rows={rows} listHref={listHref} csvName={`sira-disputes-${view}`} />
        </div>
      )}

      {opened && <DisputePanel dispute={opened} disputes={disputes} listHref={listHref} mode={sessionMode(session)} />}
    </div>
  );
}
