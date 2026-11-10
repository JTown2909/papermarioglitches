/* v90: the console session of 2026-11-10 (page v89; fixtures/console_1110.json, numbers only; charge_live/README.md v90).
 *  1. The Strategies-screen reading (dup3 / dup4 / jrcc_nothing): every Jr. Troopa T5 Do Nothing with a known outcome fits
 *     the v90 reading (0.2 frame earlier than v87-v89's), and the v89 reading does not (1c4d37ef T5: read 212.6 on the
 *     one-frame window 213, "works", and Mario died). On the page: the same press now reads 212.4, outside, and on the edge.
 *  2. The press check says "edge" (no tick, no cross) within PRESS_EDGE of a window edge; a press in the middle is plain.
 *  3. The Duplighost room seen at a bar hide after their fight (the route on Jr. Troopa T1) no longer moves the route back
 *     until a Charge burst is captured there; no burst, no move.
 *  4. Final Bowser's lever correction starts at 0 (log 54c12cf2: the seeded +2.37 put the T2 beep 2 frames late), the old
 *     store is ignored, and fewer than 4 presses move nothing.
 *  5. Final Bowser: after a T1 read with no lock the Charge reader arms again (log 8cc2055f: T2's Charge was never read).
 * usage: node test_console_1110.js [PAGE] */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_1110.json'), 'utf8'));
