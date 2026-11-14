/* v98: the console attempts c6469b35 (page v96, clip 17-33-59) and 7483f3b1 (page v97, clip 17-47-17), numbers only in
 * fixtures/console_v98.json.
 * 1. T4's moving beep: plans at 0.81-0.93 stopped 1-2 s later at doubt 0.002-0.04 (c6469b35 once, 7483f3b1 eight times in
 *    16 s, no beep ever played). The plan and the tick scored the planned frame on a 150-state sample re-drawn by list
 *    position: the tick read another sample. fb14Sample is now weighted, nested and stable; the tick re-scores the plan's own
 *    sample (fb14Resample).
 * 2. T3: a 100% claim (7483f3b1: 1434, window 4, doubt 0, Bowser hit) is impossible (FB14_T3_FLOOR), and a carry the coin
 *    drops or contradicts on T3 is re-locked on the stream from T2's lock (fb14Relock3) before it is given up.
 * With PAGE (a built standalone page) and the console log at LOG98, 7483f3b1's T4 capture is replayed and the planned
 * frame's share read on the plan's sample before and after the coin cuts states.
 * usage: node test_console_v98.js   [PAGE=... LOG98=...] */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8');
const window = {}, stub = 'const FRAME = 1000 / 29.97, slog = (e, o) => (globalThis.__slog = globalThis.__slog || []).push([e, o]), $ = () => null, isRoute = () => false, RT = () => [], routeStep = 0, st = {}, V = {}, CHG = {};\n' +
  'const ZW_PMISS = 0.02, ZW_FALSE = 1.8e-4, ZW_RHO = 0.3 / 31.2, ZW_CUT = 1e-4, ZW_MAXERR = 3, ZW_BG0 = 0.05; const num = k => ({ zwedge: 0.4, vlag: 0, off: 0 })[k] || 0;\n';
new Function('window', stub + src)(window);
const F = window.__fb14, X = F.FB14, FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v98.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
// --- the logs (numbers) ---
const E = k => FIX[k].events, ev = (k, n) => E(k).filter(e => e.ev === n);
{ const p4 = ev('7483f3b1', 'fb14Plan').filter(e => e.turn === 4), st4 = ev('7483f3b1', 'beepsStopped');
  ok(p4.length === 8 && st4.length === 3 && p4.map(e => e.target).join(',') === '212,318,385,394,466,537,616,687', '7483f3b1 T4: 8 plans 212 .. 687 in 16 s, 3 stopped by the tick at doubt <= 0.04, the rest replaced: ' + st4.map(e => e.p + '@' + e.doubt).join(' '));
  const c = ev('c6469b35', 'beepsStopped')[0], p = ev('c6469b35', 'fb14Plan').filter(e => e.turn === 4);
  ok(c && c.from === 207 && c.doubt <= 0.003 && p[0].pp > 0.8 && p[1].target === 273, 'c6469b35 T4: 207 (pp ' + p[0].pp + ') stopped at ' + c.p + ', doubt ' + c.doubt + '; then 273');
  const t3 = ev('7483f3b1', 'fb14Plan').find(e => e.turn === 3), h3 = ev('7483f3b1', 'fb14Hit').find(e => e.turn === 3), cf = ev('7483f3b1', 'fb14Confirm').find(e => e.turn === 3);
  ok(t3.pp > 0.9999 && t3.doubt === 0 && cf.F >= t3.w.start && cf.F <= t3.w.end && h3, '7483f3b1 T3: planned ' + t3.target + ' pp ' + t3.pp + ' doubt 0, confirmed ' + cf.F + ' inside ' + t3.w.start + '-' + t3.w.end + ', Bowser hit');
  const a3 = ev('c6469b35', 'fb14AllOut')[0]; ok(a3 && a3.taps.includes(1072) && a3.taps.includes(1120.8), 'c6469b35 T3: every carried state out after the Jelly (shines ' + a3.taps.slice(-3).join(', ') + ' against the states\' 1019 / 1091 / 1139)'); }
