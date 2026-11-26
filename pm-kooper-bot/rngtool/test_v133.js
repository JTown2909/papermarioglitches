/* v133: (1) Final Bowser Phase 1's route moves to the Do Nothing step at the Charge burst (console 20:20, log e284a73c: the read
 * locked after Lakilester's Do Nothing, the route was still on the Charge step and never reached the Power Bounce), and its
 * Strategies close counts from 2 frames; (2) Phase 1 is battle 2303: the continue thresholds (chance 50), the damage stars, the
 * guard on every attack (test_v132 replays the 28 emulator logs); (3) an fb14 press read against the frame its beeps marked when
 * a lock's clock fix moved the clock after them (console 20:29 T2: +3.03 read, ~1 of it the runner's); (4) the backup T7 is
 * "No Wave or Shield": Bowser's shield (the Star Rod recast) counts as a success, and after it T8 has no modelled states. */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE);
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E(`VERSION`) === 'v154', 'page version v133');
  // (1) the burst moves the route; the Strategies close rule
  const r1 = JSON.parse(await E(`(() => { const T = window.__tot, r = T.RT(), p1 = r.findIndex(s => s.fbp1), dn = r.findIndex(s => s.fbp1dn);
    T.setStep(p1); const before = routeStep; fbp1Trigger(); const after = routeStep; const min = closeMinMs();
    T.setStep(p1); const minM = closeMinMs(); return JSON.stringify({ p1, dn, before, after, min, minM, frame: FRAME }); })()`));
  ok(r1.p1 >= 0 && r1.before === r1.p1 && r1.after === r1.dn, '1. a Charge burst on Phase 1\'s Charge step moves the route to the Do Nothing step (' + r1.before + ' -> ' + r1.after + ')');
  ok(r1.min > r1.frame, '1. (v151: that step is Lakilester\'s Spiny Flip now, a target screen: its close rule) ' + r1.min.toFixed(1) + ' ms');
  // (2) Phase 1's thresholds, the guard split on every attack
  const r2 = JSON.parse(await E(`(() => { const out = { th: FB14_PBTH1.slice(0, 5) };
    const S = fbNew({ s: 0x12345678, nc: 400, f: 300, c: new Uint8Array(20), ph: [44, 194], l: 0, w: 1 }); S.p1m = 1; S.gd = null; S.aiF = 312; fbEv(S, { k: 'ai', f: 312, turn: 1 });
    FBP1.states = [S]; fbp1Advance(320); out.n = FBP1.states.length; out.gd = FBP1.states.map(x => x.gd).sort().join(''); out.atk = FBP1.states[0].out[1].atk; return JSON.stringify(out); })()`));
  ok(JSON.stringify(r2.th) === JSON.stringify([100, 50, 25, 12, 6]), '2. Phase 1\'s continue thresholds (chance 50): ' + r2.th.join(', '));
  ok(r2.n === 2 && r2.gd === '01', '2. past the AI a state splits into guarded / unguarded whatever the attack (' + r2.atk + ': ' + r2.n + ' states)');
  // (3) the clock moved after the beeps: the press is read against the beeped frame
  const r3 = JSON.parse(await E(`(() => { const sv = { t0: FB14.t0 }; FB14.t0 = 1000; const P = { target: 300, tPress: fbPressT(300), bias: fb14Bias() };
    const a0 = fb14AimF(P, 'fb14', 2); FB14.t0 = 1000 - 2 * fbRate(); const a1 = fb14AimF(P, 'fb14', 2); FB14.t0 = sv.t0; return JSON.stringify({ a0, a1 }); })()`));
  ok(r3.a0 === 300 && Math.abs(r3.a1 - 302) < 0.01, '3. the beeped frame: ' + r3.a0 + ' on the plan\'s clock, ' + r3.a1.toFixed(2) + ' after the clock moved 2 frames');
  // (4) the backup T7
  const r4 = JSON.parse(await E(`(() => { const rows = [...document.querySelectorAll('#route-list li')].map(l => l.textContent);
    let rec = null, slam = null; for (let s = 1; s < 4000 && (!rec || !slam); s++) { const S0 = { s: (s * 2654435761) >>> 0, nc: 9999 }; const a = fb2AI7(S0, 100, [44, 194], true, true); if (a.atk === 'recast' && !rec) rec = a; if (a.atk === 'slam' && !slam) slam = a; }
    const J = JSON.stringify(ENDGAME);
    return JSON.stringify({ label: /Do Nothing on the beep → Body Slam \\/ Claw \\(Mario in Danger\\); a wave or Bowser's shield fails it/.test(J), text: J.includes('T7: Charge; Do Nothing - No Wave or Shield'), rec: rec && { ok7: rec.ok7, lucky: rec.lucky }, slam: slam && { ok7: slam.ok7, lucky: slam.lucky } }); })()`));
  ok(r4.text && r4.label, '4. the backup T7 reads "No Wave or Shield"');
  ok(r4.rec && r4.rec.ok7 === false && r4.rec.lucky === false && r4.slam && r4.slam.ok7 && r4.slam.lucky, '4. (v154: the runner, the shield is a failure) the shield is no T7 success; a Body Slam is');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
