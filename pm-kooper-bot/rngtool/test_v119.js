/* v119 (charge_live/README.md v119): the Final Bowser gap history.
 *  1. fbHistCands: the built-in gaps (81 console gaps, Nov 9-15) at FBH_RATE x seconds + each offset, FBH_PAD either side,
 *     merged, at most FBH_MAXC seeds, starting at the kept seed's stream; none without a time.
 *  2. fbHistAdd: a proven gap goes into localStorage 'tot-fbgaps' (newest FBH_KEEP), the window then covers its offset;
 *     never from a replay; the session log carries the browser's gaps (more.fbGaps).
 *  3. fbStreamNote: a fresh lock after a kept one adds their gap (steps, seconds trigger to trigger); a lock made on the
 *     history's window alone adds nothing (it would teach itself).
 *  4. Replays (the session log in the uploads folder, skipped when absent): T4 of 6b0ea0f2 on T2's seed with the history
 *     (its own gap left out) locks 3ecf87c7 on the history's window; the same pictures with the initial rays dropped
 *     (a faint Charge) still lock there; wrong windows never lock.
 * usage: node test_v119.js [PAGE=...] */
const fs = require('fs');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const U = '/root/.claude/uploads/4de37507-9387-5f1e-bab5-10167305f887', L = U + '/6b0ea0f2-pm-rng-log-2026-11-18_17-35-35.json';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fwd = (s, n) => { let x = s >>> 0; for (let i = 0; i < n; i++) x = (Math.imul(x, 0x5D588B65) + 1) >>> 0; return x; };
(async () => {
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', boots: 'ultra', lead: '1.5', zwwin: '1' })); } catch (e) {} });
  await p.goto('file://' + PAGE); await p.waitForFunction(() => window.__tot);
  ok(await p.evaluate(() => window.__tot.VERSION) === 'v127', '0. page version v119');
  // ---- 1. the window
  const w = await p.evaluate(() => { const E = window.__tot.v111.ev, S = { seed: 0x92e644c9 };
    const H = E('fbHistCands')(S, 30.2), N = E('fbHistCands')(S, 0), B = E('FBH_BUILT'), R = E('FBH_RATE');
    const x0 = E('chgFwd')(S.seed, H.ranges[0][0]);
    return { ranges: H.ranges, seeds: H.cands.length, n: H.n, first: H.cands[0] === x0, none: N === null, built: B.length, rate: R, MAXC: E('FBH_MAXC'),
      long: E('fbHistCands')(S, 200).cands.length };
  });
  console.log('1.', JSON.stringify(w));
  const c = 56.9 * 30.2, cover = (lo, hi) => w.ranges.some(r => r[0] <= c + lo && r[1] >= c + hi);
  ok(w.built === 81 && w.rate === 56.9 && w.first, '1. 81 built-in gaps, 56.9 steps a second, the window on the kept seed\'s stream');
  ok(cover(98, 138) && cover(634, 676) && w.seeds <= w.MAXC && w.seeds < 1000, '1. at 30.2 s the window covers +98..138 and +634..676 (' + w.seeds + ' seeds, ' + w.ranges.length + ' ranges)');
  ok(w.none && w.long <= w.MAXC, '1. no window without a time; a long gap stays within FBH_MAXC (' + w.long + ')');
  // ---- 2. the browser's gaps
  const h = await p.evaluate(() => { const E = window.__tot.v111.ev, S = { seed: 0x92e644c9 }, out = {};
    const before = E('fbHistCands')(S, 30.2); const off = 2000, sec = 30.2, steps = Math.round(56.9 * sec + off);
    out.coveredBefore = before.ranges.some(r => r[0] <= steps && r[1] >= steps);
    E('fbHistAdd')(steps, sec, 'test'); out.stored = JSON.parse(localStorage.getItem('tot-fbgaps')).length;
    const after = E('fbHistCands')(S, 30.2); out.coveredAfter = after.ranges.some(r => r[0] <= steps && r[1] >= steps);
    for (let i = 0; i < 320; i++) E('fbHistAdd')(5000 + i, 80, 'test'); out.capped = JSON.parse(localStorage.getItem('tot-fbgaps')).length;
    E('CHG').replay = { x: 1 }; E('fbHistAdd')(4000, 60, 'test'); out.noReplay = JSON.parse(localStorage.getItem('tot-fbgaps')).length; E('CHG').replay = null;
    out.ev = window.__tot.v106.SLOG.filter(e => e.ev === 'fbHistAdd').length;
    localStorage.removeItem('tot-fbgaps'); return out; });
  ok(!h.coveredBefore && h.stored === 1 && h.coveredAfter, '2. a new gap (+2000) is stored and the window then covers it');
  ok(h.capped === 300 && h.noReplay === 300 && h.ev === 321, '2. the newest 300 kept, none from a replay, each logged (' + JSON.stringify(h) + ')');
  const lg = await p.evaluate(() => new Promise(res => { const E = window.__tot.v111.ev; E('fbHistAdd')(1800, 30, 'test');
    const o = URL.createObjectURL; URL.createObjectURL = bl => { bl.text().then(t => res(JSON.parse(t).more.fbGaps)); URL.createObjectURL = o; return o(bl); }; document.getElementById('dl-log').click(); }));
  ok(Array.isArray(lg) && lg.length === 1 && lg[0][0] === 1800, '2. the session log carries the browser\'s gaps');
  // ---- 3. fbStreamNote
  const n = await p.evaluate(() => { const E = window.__tot.v111.ev, C = E('CHG'), F = E('FB14'), out = {}; localStorage.removeItem('tot-fbgaps');
    const a = 0x92e644c9, bb = E('chgFwd')(a, 2818); E('fb14Reset')();
    C.trig = { t: 1000 }; E('fbStreamNote')(a, 'fresh');
    C.trig = { t: 1000 + 39800 }; E('fbStreamNote')(bb, 'fresh');
    const g = JSON.parse(localStorage.getItem('tot-fbgaps') || '[]'); out.fresh = g.length === 1 && g[0][0] === 2818 && Math.abs(g[0][1] - 39.8) < 0.01;
    C.trig = { t: 1000 + 79600 }; E('fbStreamNote')(E('chgFwd')(bb, 2700), 'stream', false);
    out.histOnly = JSON.parse(localStorage.getItem('tot-fbgaps')).length === 1;
    C.trig = null; localStorage.removeItem('tot-fbgaps'); E('fb14Reset')(); return out; });
  ok(n.fresh, '3. a fresh lock after a kept one adds their gap (2818 steps, 39.8 s)');
  ok(n.histOnly, '3. a lock on the window alone adds nothing');
  // ---- 4. replays
  if (!fs.existsSync(L)) console.log('skip 4: the session log is not in ' + U);
  else {
    const C = JSON.parse(fs.readFileSync(L, 'utf8')).chargeCaptures, W = x => Date.parse(x.wall);
    const sec = (W(C[2]) - W(C[1])) / 1000, B = await p.evaluate(() => window.__tot.v111.ev('FBH_BUILT')), loo = B.filter(x => x[0] !== 2818);
    const run = o => p.evaluate(async ({ cap, o }) => { const r = await window.__tot.chgReplay(cap, o); const s = r.info && r.info.stream; return { state: r.state, seed: r.best && r.best.seed, ratio: r.best && r.best.ratio, hw: s && s.histWin, tries: s && s.tries }; }, { cap: C[2], o });
    const r1 = await run({ stream: '92e644c9', hist: loo, histSec: sec, streamOnly: true });
    console.log('4.', sec, JSON.stringify(r1));
    ok(r1.state === 'locked' && r1.seed === '3ecf87c7' && r1.hw && r1.hw.locked, '4. T4 on T2\'s seed with the history locks 3ecf87c7 on the history\'s window (' + (r1.hw && r1.hw.seeds) + ' seeds, ' + r1.ratio + 'x)');
    const drop = Array.from({ length: 10 }, (_, j) => C[2].trig.i + 1 + j);
    const r2 = await run({ drop, stream: '92e644c9', hist: loo, histSec: sec, streamOnly: true }), r3 = await run({ drop, stream: '92e644c9', hist: false, histSec: sec, streamOnly: true });
    console.log('4. faint', JSON.stringify(r2), JSON.stringify(r3));
    ok(r2.state === 'locked' && r2.seed === '3ecf87c7', '4. the initial rays dropped: the history\'s window still locks 3ecf87c7 (wide window alone: ' + r3.state + ')');
    let wrong = 0; for (const s of ['5ca1ab1e', '2850d6af', 'deadbeef']) { const r = await run({ stream: s, hist: loo, histSec: sec, streamOnly: true }); if (r.state === 'locked') wrong++; }
    ok(!wrong, '4. three wrong windows with the history: no lock');
  }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
