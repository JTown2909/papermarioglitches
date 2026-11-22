/* v127: the stage lightning read on the page (fbbolt_core.js has the shape, the camera and the scoring).
 * In a Final Bowser menu (the HUD up: the battle camera fixed), a bolt's onset starts a collection: the game picture's
 * violet pixels, one picture per game frame, from the frame after the onset, against a base picture from before it. Two
 * kinds (FBB_KINDS): the sky bolts (1-4: the random loop; onset in the upper sky box) and, v128, the front-right bolt (5: the
 * circulating loop's third, coming in along the bottom right; it lives 5 frames, reads less sharply: emulator 17 of 33
 * within 3 of u mod 120, most within 10, so its likelihood is softer, fbbolt_core.js FBB_T5). The scoring (sliced, FBB_MS
 * ms at a time) gives a cost table per bolt, lifetime of the first picture and value u. Each state then gets the factor of
 * its own bolt of that kind: the bolt its lightning phase draws on the frame d = F1 - L0 + 1 (clock frames; F1 the first
 * picture's frame) and the value its seed draws there; a state with no such bolt on those frames gets the floor. Never a
 * cut (FBB_FLOOR). Phase 1 (fb14 states): a state that has run past that frame reads its value from the last 4 bolts it
 * drew (fbStep, S.b0-b3); one that has not is run to it on a copy. Phase 2 (FB2): the T6 seeds (FB2.hyps, from frame 61)
 * and the T7 states (FB2.t7.states, from Bowser's T6 turn) are run to it on a copy. Logged: boltOnset, boltRead (the best
 * reading, how much weight the states kept), boltReadDrop; the plan is made again unless its beeps are under 1.5 s away. */
const FBB_MS = 15, FBB_BASE_EVERY = 16, FBB_ON = 30, FBB_QUIET = 4;
const FBB_KINDS = {
  sky: { types: [1, 2, 3, 4], nf: 5, L0: [2, 4], on: FBB_ON, box: () => fbBoltBox(), upper: true },
  fr: { types: [5], nf: 4, L0: [2, 3], on: 20, box: () => fbbFrBox(), wide: 0.4 } };
