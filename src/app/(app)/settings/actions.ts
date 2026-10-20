"use server";

import { refresh } from "next/cache";
import { MAX_POLICY_TEXT, saveSellerPolicy, type SellerPolicy } from "@/lib/seller-policy";
import { getSession } from "@/lib/session";

export type SettingsState = { ok: boolean; message: string } | null;

/** Saves the signed-in seller's policies. Server Actions can be called directly, so it checks the session itself. */
export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await getSession();
  if (session?.kind !== "seller") {
    return { ok: false, message: "The demo account can't change settings. Sign in with PayPal to set your store's policies." };
  }

  const under = Number(formData.get("autoRefundUnder"));
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const policy: SellerPolicy = {
    autoRefundEnabled: formData.get("autoRefundEnabled") === "on",
    autoRefundUnder: Number.isFinite(under) ? Math.round(under * 100) / 100 : NaN,
    returnPolicy: text("returnPolicy"),
    tone: formData.get("tone") === "formal" ? "formal" : "friendly",
    guidelines: text("guidelines"),
  };

  if (!Number.isFinite(policy.autoRefundUnder) || policy.autoRefundUnder! <= 0 || policy.autoRefundUnder! > 1000) {
    return { ok: false, message: "The auto-refund amount must be between 0.01 and 1,000." };
  }
  if (policy.returnPolicy.length > MAX_POLICY_TEXT || policy.guidelines.length > MAX_POLICY_TEXT) {
    return { ok: false, message: `Keep each text box under ${MAX_POLICY_TEXT} characters.` };
  }

  try {
    await saveSellerPolicy(session.sellerId, policy);
  } catch (err) {
    console.error("[settings] save failed", err);
    return { ok: false, message: "Couldn't save your settings. Please try again." };
  }
  refresh();
  return { ok: true, message: "Saved. Sira will use these on the next dispute it assesses." };
}
