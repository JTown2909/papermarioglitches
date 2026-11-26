/* v151 (the runner: "maybe we just do this instead and forget about manip here": Phase 1 T1 Charge; Spiny Flip, T2 Bounce; Spiny Flip,
 * T3 Star Beam): no Phase 1 plans or beeps (FBP1_MANIP false: fbp1Plan says so), the route's Phase 1 lines read that way, and its steps
 * stay (Charge -> Spiny Flip -> Power Bounce -> Phase 2 T1, held). usage: node test_v151.js [page] */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') >= 'v156', 'page version v151');
  const r = JSON.parse(await E(`(() => { const T = window.__tot, R = T.RT(), p1 = R.findIndex(s => s.fbp1), dn = R.findIndex(s => s.fbp1dn), pb = R.findIndex(s => s.fbp1pb);
    const S = fbNew({ s: 1, nc: 0, f: 400, c: new Uint8Array(20), ph: [0, 0], l: 0, w: 1 }); Object.assign(FBP1, { states: [S], t0: 0, rate: 33.4, lockT: null, ended: false, P: 120, outcome: 'lock' });
    T.setStep(pb); cancelBeeps(); const pl = fbp1Plan(); const beeping = !!(st.plan && st.plan.prof === 'fbp1'); const msg = st.msg; FBP1.states = null;
    const rl = document.getElementById('route-list').textContent;
    return JSON.stringify({ manip: FBP1_MANIP, pl, beeping, msg, order: [p1, dn, pb], t1: /T1: Charge; Spiny Flip/.test(rl), t2: /T2: Bounce; Spiny Flip/.test(rl), t3: /T3: Star Beam/.test(rl), old: /Bounce x5; Do Nothing/.test(rl) }); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.manip === false && r.pl === true && !r.beeping && /^Phase 1: no beeps/.test(r.msg || ''), "Phase 1's Power Bounce step: no plan, no beeps, the message says so");
  ok(r.order[0] >= 0 && r.order[1] === r.order[0] + 1 && r.order[2] === r.order[0] + 2, 'the Phase 1 steps stay (Charge, Spiny Flip, Power Bounce) so the route follows the fight to Phase 2');
  ok(r.t1 && r.t2 && r.t3 && !r.old, 'the route reads T1: Charge; Spiny Flip / T2: Bounce; Spiny Flip / T3: Star Beam');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
