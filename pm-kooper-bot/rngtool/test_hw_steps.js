/* The route after a Hallway Bowser retry (charge_live/README.md, "Arming"): a long gap (10 s+, a reload walked back into
 * the hallway) on Hallway T2 sets the route back to Hallway T1; on another fight's step it never does (v121, the runner: "it
 * should NEVER warp to anything it isnt local to in the moment"; v120 also stepped back right after the route left the Hallway). Built page, headless Chromium.
 * usage: node test_hw_steps.js [PAGE]   (default: the scratchpad build of timeout_timer_standalone.html) */
const { chromium } = require('playwright');
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE);
  const r = await p.evaluate(() => {
    const T = window.__tot, hi = T.RT().findIndex(s => s.turn === 'hw_spiny'), out = {};
    T.setStep(hi + 1); T.coinBack(12000); out.t2 = T.step();
    T.setStep(hi + 1); T.setStep(hi + 2); T.coinBack(12000); out.left = T.step();     // left the Hallway: v121 stays (never warp back from another fight)
    T.setStep(hi - 1); T.setStep(hi + 2); T.coinBack(12000); out.other = T.step();    // reached from Jr. Troopa
    T.setStep(hi + 1); T.coinBack(3000); out.short = T.step();
    out.hi = hi; out.logged = T.SLOG.filter(x => x.ev === 'stepBackToHallway').length; return out;
  });
  const ok = r.t2 === r.hi && r.left === r.hi + 2 && r.other === r.hi + 2 && r.short === r.hi + 1 && r.logged === 1 && !errs.length;
  console.log(JSON.stringify(r), errs.slice(0, 3), ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
