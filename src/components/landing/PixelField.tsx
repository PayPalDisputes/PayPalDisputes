"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { CELL, INK, PITCH, SIGNAL, cellRandom, fbm, runCanvas } from "./pixel";

/**
 * Full-bleed band of square dots under the hero: slow diagonal bands of ink that dissolve into
 * uneven drips at the bottom edge. Decorative only (aria-hidden), and still for reduced motion.
 */
export function PixelField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return runCanvas(canvas, (ctx, width, height, t) => {
      ctx.clearRect(0, 0, width, height);
      const cols = Math.ceil(width / PITCH);
      const rows = Math.floor(height / PITCH);
      const drift = t * 0.06;

      for (let x = 0; x < cols; x++) {
        // Each column ends at its own depth, which is what makes the bottom edge drip.
        const depth = rows * (0.5 + 0.38 * cellRandom(x, 0, 3)) + 4 * Math.sin(x * 0.09 + t * 0.15);
        for (let y = 0; y < rows; y++) {
          let keep = 1;
          if (y > depth) {
            const below = (y - depth) / (rows - depth + 1);
            keep = cellRandom(x, y, 5) < 0.55 * (1 - below) ** 2.5 ? 1 : 0; // stray drops past the edge
          }
          if (!keep) continue;

          // Diagonal bands plus soft noise, drifting slowly to the right.
          const diag = (x - y * 1.6) / cols;
          const v = 0.55 * fbm(x * 0.035 - drift, y * 0.05, t * 0.04) + 0.45 * (0.5 + 0.5 * Math.sin(diag * 7.5 - t * 0.12));
          if (v < 0.36) continue;
          if (cellRandom(x, y, Math.floor(t * 0.5)) < 0.12) continue; // a little texture

          let color: string;
          if (v > 0.86 && cellRandom(x, y, 9) < 0.03) color = SIGNAL;
          else if (v > 0.78) color = INK[4];
          else if (v > 0.66) color = INK[3];
          else if (v > 0.52) color = INK[2];
          else color = INK[1];

          ctx.fillStyle = color;
          ctx.fillRect(x * PITCH + 1, y * PITCH + 1, CELL, CELL);
        }
      }
    });
  }, []);

  return <canvas ref={ref} aria-hidden className={cn("block w-full", className)} />;
}
