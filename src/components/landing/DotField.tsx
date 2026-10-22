"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Background dots in PayPal blues, after base.org. Quiet by default: the hero shows at most a few
 * short-lived shapes at a time (thin streaks that can bend from horizontal to vertical, faceted
 * crystals, bands of ticks), always clear of the headline. The band shows slow dot columns at its
 * sides. Over either, the mouse gets a "lens" of vertical bars that glides after it.
 * Decorative only (aria-hidden), paused offscreen; with reduced motion only the band's columns
 * show, still, and the cursor lens is off.
 */

function hash(x: number, y: number, z: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

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

/** PayPal blues, faint to strong. */
const BLUES = ["143, 195, 238", "0, 156, 222", "0, 112, 224", "0, 48, 135"];
const blue = (v: number, alpha: number) => {
  const tone = v > 0.75 ? 3 : v > 0.5 ? 2 : v > 0.25 ? 1 : 0;
  return `rgba(${BLUES[tone]}, ${clamp01(alpha).toFixed(3)})`;
};

const PITCH = 7; // px between cells in the hero

/* ------------------------------------------------------------------ */
/* Hero actors: each lives a few seconds, then is replaced             */
/* ------------------------------------------------------------------ */

/** How visible a point may be: 0 behind the headline, 1 in open space. */
type Mask = (px: number, py: number) => number;
type Actor = {
  /** Spawn point in cells, used to keep shapes apart. */
  x: number;
  y: number;
  done: (t: number) => boolean;
  draw: (ctx: CanvasRenderingContext2D, t: number, mask: Mask) => void;
};

/** Short vertical tick, the basic mark (Base uses the same). */
function tick(ctx: CanvasRenderingContext2D, cx: number, cy: number, style: string) {
  ctx.fillStyle = style;
  ctx.fillRect(Math.round(cx * PITCH), Math.round(cy * PITCH - 1), 2, 5);
}
function square(ctx: CanvasRenderingContext2D, cx: number, cy: number, style: string) {
  ctx.fillStyle = style;
  ctx.fillRect(Math.round(cx * PITCH), Math.round(cy * PITCH), 3, 3);
}

/**
 * A thin streak that travels straight, then (usually) bends through a quarter circle into a
 * vertical run. Drawn as a one-cell-wide trail that fades from navy at the head to pale at the tail.
 */
function streak(t: number, x: number, y: number): Actor {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const down = Math.random() < 0.6 ? 1 : -1;
  const bends = Math.random() < 0.7;
  const L1 = rand(10, 22); // straight run, cells
  const r = rand(3, 6); // bend radius, cells
  const L2 = bends ? rand(8, 18) : 0; // vertical run, cells
  const arc = bends ? (Math.PI / 2) * r : 0;
  const total = L1 + arc + L2;
  const speed = rand(14, 22); // cells per second
  const tail = rand(10, 18); // trail length, cells

  // Position along the path at distance s.
  const at = (s: number): [number, number] => {
    if (s <= L1 || !bends) return [x + dir * s, y];
    if (s <= L1 + arc) {
      const a = (s - L1) / r; // angle turned so far
      return [x + dir * (L1 + Math.sin(a) * r), y + down * (1 - Math.cos(a)) * r];
    }
    return [x + dir * (L1 + r), y + down * (r + (s - L1 - arc))];
  };

  return {
    x,
    y,
    done: (now) => (now - t) * speed - tail > total,
    draw: (ctx, now, mask) => {
      const head = (now - t) * speed;
      const seen = new Set<number>();
      for (let k = 0; k <= tail; k += 0.5) {
        const s = head - k;
        if (s < 0 || s > total) continue;
        const [cx, cy] = at(s);
        const gx = Math.round(cx), gy = Math.round(cy);
        const key = gx * 10000 + gy;
        if (seen.has(key)) continue;
        seen.add(key);
        const v = 1 - k / tail;
        const a = (0.25 + 0.75 * v) * mask(gx * PITCH, gy * PITCH);
        if (a < 0.05) continue;
        tick(ctx, gx, gy, blue(v, a));
      }
    },
  };
}

/**
 * A faceted cluster: roughly a diamond, stretched and roughened by noise so no two match, with a
 * few cells knocked out. Grows outward from its centre, glints, then dissolves cell by cell.
 */
function crystal(t: number, x: number, y: number): Actor {
  const R = rand(4, 8);
  const ax = rand(0.6, 1.4), ay = rand(0.6, 1.4);
  const seed = Math.floor(Math.random() * 1e6);
  const life = rand(3.5, 5);
  const cells: { dx: number; dy: number; d: number; out: number }[] = [];
  const span = Math.ceil(R * 1.6);
  for (let dy = -span; dy <= span; dy++) {
    for (let dx = -span; dx <= span; dx++) {
      const facet = Math.abs(dx) * ax + Math.abs(dy) * ay + (noise(dx * 0.5, dy * 0.5, seed) - 0.5) * 3;
      if (facet > R || hash(dx, dy, seed) < 0.18) continue;
      cells.push({ dx, dy, d: facet / R, out: rand(0.55, 1) });
    }
  }
  return {
    x,
    y,
    done: (now) => now - t > life,
    draw: (ctx, now, mask) => {
      const age = now - t;
      for (const c of cells) {
        const grow = clamp01((age - c.d * 0.7) / 0.25);
        const dissolve = clamp01((life * c.out - age) / 0.3);
        const glint = 0.85 + 0.15 * Math.sin(age * 5 + c.dx * 1.3 + c.dy);
        const a = grow * dissolve * glint * mask((x + c.dx) * PITCH, (y + c.dy) * PITCH);
        if (a < 0.05) continue;
        square(ctx, x + c.dx, y + c.dy, blue(1 - c.d * 0.8, a));
      }
    },
  };
}

/** A loose band of ticks, a few rows deep, revealed left to right then fading. */
function ticks(t: number, x: number, y: number): Actor {
  const w = Math.floor(rand(10, 20));
  const h = Math.floor(rand(3, 5));
  const seed = Math.floor(Math.random() * 1e6);
  const life = rand(3, 4.5);
  return {
    x,
    y,
    done: (now) => now - t > life,
    draw: (ctx, now, mask) => {
      const age = now - t;
      const env = clamp01(Math.min(age / 0.3, (life - age) / 1));
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          if (hash(i, j, seed) < 0.35) continue;
          const reveal = clamp01((age * 14 - i) / 3);
          const v = hash(i, j, seed + 1);
          const a = env * reveal * (0.35 + 0.65 * v) * mask((x + i) * PITCH, (y + j) * PITCH);
          if (a < 0.05) continue;
          tick(ctx, x + i, y + j * 1.4, blue(v, a));
        }
      }
    },
  };
}

