"use client";

import { useEffect, useRef } from "react";
import { JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/cn";

/**
 * The hero visual: an isometric stack of dispute case files in a wireframe box, with a stage
 * timeline on the right. Every 5.2s a new file drops onto the top, each file moves down one layer
 * (its dots shading from stage to stage), the bottom one is settled and slides out, and one
 * highlight walks down the timeline. Case IDs, reasons and amounts are random placeholders.
 *
 * Plain canvas, no libraries. Paused offscreen; one still frame for reduced motion.
 * `theme="blue"` draws in white for the PayPal-blue hero; `theme="light"` is the original palette.
 */

const mono = JetBrains_Mono({ subsets: ["latin"], weight: "500" });

type Theme = {
  bg: string; // plate fill
  muted: string; // inactive labels, case headers
  plate: string; // plate outlines
  cube: string; // box, timeline, ticks, leader
  hl: string; // travelling highlight
  hlInk: string; // label text under the highlight
  stages: [string, string, string, string]; // dot colours per slot (hex)
};

const THEMES: Record<"light" | "blue", Theme> = {
  light: {
    bg: "#f5f7fa",
    muted: "#8a94a6",
    plate: "#c2c9d6",
    cube: "#8fb6ec",
    hl: "#0070e0",
    hlInk: "#ffffff",
    stages: ["#003087", "#0070e0", "#009cde", "#b4c3d8"],
  },
  blue: {
    bg: "#0062cc",
    muted: "rgba(255,255,255,0.62)",
    plate: "rgba(255,255,255,0.42)",
    cube: "rgba(255,255,255,0.7)",
    hl: "#ffffff",
    hlInk: "#0062cc",
    stages: ["#ffffff", "#cfe4ff", "#8fd0f5", "#5f95db"],
  },
};

const STAGES = ["New dispute", "Evidence attached", "Response filed", "Settled"];
const REASONS = ["ITEM NOT RECEIVED", "NOT AS DESCRIBED", "UNAUTHORIZED", "DUPLICATE CHARGE", "CREDIT NOT PROCESSED"];
const CYCLE = 5200; // ms
const COS30 = Math.cos(Math.PI / 6);
const C = 1.22; // half-size of the box, world units
const THREADS: [number, number][] = [[-0.4, 0.2], [0.1, -0.2], [0.4, 0.4], [-0.1, 0.6]];
const FACE: [number, number][] = [[-1, 1], [-1, 0.35], [-1.1, 0.25], [-1.1, -0.3], [-1, -0.4], [-1, -1], [1, -1], [1, 1]]; // with a folder tab

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function hexRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Dot colour for a fractional slot position: RGB blend between the neighbouring stage colours. */
function stageColor(stages: string[], p: number) {
  const q = clamp(p, 0, 3);
  const i = Math.min(2, Math.floor(q));
  const a = hexRgb(stages[i]), b = hexRgb(stages[i + 1]);
  const f = q - i;
  return `rgb(${a.map((v, k) => Math.round(lerp(v, b[k], f))).join(",")})`;
}

type Dot = { x: number; y: number; big: boolean; s: number };
type File = { header: string; dots: Dot[]; base: number };

function makeFile(base: number): File {
  const dots: Dot[] = [];
  for (let j = 0; j < 9; j++) {
    const n = 3 + Math.floor(Math.random() * 9); // 3–11, left-aligned like lines of text
    for (let i = 0; i < n; i++) {
      const big = Math.random() < 0.55;
      dots.push({ x: -0.78 + i * 0.13, y: -0.5 + j * 0.15, big, s: big ? rand(0.03, 0.045) : rand(0.012, 0.02) });
    }
  }
  const id = "PP-D-" + String(Math.floor(rand(10000, 99999)));
  const reason = REASONS[Math.floor(Math.random() * REASONS.length)];
  const amount = "$" + rand(14, 480).toFixed(2);
  return { header: `${id}   ${reason}   ${amount}`, dots, base };
}

export function CaseStack({ theme = "blue", className }: { theme?: "light" | "blue"; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;
    const T = THEMES[theme];
    const font = mono.style.fontFamily;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Layout (recomputed on resize)
    let W = 0, H = 0, dpr = 1, narrow = false;
    let S = 0, L = 0, ox = 0, oy = 0, th = 3, zTop = 0, zBot = 0;
    const slotZ = (p: number) => (3 - p) * L;

    const layout = () => {
      W = wrap.clientWidth;
      narrow = W < 640;
      const cubeW = W * (narrow ? 0.6 : 0.58);
      S = cubeW / (4 * C * COS30);
      L = S * 0.56;
      ox = cubeW / 2 + 2;
      zTop = 4 * L - 0.15 * L;
      zBot = -0.35 * L;
      oy = S * 0.35 + 2 * C * 0.5 * S + zTop;
      H = Math.ceil(oy + 2 * C * 0.5 * S + 0.45 * L + 8);
      th = Math.max(3, S * 0.045);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.height = `${H}px`;
    };

    let shake = 0; // px, pushes the stack and box down when a file lands
    const proj = (x: number, y: number, z: number, dx = 0): [number, number] => [
      ox + (x + dx - y) * COS30 * S,
      oy + (x + dx + y) * 0.5 * S - z + shake,
    ];

    // State: start mid-flow so the first frame is full
    let files: File[] = [-1, 0, 1, 2, 3].map(makeFile);
    let cycleStart = performance.now();
    let lastT = 0;
    let thudAt = -1e9;

    const drawPlate = (f: File, p: number) => {
      let z = slotZ(p), dx = 0, alpha = 1;
      if (p < 0) alpha = 1 + p;
      else if (p > 3) {
        z = slotZ(3) - (p - 3) * 0.25 * L;
        dx = (p - 3) * 1.9;
        alpha = 1 - (p - 3);
      }
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = T.plate;

      // 1. Thickness along the two front edges
      const a = proj(-1, 1, z, dx), b = proj(1, 1, z, dx), c = proj(1, -1, z, dx);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(c[0], c[1] + th);
      ctx.lineTo(b[0], b[1] + th);
      ctx.lineTo(a[0], a[1] + th);
      ctx.closePath();
      ctx.fillStyle = T.bg;
      ctx.fill();
      ctx.stroke();

      // 2. Top face with the folder tab; slightly see-through so lower files ghost through
      ctx.beginPath();
      FACE.forEach(([x, y], i) => {
        const [sx, sy] = proj(x, y, z, dx);
        if (i) ctx.lineTo(sx, sy);
        else ctx.moveTo(sx, sy);
      });
      ctx.closePath();
      ctx.globalAlpha = alpha * 0.94;
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.stroke();

      // 3. Contents, drawn in the plate's own plane
      const [mx, my] = proj(0, 0, z, dx);
      ctx.setTransform(dpr * COS30 * S, dpr * 0.5 * S, -dpr * COS30 * S, dpr * 0.5 * S, dpr * mx, dpr * my);
      ctx.fillStyle = stageColor(T.stages, p);
      for (const d of f.dots) {
        if (d.big) ctx.fillRect(d.x - d.s, d.y - d.s, 2 * d.s, 2 * d.s);
        else {
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.translate(-0.86, -0.78);
      ctx.scale(0.01, 0.01);
      ctx.font = `500 7.5px ${font}`;
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = T.muted;
      ctx.fillText(f.header, 0, 0);
      ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawBox = () => {
      ctx.save();
      ctx.strokeStyle = T.cube;
      ctx.lineWidth = 1.3;
      const back = (z: number) => proj(-C, -C, z), right = (z: number) => proj(C, -C, z);
      const front = (z: number) => proj(C, C, z), left = (z: number) => proj(-C, C, z);
      const seg = (p: [number, number], q: [number, number]) => {
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
      };
      ctx.beginPath();
      seg(back(zTop), right(zTop));
      seg(right(zTop), front(zTop));
      seg(front(zTop), left(zTop));
      seg(left(zTop), back(zTop));
      seg(left(zBot), front(zBot));
      seg(front(zBot), right(zBot));
      seg(left(zTop), left(zBot));
      seg(front(zTop), front(zBot));
      seg(right(zTop), right(zBot));
      ctx.stroke();
      ctx.restore();
    };

    const drawThreads = () => {
      ctx.save();
      ctx.strokeStyle = T.plate;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const [x, y] of THREADS) {
        const a = proj(x, y, slotZ(0)), b = proj(x, y, slotZ(3));
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
      ctx.restore();
    };

    const drawTimeline = (pos: number, hlAlpha: number) => {
      const boxRight = ox + 2 * C * COS30 * S;
      const ax = boxRight + (W - boxRight) * (narrow ? 0.18 : 0.3);
      const y0 = oy - slotZ(0) - S;
      const y1 = oy - slotZ(3) + S + th;
      const tick = narrow ? 6 : 12;
      const size = narrow ? 9 : 11;
      const lx = ax + (narrow ? 12 : 22);
      const labelY = (i: number) => y0 + ((y1 - y0) * i) / 3;
      const midY = oy - (zTop + zBot) / 2;

      ctx.save();
      ctx.strokeStyle = T.cube;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(boxRight, midY);
      ctx.lineTo(ax, midY);
      ctx.moveTo(ax, y0);
      ctx.lineTo(ax, y1);
      for (let k = 0; k <= 24; k++) {
        const y = y0 + ((y1 - y0) * k) / 24;
        ctx.moveTo(ax, y);
        ctx.lineTo(ax + tick, y);
      }
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(ax, labelY(i));
        ctx.lineTo(lx - 4, labelY(i));
      }
      ctx.stroke();

      ctx.font = `500 ${size}px ${font}`;
      ctx.textBaseline = "middle";
      const labels = STAGES.map((s) => s.toUpperCase());
      const widths = labels.map((l) => ctx.measureText(l).width);
      ctx.fillStyle = T.muted;
      labels.forEach((l, i) => ctx.fillText(l, lx, labelY(i)));

      // One highlight, gliding (and resizing) between labels
      if (hlAlpha > 0.001) {
        const i0 = Math.min(3, Math.floor(pos)), i1 = Math.min(3, i0 + 1), f = pos - i0;
        const y = lerp(labelY(i0), labelY(i1), f);
        const w = lerp(widths[i0], widths[i1], f) + 8;
        const h = size * 1.8;
        ctx.globalAlpha = hlAlpha;
        ctx.fillStyle = T.hl;
        ctx.fillRect(lx - 4, y - h / 2, w, h);
        ctx.fillRect(ax - 4, y - h / 2, 4, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(lx - 4, y - h / 2, w, h);
        ctx.clip();
        ctx.fillStyle = T.hlInk;
        labels.forEach((l, i) => ctx.fillText(l, lx, labelY(i)));
        ctx.restore();
      }
      ctx.restore();
    };

    const frame = (now: number) => {
      let t: number;
      if (reduced) t = 0;
      else {
        t = (now - cycleStart) / CYCLE;
        while (t >= 1) {
          cycleStart += CYCLE;
          t -= 1;
          lastT = 0;
          files.forEach((f) => f.base++);
          files = files.filter((f) => f.base <= 3);
          files.push(makeFile(-1));
        }
        if (lastT < 0.38 && t >= 0.38) thudAt = now;
        lastT = t;
      }
      const move = reduced ? 0 : ease(clamp(t / 0.38));
      shake = reduced ? 0 : 2.5 * clamp(1 - (now - thudAt) / 160);

      // Highlight position and opacity
      let pos = 0, hlAlpha = 1;
      if (!reduced) {
        if (t < 0.38) {
          pos = 3;
          hlAlpha = 1 - clamp(t / 0.2);
        } else {
          hlAlpha = clamp((t - 0.38) / 0.06);
          const seg = clamp((t - 0.46) / 0.5) * 3;
          const i = Math.min(2, Math.floor(seg));
          pos = t < 0.46 ? 0 : i + ease(clamp((seg - i) / 0.55));
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      drawThreads();
      const shown = (reduced ? files.filter((f) => f.base >= 0) : files).map((f) => ({ f, p: f.base + move }));
      shown.sort((a, b) => b.p - a.p).forEach(({ f, p }) => drawPlate(f, p));
      drawBox();
      shake = 0;
      drawTimeline(pos, hlAlpha);
    };

    let raf = 0;
    let visible = true;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (visible) frame(now);
    };

    const ro = new ResizeObserver(() => {
      layout();
      frame(performance.now());
    });
    ro.observe(wrap);
    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) cycleStart = performance.now() - lastT * CYCLE; // resume where it paused
    });
    io.observe(wrap);
    layout();
    document.fonts?.ready.then(() => frame(performance.now()));
    if (reduced) frame(performance.now());
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [theme]);

  return (
    <div ref={wrapRef} aria-hidden className={cn(mono.className, "w-full", className)}>
      <canvas ref={ref} className="block w-full" />
    </div>
  );
}
