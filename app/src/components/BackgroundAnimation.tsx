"use client";

import { useRef, useEffect, useCallback } from "react";

// ── Config ──────────────────────────────────────────────────
const SGR_OPACITY = 0.17;      // 17%
const SGR_SPEED = 0.2;         // 0.2x
const TDE_OPACITY = 0.03;      // 3%
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

// ── S-star data ─────────────────────────────────────────────
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

// ── TDE constants ───────────────────────────────────────────
const TDE_N = 500;
const TDE_RSTAR = 24;
const TDE_ROCHE = 88;
const TDE_BHM = 95000;
const TDE_GSTR = 0.00030;
const BH_RING_R = 34;
const TDE_ORB = { a: 300, e: 0.68, T: 960, omega: 3.54 };

// ── Types ───────────────────────────────────────────────────
interface SgrStar {
  a: number; e: number; T: number; omega: number; inc: number; Omega: number;
  col: string; sz: number; rgb: { r: number; g: number; b: number };
  trail: { x: number; y: number }[]; trailMax: number; tOff: number;
  orb: { x: number; y: number }[];
}

interface TdeParticle {
  x: number; y: number; vx: number; vy: number;
  ox: number; oy: number; disrupted: boolean;
  op: number; sz: number; heat: number; disruptedAt: number;
}

