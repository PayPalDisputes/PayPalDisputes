"use server";

import { refresh } from "next/cache";
import { canAccessDispute } from "@/lib/auth";
import { assessDispute } from "@/lib/assess";
import { writeEvidence } from "@/lib/evidence";
import type { EvidenceField } from "@/lib/evidence-shared";
import { getSession } from "@/lib/session";

// Server Actions can be called directly, so each one checks the session itself:
// sellers may only touch their own disputes, and the demo account never writes anything.

export type SaveResult = { ok: true; demo?: boolean } | { ok: false; error: string };

const NO_ACCESS = "You can't edit this dispute.";

/** Saves one edited cell from the Evidence grid. */
export async function saveEvidence(disputeId: string, field: EvidenceField, value: unknown): Promise<SaveResult> {
  const session = await getSession();
  if (!session || !(await canAccessDispute(disputeId))) return { ok: false, error: NO_ACCESS };
  if (session.kind === "demo") return { ok: true, demo: true };
  try {
    return await writeEvidence(disputeId, { [field]: value });
  } catch (err) {
    console.error("[evidence] save failed", err);
    return { ok: false, error: "Couldn't save. Try again." };
  }
}

/** Saves the matched rows of a CSV import, one dispute at a time. */
export async function importEvidence(
  rows: { disputeId: string; values: Partial<Record<EvidenceField, unknown>> }[],
): Promise<{ saved: number; failed: { disputeId: string; error: string }[]; demo?: boolean }> {
  const session = await getSession();
  if (!session) return { saved: 0, failed: rows.map((r) => ({ disputeId: r.disputeId, error: NO_ACCESS })) };
  if (session.kind === "demo") return { saved: 0, failed: [], demo: true };

  const failed: { disputeId: string; error: string }[] = [];
  let saved = 0;
  for (const r of rows.slice(0, 500)) {
    try {
      if (!(await canAccessDispute(r.disputeId))) {
        failed.push({ disputeId: r.disputeId, error: NO_ACCESS });
        continue;
      }
      const res = await writeEvidence(r.disputeId, r.values);
      if (res.ok) saved++;
      else failed.push({ disputeId: r.disputeId, error: res.error });
    } catch {
      failed.push({ disputeId: r.disputeId, error: "Couldn't save." });
    }
  }
  if (saved) refresh();
  return { saved, failed };
}

/** Runs the agent again on one dispute so it sees the new evidence. */
export async function reassess(disputeId: string): Promise<{ ok: true; recommendation: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || !(await canAccessDispute(disputeId))) return { ok: false, error: NO_ACCESS };
  if (session.kind === "demo") return { ok: false, error: "The demo account can't re-run the agent. Sign in with PayPal to use Re-check." };
  try {
    const outcome = await assessDispute(disputeId, { force: true });
    refresh();
    return outcome.status === "assessed"
      ? { ok: true, recommendation: outcome.recommendation }
      : { ok: false, error: outcome.reason };
  } catch (err) {
    console.error("[evidence] reassess failed", err);
    return { ok: false, error: "The agent couldn't finish. Try again in a minute." };
  }
}
