import { supabaseAdmin } from "@/lib/supabase";

// Each seller's dispute policies, set on the Settings page and stored in sellers.policy (jsonb).
// New keys sit alongside the older ones there (auto_submit, min_confidence, ...), which are left alone.

export type Tone = "friendly" | "formal";

export type SellerPolicy = {
  /** Off unless the seller turns it on. The older auto_refund_under value alone never triggers anything. */
  autoRefundEnabled: boolean;
  /** Disputes for less than this amount (in the dispute's currency) are refunded automatically. */
  autoRefundUnder: number | null;
  returnPolicy: string;
  tone: Tone;
  /** Anything else the agent should follow, in the seller's own words. */
  guidelines: string;
};

export const MAX_POLICY_TEXT = 1000;

export const DEFAULT_POLICY: SellerPolicy = {
  autoRefundEnabled: false,
  autoRefundUnder: 15,
  returnPolicy: "",
  tone: "friendly",
  guidelines: "",
};

function fromRow(policy: Record<string, unknown> | null): SellerPolicy {
  const p = policy ?? {};
  const under = Number(p.auto_refund_under);
  return {
    autoRefundEnabled: p.auto_refund_enabled === true,
    autoRefundUnder: Number.isFinite(under) && under > 0 ? under : DEFAULT_POLICY.autoRefundUnder,
    returnPolicy: typeof p.return_policy === "string" ? p.return_policy : "",
    tone: p.tone === "formal" ? "formal" : "friendly",
    guidelines: typeof p.guidelines === "string" ? p.guidelines : "",
  };
}

/** A seller's policy, with defaults for anything not set yet. */
export async function getSellerPolicy(sellerId: string | null): Promise<SellerPolicy> {
  if (!sellerId) return DEFAULT_POLICY;
  const { data, error } = await supabaseAdmin().from("sellers").select("policy").eq("id", sellerId).maybeSingle();
  if (error) throw error;
  return fromRow((data?.policy as Record<string, unknown> | null) ?? null);
}

/** Saves the Settings page's fields, keeping every other key already in sellers.policy. */
export async function saveSellerPolicy(sellerId: string, policy: SellerPolicy) {
  const db = supabaseAdmin();
  const { data, error } = await db.from("sellers").select("policy").eq("id", sellerId).single();
  if (error) throw error;
  const merged = {
    ...((data.policy as Record<string, unknown> | null) ?? {}),
    auto_refund_enabled: policy.autoRefundEnabled,
    auto_refund_under: policy.autoRefundUnder,
    return_policy: policy.returnPolicy,
    tone: policy.tone,
    guidelines: policy.guidelines,
  };
  const { error: updateError } = await db.from("sellers").update({ policy: merged }).eq("id", sellerId);
  if (updateError) throw updateError;
}