type Mode = 'sgr' | 'tde';

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
    // TDE state
    tdeT: number;
    tdePs: TdeParticle[];
    tdePassCount: number;
    tdeLastPeriDist: number;
    // BH cache
    bhCache: HTMLCanvasElement | null;
  }>({
    raf: null, mode: 'sgr', targetMode: 'sgr', fadeStart: null,
    W: 0, H: 0, cx: 0, cy: 0,
    sgrT: 0, sgrStars: [],
    tdeT: 0, tdePs: [], tdePassCount: 0, tdeLastPeriDist: 9999,
    bhCache: null,
  });

  // ── Sgr helpers ───────────────────────────────────────────
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

  // ── TDE helpers ───────────────────────────────────────────
  const tdeStarState = useCallback((t: number) => {
    const { a, e, T, omega } = TDE_ORB;
    const M = Math.PI + (2 * Math.PI / T) * t;
    const E = solveKepler(M, e);
    const cosE = Math.cos(E), sinE = Math.sin(E);
    const sq = Math.sqrt(1 - e * e);
    const xo = a * (cosE - e), yo = a * sq * sinE;
    const dEdt = (2 * Math.PI / T) / (1 - e * cosE);
    const vxo = -a * sinE * dEdt, vyo = a * sq * cosE * dEdt;
    const cw = Math.cos(omega), sw = Math.sin(omega);
    const { cx, cy } = stateRef.current;
    return {
      x: cx + xo * cw - yo * sw,
      y: cy - (xo * sw + yo * cw),
      vx: vxo * cw - vyo * sw,
      vy: -(vxo * sw + vyo * cw),
    };
  }, []);

  const buildBH = useCallback(() => {
    const ringR = BH_RING_R;
    const sz = Math.ceil(ringR * 4);
    const oc = document.createElement('canvas');
    oc.width = oc.height = sz * 2;
    const ox = oc.getContext('2d')!;
    const o = sz;

    for (let r = ringR * 2.8; r > ringR * 0.8; r -= 1.5) {
      const alpha = 0.005 * (r - ringR * 0.8) / (ringR * 2);
      ox.strokeStyle = `rgba(180,75,8,${alpha})`; ox.lineWidth = 2.5;
      ox.beginPath(); ox.arc(o, o, r, 0, Math.PI * 2); ox.stroke();
    }

    const segs = 280;
    for (let i = 0; i < segs; i++) {
      const angle = (i / segs) * Math.PI * 2 - Math.PI / 2;
      let diff = angle - Math.PI / 2;
      diff = ((diff % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      const brite = Math.pow(1 - diff / Math.PI, 3.2);
      const arcR = ringR * (0.96 + brite * 0.06);
      ox.strokeStyle = `rgba(255,${Math.floor(105 + brite * 82)},${Math.floor(brite * 22)},${0.18 + brite * 0.78})`;
      ox.lineWidth = 5 + brite * 9;
      ox.beginPath(); ox.arc(o, o, arcR, angle, angle + (Math.PI * 2 / segs) + 0.01); ox.stroke();
    }

    const shadow = ox.createRadialGradient(o, o, 0, o, o, ringR * 0.68);
    shadow.addColorStop(0, 'rgba(4,4,12,1)'); shadow.addColorStop(0.7, 'rgba(4,4,12,0.97)'); shadow.addColorStop(1, 'rgba(4,4,12,0)');
    ox.fillStyle = shadow; ox.beginPath(); ox.arc(o, o, ringR * 0.68, 0, Math.PI * 2); ox.fill();

    for (let sign = -1; sign <= 1; sign += 2) {
      const jg = ox.createLinearGradient(o, o, o, o + sign * ringR * 3.5);
      jg.addColorStop(0, 'rgba(160,100,255,0.04)'); jg.addColorStop(1, 'rgba(0,0,0,0)');
      ox.fillStyle = jg; ox.beginPath(); ox.ellipse(o, o + sign * ringR * 1.8, ringR * 0.25, ringR * 1.8, 0, 0, Math.PI * 2); ox.fill();
    }

    stateRef.current.bhCache = oc;
  }, []);

  // ── Draw helpers ──────────────────────────────────────────
  const drawStarfield = useCallback((ctx: CanvasRenderingContext2D) => {
    const { W, H } = stateRef.current;
    for (let i = 0; i < 260; i++) {
      const px = prng(i * 4) * W, py = prng(i * 4 + 1) * H;
      const pr = prng(i * 4 + 2) * 0.6 + 0.18, pa = prng(i * 4 + 3) * 0.14 + 0.03;
      ctx.fillStyle = `rgba(210,218,255,${pa})`;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    }
  }, []);

  const drawBH = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    if (!stateRef.current.bhCache) buildBH();
    const bh = stateRef.current.bhCache!;
    const s = bh.width / 2;
    ctx.drawImage(bh, x - s, y - s);
  }, [buildBH]);

  const drawStarGlow = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, intactFrac: number) => {
    if (intactFrac < 0.03) return;
    const r = TDE_RSTAR * Math.sqrt(intactFrac);
    const a = Math.min(1, intactFrac * intactFrac * 3);
    ctx.save(); ctx.globalAlpha *= a;

    const cr = ctx.createRadialGradient(x, y, r * .7, x, y, r * 4.5);
    cr.addColorStop(0, 'rgba(255,210,100,0.18)'); cr.addColorStop(.4, 'rgba(255,160,50,0.06)'); cr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cr; ctx.beginPath(); ctx.arc(x, y, r * 4.5, 0, Math.PI * 2); ctx.fill();

    const limb = ctx.createRadialGradient(x, y, r * .6, x, y, r * 1.05);
    limb.addColorStop(0, 'rgba(255,240,180,0)'); limb.addColorStop(.7, 'rgba(255,210,120,0.12)'); limb.addColorStop(1, 'rgba(255,170,60,0.35)');
    ctx.fillStyle = limb; ctx.beginPath(); ctx.arc(x, y, r * 1.05, 0, Math.PI * 2); ctx.fill();

    const disc = ctx.createRadialGradient(x, y, 0, x, y, r);
    disc.addColorStop(0, 'rgba(255,255,248,1)'); disc.addColorStop(.28, 'rgba(255,248,200,0.97)');
    disc.addColorStop(.60, 'rgba(255,210,100,0.88)'); disc.addColorStop(.85, 'rgba(255,160,50,0.70)');
    disc.addColorStop(1, 'rgba(220,90,20,0.35)');
    ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha *= 0.22;
    for (let i = 0; i < 8; i++) {
      const gx = x + (prng(i * 7 + 1) - .5) * r * .85, gy = y + (prng(i * 7 + 2) - .5) * r * .85;
      const gr = prng(i * 7 + 3) * r * .26 + r * .05;
      const ga = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      ga.addColorStop(0, 'rgba(255,255,220,0.6)'); ga.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ga; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }, []);

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

  const initTde = useCallback(() => {
    const s = stateRef.current;
    buildBH();
    const s0 = tdeStarState(0);
    s.tdeT = 0;
    s.tdePassCount = 0;
    s.tdeLastPeriDist = 9999;
    s.tdePs = [];
    for (let i = 0; i < TDE_N; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * TDE_RSTAR;
      const ox = Math.cos(ang) * r, oy = Math.sin(ang) * r;
      s.tdePs.push({
        x: s0.x + ox, y: s0.y + oy,
        vx: s0.vx, vy: s0.vy,
        ox, oy,
        disrupted: false,
        op: 0.8 + Math.random() * 0.2,
        sz: 0.5 + Math.random() * 0.7,
        heat: 1 - r / TDE_RSTAR,
        disruptedAt: -1,
      });
    }
  }, [buildBH, tdeStarState]);

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

  const renderTde = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;
    const { cx, cy } = s;
    s.tdeT++;

    // Black hole
    drawBH(ctx, cx, cy);

    // Star center
    const star = tdeStarState(s.tdeT);
    const prevStar = tdeStarState(s.tdeT - 1);
    const dBH = Math.sqrt((star.x - cx) ** 2 + (star.y - cy) ** 2);

    if (dBH > s.tdeLastPeriDist + 5 && s.tdeLastPeriDist < TDE_ROCHE * 2) {
      s.tdePassCount++;
    }
    s.tdeLastPeriDist = dBH;

    const intactCount = s.tdePs.filter(p => !p.disrupted).length;
    const intactFrac = intactCount / TDE_N;
    const rocheGrowth = 1 + (1 - intactFrac) * 0.8;
    const effRoche = TDE_ROCHE * rocheGrowth;

    const dx_star = star.x - prevStar.x;
    const dy_star = star.y - prevStar.y;

    for (const p of s.tdePs) {
      if (p.op < 0.01) continue;

      if (!p.disrupted) {
        p.x += dx_star; p.y += dy_star;
        let ox = p.ox, oy = p.oy;
        if (dBH < effRoche * 2.8) {
          const ts = Math.pow(Math.max(0, (effRoche * 2.8 - dBH) / (effRoche * 2.8)), 1.5);
          const rHatX = (cx - star.x) / dBH, rHatY = (cy - star.y) / dBH;
          const dot = ox * rHatX + oy * rHatY;
          const stretch = 1 + ts * 3.5;
          ox += rHatX * dot * (stretch - 1);
          oy += rHatY * dot * (stretch - 1);
        }
        p.x = star.x + ox; p.y = star.y + oy;
        p.vx = star.vx; p.vy = star.vy;

        const dp = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        if (dp < effRoche) {
          p.disrupted = true;
          p.disruptedAt = s.tdeT;
          p.vx = star.vx; p.vy = star.vy;
        }
      } else {
        const dxp = cx - p.x, dyp = cy - p.y;
        const dp = Math.sqrt(dxp * dxp + dyp * dyp + 1);
        const acc = TDE_BHM / (dp * dp + 35) * TDE_GSTR;
        p.vx += (dxp / dp) * acc; p.vy += (dyp / dp) * acc;
        p.vx *= 0.9999; p.vy *= 0.9999;
        p.x += p.vx; p.y += p.vy;
        if (dp < 20) p.op -= 0.025;
        if (p.x < -500 || p.x > s.W + 500 || p.y < -500 || p.y > s.H + 500) p.op -= 0.01;
      }

      if (p.op <= 0.01) continue;

      if (!p.disrupted) {
        const pr = Math.floor(160 + p.heat * 95), pg = Math.floor(185 + p.heat * 70), pb = 255;
        ctx.fillStyle = `rgba(${pr},${pg},${pb},${p.op * 0.85})`;
      } else {
        const dp = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        const prox = Math.min(1, 120 / Math.max(dp, 18));
        const age = Math.min(1, (s.tdeT - p.disruptedAt) / 400);
        const pr = Math.floor(140 + prox * 100 + age * 15);
        const pg = Math.floor(160 + prox * 60 - age * 40);
        const pb = Math.floor(230 + prox * 25 - age * 30);
        ctx.fillStyle = `rgba(${pr},${pg},${pb},${p.op * 0.82})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * 1.3, 0, Math.PI * 2); ctx.fill();
        if (p.op > 0.3) {
          ctx.fillStyle = `rgba(${pr},${pg},${pb},${p.op * 0.12})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * 4, 0, Math.PI * 2); ctx.fill();
        }
        continue;
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, Math.PI * 2); ctx.fill();
    }

    if (intactFrac > 0.04) drawStarGlow(ctx, star.x, star.y, intactFrac);

    // Accretion glow
    const nStream = s.tdePs.filter(p => p.disrupted && p.op > 0.05).length;
    if (nStream > 60) {
      const fr = Math.min(1, nStream / (TDE_N * 0.5));
      const dg = ctx.createRadialGradient(cx, cy, 5, cx, cy, 55);
      dg.addColorStop(0, `rgba(255,120,40,${0.22 * fr})`);
      dg.addColorStop(.5, `rgba(180,55,255,${0.08 * fr})`);
      dg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(cx, cy, 55, 0, Math.PI * 2); ctx.fill();
    }

    // Reset TDE if animation completes
    const anyAlive = s.tdePs.some(p => p.op >= 0.01);
    if ((!anyAlive && s.tdeT > 300) || s.tdeT > TDE_ORB.T * 3) {
      initTde();
    }
  }, [tdeStarState, drawBH, drawStarGlow, initTde]);

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
    }
    resize();
    window.addEventListener('resize', resize);

    // Init both modes
    initSgr();
    initTde();
    s.mode = vizModeRef.current === 'graph' ? 'tde' : 'sgr';
    s.targetMode = s.mode;

    function loop() {
      const now = performance.now();

      // Check if vizMode changed
      const desired: Mode = vizModeRef.current === 'graph' ? 'tde' : 'sgr';
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
          if (s.mode === 'tde') initTde();
          s.fadeStart = null;
        }
      }

      // Clear (transparent so page background shows through)
      ctx.clearRect(0, 0, s.W, s.H);

      // Determine opacities based on current mode + fade
      let sgrAlpha = s.mode === 'sgr' ? SGR_OPACITY : 0;
      let tdeAlpha = s.mode === 'tde' ? TDE_OPACITY : 0;

      if (s.fadeStart) {
        const fadeProgress = Math.min(1, (now - s.fadeStart) / FADE_MS);
        if (s.mode === 'sgr' && s.targetMode === 'tde') {
          sgrAlpha = SGR_OPACITY * (1 - fadeProgress);
          tdeAlpha = TDE_OPACITY * fadeProgress;
        } else if (s.mode === 'tde' && s.targetMode === 'sgr') {
          tdeAlpha = TDE_OPACITY * (1 - fadeProgress);
          sgrAlpha = SGR_OPACITY * fadeProgress;
        }
      }

      // Render Sgr
      if (sgrAlpha > 0.001) {
        ctx.save();
        ctx.globalAlpha = sgrAlpha;
        renderSgr(ctx);
        ctx.restore();
      }

      // Render TDE
      if (tdeAlpha > 0.001) {
        ctx.save();
        ctx.globalAlpha = tdeAlpha;
        renderTde(ctx);
        ctx.restore();
      }

      s.raf = requestAnimationFrame(loop);
    }

    s.raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (s.raf) cancelAnimationFrame(s.raf);
    };
  }, [initSgr, initTde, renderSgr, renderTde]);

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
