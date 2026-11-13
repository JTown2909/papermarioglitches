/* v102: after a hit, the e2e's truth trace showed the fresh locks with no true state (README v101 "Not done"). Root cause: the
 * trace (fb14IsTrue) kept T1's clock offset while a fresh lock after a hit restarts the page's clock on its own turn's Mario
 * confirm (fb14Lock M 0): every state was checked against the seed ~1000 frames away. v102: the harness gives each turn's
 * confirm (fb14_e2e.py zeros) and the page's trace follows the lock's clock (fb14TruthZero). And a fresh lock's claim stays under
 * 95% until a coin shine after its rays is seen (FB14_FRESH_D, fb14FreshOpen). Numbers only in fixtures/e2e_v102.json.
 * usage: node test_fb14_v102.js */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8');
const window = {}, stub = 'const FRAME = 1000 / 29.97, slog = (e, o) => (globalThis.__slog = globalThis.__slog || []).push([e, o]), $ = id => (globalThis.__dom || {})[id] || null, isRoute = () => false, RT = () => [], routeStep = 0, st = {}, V = {}, CHG = {};\n' +
  'const leverBias = k => (globalThis.__lb || {})[k] || 0, leverAdd = (k, e) => { (globalThis.__la = globalThis.__la || []).push([k, e]); return [e]; }, leverList = k => [], cancelBeeps = () => { globalThis.__cancels = (globalThis.__cancels || 0) + 1; };\n' +
  'const ZW_PMISS = 0.02, ZW_FALSE = 1.8e-4, ZW_RHO = 0.3 / 31.2, ZW_CUT = 1e-4, ZW_MAXERR = 3, ZW_BG0 = 0.05; const num = k => ({ zwedge: 0.4, vlag: 0, off: 0 })[k] || 0;\n';
new Function('window', stub + src)(window);
const F = window.__fb14, X = F.FB14, K = F.v102;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const logs = n => (globalThis.__slog || []).filter(x => x[0] === n).map(x => x[1]);
// 1. the truth trace follows a fresh lock's clock (diagnostic, tests only)
{ const s = new Uint32Array(3000); for (let i = 0; i < s.length; i++) s[i] = (i * 2654435761) >>> 0;
  window.__fb14seeds = { off: -97, s, zt: [[1000, 97], [40000, 1150], [80000, 1812]] };
  const S = { s: s[1150 + 300 + 1], f: 300, l: 1 };
  ok(!K.isTrue(S), 'T1\'s offset (v101): a post-hit state at clock frame 300 is checked ~1050 frames away: not true');
  K.truthZero(40066); ok(window.__fb14seeds.off === -1150 && K.isTrue(S), 'a fresh lock whose frame 0 shows at 40066 ms takes the zero at 40000 ms (T2\'s confirm, step 1150): the same state is true');
  K.truthZero(20000); ok(window.__fb14seeds.off === -1150 && logs('fb14TruthZero').length === 1, 'no turn confirm within 3 s: the offset is kept');
  K.truthZero(1100); ok(window.__fb14seeds.off === -97, 'a new T1 lock takes T1\'s confirm again');
  delete window.__fb14seeds; }
// 2. the fresh lock's floor
{ F.reset(); X.on = true; X.rate = 1000 / 29.97; X.t0 = performance.now() - 100000 * X.rate; X.lastT = performance.now(); X.taps = [];
  X.fresh = { turn: 2, F: 61 };
  ok(Math.abs(F.doubtFloor(2, 0.01) - K.FRESH_D) < 1e-12 && F.doubtFloor(2, 0.3) === 0.3, 'an unconfirmed fresh lock: the doubt at least ' + K.FRESH_D + ' (0.01 -> 0.1; 0.3 kept)');
  for (const [turn, b] of [[1, 0.495], [2, 0.495], [4, 0.39]]) { const pp = (1 - K.FRESH_D) * 1 + K.FRESH_D * b; ok(pp < 0.95, 'T' + turn + ': a fresh lock whose states all agree claims at most ' + pp.toFixed(4) + ' (< 0.95) until the coin confirms it'); }
  ok(F.doubtFloor(3, 0.01) === F.T3.FLOOR, 'T3 keeps its own floor (' + F.T3.FLOOR + ')');
  X.taps = [X.t0 + (40 + 4.8) * X.rate]; ok(F.doubtFloor(2, 0.01) === K.FRESH_D && X.fresh, 'a shine before the rays\' frame + 61 (the menu\'s, already used to pick the fits) does not confirm');
  X.taps.push(X.t0 + (140 + 4.8) * X.rate); ok(F.doubtFloor(2, 0.01) === 0.01 && X.fresh === null && logs('fb14FreshConfirmed').length === 1, 'a shine after the rays (frame 140) the states survived: the floor is lifted, logged');
  X.fresh = null; ok(F.doubtFloor(2, 0.002) === 0.002, 'a carried lock: no floor');
  F.reset(); ok(X.fresh === null, 'a new attempt clears it'); }
// 3. the page and the harness
{ const src = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8'), e2e = fs.readFileSync(path.join(__dirname, 'fb2_route', 'fb14_e2e.py'), 'utf8'), pg = fs.readFileSync(path.join(__dirname, 'test_fb14_page.js'), 'utf8');
  ok(/FB14\.fresh = how === 'fresh'/.test(src) && /P\.freshCap && !FB14\.fresh/.test(src), 'fb14Lock marks a fresh lock; the tick makes a capped plan again once the coin lifts the cap');
  ok(/zeros=zeros/.test(e2e) && /find_hit_skip/.test(e2e) && /__fb14seeds\.zt/.test(pg), 'the harness: each turn\'s confirm for the trace (zeros, zt), FORCE_HIT on T1\'s skip');
  const tpl = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8'); ok(/VERSION = 'v102'/.test(tpl), 'page VERSION v102'); }
// 4. the e2e (fixtures/e2e_v102.json): every plan of every page run, its lock, the truth in its states, its claim
{ const E = path.join(__dirname, 'fixtures', 'e2e_v102.json');
  if (fs.existsSync(E)) { const R = JSON.parse(fs.readFileSync(E, 'utf8')), P = R.plans;
    const hi = P.filter(p => p.pp >= 0.95);
    ok(hi.every(p => p.n > 0), 'e2e: every plan claiming >= 95% had true states among its states (' + hi.length + ' such plans of ' + P.length + ')');
    const ph = P.filter(p => p.posthit && p.how === 'fresh');
    ok(ph.length >= 3 && ph.every(p => p.n > 0), 'e2e: post-hit fresh-lock plans with the truth in their states: ' + ph.filter(p => p.n > 0).length + ' / ' + ph.length);
    const sc = P.filter(p => p.true_share != null), m = sc.reduce((a, p) => a + p.pp, 0) / Math.max(1, sc.length), a = sc.reduce((a, p) => a + p.true_share, 0) / Math.max(1, sc.length);
    ok(sc.length >= 5 && a >= m - 0.1, 'e2e calibration: mean claim ' + m.toFixed(3) + ', mean true-state share on the planned frame ' + a.toFixed(3) + ' (' + sc.length + ' plans)');
    const out = R.turns.filter(t => t.planned && t.pp >= 0.95 && !t.miss); ok(out.length === 0, 'e2e: no pressed plan of 95% or more failed (' + R.turns.filter(t => t.planned && t.pp >= 0.95).length + ' pressed)');
  } else ok(false, 'fixtures/e2e_v102.json missing'); }
console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
