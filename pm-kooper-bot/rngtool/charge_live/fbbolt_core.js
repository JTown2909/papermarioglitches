/* v127: reading the Final Bowser stage lightning's zigzag (fb2_route/bolt_shape/README.md). Each sky bolt draws one
 * rand_int(359) (u, effects/lightning_bolt.c); its 12 vertices come from u and the bolt's lifetime alone (checked against
 * the emulator's RAM to 0.03 units), the battle camera in the menus is fixed (read from RAM), and the bright violet is the
 * texture's core along the vertex path. A bolt seen for a few frames is scored against every u and lifetime: about +-3 of
 * u mod 120 (16 emulator bolts: within 3 on 15, within 5 on all), plus its lifetime (so the frame it was drawn).
 * Pure functions, also loaded by the tests in Node. */
const FBB_OFF = [[5,5,5,5,5,5,5,5,5,5,5,5],[5,5,5,5,5,5,5,5,5,5,5,5],[35,5,25,5,0,25,35,5,15,0,0,0],[45,15,35,15,0,35,45,55,25,5,2,0],
  [15,15,15,15,15,15,0,15,15,5,2,0],[1,5,15,15,35,45,40,35,25,5,2,0],[1,15,25,15,25,35,45,40,35,15,5,0],[30,25,15,5,15,15,25,30,35,25,5,0],
  [33,33,20,12,25,17,15,20,22,20,5,0],[30,30,25,25,35,20,15,10,15,15,5,0],[27,27,22,22,32,17,12,7,12,12,2,0]];
const FBB_WID = [[10,9,3,1,0,0,0,0,0,0,0,0],[8,7,6,5,4,3,2,1,0,0,0,0],[10,13,15,12,11,13,10,12,5,1,0,0],[13,10,12,10,13,10,13,10,12,9,5,1],
  [14,10,15,10,13,30,32,30,24,50,40,60],[4,6,10,5,8,14,6,10,14,35,50,50],[2,2,23,12,8,15,15,5,6,18,38,60],[3,3,3,11,3,12,4,5,2,12,42,50],
  [3,3,3,2,10,2,2,12,2,2,2,20],[2,2,2,2,2,2,6,2,2,2,6,5],[2,2,2,2,2,2,2,2,2,2,2,0]];
