import type { Metadata } from "next";
import { connection } from "next/server";
import { requireSession } from "@/lib/auth";
import { DEFAULT_POLICY, getSellerPolicy } from "@/lib/seller-policy";
import { supabaseAdmin } from "@/lib/supabase";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings · Sira" };

export default async function SettingsPage() {
  await connection();
  const session = await requireSession();
  const isSeller = session.kind === "seller";

  const seller = isSeller
    ? (await supabaseAdmin().from("sellers").select("name, paypal_merchant_id").eq("id", session.sellerId).single()).data
    : null;
  const policy = isSeller ? await getSellerPolicy(session.sellerId) : DEFAULT_POLICY;

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-3 px-5 pt-8 md:px-10 md:pt-9">
      <header className="mb-5 flex flex-col gap-1.5">
        <h1 className="text-[24px] font-[480] tracking-[0.01em] text-fg">Settings</h1>
        <p className="text-[14.5px] text-fg-body">
          {isSeller ? "How Sira handles disputes for your store. Every recommendation follows these." : "Shown with their defaults. The demo account can't change them."}
        </p>
      </header>

      <section aria-labelledby="acct" className="flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-line bg-canvas px-6 py-5">
        <div className="min-w-[220px] flex-[1_1_240px]">
          <h2 id="acct" className="text-[15px] font-[480] text-fg">
            PayPal account
          </h2>
          <p className="mt-1 text-[13.5px] leading-[21px] text-fg-body">Sira reads disputes and orders from this account.</p>
        </div>
        <div className="flex min-w-[260px] flex-[1_1_300px] flex-col gap-1 text-[14px]">
          {seller ? (
            <>
              <span className="text-fg">{seller.name}</span>
              <span className="text-fg-muted">
                Connected with Log in with PayPal · <span className="font-mono text-[12px]">{seller.paypal_merchant_id}</span>
              </span>
            </>
          ) : (
            <span className="text-fg-body">Demo account. Sign in with PayPal to connect your store and set its policies.</span>
          )}
        </div>
      </section>

      <SettingsForm policy={policy} readOnly={!isSeller} />
    </div>
  );
}
