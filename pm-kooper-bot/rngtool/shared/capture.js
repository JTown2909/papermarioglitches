//@ Shared by both pages: camera / window capture (OBS Virtual Camera only), background frame reading, frame timestamps,
//@ box sampling and the automatic shine threshold. Needs a global V (capture state), $, num, audio, onFrame and the
//@ cam-* / cap-target elements. Inlined at build time (shared/inline.py); //@ lines are dropped.
function camMsg(t) { $('cam-msg').textContent = t; }
async function listCams() {
  try {
    const ds = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput'); const sel = $('cam-sel'), cur = sel.value;
    const obs = ds.filter(d => /obs/i.test(d.label));
    sel.innerHTML = '<option value="window">A window (OBS projector, no Virtual Camera)</option>' +
      (obs.length ? obs.map(d => '<option value="' + d.deviceId + '">' + d.label.replace(/</g, '&lt;') + '</option>').join('') : '<option value="">OBS Virtual Camera</option>');
    sel.value = [...sel.options].some(o => o.value === cur) ? cur : (cur === '' && obs.length ? obs[0].deviceId : 'window');
  } catch (e) {}
}
const VIDEO = { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, frameRate: { ideal: 60 } };
async function openCamera(id) {
  // only ever keep the OBS Virtual Camera open: a capture card opened here would be taken away from OBS
  let s = await navigator.mediaDevices.getUserMedia({ video: Object.assign({}, VIDEO, id ? { deviceId: { exact: id } } : {}) });
  const label = s.getVideoTracks()[0].label || '';
  if (/obs/i.test(label)) return s;
  s.getTracks().forEach(t => t.stop());
  const obs = (await navigator.mediaDevices.enumerateDevices()).find(d => d.kind === 'videoinput' && /obs/i.test(d.label));
  if (!obs) throw { name: 'NoObsCamera', message: label };
  s = await navigator.mediaDevices.getUserMedia({ video: Object.assign({}, VIDEO, { deviceId: { exact: obs.deviceId } }) });
  return s;
}
async function startCam() {
  audio();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camMsg('This browser view has no camera access. Use Save for OBS mode, then open the saved file in Chrome.'); return; }
  const id = $('cam-sel').value, win = id === 'window';
  try {
    V.stream = win ? await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 60 } }, audio: false, selfBrowserSurface: 'exclude', surfaceSwitching: 'exclude' })
                   : await openCamera(id);
  } catch (e) {
    V.stream = null;
    if (e && e.name === 'NoObsCamera') camMsg('Chrome opened "' + e.message + '", which is not the OBS Virtual Camera, so it was closed again. In OBS press Start Virtual Camera, then try again, or use the window source.');
    else if (e && e.name === 'NotReadableError') camMsg('The camera is busy or would not start. Start Virtual Camera in OBS first, or use the window source.');
    else camMsg((win ? 'Window capture' : 'Camera') + ' blocked or cancelled (' + (e && e.name || 'error') + '). Inside claude.ai this is expected: use Save for OBS mode and open the file in Chrome.');
    return;
  }
  const track = V.stream.getVideoTracks()[0];
  track.addEventListener('ended', () => { V.camEnded = 'the capture track ended'; stopCam(); });     // v109: the page's watchdog says so
  V.camOn = true; V.camEnded = null; V.camT = performance.now();
  V.video.srcObject = V.stream; await V.video.play().catch(() => {});
  $('cam-start').disabled = true; $('cam-stop').disabled = false; $('cap-target').disabled = false;
  const st0 = track.getSettings ? track.getSettings() : {};
  camMsg('Watching ' + (track.label || (win ? 'a window' : 'the camera')) + (st0.width ? ' (' + st0.width + '×' + st0.height + (st0.frameRate ? ' at ' + Math.round(st0.frameRate) + ' fps' : '') + ')' : '') + '. Drag the boxes on the preview if they are not on the coin and the target name.');
  if (!win) listCams();
  V.lastVfc = performance.now(); schedule(); startBackground(track);
}
// Chrome stops video callbacks when this window is hidden or covered (e.g. behind OBS). Read frames straight from the
// track as a fallback so detection keeps running there.
// v126 (Jr. Troopa logs Nov 21 20:23: 76-91% of a Charge read's pictures dropped, 33 ms gaps): the page's one thread is
// often still busy when the next video frame comes, and the video callbacks skip that frame. A worker (its own thread)
// gets every frame from the track. It sends each frame's stamp (V.bgAdj below puts the stamps on the capture clock) and,
// while a Charge is armed or read (bgWorkerGrab, charge_live.js), the game picture already turned into the read's
// 640x480 luma raster plus the trigger's coarse brightness: the frame itself is closed in the worker at once (frames held
// for the page made the camera drop frames itself). No worker: the main-thread reader below, as before.
const BG_WORKER = `let grab = null, fwd = false, k = 0, oc = null, cx = null, sc = null, sx = null, fc = null, fx = null;
onmessage = async e => { const d = e.data; if (d && d.grab !== undefined) { grab = d.grab; return; } if (d && d.fwd !== undefined) { fwd = d.fwd; return; }
  let r; try { r = d.track ? new MediaStreamTrackProcessor({ track: d.track }).readable.getReader() : d.rs.getReader(); } catch (err) { postMessage({ fail: String(err) }); return; } postMessage({ via: d.track ? 'track' : 'stream' });
  for (;;) { let x; try { x = await r.read(); } catch (err) { break; } if (x.done) break;
    const f = x.value, at = performance.timeOrigin + performance.now(), ts = f.timestamp, g = grab;
    let bmp = null; if (fwd && (!g || ++k % 2 === 0)) try { const w = f.displayWidth, h = f.displayHeight; if (!fc || fc.width !== w || fc.height !== h) { fc = new OffscreenCanvas(w, h); fx = fc.getContext('2d'); } fx.drawImage(f, 0, 0, w, h); bmp = fc.transferToImageBitmap(); } catch (err) { bmp = null; }
    if (!g) { f.close(); if (bmp) postMessage({ ts, at, bmp }, [bmp]); else postMessage({ ts, at }); continue; }
    const t0 = performance.now(); let Y = null, m = 0;
    try { const vw = f.displayWidth, vh = f.displayHeight;
      if (!oc) { oc = new OffscreenCanvas(640, 480); cx = oc.getContext('2d', { willReadFrequently: true }); sc = new OffscreenCanvas(32, 24); sx = sc.getContext('2d', { willReadFrequently: true }); }
      sx.drawImage(f, g.gx * vw, g.gy * vh, Math.max(1, g.gw * vw), Math.max(1, g.gh * vh), 0, 0, 32, 24);
      const s = sx.getImageData(0, 0, 32, 24).data; for (let i = 0; i < s.length; i += 4) m += 0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2]; m /= 768;
      const kx = 1280 / vw, ky = 720 / vh; cx.setTransform(2 / g.SX * kx, 0, 0, 2 / g.SY * ky, 0.5 - 2 / g.SX * (0.5 + g.OX), 0.5 - 2 / g.SY * (0.5 + g.OY));
      cx.fillStyle = '#000'; cx.fillRect(-1e4, -1e4, 3e4, 3e4); cx.drawImage(f, 0, 0, vw, vh); cx.setTransform(1, 0, 0, 1, 0, 0);
      const q = cx.getImageData(0, 0, 640, 480).data; Y = new Uint8Array(640 * 480);
      for (let i = 0, j = 0; j < Y.length; i += 4, j++) Y[j] = (77 * q[i] + 150 * q[i + 1] + 29 * q[i + 2] + 128) >> 8;
    } catch (err) { Y = null; }
    f.close();
    const tr = (Y ? [Y.buffer] : []).concat(bmp ? [bmp] : []); postMessage({ ts, at, m: Y ? m : undefined, Y: Y || undefined, ms: performance.now() - t0, bmp: bmp || undefined }, tr);
  }
  postMessage({ done: true }); };`;
