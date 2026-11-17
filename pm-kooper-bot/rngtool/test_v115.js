/* v115 (the runner's logs of 2026-11-17):
 *  1. Duplighosts T1 no-locked twice (15-42-11 / 15-42-41): every placement's best was the right seed, the runner-up the same
 *     seed one RNG step back (2aa59bf8 6387 / e25f4a2b 3680). A seed on the best one's own stream is not a rival
 *     (chgRunnerUp): both reads lock on their first placement. The kept reads hold pictures, so they are read from the
 *     session's uploads, never from the repository (skipped when absent). Every earlier no-lock in the uploads stays one.
 *  2. A press keeps the plan's white tips (tab4: the 6 cap / the all 4) and its chances (the dimming) on the strip.
 *     The ✓ over the strip gives the chance of the frame hit, as the press table does.
 *  3. The Close Call label names no partner (the Partnerless route has none).
 * usage: [PAGE=...] node test_v115.js */
const fs = require('fs'), http = require('http');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const U = '/root/.claude/uploads/4de37507-9387-5f1e-bab5-10167305f887';
const READS = [['7ebb4daa-pm-rng-log-2026-11-17_15-42-11.json', '2aa59bf8'], ['0968741b-pm-rng-log-2026-11-17_15-42-41.json', '87036f20']];
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); fs.createReadStream(PAGE).pipe(r); }); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [], p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:' + srv.address().port + '/');
  for (const [f, seed] of READS) {
    if (!fs.existsSync(U + '/' + f)) { console.log('skip ' + f + ' (not in the uploads)'); continue; }
    const c = JSON.parse(fs.readFileSync(U + '/' + f, 'utf8')).chargeCaptures[0];
    const r = await p.evaluate(async c => { const r = await window.__tot.chgReplay(c, { maxAlts: 0 }); return { state: r.state, best: r.best }; }, c);
    ok(r.state === 'locked' && r.best && r.best.seed === seed, '1. ' + f.slice(9, 39) + ': locks ' + seed + ' on the first placement (' + JSON.stringify(r.best) + ')');
  }
  const p2 = await b.newPage(); p2.on('pageerror', e => errs.push(String(e)));
  await p2.addInitScript(() => { try { localStorage.clear(); } catch (e) {} window.__now = 1000; performance.now = () => window.__now; });
  await p2.goto('file://' + PAGE);
  const r = await p2.evaluate(() => { const T = window.__tot, E = c => T.v111.ev(c);
    const tab = new Array(40).fill(false), tab4 = new Array(40).fill(false), ch = new Array(40).fill(0); for (let c = 203; c <= 206; c++) { tab[c - 180] = true; ch[c - 180] = 0.6; } tab4[204 - 180] = true;
    window.__P = { tMade: 0, w: { start: 203, end: 206, length: 4 }, target: 204, rate: 33.4, first: 180, tab, tab4, chance: ch, mix: { p: 0.9 } };
    E('pressShow(window.__P, 204.1, "test")'); E('st.plan = null'); const d = E('stripData()');
    return { src: d.src, p: d.p, tab4: d.tab4 && d.tab4[24], chance: d.chance && d.chance[24], name: E("R.PROFILES.jrcc_nothing.name") }; });
  ok(r.src === 'press' && r.tab4 === true && r.chance === 0.6, '2. after the press the strip keeps the white tips and the chances (' + JSON.stringify(r) + ')');
  ok(r.p === 0.6, '2. the label over the strip gives the hit frame\'s chance (0.6), not the plan\'s (0.9): ' + r.p);
  ok(!/Bombette/.test(r.name), '3. the Close Call label names no partner: ' + r.name);
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
