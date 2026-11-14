/* v104: a plan's claim no higher than every state still possible supports (README v104). Numbers only in fixtures/e2e_v104.json.
 * 1. The truth trace: one frame's seed is shared by many states (the seed only counts the draws), so v103's "true state in
 *    the kept states" (fb14IsTrue) took aliases for the truth; fb14IsTrueS asks for the true seed on every frame of the next 90.
 * 2. fb14Broad: the claim re-scored on every state with ZW_MAXERR errors or fewer (prior weights, the coin's soft factors left
 *    out); the plan claims the lower; with nothing dropped by the soft weighting it is left alone; NOBROAD logs only.
 * 3. The e2e (fixtures/e2e_v104.json, PLANCHECK: every plan pressed on its own frame in the emulator): before / after.
 * usage: node test_fb14_v104.js */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8');
const window = {}, stub = 'const FRAME = 1000 / 29.97, slog = (e, o) => (globalThis.__slog = globalThis.__slog || []).push([e, o]), $ = id => (globalThis.__el || {})[id] || null, isRoute = () => false, RT = () => [], routeStep = 0, st = {}, V = {}, CHG = {};\n' +
  'const ZW_PMISS = 0.02, ZW_FALSE = 1.8e-4, ZW_RHO = 0.3 / 31.2, ZW_CUT = 1e-4, ZW_MAXERR = 3, ZW_BG0 = 0.05; const num = k => ({ zwedge: 0.4, vlag: 0, off: 0 })[k] || 0;\n';
new Function('window', stub + src)(window);
const F = window.__fb14, X = F.FB14, V4 = F.v104;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const logs = n => (globalThis.__slog || []).filter(x => x[0] === n).map(x => x[1]);
const mk = (s, nc, o) => F.fbNew(Object.assign({ s: s >>> 0, nc, f: 0, c: new Uint8Array(20), ph: [3, 5], l: 0, rg: 0, w: 1, from: 0, sh: [] }, o || {}));
// 1. the truth trace: a state's own run is the trace; a state with the same seed on frame 0 and its coin check elsewhere
{ const A = mk(0x1234567, 7), tr = []; const C = F.fbClone(A); for (let i = 0; i < 200; i++) { tr.push(C.s >>> 0); F.fbStep(C); }
  window.__fb14seeds = { off: 0, s: Uint32Array.from(tr) };
  const B = mk(0x1234567, 31);     // same seed on frame 0, the coin checked on 31 (not 7)
  ok(V4.isTrueS(A) && V4.truthScore(A, 0).r === 1, 'the state the trace came from: true on every frame of the next 90 (score ' + V4.truthScore(A, 0).r + ')');
  const sB = V4.truthScore(B, 0); ok(F.v102.isTrue(B) && !V4.isTrueS(B) && sB.r < 1, 'an alias (same seed on frame 0, the coin checked on 31): v103\'s one-frame check says true, the per-frame check not (score ' + sB.r.toFixed(2) + ', first off on +' + sB.first + ')');
  delete window.__fb14seeds; }