const KINDS = [streak, streak, crystal, crystal, ticks];
const MAX_ACTORS = 3;

/* ------------------------------------------------------------------ */
/* Cursor lens                                                         */
/* ------------------------------------------------------------------ */

const LENS_CORE = 36; // px radius of the solid bars
const LENS_FRINGE = 56; // px radius of the thin lines around them

/** A disc of vertical bars: solid blue in the core, thin pale lines around it. */
function drawLens(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  if (alpha < 0.02) return;
  for (let dx = -LENS_FRINGE; dx <= LENS_FRINGE; dx += 5) {
    const fringe = Math.sqrt(Math.max(0, LENS_FRINGE ** 2 - dx * dx)) * 0.8;
    ctx.fillStyle = `rgba(${BLUES[1]}, ${(0.35 * alpha).toFixed(3)})`;
    ctx.fillRect(Math.round(x + dx), Math.round(y - fringe), 1, Math.round(fringe * 2));
    if (Math.abs(dx) >= LENS_CORE) continue;
    const half = Math.round(Math.sqrt(LENS_CORE ** 2 - dx * dx) / 3) * 3; // stepped edge
    ctx.fillStyle = `rgba(${BLUES[2]}, ${alpha.toFixed(3)})`;
    ctx.fillRect(Math.round(x + dx - 2), Math.round(y - half), 4, half * 2);
  }
}

