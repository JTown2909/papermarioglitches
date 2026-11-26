/* v157 (console 11-26): (1) 10:15 T1 no lock: the full search's best at noise on all three reads; the stream window from the last lock
 * (10:13's T6, a777a06b, 26764 steps) was skipped as past the in-fight window, and holds T1's seed (29b7ee50, 10217 steps on): searched
 * after a full search that does not lock (fbStreamLate). (2) 10:13 backup T7 no lock: its seed (c336b976) 1451 steps after T6's at 24.92 s,
 * under the old window (1458-1598); 21 console pairs fit 655 + 31.9 s (+-9.4): the window holds it now and the read locks on it.
 * usage: PAGE=... node test_v157.js */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.env.PAGE || process.argv[2];
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v157.json'), 'utf8'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') >= 'v157', 'page version v157+');
  const r1 = await p.evaluate(async cap => window.__tot.chgReplay(cap, { maxAlts: 0, fb14: true, stream: 'a777a06b', streamHi: 26764, lateStream: true }).then(r => ({ state: r.state, best: r.best })), FX.t1_1016);
  console.log('     ' + JSON.stringify(r1));
  ok(r1.state === 'locked' && r1.best && r1.best.seed === '29b7ee50', '(1) 10:15 T1: the skipped window after the full search locks the true seed');
  const r1b = await p.evaluate(async cap => window.__tot.chgReplay(cap, { maxAlts: 0, fb14: true }).then(r => ({ state: r.state })), FX.t1_1016);
  ok(r1b.state === 'nolock', '(1) the full search alone still misses it (as live)');
  const c = JSON.parse(await E(`(() => { const L = fb2T7CandsFrom(0xa777a06b, ${FX.t7_sec_1013}); return JSON.stringify({ n: L.length, has: L.includes(0xc336b976) }); })()`));
  ok(c.has && c.n < 400, '(2) the backup T7 window (' + c.n + ' seeds at ' + FX.t7_sec_1013 + ' s) holds the T7 seed');
  const r2 = await p.evaluate(async ([cap, sec]) => { const T = window.__tot; T.setStep(T.RT().findIndex(s => s.turn === 'fb2_k' && s.b7));
    const L = T.v111.ev(`fb2T7CandsFrom(0xa777a06b, ${sec})`); const u = new Uint32Array(L); let bin = ''; const by = new Uint8Array(u.buffer); for (let i = 0; i < by.length; i++) bin += String.fromCharCode(by[i]);
    const r = await T.chgReplay(Object.assign({}, cap, { cands: btoa(bin) }), { maxAlts: 0, fb2: true }); return { state: r.state, best: r.best }; }, [FX.t7_1013, FX.t7_sec_1013]);
  console.log('     ' + JSON.stringify(r2));
  ok(r2.state === 'locked' && r2.best && r2.best.seed === 'c336b976', '(2) 10:13 backup T7: the read locks on the new window');
  const pairs = [[21.63, 1348], [22, 1363], [21.95, 1346], [22.88, 1381], [21.32, 1328], [23.18, 1389], [24.58, 1440], [24.18, 1430], [24.17, 1423], [24.92, 1451]];
  const inW = JSON.parse(await E(`JSON.stringify(${JSON.stringify(pairs)}.map(([s, n]) => { let x = 1; const L = fb2T7CandsFrom(x, s); let y = x; for (let i = 0; i < n; i++) y = fbAdv(y); return L.includes(y >>> 0); }))`));
  ok(inW.every(Boolean), '(2) every console T6 -> T7 pair in the window: ' + inW.map(x => x ? 'y' : 'n').join(''));
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
