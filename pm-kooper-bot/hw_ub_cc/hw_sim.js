/* Ultra Boots Hallway Close Call study: models on top of ../rngtool/pmrng_core.js (not modified; turns added here).
 *   node hw_sim.js check SWEEP.json      route (B) T1 model vs an emulator sweep (b_t1_sweep.py)
 *   node hw_sim.js odds [N]              chances with a normal press spread (sd 1.3 frames over -4..+4) at the best
 *                                        frame of each window, over N random seeds / coin phases
 * Models (frames after the beeped press):
 *   B T1: Bombette's Do Nothing confirm c: Bowser's AI on c+13 (RandInt 80, then 60), Close Call rand_int(100) < 30
 *         on AI+54 / +70 / +55 (Body Slam / Claw Swipe / Fire Breath) (b_t1_sweep.py, b_t1_log.py).
 *   A T1: the Spiny Flip throw (A in the aim): impact on throw+24, AI on impact+44, then as above (charge_live v78);
 *         the aim sparkle from the Spiny Flip confirm +39..+119; throws on confirm+55..+114.
 *   Time Out: pmrng_core timeOutRoll (works if <= 30). Power Bounce caps: rolls every PER frames from +R0, pass if
 *         v <= floor(200 * 0.65^k); hit-effect draws one frame after each roll (count = damage). */
const R = require('../rngtool/pmrng_core.js');
R.TURNS.hw_nothing = { pre: {}, post: {}, aiAt: 13 };
const ccB = R.evSim(c => [{ f: c, id: 'hw_nothing' }]);
function ccA(seed, nc, spinyConfirm, t0, throwAt) {
  return R.evSim(c => [{ f: spinyConfirm, id: 'hw_spiny', imp: throwAt - spinyConfirm + 24, danger: true }])(seed, nc, throwAt, t0);
}
const SD = 1.3, SPREAD = (() => { const o = []; let s = 0; for (let d = -4; d <= 4; d++) { const w = Math.exp(-d * d / (2 * SD * SD)); o.push([d, w]); s += w; } return o.map(([d, w]) => [d, w / s]); })();
function best(ok, lo, hi) {        // ok: frame -> bool; best spread score over aims in [lo, hi]
  let b = 0, at = null;
  for (let f = lo; f <= hi; f++) { let v = 0; for (const [d, p] of SPREAD) if (ok(f + d)) v += p; if (v > b) { b = v; at = f; } }
  return [b, at];
}
let rs = 0x9e3779b9; const rnd = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0);
const mode = process.argv[2];
if (mode === 'check') {
  const d = JSON.parse(require('fs').readFileSync(process.argv[3]));
  let ok = 0, n = 0;
  for (const r of d.runs) {
    if (!r.cc.length) continue;
    const nc = r.coins.find(x => x >= 0), got = ccB(r.s0, nc, 0, 0), want = r.cc[0][3] < 30;
    n++; if (got === want) ok++; else console.log('mismatch d', r.d, 'model', got, 'emu', r.cc[0]);
  }
  console.log('B T1 model vs emulator:', ok, '/', n, 'confirm frames agree');
} else if (mode === 'odds') {
  const N = +process.argv[3] || 300, out = {};
  const acc = {}; const add = (k, v) => { (acc[k] = acc[k] || []).push(v); };
  for (let i = 0; i < N; i++) {
    const seed = rnd(), phase = rnd() % 24;
    // B: wait lever, window of W frames starting 30 frames after "now" (frame 0 = now)
    const mapB = new Map(); const okB = f => { if (!mapB.has(f)) mapB.set(f, ccB(seed, phase, f, 0)); return mapB.get(f); };
    for (const W of [30, 60, 180, 300]) add('B_T1_W' + W, best(okB, 30, 30 + W)[0]);
    add('B_T1_blind', okB(100) ? 1 : 0);
    // A: Spiny Flip confirm at frame 0, throw window +55..+114 (fixed by the aim timer)
    const mapA = new Map(); const okA = f => { if (f < 50 || f > 119) return false; if (!mapA.has(f)) mapA.set(f, ccA(seed, phase, 0, 0, f)); return mapA.get(f); };
    add('A_T1', best(okA, 55, 114)[0]); add('A_T1_blind', okA(80) ? 1 : 0);
    // Time Out: target screen, waiting allowed
    const mapT = new Map(); const okT = f => { if (!mapT.has(f)) mapT.set(f, R.timeOutRoll(seed, phase, f, 0) <= 30); return mapT.get(f); };
    for (const W of [60, 180, 300]) add('TimeOut_W' + W, best(okT, 30, 30 + W)[0]);
    add('TimeOut_blind', okT(100) ? 1 : 0);
  }
  for (const k in acc) out[k] = +(acc[k].reduce((a, b) => a + b, 0) / acc[k].length).toFixed(3);
  console.log(JSON.stringify(out, null, 1));
}
if (mode === 'pb') {
  // Hallway Bowser, Ultra Boots: cap rolls every 27 frames from +74, pass if v <= floor(200 * 0.65^k) (b_route.py logs);
  // hits = 2 + passes before the first failure. Per-frame map treated as independent frames (iid approximation: the
  // hit-effect draw counts are not modelled here), best spread score over a W-frame wait.
  const th = [130, 84, 54, 35, 23, 15, 9, 6], pk = th.map(t => Math.min(101, t + 1) / 101);
  const pAtLeast = n => pk.slice(0, n - 2).reduce((a, b) => a * b, 1);
  const out = {};
  for (const n of [5, 6, 7, 8]) {
    const p = pAtLeast(n); out['P' + n + '+_per_frame'] = +p.toFixed(5);
    for (const W of [60, 180, 300]) { let s = 0; const N = 4000;
      for (let i = 0; i < N; i++) { const m = []; for (let f = 0; f < W + 10; f++) m.push((rnd() / 4294967296) < p); s += best(f => !!m[f], 5, W + 4)[0]; }
      out['P' + n + '+_W' + W] = +(s / N).toFixed(3); }
  }
  console.log(JSON.stringify(out, null, 1));
}
module.exports = { ccA, ccB, best, SPREAD };