let FBB_L0 = FBB_KINDS.sky.L0;     // the lifetimes of the reading being applied (fbbFactor)
var FBB = { col: null, base: null, det: {}, reads: [], busy: false, qn: 0, lastOn: -1e9 };
function fbbReset() { FBB = { col: null, base: null, det: {}, reads: [], busy: false, qn: 0, lastOn: -1e9 }; }
// the front-right bolt's box: 320-space x 200..308, y 195..230 (its projected path, inside the viewport's right edge)
function fbbFrBox() { const [SX, OX, SY, OY] = chgMap(); return { x: (OX + 200 * SX) / 1280, y: (OY + 195 * SY) / 720, w: 108 * SX / 1280, h: 35 * SY / 720 }; }
// the clock of the fight the page is in: phase 2 from the T6 / T7 Charge (fb2Pic), phase 1 from T1's confirm (fbPic)
function fbbClock(t) {
  if (typeof FB2 !== 'undefined' && FB2.on && typeof CHG !== 'undefined' && CHG.trig && typeof chgP === 'function' && chgP().id === 'fb2') return { k: 'fb2', F: fb2Pic(t) };
  if (typeof FB14 !== 'undefined' && FB14.on && FB14.t0 != null) return { k: 'fb14', F: fbPic(t) };
  return null;
}
// the game picture as the 640x480 raster of the 320-space (as chgGrab), violet pixels only. Grabbed at twice that and each
// 2x2 block kept if any of its pixels is violet: on the runner's 1280x720 capture a sky bolt is ~3 px wide, and grabbed at
// 640x480 its colour blended with the night sky below the cut (the v127 clip test read nothing of it)
let fbbCv = null, fbbCtx = null;
function fbbGrab() {
  if (!fbbCv) { fbbCv = document.createElement('canvas'); fbbCv.width = 1280; fbbCv.height = 960; fbbCtx = fbbCv.getContext('2d', { willReadFrequently: true }); }
  const c = fbbCtx, [vw, vh] = dims(), [SX, OX, SY, OY] = chgMap(), kx = 1280 / vw, ky = 720 / vh;
  c.setTransform(4 / SX * kx, 0, 0, 4 / SY * ky, 1 - 4 / SX * (0.5 + OX), 1 - 4 / SY * (0.5 + OY));
  c.fillStyle = '#000'; c.fillRect(-1e4, -1e4, 3e4, 3e4); c.drawImage(V.src || V.video, 0, 0, vw, vh); c.setTransform(1, 0, 0, 1, 0, 0);
  const d = c.getImageData(0, 0, 1280, 960).data, m = new Uint8Array(640 * 480);
  for (let y = 0; y < 960; y++) for (let x = 0; x < 1280; x++) { const i = (y * 1280 + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2]; if (b > 140 && b - g > 60 && r > g + 10) m[(y >> 1) * 640 + (x >> 1)] = 1; }
  return m;
}
// a box (capture units 0..1) at the capture's own resolution: its violet pixels
const fbbBoxCv = {};
function fbbBoxMask(key, B) {
  try {
    const [vw, vh] = dims(), x = Math.round(B.x * vw), y = Math.round(B.y * vh), w = Math.max(1, Math.round(B.w * vw)), h = Math.max(1, Math.round(B.h * vh));
    const K = fbbBoxCv[key] || (fbbBoxCv[key] = (() => { const cv = document.createElement('canvas'); return { cv, cx: cv.getContext('2d', { willReadFrequently: true }) }; })());
    if (K.cv.width !== w || K.cv.height !== h) { K.cv.width = w; K.cv.height = h; }
    K.cx.drawImage(V.src || V.video, x, y, w, h, 0, 0, w, h);
    const d = K.cx.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (let i = 0, j = 0; j < m.length; i += 4, j++) { const r = d[i], g = d[i + 1], b = d[i + 2]; m[j] = b > 140 && b - g > 60 && r > g + 10 ? 1 : 0; }
    return { m, w, h };
  } catch (e) { return null; }
}
// one kind's onset: violet pixels new against a running base (at least K.on), after FBB_QUIET pictures with almost none.
// sky: in the box's upper part (a sky bolt comes down from the top; a front bolt reaches the box's bottom edge: the v127
// clip test). front right: spread over at least K.wide of the box's width (a sky bolt's foot is a blob), and no sky onset
// in the last 10 frames (bolt 2's foot lands in this box)
function fbbOnset(kind, F) {
  const K = FBB_KINDS[kind], b = fbbBoxMask(kind, K.box()); if (!b) return false;
  const D = FBB.det[kind] || (FBB.det[kind] = { grid: null, quiet: 0 }), { m, w, h } = b;
  if (!D.grid || D.grid.length !== m.length) { D.grid = Float32Array.from(m); D.quiet = 0; return false; }
  let nw = 0, ys = 0, x0 = 1e9, x1 = -1; for (let i = 0; i < m.length; i++) { if (m[i] && D.grid[i] < 0.3) { nw++; ys += Math.floor(i / w); const x = i % w; if (x < x0) x0 = x; if (x > x1) x1 = x; } D.grid[i] = 0.9 * D.grid[i] + 0.1 * m[i]; }
  const ok = nw >= K.on && D.quiet >= FBB_QUIET && (!K.upper || ys / nw < h * 0.6) && (!K.wide || (x1 - x0 >= K.wide * w && F - FBB.lastOn > 10));
  D.quiet = nw < K.on / 4 ? D.quiet + 1 : 0;
  if (ok) { D.quiet = 0; D.n = nw; }
  return ok;
}
function fbbFrame(t, present) {
  if (window.__noBoltRead) return;
  const ck = fbbClock(t); if (!ck) return;
  const busy = !present || (typeof CHG !== 'undefined' && (CHG.state === 'armed' || CHG.state === 'capture'));
  const C = FBB.col;
  if (C) {     // collecting: one picture per game frame after the onset's
    if (busy || ck.k !== C.k) { slog('boltReadDrop', { kind: C.kind, why: busy ? 'menu closed' : 'clock changed', got: C.pics.length }); FBB.col = null; return; }
    const F = Math.round(ck.F), nf = FBB_KINDS[C.kind].nf;
    if (F > C.Fon && !C.pics.some(p => p.F === F) && C.pics.length < nf) C.pics.push({ F, m: fbbGrab() });
    if (C.pics.length >= nf || F > C.Fon + nf + 3) { FBB.col = null; fbbRead(C); }
    return;
  }
  if (busy) { FBB.det = {}; FBB.base = null; return; }
  const F = Math.round(ck.F);
  for (const kind of ['sky', 'fr']) {
    if (fbbOnset(kind, F) && FBB.base && !FBB.busy) {
      if (kind === 'sky') FBB.lastOn = F;
      FBB.col = { kind, k: ck.k, Fon: F, ton: t, base: FBB.base, pics: [] }; slog('boltOnset', { kind, clk: ck.k, F, n: FBB.det[kind].n }); return;
    }
  }
  const D = FBB.det.sky;
  if (D && D.quiet >= 2 && (FBB.qn = (FBB.qn + 1) % FBB_BASE_EVERY) === 0) FBB.base = fbbGrab();     // a quiet picture: the base
}
// score a collection (the pictures on consecutive frames from the first), then weigh the states
function fbbRead(C) {
  const K = FBB_KINDS[C.kind], P = C.pics.slice().sort((a, b) => a.F - b.F); let n = 1; while (n < P.length && P[n].F === P[0].F + n) n++;
  if (n < 3) { slog('boltReadDrop', { kind: C.kind, why: 'frames', got: P.length, run: n }); return; }
  const obs = P.slice(0, n).map(p => { const m = p.m; for (let i = 0; i < m.length; i++) if (C.base[i]) m[i] = 0; return fbbObs(m, 640, 480, [0, 60, 640, 480]); });
  if (obs.every(o => o.n < 30)) { slog('boltReadDrop', { kind: C.kind, why: 'no violet', got: n }); return; }
  FBB.busy = true; const t0 = performance.now();
  const L = FBB_L.slice(); FBB_L[0] = K.L0[0]; FBB_L[1] = K.L0[1];
  fbbScore(obs, K.types, T => {
    FBB_L[0] = L[0]; FBB_L[1] = L[1]; FBB.busy = false;
    const R = { kind: C.kind, k: C.k, F1: P[0].F, n, C: T, best: fbbBest(T), ms: Math.round(performance.now() - t0) };
    FBB.reads.push(R); if (FBB.reads.length > 40) FBB.reads.shift();
    const res = fbbApply(R);
    slog('boltRead', { kind: R.kind, clk: R.k, F1: R.F1, frames: n, type: R.best.type, u: R.best.u % 120, L0: R.best.L0, cost: +R.best.c.toFixed(2), ms: R.ms, ...res });
    if (res.states && typeof makePlan === 'function' && (!st.plan || !st.plan.tPress || st.plan.tPress - performance.now() > 1500)) { st.plan = null; makePlan(); }
  }, FBB_MS);
}
const fbbM1 = (g, ph) => ((g + ph[0]) % 130 + 130) % 130, fbbM2 = (g, ph) => ((g + ph[1]) % 220 + 220) % 220;
// the bolt of a kind a state draws on logic frame g (type, value): its circulating bolt first, then the random one (fbStep order)
function fbbDrawAt(s, g, ph, kind) {
  const m1 = fbbM1(g, ph), m2 = fbbM2(g, ph), circ = m1 === 78 || m1 === 83 || m1 === 113 || m1 === 118;
  if (kind === 'fr') { if (m1 !== FBB_FRSLOT) return null; fbRi(s, 359); return { ty: 5, v: FBV }; }
  const ty = FBB_SLOT[m2]; if (!ty) return null;
  if (circ) s = fbRi(s, 359);
  fbRi(s, 359); return { ty, v: FBV };
}
// the state's factor: its bolt of the reading's kind on a frame of FBB_WIN before the first picture (clock; logic = clock -
// lag), the value its seed draws there, scored on the best lifetime row. v128 (the runner's 09:17 run, v127: 13 readings,
// every state at the floor on 12 of them): the picture shows a frame some frames after the page clock's (the coin's shines
// are matched 4.8 frames after their picture), so the draw was not on F1 - L0 + 1. The window holds at most one sky bolt
// (their slots are 10+ frames apart), and the delay each matched state implies is logged (boltRead lat) to pin it down.
const FBB_WIN = [1, 9];
function fbbFactor(R, ph, lag, valueAt, out) {
  for (let back = FBB_WIN[0]; back <= FBB_WIN[1]; back++) { const g = R.F1 - back - lag;
    const has = R.kind === 'fr' ? fbbM1(g, ph) === FBB_FRSLOT : !!FBB_SLOT[fbbM2(g, ph)];
    if (!has) continue; const x = valueAt(g); if (!x) return 1;
    const K = FBB_KINDS[R.kind || 'sky']; let best = 0, bL = 0; for (let L0 = K.L0[0]; L0 <= K.L0[1]; L0++) { const f = fbbLik(R, x.ty, x.v, L0); if (f > best) { best = f; bL = L0; } }
    if (out) { out.back = back; out.L0 = bL; } return best; }
  return FBB_FLOOR;      // the state draws no such bolt there, yet one was seen
}
function fbbApply(R) {
  let w0 = 0, w1 = 0, n = 0; const lat = {}, o1 = {}; const note = f => { if (f > 0.5 && o1.back != null) { const k = (o1.back - o1.L0 + 1); lat[k] = (lat[k] || 0) + 1; } o1.back = null; }; const kind = R.kind || 'sky', want = e => kind === 'fr' ? ((e >> 9) & 7) === 5 : ((e >> 9) & 7) !== 5;
  if (R.k === 'fb14' && FB14.states && FB14.states.length) {
    for (const S of FB14.states) {
      const f = fbbFactor(R, S.ph, S.l, g => {
        if (g < S.f) { for (const e of [S.b0, S.b1, S.b2, S.b3]) if (e && Math.floor(e / 4096) === g && want(e)) return { ty: (e >> 9) & 7, v: e & 511 }; return null; }
        const T = fbClone(S); fbRun(T, g); return fbbDrawAt(T.s, g, T.ph, kind);
      }, o1); note(f);
      w0 += S.w; S.w *= f; w1 += S.w; n++;
    }
  } else if (R.k === 'fb2' && typeof FB2 !== 'undefined') {
    const T7 = FB2.t7 && FB2.t7.states;
    if (T7 && T7.length) {
      for (const o of T7) {
        const f = fbbFactor(R, o.h.ph, o.l || 0, g => { if (g < o.a.T + 1) return null; const S = { s: o.a.S.s, nc: o.a.S.nc }; fb2Idle(S, o.a.T + 1, g, o.h.ph); return fbbDrawAt(S.s, g, o.h.ph, kind); }, o1); note(f);
        w0 += o.w; o.w *= f; w1 += o.w; n++;
      }
    } else if (FB2.hyps && FB2.hyps.length) {
      for (const h of FB2.hyps) {
        let f = 0, wl = 0;
        for (const [l, wlag] of FB2_LAGS) { f += wlag * fbbFactor(R, h.ph, l, g => { if (g < 61) return null; const S = { s: h.s, nc: h.nc }; fb2Idle(S, 61, g, h.ph); return fbbDrawAt(S.s, g, h.ph, kind); }, o1); note(f); wl += wlag; }
        f /= wl || 1; w0 += h.w; h.w *= f; w1 += h.w; n++;
      }
    }
  }
  return { states: n, kept: n ? +(w1 / (w0 || 1)).toFixed(3) : null, lat };     // lat: the picture's delay (frames) the well-matched states imply, by count
}
