/* v103: the stage lightning on Final Bowser (README v103). Numbers only in fixtures/bolt_v103.json (no picture).
 * 1. What decides a bolt: the stage's two loops (waits 5 / 30 / 5 / 90 and 60 / 10 / 90 / 60) are fbBolts' slots; no random
 *    number decides when or where (the one rand_int(359) is the zigzag); the emulator renders fit one phase pair for 1581 steps.
 * 2. The delay is not pinned: the reader's onsets in the e2e come 3-15 shots after the draw and the page clock sits -1.9..+0.3
 *    frames off the game, against the lag split (1 frame) the T1 plans need: FB14_BOLT_D stays null (logged only).
 * 3. The soft factor (fb14BoltLik) for when it is pinned: 1 on a draw, never under the floor per onset; the old hard cut unused.
 * 4. T1 in skip mode reads bolts from Cloud Nine's confirm to P + 120 (the battle camera); bar mode and later as before.
 * 5. The e2e (fixtures/e2e_v103.json): T1-T4 on three seeds, no >= 95% plan without the truth, no pressed >= 95% plan failed.
 * usage: node test_fb14_v103.js */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8');
const window = {}, stub = 'const FRAME = 1000 / 29.97, slog = (e, o) => (globalThis.__slog = globalThis.__slog || []).push([e, o]), $ = id => (globalThis.__el || {})[id] || null, isRoute = () => false, RT = () => [], routeStep = 0, st = {}, V = {}, CHG = {};\n' +
  'const ZW_PMISS = 0.02, ZW_FALSE = 1.8e-4, ZW_RHO = 0.3 / 31.2, ZW_CUT = 1e-4, ZW_MAXERR = 3, ZW_BG0 = 0.05; const num = k => ({ zwedge: 0.4, vlag: 0, off: 0 })[k] || 0;\n';
new Function('window', stub + src)(window);
const F = window.__fb14, X = F.FB14, V3 = F.v103, V = F.v100, FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'bolt_v103.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const logs = n => (globalThis.__slog || []).filter(x => x[0] === n).map(x => x[1]);
// 1. the schedule
{ for (const L of FIX.schedule.loops) { let o = 0; const offs = L.waits.map(w => { const a = o; o += w; return a; });
    ok(o === L.period && L.slots.every((s, i) => s - L.slots[0] === offs[i]), 'loop ' + L.period + ' (' + L.script + '): waits ' + L.waits.join(' / ') + ' = slots ' + L.slots.join(', ') + ' (offsets ' + offs.join(', ') + ')'); }
  const mk = (f, p1, p2) => FIX.schedule.loops[0].slots.includes((f + p1) % 130) + FIX.schedule.loops[1].slots.includes((f + p2) % 220);
  let n = 0, same = true; for (let f = 0; f < 2860; f++) n += mk(f, 7, 11);
  ok(n === 2860 / 130 * 4 + 2860 / 220 * 4, 'per 2860 frames ' + n + ' bolts (4 a loop each)');
  const E = FIX.emulator_renders; ok(E.phase_fits.length === 1 && E.same_draw_frames_both_seeds, 'emulator: ' + E.draws + ' bolt draws over ' + E.steps + ' steps (menus, Cloud Nine, Bowser\'s turn, T2) fit one phase pair ' + JSON.stringify(E.phase_fits[0]) + ', the same frames on both seeds: no random number moves a bolt');
  ok(/zigzag/.test(FIX.schedule.rng), 'its rand_int(359): ' + FIX.schedule.rng); }
// 2. not pinned
{ const R = FIX.emulator_renders.reader_port_onsets_clean, O = FIX.e2e_page_onsets.rows, D = O.map(r => r.D_pic), pd = O.map(r => r.pageD), ck = FIX.e2e_page_onsets.page_clock_minus_true_frame;
  ok(R.shots_after_draw.every(x => x === 3), 'raw renders: ' + R.n + ' clean onsets of the reader 3 shots after the draw');
  const sp = Math.max(...D) - Math.min(...D), cs = Math.max(...ck) - Math.min(...ck);
  ok(sp > 2 && cs > 1, 'through the capture and the page: D_pic ' + D.join(', ') + ' (spread ' + sp + '), page D ' + pd.join(', ') + ', page clock ' + ck.join(' / ') + ' off the game: not pinned to the 1 frame the T1 lag split needs');
  ok(V.boltD() === null, 'FB14_BOLT_D null: the bolts stay logged only');
  const T = FIX.t1_truth_split; ok(T['v102 9e3779b9'].lag0[2] === 1 && T['v102 9e3779b9'].lag1[2] === 0, 'the T1 claim is split by the lag after the rays (true states lag 0 ' + T['v102 9e3779b9'].lag0[2] + ' / lag 1 ' + T['v102 9e3779b9'].lag1[2] + ' on the planned frame), not by the bolt phases'); }
