"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Background dots in PayPal blues, after base.org. Two layouts:
 * - "hero": long drifting streaks plus small diamond-shaped "crystals", kept clear of the centre
 *   (where the headline sits) and of the page edges.
 * - "band": columns of dots near the left and right edges that shimmer downward.
 * The mouse lights up a soft patch of dots, nudges them aside, and leaves a short fading trail.
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

/** PayPal blues, faint to strong. */
const BLUES = ["143, 195, 238", "0, 156, 222", "0, 112, 224", "0, 48, 135"];
const color = (v: number, alpha: number) => {
  const tone = v > 0.62 ? 3 : v > 0.4 ? 2 : v > 0.18 ? 1 : 0;
  return `rgba(${BLUES[tone]}, ${alpha.toFixed(3)})`;
};

const CURSOR_RADIUS = 130; // px
const TRAIL_HALF_LIFE = 0.25; // seconds

type Grid = { cols: number; rows: number; pitch: number };
/** `glow(i)` is the cursor's light on cell i in [0, 1]; `push` returns the cell's offset in px. */
type Cursor = { glow: (i: number) => number; push: (i: number, px: number, py: number) => [number, number] };
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, grid: Grid, cursor: Cursor) => void;

/* ------------------------------------------------------------------ */
/* Hero: streaks + crystals                                            */
/* ------------------------------------------------------------------ */

/** Diamond clusters that drift slowly up and to the right, wrapping round. Seeded so they're stable. */
const CRYSTALS = Array.from({ length: 16 }, (_, i) => ({
  x: hash(i, 1, 41),
  y: hash(i, 2, 41),
  r: 2 + Math.floor(hash(i, 3, 41) * 4), // radius in cells
  speed: 0.6 + hash(i, 4, 41) * 0.8, // cells per second
  phase: hash(i, 5, 41) * 10,
}));

let crystalBuf = new Float32Array(0);