// --- 1. the sample ---
{ let r = 7; const rnd = () => (r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296;
  const L = []; for (let i = 0; i < 6000; i++) L.push(F.fbNew({ s: (rnd() * 4294967296) >>> 0, nc: 100 + i % 48, f: 100, c: new Uint8Array(20), ph: [i % 130, i % 220], l: i & 1, w: i < 20 ? 0.01 : rnd() * 1e-4, from: 100 }));
  const A = F.stSample(L, 300), B = F.stSample(L.slice(0, 5600), 300), base = x => x.base || x;
  const setA = new Set(A.map(base)), inB = B.filter(x => setA.has(base(x))).length;
  ok(A.length > 200 && A.length < 400, 'weighted sample of 6000: ' + A.length + ' states');
  ok(L.slice(0, 20).every(S => setA.has(S)), 'the 20 heavy states are always in it');
  ok(inB >= 0.9 * B.length, 'nested: 400 light states cut, ' + inB + ' of ' + B.length + ' still the plan\'s (v97: k changes, the sample is swapped)');
  const tot = L.reduce((a, S) => a + S.w, 0), est = A.reduce((a, S) => a + S.w, 0); ok(Math.abs(est / tot - 1) < 0.1, 'Horvitz-Thompson weights sum to ' + (est / tot).toFixed(3) + ' of the total');
  const R = F.resample(A, L.slice(0, 5600)); ok(R && R.length === A.filter(x => L.indexOf(base(x)) < 5600).length, 'the tick re-scores the plan\'s sample minus the states cut (' + R.length + ')'); }
// --- 2. T3 ---
{ X.relock = null; ok(F.doubtFloor(3, 0) === F.T3.FLOOR && F.doubtFloor(2, 0) === 0 && F.doubtFloor(4, 0.01) === 0.01, 'T3 doubt floor ' + F.T3.FLOOR + ' (T2 / T4 untouched)');
  const pp = (1 - F.T3.FLOOR) * 1 + F.T3.FLOOR * 0.495; ok(pp < 0.83, 'T3 best claim ' + pp.toFixed(3) + ' (7483f3b1 had 1.000)');
  // the re-lock: a truth state on T2's lock, its Do Nothing confirm and Jelly; the coin's shines come 5.5 frames after the
  // frames the truth gives (outside -2 .. +4.5, inside the wide window): the carry dies, the re-lock keeps the truth
  const R = 33.367; Object.assign(X, { on: true, t0: 0, rate: R, taps: [], vis: [], visFrom: null, bg: 0.05, bgFrom: 0, inputs: [], gone: false, allOutLogged: false, relockTried: false, wide: false, missed: null });
  const T = F.fbNew({ s: 0x12e2a085, nc: 900, f: 900, c: Uint8Array.from('01121001100021002022', Number), ph: [22, 42], l: 0, w: 1, from: 900 });
  const alt = [T]; for (let i = 1; i < 40; i++) alt.push(F.fbNew({ s: (0x12e2a085 + i * 7919) >>> 0, nc: 900 + i % 24, f: 900, c: T.c.slice(), ph: [22, 42], l: 0, w: 1, from: 900 }));
  X.snap2 = { states: alt.map(F.fbClone), M: 811 };
  const P2 = 980, J = 1170; X.inputs = [{ kind: 'nothing', F: P2, turn: 2, t: (P2 + 2) * R, off: 2 }, { kind: 'jelly', F: J, turn: 3, t: (J + 2) * R, off: 2 }];
  const G = F.fbClone(T); G.ev.push({ k: 'ai', f: P2 + 13, turn: 2 }, { k: 'jelly', f: J + F.FB14_JELLY }); G.ev.sort((a, b) => a.f - b.f); const G1 = F.fbRun(F.fbClone(G), 1490); F.fbRun(G, 1500);
  const sh = G.sh.filter(f => f > 930); X.taps = sh.map(f => (f + 5.5 + 4.8) * R); X.vis = [[900 * R, 1500 * R]]; X.states = [];
  const okR = F.relock3(1490); const tr = X.states.filter(S => S.s === G1.s && S.f === G1.f).length;
  ok(okR && X.relock === 3 && X.wide && tr > 0, 'T3 re-lock on the stream from T2\'s lock: ' + X.states.length + ' states, the truth among them (' + sh.length + ' shines 5.5 frames late)');
  ok(F.doubtFloor(3, 0) === F.T3.RELOCK, 'a re-locked T3 plans under ' + F.T3.RELOCK);
  ok(F.relock3(1490) === false, 'once per T2 lock'); }
// --- the T4 replay (with the page and the log) ---
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v107/timeout_timer_standalone.html', LOG = process.env.LOG98 || '/tmp/claude-0/pm/logs1112/7483f3b1-pm-rng-log-1794523788029.json';
(async () => {
  if (!PAGE || !fs.existsSync(PAGE) || !fs.existsSync(LOG)) { console.log('(the T4 replay skipped: PAGE / LOG98 not here)'); }
  else {
    const { chromium } = require('playwright'), Lg = JSON.parse(fs.readFileSync(LOG, 'utf8')), cap = Lg.chargeCaptures[2];
    const b = await chromium.launch(), p = await b.newPage();
    await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', off: '-5', vlag: '50' })); } catch (e) {} });
    await p.goto('file://' + PAGE);
    const r = await p.evaluate(async ({ cap, T0 }) => {
      const T = window.__tot, X = window.__fb14; X.reset(); T.setStep(T.RT().findIndex(s => s.fb14 === 4 && s.fb14role === 'lever'));
      X.FB14.stream = { seed: 0xe3902a23, t: performance.now() - 30000, how: 'carried', n: 3 };
      const rr = await T.chgReplay(cap, { fb14: true, t0: T0 }); if (rr.state !== 'locked') return { lock: rr.state };
      const FB = X.FB14, h = Math.floor((178479 - FB.t0) / FB.rate - 10); for (const S of FB.states) { X.fbRun(S, h - S.l); S.lw = 1; }
      const all = FB.states, sh = L => X.shareRaw(L, 212, 212, 4)[0], old = (L, n) => { const k = Math.ceil(L.length / n); return L.filter((S, i) => i % k === 0); };
      const A = X.stSample(all, 300), cut = all.slice(0, Math.floor(all.length * 0.9)), Rs = X.resample(A, cut);
      return { n: all.length, full: sh(all), plan: sh(A), tick: sh(Rs), oldPlan: sh(old(all, 150)), oldTick: sh(old(cut, 150)) };
    }, { cap, T0: 173588 - cap.hideMs });
    await b.close();
    ok(r.n > 1000, '7483f3b1 T4 replayed: ' + r.n + ' states');
    ok(Math.abs(r.tick - r.plan) < 0.08, 'frame 212 on the plan\'s sample ' + r.plan.toFixed(3) + ', on it after 10% of the states cut ' + r.tick.toFixed(3) + ' (all states ' + r.full.toFixed(3) + '; v97\'s samples ' + r.oldPlan.toFixed(3) + ' -> ' + r.oldTick.toFixed(3) + ')');
  }
  console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
