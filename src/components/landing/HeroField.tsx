"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * The hero's line field, after base.org, drawn on the GPU so it stays smooth.
 *
 * Pass 1 renders one brightness value per 7px cell into a small texture: a few short-lived shapes
 * (streaks that bend from horizontal into a vertical run, faceted crystals), click ripples, and the
 * cursor, which drags a lagging trail of soft blobs. Pass 2 draws every cell as a vertical stroke
 * whose thickness and colour step up with brightness; strokes of the same thickness join into one
 * line. A horizontal streak reads as a row of ticks, a vertical one as a single line, and the cursor
 * trail as a lens of bars.
 *
 * Choreography with the page:
 * - The field keeps clear of `[data-hero-copy]` (the headline block) and fades at the edges.
 * - Over a link inside `[data-hero-cta]` the lens snaps to that button and stretches into tall bars,
 *   and the field is allowed to show around it. Clicking anywhere in the hero sends a ripple.
 * - Once the headline has landed, one streak launches from the end of `[data-hero-launch]`, bends
 *   down out of the hero above `[data-handoff-target]`, and on leaving fires `sira:handoff` on
 *   window so the stage below can pick the case up.
 *
 * Decorative (aria-hidden); paused offscreen; nothing is drawn for reduced motion or without
 * WebGL 2 (the stage then starts on its own).
 */

const CELL = 7; // css px
const MAX_PTS = 96; // streak samples
const MAX_CRYSTALS = 4;
const MAX_RIPPLES = 4;
const TRAIL = 10;
const TRAIL_LAG = 0.18;
const MAX_SHAPES = 3;
const LAUNCH_AT = 1.95; // seconds after load: just as the scan across the headline finishes
const RIPPLE_LIFE = 1.6;

export const HANDOFF_EVENT = "sira:handoff";

/** Thin to thick: cyan hairline, pale blue, mid blue, vivid PayPal blue. */
const TIER_RGB = [
  [0, 156, 222],
  [143, 195, 238],
  [91, 157, 240],
  [0, 112, 224],
].map((c) => c.map((v) => v / 255));

const QUAD_VS = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

/** Pass 1: brightness per cell (row 0 = top). */
const LUM_FS = `#version 300 es
precision highp float;
uniform float u_cell;
uniform vec4 u_pts[${MAX_PTS}];       // x, y (cells), value, radius
uniform int u_ptCount;
uniform vec4 u_cryA[${MAX_CRYSTALS}]; // cx, cy, R, grow
uniform vec4 u_cryB[${MAX_CRYSTALS}]; // ax, ay, out, age
uniform float u_crySeed[${MAX_CRYSTALS}];
uniform int u_cryCount;
uniform vec3 u_ripples[${MAX_RIPPLES}]; // x, y (css px), age (s)
uniform int u_rippleCount;
uniform vec2 u_trail[${TRAIL}];       // css px
uniform float u_trailAlpha;
uniform float u_blobR;                // css px
uniform vec2 u_blobScale;             // stretches the lens (taller over a button)
out vec4 o;

float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float noise(vec2 p, float z) {
  vec2 i = floor(p), f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(vec3(i, z)), hash(vec3(i + vec2(1, 0), z)), f.x),
             mix(hash(vec3(i + vec2(0, 1), z)), hash(vec3(i + vec2(1, 1), z)), f.x), f.y);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 c = cell + 0.5;
  vec2 px = c * u_cell;
  float lum = 0.0;

  for (int i = 0; i < ${MAX_PTS}; i++) {
    if (i >= u_ptCount) break;
    vec4 p = u_pts[i];
    lum = max(lum, p.z * (1.0 - smoothstep(0.0, p.w, distance(c, p.xy))));
  }

  for (int k = 0; k < ${MAX_CRYSTALS}; k++) {
    if (k >= u_cryCount) break;
    vec4 a = u_cryA[k], b = u_cryB[k];
    vec2 d = cell - a.xy;
    float facet = abs(d.x) * b.x + abs(d.y) * b.y + (noise(d * 0.45, u_crySeed[k]) - 0.5) * 3.2;
    float r = facet / a.z;
    if (r > 1.0 || r > a.w) continue;
    if (hash(vec3(d, u_crySeed[k] + 7.0)) < b.z) continue; // dissolves cell by cell
    lum = max(lum, (1.08 - r * 0.75) * (0.9 + 0.1 * sin(b.w * 4.0 + d.x + d.y)));
  }

  for (int k = 0; k < ${MAX_RIPPLES}; k++) {
    if (k >= u_rippleCount) break;
    vec3 rp = u_ripples[k];
    float off = distance(px, rp.xy) - rp.z * 520.0;
    lum = max(lum, exp(-(off * off) / 500.0) * exp(-rp.z * 1.7) * 1.05);
  }

  if (u_trailAlpha > 0.001) {
    float a = 0.0;
    for (int k = 0; k < ${TRAIL}; k++) {
      float d = length((px - u_trail[k]) / u_blobScale);
      a += (1.0 - smoothstep(0.0, u_blobR, d)) * exp(-0.42 * float(k)) * 0.3;
    }
    a = min(a, 1.0) * u_trailAlpha;
    lum = lum * (1.0 - a) + a;
  }

  lum = clamp((lum - 0.5) * 3.1 + 0.5, 0.0, 1.0);
  o = vec4(lum, 0.0, 0.0, 1.0);
}`;