// the stage's random bolts (kkj_02.inc.c RandomBoltPositions, z -91): the loop (60, 10, 90, 60 frames) draws them on its
// phase 18, 78, 88, 178 (fbBolts' m2), in this order
const FBB_SKY = { 1: [-22, 190, -88, 21], 2: [-1, 190, 88, 24], 3: [-67, 190, -122, 10], 4: [57, 190, -4, 17] }, FBB_SKYZ = -91;
const FBB_SLOT = { 18: 1, 78: 2, 88: 3, 178: 4 };
// the circulating loop's third bolt (CirculatingBoltPositions[2]: the front right, z 113 -> 121; fbBolts' m1 = 113): bolt 5
const FBB_FR = [146, 1, 113, 38, -15, 121], FBB_FRSLOT = 113;
const fbbEnds = type => type === 5 ? FBB_FR : [FBB_SKY[type][0], FBB_SKY[type][1], FBB_SKYZ, FBB_SKY[type][2], FBB_SKY[type][3], FBB_SKYZ];
// the battle camera in the menus (gCameras[1]: eye, look-at, vfov 25, viewport 296x200 at 12, 20 of the 320x240 frame)
const FBB_CAM = { eye: [0, 129.6279754638672, 495.1170349121094], obj: [0, 60, 0], fov: 25, vp: [296, 200, 12, 20] };
const FBB_L = [2, 7];         // the lifetimes read (1: a straight line, nothing to read; 8+: fading)
const FBB_CAP = 20;           // px (the 640x480 raster of the 320-space): a distance counts up to this
function fbbCamBasis() {
  const C = FBB_CAM, f = C.obj.map((v, i) => v - C.eye[i]), n = Math.hypot(...f); for (let i = 0; i < 3; i++) f[i] /= n;
  const s = [-f[2], 0, f[0]], ns = Math.hypot(...s); for (let i = 0; i < 3; i++) s[i] /= ns;
  const u = [s[1] * f[2] - s[2] * f[1], s[2] * f[0] - s[0] * f[2], s[0] * f[1] - s[1] * f[0]];
  return { f, s, u, t: 1 / Math.tan(C.fov * Math.PI / 360), asp: C.vp[0] / C.vp[1] };
}
const FBB_B = fbbCamBasis();
// world (x, y, z) -> the 640x480 raster of the 320-space (2 px per unit, as the Charge read's chgGrab)
function fbbProj(x, y, z) {
  const C = FBB_CAM, B = FBB_B, d = [x - C.eye[0], y - C.eye[1], z - C.eye[2]];
  const xc = d[0] * B.s[0] + d[1] * B.s[1] + d[2] * B.s[2], yc = d[0] * B.u[0] + d[1] * B.u[1] + d[2] * B.u[2], zc = -(d[0] * B.f[0] + d[1] * B.f[1] + d[2] * B.f[2]);
  const xn = (B.t / B.asp) * xc / -zc, yn = B.t * yc / -zc;
  return [(C.vp[2] + C.vp[0] / 2 * (1 + xn)) * 2, (C.vp[3] + C.vp[1] / 2 * (1 - yn)) * 2];
}
// the vertices (world x, y) of a type-0 bolt S -> E with value u at lifetime L (lightning_bolt_appendGfx), and their widths
function fbbVerts(u, L, S, E) {
  const k = Math.min(Math.max(L - 1, 0), 10), off = FBB_OFF[k], wid = FBB_WID[k], ax = (E[0] - S[0]) / 11, ay = (E[1] - S[1]) / 11, V = [];
  for (let i = 0; i < 12; i++) {
    const th = ((u + (i - L) * 10) % 120 - 60) * Math.PI / 180, kk = off[i] * 0.04, sn = Math.sin(th) * kk, cs = Math.cos(th) * kk;
    V.push([S[0] + (E[0] - S[0]) * i / 11 + ax * cs - ay * sn, S[1] + (E[1] - S[1]) * i / 11 + ax * sn + ay * cs]);
  }
  return { V, w: wid };
}
// the drawn centre line of bolt `type` (1-4 the sky bolts, 5 the front right) (u, L) on the raster: 12 points and which of the 11 segments are drawn
const FBB_CACHE = new Map();
// v182: a camera other than the menus' (cam: { key, M }: gCameras[1]'s perspective matrix (16) and viewport (4), as the Charge read's tables)
function fbbProjM(M, x, y, z) { const v0 = x * M[0] + y * M[4] + z * M[8] + M[12], v1 = x * M[1] + y * M[5] + z * M[9] + M[13], v3 = x * M[3] + y * M[7] + z * M[11] + M[15];
  return [(M[18] + M[16] / 2 * (1 + v0 / v3)) * 2, (M[19] + M[17] / 2 * (1 - v1 / v3)) * 2]; }
function fbbLine(type, u, L, cam) {
  const key = (cam ? cam.key + ':' : '') + ((type * 16 + L) * 360 + u); let r = FBB_CACHE.get(key); if (r) return r;
  const b = fbbEnds(type), { V, w } = fbbVerts(u, L, [b[0], b[1]], [b[3], b[4]]), P = new Float32Array(24), ok = new Uint8Array(11);
  for (let i = 0; i < 12; i++) { const z = b[2] + (b[5] - b[2]) * i / 11, p = cam ? fbbProjM(cam.M, V[i][0], V[i][1], z) : fbbProj(V[i][0], V[i][1], z); P[2 * i] = p[0]; P[2 * i + 1] = p[1]; }     // the vertices' z: start to end (deltaZ 0)
  for (let i = 0; i < 11; i++) ok[i] = w[i] > 0 && w[i + 1] > 0 ? 1 : 0;
  r = { P, ok }; if (FBB_CACHE.size > 40000) FBB_CACHE.clear(); FBB_CACHE.set(key, r); return r;
}
// exact Euclidean distance transform (Felzenszwalb) of a W x H mask: the distance of each pixel to the nearest set one
function fbbEdt(m, W, H) {
  const INF = 1e12, g = new Float64Array(W * H), f = new Float64Array(Math.max(W, H)), d = new Float64Array(Math.max(W, H)), v = new Int32Array(Math.max(W, H)), z = new Float64Array(Math.max(W, H) + 1);
  const pass = n => { let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q++) { let s; do { const p = v[k]; s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p); if (s <= z[k]) k--; else break; } while (k >= 0); k++; v[k] = q; z[k] = s; z[k + 1] = INF; }
    k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const p = v[k]; d[q] = (q - p) * (q - p) + f[p]; } };
  for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) f[y] = m[y * W + x] ? 0 : INF; pass(H); for (let y = 0; y < H; y++) g[y * W + x] = d[y]; }
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) f[x] = g[y * W + x]; pass(W); for (let x = 0; x < W; x++) out[y * W + x] = Math.sqrt(d[x]); }
  return out;
}
/* one picture's evidence: its violet pixels (a sample of at most 200) and their distance transform, in the box [x0, y0, x1, y1)
 * of the 640x480 raster (m: Uint8Array, 1 = violet and new against the base) */
