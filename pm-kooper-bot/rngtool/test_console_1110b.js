/* v91: the Final Bowser console logs of 2026-11-10 evening (A 032af46e, B a53781d5, C 28b4ae32, D 8576a774; page v90;
 * fixtures/console_1110b.json, numbers only; charge_live/README.md v91).
 *  1. The RNG stream between Charges (LCG steps) and the v91 window: it reaches every console pair, retries included
 *     (v90's fixed 9000 missed C T4 -> D T1 at 15516), and 5aad8f13 -> d381a138 is not one stream.
 *  2. A bar hide seen after a stalled thread: the Cloud Nine shifts spread over the gap.
 *  3. Attempts: the bar gone 44-76 s between attempts starts a new one (route to T1's Charge, the old hit / confirms / clock
 *     dropped, the stream kept); the in-fight gaps (up to 9.4 s) do not; the runner setting T1's Charge from a later turn does
 *     too, and a read in flight is then T1's.
 *  4. A's 176.1 s Charge on T2's step with no T2 confirm stays T2 (v90: T4).
 *  5. The plan: a hit logs "No edge" once, a T4 hit puts the route off, the doubt has hysteresis (C T2), WAIT is the headline.
 *  6. With the logs (skipped when absent): B's attempt-3 T1 locks on the window after attempt 2's T2 lock; D's T1 on the window
 *     after C's T4 lock (v90: the full search, 8 s); A's attempt-2 T1 does not lock after attempt 1's; wrong windows of the
 *     widest size never lock; D's T2 narrowed read is timed.
 * usage: node test_console_1110b.js [page]   (serves nothing: the page is opened from disk) */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const SP = '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad';
