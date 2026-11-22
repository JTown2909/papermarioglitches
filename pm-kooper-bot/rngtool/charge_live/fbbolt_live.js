/* v127: the stage lightning read on the page (fbbolt_core.js has the shape, the camera and the scoring).
 * In a Final Bowser menu (the HUD up: the battle camera fixed), a sky bolt's onset (new violet in the sky box) starts a
 * collection: the game picture's violet pixels, one picture per game frame, FBB_NF frames from the frame after the onset,
 * against a base picture from before it. The scoring (sliced, FBB_MS ms at a time) gives a cost table per sky bolt,
 * lifetime of the first picture (FBB_L0) and value u. Each state then gets the factor of its own bolt: the sky bolt its
 * lightning phase draws on the frame d = F1 - L0 + 1 (clock frames; F1 the first picture's frame), and the value its seed
 * draws there; a state with no sky bolt on those frames gets the floor. Never a cut (FBB_FLOOR).
 * Phase 1 (fb14 states): a state that has run past that frame reads its value from the last 4 its bolts left (fbStep, S.b0-b3);
 * one that has not is run to it on a copy. Phase 2 (FB2): the T6 seeds (FB2.hyps, from frame 61) and the T7 states
 * (FB2.t7.states, from Bowser's T6 turn) are run to it on a copy. Logged: boltRead (the best reading, how much weight the
 * states kept); the plan is made again unless its beeps are under 1.5 s away. */
