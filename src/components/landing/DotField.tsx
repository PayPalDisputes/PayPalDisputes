"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Faint background dots, after base.org. Two layouts:
 * - "hero": scattered patches of tiny squares that drift slowly, kept clear of the centre (where the
 *   headline sits) and of the page edges.
 * - "band": columns of dots near the left and right edges that shimmer slowly downward.
 * Decorative only (aria-hidden), paused offscreen, and a still frame for reduced motion.
 */

function hash(x: number, y: number, z: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 3D value noise in [0, 1]. */
function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
}

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

const INK = "20, 19, 18";

/** Patches of dots stretched along a shallow diagonal, so they read as streaks rather than blobs. */
const drawHero: Draw = (ctx, w, h, t) => {
  const pitch = 9;
  const size = 3;
  for (let py = pitch / 2; py < h; py += pitch) {
    for (let px = pitch / 2; px < w; px += pitch) {
      const x = px / pitch;
      const y = py / pitch;
      const u = x * 0.85 + y * 0.5;
      const v = -x * 0.5 + y * 0.85;
      const n = noise(u * 0.06 - t * 0.06, v * 0.17, t * 0.04);
      let a = clamp01((n - 0.74) / 0.2);
      if (a <= 0) continue;
      // Keep the headline clear: an elliptical hole in the middle, plus soft page edges.
      const d = Math.hypot((px - w / 2) / (w * 0.3), (py - h * 0.46) / (h * 0.34));
      a *= clamp01((d - 0.8) / 0.6);
      a *= clamp01(Math.min(px, w - px) / 120) * clamp01(Math.min(py, h - py) / 90);
      if (hash(x, y, 7) > 0.85) a *= 0.3; // break up solid runs
      if (a < 0.04) continue;
      ctx.fillStyle = `rgba(${INK}, ${(a * 0.6).toFixed(3)})`;
      ctx.fillRect(Math.round(px - size / 2), Math.round(py - size / 2), size, size);
    }
  }
};

/** Dot columns hugging both sides, brightest a little in from the edge, fading towards the stats. */
const drawBand: Draw = (ctx, w, h, t) => {
  const pitch = 10;
  const size = 2.5;
  for (let px = pitch / 2; px < w; px += pitch) {
    const side = Math.min(px, w - px) / w; // 0 at an edge, 0.5 in the middle
    const g = Math.exp(-(((side - 0.09) / 0.045) ** 2));
    if (g < 0.03) continue;
    for (let py = pitch / 2; py < h; py += pitch) {
      const x = px / pitch;
      const y = py / pitch;
      const shimmer = noise(x * 0.35, y * 0.12 - t * 0.5, t * 0.15);
      const a = g * Math.sin((Math.PI * py) / h) * (0.15 + 0.85 * shimmer ** 2);
      if (a < 0.04) continue;
      ctx.fillStyle = `rgba(${INK}, ${(a * 0.55).toFixed(3)})`;
      ctx.fillRect(Math.round(px - size / 2), Math.round(py - size / 2), size, size);
    }
  }
};

export function DotField({ variant, className }: { variant: "hero" | "band"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const draw = variant === "hero" ? drawHero : drawBand;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let visible = false;

    const frame = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, reduced ? 0 : (now - start) / 1000);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      frame(performance.now());
    };
    const tick = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (now - last >= 1000 / 30) {
        last = now;
        frame(now);
      }
      raf = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf && !reduced) raf = requestAnimationFrame(tick);
    });
    io.observe(canvas);
    resize();

    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [variant]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
