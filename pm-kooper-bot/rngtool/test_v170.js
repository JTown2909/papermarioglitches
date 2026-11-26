/* v170 (console 11-26 12:57): the lock badge on Phase 1's steps shows Phase 1's read (it said NOT LOCKED "no seed" on a 2.33 lock).
 * usage: PAGE=... node test_v170.js */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + (process.env.PAGE || process.argv[2])); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') >= 'v170', 'page version v170+');
  const r = JSON.parse(await E(`(() => { const T = window.__tot, out = {}; const i = T.RT().findIndex(s => s.fbp1dn); T.setStep(i);
    FBP1.outcome = null; FBP1.seed = null; out.none = lockBadgeState();
    FBP1.outcome = 'lock'; FBP1.seed = 'c5aa1ab4'; FBP1.ratio = 2.33; out.lock = lockBadgeState();
    FBP1.outcome = 'nolock'; FBP1.seed = null; out.no = lockBadgeState(); FBP1.outcome = null; return JSON.stringify(out); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.lock.state === 'ok' && /c5aa1ab4/.test(r.lock.why), 'a Phase 1 lock: LOCKED with its seed');
  ok(r.none.state === 'no' && /Phase 1/.test(r.none.why) && r.no.state === 'no' && /no lock/.test(r.no.why), 'before the read / a no-lock: NOT LOCKED, saying Phase 1');
  const f = JSON.parse(await E(`(() => { const T = window.__tot, i = T.RT().findIndex(s => s.fbp1pb); T.setStep(i); const so = sample; let dark = true;
    sample = (b, w, h) => { const g = new Uint8ClampedArray(w * h * 4); g.fill(dark ? 0 : 120); return g; };
    const now = performance.now(); FBP1.t = now - 40000; for (let k = 0; k < 40; k++) fb14FadeWatch(now + k * 17); dark = false; fb14FadeWatch(now + 800);
    const to = routeStep; sample = so; FBP1.t = null; return JSON.stringify({ from: i, to, want: fbp1T1I() }); })()`));
  console.log('     ' + JSON.stringify(f));
  ok(f.to === f.want && f.to > f.from, "the fade into Phase 2 moves the route from Phase 1's Power Bounce step to Phase 2's T1 Charge");
  const g = JSON.parse(await E(`(() => { const T = window.__tot, i = T.RT().findIndex(s => s.fbp1); T.setStep(i); const so = sample; let dark = true;
    sample = (b, w, h) => { const g = new Uint8ClampedArray(w * h * 4); g.fill(dark ? 0 : 120); return g; };
    const now = performance.now(); FBP1.t = now - 40000; for (let k = 0; k < 40; k++) fb14FadeWatch(now + k * 17); dark = false; fb14FadeWatch(now + 800);
    const a = routeStep; const j = T.RT().findIndex(s => s.fbp1pb); T.setStep(j); FBP1.t = now - 400000; dark = true; for (let k = 0; k < 40; k++) fb14FadeWatch(now + 2000 + k * 17); dark = false; fb14FadeWatch(now + 3000);
    const b2 = routeStep; sample = so; FBP1.t = null; return JSON.stringify({ c: i, a, p: j, b: b2 }); })()`));
  ok(g.a === g.c && g.b === g.p, "a fade on Phase 1's Charge step (a retry's fight start) or long after Phase 1's Charge does not move the route");
  const h = JSON.parse(await E(`(() => { const T = window.__tot, i = T.RT().findIndex(s => s.fbp1pb); T.setStep(i); const now = performance.now();
    FBP1.t = now - 20000; FBP1.pT = now - 6000; FBP1.pbT = null; fbp1BarHide(now - 5980, 12000); const a = routeStep; fbp1BarHide(now, 1533); const b2 = routeStep;
    FBP1.t = null; FBP1.pT = null; FBP1.pbT = null; return JSON.stringify({ p: i, a, b: b2, want: fbp1T1I() }); })()`));
  console.log('     ' + JSON.stringify(h));
  ok(h.a === h.p && h.b === h.want, "v171: on Phase 1's Power Bounce step the bar's hide at the T2 action (not the confirm's own) moves the route to Phase 2's T1 Charge");
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
