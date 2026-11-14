/* v95: the Nov 12 afternoon console logs on v94 (charge_live/README.md v95; fixtures/console_v95.json, numbers only).
 *  1. 1509e942 T1 (a 97.6% Cloud Nine plan, read inside its window, Bowser hit): the lock is the game's seed (the stream of
 *     the attempt before, and T2's stream lock after it); the Cloud Nine outcomes leave no offset in -0.85 .. +2.15; the T1
 *     capture replayed (from the log, when present): the plan no longer claims what v94 claimed.
 *  2. The phase anchor reads the capture after the maps (CHG.F0): v94 read n 0 on every live lock.
 *  3. The edge rule on the FB2 plans: 906bfb29's T7 plan (p7 0, win 0, doubt 0.44) is "No edge, press normally", no beeps.
 *  4. The Do Nothing offset against the eight Final Bowser Do Nothing outcomes.
 * usage: node test_console_v95.js [page]   (LOG1509=path to the 1509e942 log for part 1's replay) */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const SP = '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad';
const PAGE = process.argv[2] || process.env.PAGE || SP + '/timeout_timer_v105/timeout_timer_standalone.html';
const LOG = process.env.LOG1509 || '/tmp/claude-0/pm/logs1112/1509e942-pm-rng-log-1794515986801.json';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v95.json'), 'utf8'));
let bad = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };
const lcg = x => (Math.imul(x, 0x5D588B65) + 1) >>> 0;
const steps = (a, b, n) => { let x = parseInt(a, 16) >>> 0; const t = parseInt(b, 16) >>> 0; for (let i = 0; i <= n; i++) { if (x === t) return i; x = lcg(x); } return -1; };
const inWin = (c, x, a, b, ph) => { const F = Math.floor(c + x + (ph || 0) + 0.5); return F >= a && F <= b; };
(async () => {
  // ---- 1. the seed and the Cloud Nine offset
  const S = FIX.streams, s0 = steps(S.prevT4, S.t1, 40000), s1 = steps(S.t1, S.t2, 9000), s2 = steps(S.t2, S.t4, 9000);
  check(s0 === 21792 && s1 === 2657 && s2 === 3014, '1. 1509e942 T1\'s fresh lock (436c26d0) is ' + s0 + ' steps on from the attempt before\'s T4 lock (a wrong seed lands within 30000 by chance ~1e-5); T2\'s stream lock ' + s1 + ' after it, T4\'s ' + s2 + ': the T1 seed was the game\'s');
  const C9 = FIX.cloudNine, exp = C9.reduce((a, r) => a + (1 - r[4]), 0), hits = C9.filter(r => r[5] === 'hit').length;
  check(hits === 4 && exp < 1.1, '1. of ' + C9.length + ' planned Cloud Nines ' + hits + ' were hit; if the plans held ' + exp.toFixed(2) + ' were expected');
  const strong = C9[4], bad115 = inWin(strong[1], 1.15, strong[2], strong[3]), ok = [];
  for (let x = -3; x <= 5.0001; x += 0.05) if (!inWin(strong[1], +x.toFixed(2), strong[2], strong[3])) ok.push(+x.toFixed(2));
  check(bad115 && !ok.some(x => x > -0.85 && x < 2.15), '1. 1509e942 T1 (read ' + (strong[1] + 1.15).toFixed(2) + ' on v94\'s +1.15, window ' + strong[2] + '-' + strong[3] + ', pp ' + strong[4] + ', hit): the offset is outside -0.85 .. +2.15');
  // ---- 4. the Do Nothing offset (likelihood: in the window the plan's share, outside it the blind share)
  const lik = x => FIX.doNothing.reduce((a, [n, c, lo, hi, pp, o, ph]) => { const i = inWin(c, x, lo, hi, ph), pm = i ? pp : (/T4/.test(n) ? 0.39 : 0.5); return a + Math.log(o === 'miss' ? pm : 1 - pm); }, 0);
  const xs = []; for (let x = -1; x <= 6.0001; x += 0.05) xs.push(+x.toFixed(2)); const L = xs.map(lik), m = Math.max(...L), top = xs.filter((x, i) => L[i] > m - 0.7);
  check(lik(3.4) > m - 0.1 && top[top.length - 1] <= 3.6, '4. the 8 Do Nothing outcomes (906bfb29 T2-T4 and 1509e942 T2 added): best offsets ' + top[0] + ' .. ' + top[top.length - 1] + ', v94\'s 3.4 within 0.1 of the best (log-lik ' + (lik(3.4) - m).toFixed(2) + ')');
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', off: '-5', vlag: '50' })); } catch (e) {} });
  await p.goto('file://' + PAGE);
  check(await p.evaluate(() => window.__tot.VERSION) === 'v105', 'page version v105');
  const k = await p.evaluate(() => ({ unc: window.__fb14.C9UNC.map(x => x[0]), sh: window.__fb14.C9SHIFTS.map(x => x[0]) }));
  check(k.unc.join() === '-1,0,1' && k.sh.join() === '-3,-2,-1,0,1,2,3', '1. (v96, Cloud Nine pinned: test_console_v96) the T1 share is averaged over the reading -1 .. +1, the Cloud Nine confirm carried on -3 .. +3 (v95: -2 .. +3, -3 .. +4)');
  // ---- 1. the replay
  if (fs.existsSync(LOG)) {
    const cap = JSON.parse(fs.readFileSync(LOG, 'utf8')).chargeCaptures.find(c => c.wall === FIX.cap1509T1Wall);
    const r = await p.evaluate(async ({ cap, prev }) => { const T = window.__tot, X = window.__fb14; X.reset(); T.setStep(T.RT().findIndex(s => s.fb14 === 1 && s.fb14role === 'lever'));
      X.FB14.stream = { seed: parseInt(prev, 16) >>> 0, t: performance.now() - 240000, how: 'carried', n: 3 };
      const rr = await T.chgReplay(cap, { fb14: true }); if (rr.state !== 'locked') return { lock: rr.state };
      const pl = X.plan(158), raw = X.share(0, 224, 234, 1).share, sm = X.shareU(0, 224, 234, 1);
      const ph = T.SLOG.filter(e => e.ev === 'fb14TrigPhase').pop();
      const tr = T.CHG.trig, anchor = X.trigT(); return { anc: tr ? +(anchor - tr.tRaw).toFixed(2) : null, n0: tr && tr.n, seed: rr.best && rr.best.seed, prior: X.FB14.prior, pl, raw: raw.map(v => +v.toFixed(3)), sm: sm.map(v => +v.toFixed(3)), ph }; }, { cap, prev: S.prevT4 });
    console.log('  replay', JSON.stringify(r));
    check(r.seed === S.t1 && r.prior && r.prior.d <= 0.06, '1. the T1 capture replays to ' + r.seed + ' with the stream prior (doubt ' + (r.prior && r.prior.d) + ')');
    const rw = r.raw.slice(4, 7), mx = Math.min(...rw);
    console.log('  info: without the live coin taps the replayed lock\'s raw share on 228-230 is ' + rw.join(' / ') + ' (live, with the coin: 97.6%)');
    check(r.pl && (r.pl.none || r.pl.pp < 0.85), '1. v95\'s T1 plan on the same lock: ' + (r.pl.none ? 'no edge (best ' + (r.pl.best || 0).toFixed(2) + ')' : 'target ' + r.pl.target + ', ' + (100 * r.pl.pp).toFixed(1) + '% (window ' + r.pl.win + ')') + ', not 97.6%');
    check(r.ph && r.ph.n > 0 && Math.abs(r.anc) < 0.5, '2. the phase anchor reads the capture after the maps: n ' + (r.ph && r.ph.n) + ', fit ' + (r.ph && r.ph.fit) + ' on the replay\'s trigger (n ' + r.n0 + '): the anchor lands ' + r.anc + ' ms from the trigger picture the live read took as frame 3 (v94 live: n 0, never applied)');
  } else console.log('skip 1. replay: no log at ' + LOG);
  // ---- 3. the FB2 edge rule
  const src = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb2_live.js'), 'utf8');
  check(/if \(!\(plan\.pp7 >= num\('zwedge'\)\)\)/.test(src) && /No edge, press normally/.test(src), '3. fb2PlanT7: a perfect-press 7 share under Best chance (zwedge) is "No edge, press normally", no countdown (906bfb29 T7: pp7 ' + FIX.fb2_906.t7.pp7 + ', win 0, doubt ' + FIX.fb2_906.t7.doubt + ')');
  check(/if \(!\(pl\.pp >= num\('zwedge'\)\)\)/.test(src), '3. fb2PlanK: the popup beep under the same rule');
  const live = await p.evaluate(() => { const T = window.__tot, F = window.__fb2, FB = F.FB2; T.setStep(T.RT().findIndex(s => s.turn === 'fb2_pb'));
    // states that can never give 7: a T7 with one state whose Power Bounce is simulated; the edge set above any share
    document.getElementById('s-zwedge').value = '1.01';
    Object.assign(FB, { on: true, hyps: [], t7: { states: [{ h: { s: 12345, nc: 900, ph: [0, 0], w: 1 }, l: 0, K: 77, w: 1, a: { S: { s: 12345, nc: 900, coins: [] }, T: 180, lucky: true } }], pLucky: 1, atk: { fire: 1 } }, taps: [], vis: [], visFrom: null });
    T.CHG.trig = { t: performance.now() - 10000 }; T.st.plan = null; let beeps = 0; const ob = window.beepAt; T.st.msg = null;
    const ok = F.planT7At(400); T.makePlan && T.makePlan();
    return { none: ok && ok.none, msg: T.st.msg, plan: !!T.st.plan }; });
  check(live.none === 'edge' && !live.plan && /No edge, press normally/.test(live.msg || ''), '3. live on the T7 step with the share under the edge: "' + (live.msg || '').slice(0, 60) + '…", no plan');
  const lk = await p.evaluate(() => { const F = window.__fb2, FB = F.FB2; document.getElementById('s-zwedge').value = '0.4'; FB.t7.pLucky = 0.134; FB.t7.plan = null; F.planT7At(400); const a = FB.t7.plan; FB.t7.pLucky = 1; FB.t7.plan = null; F.planT7At(400); const b = FB.t7.plan; return { a: a && a.none, b: b && (b.none || 'plan') }; });
  check(lk.a === 'no state fits', '2. the T7 states are the dodge branch: with pLucky 0.134 (906bfb29) and no coin seen yet, the other 87% (a hit, or no roll without the badge) is background: no T7 plan (' + lk.a + '; with pLucky 1: ' + lk.b + ')');
  const tp = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8');
  check(/text: 'T6: Charge; Do Nothing - Close Call'/.test(tp) && /Close Call equipped before the fight/.test(tp), '2./3. the route (v97: the runner\'s exact turn texts, test_route_texts.js): T6 "Charge; Do Nothing - Close Call", and T1\'s Charge step reminds to equip Close Call before the fight');
  // the edge rule on every window kind (zwChoose)
  const tpl = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8');
  check(/target = pr\.target; w = pr\.w; if \(honest\(share\[target - a\] \|\| 0, 'b3'\) < num\('zwedge'\)\) none = 'edge';/.test(tpl), '3. zwChoose (Time Out, Duplighosts, Jr. Troopa, Hallway, Final Bowser T1-T4): the edge rule on a chosen window kind too (it was on "best" only)');
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  await b.close(); console.log(bad ? bad + ' FAILED' : 'all ok'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
