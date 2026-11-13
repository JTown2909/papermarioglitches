/* v97: Final Bowser T6 on the runner's route, "Charge; Do Nothing - Close Call" (charge_live/README.md v97;
 * fixtures/fb2_t6dn.json from fb2_route/t6dn_log.py, emulator, numbers only).
 *  1. The model: the page's fb2AI on the Do Nothing branch (AI on P + 13, the test 52 / 55 / 55 after it, the T7 menu
 *     101 / 134 / 134 after the test) gives every emulator run's attack, Close Call roll and T7 menu from the seed after the
 *     rays; the popup A moves nothing once P is fixed.
 *  2. The plan: Lakilester's Do Nothing beeped on a frame that gives Close Call (the emulator's own outcome there), the beeps
 *     moved by the learned per-lever correction (fb14's store), the edge rule (no beep under Best chance).
 *  3. The confirm: read as T2-T4's Do Nothing (fb14Van('S'): +3.4), into the learned store, carried on FB14_SHIFTS_S, the
 *     route on to T7; the T7 plan from the post-T6 states under the edge rule; Close Call assumed equipped (the hit share is
 *     background).
 *  4. The route step: the Strategies screen, the Charge as its pre, the WAIT headline, no HOLD; the popup closing keeps T6.
 * usage: node test_fb2_v97.js [page] */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const SP = '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad';
