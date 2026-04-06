"use client";

import { useRef, useEffect, useCallback } from "react";

// ── Config ──────────────────────────────────────────────────
const SGR_OPACITY = 0.17;      // 17%
const SGR_SPEED = 0.2;         // 0.2x
const SOLAR_OPACITY = 0.075;   // 7.5%
const SOLAR_SPEED = 0.6;       // 0.6x
const FADE_MS = 3000;          // crossfade duration

interface BackgroundAnimationProps {
  vizMode: 'list' | 'graph';
}

// ── Math helpers ────────────────────────────────────────────
function prng(n: number) { const x = Math.sin(n + 1) * 43758.5453; return x - Math.floor(x); }
function hexRgb(h: string) { return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) }; }
function toRad(d: number) { return d * Math.PI / 180; }

function solveKepler(M: number, e: number) {
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let E = M;
  for (let i = 0; i < 20; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-11) break;
  }
  return E;
}

// ── S-star data (Sgr A*) ────────────────────────────────────
const S_STARS = [
  { a: 0.123, e: 0.884, T: 16.0, omega: 66, inc: 134, Omega: 228, col: '#9ab8ff', sz: 2.2 },
  { a: 0.291, e: 0.556, T: 94.1, omega: 342, inc: 119, Omega: 68, col: '#cce0ff', sz: 1.6 },
  { a: 0.261, e: 0.803, T: 94.1, omega: 76, inc: 97, Omega: 110, col: '#ffd4a0', sz: 1.7 },
  { a: 0.177, e: 0.820, T: 19.2, omega: 17, inc: 171, Omega: 101, col: '#ffffff', sz: 1.6 },
  { a: 0.101, e: 0.721, T: 12.8, omega: 241, inc: 150, Omega: 325, col: '#aaccff', sz: 1.5 },
  { a: 0.190, e: 0.963, T: 9.9, omega: 105, inc: 45, Omega: 155, col: '#ffeecc', sz: 1.7 },
  { a: 0.320, e: 0.650, T: 130.0, omega: 200, inc: 78, Omega: 290, col: '#ccddff', sz: 1.3 },
  { a: 0.220, e: 0.720, T: 36.0, omega: 130, inc: 160, Omega: 45, col: '#ddeeff', sz: 1.4 },
  { a: 0.270, e: 0.500, T: 76.0, omega: 310, inc: 55, Omega: 200, col: '#ffddc8', sz: 1.3 },
  { a: 0.145, e: 0.840, T: 21.0, omega: 55, inc: 110, Omega: 330, col: '#aabbff', sz: 1.5 },
  { a: 0.380, e: 0.410, T: 170.0, omega: 180, inc: 90, Omega: 0, col: '#eeeeff', sz: 1.2 },
  { a: 0.190, e: 0.760, T: 28.0, omega: 280, inc: 140, Omega: 75, col: '#ffffcc', sz: 1.3 },
];

// ── Solar system data ───────────────────────────────────────
const VIEW_TILT = 0.72;
const EARTH_PERIOD = 1800;
const RING_TILT = 0.32;

const PLANETS = [
  { name: 'Mercury', oF: 0.105, T: 0.30, r: 5, rot: 0, ecc: 0.38, w: 0.5 },
  { name: 'Venus', oF: 0.165, T: 0.55, r: 8, rot: 0, ecc: 0.04, w: 1.3 },
  { name: 'Earth', oF: 0.235, T: 1.00, r: 9, rot: 0, ecc: 0.08, w: 2.0 },
  { name: 'Mars', oF: 0.310, T: 1.50, r: 7, rot: 0, ecc: 0.18, w: 3.2 },
  { name: 'Jupiter', oF: 0.445, T: 3.00, r: 29, rot: 0, ecc: 0.10, w: 0.9 },
  { name: 'Saturn', oF: 0.590, T: 4.50, r: 18, rot: 0, ecc: 0.11, w: 2.5 },
  { name: 'Uranus', oF: 0.735, T: 7.00, r: 18, rot: 0, ecc: 0.09, w: 4.0 },
  { name: 'Neptune', oF: 0.880, T: 9.50, r: 17, rot: 0, ecc: 0.06, w: 5.1 },
];
const ROT_SPEEDS = [0.003, -0.002, 0.008, 0.0078, 0.018, 0.015, -0.009, 0.0085];

