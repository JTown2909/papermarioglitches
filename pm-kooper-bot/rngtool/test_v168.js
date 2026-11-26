/* v168 (console 11-26 12:25): a Phase 1 T1 lock is kept as the stream window for Phase 2 T1's Charge (fbStreamNote 'p1'), and the
 * replayed 10:16 T1 capture locks from a window that starts ~10000 steps back. usage: PAGE=... node test_v168.js */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.env.PAGE || process.argv[2];
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v157.json'), 'utf8'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') >= 'v168', 'page version v168+');
  const r = JSON.parse(await E(`(() => { const T = window.__tot, i = T.RT().findIndex(s => s.fbp1); T.setStep(i); FB14.stream = null;
    const P0 = CHG.prof, I0 = CHG.info; CHG.prof = CHG_PROF.fbp1; CHG.info = { best: { seed: 'a777a06b', score: 6000, ratio: 2.3 } }; CHG.trig = { t: performance.now() };
    const rb = fbp1Build; fbp1Build = () => 0;
    try { fbp1Done('lock', null); } catch (e) {} fbp1Build = rb; CHG.prof = P0; CHG.info = I0; CHG.trig = null;
    return JSON.stringify({ stream: FB14.stream ? { seed: (FB14.stream.seed >>> 0).toString(16), how: FB14.stream.how } : null, win: !!fbStreamWin() }); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.stream && r.stream.seed === 'a777a06b' && r.stream.how === 'p1' && r.win, "Phase 1's lock is the next Charge's stream window");
  const r1 = await p.evaluate(async cap => window.__tot.chgReplay(cap, { maxAlts: 0, fb14: true, stream: 'a777a06b', streamHi: 12000, lateStream: true }).then(r => ({ state: r.state, best: r.best })), FX.t1_1016);
  ok(r1.state === 'locked' && r1.best && r1.best.seed === '29b7ee50', 'a T1 the full search misses locks from a window ~10000 steps on (' + JSON.stringify(r1.best) + ')');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
