import { site } from "@/data/site";
import { cn } from "@/lib/cn";

/** One olive branch of the laurel (the left half); the right half is its mirror image. */
const BRANCH = (
  <>
    <path d="M8.6 24.6C6.8 25.5 5 24 6.3 22.6C13 16.5 21 10.5 29.2 6.6" fill="none" stroke="#4a5824" strokeWidth=".9" strokeLinecap="round"/>
    <g transform="translate(8.86 21.07) rotate(-69.0)"><path d="M0 0C1.79 -1.75 4.48 -1.84 6.40 0C4.48 1.31 1.79 1.49 0 0Z" fill="#7f9148" stroke="#3a4520" strokeWidth=".32"/><path d="M0.77 0L5.25 0" stroke="#3a4520" strokeWidth=".22" strokeOpacity=".6"/></g>
    <g transform="translate(13.53 16.79) rotate(-62.1)"><path d="M0 0C2.18 -2.10 5.46 -2.21 7.80 0C5.46 1.58 2.18 1.78 0 0Z" fill="#7f9148" stroke="#3a4520" strokeWidth=".32"/><path d="M0.94 0L6.40 0" stroke="#3a4520" strokeWidth=".22" strokeOpacity=".6"/></g>
    <g transform="translate(19.11 12.51) rotate(-54.9)"><path d="M0 0C2.46 -2.35 6.16 -2.47 8.80 0C6.16 1.76 2.46 2.00 0 0Z" fill="#7f9148" stroke="#3a4520" strokeWidth=".32"/><path d="M1.06 0L7.22 0" stroke="#3a4520" strokeWidth=".22" strokeOpacity=".6"/></g>
    <g transform="translate(17.27 13.82) rotate(-10.6)"><path d="M0 0C1.85 -1.80 4.62 -1.89 6.60 0C4.62 1.35 1.85 1.53 0 0Z" fill="#93a35e" stroke="#3a4520" strokeWidth=".32"/><path d="M0.79 0L5.41 0" stroke="#3a4520" strokeWidth=".22" strokeOpacity=".6"/></g>
    <g transform="translate(25.77 8.36) rotate(-44.7)"><path d="M0 0C2.45 -2.90 6.13 -3.04 8.76 0C6.13 2.17 2.45 2.46 0 0Z" fill="#7f9148" stroke="#3a4520" strokeWidth=".32"/><path d="M1.05 0L7.18 0" stroke="#3a4520" strokeWidth=".22" strokeOpacity=".6"/></g>
    <ellipse cx="15.99" cy="16.19" rx="1.4" ry="1.1" transform="rotate(-32 15.99 16.19)" fill="#3a4520"/>
    <ellipse cx="15.49" cy="15.79" rx=".45" ry=".28" transform="rotate(-32 15.49 15.79)" fill="#fff" fillOpacity=".55"/>
  </>
);

/**
 * Sira's mark: an olive laurel arch, two branches meeting in a peak, each with one olive.
 * Laurel for a dispute won; olive for the dashboard's colour.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="3.5 0.5 57 26" aria-hidden className={cn("h-5 w-auto", className)}>
      <g>{BRANCH}</g>
      <g transform="translate(64 0) scale(-1 1)">{BRANCH}</g>
    </svg>
  );
}

/** The laurel sitting on top of a bold lowercase wordmark, the word tucked into the arch's hollow. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-center", className)}>
      <LogoMark className="h-[25px]" />
      <span className="-mt-[9px] text-[20px] leading-none font-bold tracking-[-0.03em] text-fg">{site.name.toLowerCase()}</span>
    </span>
  );
}
