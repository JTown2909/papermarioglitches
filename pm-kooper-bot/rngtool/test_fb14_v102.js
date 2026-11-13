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
// 2b. the skip's box reading (console skip clips fb0443 / fb0447 / fb0449): K as the panel's, the onset guarded against picture gaps
{ const K1 = F.v101, P = 3000;
  ok(F.FB14_READX.K === 3.4 && K1.VAN.K === 3 && K1.VAN.Kon === 0 && F.FB14_READX.S === 3.4, 'FB14_READX.K 3.4 (the panel\'s; v101 4.7), VAN.K 3 / Kon 0 kept');
  const grid = up => { const g = new Uint8ClampedArray(K1.BOX.gw * K1.BOX.gh * 4); for (let j = 0; j < K1.BOX.gw * K1.BOX.gh; j++) g.set([...(up ? [200, 191, 164] : [28, 22, 50]), 255], j * 4); return g; };
  const run = drop => { F.reset(); Object.assign(X, { on: true, t0: 0, rate: 33.367, taps: [], states: [], pT: { 1: 1 }, P: { 1: P }, M: { 1: P - 300 }, sk: null, box: null, boxW: null, skTestNow: 1 });
    const onPic = P + K1.SKIP.lo + K1.VAN.Kon - F.FB14_READX.K;
    for (let q = P + 230; q <= P + 262; q++) { const pic = q + 0.3; if (drop && pic > onPic - 4 && pic < onPic + 1) continue; window.__fbVisTest = () => grid(pic >= onPic); const t = pic * X.rate; X.lastT = t; K1.boxFrame(t); }
    delete window.__fbVisTest; return { box: X.box, win: K1.win() }; };
  const a = run(false), b = run(true);
  ok(a.box && Math.abs(a.box.P - P) <= 1 && !a.box.gap && a.win[1] === a.box.P + K1.SKIP.hi - K1.M, 'every picture: the onset gives P (' + (a.box && a.box.P) + '), the window to P + ' + (a.win[1] - P));
  ok(b.box && b.box.gap >= 3 && b.box.P >= a.box.P && b.win[1] <= a.win[1] - b.box.gap + (b.box.P - a.box.P) && b.win[1] <= P + K1.SKIP.hi - K1.M, 'pictures dropped before the onset (a gap of ' + (b.box && b.box.gap) + ' frames): the onset reads late (P ' + (b.box && b.box.P) + ') and the window\'s top end comes in by the gap (to P + ' + (b.win[1] - P) + ': still inside the true message)'); }
