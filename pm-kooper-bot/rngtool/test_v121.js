/* v121 (the runner, 2026-11-20 evening):
 *  1. console 19:04: Final Bowser T1's 10 s hide (Bowser's attack) stepped the route back to Hallway T1 ("it thought it was
 *     fighting hallway. it was final" / "it should NEVER warp to anything it isnt local to in the moment"): a long hide steps
 *     back to Hallway T1 only from a Hallway step, never from Final Bowser (the st.hwLeft clause is gone).
 *  2. the Jr. Troopa early-plan floor: the menu gap + JR_FLOOR_PAD (30), not + the beeps' lead + 10 (test_console_1108b pins it).
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
  ok(/works [3-9]\d% · fails [1-6]\d% \(this frame\)/.test(e.msg) && /inside \(frame 647\)/.test(e.msg) && !/works 100%/.test(e.msg), '3. the T1 skip A (labels differ) shows this frame\'s chance, not "works 100%" (' + e.msg.slice(0, 110) + ')');
  ok(r.v === 'v121', 'page version v121');
  ok(r.left && r.afterFb === r.f1, '1. a 10 s hide on Final Bowser T1 (left the Hallway 0 hides ago) keeps the route on Final Bowser (step ' + r.afterFb + ', T1 lever ' + r.f1 + ')');
  ok(r.afterHw === r.hi, '1. a long hide on a Hallway step still steps back to Hallway T1 (a retry: step ' + r.afterHw + ')');
  ok(r.pad === 30, '2. JR_FLOOR_PAD 30 (the Jr. Troopa early-plan floor without the beeps\' lead)');
  ok(!errs.length, 'no page errors ' + JSON.stringify(errs.slice(0, 2)));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
