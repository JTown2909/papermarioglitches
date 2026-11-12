/* v99: the console attempts 441170cf (page v98, clip 18-41-14: "lost the seed on turn 6") and 7483f3b1 (page v97), numbers
 * only in fixtures/console_v99.json (no picture).
 * 1. T6's beeps cancelled 0.02 s after the plan (441170cf, 171.20 s): the page's screen-lost rule (the step's target screen
 *    off for over 1 s with a plan ahead: cancelPlan) took the T6 plan, made on the Charge's lock before Lakilester's
 *    Strategies screen opens, as a plan whose screen had gone. The T6 plan is early now (kept until its screen has been seen
 *    and gone), the rule logs (planScreenLost), and a T6 plan lost anyway is made again (beeps or an explicit No edge).
 * 2. T6's Charge not triggered (7483f3b1, 229.29 s): T4's carry was gone (196.9 s), so the Peach Beam's hide (207.65 s) set
 *    no T5 mark (fb14HideWatch returned without a carry, and did not run on T6's step), and fb14ArmOk held the FB2 reader for
 *    T4's confirm + 45 s (246.3 s). The mark is set without a carry now.
 * usage: node test_console_v99.js   [PAGE=built standalone page] */
const fs = require('fs'), path = require('path');
const SP = '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad';
const PAGE = process.env.PAGE || SP + '/timeout_timer_v99/timeout_timer_standalone.html';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v99.json'), 'utf8'));
const T6 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fb2_t6dn.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const ev = (k, n) => FIX[k].events.filter(e => e.ev === n);
// --- 1. the log (numbers) ---
const L6 = '441170cf_t6', trig = ev(L6, 'chargeTrigger')[0], seen = ev(L6, 'fb2Seen')[0], lock = ev(L6, 'fb2Lock')[0], plan = ev(L6, 'fb2PlanP')[0], canc = ev(L6, 'beepsCancelled')[0], conf = ev(L6, 'fb2Confirm')[0], hide = ev(L6, 'barHide').filter(e => e.t < trig.t).pop();
ok(lock.t - seen.t > 0 && plan.t - lock.t < 30 && canc.t - plan.t <= 25 && canc.n === 3 && plan.pp >= +FIX[L6].settings.zwedge, '1. 441170cf T6: popup closed k ' + seen.k + ', lock ' + (lock.t / 1000).toFixed(2) + ' s (' + lock.states + ' states), plan k ' + plan.k + ' (pp ' + plan.pp.toFixed(2) + ' >= Best chance ' + FIX[L6].settings.zwedge + '), its 3 beeps cancelled ' + (canc.t - plan.t) + ' ms later');
ok(conf.err > 1000, '1. no plan after it; Do Nothing confirmed ' + ((conf.t - plan.t) / 1000).toFixed(0) + ' s later (err +' + conf.err.toFixed(0) + ', unplanned)');
// the timing: the popup closes on k 76, Lakilester's menu opens 17 frames later (t6dn_log.py); k 132 is the plan's frame
const menuK = seen.k + 17, dk = plan.k - seen.k;
ok(menuK < plan.kFirst && dk * 33.4 / 1000 > 1.8 && dk * 33.4 / 1000 < 2.0, '1. the plan\'s frame k ' + plan.k + ' is ' + dk + ' frames (' + (dk * 33.4 / 1000).toFixed(2) + ' s) after the popup closed and ' + (plan.k - menuK) + ' after the menu opened (k ' + menuK + '); its earliest frame ' + plan.kFirst + ' is FB2_PMIN, so the beeps (first one 2 gaps before) all fall with the Strategies screen up');
(async () => {
  if (!fs.existsSync(PAGE)) { console.log('(page tests skipped: no PAGE)'); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0); }
  const { chromium } = require('playwright'), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', off: '-5', vlag: '50', zwedge: '0.4', zwwin: '1', boots: 'ultra' })); } catch (e) {} });
  await p.goto('file://' + PAGE);
  ok(await p.evaluate(() => window.__tot.VERSION) === 'v99', 'page version v99');
  const r = await p.evaluate(({ L, R }) => {
    const T = window.__tot, F = window.__fb2, FB = F.FB2, V = T.V, S = T.SLOG, now = performance.now(), n0 = S.length;
    T.setStep(T.RT().findIndex(s => s.turn === 'fb2_k'));
    T.CHG.trig = { t: now - (L.lock - L.trig) }; FB.rate = 33.427;
    V.lostSince = now - (L.lock - L.hide); V.onAt = now - 30000; V.wasOn = false;      // the step's screen (Strategies) not seen since before the Charge
    const out = {};
    FB.on = true; FB.pObs = null; FB.hyps = [{ s: parseInt(R.s61, 16) >>> 0, nc: R.nc61, ph: R.ph, w: 1 }];
    const pl = F.planPAt(); out.plan = pl && { k: pl.k, pp: pl.pp, none: pl.none || null, kFirst: pl.kFirst }; out.early = !!(T.st.plan && T.st.plan.early);
    out.lost1 = T.planScreenLost(now + (L.canc - L.lock), now + (L.canc - L.lock)); out.kept = !!T.st.plan;
    // v98's plan (not early) on the same picture: cancelled, and the T6 plan is then made again
    T.st.plan.early = false; out.lost0 = T.planScreenLost(now + (L.canc - L.lock), now + (L.canc - L.lock)); out.lostFlag = !!(FB.plan && FB.plan.lost);
    T.st.planTry = 0; T.makePlan(); out.re = !!T.st.plan; out.reMsg = T.st.msg;
    // the screen seen after the plan, then gone 1.1 s (the Do Nothing closed it): only then may the rule act
    V.onAt = now + 600; V.lostSince = now + 900; out.lost2 = T.planScreenLost(now + 2050, now + 1000);
    out.ev = S.slice(n0).map(e => e.ev);
    // a T6 plan under the edge after a loss: an explicit No edge
    FB.plan = { k: 140, lost: true }; T.st.plan = null; FB.hyps = [{ s: 0x12345678, nc: 70, ph: [25, 75], w: 1 }]; document.getElementById('s-zwedge').value = '1.01';
    T.makePlan(); out.noEdge = T.st.msg; out.noPlan = !T.st.plan; document.getElementById('s-zwedge').value = '0.4';
    return out;
  }, { L: { trig: trig.t, lock: lock.t, canc: canc.t, hide: hide.t }, R: T6.emulatorCheck.find(x => x.seed === '0badc0de') || T6.emulatorCheck[0] });
  ok(r.plan && r.plan.k != null && r.early, '1. the T6 plan beeps k ' + (r.plan && r.plan.k) + ' (pp ' + (r.plan && r.plan.pp && r.plan.pp.toFixed(2)) + ') and is marked early (made before its screen)');
  ok(r.lost1 === false && r.kept, '1. 441170cf\'s picture 23 ms after the plan, screen off since the Charge: the plan and its beeps are kept');
  ok(r.lost0 === true && r.lostFlag && r.re && r.ev.includes('planScreenLost') && r.ev.includes('fb2Replan'), '1. a T6 plan lost all the same (v98\'s not-early plan): logged planScreenLost, and made again (fb2Replan; ' + (r.re ? 'beeps' : r.reMsg) + ')');
  ok(r.lost2 === true, '1. after the Strategies screen was seen and gone 1 s, a plan still ahead is cancelled (as v82)');
  ok(r.noPlan && /^No edge/.test(r.noEdge || ''), '1. a lost T6 plan with no frame over Best chance: "' + (r.noEdge || '').slice(0, 70) + '…"');
  // --- 2. 7483f3b1: the T5 mark without a carry, and the T6 Charge's hide armed
  { const E2 = FIX['7483f3b1_t6'].events, g = n => E2.filter(e => e.ev === n), p4 = g('fb14ConfirmBeforeLock')[0].t, gone = g('fb14CarryGone')[0].t, hides = g('barHide');
    ok(gone < p4 && hides.length === 2 && g('fb2ConfirmNoTrig').length === 1 && !g('chargeTrigger').length && !g('fb14Peach').length, '2. 7483f3b1: carry gone ' + (gone / 1000).toFixed(1) + ' s, T4 confirmed ' + (p4 / 1000).toFixed(1) + ' s (before a lock), Peach hide ' + (hides[0].at / 1000).toFixed(2) + ' s set no mark, the T6 Charge\'s hide ' + (hides[1].at / 1000).toFixed(2) + ' s no trigger');
    const r2 = await p.evaluate(({ p4, h1, h2 }) => {
      const T = window.__tot, X = window.__fb14, FB = X.FB14; X.reset(); T.setStep(T.RT().findIndex(s => s.turn === 'fb2_k'));
      const base = performance.now() - 300000, at = x => base + x; FB.p4t = at(p4); FB.pT = { 4: at(p4) };
      const v98 = X.armOk({ id: 'fb2' }, at(h2));
      for (let x = p4 + 100; x < h1 + 600; x += 33.4) X.frame(at(x), x < h1);
      return { v98, pb: FB.pb && Math.round(FB.pb.t - base), F: FB.pb ? FB.pb.F : 'none', arm: X.armOk({ id: 'fb2' }, at(h2)), armEarly: X.armOk({ id: 'fb2' }, at(h1 + 15000)) };
    }, { p4, h1: hides[0].at, h2: hides[1].at });
    ok(r2.v98 === false, '2. without the mark the T6 Charge\'s hide is held (T4\'s confirm + 45 s): v98\'s no trigger');
    ok(r2.pb != null && Math.abs(r2.pb - hides[0].at) < 40 && r2.F === null, '2. the Peach Beam\'s hide sets the T5 mark with no carry (at ' + r2.pb + ', no frame)');
    ok(r2.arm === true && r2.armEarly === false, '2. the T6 Charge\'s hide 21.6 s after it arms the reader (a hide 15 s after it does not)'); }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