const FBB_NF = 5, FBB_L0 = [2, 4], FBB_MS = 15, FBB_BASE_EVERY = 16, FBB_ON = 30, FBB_QUIET = 4;
var FBB = { col: null, base: null, quiet: 0, grid: null, reads: [], busy: false, qn: 0 };
function fbbReset() { FBB = { col: null, base: null, quiet: 0, grid: null, reads: [], busy: false, qn: 0 }; }
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
function fbbFrame(t, present) {
  if (window.__noBoltRead) return;
  const ck = fbbClock(t); if (!ck) return;
  const busy = !present || (typeof CHG !== 'undefined' && (CHG.state === 'armed' || CHG.state === 'capture'));
  const C = FBB.col;
  if (C) {     // collecting: one picture per game frame after the onset's
    if (busy || ck.k !== C.k) { slog('boltReadDrop', { why: busy ? 'menu closed' : 'clock changed', got: C.pics.length }); FBB.col = null; return; }
    const F = Math.round(ck.F);
    if (F > C.Fon && !C.pics.some(p => p.F === F) && C.pics.length < FBB_NF) C.pics.push({ F, m: fbbGrab() });
    if (C.pics.length >= FBB_NF || F > C.Fon + FBB_NF + 3) { FBB.col = null; fbbRead(C); }
    return;
  }
  if (busy) { FBB.grid = null; FBB.quiet = 0; FBB.base = null; return; }
  // the onset, on the sky box at the capture's own resolution (a 3 px bolt averaged away on fbBoltFrame's 64 x 21 grid: in
  // the v127 clip test the onset came only with the next, lower bolt, after the sky bolt was gone): violet pixels new
  // against a running base, at least FBB_ON of them, in the box's upper part (a sky bolt comes down from the top; a front
  // bolt reaches the box's bottom edge), after FBB_QUIET pictures with almost none
  const sky = fbbSky(); if (!sky) return;
  const { m, w, h } = sky;
  if (!FBB.grid || FBB.grid.length !== m.length) { FBB.grid = Float32Array.from(m); FBB.quiet = 0; return; }
  let nw = 0, ys = 0; for (let i = 0; i < m.length; i++) { if (m[i] && FBB.grid[i] < 0.3) { nw++; ys += Math.floor(i / w); } FBB.grid[i] = 0.9 * FBB.grid[i] + 0.1 * m[i]; }
  if (nw >= FBB_ON && FBB.quiet >= FBB_QUIET && FBB.base && !FBB.busy && ys / nw < h * 0.6) { FBB.col = { k: ck.k, Fon: Math.round(ck.F), ton: t, base: FBB.base, pics: [] }; FBB.quiet = 0; slog('boltOnset', { clk: ck.k, F: Math.round(ck.F), n: nw }); return; }
  FBB.quiet = nw < FBB_ON / 4 ? FBB.quiet + 1 : 0;
  if (FBB.quiet >= 2 && (FBB.qn = (FBB.qn + 1) % FBB_BASE_EVERY) === 0) FBB.base = fbbGrab();     // a quiet picture: the base
}
// the sky box (fbBoltBox) at the capture's resolution: its violet pixels
let fbbSkyCv = null, fbbSkyCtx = null;
function fbbSky() {
  try {
    const B = fbBoltBox(), [vw, vh] = dims(), x = Math.round(B.x * vw), y = Math.round(B.y * vh), w = Math.max(1, Math.round(B.w * vw)), h = Math.max(1, Math.round(B.h * vh));
    if (!fbbSkyCv) { fbbSkyCv = document.createElement('canvas'); fbbSkyCtx = fbbSkyCv.getContext('2d', { willReadFrequently: true }); }
    if (fbbSkyCv.width !== w || fbbSkyCv.height !== h) { fbbSkyCv.width = w; fbbSkyCv.height = h; }
    fbbSkyCtx.drawImage(V.src || V.video, x, y, w, h, 0, 0, w, h);
    const d = fbbSkyCtx.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (let i = 0, j = 0; j < m.length; i += 4, j++) { const r = d[i], g = d[i + 1], b = d[i + 2]; m[j] = b > 140 && b - g > 60 && r > g + 10 ? 1 : 0; }
    return { m, w, h };
  } catch (e) { return null; }
}
// score a collection (the pictures on consecutive frames from the first), then weigh the states
function fbbRead(C) {
  const P = C.pics.slice().sort((a, b) => a.F - b.F); let n = 1; while (n < P.length && P[n].F === P[0].F + n) n++;
  if (n < 3) { slog('boltReadDrop', { why: 'frames', got: P.length, run: n }); return; }
  const obs = P.slice(0, n).map(p => { const m = p.m; for (let i = 0; i < m.length; i++) if (C.base[i]) m[i] = 0; return fbbObs(m, 640, 480, [0, 60, 640, 480]); });
  if (obs.every(o => o.n < 30)) { slog('boltReadDrop', { why: 'no violet', got: n }); return; }
  FBB.busy = true; const t0 = performance.now();
  const L = FBB_L.slice(); FBB_L[0] = FBB_L0[0]; FBB_L[1] = FBB_L0[1];
  fbbScore(obs, [1, 2, 3, 4], T => {
    FBB_L[0] = L[0]; FBB_L[1] = L[1]; FBB.busy = false;
    const R = { k: C.k, F1: P[0].F, n, C: T, best: fbbBest(T), ms: Math.round(performance.now() - t0) };
    FBB.reads.push(R); if (FBB.reads.length > 40) FBB.reads.shift();
    const res = fbbApply(R);
    slog('boltRead', { clk: R.k, F1: R.F1, frames: n, type: R.best.type, u: R.best.u % 120, L0: R.best.L0, cost: +R.best.c.toFixed(2), ms: R.ms, ...res });
    if (res.states && typeof makePlan === 'function' && (!st.plan || !st.plan.tPress || st.plan.tPress - performance.now() > 1500)) { st.plan = null; makePlan(); }
  }, FBB_MS);
}
// the sky bolt (type, value) a state draws on logic frame g: its circulating bolt first, then the random one (fbStep order)
function fbbDrawAt(s, g, ph) {
  const m1 = (g + ph[0]) % 130, m2 = (g + ph[1]) % 220, ty = FBB_SLOT[m2]; if (!ty) return null;
  if (m1 === 78 || m1 === 83 || m1 === 113 || m1 === 118) s = fbRi(s, 359);
  fbRi(s, 359); return { ty, v: FBV };
}
// the state's factor: its sky bolt on the frames the reading's lifetimes give (d = F1 - L0 + 1, clock; logic = clock - lag)
function fbbFactor(R, ph, lag, valueAt) {
  for (let L0 = FBB_L0[0]; L0 <= FBB_L0[1]; L0++) { const g = R.F1 - L0 + 1 - lag, m2 = ((g + ph[1]) % 220 + 220) % 220;
    if (!FBB_SLOT[m2]) continue; const x = valueAt(g); if (!x) return 1; return fbbLik(R, x.ty, x.v, L0); }
  return FBB_FLOOR;      // the state draws no sky bolt there, yet one was seen
}
function fbbApply(R) {
  let w0 = 0, w1 = 0, n = 0;
  if (R.k === 'fb14' && FB14.states && FB14.states.length) {
    for (const S of FB14.states) {
      const f = fbbFactor(R, S.ph, S.l, g => {
        if (g < S.f) { for (const e of [S.b0, S.b1, S.b2, S.b3]) if (e && Math.floor(e / 4096) === g) return { ty: (e >> 9) & 7, v: e & 511 }; return null; }
        const T = fbClone(S); fbRun(T, g); return fbbDrawAt(T.s, g, T.ph);
      });
      w0 += S.w; S.w *= f; w1 += S.w; n++;
    }
  } else if (R.k === 'fb2' && typeof FB2 !== 'undefined') {
    const T7 = FB2.t7 && FB2.t7.states;
    if (T7 && T7.length) {
      for (const o of T7) {
        const f = fbbFactor(R, o.h.ph, o.l || 0, g => { if (g < o.a.T + 1) return null; const S = { s: o.a.S.s, nc: o.a.S.nc }; fb2Idle(S, o.a.T + 1, g, o.h.ph); return fbbDrawAt(S.s, g, o.h.ph); });
        w0 += o.w; o.w *= f; w1 += o.w; n++;
      }
    } else if (FB2.hyps && FB2.hyps.length) {
      for (const h of FB2.hyps) {
        let f = 0, wl = 0;
        for (const [l, wlag] of FB2_LAGS) { f += wlag * fbbFactor(R, h.ph, l, g => { if (g < 61) return null; const S = { s: h.s, nc: h.nc }; fb2Idle(S, 61, g, h.ph); return fbbDrawAt(S.s, g, h.ph); }); wl += wlag; }
        f /= wl || 1; w0 += h.w; h.w *= f; w1 += h.w; n++;
      }
    }
  }
  return { states: n, kept: n ? +(w1 / (w0 || 1)).toFixed(3) : null };
}