function fbbObs(m, W, H, box) {
  const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0, mm = new Uint8Array(w * h), pts = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (m[y * W + x]) { mm[(y - y0) * w + (x - x0)] = 1; pts.push(x, y); }
  let P = pts; const n = pts.length / 2;
  if (n > 200) { P = []; let s = 12345; for (let i = 0; i < 200; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; const j = s % n; P.push(pts[2 * j], pts[2 * j + 1]); } }
  return { P: Float32Array.from(P), dt: fbbEdt(mm, w, h), box, w, h, n, m };
}
// the two-way chamfer of a centre line against one picture (capped at FBB_CAP)
function fbbCost1(line, o) {
  const { P, ok } = line, [x0, y0] = o.box; let a = 0, na = 0;
  for (let j = 0; j < 11; j++) { if (!ok[j]) continue; const ax = P[2 * j], ay = P[2 * j + 1], bx = P[2 * j + 2], by = P[2 * j + 3];
    for (let t = 0; t < 10; t++) { const x = Math.round(ax + (bx - ax) * t / 9) - x0, y = Math.round(ay + (by - ay) * t / 9) - y0;
      if (x < 0 || y < 0 || x >= o.w || y >= o.h) continue; a += Math.min(o.dt[y * o.w + x], FBB_CAP); na++; } }
  if (!na) return 2 * FBB_CAP;
  let b = 0; const np = o.P.length / 2;
  if (!np) return a / na + FBB_CAP;
  for (let i = 0; i < np; i++) { const px = o.P[2 * i], py = o.P[2 * i + 1]; let best = 1e9;
    for (let j = 0; j < 11; j++) { if (!ok[j]) continue; const ax = P[2 * j], ay = P[2 * j + 1], dx = P[2 * j + 2] - ax, dy = P[2 * j + 3] - ay, L2 = dx * dx + dy * dy;
      let t = L2 > 1e-9 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const ex = px - ax - t * dx, ey = py - ay - t * dy, e = ex * ex + ey * ey; if (e < best) best = e; }
    b += Math.min(Math.sqrt(best), FBB_CAP); }
  return a / na + b / np;
}
/* v127 (the runner's clip: Bowser's Star Rod colours cycle through violet, and with the whole picture's violet the clip's bolt
 * read as another): each sky bolt is scored against the violet inside its own corridor only (every line it can draw,
 * widened by FBB_COR px), so another bolt or Bowser's glow elsewhere does not count against it */