// 2. fb14Broad
{ const turn = 2, PD = [[0, 1]], all = []; for (let k = 0; k < 60; k++) all.push(mk(0x9e3779b9 * (k + 1), 40 + k % 24, { w: 1 / 60, err: 0, lw: 1 }));
  F.reset(); X.states = all; X.on = true;
  const target = 120, sh = F.shareRaw(all, target, target, turn), missAll = sh[0];
  // the kept states: those Bowser misses on the target (a coin that picked them)
  const kept = all.filter(S => F.shareRaw([S], target, target, turn)[0] > 0.5);
  ok(kept.length > 0 && kept.length < all.length, 'synthetic: ' + kept.length + ' of ' + all.length + ' states miss on +' + target + ' (all: ' + missAll.toFixed(3) + ')');
  const C = { target, pp: 1, p: 1, ppStates: 1, pStates: 1 }; V4.broad(C, { list: kept, doubt: 0 }, turn, 0, PD);
  ok(Math.abs(C.pp - missAll) < 1e-9 && C.broad && C.broad.ppKept === 1, 'the narrowed claim 1 falls to the share of every state still possible: ' + C.pp.toFixed(3) + ' (broad ' + JSON.stringify(C.broad) + ')');
  const bl = F.v104.blind ? F.v104.blind(turn) : 0.495, C2 = { target, pp: 1, p: 1 }; V4.broad(C2, { list: kept, doubt: 0.1 }, turn, 0.1, PD);
  ok(Math.abs(C2.pp - (0.9 * missAll + 0.1 * bl)) < 1e-9, 'with the doubt: (1 - d) x broad + d x blind = ' + C2.pp.toFixed(3));
  const C3 = { target, pp: 1, p: 1 }; V4.broad(C3, { list: all, doubt: 0 }, turn, 0, PD); ok(C3.pp === 1 && !C3.broad, 'nothing dropped by the soft weighting: the claim left alone');
  for (const S of all.slice(0, 50)) S.err = 4; const keptE = all.slice(50), C4 = { target, pp: 0.99, p: 0.99 }; V4.broad(C4, { list: keptE, doubt: 0 }, turn, 0, PD);
  ok(C4.pp === 0.99 && !C4.broad, 'states ruled out by errors (over ZW_MAXERR) do not count');
  for (const S of all) S.err = 0; window.__fb14NoBroad = true; const C5 = { target, pp: 1, p: 1 }; V4.broad(C5, { list: kept, doubt: 0 }, turn, 0, PD); delete window.__fb14NoBroad;
  ok(C5.pp === 1 && C5.broad && C5.broad.pp < 1, 'NOBROAD (the e2e\'s before run): logged (' + C5.broad.pp + '), the claim kept');
  const C6 = { target, pp: 0.9, p: 0.9 }; X.states = all.filter(S => !kept.includes(S)).slice(0, 4).concat(kept.slice(0, 1)); V4.broad(C6, { list: kept.slice(0, 1), doubt: 0 }, turn, 0, PD);
  ok(Math.abs(C6.pp - 0.2) < 1e-9 && C6.none === 'broad', 'a claim under the edge after the cap is no plan (' + C6.pp.toFixed(3) + ', none ' + C6.none + ')'); }
// 3. the e2e
{ const p = path.join(__dirname, 'fixtures', 'e2e_v104.json');
  if (!fs.existsSync(p)) ok(false, 'fixtures/e2e_v104.json missing');
  else { const E = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const k of ['before_first_build', 'before', 'after']) { const P = E[k].plans, hi = P.filter(r => r.pp >= 0.95), wrong = hi.filter(r => r.miss === false);
      ok(hi.length === E[k].summary.hi && wrong.length === E[k].summary.hiWrong, k + ': ' + P.length + ' plans, ' + hi.length + ' >= 95%, of them Bowser hit on the frame: ' + wrong.length + ' (' + wrong.map(r => r.run + ' T' + r.turn + ' ' + r.target + ' ' + r.pp).join(', ') + ')'); }
    const A = E.after.plans; ok(A.filter(r => r.pp >= 0.95 && r.miss === false).length === 0, 'after: no plan >= 95% on which Bowser hits');
    ok(A.filter(r => r.pp >= 0.95).every(r => r.broad == null || r.pp <= r.broad + 1e-3), 'after: every claim at most its broad claim');
    ok(E.after.pressed.filter(r => r.pp >= 0.95).every(r => r.miss), 'after: no pressed plan >= 95% failed (' + E.after.pressed.filter(r => r.pp >= 0.95).length + ' pressed)');
    ok(E.truth_check.strict_in_kept_95 <= E.truth_check.loose_in_kept_95, 'the per-frame truth: in ' + E.truth_check.strict_in_kept_95 + ' of the >= 95% plans where v103\'s check said ' + E.truth_check.loose_in_kept_95); } }
const tpl = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8'); ok(/VERSION = 'v10[4-9]'/.test(tpl), 'page VERSION v104+');
console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
