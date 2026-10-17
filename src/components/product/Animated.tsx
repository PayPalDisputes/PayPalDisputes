"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, FileText, ImageIcon, ShieldCheck } from "lucide-react";
import { caseProfile, evidenceFiles, sellerAccounts } from "@/data/dashboard";
import { cn } from "@/lib/cn";
import { useInView, useReducedMotion } from "../motion/Reveal";
import { Avatar, Badge, StepIcon } from "../ui/primitives";
import { SellerAccountCard, Surface } from "./Cards";

/* ------------------------------------------------------------------ */
/* EvidenceCheck: files verified one after another (VerificationCard)  */
/* ------------------------------------------------------------------ */

/** Each file runs for ~1.1s then turns verified, and the next one starts. */
export function EvidenceCheck() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(0); // index of the file currently running; files.length = all done
  const step = reduced && inView ? evidenceFiles.length : running;

  useEffect(() => {
    if (!inView || reduced || running >= evidenceFiles.length) return;
    const t = setTimeout(() => setRunning((s) => s + 1), running === 0 ? 900 : 1100);
    return () => clearTimeout(t);
  }, [inView, reduced, running]);

  const allDone = step >= evidenceFiles.length;

  return (
    <div ref={ref} className="mx-auto max-w-[440px]">
      <Surface className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-[13px] font-medium text-fg">Evidence for PP-D-48213</span>
          <Badge tone={allDone ? "ok" : "neutral"} dot>
            {allDone ? "Ready to submit" : `Checking ${Math.min(step + 1, evidenceFiles.length)} of ${evidenceFiles.length}`}
          </Badge>
        </div>
        <ul className="divide-y divide-line-subtle">
          {evidenceFiles.map((f, i) => {
            const state = i < step ? "done" : i === step && inView ? "running" : "pending";
            const Icon = f.name.endsWith(".png") ? ImageIcon : FileText;
            return (
              <FileVerificationRow key={f.name} name={f.name} size={f.size} icon={<Icon strokeWidth={1.5} className="size-4" />} state={state}>
                {state === "done" ? f.done : state === "running" ? f.task + "…" : "Queued"}
              </FileVerificationRow>
            );
          })}
        </ul>
        <div className="flex items-center gap-2 border-t border-line bg-subtle px-4 py-3 text-[12px]">
          <ShieldCheck strokeWidth={1.75} className={cn("size-4 transition-colors duration-300", allDone ? "text-ok" : "text-fg-muted")} />
          <span className={cn("transition-colors duration-300", allDone ? "text-fg" : "text-fg-muted")}>
            {allDone ? "Seller Protection requirements met" : "Seller Protection check pending"}
          </span>
        </div>
      </Surface>
    </div>
  );
}

export function FileVerificationRow({
  name,
  size,
  icon,
  state,
  children,
}: {
  name: string;
  size: string;
  icon: React.ReactNode;
  state: "done" | "running" | "pending";
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-subtle text-fg-body">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate font-mono text-[12px] text-fg">{name}</span>
          <span className="shrink-0 text-[10.5px] text-fg-muted">{size}</span>
        </span>
        <span
          key={state}
          className={cn(
            "animate-fade-up block truncate text-[11.5px]",
            state === "done" ? "text-ok" : state === "running" ? "text-fg-body" : "text-fg-muted",
          )}
        >
          {children}
        </span>
      </span>
      <StepIcon state={state} />
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* OfferCalculator: the "FX converter" of this product                 */
/* ------------------------------------------------------------------ */

function useCountUp(target: number, run: boolean, duration = 1100) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration, reduced]);
  return reduced && run ? target : value;
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function OfferCalculator() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const disputed = 309;
  const offer = useCountUp(123.6, inView);
  const kept = useCountUp(185.4, inView);

  return (
    <div ref={ref} className="mx-auto max-w-[400px]">
      <Surface className="p-2">
        <AmountField label="Buyer is claiming" currency="AUD" value={fmt(disputed)} note="Not as described · Arc Systems" />
        <div className="relative z-10 -my-3 flex justify-center">
          <span className="flex size-8 items-center justify-center rounded-full border border-line bg-canvas text-fg-body shadow-card">
            <ArrowDownUp strokeWidth={1.6} className="size-3.5" />
          </span>
        </div>
        <AmountField
          label="Suggested offer"
          currency="AUD"
          value={fmt(offer)}
          note="40% partial refund · buyer keeps the item"
          badge={<Badge tone="ok">Recommended</Badge>}
          focused
        />
        <div className="mt-2 space-y-2 px-3 py-3 text-[12px]">
          <Row label="You keep" value={`A$${fmt(kept)}`} strong />
          <Row label="If you fight" value="Low chance · no tracking photos" />
          <Row label="If you refund in full" value={`−A$${fmt(disputed)}`} />
        </div>
      </Surface>
    </div>
  );
}

