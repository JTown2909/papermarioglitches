/* v166 (console 11-26 11:57, 11:07): the HP reader's 3 on the console clip (9-10 pixels off the stored 3) reads as 3; the 0 of 10/10
 * as before; a blank mask reads nothing. usage: PAGE=... node test_v166.js */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.env.PAGE || process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') >= 'v166', 'page version v166+');
  const r = JSON.parse(await E(`JSON.stringify({
    c3a: fb2OnesDigit('011111001111110011011100000110000001100000001100111011101111111001111100'),     /* clip 11:57, 109.5 s (distance 10 to the stored 3) */
    c3b: fb2OnesDigit('011111001111110011111100000110000001100000001100111011101111111001111100'),
    c0: fb2OnesDigit('000110000011110000111110011101100110001011100010111001100111110000111000'),      /* 10/10's 0 (distance 7) */
    blank: fb2OnesDigit('0'.repeat(72)), t3: fb2OnesDigit(FB2_ONES_T['3']), t1: fb2OnesDigit(FB2_ONES_T['1']) })`));
  console.log('     ' + JSON.stringify(r));
  ok(r.c3a === 3 && r.c3b === 3, "the console's 3 (11:57 clip) reads 3");
  ok(r.c0 === 0 && r.t3 === 3 && r.t1 === 1, 'the stored digits and the 0 of 10/10 as before');
  ok(r.blank === null, 'a blank box reads nothing');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
