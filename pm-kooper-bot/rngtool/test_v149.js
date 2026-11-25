/* v149: (1) the route's three Life Shrooms: a state revives on each of three hits, not only the first (fbShroomLeft / fbShroomUse);
 * the HP watch reads a second and third T1-T3 hit as a revive (console 11-24 20:56: Life Shrooms on T1, T2 and T6; 21:00 on T2 and T3),
 * not as Mario down for good. (2) T4 looks up to FB14_KEY_S4 (10) s on for a 90% frame (T2 / T3 3 s). usage: node test_v149.js [page] */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') === 'v150', 'page version v149');
  const r = JSON.parse(await E(`(() => { const S = fbNew({ s: 1, nc: 0, f: 0, c: new Uint8Array(20), ph: [0, 0], l: 0, w: 1 }); const seq = [];
    for (let i = 0; i < 4; i++) { const left = fbShroomLeft(S); seq.push(left); if (left) fbShroomUse(S); }
    const C = fbClone(S); return JSON.stringify({ n: FB14_SHROOMS, seq, left: S.shroom, cloned: C.shroom, k4: FB14_KEY_S4, k: FB14_KEY_S }); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.n === 3 && r.seq.join() === 'true,true,true,false' && r.left === 0 && r.cloned === 0, '(1) a state revives on three hits, not a fourth (and the count survives fbClone)');
  const src = await E('fb14HpWatch.toString()');
  ok(/open <= 3 && Object\.keys\(FB14\.hits \|\| \{\}\)\.length < FB14_SHROOMS/.test(src), '(1) the HP watch reads up to FB14_SHROOMS T1-T3 hits as revives');
  ok(r.k4 === 10 && r.k === 3, '(2) T4 looks 10 s on for a 90% frame, T2 / T3 3 s');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
