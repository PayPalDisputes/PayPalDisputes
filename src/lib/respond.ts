import type { Assessment, PayPalAction } from "@/lib/agent";
import { getOrder, type PayPalDisputeDetail } from "@/lib/dashboard";
import { evidencePackFor, evidencePackName, refundIdsFromNotes } from "@/lib/evidence-pack";
import { upsertDispute, type PayPalDispute } from "@/lib/disputes";
import { getDispute, PayPalError, paypalPost } from "@/lib/paypal";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * live: Approve really sends to PayPal and records it.
 * demo: Approve runs every check and builds every request, but sends nothing and saves nothing,
 *       so visitors to the public site can try the flow without changing anything.
 * Only an explicit PAYPAL_ACTIONS_MODE=live sends; anything else is demo.
 */
export type ActionsMode = "live" | "demo";
export const actionsMode = (): ActionsMode => (process.env.PAYPAL_ACTIONS_MODE === "live" ? "live" : "demo");

/** PayPal's limit on every note/message field we send. */
export const MAX_DRAFT_LENGTH = 2000;

/** Messages first, then evidence, then the step that hands the dispute over (an offer, or accepting the claim). */
const SEND_ORDER: PayPalAction[] = ["send_message", "provide_evidence", "make_offer", "accept_claim"];

const ENDPOINT: Record<PayPalAction, string> = {
  send_message: "send-message",
  provide_evidence: "provide-evidence",
  make_offer: "make-offer",
  accept_claim: "accept-claim",
};

export type StepResult = { action: PayPalAction; ok: boolean; message: string };
export type ApproveResult = { ok: boolean; mode: ActionsMode; steps: StepResult[]; error?: string };

type Dispute = PayPalDisputeDetail & {
  reason?: string;
  dispute_amount?: { currency_code: string; value: string };
  links?: { rel: string; method: string }[];
};

/**
 * provide-evidence and send-message only accept multipart/form-data, with the JSON in an "input"
 * part and any documents in "evidence-file" parts (named to match the evidence's documents list).
 */
function multipart(input: unknown, files: { name: string; data: Uint8Array; type: string }[] = []) {
  const form = new FormData();
  form.append("input", new Blob([JSON.stringify(input)], { type: "application/json" }));
  for (const f of files) form.append("evidence-file", new Blob([f.data as BlobPart], { type: f.type }), f.name);
  return form;
}

/** The request body PayPal expects for each action, or an error if we can't build one. */
async function buildRequest(
  action: PayPalAction,
  text: string,
  disputeId: string,
  dispute: Dispute,
  settleAmount: number | null,
): Promise<{ body: unknown; summary: unknown } | { error: string }> {
  switch (action) {
    case "send_message":
      return { body: multipart({ message: text }), summary: { message: text } };

    case "provide_evidence": {
      const order = await getOrder(dispute.disputed_transactions?.[0]?.seller_transaction_id);
      const tracking =
        order?.carrier && order.trackingNumber
          ? { tracking_info: [{ carrier_name: order.carrier, tracking_number: order.trackingNumber }] }
          : null;
      // An earlier refund is proven with its refund id; a shipment with its tracking; anything else as notes.
      const refundIds = refundIdsFromNotes(order?.notes ?? null);
      const evidence = refundIds.length > 0
        ? { evidence_type: "PROOF_OF_REFUND", evidence_info: { refund_ids: refundIds }, notes: text }
        : tracking
          ? { evidence_type: "PROOF_OF_FULFILLMENT", evidence_info: tracking, notes: text }
          : { evidence_type: "OTHER", notes: text };
      // The PDF evidence pack (order, shipping, carrier scans, statement, buyer's words) goes with it.
      const pack = await evidencePackFor(disputeId, text);
      const name = evidencePackName(disputeId);
      const input = { evidences: [{ ...evidence, ...(pack ? { documents: [{ name }] } : {}) }] };
      return {
        body: multipart(input, pack ? [{ name, data: pack, type: "application/pdf" }] : []),
        summary: { ...input, attachment: pack ? { name, bytes: pack.length } : null },
      };
    }

    case "make_offer": {
      if (settleAmount === null || settleAmount <= 0) return { error: "The report has no settle amount to offer." };
      const body = {
        note: text,
        offer_type: "REFUND",
        offer_amount: { currency_code: dispute.dispute_amount?.currency_code ?? "USD", value: settleAmount.toFixed(2) },
      };
      return { body, summary: body };
    }

    case "accept_claim": {
      const body = { note: text, accept_claim_type: "REFUND" };
      return { body, summary: body };
    }
  }
}

/** Short, seller-facing reason from a PayPal error body. */
function paypalReason(status: number, body: unknown) {
  const b = body as { message?: string; details?: { description?: string }[] } | null;
  return b?.details?.[0]?.description ?? b?.message ?? `PayPal returned ${status}`;
}

/**
 * Carries out an approved report: sends each draft (as edited by the seller) with its PayPal action.
 * `texts` holds the edited draft text by index into the report's drafts.
 */
