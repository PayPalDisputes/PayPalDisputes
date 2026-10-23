import { cn } from "@/lib/cn";

/**
 * A slow strip of the kinds of things Sira does on a case, after ramp.com's "Agents at work"
 * ticker. Illustrative actions, not live counts. Pauses on hover; still for reduced motion.
 */
export function ActivityTicker({ items, label, className }: { items: { action: string; detail: string }[]; label: string; className?: string }) {
  const row = (hidden?: boolean) => (
    <ul aria-hidden={hidden} className="flex shrink-0 items-center gap-8 pr-8">
      {items.map((it) => (
        <li key={it.action + it.detail} className="flex items-center gap-2.5 whitespace-nowrap">
          <span className="font-mono text-[10.5px] tracking-[0.1em] text-[#77736c] uppercase">{it.action}</span>
          <span className="rounded-md border border-[#141312]/[0.08] bg-white px-2 py-0.5 text-[12px] text-[#141312]">{it.detail}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={cn("flex items-center gap-6 overflow-hidden", className)}>
      <p className="flex shrink-0 items-center gap-2 font-mono text-[10.5px] tracking-[0.12em] text-[#141312] uppercase">
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#0070E0]/40 motion-reduce:hidden" />
          <span className="relative size-2 rounded-full bg-[#0070E0]" />
        </span>
        {label}
      </p>
      <div className="group relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
        <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused] [animation-duration:45s]">
          {row()}
          {row(true)}
        </div>
      </div>
    </div>
  );
}
