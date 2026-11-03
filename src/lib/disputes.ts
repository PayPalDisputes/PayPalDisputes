import { supabaseAdmin } from "@/lib/supabase";

/** The subset of PayPal's dispute object we store as columns; the rest lives in `raw`. */
export type PayPalDispute = {
  dispute_id: string;
  create_time?: string;
  update_time?: string;
  reason?: string;
  status?: string;
  dispute_state?: string;
  dispute_life_cycle_stage?: string;
  dispute_amount?: { currency_code: string; value: string };
  seller_response_due_date?: string;
  disputed_transactions?: {
    buyer_transaction_id?: string;
    seller?: { merchant_id?: string };
  }[];
};

/**
 * Disputes opened before DISPUTES_SINCE (an ISO date, optional) are never stored, so old sandbox
 * test disputes stay out of Sira once deleted, even though PayPal still lists them.
 */
function openedBeforeCutoff(dispute: PayPalDispute) {
  const since = process.env.DISPUTES_SINCE;
  return !!since && !!dispute.create_time && new Date(dispute.create_time) < new Date(since);
}

/**
 * Inserts or updates a dispute row, linking it to the seller by PayPal merchant id.
 * Returns false when the dispute was skipped (opened before DISPUTES_SINCE).
 */
export async function upsertDispute(dispute: PayPalDispute): Promise<boolean> {
  if (openedBeforeCutoff(dispute)) return false;
  const db = supabaseAdmin();
  const tx = dispute.disputed_transactions?.[0];
  const merchantId = tx?.seller?.merchant_id ?? null;

  let sellerId: string | null = null;
  if (merchantId) {
    const { data, error } = await db
      .from("sellers")
      .select("id")
      .eq("paypal_merchant_id", merchantId)
      .maybeSingle();
    if (error) throw error;
    sellerId = data?.id ?? null;
  }

  const { error } = await db.from("disputes").upsert({
    id: dispute.dispute_id,
    seller_id: sellerId,
    merchant_id: merchantId,
    buyer_transaction_id: tx?.buyer_transaction_id ?? null,
    reason: dispute.reason ?? null,
    status: dispute.status ?? null,
    dispute_state: dispute.dispute_state ?? null,
    lifecycle_stage: dispute.dispute_life_cycle_stage ?? null,
    amount: dispute.dispute_amount ? Number(dispute.dispute_amount.value) : null,
    currency: dispute.dispute_amount?.currency_code ?? null,
    seller_response_due_at: dispute.seller_response_due_date ?? null,
    paypal_created_at: dispute.create_time ?? null,
    paypal_updated_at: dispute.update_time ?? null,
    raw: dispute,
    synced_at: new Date().toISOString(),
  });
  if (error) throw error;
  return true;
}
