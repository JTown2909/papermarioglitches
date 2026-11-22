/* v127: the stage lightning read (charge_live/fbbolt_core.js, fbbolt_live.js).
 * 1. The reader on bolts drawn from the game's formula (the centre line 2 px wide on the 640x480 raster, the lifetimes the
 *    page reads, some stray violet): u mod 120 within 2 and the lifetime right; the true value keeps a high likelihood.
 *    (On 55 emulator bolts, rendered with the runner's ROM and checked against the game's RAM, the same reader read
 *    54 within 3: fb2_route/bolt_shape/README.md. Those pictures are not in the repository.)
 * 2. In the page, phase 1: 60 Final Bowser states with one seed's lightning phases and different seeds; a bolt drawn from
 *    one state's own value: that state keeps its weight, most others fall to the floor.
 * 3. Phase 2: the same with T7 states (FB2.t7.states). */
const F = require('./charge_live/fbbolt_core.js');
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const W = 640, H = 480;
function drawBolt(type, u, L, rnd) {
  const m = new Uint8Array(W * H), { P, ok: vis } = F.fbbLine(type, u, L);
  for (let j = 0; j < 11; j++) { if (!vis[j]) continue; const ax = P[2 * j], ay = P[2 * j + 1], bx = P[2 * j + 2], by = P[2 * j + 3], n = Math.ceil(Math.hypot(bx - ax, by - ay)) + 1;
    for (let t = 0; t <= n; t++) { const x = Math.round(ax + (bx - ax) * t / n), y = Math.round(ay + (by - ay) * t / n);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 0; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 60 && X < W && Y < H) m[Y * W + X] = 1; } } }
  for (let i = 0; i < 60; i++) { const X = Math.floor(rnd() * W), Y = 60 + Math.floor(rnd() * (H - 60)); m[Y * W + X] = 1; }     // stray violet
  return m;
}
let seed = 7; const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
(async () => {
  // 1. the reader
  F.FBB_L[0] = 2; F.FBB_L[1] = 4;
  let good = 0, goodL = 0, liks = []; const N = 12;
  for (let k = 0; k < N; k++) {
    const type = 1 + (k % 4), u = Math.floor(rnd() * 359), L0 = 2 + (k % 3);
    const obs = []; for (let i = 0; i < 5; i++) obs.push(F.fbbObs(drawBolt(type, u, L0 + i, rnd), W, H, [0, 60, W, H]));
    let C; F.fbbScore(obs, [type], c => { C = c; }, 0);
    const best = F.fbbBest(C), d = Math.min(((best.u - u) % 120 + 120) % 120, ((u - best.u) % 120 + 120) % 120);
    good += d <= 2; goodL += best.L0 === L0; liks.push(F.fbbLik({ C, best }, type, u, L0));
  }
  ok(good === N, 'drawn bolts: u mod 120 read within 2 on ' + good + ' / ' + N);
  ok(goodL === N, 'drawn bolts: the lifetime read on ' + goodL + ' / ' + N);
  ok(Math.min(...liks) > 0.5, 'the true value keeps a likelihood over 0.5 (lowest ' + Math.min(...liks).toFixed(2) + ')');
  // 2-3. in the page
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file:///tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html');
  const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  const r = JSON.parse(await E(`{
    // the drawn bolt's cost table, made in the page from masks drawn the same way
    const W = 640, H = 480; const drawBolt = ${drawBolt.toString().replace(/F\./g, '')};
    let sd = 99; const rnd = () => (sd = (Math.imul(sd, 1103515245) + 12345) >>> 0) / 4294967296;
    const read = (type, v, L0, F1, k) => { const obs = []; for (let i = 0; i < 5; i++) obs.push(fbbObs(drawBolt(type, v, L0 + i, rnd), 640, 480, [0, 60, 640, 480]));
      const L = FBB_L.slice(); FBB_L[0] = FBB_L0[0]; FBB_L[1] = FBB_L0[1]; let C; fbbScore(obs, [1, 2, 3, 4], c => { C = c; }, 0); FBB_L[0] = L[0]; FBB_L[1] = L[1];
      return { k, F1, n: 5, C, best: fbbBest(C) }; };
    // phase 1: 60 states, the same lightning phases, different seeds, run to frame 300; the true one is the first
    const ph = [37, 151], out = {};
    FB14.on = true; FB14.states = [];
    for (let i = 0; i < 60; i++) { const S = fbNew({ s: (0x1234abcd + i * 0x9E3779B9) >>> 0, nc: 100000, f: 0, c: new Uint8Array(20), ph, l: 0, w: 1 }); fbRun(S, 300); FB14.states.push(S); }
    // a sky bolt the phases draw before frame 300: the latest slot
    let g = 299; while (!FBB_SLOT[(g + ph[1]) % 220]) g--;
    const T = FB14.states[0], ent = Array.from(T.bv).find(e => e && Math.floor(e / 4096) === g), ty = (ent >> 9) & 7, v = ent & 511, L0 = 3, F1 = g + L0 - 1;
    const R1 = read(ty, v, L0, F1, 'fb14'); const res1 = fbbApply(R1);
    const w = FB14.states.map(S => S.w);
    out.p1 = { g, ty, v, read: R1.best.u % 120, trueW: w[0], others: w.slice(1).filter(x => x > 0.5).length, kept: res1.kept, n: res1.states };
    // a state not yet run to the bolt's frame is run to it on a copy (same answer)
    const S0 = fbNew({ s: (0x1234abcd) >>> 0, nc: 100000, f: 0, c: new Uint8Array(20), ph, l: 0, w: 1 }); fbRun(S0, g - 5); FB14.states = [S0]; fbbApply(R1); out.p1.ahead = S0.w;
    FB14.on = false; FB14.states = [];
    // phase 2: T7 states from Bowser's T6 turn (frame 400), 60 seeds, the same phases
    const t7 = []; for (let i = 0; i < 60; i++) t7.push({ h: { ph }, l: 0, a: { S: { s: (0x5eed0fb2 + i * 0x2545F491) >>> 0, nc: 100000 }, T: 399 }, w: 1 });
    let g2 = 560; while (!FBB_SLOT[(g2 + ph[1]) % 220]) g2--;
    const S2 = { s: t7[0].a.S.s, nc: 100000 }; fb2Idle(S2, 400, g2, ph); const x2 = fbbDrawAt(S2.s, g2, ph);
    FB2.on = true; FB2.t7 = { states: t7 }; const R2 = read(x2.ty, x2.v, 3, g2 + 2, 'fb2'); const res2 = fbbApply(R2);
    out.p2 = { g2, ty: x2.ty, v: x2.v, read: R2.best.u % 120, trueW: t7[0].w, others: t7.slice(1).filter(o => o.w > 0.5).length, kept: res2.kept };
    FB2.t7 = null; FB2.on = false;
    JSON.stringify(out); }`));
  console.log(JSON.stringify(r));
  ok(r.p1.trueW > 0.8, 'phase 1: the state whose bolt it is keeps its weight (' + r.p1.trueW.toFixed(2) + '; bolt ' + r.p1.ty + ' value ' + r.p1.v + ', read ' + r.p1.read + ')');
  ok(r.p1.others <= 6, 'phase 1: most other states fall (' + r.p1.others + ' of 59 keep over half; weight kept ' + r.p1.kept + ')');
  ok(Math.abs(r.p1.ahead - r.p1.trueW) < 1e-6, 'phase 1: a state behind the bolt\'s frame gets the same factor (run on a copy)');
  ok(r.p2.trueW > 0.8, 'phase 2 (T7 states): the true state keeps its weight (' + r.p2.trueW.toFixed(2) + ')');
  ok(r.p2.others <= 6, 'phase 2: most others fall (' + r.p2.others + ' of 59 keep over half; weight kept ' + r.p2.kept + ')');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close();
  // 4. optional (only if /dev/shm/v126/fbbolt.y4m exists: 3 s of a runner clip with a sky bolt, cut locally, never in the
  //    repository): the live collector on the clip played as the camera, the fight's clock stubbed (no states): the page's
  //    own reading of the bolt (offline: sky bolt 4, u mod 120 = 19)
  const Y = '/dev/shm/v126/fbbolt.y4m';
  if (!require('fs').existsSync(Y)) console.log('skip 4: no local clip at ' + Y);
  else {
    const b2 = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + Y, '--autoplay-policy=no-user-gesture-required'] });
    const ctx = await b2.newContext({ permissions: ['camera'] }); const p2 = await ctx.newPage(); const errs2 = []; p2.on('pageerror', e => errs2.push(String(e)));
    await p2.goto('file:///tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html');
    await p2.evaluate(async () => { const s = await navigator.mediaDevices.getUserMedia({ video: { frameRate: 60 } }); Object.defineProperty(s.getVideoTracks()[0], 'label', { value: 'OBS Virtual Camera (test)' });
      navigator.mediaDevices.getUserMedia = async () => s; const sel = document.getElementById('cam-sel'); const o = document.createElement('option'); o.value = 'x'; sel.appendChild(o); sel.value = 'x'; });
    await p2.evaluate(() => window.__tot.v111.ev(`window.__t0 = performance.now(); fbbClock = t => ({ k: 'fb14', F: (t - window.__t0) / 33.37 }); { const f0 = fbbFrame; fbbFrame = (t, pr) => f0(t, true); } 1`));
    await p2.click('#cam-start');
    let rd = null; for (let i = 0; i < 20 && !rd; i++) { await p2.waitForTimeout(500); rd = JSON.parse(await p2.evaluate(() => window.__tot.v111.ev(`JSON.stringify(SLOG.filter(e => e.ev === 'boltRead' || e.ev === 'boltReadDrop' || e.ev === 'boltOnset'))`))); if (!rd.some(e => e.ev === 'boltRead' || e.ev === 'boltReadDrop')) rd = null; }
    console.log('live', JSON.stringify(rd));
    const R = rd && rd.find(e => e.ev === 'boltRead');
    ok(R && R.type === 4 && Math.min(((R.u - 19) % 120 + 120) % 120, ((19 - R.u) % 120 + 120) % 120) <= 3, 'live on the clip: the page reads sky bolt 4, u mod 120 ' + (R && R.u) + ' (offline 19), in ' + (R && R.ms) + ' ms');
    ok(errs2.length === 0, 'live: no page errors ' + errs2.slice(0, 2).join(' | '));
    await b2.close();
  } console.log(fails ? 'FAIL ' + fails : 'all ok'); process.exit(fails ? 1 : 0);
})();
