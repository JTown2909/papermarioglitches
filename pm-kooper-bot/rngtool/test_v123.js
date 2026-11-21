/* v123: the learned per-lever press correction (page_template.html leverShrink). The runner's saved records (log 08:50, Nov 21:
 * Duplighosts -1.57, Final Bowser Do Nothing +1.27, Jr. Troopa -0.68 frames on 8 presses) were corrected by only n / (n + 4) of
 * their mean; from 6 presses the shrink is the mean's own uncertainty, so a steady offset is corrected in full (at most 1.5).
 * usage: node test_v123.js [PAGE] */
const { chromium } = require('playwright'); const fs = require('fs'), http = require('http');
const PAGE = process.argv[2] || process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const REC = { fb14: [1.93, 1, -0.26, 1.83, 1.7, 0.83, 1.72, 1.42], jr: [-1, -0.12, -1.35, -0.87, -1.87, -0.53, 0.48, -0.18], hw: [0.83, 1.41, 0.5, -0.56, -0.06, 1.34, -0.49, 0.22], dup: [-0.07, -0.52, -2.15, -2.3, -1.43, -2.44, -2.54, -1.13] };
(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); fs.createReadStream(PAGE).pipe(r); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const b = await chromium.launch(), errs = [], p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(R => { localStorage.clear(); localStorage.setItem('tot-fb14press-v93', JSON.stringify(R.fb14)); localStorage.setItem('tot-lever-jr-v110', JSON.stringify(R.jr)); localStorage.setItem('tot-lever-hw-v110', JSON.stringify(R.hw)); localStorage.setItem('tot-lever-dup-v110', JSON.stringify(R.dup)); }, REC);
  await p.goto('http://127.0.0.1:' + srv.address().port + '/');
  const r = await p.evaluate(() => { const T = window.__tot, E = c => T.v111.ev(c);
    const out = { v: E('VERSION'), b: {} }; for (const k of ['fb14', 'jr', 'hw', 'dup']) out.b[k] = +T.leverBias(k).toFixed(2);
    out.five = E('leverShrink([1, 1, 1, 1, 1])'); out.noisy = E('leverShrink([2, -2, 3, -3, 1, 0.5])'); out.steady = E('leverShrink([1, 1.1, 0.9, 1, 1, 1])'); return out; });
  console.log(JSON.stringify(r));
  ok(r.v === 'v123', 'page version v123');
  ok(r.b.dup === 1.5 && r.b.fb14 === -1.22 && r.b.jr === 0.58 && r.b.hw === -0.27, 'the runner\'s records: Duplighosts +1.50 (was +1.05), Final Bowser -1.22 (was -0.85), Jr. Troopa +0.58 (was +0.45), Hallway -0.27 (unchanged: a small, noisy offset) ' + JSON.stringify(r.b));
  ok(Math.abs(r.five - 5 / 9) < 1e-9, 'under 6 presses the old shrink (n / (n + 4)): ' + r.five);
  ok(Math.abs(r.noisy - 0.6) < 1e-9, 'a noisy record keeps the old shrink: ' + r.noisy);
  ok(r.steady > 0.99, 'a steady record is corrected in full: ' + r.steady.toFixed(3));
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
