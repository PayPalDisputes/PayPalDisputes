"use client";

import { useActionState } from "react";
import type { SellerPolicy } from "@/lib/seller-policy";
import { saveSettings, type SettingsState } from "./actions";

const input =
  "w-full rounded-xl border border-line bg-canvas px-3 py-2 text-[14px] text-fg outline-none focus:border-fg-muted disabled:opacity-60";

/** Dispute policies form. Read-only for the demo account. */
export function SettingsForm({ policy, readOnly }: { policy: SellerPolicy; readOnly: boolean }) {
  const [state, save, saving] = useActionState<SettingsState, FormData>(saveSettings, null);
  const disabled = readOnly || saving;

  return (
    <form action={save} className="space-y-8">
      <fieldset disabled={disabled} className="space-y-3">
        <legend className="text-[15px] font-semibold text-fg">Auto-refund small disputes</legend>
        <p className="text-[13.5px] leading-5 text-fg-body">
          Disputes under this amount are refunded straight away, without waiting for your review. Off by default.
        </p>
        <label className="flex items-center gap-3 text-[14px] text-fg">
          <input type="checkbox" name="autoRefundEnabled" defaultChecked={policy.autoRefundEnabled} className="size-4" />
          Automatically refund disputes under
          <input
            type="number"
            name="autoRefundUnder"
            min="0.01"
            max="1000"
            step="0.01"
            defaultValue={policy.autoRefundUnder ?? 15}
            className={`${input} w-28`}
            aria-label="Auto-refund amount"
          />
        </label>
        <p className="text-[12.5px] text-fg-muted">
          Never applies if you already refunded the buyer, or if PayPal doesn&apos;t allow a refund at that stage.
        </p>
      </fieldset>

      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-[15px] font-semibold text-fg">Return policy</legend>
        <p className="text-[13.5px] text-fg-body">Sira quotes this in drafts and weighs it in its advice.</p>
        <textarea
          name="returnPolicy"
          rows={3}
          maxLength={1000}
          defaultValue={policy.returnPolicy}
          placeholder="e.g. Returns within 30 days. Buyer pays return shipping unless the item is faulty."
          className={input}
        />
      </fieldset>

      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-[15px] font-semibold text-fg">Tone for messages to buyers</legend>
        <select name="tone" defaultValue={policy.tone} className={`${input} w-48`}>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
        </select>
      </fieldset>

      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-[15px] font-semibold text-fg">Guidelines for Sira</legend>
        <p className="text-[13.5px] text-fg-body">Anything else Sira should follow when advising and drafting.</p>
        <textarea
          name="guidelines"
          rows={3}
          maxLength={1000}
          defaultValue={policy.guidelines}
          placeholder="e.g. We're a small family shop. Never offer more than 50% as a partial refund."
          className={input}
        />
      </fieldset>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-fg px-5 py-2 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {state && (
            <p role="status" className={`text-[13.5px] ${state.ok ? "text-fg-body" : "text-red-600"}`}>
              {state.message}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
