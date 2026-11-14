/* v107 (README v107): every plan display leads with the chance counting the press spread ("LIKELY NN%"), a 1-frame window says
 * "1 FRAME – coin flip"; the Jr. Troopa press correction (jrfix) is its own setting, read by jr_live only (not Final Bowser).
 * usage: node test_v107.js [PAGE=...] */
const fs = require('fs'), path = require('path');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v107/timeout_timer_standalone.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  if (!fs.existsSync(PAGE)) { console.log('(skipped: no page at ' + PAGE + ')'); console.log('all ok'); return; }
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame' })); } catch (e) {} });
  await p.goto('file://' + PAGE);
  const r = await p.evaluate(() => { const L = window.__tot.v107.likelyText;
    return { v: window.__tot.VERSION, one: L({ p: 0.569, pp: 0.965, win: 1 }), three: L({ p: 0.83, pp: 0.97, win: 3 }), pb: L({ p: 0.89, p4: 0.6, win: 7 }, '6+'), none: L({ pp: 0.9 }),
      jrfix: !!document.getElementById('s-jrfix'), jrfixDef: document.getElementById('s-jrfix') && document.getElementById('s-jrfix').value }; });
  ok(r.v === 'v107', 'page version v107');
  ok(r.one === 'LIKELY 57% with your press spread · 1 FRAME – coin flip', '1-frame window: "' + r.one + '"');
  ok(r.three === 'LIKELY 83% with your press spread', '3-frame window: "' + r.three + '"');
  ok(r.pb === 'LIKELY 89% (6+ 60%) with your press spread', 'Power Bounce: "' + r.pb + '"');
  ok(r.none === '', 'no spread chance: nothing');
  ok(r.jrfix && r.jrfixDef === '0', 'Jr. Troopa press correction setting, default 0');
  const jr = fs.readFileSync(path.join(__dirname, 'charge_live', 'jr_live.js'), 'utf8'), fb = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8');
  ok((jr.match(/num\('jrfix'\)/g) || []).length === 2 && !/jrfix/.test(fb), 'jrfix read by the Jr. press read and carry only, never by Final Bowser');
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
