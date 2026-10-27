import { cn } from "@/lib/cn";
import { STAGE_STEPS } from "@/lib/dispute-stage";

// Small pieces shared by the dashboard pages (Mock 2 look).

const fmt = (amount: number, currency: string | null) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(amount);

/**
 * A money figure with smaller, softer cents (Mercury-style): "$347" + ".99".
 * Marked `.money` so the top bar's hide-amounts toggle can blur it.
 */
export function Money({
  amount,
  currency,
  className,
  centsClassName,
  sign,
}: {
  amount: number | null;
  currency: string | null;
  className?: string;
  centsClassName?: string;
  sign?: "+" | "−";
}) {
  if (amount === null) return <span className={className}>—</span>;
  const text = fmt(amount, currency);
  const cut = text.lastIndexOf(".");
  return (
    <span className={cn("money tabular-nums", className)}>
      {sign}
      {cut === -1 ? text : text.slice(0, cut)}
      {cut !== -1 && <span className={cn("relative -top-[0.35em] text-[0.5em] text-fg-muted", centsClassName)}>{text.slice(cut)}</span>}
    </span>
  );
}

/** A plain money string, still blurrable. */
export function Amount({ amount, currency, className }: { amount: number | null; currency: string | null; className?: string }) {
  return <span className={cn("money tabular-nums", className)}>{amount === null ? "—" : fmt(amount, currency)}</span>;
}

/** The thin 5-step "where it stands" line; finished steps in PayPal blue. */
export function ProgressLine({ step, className }: { step: number; className?: string }) {
  return (
    <span role="img" aria-label={`Step ${step} of 5: ${STAGE_STEPS[step - 1]}`} className={cn("flex w-[120px] gap-[3px]", className)}>
      {STAGE_STEPS.map((s, i) => (
        <span key={s} className={cn("h-[3px] flex-1 rounded-full", i < step ? "bg-accent" : "bg-inset")} />
      ))}
    </span>
  );
}

/** Quiet section heading with an optional right-hand link or control. */
export function SectionHead({ id, title, aside, className }: { id: string; title: string; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <h2 id={id} className="t-section">
        {title}
      </h2>
      {aside}
    </div>
  );
}

/** White card with a hairline border, the dashboard's only container. */
export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("rounded-xl border border-line bg-canvas", className)} {...rest}>
      {children}
    </section>
  );
}
