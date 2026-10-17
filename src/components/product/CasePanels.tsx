import { Check, Clock3, Copy, ExternalLink, Paperclip, PenLine, Sparkles, X } from "lucide-react";
import { featuredCase, upcomingDeadlines } from "@/data/dashboard";
import { cn } from "@/lib/cn";
import { Avatar, Badge, IconTile } from "../ui/primitives";

/** Right-hand detail column of the hero dashboard. */
export function PanelShell({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <aside className="flex w-full flex-col border-line lg:w-[300px] lg:shrink-0 lg:border-l">
      <div className="flex h-11 items-center gap-2 border-b border-line px-3.5">
        <span className="font-mono text-[11px] text-fg-muted">#</span>
        {title}
        <span className="ml-auto inline-flex size-6 items-center justify-center rounded-md border border-line text-fg-muted">
          <X strokeWidth={1.6} className="size-3.5" />
        </span>
      </div>
      <div className="flex-1 p-3.5">{children}</div>
    </aside>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-medium text-fg-muted">{children}</p>;
}

const factTone = { ok: "text-ok", warn: "text-warn", neutral: "text-fg-body" } as const;

/** Decision + key facts + agent timeline for the featured case. */
export function AssessmentPanel() {
  const c = featuredCase;
  return (
    <PanelShell
      title={
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-fg-body">
          {c.id}
          <ExternalLink strokeWidth={1.6} className="size-3 text-fg-muted" />
        </span>
      }
    >
      <PanelLabel>AI assessment</PanelLabel>
      <div className="rounded-lg border border-line p-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <IconTile dark className="size-6 rounded-md">
              <Sparkles strokeWidth={1.75} className="size-3.5" />
            </IconTile>
            <span className="text-[13px] font-medium text-fg">Fight this dispute</span>
          </span>
          <span className="font-mono text-[11px] tabular-nums text-fg-body">{Math.round(c.confidence * 100)}%</span>
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-fg" style={{ width: `${c.confidence * 100}%` }} />
        </div>
        <p className="mt-2.5 text-[11.5px] leading-[17px] text-fg-body">
          Tracking shows delivery to the buyer&apos;s PayPal address and the order meets Seller Protection.
        </p>
      </div>

      <dl className="mt-3 divide-y divide-line-subtle rounded-lg bg-subtle px-3">
        {c.facts.map((f) => (
          <div key={f.label} className="flex h-8 items-center justify-between text-[11.5px]">
            <dt className="text-fg-muted">{f.label}</dt>
            <dd className={cn("font-medium", factTone[f.tone])}>{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <PanelLabel>Agent activity</PanelLabel>
        <ol className="relative space-y-3 pl-5">
          <span aria-hidden className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-line" />
          {c.timeline.map((t, i) => (
            <li key={t.title} className="relative">
              <span
                aria-hidden
                className={cn(
                  "absolute top-[3px] -left-5 size-[11px] rounded-full border-2 border-canvas",
                  i === c.timeline.length - 1 ? "bg-info" : "bg-fg-heading",
                )}
              />
              <p className="text-[11.5px] leading-4 text-fg">{t.title}</p>
              <p className="text-[10.5px] text-fg-muted">{t.meta}</p>
            </li>
          ))}
        </ol>
      </div>
    </PanelShell>
  );
}

/** The drafted evidence response, waiting for approval. */
export function DraftPanel() {
  const c = featuredCase;
  return (
    <PanelShell title={<span className="text-[12px] font-medium text-fg">Response draft</span>}>
      <div className="flex items-center gap-2">
        <Avatar name={c.buyer} size={22} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-fg">{c.buyer}</p>
          <p className="text-[10.5px] text-fg-muted">
            {c.reason} · {c.amount}
          </p>
        </div>
        <Badge tone="info" dot>
          Drafted
        </Badge>
      </div>

      <div className="mt-3.5 flex gap-1 rounded-lg bg-muted p-0.5 text-[11px]">
        <span className="flex-1 rounded-md bg-canvas py-1 text-center font-medium text-fg shadow-[0_1px_2px_rgba(28,25,20,0.08)]">
          Submit evidence
        </span>
        <span className="flex-1 py-1 text-center text-fg-body">Message buyer</span>
      </div>

      <div className="mt-3 rounded-lg border border-line">
        <div className="flex items-center justify-between border-b border-line-subtle px-2.5 py-1.5">
          <span className="inline-flex items-center gap-1 text-[10.5px] text-fg-muted">
            <PenLine strokeWidth={1.6} className="size-3" /> To PayPal
          </span>
          <Copy strokeWidth={1.6} className="size-3 text-fg-muted" />
        </div>
        <p className="px-2.5 py-2.5 text-[11.5px] leading-[17px] text-fg-heading">{c.draft}</p>
        <div className="flex flex-wrap gap-1.5 border-t border-line-subtle px-2.5 py-2">
          {["ups-tracking.pdf", "proof-of-delivery.png"].map((f) => (
            <span key={f} className="inline-flex items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-fg-body ring-1 ring-line ring-inset">
              <Paperclip strokeWidth={1.6} className="size-2.5" />
              {f}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-right font-mono text-[10px] text-fg-muted">{c.draft.length} / 2000</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <span className="inline-flex h-8 items-center justify-center rounded-lg text-[12px] font-medium text-fg-body ring-1 ring-line">
          Reject
        </span>
        <span className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-fg text-[12px] font-medium text-white shadow-[inset_0_0.75px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.25)]">
          <Check strokeWidth={2} className="size-3.5" /> Approve &amp; send
        </span>
      </div>
      <p className="mt-2.5 text-center text-[10.5px] text-fg-muted">Nothing is sent to PayPal until you approve.</p>
    </PanelShell>
  );
}

/** Upcoming seller-response deadlines. */
export function DeadlinesPanel() {
  return (
    <PanelShell title={<span className="text-[12px] font-medium text-fg">Respond by</span>}>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { n: "2", l: "≤ 3 days", tone: "text-bad" },
          { n: "3", l: "This week", tone: "text-warn" },
          { n: "7", l: "Later", tone: "text-fg" },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-line px-2.5 py-2">
            <p className={cn("text-[17px] font-medium tabular-nums tracking-tight", s.tone)}>{s.n}</p>
            <p className="text-[10.5px] text-fg-muted">{s.l}</p>
          </div>
        ))}
      </div>
      <PanelLabel>Next up</PanelLabel>
      <ul className="divide-y divide-line-subtle rounded-lg border border-line">
        {upcomingDeadlines.map((d) => (
          <li key={d.buyer} className="flex items-center gap-2 px-2.5 py-2">
            <Avatar name={d.buyer} size={20} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] text-fg">{d.buyer}</p>
              <p className="truncate text-[10.5px] text-fg-muted">
                {d.reason} · {d.stage}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-mono text-[10.5px] tabular-nums",
                d.daysLeft <= 3 ? "text-bad" : d.daysLeft <= 7 ? "text-warn" : "text-fg-body",
              )}
            >
              <Clock3 strokeWidth={1.75} className="size-3" />
              {d.daysLeft}d
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-md bg-bad-bg px-2.5 py-2 text-[11px] leading-4 text-bad">
        Nova Labs moved to chargeback. PayPal decides if you don&apos;t respond in 2 days.
      </p>
    </PanelShell>
  );
}
