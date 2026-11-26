/* v140: a fresh lock's coin history before the Charge follows every branch the RNG allows (e2e b2000001 T1: the true fit's
 * walk stopped at a coin where a 24- and a 48-frame gap both fit, kept no menu shines and the coin cut it).
 * (1) with one history allowed, fbBackShinesAll is v139's fbBackShines; (2) every branch starts as v139's walk did, the shares
 * sum to 1, no more than FB14_BACK_BR; (3) some walks do branch (the ambiguity is common).
 * usage: node test_v140.js [page] */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE);
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E(`VERSION`) === 'v156', 'page version v140');
  const r = JSON.parse(await E(`(() => { let same = 0, n = 0, pre = 0, sum1 = 0, cap = 0, br = 0, hist = 0; let x = 12345;
    const rnd = m => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x % m; };
    for (let t = 0; t < 1500; t++) { const c = new Uint8Array(20); for (let j = 0; j < 20; j++) c[j] = rnd(4); const ph = [rnd(130), rnd(220)];
      const s = (rnd(65536) * 65536 + rnd(65536)) >>> 0, F0 = 400, q = F0 + 1 + rnd(48), fromF = 400 - 100 - rnd(300);
      const o = fbBackShines(s, F0, q, c, ph, fromF), a1 = fbBackShinesAll(s, F0, q, c, ph, fromF, 1), A = fbBackShinesAll(s, F0, q, c, ph, fromF); n++;
      if (a1.length === 1 && JSON.stringify([a1[0].sh, a1[0].cf, a1[0].ok, a1[0].end]) === JSON.stringify([o.sh, o.cf, o.ok, o.end])) same++;
      if (A.every(h => o.cf.every((f, i) => h.cf[i] === f) && o.sh.every((f, i) => h.sh[i] === f))) pre++;
      if (Math.abs(A.reduce((z, h) => z + h.w, 0) - 1) < 1e-9) sum1++; if (A.length <= FB14_BACK_BR) cap++; if (A.length > 1) br++; hist += A.length; }
    return JSON.stringify({ n, same, pre, sum1, cap, br, avg: hist / n }); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.same === r.n, '(1) one history allowed: the v139 walk (' + r.same + '/' + r.n + ')');
  ok(r.pre === r.n, '(2) every branch starts as the v139 walk');
  ok(r.sum1 === r.n && r.cap === r.n, '(2) shares sum to 1, at most FB14_BACK_BR histories');
  ok(r.br > r.n * 0.1, '(3) walks branch often (' + r.br + '/' + r.n + ', ' + r.avg.toFixed(2) + ' histories each)');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
