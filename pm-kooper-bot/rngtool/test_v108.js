/* v108 (README v108): the console logs of Nov 14 (logs1114).
 * 1. Beeps (fb1548 T4, 2513.1-2515.0 s): the plan for 213 was dropped while its series played (fb14Refine, then a replan that
 *    returned on "WAIT, searching"), a replan picked 231 (no beeps: the series was kept) and then 255, beeped 18 ms after the
 *    kept series' last beep and before the confirm. Now the series' plan comes back while it plays (seriesHold), a replan that
 *    leaves no plan keeps the old one while its beeps are scheduled (fb14KeepIfOrphan), and no new series starts within
 *    BEEP_QUIET_MS of a series' last beep (playBeeps) unless the route moved on.
 * 2. T7 after a T6 Close Call that worked (fb1548 2546.8-2563 s, pLucky 0.531, then "No edge" at doubt 0.29-0.38): the outcome
 *    read from Mario's HP (fb2HpWatch); a dodge drops the hit branch from the T7 doubt; a hit gives no T7 plan. Replayed from
 *    the log's T6 Charge capture, confirm and shine.
 * usage: node test_v108.js [PAGE=...] [LOGS=/tmp/claude-0/pm/logs1114] */
const fs = require('fs'), path = require('path');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v108/timeout_timer_standalone.html', LOGS = process.env.LOGS || '/tmp/claude-0/pm/logs1114';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  if (!fs.existsSync(PAGE)) { console.log('(skipped: no page at ' + PAGE + ')'); console.log('all ok'); return; }
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const open = async (set) => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e) + (process.env.STK ? e.stack : ''))); await p.addInitScript(s => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify(s)); } catch (e) {} }, set || { prof: 'endgame', off: '-5', vlag: '50', fbc9: 'skip' }); await p.goto('file://' + PAGE); return p; };
  const p = await open();
  ok(await p.evaluate(() => window.__tot.VERSION) === 'v108', 'page version v108');

  // ---- 1. beeps: the fb1548 T4 shape (3 beeps 500 ms apart)
  const r = await p.evaluate(async () => {
    const V = window.__tot.v106, st = V.st(), sl = () => window.__fb14.slogTail(60), w = ms => new Promise(r => setTimeout(r, ms)), now = () => performance.now(), out = {};
    const T = window.__tot, i4 = T.RT().findIndex(s => s.fb14 === 4 && s.fb14role === 'lever'); T.setStep(i4 > 0 ? i4 - 1 : 1); T.setStep(i4 > 0 ? i4 : 2);
    const P = { tPress: now() + 1150, target: 213, fb14: 4, w: { start: 212, end: 214, length: 3 }, tab: [], first: 0, mix: { pp: 0.66 } };
    out.played = V.playBeeps(P.tPress, 3, 500); st.plan = P; await w(0);
    out.bound = st.series && st.series.plan === P;
    await w(300);                                           // first beep sounded (at +150)
    out.inFlight = !!V.inFlight();
    st.plan = null;                                         // dropped mid-series (fb14Refine + a replan that returned early)
    out.hold = V.seriesHold('fb14'); out.restored = st.plan === P; out.keptLog = sl().some(e => e.ev === 'seriesPlanKept' && e.target === 213);
    st.plan = { tPress: now() + 2000, target: 231, fb14: 4, w: { start: 231, end: 232, length: 2 }, tab: [], first: 0, mix: {} };   // replaced mid-series
    out.hold2 = V.seriesHold('fb14'); out.restored2 = st.plan === P;
    out.overlap = V.playBeeps(now() + 1300, 3, 500);         // a new series before the kept one ends: refused
    await w(P.tPress - now() + 18);                         // 18 ms after the last beep (fb1548: 255 beeped here)
    out.quiet = V.playBeeps(now() + 1400, 3, 500); out.quietLog = sl().some(e => e.ev === 'beepsQuiet');
    out.holdQuiet = V.seriesHold('fb14') && st.plan === P;
    await w(V.BEEP_QUIET_MS + 50);
    out.after = V.playBeeps(now() + 1400, 3, 500); out.holdAfter = (() => { st.plan = null; return V.seriesHold('fb14'); })();
    V.cancelBeeps({ force: true }); st.series = null;
    // the route moving on (the confirm) lifts the quiet window
    const t3 = now() + 1100; V.playBeeps(t3, 3, 500); st.plan = { tPress: t3, target: 100, w: { start: 100, end: 100, length: 1 }, tab: [], first: 0, mix: {} }; await w(t3 - now() + 20);
    T.setStep(i4 > 0 ? i4 + 1 : 3); out.afterStep = V.playBeeps(now() + 1400, 3, 500); V.cancelBeeps({ force: true });
    // a replan that leaves no plan keeps the old one while its beeps are scheduled
    st.series = null; st.plan = null; const P2 = { tPress: now() + 3000, target: 300, fb14: 4, w: { start: 300, end: 300, length: 1 }, tab: [], first: 0, mix: {} }; V.playBeeps(P2.tPress, 3, 500);
    window.__fb14.v108.keepIfOrphan(P2, 'test'); out.orphan = st.plan === P2;
    V.cancelBeeps({ force: true }); st.plan = null; window.__fb14.v108.keepIfOrphan(P2, 'test'); out.orphanGone = st.plan === null;
    return out; });
  ok(r.played && r.bound, '1. the series is bound to the plan that made it');
  ok(r.inFlight && r.hold && r.restored && r.keptLog, '1. the plan dropped mid-series comes back (seriesPlanKept, target 213)');
  ok(r.hold2 && r.restored2, '1. a new plan (231) does not replace the series\' plan mid-series');
  ok(r.overlap === false, '1. no overlapping new series');
  ok(r.quiet === false && r.quietLog && r.holdQuiet, '1. 18 ms after the last beep: no new series (beepsQuiet), the turn keeps the series\' plan for the confirm');
  ok(r.after === true && r.holdAfter === false, '1. after the confirm read window a new series may play');
  ok(r.afterStep === true, '1. the route moving on (the confirm) lifts the quiet window at once');
  ok(r.orphan && r.orphanGone, '1. a replan leaving no plan keeps the old plan while its beeps are scheduled (and not once they are cut)');
  // ---- 2. T7 after a T6 Close Call that worked (fb1548 2546.8-2563 s): the outcome read, the hit branch out of the doubt
  const L1548 = path.join(LOGS, 'fb1548', 'log.json');
  { const p2 = await open({ prof: 'endgame', off: '-4.5', vlag: '50', zwedge: '0.4', zwwin: '1', fb2t5: 'any' });      // fb1548's settings
    const r2 = await p2.evaluate(async () => {
      const T = window.__tot, X = window.__fb2, FB2 = X.FB2, out = {};
      // synthetic: the HP watch (Mario's HP tens place stubbed: 1 = the "1" of 10 shown)
      const run = async (tensAfter) => { FB2.t7 = { states: [{ w: 1 }], pLucky: 0.5, atk: {} }; FB2.pT = 100000; FB2.hpw = null; window.__fb2TensTest = t => (t > 102300 ? tensAfter : 0.5);
        for (let t = 98000; t < 106000 && !FB2.t7.outcome; t += 33.4) X.v108.hpWatch(t, true);
        return { o: FB2.t7.outcome || null, hit: !!FB2.t7.hit }; };
      out.dodge = await run(0.5); out.hit = await run(0); out.tail = window.__fb14.slogTail(30).filter(e => /fb2Dodged|fb2HitSeen/.test(e.ev)).map(e => e.ev);
      delete window.__fb2TensTest; FB2.pT = null; FB2.t7 = null; return out; });
    ok(r2.dodge.o === 'dodge' && r2.hit.o === 'hit' && r2.hit.hit && r2.tail.includes('fb2Dodged') && r2.tail.includes('fb2HitSeen'), '2. the T6 outcome read from Mario\'s HP (the "1" of 10 steady after the Close Call: dodge; blank: hit) ' + JSON.stringify(r2));
    if (!fs.existsSync(L1548)) console.log('(2 replay skipped: no logs at ' + LOGS + ')');
    else {
      const Lg = JSON.parse(fs.readFileSync(L1548, 'utf8')), cap = Lg.chargeCaptures.find(c => c.prof === 'fb2' && c.stepT === 'Final Bowser T6');
      const r3 = await p2.evaluate(async (cap) => {
        const T = window.__tot, X = window.__fb2, FB2 = X.FB2, out = {};
        T.setStep(T.RT().findIndex(s => s.turn === 'fb2_k'));
        const TR = 2544621, t0 = performance.now() - 3000, rel = t => t0 + (t - TR);      // the log's Charge trigger, shine and plan times
        await T.chgReplay(cap, { t0, fb2: true }); out.states = FB2.on ? new Set(FB2.hyps.map(h => h.s + ':' + h.nc)).size : 0; if (!FB2.on) return out;
        FB2.pObs = 161.5; X.setP(161.5); out.pL = +FB2.t7.pLucky.toFixed(3);
        FB2.taps = [X.pic(rel(2549697)) - 4.8]; FB2.vis = []; FB2.visFrom = null;
        const c = X.pic(rel(2558994) + 50), S0 = X.v108.prune(c); out.d0 = +S0.doubt.toFixed(3); out.none = X.planT7At(c);
        X.v108.outcome('dodge', { test: true }); const S1 = X.v108.prune(c); out.d1 = +S1.doubt.toFixed(3); out.dodge = X.planT7At(c);
        out.panel = document.getElementById('fb2-status') ? document.getElementById('fb2-status').textContent : '';
        X.v108.outcome('hit'); FB2.t7.outcome = null; X.v108.outcome('hit', { test: true }); out.hit = X.planT7At(c);
        return out; }, cap);
      console.log('   fb1548 T6 -> T7 replay: ' + JSON.stringify(r3).slice(0, 700));
      ok(r3.states === 4 && Math.abs(r3.pL - 0.531) < 0.1, '2. fb1548 T6 replayed: the T6 Charge locks on 4 states as live, pLucky ' + r3.pL + ' (live 0.531)');
      ok(r3.d0 > 0.15 && r3.d1 < 0.05, '2. the doubt before the dodge is seen is mostly the hit branch (' + r3.d0 + '), with the dodge seen ' + r3.d1);
      ok(r3.none && r3.none.none === 'edge' && r3.dodge && !r3.dodge.none && r3.dodge.pp7 >= 0.4, '2. T7 (d ' + (r3.dodge && r3.dodge.d) + '): "No edge" (' + (r3.none && r3.none.pp7 && r3.none.pp7.toFixed(3)) + ') before, a plan with the dodge seen (7+ ' + (r3.dodge && r3.dodge.pp7 && r3.dodge.pp7.toFixed(3)) + ' perfect press, zwedge 0.4)');
      ok(/Close Call worked \(seen\)/.test(r3.panel), '2. the FB2 panel says the Close Call worked (seen)');
      ok(r3.hit && r3.hit.none === 'hit', '2. a hit seen: no T7 plan (the dodge branch only is modelled)');
    }
    await p2.close(); }
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