/** Pass 2: strokes, at full resolution. */
const LINE_FS = `#version 300 es
precision highp float;
uniform sampler2D u_lum;
uniform vec2 u_size;       // css px
uniform float u_dpr;
uniform float u_cell;
uniform vec3 u_colors[4];
uniform vec4 u_clear;      // centre xy, radii zw (css px): the headline block
uniform vec4 u_focus;      // centre xy, radius, strength: lets the field show around a hovered button
out vec4 o;

int tierOf(float l) { return l < 0.2 ? -1 : l < 0.4 ? 0 : l < 0.6 ? 1 : l < 0.8 ? 2 : 3; }
float halfOf(int t) { return (t == 0 ? 0.0625 : t == 1 ? 0.25 : t == 2 ? 0.375 : 0.5) * 0.66; }
int tierAt(ivec2 c) {
  ivec2 n = textureSize(u_lum, 0);
  if (c.y < 0 || c.y >= n.y) return -1;
  return tierOf(texelFetch(u_lum, c, 0).r);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_size.y * u_dpr - gl_FragCoord.y) / u_dpr;
  ivec2 cell = ivec2(floor(p / u_cell));
  vec2 in_ = fract(p / u_cell);
  int t0 = tierAt(cell);
  if (t0 < 0) discard;
  bool samePrev = tierAt(cell - ivec2(0, 1)) == t0;
  bool sameNext = tierAt(cell + ivec2(0, 1)) == t0;

  float h = halfOf(t0);
  float aa = 0.75 / (u_cell * u_dpr);
  float across = abs(in_.x - 0.5);
  float gap = 0.045 * 0.5;
  float y0 = samePrev ? -1.0 : gap;
  float y1 = sameNext ? 2.0 : 1.0 - gap;
  float rho = h * 0.44;

  // Rounded-rectangle distance in cell units (negative inside).
  float cy = clamp(in_.y, y0 + rho, y1 - rho);
  vec2 q = vec2(max(across - (h - rho), 0.0), abs(in_.y - cy));
  float dRound = length(q) - rho;
  float dBody = max(across - h, max(y0 - in_.y, in_.y - y1));
  float d = (in_.y < y0 + rho && !samePrev) || (in_.y > y1 - rho && !sameNext) ? dRound : dBody;
  float ink = 1.0 - smoothstep(-aa, aa, d);

  // Keep the headline clear (except around a hovered button) and soften the edges.
  float e = length((p - u_clear.xy) / u_clear.zw);
  float m = smoothstep(0.75, 1.25, e);
  m = max(m, u_focus.w * (1.0 - smoothstep(u_focus.z * 0.55, u_focus.z, distance(p, u_focus.xy))));
  m *= clamp(p.x / 80.0, 0.0, 1.0) * clamp((u_size.x - p.x) / 80.0, 0.0, 1.0);
  m *= clamp(p.y / 120.0, 0.0, 1.0) * clamp((u_size.y - p.y) / 40.0, 0.0, 1.0);

  float a = ink * m;
  if (a < 0.003) discard;
  o = vec4(u_colors[t0] * a, a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}
function program(gl: WebGL2RenderingContext, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, QUAD_VS));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, "a_pos");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
  return p;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Frame-rate independent easing: `rate` is the share covered per 60fps frame. */
const ease = (rate: number, dt: number) => 1 - Math.pow(1 - rate, dt * 60);
const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* Shapes (CPU side: just positions and envelopes)                     */
/* ------------------------------------------------------------------ */

type Streak = {
  kind: "streak"; x: number; y: number; born: number; dir: number; down: number; bends: boolean;
  L1: number; r: number; arc: number; total: number; speed: number; tail: number; handoff?: boolean;
};
type Crystal = { kind: "crystal"; x: number; y: number; born: number; R: number; ax: number; ay: number; life: number; seed: number };
type Shape = Streak | Crystal;

function makeStreak(t: number, x: number, y: number): Streak {
  const bends = Math.random() < 0.75;
  const L1 = rand(12, 26);
  const r = rand(3, 7);
  const arc = bends ? (Math.PI / 2) * r : 0;
  return {
    kind: "streak", x, y, born: t, bends, L1, r, arc,
    dir: Math.random() < 0.5 ? 1 : -1,
    down: Math.random() < 0.65 ? 1 : -1,
    total: L1 + arc + (bends ? rand(10, 22) : 0),
    speed: rand(14, 22),
    tail: rand(12, 20),
  };
}
function makeCrystal(t: number, x: number, y: number): Crystal {
  return { kind: "crystal", x, y, born: t, R: rand(4, 8), ax: rand(0.6, 1.4), ay: rand(0.6, 1.4), life: rand(3.5, 5.5), seed: Math.floor(rand(1, 900)) };
}
const done = (s: Shape, t: number) =>
  s.kind === "streak" ? (t - s.born) * s.speed - s.tail > s.total : t - s.born > s.life;

function streakAt(s: Streak, d: number): [number, number] {
  if (d <= s.L1 || !s.bends) return [s.x + s.dir * d, s.y];
  if (d <= s.L1 + s.arc) {
    const a = (d - s.L1) / s.r;
    return [s.x + s.dir * (s.L1 + Math.sin(a) * s.r), s.y + s.down * (1 - Math.cos(a)) * s.r];
  }
  return [s.x + s.dir * (s.L1 + s.r), s.y + s.down * (s.r + (d - s.L1 - s.arc))];
}

/* ------------------------------------------------------------------ */

export function HeroField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return;

    let lumProg: WebGLProgram, lineProg: WebGLProgram;
    try {
      lumProg = program(gl, LUM_FS);
      lineProg = program(gl, LINE_FS);
    } catch {
      return;
    }
    const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    const fb = gl.createFramebuffer();
    const section = canvas.parentElement;

    let w = 0, h = 0, dpr = 1, cols = 0, rows = 0;
    let clear = [0, 0, 1, 1];
    let raf = 0;
    let visible = false;
    let last = 0;
    let time = 0;
    let shapes: Shape[] = [];
    let nextSpawn = 0.3;
    let launched = false;
    let handedOff = false;
    let ripples: { x: number; y: number; born: number }[] = [];

    // Pointer (viewport px), the button it's over (if any), and the eased lens state.
    let client: { x: number; y: number } | null = null;
    let button: HTMLElement | null = null;
    let trail: { x: number; y: number }[] | null = null;
    let trailAlpha = 0;
    let lock = 0; // 0 free, 1 snapped to a button
    const scale = { x: 1, y: 1 };
    const focus = { x: 0, y: 0, r: 150 };

    const pts = new Float32Array(MAX_PTS * 4);
    const cryA = new Float32Array(MAX_CRYSTALS * 4);
    const cryB = new Float32Array(MAX_CRYSTALS * 4);
    const crySeed = new Float32Array(MAX_CRYSTALS);
    const rippleBuf = new Float32Array(MAX_RIPPLES * 3);
    const trailBuf = new Float32Array(TRAIL * 2);

    /** Viewport point to canvas px. */
    const local = (x: number, y: number) => {
      const c = canvas.getBoundingClientRect();
      return { x: x - c.left, y: y - c.top };
    };
    const measureClear = () => {
      const copy = section?.querySelector<HTMLElement>("[data-hero-copy]");
      const r = canvas.getBoundingClientRect();
      if (!copy) return;
      const c = copy.getBoundingClientRect();
      clear = [c.left - r.left + c.width / 2, c.top - r.top + c.height / 2, c.width * 0.62 + 40, c.height * 0.62 + 40];
    };
    /** Rough visibility at a cell (matches the shader's mask), for placing shapes. */
    const open = (cx: number, cy: number) => {
      const px = cx * CELL, py = cy * CELL;
      const e = Math.hypot((px - clear[0]) / clear[2], (py - clear[1]) / clear[3]);
      return smooth(0.75, 1.25, e) * Math.min(1, px / 80, (w - px) / 80) * Math.min(1, py / 120, (h - py) / 40);
    };

    /** The one streak that carries the case from the headline down into the stage. */
    const launch = () => {
      launched = true;
      const from = section?.querySelector<HTMLElement>("[data-hero-launch]")?.getBoundingClientRect();
      const to = document.querySelector<HTMLElement>("[data-handoff-target]")?.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      if (!from) return;
      const x = Math.round((from.right - c.left) / CELL) + 1;
      const y = Math.round((from.top + from.height * 0.55 - c.top) / CELL);
      const targetX = to ? Math.round((to.left + to.width / 2 - c.left) / CELL) : x + 24;
      const r = 5;
      const run = targetX - r - x;
      const dir = run >= 0 ? 1 : -1;
      const L1 = Math.max(6, Math.abs(run));
      const arc = (Math.PI / 2) * r;
      const L2 = Math.max(8, rows - (y + r) + 4); // through the bottom edge
      shapes.push({
        kind: "streak", x, y, born: time, dir, down: 1, bends: true, L1, r, arc,
        total: L1 + arc + L2, speed: 46, tail: 22, handoff: true,
      });
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      cols = Math.max(1, Math.ceil(w / CELL));
      rows = Math.max(1, Math.ceil(h / CELL));
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      measureClear();
    };

    const update = (dt: number) => {
      time += dt;
      if (!launched && time >= LAUNCH_AT) launch();

      for (const s of shapes) {
        if (s.kind === "streak" && s.handoff && !handedOff && (time - s.born) * s.speed >= s.total) {
          handedOff = true;
          window.dispatchEvent(new CustomEvent(HANDOFF_EVENT));
        }
      }
      shapes = shapes.filter((s) => !done(s, time));
      const ambient = shapes.filter((s) => !(s.kind === "streak" && s.handoff));
      if (time >= nextSpawn && ambient.length < MAX_SHAPES) {
        for (let tries = 0; tries < 24; tries++) {
          const x = Math.round(rand(6, cols - 6)), y = Math.round(rand(4, rows - 4));
          if (open(x, y) < 0.7 || shapes.some((s) => Math.hypot(s.x - x, s.y - y) < 24)) continue;
          const crystals = shapes.filter((s) => s.kind === "crystal").length;
          shapes.push(Math.random() < 0.6 || crystals >= MAX_CRYSTALS ? makeStreak(time, x, y) : makeCrystal(time, x, y));
          break;
        }
        nextSpawn = time + rand(0.7, 1.5);
      }
      ripples = ripples.filter((r) => time - r.born < RIPPLE_LIFE);

      // Lens: follows the pointer, or snaps to the button under it.
      const c = canvas.getBoundingClientRect();
      let target: { x: number; y: number } | null = null;
      if (button) {
        const b = button.getBoundingClientRect();
        target = { x: b.left + b.width / 2 - c.left, y: b.top + b.height / 2 - c.top };
        focus.x = target.x;
        focus.y = target.y;
        focus.r = Math.max(110, b.width * 0.75);
      } else if (client) {
        const p = { x: client.x - c.left, y: client.y - c.top };
        if (p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h) target = p;
      }
      lock = lerp(lock, button ? 1 : 0, ease(0.12, dt));
      scale.x = lerp(1, 1.2, lock);
      scale.y = lerp(1, 1.4, lock);
      trailAlpha = lerp(trailAlpha, target ? 1 : 0, ease(0.1, dt));
      if (target) {
        if (!trail) trail = Array.from({ length: TRAIL }, () => ({ ...target! }));
        const k = ease(button ? 0.22 : 1, dt); // glide onto a button; track the pointer directly
        trail[0].x = lerp(trail[0].x, target.x, k);
        trail[0].y = lerp(trail[0].y, target.y, k);
      }
      if (trail) {
        const k = ease(TRAIL_LAG, dt);
        for (let i = 1; i < TRAIL; i++) {
          trail[i].x = lerp(trail[i].x, trail[i - 1].x, k);
          trail[i].y = lerp(trail[i].y, trail[i - 1].y, k);
        }
        if (!target && trailAlpha < 0.01) trail = null;
      }
    };

    const render = () => {
      let n = 0, c = 0;
      for (const s of shapes) {
        if (s.kind === "streak") {
          const head = (time - s.born) * s.speed;
          for (let k = 0; k <= s.tail && n < MAX_PTS; k += 1) {
            const d = head - k;
            if (d < 0 || d > s.total) continue;
            const [x, y] = streakAt(s, d);
            pts.set([x + 0.5, y + 0.5, 1.05 - 0.5 * (k / s.tail), 1.8], n * 4);
            n++;
          }
        } else if (c < MAX_CRYSTALS) {
          const age = time - s.born;
          cryA.set([s.x, s.y, s.R, smooth(0, 1.1, age)], c * 4);
          cryB.set([s.ax, s.ay, smooth(s.life - 1.4, s.life, age), age], c * 4);
          crySeed[c] = s.seed;
          c++;
        }
      }
      ripples.slice(-MAX_RIPPLES).forEach((r, i) => rippleBuf.set([r.x, r.y, time - r.born], i * 3));
      if (trail) trail.forEach((p, i) => trailBuf.set([p.x, p.y], i * 2));

      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, cols, rows);
      gl.disable(gl.BLEND);
      gl.useProgram(lumProg);
      gl.uniform1f(U(lumProg, "u_cell"), CELL);
      gl.uniform4fv(U(lumProg, "u_pts"), pts);
      gl.uniform1i(U(lumProg, "u_ptCount"), n);
      gl.uniform4fv(U(lumProg, "u_cryA"), cryA);
      gl.uniform4fv(U(lumProg, "u_cryB"), cryB);
      gl.uniform1fv(U(lumProg, "u_crySeed"), crySeed);
      gl.uniform1i(U(lumProg, "u_cryCount"), c);
      gl.uniform3fv(U(lumProg, "u_ripples"), rippleBuf);
      gl.uniform1i(U(lumProg, "u_rippleCount"), Math.min(ripples.length, MAX_RIPPLES));
      gl.uniform2fv(U(lumProg, "u_trail"), trailBuf);
      gl.uniform1f(U(lumProg, "u_trailAlpha"), trail ? trailAlpha : 0);
      gl.uniform1f(U(lumProg, "u_blobR"), 0.18 * Math.min(h, 640));
      gl.uniform2f(U(lumProg, "u_blobScale"), scale.x, scale.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(lineProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U(lineProg, "u_lum"), 0);
      gl.uniform2f(U(lineProg, "u_size"), w, h);
      gl.uniform1f(U(lineProg, "u_dpr"), dpr);
      gl.uniform1f(U(lineProg, "u_cell"), CELL);
      gl.uniform3fv(U(lineProg, "u_colors"), TIER_RGB.flat());
      gl.uniform4fv(U(lineProg, "u_clear"), clear);
      gl.uniform4f(U(lineProg, "u_focus"), focus.x, focus.y, focus.r, lock * trailAlpha);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible) {
        last = 0;
        return;
      }
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      update(dt);
      render();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") {
        client = null;
        button = null;
        return;
      }
      client = { x: e.clientX, y: e.clientY };
      const t = e.target instanceof Element ? e.target : null;
      button = t?.closest<HTMLElement>("[data-hero-cta] a, [data-hero-cta] button") ?? null;
    };
    const onLeave = () => {
      client = null;
      button = null;
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      const b = t?.closest<HTMLElement>("[data-hero-cta] a, [data-hero-cta] button")?.getBoundingClientRect();
      const x = b ? b.left + b.width / 2 : e.clientX;
      const y = b ? b.top + b.height / 2 : e.clientY;
      const p = local(x, y);
      if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) return;
      ripples.push({ ...p, born: time });
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    resize();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gl.deleteProgram(lumProg);
      gl.deleteProgram(lineProg);
      gl.deleteTexture(tex);
      gl.deleteFramebuffer(fb);
      gl.deleteBuffer(quad);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
