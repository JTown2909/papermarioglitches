/* v116 (charge_live/README.md v116): Final Bowser after a real Phase 1 (console log 484e3220 and clip 16-06-01, Nov 17).
 *  1. Phase 2 T1's kept read (a no-lock live, v114): the aura search now also sends each effect's best stage-1 candidates on
 *     to stage 2 (CHG_M2_OWN); the read locks 9fdf5e3e, 1401 steps before the T2 lock 6cfbc1df (the stream the T2 lock and the
 *     T4 lock on it carry). T2 still locks 6cfbc1df.
 *  2. The Phase 1 Charge (kept as "Hallway Bowser T1": the route had been stepped back there) read with the Phase 1 profile
 *     (fbp1: the aura read): 9bb456e7 on the first placement, the seed the Hallway profile locked on its third.
 *  3. No wrong lock on the earlier Final Bowser no-locks that v114 still leaves no-locks (8cc2055f T1, 39b88e3a T1; their best
 *     is the true seed at 1.76x, a lock only on it would pass).
 *  4. The Phase 1 step: its read moves the route to Phase 2 T1's Charge step; that step arms no read and keeps the route on
 *     screen closes for FBP1_HOLD; nothing is planned or beeped; the status line says so; a Phase 1 no-lock moves on the same way.
 *  5. The Hallway step back (hwRetry, a long hide on the way into Final Bowser) keeps the Hallway's last seen time, so the
 *     arena gate measures Final Bowser from the Hallway's real end.
 * The kept reads hold pictures, so they are read from the session logs in the uploads folder, never copied into the repository;
 * 1-3 are skipped (and said so) when the logs are not there.  usage: node test_v116.js [PAGE=...] */
