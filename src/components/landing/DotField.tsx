"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Background effects after base.org, in PayPal blues.
 *
 * - "hero": a "line renderer". A grid of cells holds a brightness value; each cell is drawn as a
 *   short vertical stroke whose thickness (and colour) steps up with brightness, and strokes of the
 *   same thickness join into one line. Brightness comes from a few short-lived shapes (streaks that
 *   bend from horizontal into a vertical run, faceted crystals) plus the mouse, which drags a
 *   lagging trail of soft blobs; the renderer turns that into a lens of thick bars. A horizontal
 *   streak therefore reads as a row of ticks and a vertical one as a single solid line.
 * - "band": a grid of small grey dots down both sides that the cursor gently pushes aside, with a
 *   blue ripple that rings out from the centre when the band scrolls into view.
 *
 * Decorative only (aria-hidden), paused offscreen. With reduced motion the hero stays empty and
 * the band's dots are still.
 */

const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => fade(clamp01((v - a) / (b - a)));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function hash(x: number, y: number, z: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** 2D value noise in [0, 1]. */
function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = fade(x - xi), yf = fade(y - yi);
  return lerp(lerp(hash(xi, yi, z), hash(xi + 1, yi, z), xf), lerp(hash(xi, yi + 1, z), hash(xi + 1, yi + 1, z), xf), yf);
}

/* ------------------------------------------------------------------ */
/* Line renderer                                                       */
/* ------------------------------------------------------------------ */

const CELL = 7; // css px per cell
const CONTRAST = 3.1;
const CAP = 0.44; // corner rounding, as a share of the half-width
const GAP = 0.045 * CELL; // break between strokes of different thickness
/** Half-widths per thickness tier, as a share of the cell. */
const HALF = [0.0625, 0.25, 0.375, 0.5].map((h) => h * 0.66);
/** Thin to thick: a bright cyan hairline, pale blue, mid blue, then vivid PayPal blue for the core. */
const TIER_COLORS = ["#009CDE", "#8FC3EE", "#5B9DF0", "#0070E0"];

const tierOf = (lum: number) => (lum < 0.2 ? -1 : lum < 0.4 ? 0 : lum < 0.6 ? 1 : lum < 0.8 ? 2 : 3);

/** Draws every column as runs of equal-thickness vertical strokes. */
function renderLines(ctx: CanvasRenderingContext2D, tiers: Int8Array, cols: number, rows: number) {
  const paths = TIER_COLORS.map(() => new Path2D());
  for (let x = 0; x < cols; x++) {
    let y = 0;
    while (y < rows) {
      const t = tiers[y * cols + x];
      let end = y + 1;
      while (end < rows && tiers[end * cols + x] === t) end++;
      if (t >= 0) {
        const w = 2 * HALF[t] * CELL;
        const top = y * CELL + GAP / 2;
        const len = (end - y) * CELL - GAP;
        paths[t].roundRect(x * CELL + CELL / 2 - w / 2, top, w, len, (w / 2) * CAP);
      }
      y = end;
    }
  }
  paths.forEach((p, i) => {
    ctx.fillStyle = TIER_COLORS[i];
    ctx.fill(p);
  });
}

/* ------------------------------------------------------------------ */
/* Hero shapes: each writes raw brightness into the grid for a while   */
/* ------------------------------------------------------------------ */

type Field = { lum: Float32Array; cols: number; rows: number };
type Shape = { x: number; y: number; done: (t: number) => boolean; paint: (f: Field, t: number) => void };

/** Raises a cell's brightness (never lowers it). */
function raise(f: Field, x: number, y: number, v: number) {
  if (x < 0 || y < 0 || x >= f.cols || y >= f.rows || v <= 0) return;
  const i = y * f.cols + x;
  if (v > f.lum[i]) f.lum[i] = v;
}

/** Soft dab of brightness centred on a sub-cell point. */
function dab(f: Field, cx: number, cy: number, v: number, r = 1.4) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      raise(f, x, y, v * (1 - smoothstep(0, r, d)));
    }
  }
}

/**
 * A streak that travels straight, then (usually) bends through a quarter turn into a vertical run.
 * It reads as a row of ticks while horizontal and becomes one solid line once it turns.
 */
