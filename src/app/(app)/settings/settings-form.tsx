"use client";

import { useActionState, useState } from "react";
import type { SellerPolicy } from "@/lib/seller-policy";
import { saveSettings, type SettingsState } from "./actions";

const field =
  "w-full rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14px] leading-[22px] text-fg outline-none focus:border-line-strong disabled:opacity-60";

const TONE_EXAMPLE = {
  friendly: "“Hi Maya, I’m sorry about the chip in the glaze. I’d like to offer $40 so you can keep the lamp.”",
  formal: "“Dear Maya, thank you for letting us know about the damage. We would like to offer a partial refund of $40.”",
} as const;

/** One settings row: what it is on the left, the control on the right (stacks on a phone). */
function Row({ title, htmlFor, description, children, last }: { title: string; htmlFor?: string; description: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-x-8 gap-y-3 py-5 ${last ? "" : "border-b border-line-subtle"}`}>
      <div className="min-w-[220px] flex-[1_1_240px]">
        <h3 className="text-[15px] font-[480] text-fg">{htmlFor ? <label htmlFor={htmlFor}>{title}</label> : title}</h3>
        <p className="mt-1 text-[13.5px] leading-[21px] text-fg-body">{description}</p>
      </div>
      <div className="min-w-[260px] flex-[1_1_300px]">{children}</div>
    </div>
  );
}

/** Dispute policies form (Mock 2 layout). Read-only for the demo account. */
export function SettingsForm({ policy, readOnly }: { policy: SellerPolicy; readOnly: boolean }) {
  const [state, save, saving] = useActionState<SettingsState, FormData>(saveSettings, null);
  const [auto, setAuto] = useState(policy.autoRefundEnabled);
  const [tone, setTone] = useState<keyof typeof TONE_EXAMPLE>(policy.tone);
  const [guidelines, setGuidelines] = useState(policy.guidelines);
  const disabled = readOnly || saving;

  return (
    <form action={save} className="flex flex-col gap-3">
      <fieldset disabled={disabled} className="rounded-xl border border-line bg-canvas px-6">
        <legend className="sr-only">Automatic decisions</legend>
        <Row title="Auto-refund small claims" description="Sira refunds small claims straight away, unless you already refunded the buyer or PayPal doesn't allow it. Everything else still waits for you.">
          <div className="flex flex-col gap-3.5">
            {/* A real checkbox, drawn as a switch */}
            <label className="inline-flex cursor-pointer items-center gap-3 self-start text-[14px] text-fg">
              <input
                type="checkbox"
                role="switch"
                name="autoRefundEnabled"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="relative h-6 w-10 rounded-full bg-inset transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-[3px] after:left-[3px] after:size-[18px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"
              />
              {auto ? "On" : "Off"}
            </label>
            <label className="flex items-center gap-2.5 text-[14px] text-fg-body">
              Under
              <span className="inline-flex h-[38px] w-[120px] items-center gap-1 rounded-[10px] border border-line bg-canvas px-3 focus-within:border-line-strong">
                <span className="text-fg-muted">$</span>
                <input
                  type="number"
                  name="autoRefundUnder"
                  min="0.01"
                  max="1000"
                  step="0.01"
                  defaultValue={policy.autoRefundUnder ?? 15}
                  aria-label="Auto-refund limit in dollars"
                  className="w-full bg-transparent text-[14px] text-fg tabular-nums outline-none"
                />
              </span>
            </label>
          </div>
        </Row>
        <Row title="Message tone" description="How Sira writes to your buyers." last>
          <div role="radiogroup" aria-label="Message tone" className="inline-flex rounded-[10px] bg-muted p-[3px]">
            {(["friendly", "formal"] as const).map((t) => (
              <label
                key={t}
                className={`cursor-pointer rounded-lg px-4 py-1.5 text-[14px] ${tone === t ? "bg-canvas text-fg shadow-[0_1px_2px_rgba(30,30,42,0.08)]" : "text-fg-body"}`}
              >
                <input type="radio" name="tone" value={t} checked={tone === t} onChange={() => setTone(t)} className="sr-only" />
                {t === "friendly" ? "Friendly" : "Formal"}
              </label>
            ))}
          </div>
          <p className="mt-2.5 text-[13.5px] leading-[21px] text-fg-body">{TONE_EXAMPLE[tone]}</p>
        </Row>
      </fieldset>

      <fieldset disabled={disabled} className="rounded-xl border border-line bg-canvas px-6">
        <legend className="sr-only">Policies</legend>
        <Row title="Return policy" htmlFor="returnPolicy" description="Sira quotes this when a buyer asks about returns, and weighs it in its advice.">
          <textarea
            id="returnPolicy"
            name="returnPolicy"
            rows={4}
            maxLength={1000}
            defaultValue={policy.returnPolicy}
            placeholder="e.g. Returns within 30 days. Buyer pays return shipping unless the item is faulty."
            className={`${field} resize-y`}
          />
        </Row>
        <Row title="Guidelines for Sira" htmlFor="guidelines" description="Anything Sira should always or never do. Plain sentences work best." last>
          <textarea
            id="guidelines"
            name="guidelines"
            rows={4}
            maxLength={1000}
            value={guidelines}
            onChange={(e) => setGuidelines(e.target.value)}
            placeholder="e.g. We're a small family shop. Never offer more than 50% as a partial refund."
            className={`${field} resize-y`}
          />
          <p className="mt-1.5 text-right text-[12.5px] text-fg-muted tabular-nums">{guidelines.length} / 1000</p>
        </Row>
      </fieldset>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-5 mt-3 border-t border-line bg-subtle/95 backdrop-blur-md md:-mx-10">
        <div className="mx-auto flex max-w-[820px] items-center gap-3 px-5 py-3.5 md:px-10">
          <span role="status" className={`flex-1 text-[13px] ${state && !state.ok ? "text-bad" : "text-fg-muted"}`}>
            {readOnly ? "In the demo account, settings are read-only." : (state?.message ?? "")}
          </span>
          {!readOnly && (
            <button
              type="submit"
              disabled={saving}
              className="h-[38px] rounded-full bg-accent px-[18px] text-[14px] font-medium text-white hover:bg-[#0062c4] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