const PAGE = process.argv[2] || process.env.PAGE || SP + '/timeout_timer_v102/timeout_timer_standalone.html';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fb2_t6dn.json'), 'utf8'));
let bad = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };
(async () => {
  // ---- 1b. the popup plays no part (emulator)
  const byP = {}; FIX.popupIndep.forEach(r => { (byP[r.P] = byP[r.P] || new Set()).add(r.sP); });
  check(Object.values(byP).every(s => s.size === 1) && FIX.popupIndep.length >= 8, '1. the popup A moves no draw: the seed at a fixed Do Nothing frame is the same for K 77 / 100 / 130 / no press (' + Object.entries(byP).map(([p, s]) => 'P ' + p + ': ' + [...s].join()).join('; ') + ')');
  check(FIX.runs.every(r => r.E - r.P === 13), '1. Bowser\'s AI on the Do Nothing confirm + 13 on all ' + FIX.runs.length + ' runs (as T2-T4)');
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  const L = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v96.json'), 'utf8')).leverStore;      // the runner's six Do Nothing presses (v96): the beeps 0.97 frame earlier
  await p.addInitScript(L => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', off: '0', vlag: '0' })); localStorage.setItem('tot-fb14press-v93', JSON.stringify(L)); } catch (e) {} }, L);
  await p.goto('file://' + PAGE);
  check(await p.evaluate(() => window.__tot.VERSION) === 'v103', 'page version v103');
  // ---- 1. the model against every run
  const m = await p.evaluate(R => { const F = window.__fb2; return R.map(r => { const a = F.ai(parseInt(r.s61, 16), r.nc61, r.phases[0], r.E, true, true); return { a, r }; }); }, FIX.runs);
  const okAtk = m.filter(x => x.a.atk === x.r.attack && x.a.cc === x.r.cc && x.a.T === x.r.T).length, okMenu = m.filter(x => x.r.menu != null).every(x => x.a.menu === x.r.menu);
  check(okAtk === FIX.runs.length, '1. the page\'s Do Nothing model: attack, Close Call roll and test frame on ' + okAtk + ' of ' + FIX.runs.length + ' emulator runs (' + FIX.runs.filter(r => r.lucky).length + ' Close Calls)');
  check(okMenu && m.some(x => x.r.attack === 'claw' && x.r.menu != null) && m.some(x => x.r.attack === 'slam' && x.r.menu != null), '1. the T7 menu after a Close Call: Body Slam +101, Claw / Fire Breath +134 after the test');
  // ---- 2. the plan on the true state of runs with a Close Call frame in reach
  const seeds = [...new Set(FIX.runs.filter(r => r.hp === 1).map(r => r.seed))];
  const pl = await p.evaluate(({ R, seeds }) => {
    const T = window.__tot, F = window.__fb2, FB = F.FB2, out = [];
    document.getElementById('s-fb2t5').value = 'any'; T.CHG.trig = { t: performance.now() - 3000 };
    for (const sd of seeds) {
      const r = R.find(x => x.seed === sd && x.hp === 1);
      FB.on = true; FB.hyps = [{ s: parseInt(r.s61, 16) >>> 0, nc: r.nc61, ph: r.phases[0], w: 1 }]; FB.rate = 33.427;
      const P = F.planPAt(150);
      const sh = P.k != null ? [-1, 0, 1].map(d => F.ai(parseInt(r.s61, 16), r.nc61, r.phases[0], P.k + d + 13, true, true).lucky) : [];
      out.push({ seed: sd, P, sh });
    }
    return { out, bias: F.bias(), dt: (F.dnPressT(160) - F.pressT(160)) / 33.427, van: F.van() };
  }, { R: FIX.runs, seeds });
  for (const o of pl.out) check(o.P.k != null && o.sh[1] && o.P.pp >= 0.75 && o.P.lever === 'nothing', '2. ' + o.seed + ': Do Nothing beeped on +' + o.P.k + ' (perfect press ' + Math.round(100 * o.P.pp) + '%, window ' + o.P.win + '); the model says Close Call there (and on -1 / +1: ' + o.sh[0] + ' / ' + o.sh[2] + ')');
  check(pl.bias < -0.5 && Math.abs(pl.dt - pl.bias) < 1e-6, '2. the beep moves by the learned Do Nothing correction (fb14\'s store ' + L.join(', ') + ': ' + pl.bias.toFixed(2) + ' frame), as T2-T4');
  check(Math.abs(pl.van - (2 - 3.4)) < 1e-9, '2. the confirm is read as T2-T4\'s Do Nothing: the Strategies box closing, ' + pl.van.toFixed(1) + ' (2 - 3.4)');
  // the emulator check (fb2_route/t6dn_log.py): the page plans the Do Nothing on each seed's true state from frame 157; the
  // emulator then pressed Do Nothing on that frame: Close Call on every one
  const ec = await p.evaluate(E => { const T = window.__tot, F = window.__fb2, FB = F.FB2; T.CHG.trig = { t: performance.now() - 3000 };
    return E.map(r => { FB.on = true; FB.hyps = [{ s: parseInt(r.s61, 16) >>> 0, nc: r.nc61, ph: r.ph, w: 1 }]; const P = F.planPAt(r.frm); return P.k; }); }, FIX.emulatorCheck);
  FIX.emulatorCheck.forEach((r, i) => check(ec[i] === r.P && r.lucky, '2. emulator, ' + r.seed + ': the page beeps Do Nothing on +' + ec[i] + '; pressed there, Bowser\'s ' + r.attack + ' rolled ' + r.cc + ': Close Call'));
  const edge = await p.evaluate(() => { const F = window.__fb2, FB = F.FB2; FB.hyps = [{ s: 0x12345678, nc: 70, ph: [25, 75], w: 1 }]; document.getElementById('s-zwedge').value = '1.01'; const x = F.planPAt(150); document.getElementById('s-zwedge').value = '0.5'; return x; });
  check(edge.none && edge.edge, '2. the edge rule: under Best chance no Do Nothing beep ("' + (edge.none || '').slice(0, 60) + '")');
  // ---- 3. the confirm and T7
  const cf = await p.evaluate(R => {
    const T = window.__tot, F = window.__fb2, FB = F.FB2, RT = T.RT(), i = RT.findIndex(s => s.turn === 'fb2_k'), j = RT.findIndex(s => s.turn === 'fb2_pb');
    const r = R.find(x => x.hp === 1); T.setStep(i);
    FB.on = true; FB.hyps = [{ s: parseInt(r.s61, 16) >>> 0, nc: r.nc61, ph: r.phases[0], w: 1 }]; FB.rate = 33.427;
    T.CHG.trig = { t: performance.now() - 5000 };
    const P = F.planPAt(150); FB.plan = Object.assign({}, P, { k: r.P, bias: 0 });
    const n0 = T.leverList('fb14').length, tObs = T.CHG.trig.t + (r.P + F.van() - 16) * 33.427;
    F.confirm(tObs);
    const t7 = FB.t7, n1 = T.leverList('fb14').length, step = T.step();
    const pT7 = F.planT7At(r.menu + 60), plan = FB.t7.plan;
    return { i, j, step, n0, n1, pLucky: t7 && t7.pLucky, states: t7 && t7.states.length, Ps: t7 ? [...new Set(t7.states.map(o => o.P))] : [], plan, logged: T.SLOG.filter(e => /^fb2(Confirm|P|StepByConfirm|PressBias)$/.test(e.ev)).map(e => e.ev) };
  }, FIX.runs);
  check(cf.step === cf.j && cf.logged.includes('fb2StepByConfirm'), '3. the Do Nothing confirm moves the route from T6 to T7 (' + cf.i + ' -> ' + cf.step + ')');
  check(cf.n1 === cf.n0 + 1 && cf.logged.includes('fb2PressBias'), '3. the press goes into the learned store (' + cf.n0 + ' -> ' + cf.n1 + ')');
  check(cf.pLucky > 0.3 && cf.states > 0 && cf.Ps.length >= 3, '3. the confirm carried on FB14_SHIFTS_S: Close Call ' + Math.round(100 * cf.pLucky) + '% over P ' + cf.Ps.join(', '));
  check(cf.plan && (cf.plan.none === 'edge' ? !(cf.plan.pp7 >= 0.5) : cf.plan.pp7 >= 0.5) || (cf.plan && cf.plan.none), '3. T7 planned from the post-T6 states under the edge rule (' + (cf.plan ? (cf.plan.none ? 'no edge: ' + cf.plan.none + ', pp7 ' + cf.plan.pp7 : 'd ' + cf.plan.d + ', pp7 ' + cf.plan.pp7.toFixed(2)) : 'none') + ')');
  // ---- 4. the step and the headline
  const st = await p.evaluate(() => { const T = window.__tot, F = window.__fb2, RT = T.RT(), i = RT.findIndex(s => s.turn === 'fb2_k'), j = RT.findIndex(s => s.fb14 === 4);
    F.FB2.on = false; F.FB2.plan = null; T.setStep(j); T.st.msg = null; T.st.plan = null; T.setStep(i); const h = document.getElementById('headline').textContent, msg = T.st.msg;
    F.seenK(80, 'popup'); return { s: RT[i], h, msg, after: T.step(), i }; });
  check(st.s.cat === 'S' && (st.s.pre || []).some(x => x.id === 'fb2_charge') && !/HOLD/.test(st.s.label) && /Do Nothing on the beep/.test(st.s.label), '4. T6\'s step: Lakilester\'s Strategies screen, the T6 Charge as its pre, "' + st.s.label + '"');
  check(/^WAIT/.test(st.h) && /WAIT on Lakilester's Strategies screen/.test(st.msg) && !/HOLD/.test(st.msg), '4. the headline from the step arming: "' + st.h + '" / "' + st.msg.slice(0, 60) + '…"');
  check(st.after === st.i, '4. the popup closing keeps the route on T6');
  const src = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8') + fs.readFileSync(path.join(__dirname, 'charge_live', 'fb2_live.js'), 'utf8');
  check(!/HOLD THE \+3 POPUP|FB2_HOLD/.test(src), '4. no HOLD-the-popup headline left');
  check(/\(1 - pL\) \/ pL/.test(src), '3. Close Call assumed equipped (v95): the hit share (1 - pLucky) is background before a T7 beep');
  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  await b.close(); console.log(bad ? bad + ' FAILED' : 'all ok'); process.exit(bad ? 1 : 0);
})();
