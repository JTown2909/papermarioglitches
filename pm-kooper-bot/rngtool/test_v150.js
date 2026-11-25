/* v150 (console 11-25 16:43, Phase 1: "it said no lock and then suddenly tried to lock": the Charge locked (ad82ca0e, 2.88x), the
 * coin put the doubt at 0.68 on the target screen - "Power Bounce normally" - and 4 s later at 0.22, a plan the runner had pressed
 * before): with states kept and a doubt under FBP1_GIVEUP (0.95) the page says to WAIT on the target screen; past it, or with no
 * state left, "Power Bounce normally". (The 16:43 capture does not replay: its webp pictures lose the read, a seed each run.)
 * usage: node test_v150.js [page] */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const LG = '/root/.claude/uploads/4de37507-9387-5f1e-bab5-10167305f887/3d751e7c-pm-rng-log-2026-11-25_16-43-30.json';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE);
  ok(await p.evaluate(() => window.__tot.v111.ev('VERSION')) === 'v153', 'page version v150');
  // the rule on the page's own plan function: a kept state and a doubt of 0.70 (wait) / 0.97 (bounce normally)
  const r = JSON.parse(await p.evaluate(() => window.__tot.v111.ev(`(() => { const T = window.__tot, out = {}, w0 = fbp1Weigh, a0 = fbp1Advance;
    const S = fbNew({ s: 1, nc: 0, f: 400, c: new Uint8Array(20), ph: [0, 0], l: 0, w: 1 }); Object.assign(FBP1, { states: [S], t0: 0, rate: 33.4, lockT: null, ended: false, P: 120, outcome: 'lock', whyLogged: null });
    T.setStep(T.RT().findIndex(s => s.fbp1pb)); FBP1_MANIP = true; fbp1Advance = () => true;
    for (const d of [0.70, 0.97]) { fbp1Weigh = () => ({ list: [S], doubt: d, n: 1 }); FBP1.whyLogged = null; const n0 = T.SLOG.length; fbp1Plan(500); const e = T.SLOG.slice(n0).filter(x => x.ev === 'fbP1NoPlan').pop(); out['d' + d] = { why: e && e.why, msg: st.msg }; }
    fbp1Weigh = w0; fbp1Advance = a0; FBP1.states = null; return JSON.stringify(out); })()`)));
  console.log('     ' + JSON.stringify(r).slice(0, 600));
  ok(r['d0.7'].why === 'coin-wait' && /^WAIT on the target screen/.test(r['d0.7'].msg || ''), 'doubt 70% with states kept: WAIT on the target screen (not "Power Bounce normally")');
  ok(r['d0.97'].why === 'coin' && /Power Bounce normally/.test(r['d0.97'].msg || ''), 'doubt 97%: "Power Bounce normally"');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
