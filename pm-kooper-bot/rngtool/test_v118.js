/* v118 (charge_live/README.md v118): Final Bowser practice from a save (console log 6b0ea0f2, page v116, Nov 18): T1 and T2
 * no-locked, T4 locked 3ecf87c7.
 *  1. The stream: T2's seed 92e644c9 is 2818 steps before T4's 3ecf87c7 and T1's 380824d5 1212 before T2's; T1's no-lock had
 *     380824d5 as its best placement (1.5x live, 1.48x replayed). The T1 read, replayed, ends with that best kept as the weak
 *     stream (info.weak); T2 on that window locks 92e644c9 (full lock ratio); T4 on T2's window locks 3ecf87c7.
 *  2. Without the window T2 is still a no-lock (the search is unchanged): no lock is made that the pictures alone do not carry.
 *  3. Wrong weak windows (random seeds) never lock T2 / T4 of this log.
 *  4. fbWeakNote: kept only from FBW_RATIO and CHG_MIN; a lock (fbStreamNote) and a new attempt (fb14Reset) clear it; the
 *     window is the stream's (fbWeakWin).
 * The kept reads hold pictures, so they are read from the session log in the uploads folder, never copied into the repository;
 * 1-3 are skipped (and said so) when the log is not there.  usage: node test_v118.js [PAGE=...] */
const fs = require('fs');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const U = '/root/.claude/uploads/4de37507-9387-5f1e-bab5-10167305f887', L = U + '/6b0ea0f2-pm-rng-log-2026-11-18_17-35-35.json';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fwd = (s, n) => { let x = s >>> 0; for (let i = 0; i < n; i++) x = (Math.imul(x, 0x5D588B65) + 1) >>> 0; return x; };
const steps = (from, to, max) => { let x = from >>> 0; for (let k = 0; k <= max; k++) { if (x === (to >>> 0)) return k; x = fwd(x, 1); } return -1; };
(async () => {
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', boots: 'ultra', lead: '1.5', zwwin: '1' })); } catch (e) {} });
  await p.goto('file://' + PAGE);
  const replay = (cap, opts) => p.evaluate(async ({ cap, opts }) => { const r = await window.__tot.chgReplay(cap, opts || {}); return { state: r.state, best: r.best, alt: r.alt, weak: r.info && r.info.weak, stream: r.info && r.info.stream }; }, { cap, opts });
  ok(steps(0x380824d5, 0x92e644c9, 2000) === 1212 && steps(0x92e644c9, 0x3ecf87c7, 4000) === 2818, '0. the stream: 380824d5 -> 1212 -> 92e644c9 -> 2818 -> 3ecf87c7');
  ok(steps(0x1ef97264, 0x380824d5, 100) === 33, '0. T1\'s first placement\'s best 1ef97264 (1.31x) is 33 steps before 380824d5: the same answer a few draws off');
  if (!fs.existsSync(L)) console.log('skip 1-3: the session log is not in ' + U);
  else {
    const C = JSON.parse(fs.readFileSync(L, 'utf8')).chargeCaptures;
    ok(C[0].result.outcome === 'nolock' && C[0].result.seed === '380824d5' && C[1].result.outcome === 'nolock' && C[2].result.seed === '3ecf87c7', '1. live: T1 no-lock (best 380824d5 1.5x), T2 no-lock, T4 3ecf87c7');
    // ---- 1. the chain
    const t1 = await replay(C[0], { maxAlts: 2 });
    console.log('1. T1', JSON.stringify(t1));
    ok(t1.state === 'nolock' && t1.weak && t1.weak.seed === '380824d5' && t1.weak.ratio >= 1.3, '1. T1 replays to a no-lock that keeps 380824d5 as the weak stream (' + (t1.weak && t1.weak.score + ', ' + t1.weak.ratio + 'x, placement ' + (t1.weak.alt + 1)) + ')');
    const t2 = await replay(C[1], { weak: t1.weak ? t1.weak.seed : '380824d5' });
    console.log('1. T2', JSON.stringify(t2));
    ok(t2.state === 'locked' && t2.best.seed === '92e644c9' && t2.best.ratio >= 1.8 && t2.best.stream && t2.best.stream.steps === 1212 && t2.best.stream.weak === '380824d5', '1. T2 on the weak window locks 92e644c9 (' + (t2.best && t2.best.score + ', ' + t2.best.ratio + 'x') + ', 1212 steps after T1\'s best)');
    const t4 = await replay(C[2], { stream: '92e644c9' });
    ok(t4.state === 'locked' && t4.best.seed === '3ecf87c7' && t4.best.stream && t4.best.stream.steps === 2818, '1. T4 on T2\'s window locks 3ecf87c7, the live lock (' + (t4.best && t4.best.score + ', ' + t4.best.ratio + 'x') + ')');
    // ---- 2. no window: unchanged
    const t2p = await replay(C[1], { maxAlts: 2 });
    ok(t2p.state === 'nolock', '2. T2 without the window: ' + t2p.state + ' (best ' + (t2p.best && t2p.best.seed + ' ' + t2p.best.ratio + 'x') + ')');
    // ---- 3. wrong weak windows
    let wrong = 0, mx = 0; const W = ['5ca1ab1e', '2850d6af', 'deadbeef', '12345678', '9abcdef0', '0d269438'];     // (not T1's first-placement best 1ef97264: 33 steps before 380824d5, the same stream)
    for (const [i, s] of [[1, W[0]], [1, W[1]], [1, W[2]], [2, W[3]], [2, W[4]], [2, W[5]]]) { const r = await replay(C[i], { weak: s, streamOnly: true });
      if (r.state === 'locked') wrong++; if (r.stream) for (const t of r.stream.tries) mx = Math.max(mx, t.ratio); }
    ok(!wrong && mx < 1.8, '3. six wrong weak windows over T2 / T4: no lock (best ratio ' + mx + ')');
  }
  // ---- 4. fbWeakNote
  { const r = await p.evaluate(() => { const E = window.__tot.v111.ev, F = E('FB14'), out = {};
      E('fb14Reset')(); E('fbWeakNote')({ seed: '380824d5', score: 3313, ratio: 1.5, alt: 2 }); out.kept = F.weak && F.weak.seed === 0x380824d5;
      const w = E('fbWeakWin')(); out.win = w && w.hi === E('FBS_HI') && w.seed === 0x380824d5;
      E('fbStreamNote')(0x92e644c9, 'stream'); out.clearedByLock = F.weak === null;
      E('fbWeakNote')({ seed: '380824d5', score: 3313, ratio: 1.5, alt: 2 }); E('fb14Reset')('new attempt'); out.clearedByReset = F.weak === null;
      E('fbWeakNote')({ seed: '11111111', score: 3313, ratio: 1.2, alt: 0 }); out.lowRatio = F.weak === null;
      E('fbWeakNote')({ seed: '11111111', score: 1900, ratio: 1.6, alt: 0 }); out.lowScore = F.weak === null;
      out.ev = window.__tot.v106.SLOG.filter(e => e.ev === 'fbWeakNote').length; E('fb14Reset')(); return out; });
    ok(r.kept && r.win, '4. a no-lock with 1.5x keeps its best as the weak stream, on the stream window (' + JSON.stringify(r) + ')');
    ok(r.clearedByLock && r.clearedByReset, '4. a lock and a new attempt clear it');
    ok(r.lowRatio && r.lowScore && r.ev === 2, '4. under FBW_RATIO or CHG_MIN nothing is kept');
  }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
