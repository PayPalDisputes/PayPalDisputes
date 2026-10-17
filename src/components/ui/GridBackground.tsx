import { cn } from "@/lib/cn";

/**
 * Barely-visible square grid drawn with CSS gradients, faded at the edges with a mask.
 * Place inside a `relative` parent; it fills it and ignores pointer events.
 */
export function GridBackground({
  className,
  fade = "y",
}: {
  className?: string;
  /** "y" fades top and bottom, "radial" fades from the center outward. */
  fade?: "y" | "radial";
}) {
  const mask =
    fade === "radial"
      ? "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)"
      : "linear-gradient(to bottom, transparent, black 12%, black 70%, transparent)";
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 bg-grid", className)}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    />
  );
}
