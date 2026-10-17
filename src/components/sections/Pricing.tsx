"use client";

import { Fragment, useState } from "react";
import { Check, ChevronDown, DollarSign, Minus } from "lucide-react";
import { comparison, plans, type Cell, type Plan } from "@/data/pricing";
import { cn } from "@/lib/cn";
import { Eyebrow, Section } from "../layout/Container";
import { Reveal } from "../motion/Reveal";
import { Button } from "../ui/Button";

type Billing = "monthly" | "yearly";

export function PricingToggle({ value, onChange }: { value: Billing; onChange: (b: Billing) => void }) {
  return (
    <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-[10px] bg-muted p-1 ring-1 ring-line ring-inset">
      {(["monthly", "yearly"] as const).map((b) => (
        <button
          key={b}
          role="radio"
          type="button"
          aria-checked={value === b}
          onClick={() => onChange(b)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-[7px] px-3.5 text-[13px] capitalize transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-fg",
            value === b ? "bg-canvas font-medium text-fg shadow-[0_1px_2px_rgba(28,25,20,0.1),0_0_0_1px_rgba(28,25,20,0.06)]" : "text-fg-body hover:text-fg",
          )}
        >
          {b}
          {b === "yearly" && <span className="rounded-[4px] bg-ok-bg px-1 text-[10.5px] font-medium text-ok">−20%</span>}
        </button>
      ))}
    </div>
  );
}

function Price({ plan, billing, dark }: { plan: Plan; billing: Billing; dark?: boolean }) {
  const amount = billing === "monthly" ? plan.monthly : plan.yearly;
  const numberClass = cn("font-serif text-[56px] leading-none tracking-[-0.01em] tabular-nums", dark ? "text-white" : "text-fg");
  if (amount === null)
    return (
      <div className="flex h-[60px] items-end">
        <span className={numberClass}>Custom</span>
      </div>
    );
  return (
    <div className="flex h-[60px] items-end gap-2">
      <span key={billing} className={cn("animate-fade-up", numberClass)}>
        ${amount}
      </span>
      <span className={cn("pb-1.5 text-[13px] leading-4", dark ? "text-white/55" : "text-fg-muted")}>
        /month
        {billing === "yearly" && amount > 0 && <span className="block">billed yearly</span>}
      </span>
    </div>
  );
}

export function PricingCards({ billing }: { billing: Billing }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {plans.map((plan, i) => {
        const dark = plan.highlighted;
        return (
          <Reveal
            key={plan.id}
            delay={i * 80}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6 md:p-7",
              dark
                ? "border-fg bg-[linear-gradient(180deg,#3d3633_0%,#2a2522_100%)] text-white shadow-[0_24px_48px_-24px_rgba(42,37,34,0.6)]"
                : "border-line bg-canvas",
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className={cn("text-[17px] font-medium", dark ? "text-white" : "text-fg")}>{plan.name}</h3>
              {dark && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80 ring-1 ring-white/15">Most popular</span>}
            </div>
            <p className={cn("mt-1.5 min-h-[40px] text-[13px] leading-5", dark ? "text-white/60" : "text-fg-body")}>{plan.description}</p>
            <div className="mt-7">
              <Price plan={plan} billing={billing} dark={dark} />
            </div>
            <Button href={plan.cta.href} variant={dark ? "secondary" : "primary"} className="mt-7 w-full">
              {plan.cta.label}
            </Button>
            <div className={cn("my-7 h-px", dark ? "bg-white/12" : "bg-line")} />
            <p className={cn("mb-3.5 text-[12px] font-medium", dark ? "text-white/50" : "text-fg-muted")}>{plan.includesLabel}</p>
            <ul className="space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className={cn("flex items-start gap-2.5 text-[13.5px] leading-5", dark ? "text-white/85" : "text-fg-heading")}>
                  <Check aria-hidden strokeWidth={2} className={cn("mt-0.5 size-4 shrink-0", dark ? "text-[#e8936a]" : "text-fg-muted")} />
                  {f}
                </li>
              ))}
            </ul>
          </Reveal>
        );
      })}
    </div>
  );
}

