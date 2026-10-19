import { site } from "@/data/site";
import { cn } from "@/lib/cn";

/** Placeholder brand mark: a queue of three cases, the top one resolved. Swap for your own SVG. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)}>
      <rect width="24" height="24" rx="6.5" fill="var(--mk-fg)" />
      <rect x="6" y="6.5" width="12" height="2.6" rx="1.3" fill="#fff" />
      <rect x="6" y="10.7" width="8.5" height="2.6" rx="1.3" fill="#fff" fillOpacity="0.62" />
      <rect x="6" y="14.9" width="5" height="2.6" rx="1.3" fill="#fff" fillOpacity="0.34" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-fg">{site.name}</span>
    </span>
  );
}
