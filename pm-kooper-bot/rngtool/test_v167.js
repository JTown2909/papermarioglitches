/* v167 (console 11-26 12:09 / 11:57): Bowser's T6 attack read on the main T7 step (Fire Breath's orange, as T1-T4) weighs the T7 states
 * by their own T6 attack. usage: PAGE=... node test_v167.js */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.env.PAGE || process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') >= 'v167', 'page version v167+');
  const r = JSON.parse(await E(`(() => { const T = window.__tot, i7 = T.RT().findIndex(s => s.turn === 'fb2_pb' && !s.b8); T.setStep(i7);
    const mk = makePlan; makePlan = () => {}; const out = {};
    const grid = fire => { const n = 32 * 24, g = new Uint8ClampedArray(n * 4); for (let i = 0; i < n; i++) { const f = fire && i < n * 0.3; g[4 * i] = f ? 230 : 40; g[4 * i + 1] = f ? 90 : 40; g[4 * i + 2] = f ? 20 : 60; } return g; };
    for (const fire of [true, false]) { FB2.t7 = { states: [{ w: 1, a: { atk: 'fire' } }, { w: 1, a: { atk: 'slam' } }, { w: 1, a: { atk: 'claw' } }] }; FB2.pT = 1000;
      window.__fbVisTest = () => grid(fire); for (let k = 0; k < 300 && FB2.t7.atkSeen == null; k++) fb2AtkWatch(1100 + k * 16.7, true);
      out[fire ? 'fire' : 'none'] = { seen: FB2.t7.atkSeen, w: FB2.t7.states.map(o => o.w) }; }
    delete window.__fbVisTest; makePlan = mk; FB2.t7 = null; FB2.pT = null; return JSON.stringify(out); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.fire.seen === true && r.fire.w[0] === 1 && r.fire.w[1] < 0.05 && r.fire.w[2] < 0.05, 'Fire Breath seen: the fire states keep their weight, Body Slam / Claw drop');
  ok(r.none.seen === false && r.none.w[0] < 0.05 && r.none.w[1] === 1 && r.none.w[2] === 1, 'no fire through the stretch: Body Slam / Claw keep, Fire Breath drops');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
