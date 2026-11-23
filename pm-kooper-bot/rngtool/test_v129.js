/* v129: lag. (a) Final Bowser's plan shares in a worker (charge_live/fb14_sharew.js): the worker's share equals the page's own
 * (fb14ShareSync) for states with Bowser's turn ahead, Do Nothing and Cloud Nine kinds; a live plan's misses go out in one job,
 * the cache answers frames inside a share it holds, a stale share of the same turn stands in while weights move. (b) The coarse
 * bolt onsets (fbBoltFrame) are not sampled any more (FB14_BOLT_D unset), the bolt onset boxes every other picture.
 * (c) The Life Shroom revive after a hit on T1-T4: six emulator runs (fb2_route/revive_fixture.json, revive_log.py: two claw
 * hits, three fires, a slam; gRandSeed per frame) replayed through fbStep from the hit's test to the T2 menu, every frame exact. */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE);
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E(`VERSION`) === 'v138', 'page version v129');
  // states: the menu aura pattern, one lightning phase pair, different seeds; the turn's AI ahead
  await E(`window.__mk = (turn) => { const c = new Uint8Array(20); [2,0,1,1,1,0,1,1,2,1,1,0,0,0,2,0,1,1,0,1].forEach((v, i) => c[i] = v); const L = [];
    for (let i = 0; i < 40; i++) { const S = fbNew({ s: (0x13579bdf + i * 0x9E3779B9) >>> 0, nc: 130 + (i % 24), f: 100, c, ph: [37 + (i % 5), 151], l: i % 2, w: 1 + (i % 7) / 10, lw: 1 }); S.out = turn > 1 ? { 1: { atk: 'fire', v: 60, miss: true, ok: true } } : {}; fbRun(S, 140); L.push(S); } return L; }; 1`);
  const r = JSON.parse(await E(`(async () => { const out = {};
    if (!fbsOn()) return JSON.stringify({ noWorker: true });
    for (const [turn, kind, a, b, boxP] of [[2, 'nothing', 160, 220, null], [3, 'nothing', 150, 200, null], [1, 'cn', 150, 175, null], [1, 'skip', 410, 460, 150]]) {
      FB14.box = boxP != null ? { P: boxP } : null; const L = __mk(turn);
      const sync = Array.from(fb14ShareSync(L, a, b, turn, kind));
      const t0 = performance.now(); const id = ++FBS.seq; const got = await new Promise(res => { const w = FBS.w, h = e => { if (e.data.id === id) { w.removeEventListener('message', h); res(Array.from(e.data.out[0])); } }; w.addEventListener('message', h); w.postMessage({ id, turn, boxP, jobs: [{ a, b, kind, L: L.map(S => fbClone(S)) }] }); });
      let mx = 0; for (let i = 0; i < sync.length; i++) mx = Math.max(mx, Math.abs(sync[i] - got[i]));
      out[turn + kind] = { n: sync.length, maxDiff: mx, nonzero: sync.filter(x => x > 0).length, ms: Math.round(performance.now() - t0) };
    }
    FB14.box = null;
    // a live plan's misses: one job, then the cache answers inside frames; a stale share of the same turn stands in
    const L = __mk(2); fbsBegin(); const z = fb14Share(L, 160, 220, 2, 'nothing'); const sent = fbsEnd(2);
    await new Promise(res => { const t = setInterval(() => { if (!FBS.pend.size) { clearInterval(t); res(); } }, 20); });
    const inner = fb14Share(L, 170, 180, 2, 'nothing'), want = fb14ShareSync(L, 170, 180, 2, 'nothing');
    let mx = 0; for (let i = 0; i < want.length; i++) mx = Math.max(mx, Math.abs(want[i] - inner[i]));
    L[0].w *= 1.5; fbsBegin(); const st0 = FBS.stale || 0; fb14Share(L, 165, 215, 2, 'nothing'); const missed = FBS.want.length; FBS.live = false; FBS.want = [];
    const L2 = __mk(2).map(S => { const T = fbClone(S); T.s = (T.s ^ 0x5a5a5a5a) >>> 0; return T; }); FB14.lockN = (FB14.lockN || 0) + 1; fbsBegin(); const st1 = FBS.stale || 0; fb14Share(L2, 165, 215, 2, 'nothing'); const missed2 = FBS.want.length; FBS.live = false; FBS.want = [];
    out.live = { zeros: z.every(x => x === 0), sent, innerMaxDiff: mx, staleUsed: (FBS.stale || 0) - st0, missedAfterWeightChange: missed, otherStatesStale: (FBS.stale || 0) - st1, otherStatesMissed: missed2 };
    return JSON.stringify(out); })()`));
  console.log(JSON.stringify(r));
  ok(!r.noWorker, 'the share worker starts');
  for (const k of ['2nothing', '3nothing', '1cn', '1skip']) ok(r[k] && r[k].maxDiff < 1e-12 && r[k].n > 0, 'worker share = the page\'s own (' + k + ': ' + (r[k] && r[k].n) + ' frames, ' + (r[k] && r[k].nonzero) + ' non-zero, max diff ' + (r[k] && r[k].maxDiff) + ', ' + (r[k] && r[k].ms) + ' ms)');
  ok(r.live.zeros && r.live.sent, 'a live plan\'s missing share: zeros stand in and one job goes out');
  ok(r.live.innerMaxDiff < 1e-12, 'the cache answers frames inside the share it holds, exactly (max diff ' + r.live.innerMaxDiff + ')');
  ok(r.live.otherStatesStale === 0 && r.live.otherStatesMissed === 1, 'other states with the same count (a new lock): no stale share stands in, one job for them (' + r.live.otherStatesStale + ' / ' + r.live.otherStatesMissed + ')');
  ok(r.live.staleUsed === 1 && r.live.missedAfterWeightChange === 0, 'weights moved: the fresh share of the same turn and frames stands in, no new round');
  // (b) per-picture work
  const s2 = await E(`JSON.stringify({ boltD: FB14_BOLT_D, src: String(fb14Frame).includes('if (FB14_BOLT_D != null) fbBoltFrame') , tick: String(fbbFrame).includes('FBB.tick') })`);
  const s = JSON.parse(s2); ok(s.boltD == null && s.src, 'the coarse bolt onsets are sampled only with FB14_BOLT_D set (unset)');
  ok(s.tick, 'the bolt onset boxes every other picture');
  // (c) the revive
  const FX = require('fs').readFileSync(__dirname + '/fb2_route/revive_fixture.json', 'utf8');
  const rv = JSON.parse(await E(`JSON.stringify(${FX}.map(X => { const S = fbNew({ s: parseInt(X.s0, 16) >>> 0, nc: X.nc, f: X.h, c: Uint8Array.from(X.c), ph: X.ph, l: 0, w: 1 });
    S.out = { 1: { atk: X.atk } }; fbEv(S, { k: 'test', f: X.h, turn: 1 }); let bad = null, without = null;
    for (let i = 0; i < X.s1.length; i++) { fbStep(S); if ((S.s >>> 0) !== parseInt(X.s1[i], 16)) { bad = i; break; } }
    const T = fbNew({ s: parseInt(X.s0, 16) >>> 0, nc: X.nc, f: X.h, c: Uint8Array.from(X.c), ph: X.ph, l: 0, w: 1, shroom: 0 }); T.out = { 1: { atk: X.atk } }; fbEv(T, { k: 'test', f: X.h, turn: 1 });
    for (let i = 0; i < X.s1.length; i++) { fbStep(T); if ((T.s >>> 0) !== parseInt(X.s1[i], 16)) { without = i; break; } }
    return { seed: X.seed, n: X.s1.length, bad, without, hit: !S.out[1].miss }; }))`));
  console.log(JSON.stringify(rv));
  for (const x of rv) ok(x.hit && x.bad == null, 'revive ' + x.seed + ': ' + x.n + ' frames exact from the hit (without the revive model: off from frame ' + x.without + ')');
  // a hit read on T1 (FB14.hits): the states that hit Mario keep their weight, those that missed fall
  const hw = JSON.parse(await E(`(() => { const sv = [FB14.states, FB14.hits, FB14.missed]; const mk = miss => fbNew({ s: 1, nc: 1e6, f: 0, c: new Uint8Array(20), ph: [0, 0], l: 0, w: 1, out: { 1: { atk: 'fire', v: miss ? 10 : 90, miss } } });
    FB14.states = [mk(false), mk(true)]; FB14.hits = { 1: true }; FB14.missed = null; const r = fb14Weigh(100, true); const o = FB14.states.map(S => S.lw); [FB14.states, FB14.hits, FB14.missed] = sv; return JSON.stringify({ o, kept: r.kept }); })()`));
  ok(hw.o[0] === 1 && hw.o[1] <= 0.01, 'a hit read on T1: the hitting state keeps its weight, the missing one falls (' + JSON.stringify(hw) + ')');
  // (d) bolts in Bowser's turn (the menus' camera from AI - 59 to AI): the window from the heaviest state's AI event; a reading
  // there weighs the states whose own window holds its pictures, the others keep their weight
  const bw = JSON.parse(await E(`(() => { const sv = [FB14.on, FB14.states]; const mk = (ai, w) => { const S = fbNew({ s: 7, nc: 1e6, f: 0, c: new Uint8Array(20), ph: [37, 151], l: 0, w }); fbEv(S, { k: 'ai', f: ai, turn: 1 }); return S; };
    FB14.on = true; FB14.states = [mk(500, 1), mk(500, 0.5), mk(700, 0.5)]; const W = fbbBtWin();
    const T = FB14.states.map(S => S.w); const R = { kind: 'sky', k: 'fb14', F1: 470, n: 5, bt: true, C: null, best: null };
    const orig = fbbFactor; let calls = 0; fbbFactor = () => { calls++; return 0.2; }; fbbApply(R); fbbFactor = orig;
    const w = FB14.states.map(S => S.w); [FB14.on, FB14.states] = sv; return JSON.stringify({ W, w, calls }); })()`));
  ok(bw.W && bw.W[0] === 443 && bw.W[1] === 499, 'Bowser\'s turn window from the heaviest state\'s AI 500: clock ' + JSON.stringify(bw.W));
  ok(bw.calls === 2 && bw.w[0] === 0.2 && bw.w[2] === 0.5, 'a reading at 470-474 weighs the two states with AI 500, not the one with AI 700 (' + JSON.stringify(bw.w) + ')');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'all ok'); process.exit(fails ? 1 : 0);
})();
