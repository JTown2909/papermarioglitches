/* v122 (the runner, 2026-11-20 21:01-21:08):
 *  1. console 21:08, the backup T7 Charge locked but "no edge" (best 28% with a perfect press, ~8% blind): the backup's edge is
 *     measured against the blind odds (twice blind and 15 points over it, at most zwedge), so it beeps; the main T6 (30% blind)
 *     keeps zwedge (40%).
 *  2. the saved log carries every lever's press record (console 21:01, Duplighosts 1.56 frames early with a +0.98 correction:
 *     the records stay in the browser, so the correction could not be checked from the log).
 *  3. a boots change keeps the fight on screen (read before the menu switches routes): Final Bowser stays Final Bowser.
 *  4. console 21:12: the main T7 Power Bounce plan on 8454 states held the page ~10 s per replan (the capture restarted, the coins
 *     that narrow the states were missed, "it still didnt lock the bounce turn"): the same plan from cached idle runs and Power
 *     Bounce windows, the heaviest 1500 states, worked out 120 ms per replan; with 3000 states no replan holds the page long.
 * usage: node test_v122.js [PAGE] */
const { chromium } = require('playwright'); const fs = require('fs'), http = require('http');
const PAGE = process.argv[2] || process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); fs.createReadStream(PAGE).pipe(r); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const b = await chromium.launch(), errs = [], p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { localStorage.clear(); });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/');
  const r = await p.evaluate(() => {
    const E = c => window.__tot.v111.ev(c);
    const out = { v: E('VERSION'), e8: E('fb2Edge(0.08)'), e30: E('fb2Edge(0.3)'), e5: E('fb2Edge(0.05)') };
    E("leverAdd('dup', -1.4)"); E("leverAdd('jr', 0.3)");
    const B = window.Blob; let txt = null; window.Blob = function (parts, o) { txt = parts.join(''); return new B(parts, o); };
    const cu = URL.createObjectURL; URL.createObjectURL = () => 'blob:x'; const ck = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = () => {};
    try { E('downloadLog()'); } finally { window.Blob = B; URL.createObjectURL = cu; HTMLAnchorElement.prototype.click = ck; }
    const L = txt ? JSON.parse(txt) : null; out.levers = L && L.more && L.more.levers;
    // 3. boots
    const T = window.__tot, sel = document.getElementById('s-boots'); sel.value = 'normal'; sel.dispatchEvent(new Event('change'));
    T.setStep(T.RT().findIndex(s => /^Final Bowser/.test(s.t))); sel.value = 'ultra'; sel.dispatchEvent(new Event('change'));
    out.boots = T.RT()[T.step()].t;
    sel.value = 'normal'; sel.dispatchEvent(new Event('change')); out.bootsN = T.RT()[T.step()].t;
    T.setStep(T.RT().findIndex(s => /^Jr\. Troopa/.test(s.t)) + 2); sel.value = 'ultra'; sel.dispatchEvent(new Event('change')); out.bootsJ = T.RT()[T.step()].t;
    return out; });
  console.log(JSON.stringify(r));
  ok(r.v === 'v141', 'page version v122');
  ok(Math.abs(r.e8 - 0.23) < 1e-9, '1. backup T7 (8% blind): beeps from 23% with a perfect press (' + r.e8 + ')');
  ok(Math.abs(r.e30 - 0.4) < 1e-9, '1. main T6 (30% blind): zwedge 40% (' + r.e30 + ')');
  ok(Math.abs(r.e5 - 0.2) < 1e-9, '1. 5% blind: 20% (' + r.e5 + ')');
  const src = fs.readFileSync(__dirname + '/charge_live/fb2_live.js', 'utf8');
  ok(/pl\.pp >= fb2Edge\(fb2Txt\(\)\.b\) && pl\.p > fb2Txt\(\)\.b/.test(src), '1. the Do Nothing plan uses the blind-relative edge and a realistic chance over blind');
  ok(r.levers && Array.isArray(r.levers.dup) && r.levers.dup.includes(-1.4) && r.levers.jr.includes(0.3) && 'fb14' in r.levers, '2. the saved log has every lever\'s presses (' + JSON.stringify(r.levers) + ')');
  ok(/^Final Bowser T1/.test(r.boots), '3. Normal -> Ultra on Final Bowser stays on Final Bowser (' + r.boots + ')');
  ok(/^Final Bowser/.test(r.bootsN), '3. Ultra -> Normal on Final Bowser stays on Final Bowser (' + r.bootsN + ')');
  ok(/^Jr\. Troopa/.test(r.bootsJ), '3. Normal -> Ultra on Jr. Troopa stays on Jr. Troopa (' + r.bootsJ + ')');
  const FIX = JSON.parse(fs.readFileSync(__dirname + '/fixtures/fb2_t6dn.json', 'utf8'));
  const t7 = await p.evaluate(async R => {
    const T = window.__tot, F = window.__fb2, FB = F.FB2, RT = T.RT(), sel = document.getElementById('s-boots'); sel.value = 'ultra'; sel.dispatchEvent(new Event('change'));
    const i = RT.findIndex(s => s.turn === 'fb2_k'), r = R.find(x => x.hp === 1); T.setStep(i);
    FB.on = true; FB.hyps = [{ s: parseInt(r.s61, 16) >>> 0, nc: r.nc61, ph: r.phases[0], w: 1 }]; FB.rate = 33.427;
    T.CHG.trig = { t: performance.now() - 5000 }; const P = F.planPAt(150); FB.plan = Object.assign({}, P, { k: r.P, bias: 0 });
    F.confirm(T.CHG.trig.t + (r.P + F.van() - 16) * 33.427);
    const base = FB.t7.states, out = []; let s = 0x13579bdf;
    for (let n = 0; n < 3000; n++) { const o = base[n % base.length]; s = (Math.imul(s, 0x5D588B65) + 1) >>> 0;
      out.push(Object.assign({}, o, { a: Object.assign({}, o.a, { S: Object.assign({}, o.a.S, { s: n < base.length ? o.a.S.s : s, coins: o.a.S.coins.slice() }) }), w: o.w * (1 + (n % 7) / 10) })); }
    FB.t7.states = out; FB.t7.outcome = 'dodge'; FB.vis = []; FB.taps = []; FB.visFrom = null;
    // the T7 screen: the clock at the T7 menu + 60 now
    T.CHG.trig = { t: performance.now() - (r.menu + 60 - 16) * 33.427 };
    const ms = []; let n = 0;
    while (n++ < 60) { const t0 = performance.now(); F.v122.planT7(); ms.push(Math.round(performance.now() - t0)); if (!FB.t7.plan || FB.t7.plan.none !== 'working') break; await new Promise(z => setTimeout(z, 30)); }
    return { ms, plan: FB.t7.plan && { none: FB.t7.plan.none || null, states: FB.t7.plan.states, planned: FB.t7.plan.planned }, working: T.SLOG.filter(e => e.ev === 'fb2T7Working').length };
  }, FIX.runs);
  console.log('  T7 replans (ms): ' + t7.ms.join(' ') + ' -> ' + JSON.stringify(t7.plan));
  ok(t7.ms.length > 1 && Math.max(...t7.ms) < 600 && t7.working === 1, '4. 3000 T7 states: worked out over ' + t7.ms.length + ' replans, the longest ' + Math.max(...t7.ms) + ' ms (was ~4 s each)');
  ok(t7.plan && t7.plan.none !== 'working' && t7.plan.states === 3000 && t7.plan.planned === 1500, '4. then planned on the heaviest 1500 of 3000 states (' + JSON.stringify(t7.plan) + ')');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
