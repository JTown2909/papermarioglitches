/* v156 (console 11-26 09:50): (a) the lock badge on T5's step shows the fb14 lock, not the Charge reader's no-read; (b) after a press the
 * % box shows the hit frame's own chance (frameP), so a press outside the window reads low, not the plan's spread number; (c) after the
 * coin rules out the carried seed (lostT), the next Charge skips the narrowed read and searches in full. usage: PAGE=... node test_v156b.js */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.env.PAGE || process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/tot156/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  const r = JSON.parse(await E(`(() => { const T = window.__tot, R = T.RT(), i5 = R.findIndex(s => s.fb5), out = {};
    T.setStep(i5); FB14.hit = null; FB14.on = true; FB14.states = [{}]; FB14.doubt = 0.1; FB14.prior = null; out.badge5 = lockBadgeState();
    FB14.on = false; FB14.states = null;
    const now = performance.now(); st.plan = null;
    st.pressShow = { src: 'press', first: 100, chance: Array(40).fill(0.84), frameP: Array(40).fill(0).map((_, i) => i >= 18 && i <= 21 ? 0.95 : 0.03), target: 119, hit: 123, pFrame: 0.03, works: false, t: now };
    pctBoxShow(); out.big = $('pct-big').textContent; out.small = $('pct-small').textContent;
    FB14.freshT = 1000; FB14.hitT = null; FB14.lostT = null; out.before = fb14AfterHitFull(); FB14.lostT = 2000; out.lost = fb14AfterHitFull(); FB14.freshT = 3000; out.fresh = fb14AfterHitFull();
    FB14.lostT = null; return JSON.stringify(out); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.badge5 && r.badge5.state === 'ok', "(a) T5's step: the badge reads the fb14 lock (LOCKED), not 'no Charge lock'");
  ok(r.big === '3%' && /aimed 95%/.test(r.small), '(b) a press 1+ frames past the window: the % box shows the hit frame (3%), the aimed frame 95%');
  ok(r.before === false && r.lost === true && r.fresh === false, '(c) lostT after the fresh lock -> full search; a new fresh lock clears it');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
