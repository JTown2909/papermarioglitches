/* v128: the front-right bolt (bolt 5: the circulating loop's third, z 113 -> 121) read as the sky bolts are (v127).
 * 1. Drawn from the game's formula (lifetimes 2-3, 4 frames): u mod 120 within 3, the lifetime right.
 * 2. In the page, phase 1: 60 states with one seed's phases; a front-right bolt drawn from one state's own value: that state
 *    keeps most of its weight (the softer likelihood), most others fall; a sky reading still uses the sky bolt only.
 * (Emulator, 33 front-right bolts: 17 within 3, most within 10: fb2_route/bolt_shape/README.md.) */
/* v127 notes kept for the helpers below:
 * 1. The reader on bolts drawn from the game's formula (the centre line 2 px wide on the 640x480 raster, the lifetimes the
 *    page reads, some stray violet): u mod 120 within 2 and the lifetime right; the true value keeps a high likelihood.
 *    (On 55 emulator bolts, rendered with the runner's ROM and checked against the game's RAM, the same reader read
 *    54 within 3: fb2_route/bolt_shape/README.md. Those pictures are not in the repository.)
 * 2. In the page, phase 1: 60 Final Bowser states with one seed's lightning phases and different seeds; a bolt drawn from
 *    one state's own value: that state keeps its weight, most others fall to the floor.
 * 3. Phase 2: the same with T7 states (FB2.t7.states). */
const F = require('./charge_live/fbbolt_core.js');
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const W = 640, H = 480;
function drawBolt(type, u, L, rnd) {
  const m = new Uint8Array(W * H), { P, ok: vis } = F.fbbLine(type, u, L);
  for (let j = 0; j < 11; j++) { if (!vis[j]) continue; const ax = P[2 * j], ay = P[2 * j + 1], bx = P[2 * j + 2], by = P[2 * j + 3], n = Math.ceil(Math.hypot(bx - ax, by - ay)) + 1;
    for (let t = 0; t <= n; t++) { const x = Math.round(ax + (bx - ax) * t / n), y = Math.round(ay + (by - ay) * t / n);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 0; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 60 && X < W && Y < H) m[Y * W + X] = 1; } } }
  for (let i = 0; i < 60; i++) { const X = Math.floor(rnd() * W), Y = 60 + Math.floor(rnd() * (H - 60)); m[Y * W + X] = 1; }     // stray violet
  return m;
}
let seed = 7; const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
(async () => {
  F.FBB_L[0] = 2; F.FBB_L[1] = 3;
  let good = 0, goodL = 0, liks = []; const N = 10;
  for (let k = 0; k < N; k++) {
    const u = Math.floor(rnd() * 359), L0 = 2 + (k % 2);
    const obs = []; for (let i = 0; i < 4; i++) obs.push(F.fbbObs(drawBolt(5, u, L0 + i, rnd), W, H, [0, 60, W, H]));
    let C; F.fbbScore(obs, [5], c => { C = c; }, 0);
    const best = F.fbbBest(C), d = Math.min(((best.u - u) % 120 + 120) % 120, ((u - best.u) % 120 + 120) % 120);
    good += d <= 3; goodL += best.L0 === L0; liks.push(F.fbbLik({ C, best }, 5, u, L0));
  }
  ok(good >= N - 1, 'drawn front-right bolts: u mod 120 within 3 on ' + good + ' / ' + N);
  ok(goodL >= N - 1, 'drawn front-right bolts: the lifetime read on ' + goodL + ' / ' + N);
  ok(Math.min(...liks) > 0.4, 'the true value keeps a likelihood over 0.4 (lowest ' + Math.min(...liks).toFixed(2) + ')');
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file:///tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html');
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  const r = JSON.parse(await E(`{
    const W = 640, H = 480; const drawBolt = ${drawBolt.toString().replace(/F\./g, '')};
    let sd = 99; const rnd = () => (sd = (Math.imul(sd, 1103515245) + 12345) >>> 0) / 4294967296;
    const read = (kind, type, v, L0, F1, k) => { const K = FBB_KINDS[kind], obs = []; for (let i = 0; i < K.nf; i++) obs.push(fbbObs(drawBolt(type, v, L0 + i, rnd), 640, 480, [0, 60, 640, 480]));
      const L = FBB_L.slice(); FBB_L[0] = K.L0[0]; FBB_L[1] = K.L0[1]; let C; fbbScore(obs, K.types, c => { C = c; }, 0); FBB_L[0] = L[0]; FBB_L[1] = L[1];
      return { kind, k, F1, n: K.nf, C, best: fbbBest(C) }; };
    const ph = [37, 151], out = {};
    FB14.on = true; FB14.states = [];
    for (let i = 0; i < 60; i++) { const S = fbNew({ s: (0x1234abcd + i * 0x9E3779B9) >>> 0, nc: 100000, f: 0, c: new Uint8Array(20), ph, l: 0, w: 1 }); fbRun(S, 400); FB14.states.push(S); }
    let g = 399; while (fbbM1(g, ph) !== FBB_FRSLOT) g--;
    const T = FB14.states[0], ent = [T.b0, T.b1, T.b2, T.b3].find(e => e && Math.floor(e / 4096) === g && ((e >> 9) & 7) === 5);
    const v = ent & 511, L0 = 2, F1 = g + L0 - 1, R = read('fr', 5, v, L0, F1, 'fb14'), res = fbbApply(R), w = FB14.states.map(S => S.w);
    out.p1 = { g, v, read: R.best.u % 120, trueW: w[0], others: w.slice(1).filter(x => x > 0.5).length, kept: res.kept };
    // a copy run to the bolt (a state behind it) gives the same value
    const S0 = fbNew({ s: 0x1234abcd >>> 0, nc: 100000, f: 0, c: new Uint8Array(20), ph, l: 0, w: 1 }); fbRun(S0, g - 3); const x0 = (() => { const C = fbClone(S0); fbRun(C, g); return fbbDrawAt(C.s, g, C.ph, 'fr'); })();
    out.p1.copyV = x0 && x0.v;
    FB14.on = false; FB14.states = [];
    JSON.stringify(out); }`));
  console.log(JSON.stringify(r));
  ok(r.p1.trueW > 0.6, 'phase 1: the state whose front-right bolt it is keeps its weight (' + r.p1.trueW.toFixed(2) + '; value ' + r.p1.v + ', read ' + r.p1.read + ')');
  ok(r.p1.others <= 12, 'phase 1: most other states fall (' + r.p1.others + ' of 59 keep over half; weight kept ' + r.p1.kept + ')');
  ok(r.p1.copyV === r.p1.v, 'a state run to the bolt on a copy draws the same front-right value (' + r.p1.copyV + ')');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'all ok'); process.exit(fails ? 1 : 0);
})();