const drawHero: Draw = (ctx, w, h, t, { cols, rows, pitch }, cursor) => {
  const size = 4;

  // Stamp crystals into a buffer: filled diamonds with a lattice inside, so they read as crystals.
  if (crystalBuf.length !== cols * rows) crystalBuf = new Float32Array(cols * rows);
  crystalBuf.fill(0);
  for (const c of CRYSTALS) {
    const cx = Math.floor((c.x * cols + t * c.speed) % (cols + 20)) - 10;
    const cy = Math.floor((((c.y * rows - t * c.speed * 0.35) % rows) + rows) % rows);
    const pulse = 0.75 + 0.25 * Math.sin(t * 1.6 + c.phase);
    for (let dy = -c.r; dy <= c.r; dy++) {
      for (let dx = -c.r; dx <= c.r; dx++) {
        const m = Math.abs(dx) + Math.abs(dy);
        if (m > c.r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        const lattice = (dx + dy) % 2 === 0 ? 1 : 0.45;
        crystalBuf[y * cols + x] = Math.max(crystalBuf[y * cols + x], (1 - (m / (c.r + 1)) * 0.6) * lattice * pulse);
      }
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const px = x * pitch + pitch / 2;
      const py = y * pitch + pitch / 2;

      // Long thin streaks along a shallow diagonal, flowing right.
      const u = x * 0.88 + y * 0.47;
      const v = -x * 0.47 + y * 0.88;
      const s = noise(u * 0.022 - t * 0.16, v * 0.24, t * 0.08);
      const streak = clamp01((s - 0.72) / 0.18);

      let a = Math.max(streak, crystalBuf[i]);
      if (a > 0 && hash(x, y, 7) > 0.88) a *= 0.35; // break up solid runs

      // Keep the headline clear: an elliptical hole in the middle, plus soft page edges.
      const d = Math.hypot((px - w / 2) / (w * 0.3), (py - h * 0.5) / (h * 0.4));
      const mask = clamp01((d - 0.8) / 0.5) * clamp01(Math.min(px, w - px) / 80) * clamp01(Math.min(py, h - py) / 60);
      a *= mask;

      // The cursor lights dots up even near the text, but more gently there.
      const g = cursor.glow(i) * (0.45 + 0.55 * mask);
      const alpha = Math.max(a > 0.05 ? 0.4 + 0.6 * a : 0, g * 0.95);
      if (alpha < 0.08) continue;

      const [ox, oy] = cursor.push(i, px, py);
      ctx.fillStyle = color(Math.max(a, g * 0.9), alpha);
      ctx.fillRect(Math.round(px + ox - size / 2), Math.round(py + oy - size / 2), size, size);
    }
  }
};

/* ------------------------------------------------------------------ */
/* Band: side columns                                                  */
/* ------------------------------------------------------------------ */

const drawBand: Draw = (ctx, w, h, t, { cols, rows, pitch }, cursor) => {
  const size = 3;
  for (let x = 0; x < cols; x++) {
    const px = x * pitch + pitch / 2;
    const side = Math.min(px, w - px) / w; // 0 at an edge, 0.5 in the middle
    const g0 = Math.exp(-(((side - 0.09) / 0.05) ** 2));
    for (let y = 0; y < rows; y++) {
      const i = y * cols + x;
      const py = y * pitch + pitch / 2;
      const shimmer = noise(x * 0.35, y * 0.12 - t * 1.1, t * 0.3);
      const a = g0 * Math.sin((Math.PI * py) / h) * (0.15 + 0.85 * shimmer ** 2);
      const g = cursor.glow(i);
      const alpha = Math.min(1, Math.max(a * 1.4, g * 0.9));
      if (alpha < 0.06) continue;
      const [ox, oy] = cursor.push(i, px, py);
      ctx.fillStyle = color(Math.max(a * 1.1, g * 0.9), alpha);
      ctx.fillRect(Math.round(px + ox - size / 2), Math.round(py + oy - size / 2), size, size);
    }
  }
};

/* ------------------------------------------------------------------ */
/* Canvas loop                                                         */
/* ------------------------------------------------------------------ */

export function DotField({ variant, className }: { variant: "hero" | "band"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const draw = variant === "hero" ? drawHero : drawBand;
    const pitch = variant === "hero" ? 8 : 9;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let w = 0;
    let h = 0;
    const grid: Grid = { cols: 0, rows: 0, pitch };
    let trail = new Float32Array(0);
    let raf = 0;
    let last = 0;
    let visible = false;
    // Pointer in viewport px; `smooth` eases towards it (canvas px) so the glow glides rather than jumps.
    let client: { x: number; y: number } | null = null;
    let smooth: { x: number; y: number } | null = null;

    const cursor: Cursor = {
      glow: (i) => trail[i] ?? 0,
      push: (i, px, py) => {
        const g = trail[i];
        if (!smooth || !g) return [0, 0];
        const dx = px - smooth.x;
        const dy = py - smooth.y;
        const d = Math.hypot(dx, dy) || 1;
        const k = (g * 5) / d; // up to ~5px outward
        return [dx * k, dy * k];
      },
    };

    const updateTrail = (dt: number) => {
      const keep = 0.5 ** (dt / TRAIL_HALF_LIFE);
      for (let i = 0; i < trail.length; i++) trail[i] = trail[i] < 0.01 ? 0 : trail[i] * keep;
      if (!client) {
        smooth = null;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const target = { x: client.x - rect.left, y: client.y - rect.top };
      smooth = smooth ? { x: lerp(smooth.x, target.x, 0.35), y: lerp(smooth.y, target.y, 0.35) } : target;
      const r = Math.ceil(CURSOR_RADIUS / pitch);
      const gx = Math.floor(smooth.x / pitch);
      const gy = Math.floor(smooth.y / pitch);
      for (let y = Math.max(0, gy - r); y <= Math.min(grid.rows - 1, gy + r); y++) {
        for (let x = Math.max(0, gx - r); x <= Math.min(grid.cols - 1, gx + r); x++) {
          const d = Math.hypot(x * pitch + pitch / 2 - smooth.x, y * pitch + pitch / 2 - smooth.y) / CURSOR_RADIUS;
          if (d >= 1) continue;
          // Dithered edge so the lit patch looks like scattered dots, not a disc.
          const v = (1 - d) ** 1.5 * (hash(x, y, 13) > d * 0.9 ? 1 : 0.25);
          const i = y * grid.cols + x;
          trail[i] = Math.max(trail[i], v);
        }
      }
    };

    const frame = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, reduced ? 0 : (now - start) / 1000, grid, cursor);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      grid.cols = Math.ceil(w / pitch);
      grid.rows = Math.ceil(h / pitch);
      trail = new Float32Array(grid.cols * grid.rows);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      frame(performance.now());
    };
    const tick = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (now - last >= 1000 / 40) {
        updateTrail(last ? Math.min((now - last) / 1000, 0.1) : 0);
        last = now;
        frame(now);
      }
      raf = requestAnimationFrame(tick);
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
      if (visible && !raf && !reduced) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
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
