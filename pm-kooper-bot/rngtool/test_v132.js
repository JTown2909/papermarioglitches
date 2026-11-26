/* v132 (v133: battle 2303, the guard on every attack, the Power Bounce's damage stars and Phase 1's 50 chance): Final Bowser Phase 1 on the page's model (fbStep with S.p1m): from the seed at the start of Bowser's T1 AI frame, every
 * draw through the death, the Life Shroom revive, the T2 menu and the Power Bounce's continue rolls, against emulator logs
 * (fb2_route/p1g_log.py -> p1_fixture.py: fixtures/fbp1_logs.json, numbers only). Fire / Claw / Body Slam, a guarded slam. */
const { chromium } = require('playwright');
const fs = require('fs');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const FX = JSON.parse(fs.readFileSync(__dirname + '/fixtures/fbp1_logs.json', 'utf8'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE);
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E(`VERSION`) >= 'v156', 'page version v132');
  await p.evaluate(fx => { window.__p1fx = fx; }, FX);
  const r = JSON.parse(await E(`JSON.stringify(window.__p1fx.map(o => {
    const c = new Uint8Array(20); o.c.forEach((v, i) => c[i] = v);
    const S = fbNew({ s: parseInt(o.s, 16) >>> 0, nc: o.nc, f: o.ai, c, ph: o.ph, l: 0, w: 1 }); S.p1m = 1; S.gd = o.gd ? 1 : 0;
    fbEv(S, { k: 'ai', f: o.ai, turn: 1 }); if (o.d != null) { S.pbgo = true; fbEv(S, { k: 'pbh', f: o.d + 45, n: 0 }); }
    let bad = null; for (const [f, x] of o.seeds) { fbRun(S, f); if ((S.s >>> 0) !== parseInt(x, 16)) { bad = [f, (S.s >>> 0).toString(16), x]; break; } }
    return { name: o.name, atk: S.out[1] && S.out[1].atk, hit: o.hit, bad, pbn: S.pbn, rolls: o.rolls.length, n: o.seeds.length };
  }))`));
  const HIT = { fire: 57, claw: 64, slam: 69 };
  for (const x of r) ok(!x.bad && HIT[x.atk] === x.hit && (x.rolls ? x.pbn === x.rolls + 1 : true), x.name + ': ' + x.atk + ', ' + x.n + ' seeds exact' + (x.rolls ? ', ' + x.pbn + ' bounces (' + x.rolls + ' rolls)' : '') + (x.bad ? ' first wrong ' + JSON.stringify(x.bad) : ''));
  ok(r.some(x => x.atk === 'slam') && r.some(x => x.atk === 'claw') && r.some(x => x.atk === 'fire'), 'all three attacks covered');
  // ---- the live flow on the console's Phase 1 Charge (log 484e3220, 16:12; read from the uploads folder, skipped without it):
  // the read's fits -> states, Lakilester's confirm 10.6 s after the burst, the states run to the T2 target screen, the plan
  const LG = '/root/.claude/uploads/4de37507-9387-5f1e-bab5-10167305f887/484e3220-pm-rng-log-2026-11-17_16-12-04.json';
  if (!fs.existsSync(LG)) console.log('skip flow: the 16:12 log is not in the uploads folder');
  else {
    const C = JSON.parse(fs.readFileSync(LG, 'utf8')).chargeCaptures[0];
    const rr = await p.evaluate(async cap => { const r = await window.__tot.chgReplay(cap, { maxAlts: 0, fbp1: true }); return { state: r.state, n: r.fbp1, best: r.best, trig0: r.trig0 }; }, Object.assign({}, C, { prof: 'fbp1' }));
    const fl = JSON.parse(await E(`(() => { const T = window.__tot, r = T.RT(), dn = r.findIndex(s => s.fbp1dn), pb = r.findIndex(s => s.fbp1pb), out = { dn, pb, p1: r.findIndex(s => s.fbp1) };
      const t0 = FBP1.t0, P = t0 + (10600 / 33.427 + 16) * FBP1.rate;      // the confirm read 10.6 s after the burst (the console's)
      let a = performance.now(); fbp1Input(P); out.msInput = Math.round(performance.now() - a); out.nDN = FBP1.states.length; out.P = FBP1.P;
      const cScr = FBP1.P + 12 + 70 + 404 + 120; a = performance.now(); fbp1Advance(cScr - 10); out.msAdv = Math.round(performance.now() - a);
      out.atk = {}; for (const S of FBP1.states) { const k = (S.out[1] && S.out[1].atk) + (S.gd === 0 ? '-unguarded' : ''); out.atk[k] = (out.atk[k] || 0) + 1; }
      out.revived = FBP1.states.filter(S => S.rv != null).length; out.n = FBP1.states.length;
      T.setStep(pb); FBP1_MANIP = true; a = performance.now(); const pl = fbp1Plan(cScr); out.msPlan = Math.round(performance.now() - a); out.plan = pl && { d: pl.d, pp5: +(pl.pp5 || 0).toFixed(3), p5: +(pl.p5 || 0).toFixed(3), win: pl.win, states: pl.states, planned: pl.planned, none: pl.none || null };
      // the plan's 5+ share against the model run directly for the top state at the chosen frame
      const S = FBP1.states.slice().sort((x, y) => y.w * (y.lw || 1) - x.w * (x.lw || 1))[0], B = fbClone(S); fbRun(B, pl.d - S.l); B.pbn = 0; B.pbgo = true; fbEv(B, { k: 'pbh', f: pl.d - S.l + 45, n: 0 }); fbRun(B, pl.d - S.l + 71 + 27 * 12); out.topDirect = B.pbn; out.topRow = fbp1Row(S, pl.d - S.l, pl.d - S.l)[0];
      return JSON.stringify(out); })()`));
    console.log('flow', JSON.stringify(rr), JSON.stringify(fl));
    ok(rr.state === 'locked' && rr.best && rr.best.seed === '9bb456e7' && rr.n > 100, 'flow: the Phase 1 Charge locks 9bb456e7 and gives ' + rr.n + ' states');
    ok(fl.p1 >= 0 && fl.dn === fl.p1 + 1 && fl.pb === fl.p1 + 2, 'flow: route steps Charge, Do Nothing, Power Bounce in order');
    ok(fl.nDN > rr.n && fl.msInput < 300, 'flow: the confirm splits ' + rr.n + ' states over the read shifts: ' + fl.nDN + ' (' + fl.msInput + ' ms)');
    ok(fl.revived > 0 && fl.revived < fl.n && Object.keys(fl.atk).length >= 3, 'flow: v133, only the unguarded Fire Breath states died (' + fl.revived + ' of ' + fl.n + '); attacks ' + JSON.stringify(fl.atk) + ' (' + fl.msAdv + ' ms)');
    ok(fl.plan && fl.plan.d > fl.P + 480 && fl.plan.pp5 > 0 && fl.msPlan < 8000, 'flow: the T2 plan: ' + JSON.stringify(fl.plan) + ' (' + fl.msPlan + ' ms)');
    ok(fl.topRow === Math.min(fl.topDirect, 5), 'flow: the plan\'s bounce count for the top state (' + fl.topRow + ') is the model\'s own run (' + fl.topDirect + ')');
  }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
