/* v158 (console 11-26 10:39): (1) a replan keeps a keyLater target past the window (T3: 1761 scored 0.17 by a broad share that stopped
 * at the window's end; moved to a 1-frame 1710 1.9 s before the press); (2) a hit before the last fresh lock does not make later carried
 * locks refine in full (T4's 3.91 lock replaced at doubt 0.75); (3) the late window only after a full search with no near-lock.
 * usage: PAGE=... node test_v158.js */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.env.PAGE || process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') >= 'v158', 'page version v158+');
  const r = JSON.parse(await E(`(() => { const out = {};
    // (1) states whose share is 1 on 1755..1765 only (beyond the window 1688..1718), the target 1761 from keyLater
    const a = 1680, share = []; for (let c = a; c <= 1800; c++) share.push(c >= 1755 && c <= 1765 ? 0.9 : c === 1710 ? 0.85 : 0.05);
    FB14.anchor = { 3: 1761 }; const S0 = FB14.states; FB14.states = [{}, {}]; const sS = fb14Sample, sU = fb14ShareU; fb14Sample = L => L; fb14ShareU = (L, lo, hi) => { const o = []; for (let c = lo; c <= hi; c++) o.push(share[c - a] != null ? share[c - a] : 0); return o; };
    const C = { a, share, target: 1761, pp: 0.9, doubt: 0, p: 0.85 }; const R = fb14Anchor(C, 1688, 30, 3, [[0, 1]], 0); out.t1 = R.target;
    fb14Sample = sS; fb14ShareU = sU; FB14.states = S0; FB14.anchor = {};
    out.src2 = /afterHit = hitF != null && !\\(FB14.freshT != null && FB14.freshT > FB14.hitT\\)/.test(String(fb14Lock || '')) || null;
    out.lateQ = typeof FBS_LATE_Q === 'number' ? FBS_LATE_Q : null;
    return JSON.stringify(out); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.t1 === 1761, '(1) a keyLater target past the window stays (no move to the 1-frame best in the window)');
  ok(r.src2 === true, '(2) a hit before the last fresh lock leaves later carried locks alone');
  ok(r.lateQ === 1.5, '(3) the late window only under a full-search ratio of 1.5');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
