/* v131 (log 15:27, v130 T4 with 24000 states: no plan in the 12 s before the press; the worker's answers took 0.9 s rising to
 * 4.4 s, a new job every tick): (a) the share asked for runs FBS_PAD frames past the plan's, so the next ticks' moved window
 * falls inside it; (b) an answer for the same lock stands in for another sample of its states (the samples move with the
 * weights); never another lock's; (c) one job at a time: a round made while one is worked out waits and goes next. */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE);
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E(`VERSION`) === 'v147', 'page version v131');
  await E(`window.__mk = (k) => { const c = new Uint8Array(20); [2,0,1,1,1,0,1,1,2,1,1,0,0,0,2,0,1,1,0,1].forEach((v, i) => c[i] = v); const L = [];
    for (let i = 0; i < 40; i++) { const S = fbNew({ s: (0x13579bdf + (i + k) * 0x9E3779B9) >>> 0, nc: 130 + (i % 24), f: 100, c, ph: [37 + (i % 5), 151], l: i % 2, w: 1 + (i % 7) / 10, lw: 1 }); S.out = { 1: { atk: 'fire', v: 60, miss: true, ok: true } }; fbRun(S, 140); L.push(S); } return L; }; 1`);
  const r = JSON.parse(await E(`(async () => { const out = {}; if (!fbsOn()) return JSON.stringify({ noWorker: true });
    const idle = () => new Promise(res => { const t = setInterval(() => { if (!FBS.pend.size && !Object.keys(FBS.jobs || {}).length) { clearInterval(t); res(); } }, 20); });
    FBS.cache = []; FB14.lockN = 7; FB14.t0 = 1234; const L = __mk(0);
    fbsBegin(); fb14Share(L, 160, 220, 2, 'nothing'); out.sent = fbsEnd(2);
    // (c) a second round with other frames while the first is worked out
    fbsBegin(); fb14Share(L, 300, 340, 2, 'nothing'); out.second = fbsEnd(2); out.inFlight = Object.keys(FBS.jobs).length; out.queued = !!FBS.next;
    await idle();
    out.secondCached = FBS.cache.some(e => e.a === 300);
    // (a) the window moved 40 frames on: inside the padded answer, exact
    fbsBegin(); const s0 = FBS.stale || 0; const got = fb14Share(L, 200, 260, 2, 'nothing'); out.movedMiss = FBS.want.length; FBS.live = false; FBS.want = [];
    const want = fb14ShareSync(L, 200, 260, 2, 'nothing'); let mx = 0; for (let i = 0; i < want.length; i++) mx = Math.max(mx, Math.abs(want[i] - got[i])); out.movedDiff = mx; out.movedStale = (FBS.stale || 0) - s0;
    // (b) another sample of the same lock: stands in; a new lock: does not
    const L2 = __mk(5); fbsBegin(); const s1 = FBS.stale || 0; fb14Share(L2, 170, 230, 2, 'nothing'); out.sameLockStale = (FBS.stale || 0) - s1; out.sameLockHard = FBS.want.filter(w => !w.soft).length; FBS.live = false; FBS.want = [];
    FB14.lockN = 8; fbsBegin(); const s2 = FBS.stale || 0; fb14Share(L2, 170, 230, 2, 'nothing'); out.newLockStale = (FBS.stale || 0) - s2; out.newLockHard = FBS.want.filter(w => !w.soft).length; FBS.live = false; FBS.want = [];
    return JSON.stringify(out); })()`));
  console.log(JSON.stringify(r));
  ok(!r.noWorker, 'the share worker starts');
  ok(r.sent === true && r.second === true && r.inFlight === 1 && r.queued, 'one job at a time: the second round waits (in flight ' + r.inFlight + ')');
  ok(r.secondCached, 'the queued round is sent when the first answer comes back');
  ok(r.movedMiss === 0 && r.movedStale === 0 && r.movedDiff < 1e-12, 'the window 40 frames on: answered exactly from the padded share (diff ' + r.movedDiff + ')');
  ok(r.sameLockStale === 1 && r.sameLockHard === 0, 'another sample of the same lock\'s states: the answer stands in, the plan does not wait');
  ok(r.newLockStale === 0 && r.newLockHard === 1, 'a new lock\'s states: no stand-in, one job');
  // (d) the 15:27 T4: a lever turn with 24000 states, the page's own plan loop (autoPlan) and re-score (tick) for 6 s: the first
  // plan within 3 s, the worker's answers at most ~3 a second, no page stall over 400 ms
  const fx = JSON.parse(require('fs').readFileSync(__dirname + '/fixtures/fb14_logs.json', 'utf8'));
  const g = await p.evaluate(async ({ L }) => {
    const T = window.__tot, F = window.__fb14, X = F.FB14, rate = 33.4253, OFF = 1000;
    const ph = [(((L.ph[0] - OFF) % 130) + 130) % 130, (((L.ph[1] - OFF) % 220) + 220) % 220], c = Uint8Array.from(L.aura);
    const lever = T.RT().findIndex(s => s.fb14 === 2 && s.fb14role === 'lever'), S = [];
    for (let i = 0; i < 24000; i++) { const A = F.fbNew({ s: (0x9e3779b9 * (i + 3)) >>> 0, nc: OFF + 61 + (i % 24), f: OFF + 61, c, ph, l: i & 1, w: 1 / 24000, from: OFF + 61 }); A.ev.push({ k: 'chg', f: OFF + 13 }, { k: 'chg', f: OFF + 16 }); A.ev.sort((a, b) => a.f - b.f); A.lw = 1; S.push(A); }
    T.setStep(lever); X.on = true; X.states = S; X.taps = []; X.vis = []; X.visFrom = null; X.bg = 0; X.bgFrom = 0; X.rate = rate; X.gone = false; X.allOutLogged = false; X.lockN = (X.lockN || 0) + 1;
    X.t0 = performance.now() - (OFF + 200) * rate; X.lastT = null; T.st.plan = null; X.M = { 2: OFF };
    const n0 = T.SLOG.length, t0 = performance.now(); let first = null, worst = 0, last = performance.now();
    const jit = setInterval(() => { const n = performance.now(); worst = Math.max(worst, n - last - 50); last = n; }, 50);
    while (performance.now() - t0 < 6000) { await new Promise(r => setTimeout(r, 100)); if (T.st.plan) { if (first == null) first = performance.now() - t0; F.tick(performance.now()); } else T.autoPlan(); }
    clearInterval(jit);
    const ev = T.SLOG.slice(n0); return { first, worst: Math.round(worst), shares: ev.filter(e => e.ev === 'fbsShares').length, plans: ev.filter(e => e.ev === 'fb14Plan').length, msg: T.st.msg && T.st.msg.slice(0, 80) };
  }, { L: fx[0] || fx.logs?.[0] || fx });
  console.log(JSON.stringify(g));
  ok(g.first != null && g.first < 3000, '24000 states: the first plan in ' + (g.first && Math.round(g.first)) + ' ms (' + g.msg + ')');
  ok(g.shares <= 18, 'the worker answered ' + g.shares + ' times in 6 s (15:31 log: ~10 a second)');
  ok(g.worst < 400, 'longest page stall ' + g.worst + ' ms');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'all ok'); process.exit(fails ? 1 : 0);
})();
