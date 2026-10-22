"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * A grid of small dots on springs, after ramp.com. Each dot's opacity drifts with three slow
 * overlapping waves; moving the mouse nearby pushes dots aside and they wobble back home; a click
 * sends a shockwave ripple out from where you clicked. The cursor is ignored over links, buttons and
 * form fields so the dots never compete with something you're about to click.
 *
 * Decorative only (aria-hidden). Paused offscreen, and a still grid for reduced motion.
 */

const SPACING = 12;
const RADIUS = 150; // cursor reach, px
const FORCE = 10;
const SPRING = 0.018;
const DAMPING = 0.8;
const RIPPLE_SPEED = 420; // px per second
const RIPPLE_WIDTH = 500; // ring softness (px²)
const RIPPLE_FORCE = 10;
const RIPPLE_DECAY = 2.2;
const RIPPLE_LIFE = 2; // seconds
const ALPHA_BUCKETS = 8;

/** Three slow waves across the grid; their average drives each dot's opacity. */
const WAVE_KX = [0.018, -0.012, 0.006];
const WAVE_KY = [0.009, 0.016, -0.014];
const WAVE_SPEED = [0.55, 0.38, 0.22];

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], form, video';

export function SpringDots({ color = "0, 48, 135", opacity = 0.28, className }: { color?: string; opacity?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, cols = 0, rows = 0, ox0 = 0, oy0 = 0;
    let off = new Float32Array(0); // x, y offsets per dot
    let vel = new Float32Array(0);
    let springK = new Float32Array(0);
    let raf = 0;
    let visible = false;
    let time = 0;
    let last = 0;
    let rect = canvas.getBoundingClientRect();

    // Pointer, in canvas px. `mouse` eases towards `target`; force fades out a second after the last move.
    const target = { x: -9999, y: -9999 };
    const mouse = { x: -9999, y: -9999 };
    let mouseOn = false;
    let lastMove = -10;
    let lastActive = -100;
    const ripples: { x: number; y: number; born: number }[] = [];

    const resize = () => {
      rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ox0 = (w % SPACING) / 2 + SPACING / 2;
      oy0 = (h % SPACING) / 2 + SPACING / 2;
      cols = Math.max(1, Math.ceil((w - ox0) / SPACING));
      rows = Math.max(1, Math.ceil((h - oy0) / SPACING));
      off = new Float32Array(cols * rows * 2);
      vel = new Float32Array(cols * rows * 2);
      springK = new Float32Array(cols * rows);
      for (let i = 0; i < springK.length; i++) {
        const n = Math.sin(((i % cols) * 1.7 + Math.floor(i / cols) * 73) * 12.9898) * 43758.5453;
        springK[i] = SPRING * (0.8 + (n - Math.floor(n)) * 0.4); // a little variety so the wobble isn't uniform
      }
      draw();
    };

    const step = () => {
      const sinceMove = time - lastMove;
      const active = mouseOn ? (sinceMove > 1 ? 0 : Math.exp(-7 * sinceMove)) : 0;
      mouse.x += ((mouseOn ? target.x : -9999) - mouse.x) * (mouseOn ? 0.8 : 0.08);
      mouse.y += ((mouseOn ? target.y : -9999) - mouse.y) * (mouseOn ? 0.8 : 0.08);
      for (let k = ripples.length - 1; k >= 0; k--) if (time - ripples[k].born >= RIPPLE_LIFE) ripples.splice(k, 1);

      const r2 = RADIUS * RADIUS;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          const j = i * 2;
          const hx = ox0 + col * SPACING, hy = oy0 + row * SPACING;
          let vx = vel[j] - off[j] * springK[i];
          let vy = vel[j + 1] - off[j + 1] * springK[i];
          const px = hx + off[j], py = hy + off[j + 1];

          if (active > 0.001) {
            const cx = px - mouse.x, cy = py - mouse.y;
            const d2 = cx * cx + cy * cy;
            if (d2 < r2 && d2 > 0.01) {
              const d = Math.sqrt(d2);
              const t = 1 - d / RADIUS;
              const f = t * t * FORCE * active;
              vx += (cx / d) * f;
              vy += (cy / d) * f;
            }
          }
          for (const rp of ripples) {
            const age = time - rp.born;
            const rx = px - rp.x, ry = py - rp.y;
            const d = Math.hypot(rx, ry);
            const diff = d - age * RIPPLE_SPEED;
            const amp = Math.exp(-(diff * diff) / RIPPLE_WIDTH) * Math.exp(-age * RIPPLE_DECAY) * RIPPLE_FORCE;
            if (d > 0.01 && amp > 0.001) {
              vx += (rx / d) * amp;
              vy += (ry / d) * amp;
            }
          }
          vx *= DAMPING;
          vy *= DAMPING;
          vel[j] = vx;
          vel[j + 1] = vy;
          off[j] += vx;
          off[j + 1] += vy;
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const buckets = Array.from({ length: ALPHA_BUCKETS }, () => new Path2D());
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          const hx = ox0 + col * SPACING, hy = oy0 + row * SPACING;
          let a = 0.6;
          if (!reduced) {
            let flick = 0;
            for (let k = 0; k < 3; k++) flick += Math.sin(hx * WAVE_KX[k] + hy * WAVE_KY[k] + time * WAVE_SPEED[k]);
            a = 0.35 + 0.65 * (0.5 + 0.5 * (flick / 3));
          }
          const b = Math.min(ALPHA_BUCKETS - 1, Math.floor(a * ALPHA_BUCKETS));
          const x = hx + off[i * 2], y = hy + off[i * 2 + 1];
          buckets[b].moveTo(x + 1, y);
          buckets[b].arc(x, y, 1, 0, Math.PI * 2);
        }
      }
      buckets.forEach((p, b) => {
        ctx.fillStyle = `rgba(${color}, ${(((b + 0.5) / ALPHA_BUCKETS) * opacity).toFixed(3)})`;
        ctx.fill(p);
      });
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const busy = mouseOn || ripples.length > 0 || time - lastActive < 2.5;
      if (!busy && now - last < 1000 / 30) return; // idle shimmer only needs 30fps
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      time += dt;
      rect = canvas.getBoundingClientRect();
      if (busy) step();
      draw();
    };

    const onMove = (e: PointerEvent) => {
      if (e.clientY < rect.top - RADIUS || e.clientY > rect.bottom + RADIUS) {
        mouseOn = false;
        return;
      }
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) {
        mouseOn = false;
        return;
      }
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
      if (!mouseOn && mouse.x < -9000) {
        mouse.x = target.x;
        mouse.y = target.y;
      }
      mouseOn = true;
      lastMove = time;
      lastActive = time;
    };
    const onLeave = () => {
      mouseOn = false;
    };
    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || (e.target instanceof Element && e.target.closest(INTERACTIVE))) return;
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > w || y > h) return;
      ripples.push({ x, y, born: time });
      if (ripples.length > 6) ripples.shift();
      lastActive = time;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      last = 0;
    });
    io.observe(canvas);
    resize();
    if (!reduced) {
      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      document.addEventListener("pointerdown", onDown, { passive: true });
      raf = requestAnimationFrame(loop);
    }

    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [color, opacity]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