/* ------------------------------------------------------------------ */
/* Band columns                                                        */
/* ------------------------------------------------------------------ */

function drawBand(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const pitch = 9;
  const size = 3;
  for (let px = pitch / 2; px < w; px += pitch) {
    const side = Math.min(px, w - px) / w; // 0 at an edge, 0.5 in the middle
    const g = Math.exp(-(((side - 0.09) / 0.045) ** 2));
    if (g < 0.05) continue;
    for (let py = pitch / 2; py < h; py += pitch) {
      const shimmer = noise(px * 0.04, py * 0.012 - t * 0.25, t * 0.08);
      const a = g * Math.sin((Math.PI * py) / h) * (0.2 + 0.8 * shimmer ** 2);
      if (a < 0.06) continue;
      ctx.fillStyle = blue(a * 1.1, Math.min(1, a * 1.3));
      ctx.fillRect(Math.round(px - size / 2), Math.round(py - size / 2), size, size);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Canvas loop                                                         */
/* ------------------------------------------------------------------ */

export function DotField({ variant, className }: { variant: "hero" | "band"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let visible = false;
    let actors: Actor[] = [];
    let nextSpawn = 0.2;
    // Pointer in viewport px. The lens glides towards it and fades in while the pointer is over us.
    let client: { x: number; y: number } | null = null;
    let lens: { x: number; y: number } | null = null;
    let lensAlpha = 0;

    // Keep the headline clear: an elliptical hole in the middle, plus soft page edges.
    const mask: Mask = (px, py) => {
      const d = Math.hypot((px - w / 2) / Math.min(w * 0.3, 380), (py - h * 0.48) / (h * 0.3));
      return clamp01((d - 0.9) / 0.25) * clamp01(Math.min(px, w - px) / 60) * clamp01(Math.min(py, h - py) / 40);
    };

    const spawn = (t: number) => {
      for (let tries = 0; tries < 20; tries++) {
        const x = Math.round(rand(4, w / PITCH - 4));
        const y = Math.round(rand(4, h / PITCH - 4));
        if (mask(x * PITCH, y * PITCH) < 0.9) continue;
        if (actors.some((a) => Math.hypot(a.x - x, a.y - y) < 22)) continue; // don't crowd
        actors.push(KINDS[Math.floor(Math.random() * KINDS.length)](t, x, y));
        return;
      }
    };

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);

      if (variant === "band") drawBand(ctx, w, h, reduced ? 0 : t);
      else if (!reduced) {
        actors = actors.filter((a) => !a.done(t));
        if (t >= nextSpawn && actors.length < MAX_ACTORS) {
          spawn(t);
          nextSpawn = t + rand(0.6, 1.4);
        }
        for (const a of actors) a.draw(ctx, t, mask);
      }

      if (reduced) return;
      const rect = canvas.getBoundingClientRect();
      const target = client ? { x: client.x - rect.left, y: client.y - rect.top } : null;
      const inside = !!target && target.x >= 0 && target.y >= 0 && target.x <= w && target.y <= h;
      if (inside && target) lens = lens ? { x: lerp(lens.x, target.x, 0.14), y: lerp(lens.y, target.y, 0.14) } : target;
      lensAlpha = lerp(lensAlpha, inside ? 1 : 0, 0.12);
      if (lens) drawLens(ctx, lens.x, lens.y, lensAlpha);
      if (lensAlpha < 0.02 && !inside) lens = null;
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
    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (now - last >= 1000 / 45) {
        last = now;
        frame(now);
      }
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      client = e.pointerType === "mouse" ? { x: e.clientX, y: e.clientY } : null;
    };
    const onLeave = () => {
      client = null;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf && !reduced) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    if (!reduced) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    resize();

    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [variant]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
