/**
 * Shared bits for the landing page's square-dot canvases: the cell grid, the ink palette,
 * smooth noise, and a canvas loop with a cursor heat trail that only runs while visible and stops
 * for reduced motion.
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

/** Cursor heat in [0, 1] for a cell: 0 is untouched, 1 is right under the pointer. */
export type Heat = (x: number, y: number) => number;

const HEAT_RADIUS = 4.5; // cells
const HEAT_HALF_LIFE = 0.35; // seconds for a trail to cool by half

/**
 * The colour a heated cell takes, hottest first: a copper core, a black ring, then a dark halo.
 * Returns null when the cell is too cool to override its normal tone.
 */
export function heatColor(h: number) {
  if (h > 0.86) return SIGNAL;
  if (h > 0.48) return INK[4];
  if (h > 0.2) return INK[3];
  return null;
}

/**
 * Sizes a canvas to its box at device pixel ratio and calls `draw` about `fps` times a second,
 * only while the canvas is on screen. The pointer leaves a fading trail of heat across the cells,
 * which `draw` reads through `heat(x, y)`. With prefers-reduced-motion it draws one still frame
 * and ignores the pointer. Returns a cleanup function.
 */
export function runCanvas(
  canvas: HTMLCanvasElement,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number, t: number, heat: Heat) => void,
  { fps = 24 }: { fps?: number } = {},
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let cells = new Float32Array(0);
  let raf = 0;
  let visible = false;
  let last = 0;
  const start = performance.now();
  // Pointer in viewport px (converted to cells every frame, so scrolling under a still mouse works too);
  // `prev` is the last stamped cell position, so fast moves leave a continuous trail.
  let client: { x: number; y: number } | null = null;
  let prev: { x: number; y: number } | null = null;

  const heat: Heat = (x, y) => (x >= 0 && y >= 0 && x < cols && y < rows ? cells[y * cols + x] : 0);

  const stamp = (cx: number, cy: number) => {
    const r = Math.ceil(HEAT_RADIUS);
    for (let y = Math.max(0, Math.floor(cy) - r); y <= Math.min(rows - 1, Math.floor(cy) + r); y++) {
      for (let x = Math.max(0, Math.floor(cx) - r); x <= Math.min(cols - 1, Math.floor(cx) + r); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / HEAT_RADIUS;
        if (d < 1) cells[y * cols + x] = Math.max(cells[y * cols + x], 1 - d * d);
      }
    }
  };

  const toCells = () => {
    if (!client) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (client.x - rect.left) / PITCH;
    const y = (client.y - rect.top) / PITCH;
    const inside = x >= -HEAT_RADIUS && y >= -HEAT_RADIUS && x <= cols + HEAT_RADIUS && y <= rows + HEAT_RADIUS;
    return inside ? { x, y } : null;
  };

  const updateHeat = (dt: number) => {
    const keep = 0.5 ** (dt / HEAT_HALF_LIFE);
    for (let i = 0; i < cells.length; i++) cells[i] = cells[i] < 0.01 ? 0 : cells[i] * keep;
    const pointer = toCells();
    if (!pointer) {
      prev = null;
      return;
    }
    const from = prev ?? pointer;
    const steps = Math.max(1, Math.ceil(Math.hypot(pointer.x - from.x, pointer.y - from.y)));
    for (let i = 1; i <= steps; i++) {
      stamp(from.x + ((pointer.x - from.x) * i) / steps, from.y + ((pointer.y - from.y) * i) / steps);
    }
    prev = pointer;
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    cols = Math.ceil(width / PITCH);
    rows = Math.ceil(height / PITCH);
    cells = new Float32Array(cols * rows);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, width, height, reduced ? 0 : (performance.now() - start) / 1000, heat);
  };

  const tick = (now: number) => {
    raf = 0;
    if (!visible || reduced) return;
    if (now - last >= 1000 / fps) {
      updateHeat(last ? Math.min((now - last) / 1000, 0.1) : 0);
      last = now;
      draw(ctx, width, height, (now - start) / 1000, heat);
    }
    raf = requestAnimationFrame(tick);
  };

  // Listen on the window: the canvas can sit under other layers.
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
}
