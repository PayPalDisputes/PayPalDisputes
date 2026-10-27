import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { comparison, plans, pricingFaq } from "@/data/plans";
import { site } from "@/data/site";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: `Pricing · ${site.name}`,
  description: `${site.name} pricing: start free with one store, then a flat monthly price. No cut of the money you win back.`,
};

/**
 * Pricing, laid out like Mercury's (hero, three plans with a billing switch, a comparison table,
 * FAQ) in the dashboard's quiet Mock 2 look. Wrapped in .theme-app for its colours and Inter.
 */
export default function PricingPage() {
  return (
    <div className="theme-app bg-canvas text-fg">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-36 pb-12 text-center sm:px-8">
        <p className="text-[14px] font-medium text-accent">Pricing</p>
        <h1 className="mx-auto mt-3 max-w-[760px] text-[40px] leading-[1.1] font-[480] tracking-[-0.01em] text-balance text-fg sm:text-[52px]">
          Simple pricing. No cut of your wins.
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[17px] leading-[27px] text-fg-body">
          Start free with one store. As disputes grow, pay a flat monthly price, never a percentage of the money Sira helps you keep.
        </p>
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px]">
          <span className="text-fg-muted">Free for everyone during the beta.</span>
          <a href="#compare" className="inline-flex items-center gap-1 text-accent hover:underline">
            Compare plans <ArrowDown aria-hidden strokeWidth={1.8} className="size-3.5" />
          </a>
        </p>
      </section>

      {/* Plans */}
      <section aria-label="Plans" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <PricingPlans plans={plans} />
      </section>

      {/* Flat price vs a success fee, worked through on one month */}
      <section aria-labelledby="flat" className="border-y border-line bg-subtle">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div>
            <h2 id="flat" className="text-[28px] leading-tight font-[480] tracking-[-0.01em] text-fg">
              A flat price keeps Sira on your side
            </h2>
            <p className="mt-4 text-[15px] leading-[25px] text-fg-body">
              Services paid per win have every reason to fight. Sira costs the same whether it tells you to fight, refund or settle, so its only job is
              to give you the right call.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-canvas">
            <p className="border-b border-line-subtle px-6 py-4 text-[13px] text-fg-muted">Say you win back $2,000 of disputes in a month</p>
            <dl className="divide-y divide-line-subtle">
              <div className="flex items-baseline justify-between gap-4 px-6 py-5">
                <dt className="text-[15px] text-fg-body">A 25% success fee</dt>
                <dd className="text-[26px] font-[480] text-fg tabular-nums">$500</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-6 py-5">
                <dt className="text-[15px] text-fg-body">Sira Growth</dt>
                <dd className="text-[26px] font-[480] text-accent tabular-nums">$19</dd>
              </div>
            </dl>
            <p className="border-t border-line-subtle px-6 py-4 text-[12.5px] leading-5 text-fg-muted">
              25% is the success fee some dispute services charge on each dispute they win.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison table: text in every cell */}
      <section id="compare" aria-labelledby="compare-title" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8">
        <h2 id="compare-title" className="text-[28px] font-[480] tracking-[-0.01em] text-fg">
          Compare plans
        </h2>
        <p className="mt-2 text-[15px] text-fg-body">Every plan includes Sira&apos;s full investigation and advice. Plans differ by volume and extras.</p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-[40%] py-4 font-[420] text-fg-muted">
                  <span className="sr-only">Feature</span>
                </th>
                {plans.map((p) => (
                  <th key={p.id} scope="col" className="py-4 text-[15px] font-[480] text-fg">
                    {p.name}
                    <span className="block text-[13px] font-[420] text-fg-muted">
                      {p.monthly === 0 ? "$0 / month" : `From $${p.annual} / month`}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            {comparison.map((group) => (
              <tbody key={group.section}>
                <tr>
                  <th colSpan={4} scope="colgroup" className="pt-8 pb-2 text-[13px] font-medium text-accent">
                    {group.section}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className="border-b border-line-subtle">
                    <th scope="row" className="py-3.5 pr-6 font-[420] text-fg-body">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td key={i} className={cn("py-3.5 pr-4", v === "—" ? "text-fg-muted" : "text-fg")}>
                        {v === "—" ? <span aria-label="Not included">—</span> : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="border-t border-line bg-subtle">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 id="faq" className="text-[28px] font-[480] tracking-[-0.01em] text-fg">
              Pricing questions
            </h2>
            <p className="mt-3 text-[15px] leading-[25px] text-fg-body">Anything else? Try the demo, or sign in and look around. Nothing is sent to PayPal until you approve it.</p>
          </div>
          <dl className="divide-y divide-line">
            {pricingFaq.map((f) => (
              <div key={f.q} className="py-5 first:pt-0">
                <dt className="text-[16px] font-[480] text-fg">{f.q}</dt>
                <dd className="mt-2 text-[15px] leading-[25px] text-fg-body">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8">
        <h2 className="text-[32px] font-[480] tracking-[-0.01em] text-fg">See Sira on your own disputes</h2>
        <p className="mx-auto mt-3 max-w-[520px] text-[16px] leading-[26px] text-fg-body">
          Try the demo with sample disputes, or log in with PayPal to connect your store. Free during the beta.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {/* A plain link: the demo route sets a cookie, so it must not be prefetched */}
          <a href="/api/auth/demo" className="inline-flex h-11 items-center rounded-full bg-muted px-6 text-[15px] text-fg hover:bg-inset">
            Try the demo
          </a>
          <Link href="/signin" className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-[15px] font-medium text-white hover:bg-[#0062c4]">
            Log in with PayPal
          </Link>
        </div>
      </section>
    </div>
  );
}
