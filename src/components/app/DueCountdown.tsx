"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "2d 14h", "5h 03m", "12m": the two largest units of a duration. */
function span(ms: number) {
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / MIN);
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${Math.max(m, 1)}m`;
}

/**
 * Live countdown to the seller's response deadline. Red under a day (and once overdue), amber under
 * three days. Ticks every 30s; renders nothing until mounted so server and client agree.
 */
export function DueCountdown({ dueAt, className }: { dueAt: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const due = new Date(dueAt);
  const dueText = due.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const left = now === null ? null : due.getTime() - now;
  const tone = left === null ? "" : left < DAY ? "border-bad/25 bg-bad-bg text-bad" : left < 3 * DAY ? "border-warn/25 bg-warn-bg text-warn" : "border-line bg-canvas text-fg";

  return (
    <div role="timer" aria-live="off" className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", tone, className)}>
      <Clock aria-hidden strokeWidth={1.8} className="size-[18px] shrink-0" />
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-[17px] font-medium tabular-nums">
          {left === null ? "—" : left < 0 ? `Overdue by ${span(-left)}` : `${span(left)} left`}
        </span>
        <span className="text-[13px] opacity-80">
          {left !== null && left < 0 ? `was due ${dueText} · PayPal may close it in the buyer's favour` : `to respond · due ${dueText}`}
        </span>
      </span>
    </div>
  );
}
