"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Faint dots down both sides of the numbers band, after base.org: a 16px grid of small grey dots
 * that part around the cursor, with a PayPal-blue ripple ringing out from the centre whenever the
 * band scrolls into view. Decorative (aria-hidden); paused offscreen; still for reduced motion.
 */

const RIPPLE_MS = 1400;

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, mouse: { x: number; y: number } | null, ripples: number[], now: number) {
  ctx.clearRect(0, 0, w, h);
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
      let size = 1.6;
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
          size = 1.6 + 2.4 * k;
        }
      }
      ctx.fillStyle = fill;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }
  }
}

export function BandDots({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0;
    let visible = false;
    let ripples: number[] = [];
    let client: { x: number; y: number } | null = null;

    const local = () => {
      if (!client) return null;
      const r = canvas.getBoundingClientRect();
      const p = { x: client.x - r.left, y: client.y - r.top };
      return p.x >= -150 && p.y >= -150 && p.x <= w + 150 && p.y <= h + 150 ? p : null;
    };
    const frame = (now: number) => {
      ripples = ripples.filter((r) => now - r < RIPPLE_MS);
      draw(ctx, w, h, reduced ? null : local(), ripples, now);
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was && !reduced) ripples.push(performance.now());
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
  }, []);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
