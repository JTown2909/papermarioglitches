/* v121 (the runner, 2026-11-20 evening):
 *  1. console 19:04: Final Bowser T1's 10 s hide (Bowser's attack) stepped the route back to Hallway T1 ("it thought it was
 *     fighting hallway. it was final" / "it should NEVER warp to anything it isnt local to in the moment"): a long hide steps
 *     back to Hallway T1 only from a Hallway step, never from Final Bowser (the st.hwLeft clause is gone).
 *  2. the Jr. Troopa early-plan floor: the menu gap + JR_FLOOR_PAD (30), not + the beeps' lead + 10 (test_console_1108b pins it).
 *  3. a press near a frame edge is weighed over both frames (console 19:14: Final Bowser T3 / T4 "0%", Bowser missed); the
 *     Final Bowser lever's table finds its press record by time (labels differ: T1 showed "works 100%" on a 66% plan).
 *  4. Hallway T3 Power Bounce 4+ (aims at 5+) after Time Out: the core carries the seed from Time Out's confirm through T2's
 *     Spiny Flip to the Power Bounce confirm exactly (12 emulator runs, fixtures/hw_t3pb.json), its 4+ / 5+ tables give the
 *     runs' hits; the page's route has the steps and beeps a 4+ plan on the T3 Power Bounce screen.
 * usage: node test_v121.js [PAGE] */
