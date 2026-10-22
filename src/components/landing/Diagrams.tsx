import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { PlayFrame as Frame } from "./PlayFrame";

/**
 * Small drawings for the "how it works" cards: each one sketches the real step (fictional example
 * data) and acts it out when scrolled into view. Decorative: the card's text says the same thing.
 */

const line = "border border-[#141312]/[0.12]";
/** Delay for the nth beat of an illustration. */
const at = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
const bar = (w: string, ms: number) => (
  <span className="play-bar block h-1.5 rounded-full bg-[#141312]/[0.08]" style={{ width: w, ...at(ms) }} />
);

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
        <span className="play-bar hidden h-px flex-1 border-t border-dashed border-[#141312]/25 sm:block" style={at(100)} />
        <div className={cn(line, "w-full divide-y divide-[#141312]/[0.08] rounded-lg bg-white sm:w-[64%]")}>
          {rows.map((r, i) => (
            <div key={r.reason} className="play-item flex items-center gap-2 px-3 py-2.5 text-[11px]" style={at(450 + i * 220)}>
              <span className="flex-1 truncate">{r.reason}</span>
              <span className="text-[#77736c] tabular-nums">{r.amount}</span>
              <span
                className={cn(
                  "w-7 rounded px-1 py-0.5 text-center font-mono text-[9.5px]",
                  r.urgent ? "play-press bg-[#0070E0] text-white" : "bg-[#141312]/[0.06] text-[#55524d]",
                )}
                style={r.urgent ? at(1400) : undefined}
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
          {items.map((it, i) => (
            <li key={it.label} className="play-item flex items-center gap-2.5" style={at(300 + i * 380)}>
              <span
                className={cn(
                  "grid size-4 place-items-center rounded-full",
                  it.ok ? "bg-[#0070E0] text-white" : "border border-dashed border-[#141312]/40 text-[#77736c]",
                )}
              >
                {it.ok ? <Check className="size-2.5" strokeWidth={3} /> : <Minus className="size-2.5" strokeWidth={3} />}
              </span>
              <span className={it.ok ? "" : "text-[#77736c]"}>{it.label}</span>
              {!it.ok && (
                <span className="play-item ml-auto font-mono text-[9.5px] tracking-[0.08em] text-[#b4552f] uppercase" style={at(300 + i * 380 + 350)}>
                  Missing
                </span>
              )}
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
          <p className="play-item mt-2 text-[20px] tracking-[-0.02em]" style={at(250)}>
            Fight
          </p>
          <div className="mt-3 space-y-1.5">
            {bar("90%", 500)}
            {bar("75%", 650)}
            {bar("82%", 800)}
          </div>
        </div>
        <div className={cn(line, "rounded-lg bg-white p-3.5")}>
          <p className="font-mono text-[9.5px] tracking-[0.12em] text-[#9a968e] uppercase">Draft to PayPal</p>
          <div className="mt-3 space-y-1.5">
            {bar("100%", 1000)}
            {bar("92%", 1200)}
            {bar("96%", 1400)}
            {bar("60%", 1600)}
          </div>
          <div className="mt-3 flex gap-1.5">
            {["tracking.pdf", "invoice.pdf"].map((f, i) => (
              <span key={f} className={cn(line, "play-item rounded px-1.5 py-0.5 text-[9.5px] text-[#55524d]")} style={at(1900 + i * 180)}>
                {f}
              </span>
            ))}
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
        <div className="relative h-4 text-[11px] text-[#55524d]">
          <span className="play-swap-out absolute inset-0 flex items-center gap-2" style={at(1700)}>
            <span className="size-1.5 rounded-full bg-[#b4552f]" />
            Waiting for your approval
          </span>
          <span className="play-swap-in absolute inset-0 flex items-center gap-2" style={at(1800)}>
            <span className="size-1.5 rounded-full bg-[#0070E0]" />
            Sent to PayPal
          </span>
        </div>
        <div className="mt-3 space-y-1.5">
          {bar("100%", 200)}
          {bar("88%", 350)}
          {bar("70%", 500)}
        </div>
        <div className="mt-4 flex gap-1.5 text-[11px]">
          <span className="play-press rounded-full bg-[#141312] px-3 py-1.5 text-white" style={at(1300)}>
            Approve
          </span>
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
