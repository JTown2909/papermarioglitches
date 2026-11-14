/* v108 (README v108): the console logs of Nov 14 (logs1114).
 * 1. Beeps (fb1548 T4, 2513.1-2515.0 s): the plan for 213 was dropped while its series played (fb14Refine, then a replan that
 *    returned on "WAIT, searching"), a replan picked 231 (no beeps: the series was kept) and then 255, beeped 18 ms after the
 *    kept series' last beep and before the confirm. Now the series' plan comes back while it plays (seriesHold), a replan that
 *    leaves no plan keeps the old one while its beeps are scheduled (fb14KeepIfOrphan), and no new series starts within
 *    BEEP_QUIET_MS of a series' last beep (playBeeps) unless the route moved on.
 * usage: node test_v108.js [PAGE=...] [LOGS=/tmp/claude-0/pm/logs1114] */
const fs = require('fs'), path = require('path');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v108/timeout_timer_standalone.html', LOGS = process.env.LOGS || '/tmp/claude-0/pm/logs1114';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  if (!fs.existsSync(PAGE)) { console.log('(skipped: no page at ' + PAGE + ')'); console.log('all ok'); return; }
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const open = async () => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e) + (process.env.STK ? e.stack : ''))); await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', off: '-5', vlag: '50', fbc9: 'skip' })); } catch (e) {} }); await p.goto('file://' + PAGE); return p; };
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
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