const { chromium } = require('playwright'); const fs = require('fs'), http = require('http');
const PAGE = process.argv[2] || process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); fs.createReadStream(PAGE).pipe(r); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const b = await chromium.launch(), errs = [], p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { localStorage.clear(); });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/');
  const r = await p.evaluate(() => { const T = window.__tot, ev = T.v111.ev, R = T.RT();
    const hi = R.findIndex(s => s.turn === 'hw_spiny'), f1 = R.findIndex(s => s.fb14 === 1 && s.fb14role === 'lever');
    // leave the Hallway for Final Bowser T1 (st.hwLeft set, 0 hides), then a 10 s hide
    T.v106.setStep(hi + 1); T.v106.setStep(f1); const left = !!ev('st.hwLeft');
    ev('st.hwDone = false'); ev('hwRetry(10247)'); const afterFb = T.step();
    // on a Hallway step a long hide still means a retry
    T.v106.setStep(hi + 1); ev('st.hwDone = false; zw.on = false'); ev('hwRetry(10247)'); const afterHw = T.step();
    return { v: T.VERSION, hi, f1, left, afterFb, afterHw, pad: ev('JR_FLOOR_PAD') }; });
  const e = await p.evaluate(() => { const T = window.__tot, ev = T.v111.ev;
    const P = { tab: [false, false, true, false, false], chance: [0.1, 0.2, 0.66, 0.25, 0.05], first: 645, w: { start: 647, end: 647, length: 1 }, target: 647, rate: 33.4, mix: { p: 0.66 } };
    window.__P = P; const out = {};
    for (const c of [647.2, 647.54, 647.91, 646.6]) { ev(`pressShow(window.__P, ${c}, 'Final Bowser T3, Do Nothing')`); const q = ev('st.pressShow'); out[c] = { works: q.works, p: +q.p.toFixed(3) }; }
    // the lever note (another label) picks the press record up by time: the table shows this frame's chance, not 100%
    ev(`pressShow(window.__P, 647.2, 'Final Bowser T1, the skip A')`); T.leverPressNote('Final Bowser T1, the A that skips Cloud Nine\'s message', 0.2, 'fb14sk', true);
    out.msg = document.getElementById('press-msg').textContent; return out; });
  ok(e['647.2'].works && e['647.2'].p > 0.55 && e['647.2'].p < 0.66, '3. 647.2 on a 1-frame window (647): works, chance weighed toward 647 (' + JSON.stringify(e['647.2']) + ')');
  ok(e['647.54'].p > 0.3 && e['647.54'].p < 0.5, '3. 647.54 (console 19:14 T3, "0%", Bowser missed): weighed over 647 / 648, not a flat 0% (' + JSON.stringify(e['647.54']) + ')');
  ok(!e['647.91'].works && e['647.91'].p < 0.3, '3. 647.91: fails, mostly 648 (' + JSON.stringify(e['647.91']) + ')');
  ok(/inside \(frame 647\)/.test(e.msg) && !/works 100%|Chance|You hit/.test(e.msg), '3. the T1 skip A (labels differ): its window, no odds rows (v128: the % box has them), never "works 100%" (' + e.msg.slice(0, 110) + ')');
  ok(r.v === 'v154', 'page version v121');
  ok(r.left && r.afterFb === r.f1, '1. a 10 s hide on Final Bowser T1 (left the Hallway 0 hides ago) keeps the route on Final Bowser (step ' + r.afterFb + ', T1 lever ' + r.f1 + ')');
  ok(r.afterHw === r.hi, '1. a long hide on a Hallway step still steps back to Hallway T1 (a retry: step ' + r.afterHw + ')');
  ok(r.pad === 30, '2. JR_FLOOR_PAD 30 (the Jr. Troopa early-plan floor without the beeps\' lead)');
  // 4. the core against the emulator runs
  { const R = require('./pmrng_core.js'), FX = require('./fixtures/hw_t3pb.json'); let exact = 0, pbOk = 0, pbN = 0;
    for (const x of FX.runs) {
      const ev = R.buildEv([{ f: 0, id: 'hw_to' }, { f: x.spiny, id: 'hw_spiny2', imp: x.imp }]), S = { s: parseInt(x.seedTO, 16) >>> 0, nc: x.ncTO, inst: [] };
      for (let t = 0; t < x.pb; t++) R.frameEv(S, t, ev);
      if ((S.s >>> 0) === (parseInt(x.seedPB, 16) >>> 0)) exact++;
      if (x.hits) { pbN++; const s0 = parseInt(x.seedPB, 16) >>> 0, nc = x.ncPB == null ? 1e9 : x.ncPB;
        if (R.works(s0, nc, 0, 0, R.PROFILES.hwpb4) === (x.hits >= 4) && R.works(s0, nc, 0, 0, R.PROFILES.hwpb5) === (x.hits >= 5)) pbOk++; } }
    ok(exact === FX.runs.length, '4. Time Out -> T2 Spiny Flip -> T3 Power Bounce confirm: the core\'s seed is the game\'s in ' + exact + ' / ' + FX.runs.length + ' runs');
    ok(pbN >= 9 && pbOk === pbN, '4. the 4+ / 5+ tables give the hits of ' + pbOk + ' / ' + pbN + ' Power Bounces'); }
  const h = await p.evaluate(() => { const T = window.__tot, R = T.R, zw = T.zw, ev = T.v111.ev, RT = T.RT();
    const hi = RT.findIndex(s => s.turn === 'hw_spiny'), iTO = RT.findIndex(s => s.turn === 'hw_to'), iSp = RT.findIndex(s => s.turn === 'hw_spiny2'), iPB = RT.findIndex(s => s.prof === 'hwpb4');
    const out = { steps: [hi, iTO, iSp, iPB], txt: RT[iPB] && RT[iPB].t };
    T.v106.setStep(iPB); out.prof = ev('PROF().id');
    const seed = 0x2468ace0, rate = 33.427, vlag = 50, t0 = performance.now() - 2000 - vlag;
    Object.assign(zw, { on: true, dead: false, fight: 'hw', t0, rate, taps: [], vis: [], visFrom: 0, visTo: null, visLocked: false, parts: [{ S: { s: seed >>> 0, nc: 0, inst: [] }, g: 0, ev: new Map(), evMax: -1, pauseAt: 0, pause: 0, w: 1, m: new Set() }], nBase: 1, f0: 0, tapLate: 1.5, imps: null, shifts: null, src: 'charge', bg: 0.05 / 0.95, bgTo: null });
    { let x = seed >>> 0, n = 0; const fNow = (performance.now() - vlag - t0) / rate; for (let t = 0; t < fNow - 10; t++) { if (t === n) { const q = R.randInt(x, 100); x = q[0]; if (q[1] >= 70) T.zwTap(t0 + (t + 6) * rate + vlag); n = t + (q[1] >= 70 ? 48 : 24); } x = R.adv(x); } }
    T.st.plan = null; ev("zwPlan('test')"); const P = T.st.plan;
    out.plan = P ? { prof: P.prof, target: P.zwAbs, p: P.mix.p, p4: P.mix.p4, win: P.mix.win } : { msg: T.st.msg };
    if (P) { const S = zw.parts[0].S; out.works = R.works(seed >>> 0, 0, P.zwAbs, 0, R.PROFILES.hwpb4); }
    return out; });
  ok(h.steps.every(i => i >= 0) && h.steps[1] === h.steps[0] + 1 && h.steps[2] === h.steps[1] + 1 && h.steps[3] === h.steps[2] + 1 && h.txt === 'Hallway Bowser T3', '4. the Hallway route: T1 Spiny Flip, T2 Time Out, T2 Spiny Flip, T3 Power Bounce (' + JSON.stringify(h.steps) + ', "' + h.txt + '")');
  ok(h.prof === 'hwpb4' && h.plan && h.plan.prof === 'hwpb4' && h.works === true && h.plan.p > 0.84, '4. on the T3 Power Bounce screen a known state beeps a 4+ frame (better than blind 84%; ' + JSON.stringify(h.plan) + ')');
  ok(!errs.length, 'no page errors ' + JSON.stringify(errs.slice(0, 2)));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