// 3. the page and the harness
{ const src = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8'), e2e = fs.readFileSync(path.join(__dirname, 'fb2_route', 'fb14_e2e.py'), 'utf8'), pg = fs.readFileSync(path.join(__dirname, 'test_fb14_page.js'), 'utf8');
  ok(/FB14\.fresh = how === 'fresh'/.test(src) && /P\.freshCap && !FB14\.fresh/.test(src), 'fb14Lock marks a fresh lock; the tick makes a capped plan again once the coin lifts the cap');
  ok(/zeros=zeros/.test(e2e) && /find_hit_skip/.test(e2e) && /__fb14seeds\.zt/.test(pg), 'the harness: each turn\'s confirm for the trace (zeros, zt), FORCE_HIT on T1\'s skip');
  const tpl = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8'); ok(/VERSION = 'v10[2-9]'/.test(tpl), 'page VERSION v102+'); }
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
// 5. the Press check row (the runner: "last frame seems to be stuck on 1.1"): a Final Bowser lever press on the beeps shows there
{ const pg = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8'), f2 = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb2_live.js'), 'utf8');
  ok((pg.match(/leverPressNote\(/g) || []).length === 2 && /leverPressNote\('Final Bowser T6, Do Nothing'/.test(f2), 'fb14Confirm (T1-T4), the T1 skip and fb2\'s T6 confirm report their press to the Press check row'); }
(async () => {
  const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v103/timeout_timer_standalone.html';
  if (!fs.existsSync(PAGE)) { ok(false, 'page not built: ' + PAGE); } else {
    const { chromium } = require('playwright'), b = await chromium.launch(), p = await b.newPage();
    await p.addInitScript(() => localStorage.setItem('tot-presses', JSON.stringify([0.4, 1.1])));
    await p.goto('file://' + PAGE);
    const r = await p.evaluate(() => { const T = window.__tot, m = () => document.getElementById('press-msg').textContent; T.showPresses(); const a = m();
      T.leverPressNote('Final Bowser T2, Do Nothing', 0.83, 'fb14'); const b2 = m(); const n = JSON.parse(localStorage.getItem('tot-presses') || '[]').length;
      T.leverPressNote('Final Bowser T1, the A that skips Cloud Nine\'s message', -1.26, 'fb14sk'); return { a, b: b2, c: m(), n, ver: window.__tot.VERSION }; });
    ok(/1\.1 frames late/.test(r.a), 'before: the row shows the stored generic press (1.1 late): ' + r.a.slice(0, 60));
    ok(/Last press \(Final Bowser T2, Do Nothing\): 0\.8 frames late/.test(r.b) && r.n === 2, 'a Final Bowser T2 press on the beeps: "' + r.b.slice(0, 70) + '", the generic presses untouched (' + r.n + ')');
    ok(/skips Cloud Nine's message\): 1\.3 frames early/.test(r.c), 'the T1 skip: ' + r.c.slice(0, 90));
    ok(/^v10[2-9]$/.test(r.ver), 'page version v102+');
    // 6. T6 (console log fb0449): the countdown is the runner's (3 beeps 500 ms apart, lead 1.5 s), and a passed frame is planned again
    const C = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v102.json'), 'utf8')), R6 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fb2_t6dn.json'), 'utf8')).emulatorCheck[0];
    const p2 = await b.newPage(); await p2.addInitScript(st => { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify(st)); }, Object.assign({ prof: 'endgame', boots: 'ultra' }, Object.fromEntries(Object.entries(C.settings).map(([k, v]) => [k, String(v)]))));
    await p2.goto('file://' + PAGE);
    const q = await p2.evaluate(({ L, R }) => {
      const T = window.__tot, F = window.__fb2, FB = F.FB2, V = T.V, S = T.SLOG, now = performance.now(), n0 = S.length;
      T.setStep(T.RT().findIndex(s => s.turn === 'fb2_k')); T.CHG.trig = { t: now - (L.fb2Lock - L.chargeTrigger) }; FB.rate = 33.367;
      V.onAt = now - 30000; V.lostSince = now - 3000; FB.on = true; FB.pObs = null; FB.hyps = [{ s: parseInt(R.s61, 16) >>> 0, nc: R.nc61, ph: R.ph, w: 1 }];
      const pl = F.planPAt(); const o = { lead: pl && pl.tPress != null ? pl.tPress - now : null, k: pl && pl.k, none: pl && pl.none, kFirst: pl && pl.kFirst, gap: +document.getElementById('s-gapms').value };
      // the frame passes with no confirm read: the T6 step's planner makes it again (beeps on a later frame, or No edge)
      const sh = FB.plan.tPress - performance.now() + 900; T.CHG.trig.t -= sh; FB.plan.tPress -= sh; if (T.st.plan) T.st.plan.tPress -= sh; T.st.planTry = 0; T.makePlan();     // (the clock 0.9 s past the beeped frame)
      o.re = S.slice(n0).filter(e => e.ev === 'fb2Replan').map(e => e.why); o.k2 = FB.plan && FB.plan.k; o.none2 = FB.plan && FB.plan.none; o.msg = T.st.msg; o.plan2 = !!T.st.plan; o.lead2 = FB.plan && FB.plan.tPress != null ? FB.plan.tPress - performance.now() : null;
      return o; }, { L: C.t6, R: R6 });
    const need = (C.settings.beeps - 1) * C.settings.gapms;
    ok(q.k != null && q.lead >= Math.max(C.settings.lead * 1000, need + 150) - 1, 'fb0449 T6: v101 beeped ' + ((C.t6.tPress - C.t6.planT) / 1000).toFixed(2) + ' s after the plan, 3 beeps ' + C.t6.gap_v101_ms + ' ms apart; now the plan (k ' + q.k + ') is ' + (q.lead / 1000).toFixed(2) + ' s ahead (lead ' + C.settings.lead + ' s), the beeps ' + q.gap + ' ms apart');
    ok(q.re.includes('target passed') && ((q.plan2 && q.k2 > q.k && q.lead2 >= C.settings.lead * 1000 - 1) || (q.none2 && /No edge/.test(q.msg || ''))), 'the frame passed with no Do Nothing read: planned again (' + (q.plan2 ? 'k ' + q.k2 + ', ' + (q.lead2 / 1000).toFixed(2) + ' s ahead' : q.msg) + ')');
    const f2s = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb2_live.js'), 'utf8'), pP = f2s.slice(f2s.indexOf('function fb2PlanP'), f2s.indexOf('function fb2Confirm'));
    ok(!/FB2_GAP/.test(pP) && /playBeeps\(pl\.tPress\)/.test(pP) && /earliestPress\(now\)/.test(pP), 'fb2PlanP: the runner\'s countdown (playBeeps, earliestPress), not its own 300 ms beeps');
    await b.close(); }
  console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
