/* v124 (the runner: "we really just need a good jr bounce, time out on hallway, dodged final bowser wave on turn 4, and the high
 * bounce on final bowser ... we need better numbers, like 90% or above"): on the key levers (Time Out, Jr. Troopa's Power Bounce)
 * a plan under 90% with the press spread looks up to 3 s further for a frame that reaches 90% (or is 10 points likelier).
 * Time Out on one known seed (as test_zw_wait): over 40 seeds the plans with the look-ahead are never worse, and where it moved
 * the plan the new frame reaches 90% or gains 10 points.
 * usage: node test_v124.js [PAGE] */
const { chromium } = require('playwright');
const PAGE = process.argv[2] || process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); await p.evaluate(() => localStorage.setItem('tot-settings', JSON.stringify({ off: '-5', beeps: '3', lead: '1.5', zwwin: '1', zwlater: '1.5', zwedge: '0', vlag: '50', wtype: 'best' }))); await p.goto('file://' + PAGE);
  const r = await p.evaluate(() => {
    const T = window.__tot, zw = T.zw, rate = 33.427, out = { v: T.v111.ev('VERSION'), rows: [] };
    T.setStep(T.RT().findIndex(x => x.prof === 'timeout'));
    const one = (seed, noKey) => { window.__noKeyLater = noKey; const now = performance.now();
      Object.assign(zw, { on: true, dead: false, t0: now - 2000, rate, taps: [], vis: [], visFrom: null, visTo: null, visLocked: false, parts: [{ S: { s: seed >>> 0, nc: 0, inst: [] }, g: 0, ev: new Map(), evMax: -1, pauseAt: 0, pause: 0, w: 1, m: new Set() }], nBase: 1 });
      T.cancelBeeps && T.cancelBeeps({ force: true }); T.st.series = null; T.st.plan = null; T.st.tooSoon = null; T.makePlan(); const P = T.st.plan;
      return P && P.mix ? { p: P.mix.p, target: P.target, tPress: P.tPress } : null; };
    let s = 0x2468ace1;
    for (let i = 0; i < 40; i++) { s = (Math.imul(s, 0x5D588B65) + 1) >>> 0; const a = one(s, true), k = one(s, false); out.rows.push({ a, k }); }
    out.moved = T.SLOG.filter(e => e.ev === 'keyLater'); window.__noKeyLater = false; return out; });
  const both = r.rows.filter(x => x.a && x.k), moved = both.filter(x => x.k.target !== x.a.target);
  console.log('  plans ' + both.length + ', moved by the look-ahead ' + moved.length + ': ' + moved.slice(0, 6).map(x => Math.round(100 * x.a.p) + '% -> ' + Math.round(100 * x.k.p) + '% (+' + ((x.k.tPress - x.a.tPress) / 1000).toFixed(1) + ' s)').join(', '));
  ok(r.v === 'v138', 'page version v124');
  ok(both.length >= 20 && both.every(x => x.k.p >= x.a.p - 1e-9), 'the look-ahead never makes a Time Out plan less likely');
  ok(moved.length > 0 && moved.every(x => x.k.p >= 0.9 - 1e-9 || x.k.p >= x.a.p + 0.1 - 1e-9) && r.moved.length >= moved.length, 'where it moved the plan: 90% or 10 points more, logged (keyLater)');
  // T4: Lakilester's block beeps after the Do Nothing confirm (P + 87)
  const bl = await p.evaluate(async () => { const T = window.__tot, E = c => T.v111.ev(c), RT = T.RT(), i4 = RT.findIndex(s => s.fb14 === 4 && s.fb14role === 'lever'); T.setStep(i4);
    let osc = 0; const AC = window.AudioContext; if (AC) { const o = AC.prototype.createOscillator; AC.prototype.createOscillator = function () { osc++; return o.call(this); }; }
    const tObs = performance.now(); E('fb14Confirm(' + tObs + ', RT()[' + i4 + '], null, "screen")'); E('setStep(' + (i4 + 1) + ')'); E('cancelBeeps()');
    await new Promise(r => setTimeout(r, 3300)); const L = T.SLOG.filter(e => /^fb14Block/.test(e.ev)); return { L, osc, rate: E('fbRate()'), van: E('fb14Van("S", "screen")'), off: +document.getElementById('s-off').value, vlag: +document.getElementById('s-vlag').value, bias: E('fb14Bias("fb14")') }; });
  console.log('  ' + JSON.stringify(bl));
  const bb = bl.L.find(e => e.ev === 'fb14BlockBeeps'), want = (87 - bl.van - 1.7 + bl.off + bl.bias) * bl.rate - bl.vlag;
  ok(bb && Math.abs(bb.inMs - want) < 40 && bl.L.some(e => e.ev === 'fb14BlockSeries') && bl.osc >= 3, 'T4: three block beeps after the Do Nothing confirm, the last on its frame + 87 (' + (bb && bb.inMs) + ' ms, want ' + Math.round(want) + '), made after a cancel');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
