/* v101: Final Bowser T1's lever is the A that skips Cloud Nine's message (README v101). Numbers only in
 * fixtures/cn_skip_v101.json (the emulator scan, fb2_route/cn_skip.py) and fixtures/e2e_v101.json (the end-to-end runs).
 * 1. The emulator: one A on Cloud Nine's confirm + k moves Bowser's AI to + k + 17 for k in 255 .. 314, else + 332, and the
 *    dodge test's value changes frame to frame (a lever with edges).
 * 2. The model (fb14_live.js fbSkipEv, fb14Share 'skip'): the same window and frame, the share flat outside it.
 * 3. The lever ids: the skip's own press store and correction; the setting "Confirm Cloud Nine on the beep" restores v100.
 * 4. The message box from the picture (fb14BoxShare / fb14BoxFrame): onset -> P, gone -> the skip, the skip into the states.
 * 5. The page: the setting, the store, the skip plan kept when the step's screen is gone; the e2e: no >= 95% plan failed.
 * usage: node test_fb14_v101.js */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8');
const window = {}, stub = 'const FRAME = 1000 / 29.97, slog = (e, o) => (globalThis.__slog = globalThis.__slog || []).push([e, o]), $ = id => (globalThis.__dom || {})[id] || null, isRoute = () => false, RT = () => [], routeStep = 0, st = {}, V = {}, CHG = {};\n' +
  'const leverBias = k => (globalThis.__lb || {})[k] || 0, leverAdd = (k, e) => { (globalThis.__la = globalThis.__la || []).push([k, e]); return [e]; }, leverList = k => [], cancelBeeps = () => { globalThis.__cancels = (globalThis.__cancels || 0) + 1; };\n' +
  'const ZW_PMISS = 0.02, ZW_FALSE = 1.8e-4, ZW_RHO = 0.3 / 31.2, ZW_CUT = 1e-4, ZW_MAXERR = 3, ZW_BG0 = 0.05; const num = k => ({ zwedge: 0.4, vlag: 0, off: 0 })[k] || 0;\n';
