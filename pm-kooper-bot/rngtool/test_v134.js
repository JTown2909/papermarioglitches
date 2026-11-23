/* v134: (1) lag (console 20:36 T1-T2: 300-630 ms page stalls after the lock and the T2 Charge's input): a live plan or tick
 * that finds the states more than FB14_CATCH_F frames behind leaves them to the prefetch (FB14_CATCH_MS a picture) and plans
 * once they are there; (2) the T4 re-read (console 20:36 T4: the carry failed, the placement re-read crashed on the reset
 * reader's CHG.info, its full fit list was lost and no T4 lock came): the re-read survives a reset reader. Part 2 replays the
 * log's T4 Charge capture when the log is here (LOG; the captures are pictures, not committed); else it is skipped.
 * (3) a T1-T3 Body Slam that hits splits into a guarded copy (no rand_int(2) x 2, no 3 x 6 sparks: emulator) and an unguarded one;
 * (4) the backup T7's Body Slam / Claw carry splits the same way (Phase 1's guarded tables).
 * usage: node test_v134.js [page] */
const { chromium } = require('playwright'), fs = require('fs');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const LOG = process.env.LOG || '/root/.claude/uploads/4de37507-9387-5f1e-bab5-10167305f887/63b2fac9-pm-rng-log-2026-11-22_20-36-31.json';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE);
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E(`VERSION`) === 'v134', 'page version v134');
  // (1) the catch-up
  const r1 = JSON.parse(await E(`(() => { const T = window.__tot, X = window.__fb14, V = X.v134; X.reset();
    T.setStep(T.RT().findIndex(s => s.fb14 === 3 && s.fb14role === 'lever'));
    const mk = i => fbNew({ s: (i * 2654435761) >>> 0, nc: 30 + (i % 24), f: 1000, c: Uint8Array.from([2, 0, 1, 1, 0, 1, 2, 0, 1, 1, 1, 0, 1, 1, 2, 1, 1, 0, 0, 0]), ph: [i % 130, i % 220], l: 0, w: 1 / 6000, out: { 1: { atk: 'fire', miss: true, v: 10 }, 2: { atk: 'claw', miss: true, v: 10 } } });
    FB14.states = Array.from({ length: 6000 }, (_, i) => mk(i)); FB14.on = true; FB14.rate = fbRate(); FB14.M = { 3: 1000 }; FB14.pT = {};
    const now = performance.now(); FB14.lastT = now; FB14.t0 = now + num('vlag') - (1000 + 200 + 10) * fbRate();     // the horizon ~1200: 200 frames ahead of the states
    const h = V.horizon(now), lag0 = V.lag(h); const t1 = performance.now(); const rp = fb14Plan(); const planMs = performance.now() - t1;
    const f0 = FB14.states[0].f, waited = FB14.cuPlan === true && !!FB14.cu, slices = []; let n = 0;
    while (FB14.cu && n < 200) { const t = performance.now(); V.prefetch(V.CATCH_MS); slices.push(performance.now() - t); V.behind(performance.now()); n++; }
    const lag1 = V.lag(V.horizon(performance.now())), logs = X.slogTail(30).map(e => e.ev);
    // past FB14_CATCH_MAX the plan steps the states itself, as before
    FB14.states.forEach(S => { S.f = 1000; }); FB14.cu = null; V.behind(performance.now()); FB14.cu.t -= V.CATCH_MAX + 1; const late = V.behind(performance.now());
    return JSON.stringify({ h, lag0, rp, planMs, f0, waited, n, maxSlice: Math.max(...slices), lag1, logs: logs.filter(x => /Catch|Caught/.test(x)), late, F: V.CATCH_F }); })()`));
  ok(r1.lag0 > 150 && r1.rp === true && r1.waited && r1.f0 === 1000 && r1.planMs < 30, '1. the states ' + r1.lag0 + ' frames behind: the plan waits for the prefetch (' + r1.planMs.toFixed(1) + ' ms, the states not stepped)');
  ok(r1.n > 1 && r1.maxSlice < 40 && r1.lag1 <= r1.F, '1. the prefetch catches them up in ' + r1.n + ' slices of at most ' + r1.maxSlice.toFixed(1) + ' ms (lag now ' + r1.lag1 + ')');
  ok(r1.logs.includes('fb14CatchUp') && r1.logs.includes('fb14CaughtUp'), '1. logged: ' + r1.logs.join(', '));
  ok(r1.late === false, '1. after FB14_CATCH_MAX the plan steps the states itself');
  const src = await E(`String(fb14Frame).includes('fb14Prefetch(FB14_CATCH_MS)') && String(fb14Tick).includes("fb14Behind(performance.now())) return 'behind'")`);
  ok(src === true, '1. the picture loop runs the catch-up and the tick defers to it');
  // (2) the T4 re-read with the reader reset meanwhile
  if (fs.existsSync(LOG)) {
    const Lg = JSON.parse(fs.readFileSync(LOG, 'utf8')), Ev = Lg.events, cap = Lg.chargeCaptures.find(c => c.stepT === 'Final Bowser T4');
    const tr = Ev.find(e => e.ev === 'chargeTrigger' && e.t > 1200000), hide = Ev.filter(e => e.ev === 'barHide' && e.at < tr.t).pop();
    const r2 = await p.evaluate(async ({ cap, t0 }) => { const T = window.__tot, X = window.__fb14; X.reset();
      window.__tot.v111.ev(`(() => { const R0 = fb14Refine1; fb14Refine1 = (res, G) => { CHG.info = null; return R0(res, G); }; return 1; })()`);
      T.setStep(T.RT().findIndex(x => x.fb14 === 4 && x.fb14role === 'charge'));
      const rr = await T.chgReplay(cap, { fb14: true, t0 }); const tl = X.slogTail(60);
      return { state: rr.state, on: X.FB14.on, n: X.FB14.states.length, err: tl.filter(e => e.ev === 'fb14PlacementError').map(e => e.msg), place: (tl.filter(e => e.ev === 'fb14Placement').pop() || {}).kept, lock: tl.filter(e => e.ev === 'fb14Lock').map(e => e.how + ' ' + e.a) }; }, { cap, t0: hide.at - cap.hideMs });
    ok(!r2.err.length && r2.place === -1 && r2.on && r2.n > 0 && r2.lock.length, '2. 20:36 T4 with the reader reset during the re-read: placement ' + r2.place + ', ' + r2.lock.join(', ') + ', ' + r2.n + ' states' + (r2.err.length ? ' ERR ' + r2.err[0] : ''));
  } else console.log('(2 skipped: the 20:36 log is not here)');
  // (3) the guarded Body Slam (fixtures/t3_slam_guard.json: emulator, T3, the same seed unguarded and with the A on the hit - 2)
  const FX = fs.readFileSync(__dirname + '/fixtures/t3_slam_guard.json', 'utf8');
  const r3 = JSON.parse(await E(`JSON.stringify(${FX}.runs.map(X => { const mk = gd => { const S = fbNew({ s: parseInt(X.s0, 16) >>> 0, nc: X.nc, f: X.h, c: Uint8Array.from(X.c), ph: X.ph, l: 0, w: 1 }); S.out = { 3: { atk: X.atk } }; S.gd2 = gd; fbEv(S, { k: 'test', f: X.h, turn: 3 }); return S; };
    const run = S => { let kid = null, bad = null, kbad = null; for (let i = 0; i < X.s1.length; i++) { fbStep(S); if (S.kids && !kid) { kid = S.kids[0]; S.kids = null; } if (kid && kid.f < S.f) fbStep(kid);
      if (bad == null && (S.s >>> 0) !== parseInt(X.s1[i], 16)) bad = i; if (kid && kbad == null && (kid.s >>> 0) !== parseInt(X.s1[i], 16)) kbad = i; } return { bad, kid: !!kid, kbad, kw: kid && kid.w, pw: S.w }; };
    return { guard: X.guard, n: X.s1.length, split: run(mk(undefined)), fixed: run(mk(X.guard ? 1 : 0)) }; }))`));
  for (const x of r3) { const g = x.guard != null; ok(x.fixed.bad == null && (g ? x.split.kbad == null && x.split.bad != null : x.split.bad == null && x.split.kbad != null) && x.split.kid && Math.abs(x.split.kw - 0.7) < 1e-9,
    '3. T3 Body Slam ' + (g ? 'guarded' : 'unguarded') + ': ' + x.n + ' frames exact as the ' + (g ? 'guarded copy' : 'state itself') + ' of the split (the other copy off from frame ' + (g ? x.split.bad : x.split.kbad) + ')'); }
  // (4) the backup T7's Body Slam / Claw carry: guarded and unguarded copies, the guarded one with only the 10 sparks
  const r4 = JSON.parse(await E(`(() => { const out = {}; for (let s = 1; s < 6000 && Object.keys(out).length < 2; s++) { const S0 = { s: (s * 2654435761) >>> 0, nc: 99999 }; const a = fb2AI7(S0, 100, [44, 194], true, true);
      if ((a.atk === 'slam' || a.atk === 'claw') && !out[a.atk]) { const g = fb2AI7(S0, 100, [44, 194], true, true, true); let n = 0, x = a.S.s >>> 0; const y = g.S.s >>> 0; out[a.atk] = { T: a.T - 100, Tg: g.T - 100, gd: [a.gd, g.gd], same: x === y }; } } return JSON.stringify(out); })()`));
  ok(r4.slam && r4.slam.T === 212 && r4.slam.Tg === 144 && r4.claw && r4.claw.T === 279 && r4.claw.Tg === 126 && !r4.slam.same && !r4.claw.same, '4. the backup T7 hit guarded: the T8 menu on AI + ' + (r4.slam && r4.slam.Tg) + ' (slam) / ' + (r4.claw && r4.claw.Tg) + ' (claw), other draws than unguarded');
  ok(await E(`String(fb2SetP).includes('FB2B_GUARD')`) === true, '4. the T8 carry keeps both copies (FB2B_GUARD of the weight guarded)');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