export async function approveDecision(decisionId: string, texts: string[]): Promise<ApproveResult> {
  const mode = actionsMode();
  const db = supabaseAdmin();
  const fail = (error: string): ApproveResult => ({ ok: false, mode, steps: [], error });

  const { data: decision, error } = await db
    .from("decisions")
    .select("id, dispute_id, status, settle_amount, assessment")
    .eq("id", decisionId)
    .maybeSingle();
  if (error) throw error;
  if (!decision) return fail("This report no longer exists.");
  if (decision.status !== "pending_review" && decision.status !== "failed") {
    return fail(`This report was already ${decision.status.replace("_", " ")}.`);
  }

  const { data: latest, error: latestError } = await db
    .from("decisions")
    .select("id")
    .eq("dispute_id", decision.dispute_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (latestError) throw latestError;
  if (latest.id !== decision.id) return fail("A newer report replaced this one. Reload the page.");

  const assessment = decision.assessment as Assessment;
  const drafts = assessment.drafts.map((d, i) => ({ ...d, text: (texts[i] ?? d.text).trim() }));
  const tooLong = drafts.find((d) => d.text.length > MAX_DRAFT_LENGTH);
  if (tooLong) return fail(`A draft is longer than PayPal's ${MAX_DRAFT_LENGTH}-character limit.`);
  if (drafts.some((d) => d.text.length === 0)) return fail("A draft is empty.");

  // Live: ask PayPal what's allowed right now. Demo: use the copy we stored at the last sync.
  let dispute: Dispute;
  if (mode === "live") {
    try {
      dispute = await getDispute<Dispute>(decision.dispute_id);
    } catch (err) {
      if (err instanceof PayPalError && (err.status === 403 || err.status === 404)) {
        return fail(
          "PayPal won't let this server act on this dispute: it belongs to a different PayPal account than the one in this server's settings.",
        );
      }
      throw err;
    }
  } else {
    const { data, error: disputeError } = await db.from("disputes").select("raw").eq("id", decision.dispute_id).single();
    if (disputeError) throw disputeError;
    dispute = data.raw as Dispute;
  }
  const allowed = new Set((dispute.links ?? []).filter((l) => l.method === "POST").map((l) => l.rel));

  if (mode === "live") {
    const { error: approveError } = await db
      .from("decisions")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", decision.id);
    if (approveError) throw approveError;
  }

  const steps: StepResult[] = [];
  const ordered = [...drafts].sort((a, b) => SEND_ORDER.indexOf(a.action) - SEND_ORDER.indexOf(b.action));
  for (const draft of ordered) {
    if (!allowed.has(draft.action)) {
      steps.push({ action: draft.action, ok: false, message: "PayPal doesn't allow this on the dispute right now." });
      continue;
    }
    const request = await buildRequest(draft.action, draft.text, decision.dispute_id, dispute, decision.settle_amount);
    if ("error" in request) {
      steps.push({ action: draft.action, ok: false, message: request.error });
      continue;
    }
    if (mode === "demo") {
      const attached = draft.action === "provide_evidence" ? " with the PDF evidence pack" : "";
      steps.push({ action: draft.action, ok: true, message: `Ready to send${attached} (demo mode: not sent).` });
      continue;
    }

    let res: Awaited<ReturnType<typeof paypalPost>>;
    try {
      res = await paypalPost(`/v1/customer/disputes/${encodeURIComponent(decision.dispute_id)}/${ENDPOINT[draft.action]}`, request.body);
    } catch (err) {
      // Network failure: record it like any other failed step so the report doesn't stay "approved".
      res = { ok: false, status: 0, body: { message: err instanceof Error ? err.message : String(err) } };
    }
    const sent = draft.action === "provide_evidence" ? "Sent, with the PDF evidence pack attached." : "Sent.";
    steps.push({ action: draft.action, ok: res.ok, message: res.ok ? sent : paypalReason(res.status, res.body) });
    const { error: logError } = await db.from("actions").insert({
      dispute_id: decision.dispute_id,
      decision_id: decision.id,
      action_type: draft.action,
      request: request.summary,
      response: { status: res.status, body: res.body },
      success: res.ok,
    });
    if (logError) console.error(`[respond] failed to log ${draft.action} for ${decision.dispute_id}`, logError);
  }

  const ok = steps.length > 0 && steps.every((s) => s.ok);
  if (mode === "live") {
    const { error: statusError } = await db
      .from("decisions")
      .update({ status: ok ? "submitted" : "failed" })
      .eq("id", decision.id);
    if (statusError) throw statusError;
    // Pull the dispute's new state (status, allowed actions, timeline) so the page shows what happened.
    try {
      await upsertDispute(await getDispute<PayPalDispute>(decision.dispute_id));
    } catch (err) {
      console.error(`[respond] failed to refresh dispute ${decision.dispute_id}`, err);
    }
  }
  return { ok, mode, steps };
}

/** The seller turned the report down; nothing is sent to PayPal. */
export async function rejectDecision(decisionId: string): Promise<{ ok: boolean; mode: ActionsMode; error?: string }> {
  const mode = actionsMode();
  const db = supabaseAdmin();
  const { data: decision, error } = await db.from("decisions").select("id, status").eq("id", decisionId).maybeSingle();
  if (error) throw error;
  if (!decision) return { ok: false, mode, error: "This report no longer exists." };
  if (decision.status !== "pending_review" && decision.status !== "failed") {
    return { ok: false, mode, error: `This report was already ${decision.status.replace("_", " ")}.` };
  }
  if (mode === "live") {
    const { error: updateError } = await db
      .from("decisions")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", decision.id);
    if (updateError) throw updateError;
  }
  return { ok: true, mode };
}