const FBB_COR = 14, FBB_CORS = {};
function fbbCorridor(type, cam) {
  const ck = (cam ? cam.key + ':' : '') + type; if (FBB_CORS[ck]) return FBB_CORS[ck];
  const W = 640, H = 480, m = new Uint8Array(W * H);
  for (let L = 1; L <= 8; L++) for (let u = 0; u < 360; u += 2) { const { P, ok } = fbbLine(type, u, L, cam);
    for (let j = 0; j < 11; j++) { if (!ok[j]) continue; const ax = P[2 * j], ay = P[2 * j + 1], bx = P[2 * j + 2], by = P[2 * j + 3], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 4) + 1;
      for (let t = 0; t <= n; t++) { const x = Math.round(ax + (bx - ax) * t / n), y = Math.round(ay + (by - ay) * t / n); if (x >= 0 && y >= 0 && x < W && y < H) m[y * W + x] = 1; } } }
  const d = fbbEdt(m, W, H), c = new Uint8Array(W * H); for (let i = 0; i < c.length; i++) c[i] = d[i] <= FBB_COR ? 1 : 0;
  if (Object.keys(FBB_CORS).length > 24) for (const k in FBB_CORS) delete FBB_CORS[k];     // v182: held cameras add their own
  return (FBB_CORS[ck] = c);
}
// one picture's evidence for one sky bolt: its corridor's violet only (o.m: the picture's new violet)
function fbbObsFor(o, type) {
  const key = 't' + type; if (o[key]) return o[key];
  const cor = fbbCorridor(type, o.cam), W = 640, m = new Uint8Array(o.m.length); for (let i = 0; i < m.length; i++) m[i] = o.m[i] && cor[i] ? 1 : 0;
  const r = fbbObs(m, W, 480, o.box); r.cam = o.cam; return (o[key] = r);
}
/* the cost table of a bolt seen on pictures obs[k] (consecutive game frames from the first): C[type][L0][u] = mean cost,
 * L0 = the lifetime on the first picture (FBB_L), type 1-4. done(C) when finished; slices of at most `ms` ms (setTimeout). */
function fbbScore(obs, types, done, ms) {
  const C = {}, jobs = []; for (const ty of types) { C[ty] = []; for (let L0 = FBB_L[0]; L0 <= FBB_L[1]; L0++) { C[ty][L0] = new Float32Array(360); jobs.push([ty, L0]); } }
  let j = 0, u = 0;
  const run = () => { const t0 = Date.now();
    while (j < jobs.length) { const [ty, L0] = jobs[j];
      const ob = obs.map(o => fbbObsFor(o, ty));
      for (; u < 360; u++) { let s = 0; for (let k = 0; k < ob.length; k++) s += fbbCost1(fbbLine(ty, u, L0 + k, ob[k].cam), ob[k]); C[ty][L0][u] = s / ob.length;
        if (ms && Date.now() - t0 > ms) { u++; return setTimeout(run, 0); } }
      u = 0; j++; }
    done(C); };
  run();
}
// the best (type, L0, u) of a table, and the cost of every u at it
function fbbBest(C) { let b = null; for (const ty in C) for (let L0 = FBB_L[0]; L0 <= FBB_L[1]; L0++) { const a = C[ty][L0]; if (!a) continue; for (let u = 0; u < 360; u++) if (!b || a[u] < b.c) b = { c: a[u], type: +ty, L0, u }; } return b; }
const FBB_T = 0.4, FBB_T5 = 1.0, FBB_FLOOR = 0.1;     // FBB_T5: the front-right bolt (emulator: the true value's cost gap up to 1.02, vs 0.62 on the sky bolts)      // the likelihood's temperature (px of cost) and its floor (a misread never cuts a state)
// a state's factor: its own sky bolt (type, value v) drawn d0 frames before the first picture's frame (lifetime L0 = d0 + 1)
function fbbLik(R, type, v, L0) {
  const a = R.C[type] && R.C[type][L0]; if (!a) return FBB_FLOOR;
  return FBB_FLOOR + (1 - FBB_FLOOR) * Math.exp(-(a[v] - R.best.c) / (type === 5 ? FBB_T5 : FBB_T));
}
if (typeof module !== 'undefined') module.exports = { fbbProjM, FBB_FR, FBB_FRSLOT, fbbEnds, fbbCorridor, fbbObsFor, FBB_SKY, FBB_SKYZ, FBB_SLOT, FBB_CAM, FBB_L, fbbProj, fbbVerts, fbbLine, fbbEdt, fbbObs, fbbCost1, fbbScore, fbbBest, fbbLik, FBB_T, FBB_FLOOR };
