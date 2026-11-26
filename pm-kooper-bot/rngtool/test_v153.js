/* v153 (console 11-25 17:14, T4 after T3's hit: the lock came 12.7 s after the Charge and the first plan 17.6 s, after the runner's press;
 * their 17 / 17 T4s with no earlier hit planned in ~5 s): after a hit with no fresh lock since (fb14AfterHitFull) (1) the Charge's
 * stream window is not searched (7.3 s there; the full search ~3 s), nor the weak window; (2) no bolt read runs while the plan waits
 * for the full read (four reads, ~2.3 s, on states about to be replaced); (3) T4's wave split is capped (21620 states: a 3.4 s catch-up).
 * usage: node test_v153.js [page] */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') === 'v156', 'page version v153');
  const r = JSON.parse(await E(`(() => { const out = {};
    const st = (h, f) => { FB14.hitT = h; FB14.freshT = f; return fb14AfterHitFull(); }; out.af = [st(null, 0), st(5000, 1000), st(5000, 6000)]; FB14.hitT = null; FB14.freshT = 0;
    const src = chgSolve.toString(); out.noStream = /if \\(SW && noStream\\)/.test(src) && /!SW && !cands && !E && !noStream/.test(src);
    const T = window.__tot, n0 = T.SLOG.length; FB14.holdRefine = { turn: 4, t: performance.now() }; fbbRead({ k: 'fb14', kind: 'sky', pics: [{ F: 1 }, { F: 2 }, { F: 3 }] }); FB14.holdRefine = null;
    out.drop = T.SLOG.slice(n0).filter(e => e.ev === 'boltReadDrop').map(e => e.why);
    out.cap = /if \\(turn === 4\\) FB14\\.states = fb14Cap\\(fb14WaveSplit\\(FB14\\.states\\)\\)/.test(fb14Lock.toString());
    return JSON.stringify(out); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.af.join() === 'false,true,false', 'fb14AfterHitFull: only a hit since the last fresh lock');
  ok(r.noStream, '(1) after a hit the stream and weak windows are skipped for the full search');
  ok(r.drop.includes('full read pending'), '(2) no bolt read while the plan waits for the full read');
  ok(r.cap, "(3) T4's wave split is capped");
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