let fails = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [], p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ duproute: 'charge', jrroute: 'charge', off: '-5', vlag: '50', prof: 'endgame' })); localStorage.setItem('tot-fb14press', JSON.stringify([-2.54, -2.2, -0.51])); } catch (e) {} });
  await p.goto('file://' + PAGE);
  const r = await p.evaluate(async () => {
    const T = window.__tot, out = { version: T.VERSION };
    out.van = { dup3: T.R.PROFILES.dup3.vanish, dup4: T.R.PROFILES.dup4.vanish, jrcc_nothing: T.R.PROFILES.jrcc_nothing.vanish, timeout: T.R.PROFILES.timeout.vanish, jrcc_bomb: T.R.PROFILES.jrcc_bomb.vanish };
    // 1-2. the T5 press on the page: tracker from the T5 lock, a plan on the one-frame window 213
    const s5 = T.RT().findIndex(s => s.jr === 9 && (s.seq || 'ultra') === 'ultra'); T.setStep(s5);
    const press = (c89, w) => { T.jrTrackerAt(0x21752841, [6, 8, 9], performance.now() - 20000, 8);
      T.st.plan = { mix: { zw: true }, zwAbs: w[0], target: w[0], w: { start: w[0], end: w[1] }, tMade: -1e12, rate: T.zw.rate };
      const n = T.SLOG.length; T.jrScreenAt(c89, 2); const e = T.SLOG.slice(n).find(x => x.ev === 'press'); return e ? { err: e.err, inWin: e.inWin, edge: !!e.edge } : null; };
    out.p5 = press(212.6, [213, 213]); out.pMid = press(213.0, [213, 213]); out.pIn = press(213.5, [213, 214]);
    // 3. the arena: the Duplighost room at a real bar hide on Jr. Troopa T1
    const jrI = T.RT().findIndex(x => x.chg === 'jr'), dupI = T.RT().findIndex(x => x.chg === 'dup');
    T.setStep(jrI); T.chgReset(); window.__chgArenaTest = () => ({ a: 'dup', L: 53.3, br: 14.7, lbr: 5.5 });
    const P = T.chgArenaProf(T.CHG_PROF.jr, true); out.arena = { prof: P.id, stepAfterHide: T.step(), jrI, dupI, held: T.chgBackTo() };
    T.chgReset(); out.arena.afterNoBurst = T.step(); out.arena.heldAfterReset = T.chgBackTo();
    T.chgArenaProf(T.CHG_PROF.jr, true); T.chgBackResolve(); out.arena.afterBurst = T.step(); window.__chgArenaTest = null;
    // 4. the Final Bowser lever correction
    out.fb = { bias0: T.leverBias('fb14'), list0: T.leverList('fb14').length };
    for (let i = 0; i < 3; i++) T.leverAdd('fb14', -0.5); out.fb.bias3 = T.leverBias('fb14');
    // 5. the reader after a no-lock on Final Bowser's T1 Cloud Nine step
    const l1 = T.RT().findIndex(x => x.fb14 === 1 && x.fb14role === 'lever'); T.setStep(l1); T.chgReset();
    Object.assign(T.CHG, { state: 'nolock', F0: null }); const n5 = T.SLOG.length; T.fb14Frame(performance.now(), true);
    out.rearm = { state: T.CHG.state, logged: T.SLOG.slice(n5).some(e => e.ev === 'fb14ReaderRearmed' && e.why === 'after a no-lock') };
    Object.assign(T.CHG, { state: 'nolock', F0: { pending: true } }); T.fb14Frame(performance.now(), true); out.rearm.pendingKept = T.CHG.state === 'nolock';
    T.CHG.F0 = null; T.chgReset();
    return out;
  });
  console.log(JSON.stringify(r));
  check(r.version === 'v90', 'version v90');
  // 1. the outcome table
  const V = r.van.jrcc_nothing, d = V - 2;
  for (const x of FIX.strategies) {
    const c89 = x.c_v89 != null ? x.c_v89 : x.c_v87, c90 = c89 - d, f = Math.round(c90), inW = f >= x.win[0] && f <= x.win[1], f89 = Math.round(c89), in89 = f89 >= x.win[0] && f89 <= x.win[1];
    check(inW === (x.outcome === 'dodge'), '1. ' + x.log + ' ' + x.turn + ' (' + x.outcome + '): v90 reads ' + c90.toFixed(2) + ' -> frame ' + f + ', window ' + x.win.join('-') + (in89 !== inW ? ' (v89: ' + c89 + ', ' + (in89 ? 'inside' : 'outside') + ')' : ''));
  }
  check(r.van.dup3 === 2.2 && r.van.dup4 === 2.2 && V === 2.2 && r.van.timeout === 2 && r.van.jrcc_bomb !== 2.2, '1. the Strategies screen reads with vanish 2.2; the other screens unchanged ' + JSON.stringify(r.van));
  check(r.p5 && !r.p5.inWin && Math.abs(r.p5.err + 0.6) < 0.02 && r.p5.edge, '1-2. 1c4d37ef T5 on the page: read ' + JSON.stringify(r.p5) + ' (v89: -0.4, inside, "works")');
  check(r.pMid && r.pMid.inWin && !r.pMid.edge, '2. a press read 0.2 from the middle of a one-frame window: inside, not on the edge ' + JSON.stringify(r.pMid));
  check(r.pIn && r.pIn.inWin && !r.pIn.edge, '2. a press read on the boundary between two working frames: not an edge ' + JSON.stringify(r.pIn));
  // 3.
  const A = r.arena;
  check(A.prof === 'dup' && A.stepAfterHide === A.jrI && A.held === A.dupI, '3. the Duplighost room at a bar hide on Jr. Troopa T1: read with the Duplighost profile, the route stays (' + JSON.stringify(A) + ')');
  check(A.afterNoBurst === A.jrI && A.heldAfterReset == null, '3. no Charge burst (the reader reset): the route stays on Jr. Troopa');
  check(A.afterBurst === A.dupI, '3. a Charge burst captured there: back to the Duplighosts');
  // 4.
  check(r.fb.bias0 === 0 && r.fb.list0 === 0 && r.fb.bias3 === 0, '4. Final Bowser lever correction: 0 at the start (old store ignored), 0 after 3 presses ' + JSON.stringify(r.fb));
  const F = FIX.fbLever; check(Math.round(F.c - F.bias) === F.target + 0 || Math.abs(F.c - F.bias - F.target) < 1, '4. 54c12cf2 T2: without the seeded +' + F.bias + ' the same press (runner ' + (F.c - F.bias - F.target).toFixed(2) + ' against the beep) lands ' + (F.c - F.bias).toFixed(2) + ' on the one-frame window ' + F.target);
  // 5.
  check(r.rearm.state === 'idle' && r.rearm.logged && r.rearm.pendingKept, '5. after a T1 no-lock the Charge reader arms again (not while a re-read is pending) ' + JSON.stringify(r.rearm));
  check(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
