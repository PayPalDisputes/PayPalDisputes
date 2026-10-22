"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { CELL, INK, PITCH, cellRandom, heatColor, runCanvas } from "./pixel";

const GLYPH_ROWS = 11; // text height in cells

/**
 * Words set in square dots, scrolling slowly to the left in a loop. The text is rendered once to
 * a tiny offscreen canvas and each lit pixel becomes a dot; the cursor leaves a fading trail over
 * them. Screen readers get `text` instead.
 */
export function PixelMarquee({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    // Rasterise the phrase at GLYPH_ROWS px tall, then read back which pixels are lit.
    const phrase = `${text}   ·   `;
    const off = document.createElement("canvas");
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) return;
    const font = `600 ${GLYPH_ROWS + 3}px ui-monospace, "Geist Mono", monospace`;
    octx.font = font;
    const glyphWidth = Math.ceil(octx.measureText(phrase).width);
    off.width = glyphWidth;
    off.height = GLYPH_ROWS;
    octx.font = font;
    octx.textBaseline = "top";
    octx.fillStyle = "#000";
    octx.fillText(phrase, 0, -2);
    const data = octx.getImageData(0, 0, glyphWidth, GLYPH_ROWS).data;
    const lit = (gx: number, gy: number) => data[(gy * glyphWidth + gx) * 4 + 3] > 110;

    return runCanvas(
      canvas,
      (ctx, width, height, t, heat) => {
        ctx.clearRect(0, 0, width, height);
        const cols = Math.ceil(width / PITCH);
        const top = Math.max(0, Math.floor((height / PITCH - GLYPH_ROWS) / 2));
        const offset = Math.floor(t * 3); // about 3 cells a second
        const rows = Math.ceil(height / PITCH);
        for (let x = 0; x < cols; x++) {
          for (let y = 0; y < rows; y++) {
            const hot = heatColor(heat(x, y));
            if (!hot) continue;
            ctx.fillStyle = hot;
            ctx.fillRect(x * PITCH + 1, y * PITCH + 1, CELL, CELL);
          }
          const gx = (((x + offset) % glyphWidth) + glyphWidth) % glyphWidth;
          for (let gy = 0; gy < GLYPH_ROWS; gy++) {
            if (!lit(gx, gy) || heatColor(heat(x, top + gy))) continue;
            const r = cellRandom(gx, gy, 4);
            ctx.fillStyle = r > 0.9 ? INK[2] : r > 0.6 ? INK[3] : INK[4];
            ctx.fillRect(x * PITCH + 1, (top + gy) * PITCH + 1, CELL, CELL);
          }
        }
      },
      { fps: 12 },
    );
  }, [text]);

  return (
    <div className={cn("relative", className)}>
      <span className="sr-only">{text}</span>
      <canvas ref={ref} aria-hidden className="block h-full w-full" />
    </div>
  );
}
