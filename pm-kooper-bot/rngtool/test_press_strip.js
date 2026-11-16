/* v114 (the runner: "after you do an input, it shows you how well you did ... only on final bowser? it should be everywhere"):
 * a press on the beeps in any fight (here Duplighosts, measurePress) leaves the strip on the plan's frames, its window and the
 * frame hit (stripState src 'press') until the next plan; the Final Bowser levers did this since v109.
 * usage: [PAGE=...] node test_press_strip.js */
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v113/timeout_timer_standalone.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [], p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} window.__now = 1000; performance.now = () => window.__now; });
  await p.goto('file://' + PAGE);
  const r = await p.evaluate(() => { const T = window.__tot, E = c => T.v111.ev(c), out = {};
    const tab = new Array(40).fill(false); for (let c = 203; c <= 206; c++) tab[c - 180] = true;
    E(`setStep(0); st.plan = { tMade: 0, w: { start: 203, end: 206, length: 4 }, target: 204, tPress: 1e12, tLast: 0, rate: 33.4, seedBL: 0xd34bb989, baseF: 0, first: 180, tab: ${JSON.stringify(tab)}, tab4: null, prof: 'dup3', mix: { p: 0.96, win: 4, zw: true }, bias: 0 };`);
    window.__now = 5000; E(`measurePress(${(204.1 + E('VANISH_()') + E("num('pfix')")) * 33.4 + E("num('vlag')")})`);
    E('st.plan = null'); const s = T.stripState(); out.src = E('stripData().src'); out.text = s.text; out.cls = s.cls;
    return out; });
  console.log(JSON.stringify(r));
  ok(r.src === 'press' && /frame 204/.test(r.text) && /window 203-206/.test(r.text) && /working frame/.test(r.text) && r.cls === 'plan', 'a Duplighosts press: the strip keeps the window and the frame hit (' + (r.text || '').slice(0, 90) + ')');
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
