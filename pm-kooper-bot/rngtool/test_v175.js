/* v175 (the runner's Phase 1: T1 Charge; Lakilester Spiny Flip; T2 Power Bounce for 4+): (1) fbStep's Spiny Flip ('spin') with the impact and
 * Bowser's AI 43 frames on replays emulator runs exactly (fixture p1spiny runs are in the scratchpad: skipped without them); (2) the console's
 * 13:33 Phase 1 (fixtures/console_v175.json): the Charge locks, the Spiny Flip on the bar's hide 3.33 s on splits the states, the coin to
 * the T2 target screen keeps a doubt under 0.5, the T1 attack the clip shows (a guarded Body Slam, Mario at 3) leads, and a 4+ plan is made.
 * usage: PAGE=... node test_v175.js */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.env.PAGE || process.argv[2];
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v175.json'), 'utf8'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') >= 'v175', 'page version v175+');
  const k = JSON.parse(await E(`JSON.stringify({ goal: FBP1_GOAL, manip: FBP1_MANIP, spiny: FBP1_SPINY, giveup: FBP1_GIVEUP })`));
  ok(k.goal === 4 && k.manip && k.spiny && k.giveup === 0.5, 'Phase 1: the T2 beep on, for 4+, the Spiny Flip model, no coin wait');
  const rr = await p.evaluate(async cap => { const r = await window.__tot.chgReplay(cap, { maxAlts: 0, fbp1: true }); return { state: r.state, n: r.fbp1, best: r.best }; }, Object.assign({}, FX.cap, { prof: 'fbp1' }));
  ok(rr.state === 'locked' && rr.best && rr.best.seed === '6c284f85', 'the 13:33 Phase 1 Charge locks 6c284f85 (' + rr.n + ' states)');
  const fl = JSON.parse(await E(`(() => { const T = window.__tot, r = T.RT(), FXt = ${JSON.stringify({ trig: FX.trig, hide: FX.hide, pbHide: FX.pbHide, shines: FX.shines, vis: FX.vis })};
    const trigT = FBP1.t0 + 16 * FBP1.rate, map = x => trigT + (x - FXt.trig), out = { n0: FBP1.states.length };
    FBP1V.taps = FXt.shines.map(map); FBP1V.vis = FXt.vis.map(([a, b]) => [map(a), map(b)]); FBP1V.visFrom = null;
    let a = performance.now(); fbp1SpinyInput(map(FXt.hide)); out.msIn = Math.round(performance.now() - a); out.nIn = FBP1.states.length;
    const cScr = Math.floor(fbp1Pic(map(FXt.pbHide) - 1600)); a = performance.now(); fbp1Advance(cScr - 10); out.msAdv = Math.round(performance.now() - a);
    const W = fbp1Weigh(cScr - 10); out.doubt = +W.doubt.toFixed(3); out.kept = W.list.length;
    const by = {}; let tot = 0; for (const S of W.list) { const key = (S.out[1] && S.out[1].atk) + (S.gd === 1 ? '_g' : S.gd === 0 ? '_u' : ''); by[key] = (by[key] || 0) + S.w * S.lw; tot += S.w * S.lw; }
    for (const k in by) by[k] = +(by[k] / tot).toFixed(3); out.atk = by;
    T.setStep(r.findIndex(s => s.fbp1pb)); a = performance.now(); const pl = fbp1Plan(cScr); out.msPlan = Math.round(performance.now() - a);
    out.plan = pl && { d: pl.d, pp: +(pl.pp5 || 0).toFixed(3), p: +(pl.p5 || 0).toFixed(3), win: pl.win, states: pl.states, none: pl.none || null };
    return JSON.stringify(out); })()`));
  console.log('     ' + JSON.stringify(fl));
  ok(fl.nIn > fl.n0 && fl.msIn < 3000, 'the Spiny Flip splits the states (' + fl.n0 + ' -> ' + fl.nIn + ', ' + fl.msIn + ' ms)');
  ok(fl.doubt < 0.5 && fl.kept > 0, 'the coin to the T2 target screen fits the model (doubt ' + fl.doubt + ', ' + fl.kept + ' states)');
  ok((fl.atk.slam_g || 0) >= Math.max(...Object.values(fl.atk)) - 1e-9, "the clip's T1 attack, a guarded Body Slam, leads: " + JSON.stringify(fl.atk));
  ok(fl.plan && !fl.plan.none && fl.plan.d != null, 'a 4+ plan: ' + JSON.stringify(fl.plan) + ' (' + fl.msPlan + ' ms)');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
