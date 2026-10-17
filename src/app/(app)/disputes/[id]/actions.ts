"use server";

import { refresh } from "next/cache";
import { approveDecision, rejectDecision, type ApproveResult } from "@/lib/respond";

// Server Actions for the Approve / Reject buttons. They can be called by anyone who can POST to
// the site, so the real protection is PAYPAL_ACTIONS_MODE: unless it's "live", nothing is sent
// to PayPal or saved (see src/lib/respond.ts).

export type ReviewState = (ApproveResult & { kind: "approve" }) | { kind: "reject"; ok: boolean; mode: string; error?: string } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function approveAction(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const decisionId = String(formData.get("decisionId") ?? "");
  if (!UUID.test(decisionId)) return { kind: "approve", ok: false, mode: "demo", steps: [], error: "Invalid report id." };

  // Drafts arrive as draft_0, draft_1, ... in the order of the report's drafts.
  const texts: string[] = [];
  for (let i = 0; formData.has(`draft_${i}`); i++) texts.push(String(formData.get(`draft_${i}`)));

  try {
    const result = await approveDecision(decisionId, texts);
    if (result.mode === "live") refresh();
    return { kind: "approve", ...result };
  } catch (err) {
    console.error("[approve] failed", err);
    return { kind: "approve", ok: false, mode: "live", steps: [], error: "Something went wrong partway. Check the dispute's activity on PayPal before trying again." };
  }
}

export async function rejectAction(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const decisionId = String(formData.get("decisionId") ?? "");
  if (!UUID.test(decisionId)) return { kind: "reject", ok: false, mode: "demo", error: "Invalid report id." };
  try {
    const result = await rejectDecision(decisionId);
    if (result.mode === "live") refresh();
    return { kind: "reject", ...result };
  } catch (err) {
    console.error("[reject] failed", err);
    return { kind: "reject", ok: false, mode: "live", error: "Something went wrong; try again." };
  }
}