function streak(t: number, x: number, y: number): Shape {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const down = Math.random() < 0.65 ? 1 : -1;
  const bends = Math.random() < 0.75;
  const L1 = rand(12, 26);
  const r = rand(3, 7);
  const L2 = bends ? rand(10, 22) : 0;
  const arc = bends ? (Math.PI / 2) * r : 0;
  const total = L1 + arc + L2;
  const speed = rand(16, 26); // cells per second
  const tail = rand(12, 22);

  const at = (s: number): [number, number] => {
    if (s <= L1 || !bends) return [x + dir * s, y];
    if (s <= L1 + arc) {
      const a = (s - L1) / r;
      return [x + dir * (L1 + Math.sin(a) * r), y + down * (1 - Math.cos(a)) * r];
    }
    return [x + dir * (L1 + r), y + down * (r + (s - L1 - arc))];
  };

  return {
    x,
    y,
    done: (now) => (now - t) * speed - tail > total,
    paint: (f, now) => {
      const head = (now - t) * speed;
      for (let k = 0; k <= tail; k += 0.5) {
        const s = head - k;
        if (s < 0 || s > total) continue;
        const [cx, cy] = at(s);
        dab(f, cx + 0.5, cy + 0.5, 1.05 - 0.5 * (k / tail), 1.8);
      }
    },
  };
}

/** A faceted cluster that grows from its centre, holds, then breaks up and fades. */
function crystal(t: number, x: number, y: number): Shape {
  const R = rand(4, 8);
  const ax = rand(0.6, 1.4), ay = rand(0.6, 1.4);
  const seed = Math.floor(Math.random() * 1e6);
  const life = rand(3.5, 5.5);
  const span = Math.ceil(R * 1.7);
  return {
    x,
    y,
    done: (now) => now - t > life,
    paint: (f, now) => {
      const age = now - t;
      const grow = smoothstep(0, 1.1, age); // how far out the shape has grown, 0..1
      const out = smoothstep(life - 1.4, life, age); // how far it has broken up, 0..1
      for (let dy = -span; dy <= span; dy++) {
        for (let dx = -span; dx <= span; dx++) {
          const facet = Math.abs(dx) * ax + Math.abs(dy) * ay + (noise(dx * 0.45, dy * 0.45, seed) - 0.5) * 3.2;
          const d = facet / R;
          if (d > 1 || d > grow) continue;
          if (hash(dx, dy, seed) < out) continue; // dissolves cell by cell
          raise(f, x + dx, y + dy, (1.08 - d * 0.75) * (0.9 + 0.1 * Math.sin(age * 4 + dx + dy)));
        }
      }
    },
  };
}

const KINDS = [streak, streak, streak, crystal, crystal];
const MAX_SHAPES = 3;

/** The cursor's trail: 10 points, each easing towards the one before it (Base: lag 0.18). */
const TRAIL = 10;
const TRAIL_LAG = 0.18;
const BLOB_OPACITY = 0.3;
const BLOB_RADIUS = 0.18; // as a share of the hero's height

/* ------------------------------------------------------------------ */
/* Band: dots that part around the cursor, plus a ripple               */
/* ------------------------------------------------------------------ */

const RIPPLE_MS = 1400;

function drawBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mouse: { x: number; y: number } | null,
  ripples: number[],
  now: number,
) {
  const inner = 0.2 * w; // full strength this close to an edge
  const outer = 0.45 * w; // gone by here
  const cx = w / 2, cy = h / 2;
  const start = 0.08 * w;
  const end = Math.hypot(cx, cy) + 140;
  const rings = ripples.map((t0) => start + Math.min((now - t0) / RIPPLE_MS, 1) * (end - start));

  for (let x = 16; x < w; x += 16) {
    const side = Math.min(x, w - x);
    if (side > outer) continue;
    const sideFade = side < inner ? 1 : 1 - (side - inner) / (outer - inner);
    for (let y = 16; y < h; y += 16) {
      const a = sideFade * Math.min(Math.min(y, h - y) / 80, 1);
      let px = x, py = y;
      if (mouse) {
        const dx = x - mouse.x, dy = y - mouse.y;
        const d = Math.hypot(dx, dy);
        const push = Math.max(0, 1 - d / 150) ** 2 * 8;
        if (d > 0) {
          px += (dx / d) * push;
          py += (dy / d) * push;
        }
      }
      let r = 0.8;
      let fill = `rgba(160, 160, 160, ${(0.3 * a).toFixed(3)})`;
      if (rings.length) {
        const dc = Math.hypot(x - cx, y - cy);
        let k = 0;
        for (const ring of rings) {
          const off = dc - ring;
          if (off > -140 && off < 42) k = Math.max(k, (1 - Math.abs(off) / (off < 0 ? 140 : 42)) ** 2);
        }
        if (k > 0) {
          fill = `rgba(0, 112, 224, ${(k * a * 0.95).toFixed(3)})`;
          r = 0.8 + 1.2 * k;
        }
      }
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
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
    let visible = false;
    let client: { x: number; y: number } | null = null; // pointer in viewport px

    // Hero state
    const field: Field = { lum: new Float32Array(0), cols: 0, rows: 0 };
    let tiers = new Int8Array(0);
    let shapes: Shape[] = [];
    let nextSpawn = 0.2;
    let trail: { x: number; y: number }[] | null = null;
    let trailAlpha = 0;

    // Band state
    let ripples: number[] = [];

    /** Roughly how visible a point is once `fadeHero` has run; used to place new shapes. */
    const heroMask = (px: number, py: number) => {
      const d = Math.hypot((px - w / 2) / (w * 0.52), (py - h / 2) / (h * 0.4));
      const centre = clamp01((d - 0.3173) / 0.6827);
      const edges = clamp01(px / 96) * clamp01((w - px) / 96) * clamp01(py / 256) * clamp01((h - py) / 160);
      return centre * edges;
    };

    /** Base's white fades, as erasers: an oval clearing behind the headline, plus soft edges. */
    const fadeHero = () => {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(w * 0.52, h * 0.4);
      const oval = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      oval.addColorStop(0.3173, "#000");
      oval.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = oval;
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
      const edge = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number, mid = false) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, "#000");
        if (mid) g.addColorStop(0.4, "rgba(0,0,0,0.6)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(rx, ry, rw, rh);
      };
      edge(0, 0, 0, 256, 0, 0, w, 256, true); // top
      edge(0, h, 0, h - 160, 0, h - 160, w, 160); // bottom
      edge(0, 0, 96, 0, 0, 0, 96, h); // left
      edge(w, 0, w - 96, 0, w - 96, 0, 96, h); // right
      ctx.restore();
    };

    const spawn = (t: number) => {
      for (let tries = 0; tries < 20; tries++) {
        const x = Math.round(rand(6, field.cols - 6));
        const y = Math.round(rand(4, field.rows - 4));
        if (heroMask(x * CELL, y * CELL) < 0.6) continue;
        if (shapes.some((s) => Math.hypot(s.x - x, s.y - y) < 24)) continue;
        shapes.push(KINDS[Math.floor(Math.random() * KINDS.length)](t, x, y));
        return;
      }
    };

    const local = () => {
      if (!client) return null;
      const rect = canvas.getBoundingClientRect();
      const p = { x: client.x - rect.left, y: client.y - rect.top };
      return p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h ? p : null;
    };

    const frameHero = (t: number) => {
      const { lum, cols, rows } = field;
      lum.fill(0);

      shapes = shapes.filter((s) => !s.done(t));
      if (t >= nextSpawn && shapes.length < MAX_SHAPES) {
        spawn(t);
        nextSpawn = t + rand(0.7, 1.5);
      }
      for (const s of shapes) s.paint(field, t);

      // Cursor trail: the head follows the pointer, the rest ease after it.
      const p = local();
      trailAlpha = lerp(trailAlpha, p ? 1 : 0, 0.1);
      if (p) {
        if (!trail) trail = Array.from({ length: TRAIL }, () => ({ ...p }));
        trail[0] = p;
      }
      if (trail) {
        for (let i = 1; i < TRAIL; i++) {
          trail[i].x = lerp(trail[i].x, trail[i - 1].x, TRAIL_LAG);
          trail[i].y = lerp(trail[i].y, trail[i - 1].y, TRAIL_LAG);
        }
        if (trailAlpha < 0.01 && !p) trail = null;
      }

      const radius = BLOB_RADIUS * h;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const px = x * CELL + CELL / 2;
          const py = y * CELL + CELL / 2;
          let v = lum[i];
          if (trail) {
            let a = 0;
            for (let k = 0; k < TRAIL; k++) {
              const d = Math.hypot(px - trail[k].x, py - trail[k].y);
              if (d < radius) a += (1 - smoothstep(0, radius, d)) * Math.exp(-0.42 * k) * BLOB_OPACITY;
            }
            a = Math.min(1, a) * trailAlpha;
            v = v * (1 - a) + a; // composite a white blob over the field
          }
          v = clamp01((v - 0.5) * CONTRAST + 0.5);
          tiers[i] = tierOf(v);
        }
      }
      renderLines(ctx, tiers, cols, rows);
      fadeHero();
    };

    const frame = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      if (variant === "band") {
        ripples = ripples.filter((r) => now - r < RIPPLE_MS);
        drawBand(ctx, w, h, reduced ? null : local(), ripples, now);
      } else if (!reduced) {
        frameHero((now - start) / 1000);
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      field.cols = Math.ceil(w / CELL);
      field.rows = Math.ceil(h / CELL);
      field.lum = new Float32Array(field.cols * field.rows);
      tiers = new Int8Array(field.cols * field.rows);
      frame(performance.now());
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      frame(now);
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
      const wasVisible = visible;
      visible = entry.isIntersecting;
      if (variant === "band" && visible && !wasVisible && !reduced) ripples.push(performance.now());
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