// ── Types ───────────────────────────────────────────────────
interface SgrStar {
  a: number; e: number; T: number; omega: number; inc: number; Omega: number;
  col: string; sz: number; rgb: { r: number; g: number; b: number };
  trail: { x: number; y: number }[]; trailMax: number; tOff: number;
  orb: { x: number; y: number }[];
}

type Mode = 'sgr' | 'solar';

export function BackgroundAnimation({ vizMode }: BackgroundAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vizModeRef = useRef(vizMode);
  vizModeRef.current = vizMode;
  const stateRef = useRef<{
    raf: number | null;
    mode: Mode;
    targetMode: Mode;
    fadeStart: number | null;
    W: number; H: number; cx: number; cy: number;
    // Sgr state
    sgrT: number;
    sgrStars: SgrStar[];
    // Solar state
    solarT: number;
    solarRots: number[];
    solarStarfieldCache: HTMLCanvasElement | null;
  }>({
    raf: null, mode: 'sgr', targetMode: 'sgr', fadeStart: null,
    W: 0, H: 0, cx: 0, cy: 0,
    sgrT: 0, sgrStars: [],
    solarT: 0, solarRots: PLANETS.map(() => 0), solarStarfieldCache: null,
  });

  // ══════════════════════════════════════════════════════════
  // SGR A* HELPERS
  // ══════════════════════════════════════════════════════════
  const sgrScale = useCallback(() => Math.min(stateRef.current.W, stateRef.current.H) * 1.40, []);

  const orbPos = useCallback((star: typeof S_STARS[0], t: number) => {
    const { a, e, T, omega: omg, inc: i, Omega: O } = star;
    const E = solveKepler((2 * Math.PI / T) * t, e);
    const xo = a * (Math.cos(E) - e), yo = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const w = toRad(omg), ci = Math.cos(toRad(i)), cO = Math.cos(toRad(O)), sO = Math.sin(toRad(O));
    const xw = xo * Math.cos(w) - yo * Math.sin(w), yw = xo * Math.sin(w) + yo * Math.cos(w);
    const { cx, cy } = stateRef.current;
    const sc = sgrScale();
    return { x: cx + (cO * xw - sO * ci * yw) * sc, y: cy - (sO * xw + cO * ci * yw) * sc };
  }, [sgrScale]);

  const buildOrbitPath = useCallback((star: typeof S_STARS[0]) => {
    const pts: { x: number; y: number }[] = [];
    const N = 120;
    const { a, e, omega: omg, inc: i, Omega: O } = star;
    const w = toRad(omg), ci = Math.cos(toRad(i)), cO = Math.cos(toRad(O)), sO = Math.sin(toRad(O));
    const { cx, cy } = stateRef.current;
    const sc = sgrScale();
    for (let j = 0; j <= N; j++) {
      const E = (j / N) * 2 * Math.PI;
      const xo = a * (Math.cos(E) - e), yo = a * Math.sqrt(1 - e * e) * Math.sin(E);
      const xw = xo * Math.cos(w) - yo * Math.sin(w), yw = xo * Math.sin(w) + yo * Math.cos(w);
      pts.push({ x: cx + (cO * xw - sO * ci * yw) * sc, y: cy - (sO * xw + cO * ci * yw) * sc });
    }
    return pts;
  }, [sgrScale]);

  // ══════════════════════════════════════════════════════════
  // SOLAR SYSTEM HELPERS
  // ══════════════════════════════════════════════════════════
  function solarMaxR() {
    const { W, H } = stateRef.current;
    const pad = 45;
    return Math.min(W / 2 - pad, (H / 2 - pad) / VIEW_TILT);
  }

  function sphereShade(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    const s = ctx.createRadialGradient(x - r * .28, y - r * .28, 0, x, y, r);
    s.addColorStop(0, 'rgba(255,255,255,0.13)');
    s.addColorStop(0.45, 'rgba(0,0,0,0)');
    s.addColorStop(1, 'rgba(0,0,0,0.48)');
    ctx.fillStyle = s; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function drawSun(ctx: CanvasRenderingContext2D) {
    const { cx, cy } = stateRef.current;
    const r = 46;
    ctx.save(); ctx.globalAlpha *= 0.75;
    const c1 = ctx.createRadialGradient(cx, cy, r * .7, cx, cy, r * 5.5);
    c1.addColorStop(0, 'rgba(255,215,80,0.14)'); c1.addColorStop(.4, 'rgba(255,170,30,0.04)'); c1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(cx, cy, r * 5.5, 0, Math.PI * 2); ctx.fill();
    const c2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6);
    c2.addColorStop(0, 'rgba(255,250,220,0.25)'); c2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2); ctx.fill();
    const body = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    body.addColorStop(0, '#fffff2'); body.addColorStop(.35, '#ffee80'); body.addColorStop(.75, '#ffcc28'); body.addColorStop(1, '#dd8800');
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawMercury(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#8a8a8a'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    const craters = [{ lon: 0.5, lat: 0.2, s: .35 }, { lon: 2.0, lat: -.3, s: .25 }, { lon: -1.0, lat: 0.1, s: .3 }, { lon: 3.2, lat: -.1, s: .2 }];
    for (const c of craters) {
      const vis = Math.cos(c.lon + rot); if (vis < 0) continue;
      ctx.fillStyle = 'rgba(60,60,60,0.5)';
      ctx.beginPath(); ctx.arc(x + Math.sin(c.lon + rot) * r * .78, y - c.lat * r, r * c.s * vis, 0, Math.PI * 2); ctx.fill();
    }
    sphereShade(ctx, x, y, r); ctx.restore();
  }

  function drawVenus(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _rot: number) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    const base = ctx.createRadialGradient(x - r * .2, y - r * .2, 0, x, y, r);
    base.addColorStop(0, '#f0e0b8'); base.addColorStop(.6, '#dcc890'); base.addColorStop(1, '#c0a060');
    ctx.fillStyle = base; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    for (let i = -3; i <= 3; i++) {
      ctx.fillStyle = `rgba(230,210,170,${0.12 + Math.abs(i) * 0.03})`;
      ctx.fillRect(x - r, y + i * r * .25 - r * .06, r * 2, r * .12);
    }
    sphereShade(ctx, x, y, r); ctx.restore();
  }

  function drawEarth(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#1a508c'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    const lands = [
      { lon: 0.0, lat: .35, w: .22, h: .42, col: '#2a7030' },
      { lon: 0.15, lat: -.15, w: .14, h: .28, col: '#307538' },
      { lon: 1.4, lat: .25, w: .38, h: .30, col: '#2a6a2a' },
      { lon: 2.1, lat: -.38, w: .16, h: .12, col: '#4a8a3a' },
      { lon: -1.7, lat: .30, w: .18, h: .48, col: '#2d7032' },
      { lon: -1.5, lat: -.22, w: .12, h: .35, col: '#358038' },
    ];
    for (const c of lands) {
      const vis = Math.cos(c.lon + rot); if (vis < -.1) continue;
      ctx.fillStyle = c.col;
      ctx.beginPath(); ctx.ellipse(x + Math.sin(c.lon + rot) * r * .82, y - c.lat * r, Math.max(1, c.w * r * vis), c.h * r, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(230,240,255,0.6)';
    ctx.beginPath(); ctx.ellipse(x, y - r * .86, r * .38, r * .12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + r * .90, r * .30, r * .08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < 5; i++) {
      const clon = rot * 1.15 + i * 1.3; const cv = Math.cos(clon); if (cv < .05) continue;
      ctx.beginPath(); ctx.ellipse(x + Math.sin(clon) * r * .78, y - (prng(i * 5 + 50) - .5) * .55 * r, r * .18 * cv, r * .05, clon * .2, 0, Math.PI * 2); ctx.fill();
    }
    sphereShade(ctx, x, y, r); ctx.restore();
  }

  function drawMoon(ctx: CanvasRenderingContext2D, ex: number, ey: number, moonAngle: number) {
    const d = 17, mr = 2;
    const mx = ex + Math.cos(moonAngle) * d, my = ey + Math.sin(moonAngle) * d * VIEW_TILT;
    ctx.fillStyle = '#b8b8b0'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    const s = ctx.createRadialGradient(mx - mr * .3, my - mr * .3, 0, mx, my, mr);
    s.addColorStop(0, 'rgba(255,255,255,0.15)'); s.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = s; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  }

  function drawMars(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    const base = ctx.createRadialGradient(x - r * .2, y - r * .2, 0, x, y, r);
    base.addColorStop(0, '#d08040'); base.addColorStop(.5, '#c06830'); base.addColorStop(1, '#904820');
    ctx.fillStyle = base; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    const patches = [{ lon: 1.0, lat: .1, w: .25, h: .35 }, { lon: -1.2, lat: -.15, w: .2, h: .2 }, { lon: 2.8, lat: .25, w: .15, h: .2 }];
    for (const p of patches) {
      const vis = Math.cos(p.lon + rot); if (vis < 0) continue;
      ctx.fillStyle = 'rgba(80,35,15,0.45)';
      ctx.beginPath(); ctx.ellipse(x + Math.sin(p.lon + rot) * r * .75, y - p.lat * r, Math.max(1, p.w * r * vis), p.h * r, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(240,245,255,0.55)';
    ctx.beginPath(); ctx.ellipse(x, y - r * .82, r * .28, r * .1, 0, 0, Math.PI * 2); ctx.fill();
    sphereShade(ctx, x, y, r); ctx.restore();
  }

  function drawJupiter(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, t: number) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#c09060'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    const bands = [
      { y: -.88, h: .10, col: 'rgba(180,140,95,0.7)' },
      { y: -.70, h: .12, col: 'rgba(210,155,80,0.65)' },
      { y: -.52, h: .14, col: 'rgba(235,215,175,0.55)' },
      { y: -.32, h: .14, col: 'rgba(195,120,55,0.75)' },
      { y: -.12, h: .16, col: 'rgba(240,225,190,0.50)' },
      { y: .08, h: .14, col: 'rgba(185,105,40,0.80)' },
      { y: .28, h: .14, col: 'rgba(235,210,168,0.50)' },
      { y: .48, h: .10, col: 'rgba(200,130,60,0.65)' },
      { y: .64, h: .12, col: 'rgba(230,200,155,0.50)' },
      { y: .80, h: .12, col: 'rgba(175,125,75,0.60)' },
    ];
    for (const b of bands) { ctx.fillStyle = b.col; ctx.fillRect(x - r, y + b.y * r, r * 2, b.h * r); }
    ctx.strokeStyle = 'rgba(160,90,35,0.22)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      const by = y + (-0.58 + i * 0.18) * r;
      ctx.beginPath(); ctx.moveTo(x - r, by);
      for (let px = x - r; px <= x + r; px += 3) ctx.lineTo(px, by + Math.sin((px - x) * 0.09 + rot * 3 + i * 2.3) * r * 0.022);
      ctx.stroke();
    }
    const grsLon = rot * 0.7;
    const grsVis = Math.cos(grsLon);
    if (grsVis > -0.25) {
      const gx = x + Math.sin(grsLon) * r * 0.42, gy = y + r * 0.18;
      const gw = r * 0.18 * Math.max(0.3, grsVis), gh = r * 0.11;
      const gh1 = ctx.createRadialGradient(gx, gy, 0, gx, gy, gw * 1.3);
      gh1.addColorStop(0, 'rgba(200,65,25,0.7)'); gh1.addColorStop(.6, 'rgba(190,80,40,0.4)'); gh1.addColorStop(1, 'rgba(170,95,55,0.1)');
      ctx.fillStyle = gh1; ctx.beginPath(); ctx.ellipse(gx, gy, gw * 1.3, gh * 1.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(210,55,20,0.75)'; ctx.beginPath(); ctx.ellipse(gx, gy, gw, gh, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(230,80,30,0.35)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(gx, gy, gw * .7, gh * .65, rot * 0.4, 0, Math.PI * 2); ctx.stroke();
    }
    sphereShade(ctx, x, y, r);
    // Aurora
    const auroraT = t * 0.015;
    const aBase = 0.28 + 0.10 * Math.sin(auroraT) + 0.06 * Math.sin(auroraT * 2.3);
    const ag = ctx.createRadialGradient(x, y - r * 0.82, 0, x, y - r * 0.82, r * 0.38);
    ag.addColorStop(0, `rgba(70,130,255,${aBase * 0.9})`); ag.addColorStop(0.35, `rgba(110,80,240,${aBase * 0.6})`);
    ag.addColorStop(0.7, `rgba(60,180,120,${aBase * 0.25})`); ag.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.ellipse(x, y - r * 0.80, r * 0.40, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const aAng = auroraT * 1.5 + i * 1.2;
      const ax = x + Math.cos(aAng) * r * 0.22, ay = y - r * 0.82 + Math.sin(aAng * 0.7) * r * 0.06;
      const aw = r * 0.08 + Math.sin(aAng * 2) * r * 0.03, ah = r * 0.12 + Math.cos(aAng * 1.3) * r * 0.04;
      const aa = (0.15 + 0.08 * Math.sin(aAng * 3)) * aBase;
      ctx.fillStyle = i % 2 === 0 ? `rgba(60,140,255,${aa})` : `rgba(100,60,220,${aa})`;
      ctx.beginPath(); ctx.ellipse(ax, ay, aw, ah, aAng * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawSaturnRings(ctx: CanvasRenderingContext2D, x: number, y: number, pr: number, half: 'back' | 'front') {
    const rings = [
      { inner: 1.20, outer: 1.40, col: '180,165,130', a: 0.18 },
      { inner: 1.44, outer: 1.85, col: '225,205,160', a: 0.55 },
      { inner: 1.95, outer: 2.40, col: '210,190,148', a: 0.42 },
      { inner: 2.44, outer: 2.55, col: '180,165,135', a: 0.12 },
    ];
    ctx.save();
    const outerPx = pr * 2.65;
    if (half === 'back') {
      ctx.beginPath(); ctx.rect(x - outerPx - 2, y, outerPx * 2 + 4, outerPx + 2); ctx.clip();
    } else {
      ctx.beginPath(); ctx.rect(x - outerPx - 2, y - outerPx - 2, outerPx * 2 + 4, outerPx + 2); ctx.clip();
    }
    if (half === 'front') {
      ctx.strokeStyle = 'rgba(200,170,100,0.04)'; ctx.lineWidth = pr * 0.8;
      ctx.beginPath(); ctx.ellipse(x, y, pr * 1.85, pr * 1.85 * RING_TILT, 0, 0, Math.PI * 2); ctx.stroke();
    }
    for (const ring of rings) {
      const iR = pr * ring.inner, oR = pr * ring.outer;
      const midR = (iR + oR) / 2, w = oR - iR;
      for (let dr = -w / 2; dr <= w / 2; dr += 1.0) {
        const rr = midR + dr;
        const distFrac = Math.abs(dr) / (w / 2);
        const densityVar = 0.8 + 0.2 * Math.sin(rr * 0.3);
        const alpha = ring.a * (1 - distFrac * 0.35) * densityVar;
        ctx.strokeStyle = `rgba(${ring.col},${alpha})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(x, y, rr, rr * RING_TILT, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    const cassMid = pr * 1.89, cassW = pr * 0.06;
    ctx.strokeStyle = 'rgba(2,2,10,0.55)'; ctx.lineWidth = cassW;
    ctx.beginPath(); ctx.ellipse(x, y, cassMid, cassMid * RING_TILT, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawSaturnBody(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _rot: number) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    const base = ctx.createRadialGradient(x - r * .2, y - r * .2, 0, x, y, r);
    base.addColorStop(0, '#c8c0d0'); base.addColorStop(.35, '#a8a0b8'); base.addColorStop(.65, '#8890a0'); base.addColorStop(1, '#606878');
    ctx.fillStyle = base; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    const bands = [
      { y: -.55, h: .18, col: 'rgba(190,175,145,0.18)' },
      { y: -.20, h: .15, col: 'rgba(175,160,130,0.15)' },
      { y: .10, h: .18, col: 'rgba(195,180,150,0.18)' },
      { y: .40, h: .15, col: 'rgba(170,155,128,0.12)' },
      { y: .65, h: .15, col: 'rgba(185,170,140,0.14)' },
    ];
    for (const b of bands) { ctx.fillStyle = b.col; ctx.fillRect(x - r, y + b.y * r, r * 2, b.h * r); }
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x - r, y - r * 0.18, r * 2, r * 0.09);
    sphereShade(ctx, x, y, r); ctx.restore();
  }

  function drawSaturn(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
    drawSaturnRings(ctx, x, y, r, 'back');
    drawSaturnBody(ctx, x, y, r, rot);
    drawSaturnRings(ctx, x, y, r, 'front');
  }

  function drawUranus(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _rot: number) {
    ctx.strokeStyle = 'rgba(140,180,190,0.14)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.8, r * 1.8 * 0.12, Math.PI * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(140,180,190,0.07)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, r * 2.0, r * 2.0 * 0.10, Math.PI * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    const base = ctx.createRadialGradient(x - r * .2, y - r * .2, 0, x, y, r);
    base.addColorStop(0, '#a8e0e0'); base.addColorStop(.5, '#7ec8c8'); base.addColorStop(1, '#509898');
    ctx.fillStyle = base; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(120,210,210,0.15)'; ctx.fillRect(x - r, y - r * .15, r * 2, r * .3);
    ctx.fillStyle = 'rgba(90,180,180,0.1)'; ctx.fillRect(x - r, y + r * .3, r * 2, r * .2);
    sphereShade(ctx, x, y, r); ctx.restore();
  }

  function drawNeptune(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    const base = ctx.createRadialGradient(x - r * .2, y - r * .2, 0, x, y, r);
    base.addColorStop(0, '#4070dd'); base.addColorStop(.5, '#3058cc'); base.addColorStop(1, '#1a3088');
    ctx.fillStyle = base; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(20,35,100,0.3)'; ctx.fillRect(x - r, y - r * .1, r * 2, r * .2);
    ctx.fillStyle = 'rgba(25,40,110,0.2)'; ctx.fillRect(x - r, y + r * .35, r * 2, r * .15);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let i = 0; i < 3; i++) {
      const clon = rot * 1.2 + i * 2.1; const vis = Math.cos(clon); if (vis < .1) continue;
      ctx.beginPath(); ctx.ellipse(x + Math.sin(clon) * r * .7, y - (prng(i * 7 + 80) - .45) * .5 * r, r * .15 * vis, r * .035, clon * .2, 0, Math.PI * 2); ctx.fill();
    }
    const gdsVis = Math.cos(rot * 0.6 + 1);
    if (gdsVis > .2) {
      ctx.fillStyle = `rgba(15,25,70,${0.4 * gdsVis})`;
      ctx.beginPath(); ctx.ellipse(x + Math.sin(rot * 0.6 + 1) * r * .4, y - r * .15, r * .12 * gdsVis, r * .08, 0, 0, Math.PI * 2); ctx.fill();
    }
    sphereShade(ctx, x, y, r); ctx.restore();
  }

  const DRAW_FNS = [drawMercury, drawVenus, drawEarth, drawMars,
    (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) => drawJupiter(ctx, x, y, r, rot, stateRef.current.solarT),
    drawSaturn, drawUranus, drawNeptune];

  function buildSolarStarfield() {
    const { W, H } = stateRef.current;
    const oc = document.createElement('canvas');
    oc.width = W; oc.height = H;
    const sc = oc.getContext('2d')!;
    for (let i = 0; i < 450; i++) {
      const x = prng(i * 4) * W, y = prng(i * 4 + 1) * H;
      const r = prng(i * 4 + 2) * 0.55 + 0.15, a = prng(i * 4 + 3) * 0.16 + 0.03;
      sc.fillStyle = `rgba(210,215,255,${a})`;
      sc.beginPath(); sc.arc(x, y, r, 0, Math.PI * 2); sc.fill();
    }
    for (let i = 0; i < 18; i++) {
      const x = prng(i * 6 + 2000) * W, y = prng(i * 6 + 2001) * H;
      const r = prng(i * 6 + 2002) * 0.6 + 0.6, a = prng(i * 6 + 2003) * 0.22 + 0.18;
      const glow = sc.createRadialGradient(x, y, 0, x, y, r * 4);
      glow.addColorStop(0, `rgba(220,225,255,${a})`); glow.addColorStop(1, 'rgba(0,0,0,0)');
      sc.fillStyle = glow; sc.beginPath(); sc.arc(x, y, r * 4, 0, Math.PI * 2); sc.fill();
      sc.fillStyle = `rgba(240,242,255,${a * 1.4})`; sc.beginPath(); sc.arc(x, y, r, 0, Math.PI * 2); sc.fill();
    }
    stateRef.current.solarStarfieldCache = oc;
  }

  // ── Init modes ────────────────────────────────────────────
  const initSgr = useCallback(() => {
    const s = stateRef.current;
    s.sgrT = 0;
    s.sgrStars = S_STARS.map(star => ({
      ...star,
      rgb: hexRgb(star.col),
      trail: [] as { x: number; y: number }[],
      trailMax: 220,
      tOff: Math.random() * star.T,
      orb: buildOrbitPath(star),
    }));
  }, [buildOrbitPath]);

  const initSolar = useCallback(() => {
    const s = stateRef.current;
    s.solarT = 0;
    s.solarRots = PLANETS.map(() => 0);
    buildSolarStarfield();
  }, []);

  // ── Render frames ─────────────────────────────────────────
  const renderSgr = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;
    const { cx, cy } = s;
    s.sgrT += 0.055 * SGR_SPEED;

    // BH glow
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70);
    bg.addColorStop(0, 'rgba(140,70,230,0.12)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#04040c'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,70,255,0.28)'; ctx.lineWidth = 0.9; ctx.stroke();

    // Orbit ellipses
    for (const st of s.sgrStars) {
      if (!st.orb) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.015)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(st.orb[0].x, st.orb[0].y);
      for (let j = 1; j < st.orb.length; j++) ctx.lineTo(st.orb[j].x, st.orb[j].y);
      ctx.closePath(); ctx.stroke();
    }

    // Stars + trails
    for (const st of s.sgrStars) {
      const pos = orbPos(st, s.sgrT + st.tOff);
      st.trail.push({ x: pos.x, y: pos.y });
      if (st.trail.length > st.trailMax) st.trail.shift();
      const { r, g, b } = st.rgb;
      const len = st.trail.length;
      for (let j = 1; j < len; j++) {
        ctx.strokeStyle = `rgba(${r},${g},${b},${(j / len) * 0.42})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(st.trail[j - 1].x, st.trail[j - 1].y);
        ctx.lineTo(st.trail[j].x, st.trail[j].y); ctx.stroke();
      }
      const gw = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, st.sz * 6);
      gw.addColorStop(0, `rgba(${r},${g},${b},0.65)`); gw.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gw; ctx.beginPath(); ctx.arc(pos.x, pos.y, st.sz * 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.beginPath(); ctx.arc(pos.x, pos.y, st.sz, 0, Math.PI * 2); ctx.fill();
    }
  }, [orbPos]);

  const renderSolar = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;
    const { cx, cy } = s;
    s.solarT += SOLAR_SPEED;

    // Starfield
    if (s.solarStarfieldCache) {
      ctx.save(); ctx.globalAlpha *= 0.5;
      ctx.drawImage(s.solarStarfieldCache, 0, 0);
      ctx.restore();
    }

    const mR = solarMaxR();

    // Orbit guides
    for (const p of PLANETS) {
      const a = p.oF * mR;
      ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let th = 0; th <= Math.PI * 2 + 0.01; th += 0.04) {
        const r_th = a * (1 - p.ecc * p.ecc) / (1 + p.ecc * Math.cos(th));
        const wx = cx + r_th * Math.cos(th + p.w);
        const wy = cy + r_th * Math.sin(th + p.w) * VIEW_TILT;
        if (th === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
      }
      ctx.closePath(); ctx.stroke();
    }

    // Sun
    drawSun(ctx);

    // Compute positions
    const positions = PLANETS.map((p, i) => {
      const angSpeed = (2 * Math.PI) / (p.T * EARTH_PERIOD);
      const M = s.solarT * angSpeed + i * 0.8;
      const E = solveKepler(M, p.ecc);
      const trueAnom = 2 * Math.atan2(
        Math.sqrt(1 + p.ecc) * Math.sin(E / 2),
        Math.sqrt(1 - p.ecc) * Math.cos(E / 2)
      );
      const a = p.oF * mR;
      const r_th = a * (1 - p.ecc * p.ecc) / (1 + p.ecc * Math.cos(trueAnom));
      s.solarRots[i] += ROT_SPEEDS[i] * SOLAR_SPEED;
      return {
        x: cx + r_th * Math.cos(trueAnom + p.w),
        y: cy + r_th * Math.sin(trueAnom + p.w) * VIEW_TILT,
        idx: i, angle: trueAnom + p.w,
      };
    });

    // Depth sort
    const sorted = [...positions].sort((a, b) => a.y - b.y);

    for (const pos of sorted) {
      const i = pos.idx, p = PLANETS[i];
      DRAW_FNS[i](ctx, pos.x, pos.y, p.r, s.solarRots[i]);
      if (i === 2) drawMoon(ctx, pos.x, pos.y, pos.angle * 13.37);
      // Label
      ctx.fillStyle = 'rgba(150,150,180,0.16)';
      ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.name, pos.x, pos.y + p.r + 12);
    }
  }, []);

  // ── Main loop ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;

    function resize() {
      s.W = canvas!.width = window.innerWidth;
      s.H = canvas!.height = window.innerHeight;
      s.cx = s.W / 2;
      s.cy = s.H / 2;
      buildSolarStarfield();
    }
    resize();
    window.addEventListener('resize', resize);

    // Init both modes
    initSgr();
    initSolar();
    s.mode = vizModeRef.current === 'graph' ? 'solar' : 'sgr';
    s.targetMode = s.mode;

    function loop() {
      const now = performance.now();

      // Check if vizMode changed
      const desired: Mode = vizModeRef.current === 'graph' ? 'solar' : 'sgr';
      if (desired !== s.targetMode) {
        s.targetMode = desired;
        if (s.mode !== desired && !s.fadeStart) {
          s.fadeStart = now;
        }
      }

      // Handle crossfade
      if (s.fadeStart) {
        const fadeProgress = Math.min(1, (now - s.fadeStart) / FADE_MS);
        if (fadeProgress >= 1) {
          s.mode = s.targetMode;
          s.fadeStart = null;
        }
      }

      // Clear
      ctx.clearRect(0, 0, s.W, s.H);

      // Determine opacities
      let sgrAlpha = s.mode === 'sgr' ? SGR_OPACITY : 0;
      let solarAlpha = s.mode === 'solar' ? SOLAR_OPACITY : 0;

      if (s.fadeStart) {
        const fadeProgress = Math.min(1, (now - s.fadeStart) / FADE_MS);
        if (s.mode === 'sgr' && s.targetMode === 'solar') {
          sgrAlpha = SGR_OPACITY * (1 - fadeProgress);
          solarAlpha = SOLAR_OPACITY * fadeProgress;
        } else if (s.mode === 'solar' && s.targetMode === 'sgr') {
          solarAlpha = SOLAR_OPACITY * (1 - fadeProgress);
          sgrAlpha = SGR_OPACITY * fadeProgress;
        }
      }

      // Render Sgr
      if (sgrAlpha > 0.001) {
        ctx.save(); ctx.globalAlpha = sgrAlpha;
        renderSgr(ctx);
        ctx.restore();
      }

      // Render Solar
      if (solarAlpha > 0.001) {
        ctx.save(); ctx.globalAlpha = solarAlpha;
        renderSolar(ctx);
        ctx.restore();
      }

      s.raf = requestAnimationFrame(loop);
    }

    s.raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (s.raf) cancelAnimationFrame(s.raf);
    };
  }, [initSgr, initSolar, renderSgr, renderSolar]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}
