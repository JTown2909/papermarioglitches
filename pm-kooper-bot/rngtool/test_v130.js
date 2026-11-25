/* v130: (a) Final Bowser T3's per-frame chance (the % box after a press) and the "seed confidence" use the floored doubt, as
 * the plan's own odds (the 11:21 run: 100% shown for the frame hit on an 82% plan). (b) each bolt read logs the heaviest state's
 * phases, its bolt slots in the window and the phase the read implies (the v128 runs' reads matched no state). */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE);
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E(`VERSION`) === 'v151', 'page version v130');
  // (a) the source: the chance array takes dEff; the text: a floor of 0.35 on doubt 0 reads 65%
  ok(await E(`String(fb14Plan).includes('chance.push((1 - dEff) * v + dEff')`), 'T3 per-frame chance uses the floored doubt');
  const t = await E(`ppText({ p: 0.82, pp: 0.82, ppStates: 1, win: 6, doubt: 0, floor: 0.35 }, 'fb14')`);
  ok(/seed confidence 65%/.test(t), 'the plan text\'s seed confidence uses the floor (' + t.slice(0, 120) + ')');
  const t2 = await E(`ppText({ p: 0.9, pp: 0.9, ppStates: 1, win: 3, doubt: 0.02 }, 'jrcc_nothing')`);
  ok(/seed confidence 98%/.test(t2), 'no floor: the doubt as before (' + t2.slice(0, 80) + ')');
  // (b) the diagnostic
  const r = JSON.parse(await E(`(() => { const sv = [FB14.on, FB14.states]; FB14.on = true; FB14.states = [fbNew({ s: 5, nc: 1e6, f: 0, c: new Uint8Array(20), ph: [37, 151], l: 1, w: 1 })];
    const orig = fbbFactor; fbbFactor = () => 0.5; const res = fbbApply({ kind: 'sky', k: 'fb14', F1: 300, n: 5, best: { type: 2, u: 10, L0: 3 } }); fbbFactor = orig; [FB14.on, FB14.states] = sv; return JSON.stringify(res.top); })()`));
  const want = [2, 3, 4].map(bk => (((78 - (300 - bk - 1)) % 220) + 220) % 220).join('/');
  ok(r && r.ph && r.ph[1] === 151 && r.l === 1 && r.ph1For === want, 'bolt read diagnostic: the top state\'s phases and the implied second phase (' + JSON.stringify(r) + ')');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'all ok'); process.exit(fails ? 1 : 0);
})();
