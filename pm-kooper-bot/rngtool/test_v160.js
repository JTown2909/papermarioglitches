/* v160 (console 11-26 10:52 T3): a replan does not trade the anchor's wider window for a narrower pick unless it gains FB14_NARROW_GAIN
 * (2.2 s before the press: 3-frame 1486 -> 1-frame 1464, 0.67 vs ~0.62; pressed 1 late, hit). usage: PAGE=... node test_v160.js */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.env.PAGE || process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') >= 'v160', 'page version v160+');
  const run = async v1464 => JSON.parse(await E(`(() => { const a = 1440, share = []; for (let c = a; c <= 1520; c++) share.push(c >= 1485 && c <= 1487 ? 0.8 : c === 1464 ? ${v1464} : 0.05);
    FB14.anchor = { 3: 1486 }; const S0 = FB14.states; FB14.states = []; window.__fb14NoBroad = true;
    const C = { a, share, target: 1464, pp: ${v1464}, doubt: 0, p: ${v1464} }; const R = fb14Anchor(C, 1448, 60, 3, [[0, 1]], 0);
    FB14.states = S0; FB14.anchor = {}; delete window.__fb14NoBroad; return JSON.stringify({ t: R.target, w: R.w && R.w.length }); })()`));
  const r1 = await run(0.85), r2 = await run(0.95);
  console.log('     ' + JSON.stringify({ r1, r2 }));
  ok(r1.t === 1486 && r1.w === 3, 'a 1-frame pick 0.05 over the 3-frame anchor: the anchor stays');
  ok(r2.t === 1464, 'a 1-frame pick 0.15 over it: the replan moves');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