const fs = require('fs');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const U = '/root/.claude/uploads/4de37507-9387-5f1e-bab5-10167305f887', L1612 = U + '/484e3220-pm-rng-log-2026-11-17_16-12-04.json';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const back = (s, n) => { let x = s >>> 0; for (let i = 0; i < n; i++) x = Math.imul((x - 1) >>> 0, 0x6A76AE6D) >>> 0; return x; };
const stepsBack = (from, to, max) => { let x = from >>> 0; for (let k = 0; k <= max; k++) { if (x === (to >>> 0)) return k; x = back(x, 1); } return -1; };
(async () => {
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const open = async () => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', boots: 'ultra', lead: '1.5', zwwin: '1' })); } catch (e) {} });
    await p.goto('file://' + PAGE); return p; };
  const p = await open();
  ok(await p.evaluate(() => window.__tot.VERSION) === 'v124', '0. page version v116');
  const replay = (cap, opts) => p.evaluate(async ({ cap, opts }) => { const r = await window.__tot.chgReplay(cap, opts || {}); return { state: r.state, best: r.best, alt: r.alt }; }, { cap, opts });
  if (!fs.existsSync(L1612)) console.log('skip 1-3: the session logs are not in ' + U);
  else {
    const log = JSON.parse(fs.readFileSync(L1612, 'utf8')), C = log.chargeCaptures;
    // ---- 1. Phase 2 T1 after a real Phase 1
    const t1 = await replay(C[1]), t2 = await replay(C[2]);
    console.log('1.', JSON.stringify({ t1, t2 }));
    ok(C[1].result.outcome === 'nolock' && t1.state === 'locked' && t1.best.seed === '9fdf5e3e', '1. Phase 2 T1 (live v114: no lock) locks ' + (t1.best && t1.best.seed + ' ' + t1.best.score + ' ' + t1.best.ratio + 'x'));
    const k = t1.best ? stepsBack(0x6cfbc1df, parseInt(t1.best.seed, 16), 9000) : -1;
    ok(k >= 500 && k <= 9000, '1. the T1 seed is ' + k + ' steps before the T2 lock 6cfbc1df (the T2 / T4 stream; 22.5 s between the Charges)');
    ok(t2.state === 'locked' && t2.best.seed === '6cfbc1df', '1. T2 still locks 6cfbc1df (' + (t2.best && t2.best.score) + ')');
    // ---- 2. the Phase 1 Charge with the Phase 1 profile
    const p1 = await replay(Object.assign({}, C[0], { prof: 'fbp1' }), { maxAlts: 0 });
    console.log('2.', JSON.stringify(p1));
    ok(C[0].stepT === 'Hallway Bowser T1' && C[0].result.seed === '9bb456e7' && C[0].result.alt === 2, '2. live: the Phase 1 Charge read on the Hallway step, 9bb456e7 on the third placement (' + C[0].result.score + ', ' + C[0].result.ratio + 'x)');
    ok(p1.state === 'locked' && p1.best.seed === '9bb456e7' && p1.alt === 0 && p1.best.ratio >= 2, '2. the Phase 1 profile: ' + (p1.best && p1.best.seed + ' ' + p1.best.score + ' ' + p1.best.ratio + 'x') + ' on the first placement');
    // ---- 3. earlier no-locks stay no-locks
    // their best is the true seed (on the stream of the same fight's next lock: 6252 steps before T4's 6debf768, 2465 before
    // T2's cb89ffbc) under the 1.8x ratio: a lock would be right, but neither v114 nor v116 makes one
    for (const [f, i, next, truth] of [['8cc2055f-pm-rng-log-1794343342044.json', 0, 0x6debf768, 'ec60ec34'], ['39b88e3a-pm-rng-log-1794668604033.json', 3, 0xcb89ffbc, '1c403dbf']]) {
      if (!fs.existsSync(U + '/' + f)) { console.log('skip 3 ' + f); continue; }
      const c = JSON.parse(fs.readFileSync(U + '/' + f, 'utf8')).chargeCaptures[i], r = await replay(c), kk = stepsBack(next, parseInt(truth, 16), 9000);
      ok(c.result.outcome === 'nolock' && (r.state === 'nolock' || (r.best && r.best.seed === truth)), '3. ' + f.slice(0, 8) + ' ' + c.stepT + ': ' + r.state + ', best ' + (r.best && r.best.seed + ' ' + r.best.score + ' ' + r.best.ratio + 'x') + ' (the true seed ' + truth + ', ' + kk + ' steps before the next lock): no wrong lock');
    }
  }
  // ---- 4. the Phase 1 step
  { const r = await p.evaluate(() => {
      const T = window.__tot, E = T.v111.ev, R = T.RT(), out = {}, p1 = R.findIndex(s => s.fbp1), c1 = R.findIndex(s => s.fb14 === 1 && s.fb14role === 'charge');
      out.p1 = p1; out.c1 = c1; out.p1t = p1 >= 0 ? R[p1].t : null; out.prof = (T.setStep(p1), T.v109.chgProfNow());
      out.lineOn = /Phase 1: its T1 Super Charge is read here/.test(E('fbp1Line()'));
      const run = (outcome, best) => { T.setStep(p1); E('fbp1Reset()'); T.chgReset(); const now = performance.now(); E('CHG').prof = E('CHG_PROF').fbp1; E('CHG').info = { best, mario: 17.1 }; E('CHG').trig = { t: now };
        const n0 = T.SLOG.length; E('fbp1Done')(outcome); const ev = T.SLOG.slice(n0).find(e => e.ev === 'fbP1Read');
        return { ev, step: T.step(), chg: E('CHG').state, arm: E('fbp1ArmOk')(E('CHG_PROF').fb1, now + 30000), armLate: E('fbp1ArmOk')(E('CHG_PROF').fb1, now + 95000), keep: E('fbp1KeepStep')(T.RT()[T.step()], now + 40000), keepLate: E('fbp1KeepStep')(T.RT()[T.step()], now + 95000),
          line: E('fbp1Line()').replace(/<[^>]+>/g, ''), plan: !!E('st').plan, fb14on: !!E('FB14').on }; };
      out.lock = run('lock', { seed: '9bb456e7', score: 6776, ratio: 2.44 }); out.nolock = run('nolock', { seed: '12345678', score: 2100, ratio: 1.4 });
      // a screen close on Phase 2 T1's Charge step during the hold keeps the route
      T.setStep(p1); E('fbp1Reset()'); E('FBP1').t = performance.now(); T.setStep(c1); E('checkPress')(performance.now() + 1000); out.closeKept = T.step() === c1;
      T.setStep(p1); E('checkPress')(performance.now() + 1000); out.p1Kept = T.step() === p1;
      return out; });
    console.log('4.', JSON.stringify(r).slice(0, 900));
    ok(r.p1 >= 0 && r.c1 === r.p1 + 1 && /^Final Bowser/.test(r.p1t) && r.prof === 'fbp1', '4. the Phase 1 step sits before Phase 2 T1\'s Charge step and reads with the Phase 1 profile (' + r.prof + ')');
    ok(r.lineOn, '4. on the Phase 1 step the status line says its Charge is read and shown only');
    ok(r.lock.ev && r.lock.ev.seed === '9bb456e7' && r.lock.step === r.c1 && r.lock.chg === 'idle' && !r.lock.plan && !r.lock.fb14on, '4. a Phase 1 lock: logged, the route on Phase 2 T1\'s Charge step, the reader idle, no plan, no Final Bowser tracker');
    ok(r.lock.arm === false && r.lock.armLate === true && r.lock.keep === true && r.lock.keepLate === false, '4. Phase 2 T1\'s step arms no read and keeps the route on screen closes for 90 s after the Phase 1 Charge, then as before');
    ok(/seed 9bb456e7 read/.test(r.lock.line) && /Nothing is beeped in Phase 1/.test(r.lock.line), '4. the status line: "' + r.lock.line.trim() + '"');
    ok(r.nolock.ev && r.nolock.ev.outcome === 'nolock' && r.nolock.ev.seed === null && r.nolock.step === r.c1 && /no clear seed/.test(r.nolock.line), '4. a Phase 1 no-lock moves on the same way, no seed shown');
    ok(r.closeKept && r.p1Kept, '4. screen closes keep the route on the Phase 1 step and on Phase 2 T1 during the hold');
  }
  // ---- 5. the Hallway step back keeps the Hallway's last seen time
  { const r = await p.evaluate(() => {
      const T = window.__tot, E = T.v111.ev, R = T.RT(), hi = R.findIndex(s => s.turn === 'hw_spiny');
      T.setStep(hi + 1); const A = E('ARENA'); A.seen.hw = performance.now() - 200000; const was = A.seen.hw;
      E('st').hwDone = false; E('hwRetry')(38866); return { step: T.step(), hi, kept: A.seen.hw === was, ok: E('arenaMoveOk')(R.findIndex(s => s.fbp1), { L: 114, br: 5, lbr: -31 }) }; });
    ok(r.step === r.hi && r.kept && r.ok, '5. the step back to Hallway T1 keeps the Hallway\'s seen time; the Final Bowser move is allowed (' + JSON.stringify(r) + ')');
  }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