function CellValue({ value }: { value: Cell }) {
  if (value === true) return <Check aria-label="Included" strokeWidth={1.75} className="mx-auto size-4 text-fg" />;
  if (value === false) return <Minus aria-label="Not included" strokeWidth={1.75} className="mx-auto size-4 text-line-strong" />;
  return <span className="text-fg-heading">{value}</span>;
}

/** Full table on desktop; one collapsible list per plan on mobile. */
export function ComparisonTable() {
  const [openPlan, setOpenPlan] = useState<string | null>(plans[1].id);
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
        <table className="w-full table-fixed text-[13.5px]">
          <caption className="sr-only">Plan comparison</caption>
          <thead>
            <tr className="border-b border-line bg-subtle">
              <th scope="col" className="w-[40%] px-6 py-4 text-left font-medium text-fg-muted">
                Features
              </th>
              {plans.map((p) => (
                <th key={p.id} scope="col" className="px-4 py-4 text-center font-medium text-fg">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.map((group) => (
              <Fragment key={group.section}>
                <tr className="border-b border-line">
                  <th colSpan={4} scope="colgroup" className="bg-canvas px-6 pt-6 pb-2 text-left t-eyebrow font-normal">
                    {group.section}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className="border-b border-line-subtle last:border-line transition-colors hover:bg-subtle/60">
                    <th scope="row" className="px-6 py-3 text-left font-normal text-fg-body">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td key={i} className={cn("px-4 py-3 text-center", plans[i].highlighted && "bg-subtle/50")}>
                        <CellValue value={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {plans.map((p, pi) => {
          const open = openPlan === p.id;
          return (
            <div key={p.id} className="overflow-hidden rounded-xl border border-line bg-canvas">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenPlan(open ? null : p.id)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] font-medium text-fg"
              >
                {p.name}
                <ChevronDown strokeWidth={1.75} className={cn("size-4 text-fg-muted transition-transform duration-200", open && "rotate-180")} />
              </button>
              <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out-soft", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                  {comparison.map((g) => (
                    <div key={g.section} className="border-t border-line px-4 py-3">
                      <p className="t-eyebrow mb-2">{g.section}</p>
                      <ul className="space-y-2">
                        {g.rows.map((r) => (
                          <li key={r.label} className="flex items-center justify-between gap-4 text-[13.5px]">
                            <span className="text-fg-body">{r.label}</span>
                            <span className="shrink-0">
                              <CellValue value={r.values[pi]} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Pricing hero + toggle + cards. */
export function PricingSection({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" }) {
  const [billing, setBilling] = useState<Billing>("yearly");
  const Heading = headingLevel;
  return (
    <Section id="pricing" hatched rule={headingLevel === "h2"} className={headingLevel === "h1" ? "-mt-[68px]" : undefined} innerClassName={cn("px-4 pb-16 sm:px-6 md:px-6", headingLevel === "h1" ? "pt-36 md:pt-44" : "pt-20 md:pt-28")}>
      <div className="mx-auto max-w-[680px] text-center">
        <Eyebrow icon={<DollarSign strokeWidth={1.75} />} className="mb-5">
          Plans &amp; pricing
        </Eyebrow>
        <Heading className={headingLevel === "h1" ? "t-display" : "t-h2"}>Plans that grow with your store</Heading>
        <p className="t-body-lg mx-auto mt-5 max-w-[520px]">Start free with one seller account. Upgrade when disputes become a weekly job.</p>
        <div className="mt-8">
          <PricingToggle value={billing} onChange={setBilling} />
        </div>
      </div>
      <div className="mt-12">
        <PricingCards billing={billing} />
      </div>
    </Section>
  );
}