// 3. the soft factor
{ const S = F.fbNew({ s: 1, nc: 0, f: 0, c: new Uint8Array(20), ph: [0, 0], l: 0, w: 1, from: 0 }), S1 = F.fbNew({ s: 1, nc: 0, f: 0, c: new Uint8Array(20), ph: [0, 0], l: 1, w: 1, from: 0 });
  const dr = []; for (let f = 10; f < 600; f++) if ([78, 83, 113, 118].includes(f % 130) || [18, 78, 88, 178].includes(f % 220)) dr.push(f);
  const c = { fire: 0, cls: 0, bolt: 0 }, on = [dr[0], dr[3], dr[6]];
  const a = V3.boltLik(S, 900, on, c), b = V3.boltLik(S1, 900, on, c), q = V3.boltLik(S, 900, [on[0] + 0.5], c);
  ok(Math.abs(a - 1) < 1e-9, 'onsets on the state\'s draws: factor 1');
  ok(b < 0.06 && b >= Math.pow(V3.FLOOR, 3) - 1e-12, 'the same phases with lag 1 (every onset 1 frame off): ' + b.toExponential(2) + ' (never under floor^3)');
  ok(q > 0.5 && q < 0.6, 'one onset half a frame off: ' + q.toFixed(3));
  const far = V3.boltLik(S, 900, [dr[0] + 40.5], c); ok(far >= V3.FLOOR - 1e-12, 'an onset far from any draw keeps the floor ' + V3.FLOOR + ' (a picture that was not a bolt cannot cut a state)'); }
// 4. T1 in skip mode reads on through Cloud Nine's battle camera
{ const sky = bolt => { const n = V.BOLT.gw * V.BOLT.gh, g = new Uint8ClampedArray(n * 4); for (let j = 0; j < n; j++) { const x = j % V.BOLT.gw; g.set(bolt && Math.abs(x - bolt) < 1 ? [190, 110, 250, 255] : [35, 25, 70, 255], j * 4); } return g; };
  const run = (mode, startT) => { globalThis.__el = { 's-fbc9': { value: mode } }; globalThis.__slog = []; Object.assign(X, { atk: {}, atkW: {}, pT: { 1: 1000 }, lastBurst: null, boltW: null, bolts: [], t0: 0, rate: 33.367 });
    let t = startT; for (const [n, b] of [[20, 0], [8, 30], [20, 0]]) for (let i = 0; i < n; i++) { window.__fbVisTest = () => sky(b); V.boltFrame(t += 33.367, true); } return logs('fb14Bolt').length; };
  ok(run('skip', 1100) === 1 && X.bolts.length === 1, 'skip mode, P + ~3 .. + 50: an onset read (and kept for the evidence: ' + V3.BOLT.ev + '+ points)');
  ok(run('bar', 1100) === 0, '"Confirm Cloud Nine on the beep": busy as before (v100)');
  ok(run('skip', 1000 + 33.367 * (V3.BOLT.c9 + 5)) === 0, 'past P + ' + V3.BOLT.c9 + ' (Cloud Nine\'s camera): busy');
  globalThis.__el = {}; }
// 5. the e2e
{ const p = path.join(__dirname, 'fixtures', 'e2e_v103.json');
  if (!fs.existsSync(p)) ok(false, 'fixtures/e2e_v103.json missing');
  else { const E = JSON.parse(fs.readFileSync(p, 'utf8')), P = E.plans;
    const bad = P.filter(r => r.pp >= 0.95 && !r.truth), key = r => r.run + ' T' + r.turn + ' ' + r.target;
    ok(bad.length === E.no_truth_95.length && bad.every(r => E.no_truth_95.includes(key(r))), 'e2e v103: ' + P.length + ' plans, ' + P.filter(r => r.pp >= 0.95).length + ' >= 95%; without the truth in its kept states: ' + bad.map(key).join(', ') + ' (re-plans after a passed frame; a known v102 behaviour, not the bolts: README v103 Not done)');
    ok(E.pressed.filter(r => r.pp >= 0.95).every(r => r.miss), 'no pressed plan >= 95% failed (' + E.pressed.filter(r => r.pp >= 0.95).length + ' pressed)');
    const t1 = P.filter(r => r.turn === 1); ok(t1.every(r => r.pp < 0.95), 'T1 fresh locks stay under the cap: ' + t1.map(r => r.pp).join(', ')); } }
const tpl = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8'); ok(/VERSION = 'v103'/.test(tpl), 'page VERSION v103');
console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
