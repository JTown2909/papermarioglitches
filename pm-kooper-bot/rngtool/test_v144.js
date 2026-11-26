/* v143 / v144: both stage lightning loops start with the battle, so Phase 2's fade-in from black fixes their phases.
 * (1) v143: every phase pair behind the window patterns has p130 = p220 mod 10 (emulator: six battle states, Phase 1 and 2,
 *     three ways into the fight, all on (71 + D, 11 + D)), and the six measured pairs are among them.
 * (2) v144 fb14FadeW: for a fade that puts the battle start at D, the pair (71 + D, 11 + D) and its neighbours within
 *     FB14_FADE_TOL weigh 1; three frames off, or another pair with the same 130 phase, weigh FB14_FADE_OUT.
 * (3) fb14FadeWatch on the 11-17 16:06 clip's game-area brightness around Phase 2's fade-in (numbers only, one value per
 *     capture picture): the edge is the first picture of the fade-in; a short dark stretch is no fade; off the step nothing.
 * usage: node test_v144.js [page] */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
// the clip's mean game-area brightness, 221.50-223.10 s (60 per second): the fade-out's tail, black, the fade-in
const CLIP = [23.3, 21.0, 21.0, 18.6, 18.6, 16.2, 16.2, 13.6, 13.6, 10.8, 10.9, 8.0, 8.1, 5.5, 5.6, 3.7, 3.8, 2.3, 2.4, 1.6, 1.6, 1.2, 1.3]
  .concat(new Array(56).fill(0.9), [4.7, 4.7, 9.7, 9.7, 14.1, 14.1, 17.5, 17.5, 21.5, 21.5, 25.5, 25.5, 29.2, 29.2, 33.3, 33.3]);
const EDGE = 23 + 56;     // index of the first fade-in picture
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE);
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E(`VERSION`) === 'v156', 'page version v144');
  // (1)
  const MEAS = [[71, 11], [62, 212], [61, 211], [82, 192], [44, 194], [60, 210], [70, 0]];
  const r1 = JSON.parse(await E(`(() => { const P = fb2Patterns(); let n = 0, bad = 0; const all = new Set();
    for (const x of P.list) for (const [a, b] of x.ph) { n++; if ((a - b) % 10) bad++; all.add(a + ',' + b); }
    return JSON.stringify({ n, bad, pats: P.list.length, meas: ${JSON.stringify(MEAS)}.map(([a, b]) => all.has(a + ',' + b)) }); })()`));
  console.log('     ' + JSON.stringify(r1));
  ok(r1.bad === 0 && r1.n === 130 * 22, '(1) ' + r1.n + ' pairs (130 x 22), all p130 = p220 mod 10; ' + r1.pats + ' patterns');
  ok(r1.meas.every(Boolean), '(1) the six measured battle states\' pairs (and the cutscene run\'s) are all kept');
  // (2)
  const r2 = JSON.parse(await E(`(() => { const out = [];
    for (const D of [0, 640 + 127, 1999, 2859]) { window.__fb14fadeF = FB14_FADE_E - D;
      const pr = d => [((71 + D + d) % 130 + 130) % 130, ((11 + D + d) % 220 + 220) % 220];
      out.push({ D, at: fb14FadeW(pr(0), 0), p2: fb14FadeW(pr(2), 0), m2: fb14FadeW(pr(-2), 0), p3: fb14FadeW(pr(3), 0), m3: fb14FadeW(pr(-3), 0),
        other: fb14FadeW([pr(0)[0], (pr(0)[1] + 130) % 220], 0), lag: fb14FadeW(pr(1), 1) }); }
    window.__fb14fadeF = null; return JSON.stringify(out); })()`));
  console.log('     ' + JSON.stringify(r2));
  ok(r2.every(x => x.at === 1 && x.p2 === 1 && x.m2 === 1 && x.lag === 1), '(2) the fade\'s pair and its neighbours within 2 frames weigh 1 (a lag-1 state one later)');
  ok(r2.every(x => x.p3 < 0.1 && x.m3 < 0.1 && x.other < 0.1), '(2) 3 frames off, or the same 130 phase on another battle start: FB14_FADE_OUT');
  // (3)
  const r3 = JSON.parse(await E(`(() => { const T = window.__tot, i1 = T.RT().findIndex(s => s.fb14 === 1 && s.fb14role === 'charge'), iL = T.RT().findIndex(s => s.fb14 === 1 && s.fb14role === 'lever');
    const s0 = sample; let cur = 0; sample = () => { const a = new Array(768 * 4); for (let i = 0; i < a.length; i++) a[i] = cur; return a; };
    const run = (vals, step) => { T.setStep(step); FBFADE.t = null; FBFADE.n = 0; vals.forEach((v, i) => { cur = v; fb14FadeWatch(1000 + i * 1000 / 60); }); return FBFADE.t; };
    const clip = ${JSON.stringify(CLIP)}, short = clip.slice(0, 23).concat(new Array(10).fill(0.9), clip.slice(79));
    const res = { i1, edge: run(clip, i1), short: run(short, i1), off: run(clip, iL) }; sample = s0; return JSON.stringify(res); })()`));
  console.log('     ' + JSON.stringify(r3));
  ok(r3.i1 >= 0 && Math.abs(r3.edge - (1000 + EDGE * 1000 / 60)) < 0.01, '(3) the clip\'s fade-in edge is found on its first picture (' + r3.edge + ')');
  ok(r3.short == null, '(3) 10 dark pictures are no fade');
  ok(r3.off == null, '(3) on T1\'s lever step the fade is not watched');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
