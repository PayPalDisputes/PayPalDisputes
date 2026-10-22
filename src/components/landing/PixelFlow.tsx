"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { CELL, INK, PITCH, SIGNAL, cellRandom, noise3, runCanvas } from "./pixel";

/**
 * "Scattered to ordered": dots spread wide and faint on the left gather into one tight, dark
 * line on the right, flowing slowly left to right. Used for the process and evidence sections.
 */
export function PixelFlow({ className, seed = 0 }: { className?: string; seed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return runCanvas(canvas, (ctx, width, height, t) => {
      ctx.clearRect(0, 0, width, height);
      const cols = Math.floor(width / PITCH);
      const rows = Math.floor(height / PITCH);
      const mid = (rows - 1) / 2;
      const shift = Math.floor(t * 2.5); // cells per second the stream moves right

      for (let x = 0; x < cols; x++) {
        const p = x / Math.max(cols - 1, 1); // 0 left → 1 right
        const order = Math.min(1, Math.max(0, (p - 0.15) / 0.6)) ** 1.4; // how organised this column is
        const spread = mid * (1 - order) + 1.2 * order; // wide on the left, about three rows on the right
        const density = 0.18 + 0.62 * order;
        const sx = x - shift; // sample position that moves with the stream

        for (let y = 0; y < rows; y++) {
          const d = Math.abs(y - mid) / Math.max(spread, 0.6);
          if (d > 1.6) continue;
          const wobble = noise3(sx * 0.18, y * 0.25, t * 0.15 + seed) * 0.5;
          const chance = density * Math.exp(-d * d * 1.6) + wobble * (1 - order) * 0.25;
          if (cellRandom(sx, y, seed) > chance) continue;
          // gaps in the finished line read as separate items in a queue
          if (order > 0.95 && ((sx % 9) + 9) % 9 === 0) continue;

          const tone = Math.min(4, 1 + Math.floor(order * 3.2 + cellRandom(sx, y, seed + 1) * 0.9));
          ctx.fillStyle = order > 0.97 && cellRandom(sx, y, seed + 2) < 0.04 ? SIGNAL : INK[tone];
          ctx.fillRect(x * PITCH + 1, y * PITCH + 1, CELL, CELL);
        }
      }
    });
  }, [seed]);

  return <canvas ref={ref} aria-hidden className={cn("block w-full", className)} />;
}
