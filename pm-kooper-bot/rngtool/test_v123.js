/* v123: the learned per-lever press correction (page_template.html leverShrink). The runner's saved records (log 08:50, Nov 21:
 * Duplighosts -1.57, Final Bowser Do Nothing +1.27, Jr. Troopa -0.68 frames on 8 presses) were corrected by only n / (n + 4) of
 * their mean; from 6 presses the shrink is the mean's own uncertainty, so a steady offset is corrected in full (at most 1.5).
 * Also (console 09:05): fb2T8Assume names the backup T8 step (its use in the doubt was withdrawn, README v123); Final Bowser moves to T2
 * once T1 is over (the hit read, or 10 HP held through Bowser's turn), not at T2's Charge burst 15 s later.
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
  ok(r.v === 'v134', 'page version v123');
  ok(r.b.dup === 1.5 && r.b.fb14 === -1.22 && r.b.jr === 0.58 && r.b.hw === -0.27, 'the runner\'s records: Duplighosts +1.50 (was +1.05), Final Bowser -1.22 (was -0.85), Jr. Troopa +0.58 (was +0.45), Hallway -0.27 (unchanged: a small, noisy offset) ' + JSON.stringify(r.b));
  ok(Math.abs(r.five - 5 / 9) < 1e-9, 'under 6 presses the old shrink (n / (n + 4)): ' + r.five);
  ok(Math.abs(r.noisy - 0.6) < 1e-9, 'a noisy record keeps the old shrink: ' + r.noisy);
  ok(r.steady > 0.99, 'a steady record is corrected in full: ' + r.steady.toFixed(3));
  const r2 = await p.evaluate(() => { const T = window.__tot, E = c => T.v111.ev(c), RT = T.RT(), out = {};
    const i1 = RT.findIndex(s => s.fb14 === 1 && s.fb14role === 'lever'), i2 = RT.findIndex(s => s.fb14 === 2);
    // quiet T1 (Bowser missed): 10 HP held, 17 s after Cloud Nine's confirm
    T.setStep(i1); E('FB14.pT = { 1: 1000 }; FB14.hpw = { seen10: true, tenRun: 0, blankRun: 0, ok: { 1: 40 }, done: {} }; FB14.lastBurst = { turn: 1, t: 0 }');
    E('fb14EarlyT2(12000)'); out.at12 = T.step(); E('fb14EarlyT2(18000)'); out.at18 = T.step();
    // a hit read on T1
    T.setStep(i1); E('FB14.earlyT2 = null; FB14.pT = { 1: 1000 }; FB14.hpw = { seen10: true, tenRun: 0, blankRun: 0, ok: {}, done: { 1: \'hit\' } }'); E('fb14EarlyT2(5000)'); out.hit = T.step();
    out.logged = T.SLOG.filter(e => e.ev === 'fb14StepByOutcome').map(e => e.why);
    // T2 elsewhere: nothing moves
    T.setStep(i2); E('fb14EarlyT2(60000)'); out.t2 = T.step(); out.i1 = i1; out.i2 = i2;
    // backup T8
    const i8 = RT.findIndex(s => s.b8); T.setStep(i8); E('FB2B.on = true'); out.a8 = window.__fb2.v123.assume(); T.setStep(i8 - 1); out.a7 = window.__fb2.v123.assume(); E('FB2B.on = false'); T.setStep(i8); out.a8off = window.__fb2.v123.assume();
    return out; });
  console.log(JSON.stringify(r2));
  ok(r2.at12 === r2.i1 && r2.at18 === r2.i2, 'Final Bowser T1 -> T2 when 10 HP is held through Bowser\'s turn (16 s after Cloud Nine), not before');
  ok(r2.hit === r2.i2 && r2.logged.length === 2 && r2.t2 === r2.i2, 'Final Bowser T1 -> T2 at the hit read; on T2 nothing moves ' + JSON.stringify(r2.logged));
  ok(r2.a8 === true && r2.a7 === false && r2.a8off === false, 'fb2T8Assume is true on the backup T8 step only');
  const r3 = await p.evaluate(() => { const T = window.__tot, E = c => T.v111.ev(c), RT = T.RT(), i8 = RT.findIndex(s => s.b8); T.setStep(i8);
    E('FB2B.on = true; FB2.on = true; FB2.rate = 33.427; CHG.trig = { t: performance.now() - (420 + 2 - 16 + 0.2) * 33.427 }');
    const now = performance.now(), d = 420, tab = new Array(40).fill(false); for (let c = 419; c <= 421; c++) tab[c - 400] = true;
    T.st.plan = { prof: 'fb2', tMade: now - 3000, target: d, w: { start: 419, end: 421, length: 3 }, tab, first: 400, tPress: now, rate: 33.427, tLast: now - 400 * 33.427 };
    const tObs = T.st.plan.tLast + (d + 2 + 0.2) * 33.427 + E('num("vlag")');     /* the plan's clock: c = (tObs - tLast - vlag) / rate - 2 */ E('checkPress(' + tObs + ')');
    const pr = T.SLOG.filter(e => e.ev === 'press' && e.prof === 'fb2').pop(); const note = E('V.pressNote'); E('FB2B.on = false; FB2.on = false');
    return { pr, note, tail: T.SLOG.slice(-6).map(e => e.ev), step: T.step(), i8 }; });
  console.log(JSON.stringify(r3));
  ok(r3.pr && Math.abs(r3.pr.err - 0.2) < 0.01 && r3.pr.works && r3.pr.inWin && /Last press · on the frame ✓/.test(r3.note || ''), 'the backup T8 Power Bounce press gets a last-press readout (' + (r3.note || '') + ')');
  const g = await p.evaluate(() => { const E = c => window.__tot.v111.ev(c), sel = document.getElementById('s-fbp1cap'); const out = { def: E('fb2Goal()') }; sel.value = '34'; sel.dispatchEvent(new Event('change')); out.c34 = E('fb2Goal()'); out.saved = JSON.parse(localStorage.getItem('tot-settings')).fbp1cap; sel.value = '5'; sel.dispatchEvent(new Event('change')); out.c5 = E('fb2Goal()'); return out; });
  ok(g.def === 6 && g.c34 === 7 && g.c5 === 6 && g.saved === '34', 'Phase 1 bounce cap: a 5 cap plans T7 for 6+, a 3 / 4 cap for 7, remembered ' + JSON.stringify(g));
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
