import { site } from "@/data/site";
import { cn } from "@/lib/cn";

/** One isometric plate (a rhombus twice as wide as it is tall), with its top point at (12, y). */
const plate = (y: number) => `M12 ${y} L22 ${y + 5} L12 ${y + 10} L2 ${y + 5} Z`;

/** Small diamond, used as the pixel "dither" on the top plate. */
const dot = (x: number, y: number, r = 0.9) => `M${x} ${y - r} L${x + r * 2} ${y} L${x} ${y + r} L${x - r * 2} ${y} Z`;

/** The top case's dither: [x, y, radius, opacity] for each diamond. */
const DITHER: [number, number, number, number][] = [
  [8.5, 7.6, 0.55, 0.95],
  [10, 6.6, 0.45, 0.85],
  [11.6, 7.8, 0.5, 0.9],
  [13, 6.2, 0.4, 0.7],
  [14.2, 7.6, 0.45, 0.75],
  [12.6, 9, 0.35, 0.55],
  [15.6, 6.9, 0.35, 0.5],
  [10.6, 8.9, 0.35, 0.6],
  [9.6, 5.9, 0.3, 0.5],
  [16.6, 8, 0.3, 0.4],
];

/**
 * Sira's mark: the landing page's case stack, shrunk to four isometric plates in the dispute-stage
 * colours (new → evidence → response filed → settled, top to bottom), with a few pixel diamonds on
 * the top case like the hero's dither.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)}>
      <g stroke="#fff" strokeWidth="0.9" strokeLinejoin="round">
        <path d={plate(12.6)} fill="var(--mk-stage-settled, #b4c3d8)" />
        <path d={plate(9.2)} fill="var(--mk-stage-filed, #009cde)" />
        <path d={plate(5.8)} fill="var(--mk-stage-evidence, #0070e0)" />
        <path d={plate(2.4)} fill="var(--mk-stage-new, #003087)" />
      </g>
      <g fill="#fff">
        {DITHER.map(([x, y, r, o]) => (
          <path key={`${x},${y}`} d={dot(x, y, r)} fillOpacity={o} />
        ))}
      </g>
    </svg>
  );
}

/** Mark plus a bold lowercase wordmark (in the spirit of lora.finance). */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[19px] leading-none font-bold tracking-[-0.03em] text-fg">{site.name.toLowerCase()}</span>
    </span>
  );
}
