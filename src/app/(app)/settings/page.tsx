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
    <div className="mx-auto w-full max-w-[720px] px-5 pt-8 pb-20 md:px-10 md:pt-10">
      <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-fg">Settings</h1>

      <section className="mt-8 rounded-2xl border border-line bg-canvas p-5">
        <h2 className="text-[15px] font-semibold text-fg">Connected PayPal account</h2>
        {seller ? (
          <dl className="mt-3 space-y-1.5 text-[14px]">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-muted">Store</dt>
              <dd className="text-fg">{seller.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-muted">PayPal merchant ID</dt>
              <dd className="font-mono text-[13px] text-fg">{seller.paypal_merchant_id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-muted">Signed in with</dt>
              <dd className="text-fg">Log in with PayPal</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-[14px] text-fg-body">
            You&apos;re using the demo account. Sign in with PayPal to connect your store and set its policies.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-[15px] font-semibold text-fg">Dispute policies</h2>
        <p className="mb-6 text-[13.5px] text-fg-body">
          {isSeller ? "Sira follows these for every dispute it assesses." : "Shown with their defaults. The demo account can't change them."}
        </p>
        <SettingsForm policy={policy} readOnly={!isSeller} />
      </section>
    </div>
  );
}
