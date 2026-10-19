import type { Metadata } from "next";
import { connection } from "next/server";
import { EvidenceGrid } from "@/components/app/EvidenceGrid";
import { requireSession, sellerScope } from "@/lib/auth";
import { getEvidenceRows } from "@/lib/evidence";

export const metadata: Metadata = { title: "Evidence · Sira" };

const NEEDS_TRACKING = new Set(["MERCHANDISE_OR_SERVICE_NOT_RECEIVED", "UNAUTHORISED"]);

/** Seller's proof for every open dispute: tracking, delivery, signature. Edit in place or import a CSV. */
export default async function EvidencePage() {
  await connection();
  const session = await requireSession();
  const rows = await getEvidenceRows(sellerScope(session));
  const demo = session.kind === "demo";
  const missingTracking = rows.filter((r) => NEEDS_TRACKING.has(r.reason ?? "") && !r.trackingNumber).length;
  const demoRows = rows.filter((r) => r.simulated).length;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 pt-8 pb-20 md:px-10 md:pt-10">
      <header className="max-w-[720px]">
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-fg">Evidence</h1>
        <p className="mt-1 text-[13.5px] leading-5 text-fg-body">
          The proof behind each open dispute. Tracking and delivery details are what win &ldquo;item not received&rdquo; claims, so add them here and
          ask the agent to re-check.
        </p>
      </header>

      {demo && (
        <p className="mt-5 rounded-xl border border-line bg-subtle px-4 py-3 text-[13px] text-fg-body">
          You&apos;re in the demo account: try editing and importing, but nothing is saved. Sign in with PayPal to manage your own evidence.
        </p>
      )}

      {(missingTracking > 0 || demoRows > 0) && (
        <div className="mt-5 flex flex-wrap gap-2 text-[12.5px]">
          {missingTracking > 0 && (
            <span className="rounded-full bg-warn-bg px-3 py-1 text-warn">
              {missingTracking} dispute{missingTracking === 1 ? "" : "s"} missing tracking (highlighted)
            </span>
          )}
          {demoRows > 0 && (
            <span className="rounded-full bg-muted px-3 py-1 text-fg-body">
              {demoRows} row{demoRows === 1 ? "" : "s"} still use demo data. Editing a row replaces it with yours.
            </span>
          )}
        </div>
      )}

      <div className="mt-6">
        <EvidenceGrid rows={rows} demo={demo} />
      </div>
    </div>
  );
}