const PAGE = process.argv[2] || process.env.PAGE || SP + '/timeout_timer_v102/timeout_timer_standalone.html';
const LD = process.env.LOGS || '/tmp/claude-0/pm/logs1110';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_1110b.json'), 'utf8'));
let bad = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };
const fwd = s => (Math.imul(s, 0x5D588B65) + 1) >>> 0;
const steps = (a, b, max) => { let s = parseInt(a, 16) >>> 0; const t = parseInt(b, 16) >>> 0; for (let i = 0; i <= max; i++) { if (s === t) return i; s = fwd(s); } return -1; };
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame' })); } catch (e) {} });
  await p.goto('file://' + PAGE);
  check(await p.evaluate(() => window.__tot.VERSION) === 'v103', 'page version v103');
  // ---- 1. the stream
  const X = await p.evaluate(() => window.__fb14.FBS());
  for (const S of FIX.streams) {
    const n = steps(S.from, S.to, 40000), hi = await p.evaluate(([note, trig]) => window.__fb14.streamHi({ seed: 0, t: note }, trig + 2000), [S.noteT, S.trigT]);
    check(n === S.steps && n >= X.FBS_LO && n <= hi && hi <= X.FBS_HIMAX, '1. ' + S.what + ': ' + S.from + ' -> ' + S.to + ' ' + n + ' steps in ' + ((S.trigT - S.noteT) / 1000).toFixed(1) + ' s, window to ' + hi + (n > X.FBS_HI ? ' (v90: 9000, missed)' : ''));
  }
  check(steps(FIX.notStream.from, FIX.notStream.to, FIX.notStream.within) < 0, '1. A attempt 1 T1 ' + FIX.notStream.from + ' -> attempt 2 T1 ' + FIX.notStream.to + ': not within ' + FIX.notStream.within + ' steps (not one stream)');
  // ---- 2. the stalled-thread bar hide
  const gs = await p.evaluate(() => { const X = window.__fb14, b = [[-2, 0.1], [-1, 0.2], [0, 0.35], [1, 0.25], [2, 0.1]]; return { s0: X.gapShifts(b, 20), s1: X.gapShifts(b, 1070) }; });
  const sum = gs.s1.reduce((a, x) => a + x[1], 0);
  check(gs.s0.length === 5 && gs.s1[0][0] <= -33 && gs.s1[gs.s1.length - 1][0] === 2 && Math.abs(sum - 1) < 1e-9, '2. a hide seen 1070 ms after the last bar picture (B 266.1 s): shifts ' + gs.s1[0][0] + ' .. ' + gs.s1[gs.s1.length - 1][0] + ' (a normal one: ' + gs.s0.length + ')');
  // ---- 3. attempts
  const r3 = await p.evaluate(F => {
    const T = window.__tot, X = window.__fb14, FB = X.FB14, RT = T.RT(), c1 = RT.findIndex(s => s.fb14 === 1 && s.fb14role === 'charge'), l2 = RT.findIndex(s => s.fb14 === 2), l3 = RT.findIndex(s => s.fb14 === 3), pb = RT.findIndex(s => s.turn === 'fb2_pb'), out = { c1 };
    const stale = () => { X.reset(); Object.assign(FB, { lastBurst: { turn: 2, t: 1000 }, hit: 1, pT: { 1: 900, 2: 1500 }, t0: 100, stream: { seed: 0x3452fd2f, t: 1200 } }); };
    const gap = (step, ms) => { T.setStep(step); stale(); const t0 = 2000000; X.gapCheck(t0, true); X.gapCheck(t0 + 10, false); X.gapCheck(t0 + 10 + ms, true); return { step: T.step(), hit: FB.hit, pT: Object.keys(FB.pT || {}).length, stream: FB.stream && FB.stream.seed === 0x3452fd2f, t0: FB.t0 }; };
    out.between = F.barGaps.betweenAttempts.map(g => gap(l3, g)); out.fromPb = gap(pb, F.barGaps.betweenAttempts[2]); out.inFight = F.barGaps.inFight.map(g => gap(l2, g));
    // the runner sets T1's Charge from T3 (B 249.3 s); from T2 with a read in flight (A 153.4 s)
    T.setStep(l3); stale(); T.setStep(c1); out.click = { hit: FB.hit, t0: FB.t0, stream: !!FB.stream };
    T.setStep(l2); stale(); X.chgState('search'); T.setStep(c1); out.clickFly = { trigTurn: FB.trigTurn, trigStep: FB.trigStep, c1 }; X.chgState('idle');
    return out; }, FIX);
  r3.between.forEach((x, i) => check(x.step === r3.c1 && x.hit == null && x.pT === 0 && x.t0 == null && x.stream, '3. bar gone ' + (FIX.barGaps.betweenAttempts[i] / 1000).toFixed(1) + ' s on T3: a new attempt (route to T1 Charge, hit / confirms / clock dropped, stream kept): ' + JSON.stringify(x)));
  check(r3.fromPb.step === r3.c1 && r3.fromPb.hit == null, '3. from the T7 step (C 691.1 s, 75.7 s gone): T1 Charge, read with the T1 profile');
  r3.inFight.forEach((x, i) => check(x.step !== r3.c1 && x.hit === 1 && x.pT === 2, '3. in-fight gap ' + (FIX.barGaps.inFight[i] / 1000).toFixed(1) + ' s: no new attempt'));
  check(r3.click.hit == null && r3.click.t0 == null && r3.click.stream, '3. T1 Charge clicked from T3 (B 249.3 s): a new attempt, stream kept');
  check(r3.clickFly.trigTurn === 1 && r3.clickFly.trigStep === r3.clickFly.c1, '3. clicked from T2 with a read in flight (A 153.4 s): the read is T1\'s');
  // ---- 4. A 176.1 s: a Charge on T2's step, 31.6 s after T2's burst, no T2 confirm
  const r4 = await p.evaluate(() => {
    const T = window.__tot, X = window.__fb14, FB = X.FB14, RT = T.RT(), l2 = RT.findIndex(s => s.fb14 === 2), l4 = RT.findIndex(s => s.fb14 === 4), now = performance.now();
    T.setStep(l2); X.reset(); FB.lastBurst = { turn: 2, t: now - 31600 }; X.trigger(); const a = T.step();
    T.setStep(l2); X.reset(); FB.lastBurst = { turn: 2, t: now - 31600 }; FB.pT = { 2: now - 25000 }; FB.M = { 3: 1 }; X.trigger(); const b2 = T.step();
    return { a, b: b2, l2, l4 }; });
  check(r4.a === r4.l2, '4. a Charge on T2\'s step with no T2 confirm or Jelly since its burst stays T2 (v90 went to T4)');
  check(r4.b === r4.l4, '4. after T2\'s confirm and T3\'s Jelly the next Charge is T4\'s');
  // ---- 5. the plan's gates
  const r5 = await p.evaluate(() => {
    const T = window.__tot, X = window.__fb14, FB = X.FB14, RT = T.RT(), l2 = RT.findIndex(s => s.fb14 === 2), out = {};
    const mark = () => T.slog ? null : null; T.setStep(l2);
    X.reset(); Object.assign(FB, { on: true, t0: performance.now() - 30000, hit: 1 }); const n0 = (window.__totLog ? window.__totLog().length : 0);
    X.plan(); X.plan(); out.hit = FB.plan && FB.plan.none;
    X.reset(); Object.assign(FB, { on: true, t0: performance.now() - 30000, hit: 4, routeOff: 'T4\'s wave hit Mario' }); X.plan(); out.off = FB.plan && FB.plan.none; out.offMsg = X.msg();
    // hysteresis: the weighing stubbed at a doubt between the two lines
    out.stub = true;
    if (out.stub) {
      const S = X.fbNew({ s: 1, nc: 0, f: 0, c: new Uint8Array(20), ph: [0, 0], l: 0, rg: 0, w: 1, from: 0, sh: [], tag: 2 });
      const at = d => { window.__fb14WeighTest = () => ({ list: [S], doubt: d, sum: 1 }); try { X.plan(); } catch (e) {} return FB.plan && FB.plan.none === 'doubt'; };
      X.reset(); Object.assign(FB, { on: true, t0: performance.now() - 30000, states: [S], M: { 2: 0 } });   // (v92: T2's Charge seen)
      out.h = { d45first: at(0.45), d52: at(0.52), d45after: at(0.45), d38: at(0.38) };
      window.__fb14WeighTest = null;
    }
    X.reset(); X.chgState('search'); X.plan(); out.wait = document.getElementById('headline').textContent; X.chgState('idle');
    return out; });
  check(r5.hit === 'hit', '5. a hit: no edge (now logged once)');
  check(r5.off === 'route off' && /^Route off/.test(r5.offMsg || ''), '5. T4\'s wave hit Mario: "Route off", no lever planned');
  if (r5.stub) check(!r5.h.d45first && r5.h.d52 && r5.h.d45after && !r5.h.d38, '5. hysteresis: 0.45 plans, 0.52 "No edge", then 0.45 stays "No edge", 0.38 plans again ' + JSON.stringify(r5.h));
  else check(false, '5. hysteresis: fb14Weigh not reachable from the test');
  check(/^WAIT/.test(r5.wait), '5. the read in flight on a lever step: headline "' + r5.wait + '"');
  // ---- 7. logs E / F: the press against the plan up at the press, no plan after the confirm, the decision watchdog
  const r7 = await p.evaluate(() => {
    const T = window.__tot, X = window.__fb14, FB = X.FB14, RT = T.RT(), l1 = RT.findIndex(s => s.fb14 === 1 && s.fb14role === 'lever'), l2 = RT.findIndex(s => s.fb14 === 2), out = {};
    document.getElementById('s-fbc9').value = 'bar';     // v101: the Cloud Nine press as T1's lever (Settings: Confirm Cloud Nine on the beep), as in these logs
    T.setStep(l1); X.reset(); const now = performance.now(); Object.assign(FB, { on: true, t0: now - 237 * 33.367 - 3000, rate: 33.367, states: [] });
    // E / F: plan 237 made 2.9 s before the press, the replan to 300 made after it
    FB.plans = [{ turn: 1, target: 237, tMade: now - 3000, tPress: now - 100, bias: 0 }, { turn: 1, target: 300, tMade: now + 50, tPress: now + 2000, bias: 0 }];
    const tObs = FB.t0 + (237 + 2 + 1) * 33.367; X.confirm(tObs, RT[l1]); const c = X.slogTail(30).filter(e => e.ev === 'fb14Confirm').pop(); out.conf = c && { planned: c.planned, err: c.err };
    X.plan(); out.after = X.slogTail(5).some(e => e.ev === 'fb14PlanAfterConfirm') && !(FB.plan && FB.plan.target);
    document.getElementById('s-fbc9').value = 'skip';
    // the watchdog: a lock on T2's step, no decision within 0.5 s (B / E / F: an old hit kept every plan silent)
    T.setStep(T.RT().findIndex(s => s.fb14 === 3 && s.fb14role === 'lever')); X.reset(); Object.assign(FB, { on: true, t0: performance.now() - 60000, rate: 33.367, states: [], hit: 2, M: { 3: 0 }, decide: { t: performance.now() - 800, turn: 3 } });   // (v92: T3 after its Jelly)
    X.frame(performance.now(), true); out.dog = X.slogTail(20).filter(e => e.ev === 'fb14NoDecision' || e.ev === 'fb14NoEdge').map(e => e.ev + ':' + (e.why || ''));
    return out; });
  check(r7.conf && r7.conf.planned === 237 && Math.abs(r7.conf.err) < 4, '7. a press during a replan is measured against the plan up at the press (F: target 237, v90 logged -63 against 300): ' + JSON.stringify(r7.conf));
  check(r7.after, '7. no plan after the turn\'s confirm (E: a third plan after fb14Input)');
  check(r7.dog.includes('fb14NoDecision:') && r7.dog.includes('fb14NoEdge:hit'), '7. a lock with no decision after 0.5 s: fb14NoDecision, then the reason logged: ' + r7.dog.join(' '));
  // ---- 6. the reads replayed (the logs hold the pictures; never committed)
  const caps = {}; for (const [k, f] of Object.entries(FIX.logs)) { const fp = path.join(LD, f); if (fs.existsSync(fp)) caps[k] = JSON.parse(fs.readFileSync(fp, 'utf8')).chargeCaptures; }
  if (!caps.D || !caps.B) console.log('skip 6: the 2026-11-10 logs are not in ' + LD);
  else {
    const sreplay = (c, from, hi) => p.evaluate(async ([c, from, hi]) => { const t0 = performance.now(); c = Object.assign({}, c, { cands: null }); const r = await window.__tot.chgReplay(c, { maxAlts: 0, stream: from, streamHi: hi, streamOnly: true }); return { state: r.state, best: r.best, stream: r.info.stream, ms: Math.round(performance.now() - t0) }; }, [c, from, hi]);
    const hiOf = S => p.evaluate(([n, t]) => window.__fb14.streamHi({ seed: 0, t: n }, t + 2000), [S.noteT, S.trigT]);
    for (const [S, cap] of [[FIX.streams[1], caps.D[3]], [FIX.streams[4], caps.D[9]], [FIX.streams[5], caps.D[10]]]) {
      const hi = await hiOf(S), r = await sreplay(cap, S.from, hi);
      check(r.state === 'locked' && r.best.seed === S.to && r.best.stream && r.best.stream.steps === S.steps, '6. ' + S.what + ': the window (to ' + hi + ') locks ' + S.to + ' at ' + S.steps + ' steps (' + (r.best && r.best.seed + ' ' + r.best.score + ' / ' + r.best.ratio) + ', ' + r.ms + ' ms)');
    }
    { const N = FIX.notStream, hi = await hiOf(N), r = await sreplay(caps.D[1], N.from, hi);
      check(r.state !== 'locked', '6. A attempt 2 T1 on the window after attempt 1\'s lock (to ' + hi + '): no lock (' + (r.stream && r.stream.tries.map(t => t.best + '/' + t.ratio).join(' ')) + ', ' + r.ms + ' ms)'); }
    // wrong windows of the widest size: random kept seeds, every fb1 read of the session
    let rs = 0x1110b; const rnd = () => (rs = fwd(rs)); let locks = 0, best = 0, n = 0;
    for (const i of [3, 4, 7, 8, 9, 10, 11]) for (let k = 0; k < 2; k++) {
      const from = (rnd() >>> 0).toString(16).padStart(8, '0'), r = await sreplay(caps.D[i], from, X.FBS_HIMAX); n++;
      if (r.state === 'locked') locks++; for (const t of (r.stream ? r.stream.tries : [])) best = Math.max(best, t.ratio);
    }
    check(locks === 0, '6. ' + n + ' wrong windows of ' + X.FBS_HIMAX + ' seeds (each as placed and one frame early): ' + locks + ' locks, best ratio ' + best.toFixed(2) + ' (the lock needs ' + X.FBS_RATIO + ')');
    { const r = await p.evaluate(async c => { const t0 = performance.now(); const r = await window.__tot.chgReplay(c, { maxAlts: 0 }); return { state: r.state, best: r.best, narrow: r.info.narrow, ms: Math.round(performance.now() - t0) }; }, caps.D[10]);
      check(r.state === 'locked' && r.best.seed === 'adce13ad', '6. D T2: the narrowed read on its ' + (r.narrow && r.narrow.cands) + ' carried candidates locks adce13ad in ' + r.ms + ' ms (live 3010)'); }
  }
  check(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
