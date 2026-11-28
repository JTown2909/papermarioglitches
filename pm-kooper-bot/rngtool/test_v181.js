/* v181: the backup T7's guarded Lightning Blast carries to T8 (fixtures/fb2_b7_lightning.json, emulator det/b7rows.py: every seed
 * from the Do Nothing to the T8 menu matched on this model): the page's fb2AI7 lands on the same seed after the T8 menu (AI + 172),
 * Mario lives (lucky), and unguarded it is a KO (no carry). usage: node test_v181.js [page] */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const PAGE = process.argv[2] || process.env.PAGE;
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fb2_b7_lightning.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); await p.goto('file://' + PAGE);
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') >= 'v181', 'page version v181+');
  const r = JSON.parse(await E(`(() => { const FX = ${JSON.stringify(FX)}, out = {};
    for (const gd of [true, false]) { const S = { s: parseInt(FX.s0, 16) >>> 0, nc: FX.nc0 }; fb2Idle(S, 0, FX.E, FX.ph);
      const a = fb2AI7(S, FX.E, FX.ph, true, false, gd); out[gd ? 'g' : 'u'] = { atk: a.atk, lucky: a.lucky, ok7: a.ok7, T: a.T - FX.E, s: (a.S.s >>> 0).toString(16).padStart(8, '0') }; }
    return JSON.stringify(out); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.g.atk === 'ko' && r.g.lucky && r.g.T === 172 && r.g.s === FX.sAfterT, 'guarded Lightning Blast: carried, the T8 menu on AI + 172, the seed after it ' + r.g.s + ' (emulator model ' + FX.sAfterT + ')');
  ok(r.u.atk === 'ko' && !r.u.lucky && r.u.ok7, 'unguarded: a KO (no carry to T8; counted as not the wave / shield)');
  // the T5 hit's frame weighs Body Slam vs Claw at 3 HP (v181: Body Slam +82, Claw +77; the page reads +2.7 later; held to 20 / 80)
  const w = JSON.parse(await E(`(() => { const out = {}; for (const [k, dt] of [['slam', 84.7], ['claw', 79.7], ['mid', 82.2], ['none', null]]) { FB2HP5.dt = dt; out[k] = fb2T5Flags(3); } FB2HP5.dt = null; return JSON.stringify(out); })()`));
  console.log('     ' + JSON.stringify(w));
  ok(w.slam[0][2] === 0.8 && w.claw[1][2] === 0.8 && Math.abs(w.mid[0][2] - 0.5) < 0.05 && w.none[0][2] === 0.5, 'HP 3: the hit on +82 (read 84.7) weighs Body Slam 80 %, on +77 Claw 80 %, between them half / half, unread half / half');
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
