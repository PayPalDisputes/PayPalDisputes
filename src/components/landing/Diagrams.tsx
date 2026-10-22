import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Small line drawings for the "how it works" cards: each one sketches the real step (fictional
 * example data) in thin monochrome lines. Decorative: the card's text says the same thing.
 */

const line = "border border-[#141312]/[0.12]";
const bar = (w: string, tone = "bg-[#141312]/[0.08]") => <span className={cn("block h-1.5 rounded-full", tone)} style={{ width: w }} />;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden className="flex h-56 items-center justify-center rounded-xl bg-[#f7f7f5] px-6 sm:h-64">
      {children}
    </div>
  );
}

export function ReadDiagram() {
  const rows = [
    { reason: "Item not received", amount: "$2,875.50", days: "2d", urgent: true },
    { reason: "Unauthorized", amount: "$1,240.00", days: "6d" },
    { reason: "Not as described", amount: "$1,309.00", days: "11d" },
  ];
  return (
    <Frame>
      <div className="flex w-full max-w-sm items-center gap-3">
        <div className="hidden shrink-0 flex-col items-center gap-1.5 sm:flex">
          <span className={cn(line, "rounded-full bg-white px-2.5 py-1 text-[11px]")}>PayPal</span>
          <span className="font-mono text-[9px] tracking-[0.1em] text-[#9a968e] uppercase">15 min</span>
        </div>
        <span className="hidden h-px flex-1 border-t border-dashed border-[#141312]/25 sm:block" />
        <div className={cn(line, "w-full sm:w-[64%] divide-y divide-[#141312]/[0.08] rounded-lg bg-white")}>
          {rows.map((r) => (
            <div key={r.reason} className="flex items-center gap-2 px-3 py-2.5 text-[11px]">
              <span className="flex-1 truncate">{r.reason}</span>
              <span className="text-[#77736c] tabular-nums">{r.amount}</span>
              <span
                className={cn(
                  "w-7 rounded px-1 py-0.5 text-center font-mono text-[9.5px]",
                  r.urgent ? "bg-[#141312] text-white" : "bg-[#141312]/[0.06] text-[#55524d]",
                )}
              >
                {r.days}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function CheckDiagram() {
  const items = [
    { label: "Tracking matches order", ok: true },
    { label: "Delivered before claim", ok: true },
    { label: "Ship-to matches PayPal", ok: true },
    { label: "Signature on delivery", ok: false },
  ];
  return (
    <Frame>
      <div className={cn(line, "w-full max-w-[17rem] rounded-lg bg-white p-4")}>
        <p className="font-mono text-[9.5px] tracking-[0.12em] text-[#9a968e] uppercase">Evidence</p>
        <ul className="mt-3 space-y-2.5 text-[11.5px]">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "grid size-4 place-items-center rounded-full",
                  it.ok ? "bg-[#141312] text-white" : "border border-dashed border-[#141312]/40 text-[#77736c]",
                )}
              >
                {it.ok ? <Check className="size-2.5" strokeWidth={3} /> : <Minus className="size-2.5" strokeWidth={3} />}
              </span>
              <span className={it.ok ? "" : "text-[#77736c]"}>{it.label}</span>
              {!it.ok && <span className="ml-auto font-mono text-[9.5px] tracking-[0.08em] text-[#b4552f] uppercase">Missing</span>}
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}

export function DraftDiagram() {
  return (
    <Frame>
      <div className="grid w-full max-w-sm grid-cols-[0.9fr_1.1fr] gap-3">
        <div className={cn(line, "rounded-lg bg-white p-3.5")}>
          <p className="font-mono text-[9.5px] tracking-[0.12em] text-[#9a968e] uppercase">Recommendation</p>
          <p className="mt-2 text-[20px] tracking-[-0.02em]">Fight</p>
          <div className="mt-3 space-y-1.5">
            {bar("90%")}
            {bar("75%")}
            {bar("82%")}
          </div>
        </div>
        <div className={cn(line, "rounded-lg bg-white p-3.5")}>
          <p className="font-mono text-[9.5px] tracking-[0.12em] text-[#9a968e] uppercase">Draft to PayPal</p>
          <div className="mt-3 space-y-1.5">
            {bar("100%")}
            {bar("92%")}
            {bar("96%")}
            {bar("60%")}
          </div>
          <div className="mt-3 flex gap-1.5">
            <span className={cn(line, "rounded px-1.5 py-0.5 text-[9.5px] text-[#55524d]")}>tracking.pdf</span>
            <span className={cn(line, "rounded px-1.5 py-0.5 text-[9.5px] text-[#55524d]")}>invoice.pdf</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function ApproveDiagram() {
  return (
    <Frame>
      <div className={cn(line, "w-full max-w-[17rem] rounded-lg bg-white p-4")}>
        <div className="flex items-center gap-2 text-[11px] text-[#55524d]">
          <span className="size-1.5 rounded-full bg-[#b4552f]" />
          Waiting for your approval
        </div>
        <div className="mt-3 space-y-1.5">
          {bar("100%")}
          {bar("88%")}
          {bar("70%")}
        </div>
        <div className="mt-4 flex gap-1.5 text-[11px]">
          <span className="rounded-full bg-[#141312] px-3 py-1.5 text-white">Approve</span>
          <span className={cn(line, "rounded-full px-3 py-1.5")}>Edit</span>
          <span className="rounded-full px-3 py-1.5 text-[#77736c]">Reject</span>
        </div>
      </div>
    </Frame>
  );
}

export const diagrams = {
  read: ReadDiagram,
  check: CheckDiagram,
  draft: DraftDiagram,
  approve: ApproveDiagram,
};