// whole pictures for onFrame come from the worker when the page is hidden (no video callbacks), when forced, and while a
// Charge read is fed by the worker (V.wkFeed). In that last case the video callbacks do nothing: an overloaded page ran them
// back to back and the worker's messages waited (v126 test: 2 pictures a second reached the read). During a read only every
// other picture goes to onFrame (live reads already ran it at ~30 per second, 33 ms gaps), and one over BG_STALE ms old is
// skipped, so a page that is behind leaves time for the camera's frames, which Chrome relays through this thread on their
// way to the worker (it cannot hand the track itself to a worker). The read's own pictures are never skipped.
const BG_STALE = 40;
function bgFeed() { return !!V.wkFeed && V.bgWorker && performance.now() - (V.bgSeen || 0) < 300; }     // a worker gone quiet hands back to the video callbacks
function bgWant() { return V.force === 'bg' || bgFeed() || performance.now() - V.lastVfc > 150; }
function bgWorkerGrab(g) { if (!V.bgWorker) return false; V.bgWorker.postMessage({ grab: g || null }); return true; }
function bgWorkerStart(track, viaTrack) {
  let w = null;
  try {
    w = new Worker(URL.createObjectURL(new Blob([BG_WORKER], { type: 'text/javascript' })));
    const tr = viaTrack ? V.bgTrack.clone() : null;
    w.onmessage = e => { const d = e.data; if (d.done) { V.bgWorker = null; return; } if (d.fail) { slog('bgWorkerFail', { msg: d.fail.slice(0, 120), viaTrack }); if (V.bgWorker === w) { V.bgWorker = null; w.terminate(); if (viaTrack) bgWorkerStart(track, false); } return; } if (d.via) { V.bgVia = d.via; return; }
      const tb = bgTime(d.ts, d.at - performance.timeOrigin); bgPair(tb, null); V.bgSeen = performance.now();
      if (d.Y && typeof chgWkPic === 'function') chgWkPic(tb - (V.bgAdj || 0), d.m, d.Y, d.ms);
      if (d.bmp) { try { const t = tb - (V.bgAdj || 0); if (bgWant() && performance.now() - t < BG_STALE) { V.src = d.bmp; frameSafe(t); V.bgFrames = (V.bgFrames || 0) + 1; frameStat('bg', t, d.ts != null); } } finally { V.src = null; d.bmp.close(); } }
      const fw = bgWant(); if (fw !== V.bgFwd) { V.bgFwd = fw; w.postMessage({ fwd: fw }); } };
    if (viaTrack) w.postMessage({ track: tr }, [tr]);
    else { const rs = new MediaStreamTrackProcessor({ track: V.bgTrack.clone(), maxBufferSize: 10 }).readable; w.postMessage({ rs }, [rs]); }
    V.bgWorker = w; V.bgFwd = false; return true;     // a hidden page: whole pictures (copies) for onFrame while the video callbacks are stopped (bgWant)
  } catch (e) { if (w) w.terminate(); return false; }
}
function startBackground(track) {
  if (typeof MediaStreamTrackProcessor === 'undefined') return;
  let rs;
  try { V.bgTrack = track.clone(); } catch (e) { return; }
  // the track itself goes to the worker where Chrome allows it: a stream handed over instead is relayed through this
  // thread, and stops with it (v126 test: every 60 ms stall lost 4 frames that way); else the stream, else no worker
  if (!window.__noBgWorker && !bgWorkerStart(track, true) && !bgWorkerStart(track, false)) V.bgWorker = null;
  if (V.bgWorker) return;
  try { rs = new MediaStreamTrackProcessor({ track: V.bgTrack }).readable; } catch (e) { return; }
  const rd = rs.getReader();
  (async () => {
    for (;;) {
      let r; try { r = await rd.read(); } catch (e) { break; }
      if (r.done) break;
      const fr = r.value;
      try { const tb = bgTime(fr.timestamp, null); bgPair(tb, null);
        if (V.force === 'bg' || performance.now() - V.lastVfc > 150) { V.src = fr; const t = tb - (V.bgAdj || 0); frameSafe(t); V.bgFrames = (V.bgFrames || 0) + 1; frameStat('bg', t, fr.timestamp != null); } }
      finally { V.src = null; fr.close(); }
    }
  })();
}
function stopCam() { if (V.stream) V.stream.getTracks().forEach(t => t.stop()); if (V.bgTrack) V.bgTrack.stop(); if (V.bgWorker) { V.bgWorker.terminate(); V.bgWorker = null; } V.stream = null; V.bgTrack = null; $('cam-start').disabled = false; $('cam-stop').disabled = true; camMsg('Stopped.'); }
// frame timestamp on the performance.now() clock (the beeps are scheduled on it). Some capture sources report
// captureTime on another clock; anything more than a second away from now is not trusted.
function frameTime(now, meta) {
  const pn = performance.now(), ok = x => typeof x === 'number' && x > 0 && Math.abs(x - pn) < 1000;
  const t = ok(meta.captureTime) ? meta.captureTime : ok(meta.expectedDisplayTime) ? meta.expectedDisplayTime : now;
  if (ok(meta.captureTime)) bgPair(null, t);
  frameStat(ok(meta.captureTime) ? 'vfcCapture' : ok(meta.expectedDisplayTime) ? 'vfcDisplay' : 'vfcNow', t, true);
  return t;
}
// v124 (the runner: "can the software more accurately keep track of which frame we're on?"): a frame read from the track (the page
// hidden behind OBS) was stamped when the page got to it, after any wait in the queue; its own timestamp (microseconds on the
// capture's clock) is mapped onto performance.now() by the smallest arrival delay seen, so the queue's wait no longer moves it
function bgTime(ts, at) {
  const pn = at != null ? at : performance.now(); if (ts == null || !isFinite(ts)) return pn;
  const d = pn - ts / 1000; if (V.bgOff == null || d < V.bgOff || pn - (V.bgOffT || 0) > 30000) { V.bgOff = d; V.bgOffT = pn; }
  const t = ts / 1000 + V.bgOff; return Math.abs(t - pn) < 500 ? t : pn;
}
// v126: the track's stamps against the video callbacks' capture times for the same pictures (the nearer within 8 ms, matched
// by whichever comes second): the median difference (V.bgAdj) is taken off the track's stamps, one clock for both
function bgPair(tb, tv) {
  const P = V.bgP || (V.bgP = { b: [], v: [], d: [] }), mine = tb != null ? P.b : P.v, other = tb != null ? P.v : P.b, x = tb != null ? tb : tv;
  let best = null; for (const y of other) if (Math.abs(y - x) < 8 && (best == null || Math.abs(y - x) < Math.abs(best - x))) best = y;
  if (best != null) { P.d.push(tb != null ? x - best : best - x); if (P.d.length > 240) P.d.shift(); if (P.d.length >= 20) { const a = P.d.slice().sort((p, q) => p - q); V.bgAdj = a[a.length >> 1]; } }
  else { mine.push(x); if (mine.length > 12) mine.shift(); }
}
// how the frames are timed, logged every 30 s (frameStats): the source, how many, and the spread of the gaps between frames
function frameStat(src, t, exact) {
  const F = V.fstat || (V.fstat = { t0: performance.now(), n: {}, gaps: [], last: null });
  F.n[src] = (F.n[src] || 0) + 1; if (F.last != null) { const g = t - F.last; if (g > 0 && g < 100) F.gaps.push(g); } F.last = t;
  if (performance.now() - F.t0 > 30000 && typeof slog === 'function') {
    const G = F.gaps, m = G.reduce((a, x) => a + x, 0) / (G.length || 1), sd = Math.sqrt(G.reduce((a, x) => a + (x - m) * (x - m), 0) / (G.length || 1));
    const off = G.filter(g => Math.abs(g - 16.68) > 3 && Math.abs(g - 33.37) > 3).length;
    slog('frameStats', { bgAdj: V.bgAdj != null ? +V.bgAdj.toFixed(2) : null, src: F.n, gapMs: +m.toFixed(2), sdMs: +sd.toFixed(2), offGrid: off, n: G.length });
    V.fstat = { t0: performance.now(), n: {}, gaps: [], last: null };
  }
}
// v109 (logs 07-48-18 / 07-49-56: after the Normal Boots Jr. fight's end not one event for two fights): an exception in onFrame
// skipped schedule(), and the picture loop was dead until a reload. The next frame is always scheduled; an error is logged once
// per message (frameError) and counted.
function frameSafe(t) { try { onFrame(t); } catch (e) { const m = String(e && e.message || e); V.frameErrs = (V.frameErrs || 0) + 1; if (V.frameErrMsg !== m) { V.frameErrMsg = m; try { slog('frameError', { msg: m.slice(0, 200), at: String(e && e.stack || '').split('\n').slice(0, 3).join(' | ').slice(0, 300), n: V.frameErrs }); } catch (x) {} } } }
function schedule() {
  if (!V.stream) return;
  if (V.video.requestVideoFrameCallback) V.video.requestVideoFrameCallback((now, meta) => { try { V.lastVfc = performance.now(); if (V.force !== 'bg' && !bgFeed()) frameSafe(frameTime(now, meta)); } finally { schedule(); } });
  else requestAnimationFrame(() => { try { V.lastVfc = performance.now(); frameSafe(performance.now()); } finally { schedule(); } });
}
function dims() { return V.src ? [V.src.displayWidth || V.src.width, V.src.displayHeight || V.src.height] : [V.video.videoWidth, V.video.videoHeight]; }
function region(b) { const [w, h] = dims(); return [b.x * w, b.y * h, Math.max(1, b.w * w), Math.max(1, b.h * h)]; }
function sample(b, ow, oh) { sctx.drawImage(V.src || V.video, ...region(b), 0, 0, ow, oh); return sctx.getImageData(0, 0, ow, oh).data; }
function median(a) { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; }
function threshold() {
  const manual = num('wthr'); if (manual > 0) return manual;
  const normal = median(V.peaks.slice(-30)), shine = median(V.shinePeaks.slice(-10));
  if (V.shinePeaks.length >= 2 && shine > normal * 1.5) return (normal + shine) / 2;
  return Math.max(0.02, normal * 2.5 + 0.005);
}
