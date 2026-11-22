/* v126: the frame worker (shared/capture.js) reads every picture of a Charge read on its own thread.
 * 1. Synthetic 60 fps fake camera (made here with ffmpeg in /dev/shm): the track's stamps are matched to the capture clock
 *    (V.bgAdj small), and the worker's raster equals the page's own chgGrab of the same frame.
 * 2. Optional (only if /dev/shm/v126/jr960.y4m exists: a runner clip cut locally, never in the repo): a real Jr. Troopa
 *    Charge read with the page made busy on purpose (8 ms per frame, 60 ms every 12th), worker on vs off: the read's
 *    dropped pictures, and both lock on the same seed. */
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
const SYN = '/dev/shm/v126/t60.y4m', JR = '/dev/shm/v126/jr960.y4m';
if (!fs.existsSync(SYN)) { fs.mkdirSync('/dev/shm/v126', { recursive: true }); execSync(`ffmpeg -v error -y -f lavfi -i testsrc=size=640x360:rate=60 -t 12 -pix_fmt yuv420p ${SYN}`); }
const PAGE = 'file:///tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
async function open(file, noWorker) {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + file, '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ permissions: ['camera'] }); const p = await ctx.newPage({ viewport: { width: 1100, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(nw => { if (nw) window.__noBgWorker = true; }, !!noWorker);
  await p.goto(PAGE);
  await p.evaluate(async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: { frameRate: 60 } }); Object.defineProperty(s.getVideoTracks()[0], 'label', { value: 'OBS Virtual Camera (test)' });
    navigator.mediaDevices.getUserMedia = async () => s; const sel = document.getElementById('cam-sel'); const o = document.createElement('option'); o.value = 'x'; sel.appendChild(o); sel.value = 'x';
  });
  return { b, p, errs, E: src => p.evaluate(s => window.__tot.v111.ev(s), src) };
}
(async () => {
  // 1. clock and raster
  { const { b, p, errs, E } = await open(SYN);
    await p.click('#cam-start'); await p.waitForTimeout(3000);
    const a0 = JSON.parse(await E(`JSON.stringify({ w: !!V.bgWorker, via: V.bgVia, adj: V.bgAdj, n: V.bgP && V.bgP.d.length })`));
    ok(a0.w, 'the frame worker runs (' + a0.via + ')');
    ok(a0.adj != null && Math.abs(a0.adj) < 4, 'the worker\'s stamps on the capture clock: bgAdj ' + (a0.adj != null ? a0.adj.toFixed(2) : null) + ' ms over ' + a0.n + ' pairs');
    // the worker grabs; the page grabs the same frames itself (chgGrab on each video callback): rasters matched by time
    await E(`window.__wy = []; window.__my = []; { const w0 = chgWkPic; chgWkPic = function (t, m, Y) { window.__wy.push([t, m, Y]); if (window.__wy.length > 90) window.__wy.shift(); }; }
      { const c0 = chgFrame; chgFrame = function (t, pr) { c0(t, pr); if (window.__grab) { const g = sample(chgGame(), 32, 24); let m = 0; for (let i = 0; i < g.length; i += 4) m += 0.299 * g[i] + 0.587 * g[i + 1] + 0.114 * g[i + 2]; window.__my.push([t, m / 768, chgGrab()]); if (window.__my.length > 90) window.__my.shift(); } }; }
      const [SX, OX, SY, OY] = chgMap(), G = chgGame(); bgWorkerGrab({ SX, OX, SY, OY, gx: G.x, gy: G.y, gw: G.w, gh: G.h }); window.__grab = true; 1`);
    await p.waitForTimeout(1500);
    const cmp = JSON.parse(await E(`window.__grab = false; bgWorkerGrab(null); { let n = 0, dY = 0, dm = 0, mx = 0; for (const [t, m, Y] of window.__my) { const w = window.__wy.find(x => Math.abs(x[0] - t) < 4); if (!w) continue; n++; let s = 0; for (let i = 0; i < Y.length; i += 7) { const d = Math.abs(Y[i] - w[2][i]); s += d; if (d > mx) mx = d; } dY += s / Math.ceil(Y.length / 7); dm += Math.abs(m - w[1]); }
      JSON.stringify({ n, dY: n ? dY / n : null, dm: n ? dm / n : null, mx }); }`));
    console.log('raster compare', JSON.stringify(cmp));
    ok(cmp.n >= 30, 'worker and page rasters paired by time on ' + cmp.n + ' frames');
    ok(cmp.dY != null && cmp.dY < 1.5 && cmp.dm < 1, 'the worker\'s raster is the page\'s: mean |dY| ' + (cmp.dY != null ? cmp.dY.toFixed(3) : null) + ', trigger brightness |dm| ' + (cmp.dm != null ? cmp.dm.toFixed(3) : null));
    // the hidden-page fallback (no video callbacks: forced here) now gets whole pictures from the worker
    const h = JSON.parse(await E(`window.__hb0 = V.bgFrames || 0; V.force = 'bg'; 1`) && await (async () => { await p.waitForTimeout(2000); return E(`{ const n = (V.bgFrames || 0) - window.__hb0; V.force = null; JSON.stringify({ n, fps: Math.round(V.fps) }) }`); })());
    ok(h.n > 90, 'hidden page (forced): onFrame still runs on the worker\'s pictures (' + h.n + ' in 2 s, ' + h.fps + ' fps)');
    ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
    await b.close(); }
  // 2. a real Charge read under load, worker on and off
  if (!fs.existsSync(JR)) console.log('skip 2: no local Jr. Troopa clip at ' + JR);
  else {
    const read = async (noWorker, load) => {
      const { b, p, errs, E } = await open(JR, noWorker);
      await p.click('#cam-start');
      // a Jr. Troopa Charge step; the bar is hidden; the page busy on purpose
      await E(`chgProfNow = () => CHG_PROF.jr; chgArenaProf = P => P; { const c0 = chgFrame; chgFrame = function (t) { return c0(t, false); }; }
        { const o0 = onFrame; let n = 0; onFrame = function (t) { const e = performance.now() + (++n % 12 === 0 ? ${load[1]} : ${load[0]}); while (performance.now() < e); return o0(t); }; }
        window.__arm = setInterval(() => { if (CHG.state === 'idle' || CHG.state === 'notseen' || (CHG.state === 'armed' && performance.now() - CHG.hideT > 700)) Object.assign(CHG, { state: 'armed', hideT: performance.now() - 250, armP: CHG_PROF.jr, prof: CHG_PROF.jr, ring: [], means: [] }); }, 100); 1`);
      let r = null;
      for (let i = 0; i < 60 && !r; i++) { await p.waitForTimeout(500);
        r = JSON.parse(await E(`{ const L = SLOG.filter(e => e.ev === 'chargeLock' || e.ev === 'chargeNoLock'); const M = SLOG.filter(e => e.ev === 'chargeMaps').pop(); L.length && M ? JSON.stringify({ ev: L[0].ev, seed: L[0].best && L[0].best.seed, ratio: L[0].best && L[0].best.ratio, drops: M.drops, wk: M.wk, raw: M.raw, frames: M.frames }) : 'null' }`)); }
      await E(`clearInterval(window.__arm); 1`); await b.close(); return { r, errs };
    };
    // a: 8 ms per picture and a 60 ms stall every 12th; b: overloaded, 20 ms per picture (the live logs' 33 ms gaps). This
    // 4-core box without a GPU grabs slower than a stream PC, so the worker's own drops here are a ceiling, not live numbers.
    for (const [name, load, maxOn] of [['stalls', [8, 60], 0.08], ['overloaded', [20, 20], 0.4]]) {
      const on = await read(false, load), off = await read(true, load);
      console.log(name, 'worker on ', JSON.stringify(on.r)); console.log(name, 'worker off', JSON.stringify(off.r));
      ok(on.r && on.r.wk > 0.9, name + ', worker on: the read\'s pictures came from the worker (' + (on.r && on.r.wk) + ')');
      ok(on.r && off.r && on.r.drops <= maxOn && on.r.drops < off.r.drops, name + ': fewer pictures dropped with the worker (' + (on.r && on.r.drops) + ' vs ' + (off.r && off.r.drops) + ')');
      ok(on.r && on.r.ev === 'chargeLock' && on.r.seed === 'd856a026', name + ', worker on: the read locks the clip\'s seed (' + (on.r && on.r.seed) + ', ratio ' + (on.r && on.r.ratio) + '; worker off: ' + (off.r && off.r.ev) + ')');
      ok(on.errs.length === 0 && off.errs.length === 0, name + ': no page errors ' + on.errs.concat(off.errs).slice(0, 2).join(' | '));
    }
  }
  console.log(fails ? 'FAIL ' + fails : 'all ok'); process.exit(fails ? 1 : 0);
})();