new Function('window', stub + src)(window);
const F = window.__fb14, X = F.FB14, K = F.v101, FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'cn_skip_v101.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const logs = n => (globalThis.__slog || []).filter(x => x[0] === n).map(x => x[1]);
// 1. the emulator scan
for (const [seed, rows] of Object.entries(FIX.runs)) {
  const inW = rows.filter(r => r[0] >= K.SKIP.lo && r[0] <= K.SKIP.hi), out = rows.filter(r => r[0] < K.SKIP.lo || r[0] > K.SKIP.hi);
  ok(inW.length === 60 && inW.every(r => r[1] === r[0] + K.SKIP.ai), seed + ': skip on + 255 .. + 314 (60 frames): Bowser\'s AI on the skip + 17, every one');
  ok(out.length >= 5 && out.every(r => r[1] === K.SKIP.nat), seed + ': no skip, + 252 .. + 254 and + 315 .. + 319: the AI on + 332 (the message closes itself)');
  const nat = out[0], miss = inW.filter(r => r[3] < 50).length, vals = new Set(inW.map(r => r[3]));
  ok(vals.size >= 35 && miss >= 15 && miss <= 45, seed + ': the dodge test moves with the skip: ' + vals.size + ' values, misses on ' + miss + ' / 60 frames (no skip: ' + nat[2] + ' ' + nat[3] + ')');
  let edges = 0; for (let i = 1; i < inW.length; i++) if ((inW[i][3] < 50) !== (inW[i - 1][3] < 50)) edges++;
  ok(edges >= 10, seed + ': miss / hit edges inside the window: ' + edges);
}
ok(/255->272, 314->331, 315/.test(FIX.invariance['9e3779b9 W=60']) && /same/.test(FIX.invariance['9e3779b9 W=30 no three-chances A']), 'the window is the confirm\'s: the same with Cloud Nine 30 frames later and without the three-chances presses');
// 2. the model
const mk = (P, s) => { const S = F.fbNew({ s, nc: P + 400, f: P - 5, c: new Uint8Array(20), ph: [0, 0], l: 0, w: 1, from: P - 5, sh: [] }); return S; };
{ const P = 1000;
  // through fbInputEv: Cloud Nine, then the skip
  const T = mk(P, 777); X.on = true; X.states = [T]; F.input('cn', P, 1, null); K.skipEv(T, P + 280, 1);
  ok(T.p1 === P && T.ev.find(e => e.k === 'ai').f === P + 297, 'the model: Cloud Nine on P, the skip on P + 280: the AI event moves to P + 297');
  const T2 = mk(P, 777); X.states = [T2]; F.input('cn', P, 1, null); K.skipEv(T2, P + 254, 1); K.skipEv(T2, P + 315, 1);
  ok(T2.ev.find(e => e.k === 'ai').f === P + 332, 'a skip before the box (+ 254) or after it closed (+ 315): the AI stays on P + 332');
  F.fbRun(T, P + 420); ok(T.out[1] && T.out[1].ai === P + 297 && T.out[1].v != null, 'the state runs the moved AI and its dodge test (' + T.out[1].atk + ' ' + T.out[1].v + ')');
}
{ // the share: from carried states in the skip phase
  const P = 2000; let r = 7; const rnd = () => (r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296, L = [];
  Object.assign(X, { on: true, t0: 0, rate: 33.367, taps: [], vis: [], visFrom: null, bg: 0, bgFrom: 0, inputs: [], gone: false, hit: null, wide: false, bolts: [], atk: {}, pT: { 1: 1 }, P: { 1: P }, M: { 1: P - 300 }, sk: null, box: null, skTestNow: 1 });
  for (let i = 0; i < 120; i++) L.push(mk(P, (rnd() * 4294967296) >>> 0));
  X.states = L; F.input('cn', P, 1, null);
  ok(K.skipPhase() && K.leverId() === 'fb14sk', 'Cloud Nine in, no skip read: the skip phase, lever fb14sk');
  const a = P + 248, b = P + 322, sh = F.shareRaw(X.states, a, b, 1), at = f => sh[f - a];
  const inside = []; for (let f = P + 256; f <= P + 313; f++) inside.push(+at(f).toFixed(3));
  const lo = at(P + 250), hi = at(P + 320);
  ok(Math.abs(lo - hi) < 1e-9 && Math.abs(at(P + 252) - lo) < 1e-9, 'outside the message the share is the no-skip share (' + lo.toFixed(3) + ' on + 250, + 252 and + 320)');
  ok(new Set(inside).size > 20 && Math.max(...inside) - Math.min(...inside) > 0.08, 'inside, the share moves frame by frame (120 unrelated states: near 0.5): ' + Math.min(...inside) + ' .. ' + Math.max(...inside));
  // the share against each state's own outcome with the skip applied (one frame, no averaging): the model and the share agree
  const f0 = P + 290; let n = 0; for (const S of X.states) { const T = F.fbClone(S); K.skipEv(T, f0, 1); F.fbRun(T, P + 420); if (T.out[1] && T.out[1].ok) n++; }
  const raw = F.shareRaw(X.states, f0 - 1, f0 + 1, 1), avg = 0.2 * raw[0] + 0.6 * raw[1] + 0.2 * raw[2];
  ok(Math.abs(raw[1] - (0.2 * share1(f0 - 1) + 0.6 * share1(f0) + 0.2 * share1(f0 + 1))) < 1e-9, 'the plan\'s share on + 290 is the mean over the reading\'s -1 .. +1 (' + raw[1].toFixed(3) + ')');
  function share1(f) { let m = 0; for (const S of X.states) { const T = F.fbClone(S); K.skipEv(T, f, 1); F.fbRun(T, P + 420); if (T.out[1] && T.out[1].ok) m++; } return m / X.states.length; }
  ok(Math.abs(share1(f0) - n / X.states.length) < 1e-12, 'each state\'s own skipped outcome gives the same share (' + (n / X.states.length).toFixed(3) + ')');
  // 3. the levers
  globalThis.__lb = { fb14: -0.5, fb14sk: 0.8 };
  ok(Math.abs((K.pressT(P + 290, 'fb14sk') - K.pressT(P + 290, 'fb14')) - 1.3 * 33.367) < 1e-6, 'the skip beeps use the skip\'s own correction (+0.8 against the Do Nothing lever\'s -0.5)');
  ok(Math.abs(F.pressT(P + 290) - K.pressT(P + 290, 'fb14sk')) < 1e-9, 'in the skip phase the page\'s beep time is the skip\'s');
  globalThis.__dom = { 's-fbc9': { value: 'bar' } };
  ok(!K.skipMode() && !K.skipPhase() && K.leverId() === 'fb14', 'Settings "Confirm Cloud Nine on the beep": no skip phase, the v100 lever (fb14)');
  globalThis.__dom = {};
  // 4. the box from the picture: onset and gone, then the skip into the states
  const grid = (frac, tint) => { const g = new Uint8ClampedArray(K.BOX.gw * K.BOX.gh * 4); for (let j = 0; j < K.BOX.gw * K.BOX.gh; j++) { const box = j < frac * K.BOX.gw * K.BOX.gh; const c = box ? (tint || [200, 191, 164]) : [28, 22, 50]; g.set([...c, 255], j * 4); } return g; };
  ok(K.boxShare(grid(1)) === 1 && K.boxShare(grid(0)) === 0 && K.boxShare(grid(1, [149, 141, 121])) === 1 && K.boxShare(grid(1, [115, 108, 98])) === 0, 'the box cells: beige 200,191,164 and with 30% text in a cell are box; half text or the dark sky are not');
  // the pictures on the page's clock: the box is up from the picture that reads P + 255 to the last before the one that reads the skip
  const kS = 281, onPic = P + K.SKIP.lo + K.VAN.Kon - F.FB14_READX.K, offPic = P + kS + F.van('K');
  X.lastT = 1e9;
  for (let q = P + 230; q <= P + 300; q++) { const pic = q + 0.3, up = pic >= onPic && pic < offPic; window.__fbVisTest = () => grid(up ? 1 : 0); const t = pic * X.rate; X.lastT = t; K.boxFrame(t); }
  const on = logs('fb14BoxOn').pop(), cf = logs('fb14Confirm').filter(x => x.lever === 'skip').pop();
  ok(on && Math.abs(on.P - P) <= 1, 'the onset read gives P again, to a frame (' + (on && on.P) + ': the box\'s first picture is P + 255)');
  ok(cf && cf.k === kS && Math.abs(cf.c - (P + kS)) <= 1, 'the box\'s first picture gone reads the skip (+ ' + (cf && cf.k) + ', true + ' + kS + ')');
  ok(X.states.every(S => { const e = S.ev.find(x => x.k === 'ai' && x.turn === 1); return !e || e.f !== P + 332; }), 'every carried state took the skip (no AI left on + 332)');
  delete window.__fbVisTest;
}
// 5. the page
{ const pg = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8');
  ok(/<select id="s-fbc9"><option value="skip">[^<]*default/.test(pg) && /'fbhp', 'fbc9'\]/.test(pg), 'Settings: "Final Bowser T1: Confirm Cloud Nine on the beep", default the skip, kept with the settings');
  ok(/fb14sk: 'tot-fb14skip-v101'/.test(pg) && /LEVER_LEARN = \{ fb14: true, fb14sk: true \}/.test(pg), 'the skip\'s presses in their own store (tot-fb14skip-v101), learned like the Do Nothing lever');
  ok(/if \(!P \|\| P\.sk \|\|/.test(pg), 'a skip plan is not cancelled when the step\'s screen is gone (its screen is the message)');
  ok(/'T1: Charge; Cloud Nine'/.test(pg), 'the T1 turn text is unchanged');
  ok(/const VERSION = 'v1(0[1-9]|[1-9]\d)'/.test(pg), 'page version v101 or later'); }
{ const E = path.join(__dirname, 'fixtures', 'e2e_v101.json');
  if (fs.existsSync(E)) { const R = JSON.parse(fs.readFileSync(E, 'utf8')); const all = [].concat(...R.runs.map(r => r.turns));
    const bad = all.filter(t => t.pp != null && t.pp >= 0.95 && !t.miss);
    ok(bad.length === 0, 'e2e: no plan of 95% or more failed (' + all.filter(t => t.pp >= 0.95).length + ' such plans, ' + all.length + ' turns)');
    const t1 = R.runs.map(r => r.turns.find(t => t.turn === 1)).filter(Boolean);
    ok(t1.length >= 3 && t1.every(t => t.lever === 'skip' && (t.k == null || (t.k >= 255 && t.k <= 314))), 'e2e: T1 on the skip lever on ' + t1.length + ' seeds, every skip inside the message window');
  } else ok(false, 'fixtures/e2e_v101.json missing'); }
console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
