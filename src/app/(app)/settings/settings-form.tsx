"use client";

import { useActionState, useState } from "react";
import type { SellerPolicy, Tone } from "@/lib/seller-policy";
import { EASY_CLAIM_KINDS } from "@/lib/easy-claim-kinds";
import { TEMPLATES, templateText, type TemplateId, type TemplateInfo } from "@/lib/templates";
import { saveSettings, type SettingsState } from "./actions";

const field =
  "w-full rounded-md border border-line bg-canvas px-3.5 py-3 text-[14px] leading-[22px] text-fg outline-none focus:border-line-strong disabled:opacity-60";

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

/** A real checkbox, drawn as a switch. */
function Switch({ name, checked, onChange }: { name: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 self-start text-[14px] text-fg">
      <input type="checkbox" role="switch" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6 w-10 rounded-full bg-inset transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-[3px] after:left-[3px] after:size-[18px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"
      />
      {checked ? "On" : "Off"}
    </label>
  );
}

/** Demo account: every control is visibly switched off, not just unsaveable. */
const lockedClass = "opacity-55 select-none [&_*]:cursor-not-allowed";

/** Dispute policies form (Mock 2 layout). Read-only for the demo account. */
export function SettingsForm({ policy, readOnly }: { policy: SellerPolicy; readOnly: boolean }) {
  const [state, save, saving] = useActionState<SettingsState, FormData>(saveSettings, null);
  const [auto, setAuto] = useState(policy.autoRefundEnabled);
  const [easyAuto, setEasyAuto] = useState(policy.easyClaimsAuto);
  const [tone, setTone] = useState<keyof typeof TONE_EXAMPLE>(policy.tone);
  const [guidelines, setGuidelines] = useState(policy.guidelines);
  const disabled = readOnly || saving;

  return (
    <form action={save} className="flex flex-col gap-3">
      <fieldset disabled={disabled} className={`rounded-xl border border-line bg-canvas px-6 ${readOnly ? lockedClass : ""}`}>
        <legend className="sr-only">Easy claims</legend>
        <Row
          title="Send easy claims automatically"
          description="When a dispute matches one of the cases below, Sira submits the response to PayPal for you, written from your templates. Off: Sira prepares it and waits for you to press Send. Anything else always waits for you."
        >
          <div className="flex flex-col gap-3">
            <Switch name="easyClaimsAuto" checked={easyAuto} onChange={setEasyAuto} />
            <ul className="list-disc space-y-1 pl-5 text-[13.5px] leading-[21px] text-fg-body">
              {Object.values(EASY_CLAIM_KINDS).map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </div>
        </Row>
        <Row title="Auto-refund small claims" description="For disputes under this amount, Sira accepts the claim and PayPal refunds the buyer in full from your balance. The buyer usually keeps the item. Skipped if you already refunded or PayPal doesn't allow it.">
          <div className="flex flex-col gap-3.5">
            <Switch name="autoRefundEnabled" checked={auto} onChange={setAuto} />
            <label className="flex items-center gap-2.5 text-[14px] text-fg-body">
              Under
              <span className="inline-flex h-[38px] w-[120px] items-center gap-1 rounded-md border border-line bg-canvas px-3 focus-within:border-line-strong">
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
          <div role="radiogroup" aria-label="Message tone" className="inline-flex rounded-md bg-muted p-[3px]">
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

      <fieldset disabled={disabled} className={`rounded-xl border border-line bg-canvas px-6 ${readOnly ? lockedClass : ""}`}>
        <legend className="sr-only">Response templates</legend>
        <div className="border-b border-line-subtle py-5">
          <h3 className="text-[15px] font-[480] text-fg">Response templates</h3>
          <p className="mt-1 text-[13.5px] leading-[21px] text-fg-body">
            Everything Sira sends to PayPal or your buyers starts from these. Words in {"{braces}"} are filled in from the order. You can still edit the text on
            each dispute before it&apos;s sent.
          </p>
        </div>
        {TEMPLATES.map((t, i) => (
          <TemplateEditor key={t.id} template={t} tone={tone} own={policy.templates[t.id]} last={i === TEMPLATES.length - 1} />
        ))}
      </fieldset>

      <fieldset disabled={disabled} className={`rounded-xl border border-line bg-canvas px-6 ${readOnly ? lockedClass : ""}`}>
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
              className="h-[38px] rounded-md bg-accent px-[18px] text-[14px] font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

/** One template: collapsed to its title, opens to an editable text box with a reset to Sira's default. */
function TemplateEditor({ template: t, tone, own, last }: { template: TemplateInfo; tone: Tone; own?: string; last?: boolean }) {
  const [text, setText] = useState<string | null>(own ?? null);
  // Until the seller edits it, the box shows the default for the current tone.
  const value = text ?? templateText(t.id as TemplateId, tone);
  const custom = text !== null && text.trim() !== templateText(t.id as TemplateId, tone).trim();
  return (
    <details className={`group py-4 ${last ? "" : "border-b border-line-subtle"}`}>
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="text-[14.5px] font-[480] text-fg">{t.title}</span>
          <span className="ml-2 text-[12.5px] text-fg-muted">→ {t.action === "send_message" || t.action === "make_offer" ? "buyer" : "PayPal"}</span>
        </span>
        <span className="shrink-0 text-[12.5px] text-fg-muted">{custom ? "Edited" : "Default"}</span>
      </summary>
      <p className="mt-1.5 text-[13px] text-fg-body">{t.when}</p>
      <textarea
        name={`template_${t.id}`}
        rows={value.split("\n").length + 1}
        maxLength={1500}
        value={value}
        onChange={(e) => setText(e.target.value)}
        className={`${field} mt-3 resize-y font-[inherit]`}
      />
      {custom && (
        <button type="button" onClick={() => setText(null)} className="mt-2 text-[13px] text-accent hover:underline">
          Reset to Sira&apos;s default
        </button>
      )}
    </details>
  );
}
