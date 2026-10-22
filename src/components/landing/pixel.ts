/**
 * Shared bits for the landing page's square-dot canvases: the cell grid, the ink palette,
 * smooth noise, and a canvas loop that only runs while visible and stops for reduced motion.
 */

/** Cell pitch in CSS px: an 11px square plus a 1px gutter. The page's faint CSS grid uses the same pitch. */
export const PITCH = 12;
export const CELL = 11;

/** Ink tones from faint to dark. Serious and monochrome; copper is a rare signal, never a fill. */
export const INK = ["#d9d6cf", "#a9a59c", "#6c6862", "#34312e", "#141312"] as const;
export const SIGNAL = "#b4552f";

/* ------------------------------------------------------------------ */
/* Value noise (smooth, cheap, deterministic)                          */
/* ------------------------------------------------------------------ */

function hash(x: number, y: number, z: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 3D value noise in [0, 1]. */
export function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
}

/** Two octaves of noise: broad shapes with a little texture. */
export function fbm(x: number, y: number, z: number) {
  return noise3(x, y, z) * 0.7 + noise3(x * 2.3, y * 2.3, z * 1.7) * 0.3;
}

/** Stable per-cell random in [0, 1). */
export const cellRandom = (x: number, y: number, seed = 0) => hash(x, y, seed + 17);

/* ------------------------------------------------------------------ */
/* Canvas loop                                                          */
/* ------------------------------------------------------------------ */

/**
 * Sizes a canvas to its box at device pixel ratio and calls `draw(t)` about `fps` times a second,
 * only while the canvas is on screen. With prefers-reduced-motion it draws one still frame.
 * Returns a cleanup function.
 */
export function runCanvas(
  canvas: HTMLCanvasElement,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => void,
  { fps = 24 }: { fps?: number } = {},
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let height = 0;
  let raf = 0;
  let visible = false;
  let last = 0;
  const start = performance.now();

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, width, height, reduced ? 0 : (performance.now() - start) / 1000);
  };

  const tick = (now: number) => {
    raf = 0;
    if (!visible || reduced) return;
    if (now - last >= 1000 / fps) {
      last = now;
      draw(ctx, width, height, (now - start) / 1000);
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
}
