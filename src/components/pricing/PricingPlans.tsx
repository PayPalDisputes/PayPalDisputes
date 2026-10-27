"use client";

import { useState } from "react";
import Link from "next/link";
import type { Plan } from "@/data/plans";
import { cn } from "@/lib/cn";

/** Three plan cards with a Monthly / Annual switch (Mercury-style), in the dashboard's quiet look. */
export function PricingPlans({ plans }: { plans: Plan[] }) {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="flex flex-col items-center gap-8">
      <div role="radiogroup" aria-label="Billing" className="inline-flex rounded-[10px] bg-muted p-[3px] text-[14px]">
        {[
          { id: false, label: "Monthly" },
          { id: true, label: "Annual · 2 months free" },
        ].map((o) => (
          <button
            key={String(o.id)}
            type="button"
            role="radio"
            aria-checked={annual === o.id}
            onClick={() => setAnnual(o.id)}
            className={cn(
              "rounded-lg px-4 py-1.5 transition-colors",
              annual === o.id ? "bg-canvas text-fg shadow-[0_1px_2px_rgba(30,30,42,0.08)]" : "text-fg-body hover:text-fg",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="grid w-full gap-5 md:grid-cols-3">
        {plans.map((p) => {
          const price = annual ? p.annual : p.monthly;
          const featured = p.id === "growth";
          return (
            <section
              key={p.id}
              aria-labelledby={`plan-${p.id}`}
              className={cn("flex flex-col rounded-xl border bg-canvas p-7", featured ? "border-accent/40 shadow-[0_8px_30px_rgba(0,112,224,0.08)]" : "border-line")}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 id={`plan-${p.id}`} className="text-[18px] font-[480] text-fg">
                  {p.name}
                </h2>
                {featured && <span className="text-[12.5px] font-medium text-accent">Most popular</span>}
              </div>
              <p className="mt-1.5 min-h-[44px] text-[14px] leading-[22px] text-fg-body">{p.tagline}</p>

              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="text-[44px] leading-none font-[480] tracking-[-0.01em] text-fg tabular-nums">${price}</span>
                <span className="text-[14px] text-fg-muted">/ month</span>
              </p>
              <p className="mt-2 h-5 text-[13px] text-fg-muted">
                {price === 0 ? "Free forever" : annual ? `Billed $${price * 12} a year` : `Or $${p.annual}/month billed annually`}
              </p>

              <Link
                href={p.cta.href}
                className={cn(
                  "mt-6 inline-flex h-10 items-center justify-center rounded-full text-[14px] font-medium transition-colors",
                  featured ? "bg-accent text-white hover:bg-[#0062c4]" : "bg-muted text-fg hover:bg-inset",
                )}
              >
                {p.cta.label}
              </Link>

              <p className="mt-7 text-[14px] font-[480] text-fg">{p.disputes}</p>
              <p className="mt-4 text-[13px] text-fg-muted">{p.includesLabel}</p>
              <ul className="mt-2.5 flex flex-col">
                {p.features.map((f) => (
                  <li key={f} className="border-t border-line-subtle py-2.5 text-[14px] text-fg-body">
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
