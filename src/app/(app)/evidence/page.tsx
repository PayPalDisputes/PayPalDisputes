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
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-5 pt-8 pb-20 md:px-10 md:pt-9">
      <header className="flex max-w-[680px] flex-col gap-1.5">
        <h1 className="text-[24px] font-[480] tracking-[0.01em] text-fg">Evidence</h1>
        <p className="text-[14.5px] leading-[22px] text-fg-body">
          Tracking and delivery proof for your open disputes. Sira uploads tracking to PayPal and attaches it to every response.
        </p>
      </header>

      {(missingTracking > 0 || demo || demoRows > 0) && (
        <div className="flex flex-col gap-1 text-[14px]">
          {missingTracking > 0 && (
            <p>
              <span className="font-medium text-bad">
                {missingTracking} {missingTracking === 1 ? "order is" : "orders are"} missing tracking.
              </span>{" "}
              <span className="text-fg-body">Without it, &ldquo;not received&rdquo; claims are usually lost.</span>
            </p>
          )}
          {demo && <p className="text-fg-muted">You&apos;re in the demo account: try editing and importing, but nothing is saved.</p>}
          {!demo && demoRows > 0 && (
            <p className="text-fg-muted">
              {demoRows} row{demoRows === 1 ? "" : "s"} still use demo data. Editing a row replaces it with yours.
            </p>
          )}
        </div>
      )}

      <EvidenceGrid rows={rows} demo={demo} />
    </div>
  );
}
