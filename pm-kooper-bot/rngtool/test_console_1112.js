/* v93: the Final Bowser console logs of 2026-11-12 (00700c7e, a87486a0; page v92; fixtures/console_1112.json, numbers only;
 * charge_live/README.md v93).
 *  1. The Do Nothing outcomes against the readings: no constant offset fits the plans' windows exactly; every outcome fits an
 *     offset inside the carried shifts (-2 .. +5), v92's -2 .. +2 left out the 00700c7e T2 / T3 wins.
 *  2. The learned Final Bowser correction: the v90 store (4 presses, +1.17 on the runner's browser) and new presses move nothing.
 *  3. A Do Nothing confirm goes into the states on -2 .. +5 (Cloud Nine and the Charges as before).
 *  4. No plan while the bar is gone on a lever step (a87486a0 attempt 2 T1: a second plan 0.34 s after the hide).
 *  5. T6's own route step: after T4 the route is on it, it reads the T6 Charge (fb2), it says to wait on the Strategies screen (v97), and the popup
 *     closing moves it to T7's Power Bounce.
 *  6. The streams: T1 -> T2 (T1's lock confirmed), T2 -> T4 (the T4 seed on the T2 lock's stream), attempt 1 -> 2.
 * usage: node test_console_1112.js [page] */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const SP = '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad';
