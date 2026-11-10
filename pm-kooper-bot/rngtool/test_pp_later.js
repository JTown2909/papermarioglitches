/* v87: the window choice (page_template.html ppPick): the runner (console log 2f22d4dc, T4 Maple Syrup: a 2-frame window
 * beeped while a much wider one came shortly after) asked why. A frame up to "Wider window up to" s (default 1.5) past the
 * lead is now taken when its chance with the runner's own press spread is PP_LATER_GAIN higher, and the next wider window
 * is shown either way. Synthetic shares: a 2-frame run at +2 and a 6-frame run at +36 (past the 1 s extra wait).
 * usage: node test_pp_later.js [PAGE] */
const { chromium } = require('playwright');
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
let fails = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [], p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} }); await p.goto('file://' + PAGE);
  const r = await p.evaluate(() => {
    const T = window.__tot, from = 100, W = 30, later = 15, D = 4, a = from - D, b = from + W + later + 10 + D, share = new Float64Array(b - a + 1);
    for (const c of [102, 103]) share[c - a] = 1; for (let c = 136; c <= 141; c++) share[c - a] = 1;
    const sdPD = sd => { const o = []; let s = 0; for (let d = -4; d <= 4; d++) { const w = Math.exp(-d * d / (2 * sd * sd)); o.push([d, w]); s += w; } return o.map(([d, w]) => [d, w / s]); };
    const run = (sd, lat) => { const PD = sdPD(sd), sc = c => PD.reduce((v, [d, q]) => v + q * (share[c + d - a] || 0), 0); const k = T.ppPick(share, null, a, b, from, W, sc, 'safe3', lat); return { t: k.target, len: k.run.length, later: !!k.later, next: k.next, sc0: k.sc0, sc: k.scPick }; };
    return { spread: run(1.5, later), none: run(1.5, 0), tight: run(0.3, later), def: +document.getElementById('s-zwlater').value };
  });
  console.log(JSON.stringify(r));
  check(r.def === 1.5, 'the setting "Wider window up to" defaults to 1.5 s');
  check(r.spread.later && r.spread.t >= 136 && r.spread.t <= 141 && r.spread.sc > r.spread.sc0 + 0.03, 'with a +-1.5-frame spread the 6-frame window 1.2 s later is beeped (' + r.spread.sc0 + ' -> ' + r.spread.sc + ')');
  check(!r.none.later && r.none.t === 102 || r.none.t === 103, 'with the setting at the extra wait (no later frames): v83\'s pick, the 2-frame window');
  check(!r.tight.later && r.tight.next && r.tight.next.length === 6, 'with a tight spread both land: the early window stays, the wider one is shown as next (' + JSON.stringify(r.tight.next) + ')');
  check(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
