import { site } from "@/data/site";
import { cn } from "@/lib/cn";

type Tone = "dark" | "light";

/**
 * Placeholder brand mark: a queue of three cases, the top one resolved. Swap for your own SVG.
 * `tone="light"` is for dark or coloured backgrounds: a white tile with the bars in PayPal blue.
 */
export function LogoMark({ className, tone = "dark" }: { className?: string; tone?: Tone }) {
  const tile = tone === "light" ? "#fff" : "var(--mk-fg)";
  const bar = tone === "light" ? "#0062CC" : "#fff";
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)}>
      <rect width="24" height="24" rx="6.5" fill={tile} />
      <rect x="6" y="6.5" width="12" height="2.6" rx="1.3" fill={bar} />
      <rect x="6" y="10.7" width="8.5" height="2.6" rx="1.3" fill={bar} fillOpacity="0.62" />
      <rect x="6" y="14.9" width="5" height="2.6" rx="1.3" fill={bar} fillOpacity="0.34" />
    </svg>
  );
}

export function Logo({ className, tone = "dark" }: { className?: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark tone={tone} />
      <span className={cn("text-[17px] font-semibold tracking-[-0.02em] transition-colors duration-300", tone === "light" ? "text-white" : "text-fg")}>
        {site.name}
      </span>
    </span>
  );
}