const PAGE = process.argv[2] || process.env.PAGE || SP + '/timeout_timer/timeout_timer_standalone.html';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_1112.json'), 'utf8'));
let bad = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };
const fwd = s => (Math.imul(s, 0x5D588B65) + 1) >>> 0;
const steps = (a, b, max) => { let s = parseInt(a, 16) >>> 0; const t = parseInt(b, 16) >>> 0; for (let i = 0; i <= max; i++) { if (s === t) return i; s = fwd(s); } return -1; };
(async () => {
  // ---- 1. the outcome table: the offsets x (true = reading + x) each outcome allows, on the plans' windows
  const fits = (r, x) => { const F = Math.round(r.c + x), inW = F >= r.win[0] && F <= r.win[1]; return r.outcome === 'miss' ? inW : !inW; };
  const xs = []; for (let x = -3; x <= 6.001; x += 0.01) xs.push(+x.toFixed(2));
  const all = xs.filter(x => FIX.doNothing.every(r => fits(r, x)));
  check(all.length === 0, '1. no constant offset fits the four Do Nothing outcomes on the plans\' windows exactly (the windows are the model\'s, not the game\'s)');
  for (const r of FIX.doNothing) { const ok = xs.filter(x => fits(r, x)); const inS = ok.filter(x => x >= -2.5 && x < 5.5);
    console.log('  ' + r.log + ' T' + r.turn + ' read ' + r.c + ' window ' + r.win.join('-') + ' ' + r.outcome + ': x ' + (r.outcome === 'miss' ? ok[0] + ' .. ' + ok[ok.length - 1] : 'not ' + (r.win[0] - 0.5 - r.c).toFixed(2) + ' .. ' + (r.win[1] + 0.5 - r.c).toFixed(2)));
    check(inS.length > 0 && (r.outcome !== 'miss' || ok[0] >= -2.5 && ok[ok.length - 1] < 5.5), '1. ' + r.log + ' T' + r.turn + ': its offsets are inside the carried shifts -2 .. +5' + (r.outcome === 'miss' && ok[0] > 2.5 ? ' (v92\'s -2 .. +2: outside)' : '')); }
  check(FIX.clipVblanks.aToStrategiesGrey[0] === 9 && FIX.clipVblanks.aToStrategiesGrey[1] === 9, '1. the clip: the A on the input display -> the Strategies panel grey 9 vblanks on both T2 and T3, as in Jr. Troopa (the page closes on the grey picture)');
  // ---- 6. streams
  for (const S of FIX.streams) check(steps(S.from, S.to, 40000) === S.steps, '6. ' + S.what + ': ' + S.from + ' -> ' + S.to + ' ' + S.steps + ' steps');
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(F => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', off: '-5', vlag: '50' })); localStorage.setItem('tot-fb14press-v90', JSON.stringify(F)); } catch (e) {} }, FIX.leverStoreV90);
  await p.goto('file://' + PAGE);
  check(await p.evaluate(() => window.__tot.VERSION) === 'v98', 'page version v98');
  // ---- 2. the learned correction
  const r2 = await p.evaluate(() => { const T = window.__tot, X = window.__fb14, out = { old: T.leverBias('fb14'), n0: T.leverList('fb14').length };
    for (let i = 0; i < 8; i++) T.leverAdd('fb14', -3.6); out.after = T.leverBias('fb14'); out.n = T.leverList('fb14').length; X.reset(); X.FB14.t0 = 1000; X.FB14.rate = 33.367; out.pt = X.pressT(900);
    out.v85 = 1000 + (900 - 1.7 - 5) * 33.367 - 50; return out; });
  check(r2.old === 0 && r2.n0 === 0, '2. the v90 store (' + FIX.leverStoreV90.join(', ') + ': +1.17 on v92) is not read');
  check(r2.after === 1.5 && r2.n === 8 && Math.abs((r2.pt - r2.v85) / 33.367 - 1.5) < 0.01, '2. v96: 8 presses at -3.6 are kept (' + r2.n + ') and learned again (README v96): the beep 1.5 frames later (at most 1.5)');
  // ---- 3. the Do Nothing shifts
  const r3 = await p.evaluate(() => { const T = window.__tot, X = window.__fb14, FB = X.FB14, RT = T.RT(), out = {};
    const mk = () => X.fbNew({ s: 1, nc: 0, f: 0, c: new Uint8Array(20), ph: [0, 0], l: 0, rg: 0, w: 1, from: 0, sh: [], tag: 2 });
    for (const [k, find] of [['S', s => s.fb14 === 2], ['M', s => s.fb14 === 1 && s.fb14role === 'lever']]) {
      const i = RT.findIndex(find); T.setStep(i); X.reset(); Object.assign(FB, { on: true, t0: performance.now() - 20000, rate: 33.367, states: [mk()], M: { 1: 0, 2: 0 } });
      X.confirm(FB.t0 + 300 * 33.367, RT[i]); const L = X.slogTail(10).filter(e => e.ev === 'fb14Input').pop(); out[k] = L ? L.states : null; }
    return out; });
  check(r3.S === 7, '3. (v94) a Do Nothing confirm goes into the states on 7 frames (-3 .. +3 around the v94 reading, which is v93\'s + 3.4): ' + r3.S);
  check(r3.M === 5, '3. a Cloud Nine screen confirm on 5 (-2 .. +2) as before: ' + r3.M);
  // ---- 4. no plan while the bar is gone on a lever step
  const r4 = await p.evaluate(() => { const T = window.__tot, X = window.__fb14, FB = X.FB14, RT = T.RT(), i = RT.findIndex(s => s.fb14 === 1 && s.fb14role === 'lever');
    T.setStep(i); X.reset(); const S = X.fbNew({ s: 1, nc: 0, f: 0, c: new Uint8Array(20), ph: [0, 0], l: 0, rg: 0, w: 1, from: 0, sh: [], tag: 2 });
    Object.assign(FB, { on: true, t0: performance.now() - 8000, rate: 33.367, states: [S], M: { 1: 0 }, hideWatch: { up: 0, gone: performance.now() - 339 } });
    X.plan(); const held = X.slogTail(5).some(e => e.ev === 'fb14PlanHeld') && !(FB.plan && FB.plan.target);
    FB.hideWatch.gone = performance.now() - 5000; FB.plan = null; X.plan(); return { held, after: !!FB.plan }; });
  check(r4.held, '4. the bar gone 0.34 s on Cloud Nine\'s step (a87486a0 259.67 s): no plan (fb14PlanHeld)');
  check(r4.after, '4. 5 s after the hide (no confirm taken): the plan runs again');
  // ---- 5. T6's own step
  const r5 = await p.evaluate(() => { const T = window.__tot, F2 = window.__fb2, RT = T.RT(), l4 = RT.findIndex(s => s.fb14 === 4), k6 = RT.findIndex(s => s.turn === 'fb2_k'), p7 = RT.findIndex(s => s.turn === 'fb2_pb');
    T.setStep(k6); const prof = T.chgProfNow() && T.chgProfNow().id; F2.FB2.on = false; F2.FB2.plan = null; T.makePlan(); const msg = document.getElementById('headline').textContent + ' ' + (window.__fb14.msg() || '');
    F2.seenK(80, 'popup'); return { l4, k6, p7, prof, msg, after: T.step(), pre: (RT[k6].pre || []).map(x => x.id), pre7: (RT[p7].pre || []).length }; });
  check(r5.k6 === r5.l4 + 1 && r5.p7 === r5.k6 + 1, '5. the route: T4\'s Do Nothing, then T6\'s own step, then T7\'s Power Bounce (' + r5.l4 + ', ' + r5.k6 + ', ' + r5.p7 + ')');
  check(r5.prof === 'fb2' && r5.pre.includes('fb2_charge') && r5.pre7 === 0, '5. T6\'s step reads the T6 Charge with the fb2 profile (its pre: the Charge); T7 has none');
  check(/WAIT on Lakilester's Strategies screen/.test(r5.msg) && !/HOLD/.test(r5.msg), '5. on T6 before the lock (v97): wait on the Strategies screen, no HOLD ("' + r5.msg.slice(0, 90) + '")');
  check(r5.after === r5.k6, '5. v97: the popup closing keeps the route on T6 (the Do Nothing confirm moves it: test_fb2_v97.js)');
  check(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
