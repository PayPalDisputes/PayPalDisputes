import { ArrowRight, Check, Clock3, Gavel, HandCoins, RotateCcw, ShieldCheck, Sparkles, Undo2 } from "lucide-react";
import { featuredCase, sellerAccounts, webhookEvents } from "@/data/dashboard";
import { cn } from "@/lib/cn";
import { Avatar, Badge, IconTile } from "../ui/primitives";

/** Small floating surface used inside feature visuals. */
export function Surface({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-[14px] border border-line bg-canvas shadow-card", className)}>{children}</div>;
}

/** Soft tray that frames a feature visual. */
export function VisualFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[20px] border border-line bg-muted/50 p-5 sm:p-10",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-grid opacity-70"
        style={{
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)",
        }}
      />
      <div className="relative w-full">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DecisionCard: the "payment card" of this product                     */
/* ------------------------------------------------------------------ */

const options = [
  { id: "fight", label: "Fight", sub: "Submit evidence", icon: Gavel, score: 0.91 },
  { id: "settle", label: "Settle", sub: "Offer partial refund", icon: HandCoins, score: 0.06 },
  { id: "refund", label: "Refund", sub: "Accept the claim", icon: Undo2, score: 0.03 },
] as const;

export function DecisionCard() {
  const c = featuredCase;
  return (
    <div className="relative mx-auto max-w-[400px]">
      <Surface className="p-5">
        <div className="flex items-center justify-between">
          <span className="t-label">Amount at risk</span>
          <Badge tone="warn">
            <Clock3 strokeWidth={2} className="size-2.5" /> {c.daysLeft} days left
          </Badge>
        </div>
        <p className="mt-2 font-serif text-[46px] leading-none text-fg tabular-nums">{c.amount}</p>
        <div className="mt-1 flex items-center gap-2 text-[12.5px] text-fg-body">
          <Avatar name={c.buyer} size={18} />
          {c.buyer} · {c.reason}
        </div>

        <ul className="mt-5 space-y-2">
          {options.map((o, i) => (
            <li
              key={o.id}
              className={cn(
                "flex items-center gap-3 rounded-[10px] border p-2.5",
                i === 0 ? "border-fg/80 bg-subtle shadow-[0_0_0_3px_rgba(28,25,20,0.05)]" : "border-line",
              )}
            >
              <IconTile dark={i === 0} className="size-7 rounded-md">
                <o.icon strokeWidth={1.6} className="size-3.5" />
              </IconTile>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-fg">{o.label}</span>
                <span className="block text-[11.5px] text-fg-muted">{o.sub}</span>
              </span>
              <span className="w-16">
                <span className="block text-right font-mono text-[11px] tabular-nums text-fg-body">{Math.round(o.score * 100)}%</span>
                <span className="mt-1 block h-1 rounded-full bg-muted">
                  <span className={cn("block h-full rounded-full", i === 0 ? "bg-fg" : "bg-line-strong")} style={{ width: `${o.score * 100}%` }} />
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ok">
            <ShieldCheck strokeWidth={1.75} className="size-3.5" /> Seller Protection met
          </span>
          <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-fg px-3 text-[12px] font-medium text-white shadow-[inset_0_0.75px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.25)]">
            Review draft <ArrowRight strokeWidth={1.75} className="size-3.5" />
          </span>
        </div>
      </Surface>

      {/* floating detail: model explanation tooltip */}
      <div className="absolute -top-4 -right-2 hidden max-w-[210px] rounded-lg bg-fg px-3 py-2 text-[11.5px] leading-4 text-white shadow-float sm:block md:-right-10">
        <span className="mb-1 flex items-center gap-1 font-medium">
          <Sparkles strokeWidth={1.75} className="size-3" /> Why fight?
        </span>
        <span className="text-white/70">Carrier confirms delivery to the PayPal shipping address.</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Seller account card (the "AccountCard")                             */
/* ------------------------------------------------------------------ */

export function SellerAccountCard({ account }: { account: (typeof sellerAccounts)[number] }) {
  return (
    <Surface className="p-4">
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-8 items-center justify-center rounded-lg text-[13px] font-semibold text-fg-heading"
          style={{ background: account.tone }}
        >
          {account.name[0]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-fg">{account.name}</span>
          <span className="block font-mono text-[10.5px] text-fg-muted">Merchant {account.merchant}</span>
        </span>
        <Badge tone="ok" dot>
          Connected
        </Badge>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line-subtle pt-3">
        <div>
          <dt className="text-[10.5px] text-fg-muted">Open</dt>
          <dd className="mt-0.5 text-[15px] font-medium tabular-nums text-fg">{account.open}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10.5px] text-fg-muted">At risk</dt>
          <dd className="mt-0.5 font-mono text-[14px] font-medium tabular-nums text-fg">{account.atRisk}</dd>
        </div>
      </dl>
    </Surface>
  );
}

/* ------------------------------------------------------------------ */
/* Bento helpers                                                       */
/* ------------------------------------------------------------------ */

/** Live list of PayPal webhook events. */
export function WebhookFeed() {
  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
        <span className="text-[12px] font-medium text-fg">Webhook events</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-ok">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-ok" /> Listening
        </span>
      </div>
      <ul className="divide-y divide-line-subtle">
        {webhookEvents.map((e) => (
          <li key={e.type + e.time} className="flex items-center gap-3 px-3.5 py-2.5">
            <Badge tone={e.type.endsWith("RESOLVED") ? "ok" : e.type.endsWith("CREATED") ? "info" : "neutral"}>200</Badge>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-heading">{e.type}</span>
            <span className="hidden font-mono text-[10.5px] text-fg-muted sm:inline">{e.id}</span>
            <span className="font-mono text-[10.5px] tabular-nums text-fg-muted">{e.time}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

/** Bar chart of disputes by days-to-deadline (pure CSS, no chart library). */
export function MiniChart({ data, className }: { data: { label: string; value: number; tone?: "bad" | "warn" }[]; className?: string }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className={cn("flex h-[120px] items-end gap-1.5", className)}>
      {data.map((d) => (
        <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <div
            className={cn(
              "w-full rounded-t-[4px]",
              d.tone === "bad" ? "bg-accent" : d.tone === "warn" ? "bg-accent/45" : "bg-fg-heading/80",
            )}
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <span className="font-mono text-[9.5px] text-fg-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Approve / reject pair used in the "human in the loop" stat card. */
export function ApprovalChip() {
  return (
    <div className="inline-flex items-center gap-1.5 self-start rounded-[10px] border border-line bg-canvas p-1 shadow-card">
      <span className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] text-fg-body ring-1 ring-line">
        <RotateCcw strokeWidth={1.75} className="size-3" /> Reject
      </span>
      <span className="inline-flex h-7 items-center gap-1 rounded-md bg-fg px-2.5 text-[12px] font-medium text-white">
        <Check strokeWidth={2} className="size-3" /> Approve
      </span>
    </div>
  );
}
