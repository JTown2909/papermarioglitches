/* v134: (1) lag (console 20:36 T1-T2: 300-630 ms page stalls after the lock and the T2 Charge's input): a live plan or tick
 * that finds the states more than FB14_CATCH_F frames behind leaves them to the prefetch (FB14_CATCH_MS a picture) and plans
 * once they are there; (2) the T4 re-read (console 20:36 T4: the carry failed, the placement re-read crashed on the reset
 * reader's CHG.info, its full fit list was lost and no T4 lock came): the re-read survives a reset reader. Part 2 replays the
 * log's T4 Charge capture when the log is here (LOG; the captures are pictures, not committed); else it is skipped.
 * (3) a T1-T3 Body Slam that hits splits into a guarded copy (no rand_int(2) x 2, no 3 x 6 sparks: emulator) and an unguarded one;
 * (4) the backup T7's Body Slam / Claw carry splits the same way (Phase 1's guarded tables).
 * (5) the backup T7's hit is read off the HP ones digit (templates from the 20:33 clip's countdown) and weighs guarded / unguarded.
 * (6) v135: no bolt is read while Bowser's turn moves the battle camera (AI + 1 to the next menu).
 * usage: node test_v134.js [page] */
const { chromium } = require('playwright'), fs = require('fs');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const LOG = process.env.LOG || '/root/.claude/uploads/4de37507-9387-5f1e-bab5-10167305f887/63b2fac9-pm-rng-log-2026-11-22_20-36-31.json';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE);
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E(`VERSION`) === 'v150', 'page version v134');
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
  // (5) the backup T7's hit read off the HP ones digit
  const r5 = JSON.parse(await E(`(() => { const V = window.__fb2.v134, T = V.T, out = { ok: 0, n: 0 };
    let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (const d in T) for (let k = 0; k < 20; k++) { let m = T[d].split(''); for (let j = 0; j < 2; j++) { const i = Math.floor(rnd() * m.length); m[i] = m[i] === '1' ? '0' : '1'; } out.n++; if (V.onesDigit(m.join('')) === +d) out.ok++; }
    out.blank = V.onesDigit('0'.repeat(72));
    const R = window.__tot, i8 = R.RT().findIndex(x => x.b8); R.setStep(i8); FB2B.on = true; FB2.pT = 1000;
    const mk = (atk, gd) => ({ a: { atk, gd, lucky: true }, w: 0.25 });
    FB2.t7 = { states: [mk('slam', false), mk('slam', true), mk('claw', false), mk('claw', true)] };
    window.__fb2OnesTest = () => T['3']; window.__fb2TensVal = 0;
    for (let k = 0; k < 30; k++) V.watch(3000 + k * 16.7, true);
    out.read = FB2.t7.hpRead; out.w = FB2.t7.states.map(o => o.w);
    delete window.__fb2OnesTest; delete window.__fb2TensVal; FB2B.on = false; FB2.t7 = null; FB2.pT = null;
    return JSON.stringify(out); })()`));
  ok(r5.ok === r5.n && r5.blank === null, '5. the HP ones digit: ' + r5.ok + ' / ' + r5.n + ' templates with 2 cells flipped read right, a blank box reads none');
  ok(r5.read === 3 && r5.w.every(x => x === 0.25), '5. backup T7, HP 3 held: read and logged, no weight changed (v136: the HP table is unmeasured) (' + r5.w.map(x => x.toFixed(3)).join(' ') + ')');
  // (6) v135: no bolt read while Bowser's turn moves the camera (the 20:36 log's frames)
  const r6 = JSON.parse(await E(`(() => { const sv = [FB14.inputs, FB14.hits, FB14.M, FB14.t0, FB2.pObs, FB2B.on];
    FB14.inputs = [{ kind: 'cn', F: 125, turn: 1 }, { kind: 'skip', F: 426, turn: 1 }, { kind: 'nothing', F: 983, turn: 2 }, { kind: 'jelly', F: 1171, turn: 3 }, { kind: 'nothing', F: 1422, turn: 3 }];
    FB14.hits = { 3: true }; FB14.M = { 2: 659, 4: 1942 }; FB14.t0 = null;
    const V = window.__fbbV135, m = F => V.moving({ k: 'fb14', F }), out = { f577: m(577), f636: m(636), f795: m(795), f955: m(955), f1393: m(1393), f1606: m(1606), f1674: m(1674), f1950: m(1950), w: V.wins('fb14') };
    FB2.pObs = 167; FB2B.on = true; out.b318 = V.moving({ k: 'fb2', F: 318 }); out.b156 = V.moving({ k: 'fb2', F: 156 });
    [FB14.inputs, FB14.hits, FB14.M, FB14.t0, FB2.pObs, FB2B.on] = sv; return JSON.stringify(out); })()`));
  ok(r6.f577 && r6.f1606 && r6.f1674 && r6.b318, '6. the 20:36 reads inside Bowser\'s turns are not taken: T1 577 (fire), T3 1606 / 1674 (slam, death), backup T7 318');
  ok(!r6.f636 && !r6.f795 && !r6.f955 && !r6.f1393 && !r6.f1950 && !r6.b156, '6. the menu reads still are: 636, 795, 955, 1393, 1950, backup 156 (windows ' + JSON.stringify(r6.w) + ')');
  // (7) v137: Phase 1's budgeted advance after the Do Nothing cut the list (console 17:09: a stale FBP1.pfI past the new list's end threw)
  const r7 = JSON.parse(await E(`(() => { const sv = [FBP1.states, FBP1.pfI, FBP1.pfRef]; const mk = i => fbNew({ s: i + 1, nc: 9999, f: 100, c: new Uint8Array(20), ph: [0, 0], l: 0, w: 1 });
    FBP1.pfRef = Array.from({ length: 400 }, (_, i) => mk(i)); FBP1.pfI = 350; FBP1.states = Array.from({ length: 50 }, (_, i) => mk(i)); let err = null;
    try { fbp1Advance(120, 5); } catch (e) { err = String(e); } const f = FBP1.states.map(S => S.f); [FBP1.states, FBP1.pfI, FBP1.pfRef] = sv; return JSON.stringify({ err, ok: f.every(x => x >= 120) }); })()`));
  ok(r7.err === null && r7.ok, '7. Phase 1: the budgeted advance after the list shrank runs from its start (no throw)' + (r7.err ? ' ERR ' + r7.err : ''));
  // (8) v137 (console 17:28): a retry with the route left on Phase 1's Do Nothing step: an earlier attempt's read (60 s+) holds neither
  // the reader nor the confirm
  const r8 = JSON.parse(await E(`(() => { const T = window.__tot, sv = [FBP1.outcome, FBP1.lockT, FBP1.states, FBP1.t0, FBP1.ended], now = performance.now(), P = { id: 'fbp1' };
    T.setStep(T.RT().findIndex(s => s.fbp1dn)); FBP1.outcome = 'lock'; FBP1.states = [fbNew({ s: 1, nc: 1, f: 0, c: new Uint8Array(20), ph: [0, 0], l: 0, w: 1 })]; FBP1.t0 = now - 5000; FBP1.ended = false;
    FBP1.lockT = now - 120000; const oldArm = fbp1ArmOk(P, now), oldOn = fbp1On();
    FBP1.lockT = now - 5000; const newArm = fbp1ArmOk(P, now), newOn = fbp1On();
    [FBP1.outcome, FBP1.lockT, FBP1.states, FBP1.t0, FBP1.ended] = sv; return JSON.stringify({ oldArm, oldOn, newArm, newOn }); })()`));
  ok(r8.oldArm === true && r8.oldOn === false && r8.newArm === false && r8.newOn === true, '8. Phase 1 retry: a 2-minute-old read neither blocks the reader nor takes the confirm; a 5-second-old one does (' + JSON.stringify(r8) + ')');
  // (9) v139: a Final Bowser 1-frame pick moves to a 2+ frame window within PP_WIDE_TOL (perfect press)
  const r9 = JSON.parse(await E(`(() => { const mk = v => { const sh = new Float64Array(20); sh[5] = 0.80; sh[12] = v; sh[13] = v + 0.01; sh[14] = v; return sh; };
    const pk = { ok: true, target: 105, run: { start: 105, end: 105, length: 1 } };
    const A = ppWiden(pk, mk(0.77), 100, 119, 100, 19, 't'), B = ppWiden(pk, mk(0.70), 100, 119, 100, 19, 't'), C = ppWiden({ ok: true, target: 105, run: { start: 104, end: 106, length: 3 } }, mk(0.77), 100, 119, 100, 19, 't');
    return JSON.stringify({ A: [A.target, A.run.length], B: [B.target, B.run.length], C: C.target, tol: PP_WIDE_TOL }); })()`));
  ok(r9.A[0] === 113 && r9.A[1] === 3 && r9.B[0] === 105 && r9.C === 105, '9. 1-frame 80% beside a 3-frame 77-78% window: moves to it (' + r9.A + '); beside 70-71%: stays (' + r9.B + '); a 3-frame pick is left alone');
  const src9 = await E(`[String(zwChoose).includes("ppWiden(pk, share, a, b, from, W, 'fb14')"), String(fb2PlanT7).includes('ppWiden('), String(fbp1Plan).includes('ppWiden(')].join()`);
  ok(src9 === 'true,true,true', '9. T1-T4, the T7 / T8 Power Bounce and Phase 1 widen their 1-frame picks');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
