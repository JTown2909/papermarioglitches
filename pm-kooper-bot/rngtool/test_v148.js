/* v148 (the runner: "we can't afford to wait 15-20 seconds"): after a hit with no fresh lock since, a T2 / T4 Charge is not narrowed on
 * the carry (fb14ChgCands returns null: the full search starts at once, logged fb14NarrowSkipped); with no hit, or a fresh lock after
 * the hit, it is. usage: node test_v148.js [page] */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') === 'v154', 'page version v148');
  const r = JSON.parse(await E(`(() => { const T = window.__tot, out = {};
    const S = fbNew({ s: 0x12345678, nc: 400, f: 900, c: new Uint8Array(20), ph: [10, 20], l: 0, w: 1 }); FB14.on = true; FB14.states = [S]; FB14.pre = null;
    const run = (hitT, freshT) => { FB14.pendChg = { M: 1000, turn: 2 }; FB14.hitT = hitT; FB14.freshT = freshT; const n0 = T.SLOG.length; const c = fb14ChgCands();
      const hold = !!(FB14.holdRefine && FB14.holdRefine.turn === 2); FB14.holdRefine = null; return { cands: c ? c.length : null, skipped: T.SLOG.slice(n0).some(e => e.ev === 'fb14NarrowSkipped'), hold }; };
    out.noHit = run(null, 0); out.hit = run(5000, 1000); out.freshAfter = run(5000, 6000); CHG.narrow14 = null; FB14.pendChg = null; return JSON.stringify(out); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.noHit.cands > 0 && !r.noHit.skipped, 'no hit: the Charge is narrowed on the carry (' + r.noHit.cands + ' candidates)');
  ok(r.hit.cands == null && r.hit.skipped && r.hit.hold, 'a hit since the last fresh lock: no narrowing, the full search at once, no beep on the carry until it locks');
  ok(!r.noHit.hold && !r.freshAfter.hold, 'no hold without a hit since the last fresh lock');
  ok(r.freshAfter.cands > 0 && !r.freshAfter.skipped, 'a fresh lock after the hit: narrowed again');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