function AmountField({
  label,
  currency,
  value,
  note,
  badge,
  focused,
}: {
  label: string;
  currency: string;
  value: string;
  note: string;
  badge?: React.ReactNode;
  focused?: boolean;
}) {
  return (
    <div className={cn("rounded-[10px] border px-4 py-3.5", focused ? "border-line-strong bg-canvas shadow-[0_0_0_3px_rgba(28,25,20,0.04)]" : "border-line bg-subtle")}>
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] text-fg-muted">{label}</span>
        {badge}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="font-serif text-[38px] leading-none text-fg tabular-nums">
          {value}
          {focused && <span className="ml-0.5 inline-block h-6 w-px translate-y-1 animate-pulse bg-fg" />}
        </span>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-canvas px-2 text-[12px] font-medium text-fg">
          <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-fg-body">A$</span>
          {currency}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-fg-muted">{note}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-fg-muted">{label}</span>
      <span className={cn("tabular-nums", strong ? "font-medium text-fg" : "text-fg-body")}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SellerAccounts: a slow vertical carousel of connected sellers       */
/* ------------------------------------------------------------------ */

export function SellerAccounts() {
  const list = [...sellerAccounts, ...sellerAccounts]; // duplicated for a seamless loop
  return (
    <div
      className="mx-auto h-[380px] max-w-[380px] overflow-hidden"
      style={{
        maskImage: "linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)",
      }}
    >
      <div className="animate-slide-y space-y-3 py-1.5 hover:[animation-play-state:paused]">
        {list.map((a, i) => (
          <SellerAccountCard key={a.name + i} account={a} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CaseProfile: buyer/case panel with tabs (the "KYC profile")         */
/* ------------------------------------------------------------------ */

export function CaseProfile() {
  const [tab, setTab] = useState(0);
  const p = caseProfile;
  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4">
        <Avatar name={p.buyer} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-fg">{p.buyer}</p>
          <p className="truncate font-mono text-[11px] text-fg-muted">
            {p.email} · {p.since}
          </p>
        </div>
        <Badge tone="ok" dot>
          Low risk
        </Badge>
      </div>
      <div role="tablist" aria-label="Case details" className="mt-4 flex gap-4 overflow-x-auto border-b border-line px-4 [scrollbar-width:none]">
        {p.tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            type="button"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={cn(
              "relative shrink-0 pb-2.5 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-fg",
              tab === i ? "font-medium text-fg" : "text-fg-muted hover:text-fg-body",
            )}
          >
            {t.label}
            {tab === i && <span className="absolute inset-x-0 -bottom-px h-px bg-fg" />}
          </button>
        ))}
      </div>
      <dl key={tab} className="animate-fade-up divide-y divide-line-subtle px-4">
        {p.tabs[tab].rows.map((r) => (
          <div key={r.label} className="flex h-9 items-center justify-between text-[12px]">
            <dt className="text-fg-muted">{r.label}</dt>
            <dd className="text-fg">{r.value}</dd>
          </div>
        ))}
      </dl>
    </Surface>
  );
}
