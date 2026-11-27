/* v155: the live page for fb14_e2e.py LIVE=1 - one page for the whole fight, fed turn by turn as the test runner plays it (the old
 * test_fb14_page.js replays the fight from T1 for every turn). A JSON command per stdin line, a JSON answer per stdout line:
 *   {cmd:'init', M:{turn, step, lateMs, fbc9, fadeF, noBroad, readxS}}       the page opened on that step (VCLOCK: the page's clock = the fed picture's time)
 *   {cmd:'refs', refM, refS, refB}                                   capture urls of the saved screens (as test_fb14_page.js)
 *   {cmd:'set', fadeF}                                               the fade's battle start (tests), once known
 *   {cmd:'feed', frames:[url...]}                                    pictures fed at 60 fps, continuing the fight's capture index
 *   {cmd:'quit'}
 * Each answer: { i (pictures fed so far), t0, events (new since the last answer: the test_fb14_page.js filter), plans (new fb14Plan),
 * late, step, fb2, fb14, pageErrors }. usage: node test_fb14_live.js URLBASE */
const { chromium } = require('playwright'); const readline = require('readline');
(async () => {
  const base = process.argv[2];
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--js-flags=--max-old-space-size=4096'] });     // v179: two tabs crashed at T2 under load (a bigger heap; the crash logged)
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('crash', () => { try { process.stderr.write('page crash at ' + new Date().toISOString() + ' rss ' + JSON.stringify(process.memoryUsage()) + '\n'); } catch (e) {} }); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { localStorage.setItem('tot-boxes', JSON.stringify({ coin: { x: 1080 / 1280, y: 40 / 720, w: 40 / 1280, h: 52 / 720 }, target: { x: 0.36, y: 0.265, w: 0.08, h: 0.06 } })); });
  await p.goto(base + '/tot.html');
  const rl = readline.createInterface({ input: process.stdin }); let nErr = 0;
  for await (const line of rl) {
    if (!line.trim()) continue; const C = JSON.parse(line);
    if (C.cmd === 'quit') break;
    const out = await p.evaluate(async ({ C, base }) => {
      const T = window.__tot, F = window.__fb14, L = window.__live || (window.__live = { i: 0, slog: 0, late: 0 });
      const BOX = { M: { x: 0.36, y: 0.265, w: 0.08, h: 0.06 }, B: { x: 0.36, y: 0.265, w: 0.08, h: 0.06 }, S: { x: 0.33, y: 0.317, w: 0.176, h: 0.1 } };
      const img = u => fetch(base + '/' + u).then(r => r.blob()).then(x => createImageBitmap(x));
      if (C.cmd === 'init') { const M = C.M || {};
        L.realNow = performance.now.bind(performance); L.vt = null; performance.now = () => (L.vt != null ? L.vt : L.realNow());
        if (M.noBroad) window.__fb14NoBroad = true; if (M.fadeF != null) window.__fb14fadeF = M.fadeF; if (M.fbc9) document.getElementById('s-fbc9').value = M.fbc9;
        T.setStep((M.turn || 1) >= 5 ? T.RT().findIndex(s => s.fb5) : T.RT().findIndex(s => s.fb14 === (M.turn || 1) && s.fb14role === (M.step || 'charge')));
        if (M.readxS != null && T.v111 && T.v111.ev) T.v111.ev('FB14_READX.S = ' + (+M.readxS));     // v179: the emulator capture's Strategies-box read (harness only: the console's v94 +3.4 read 2.3 late here)
        L.lateMs = M.lateMs || 25; L.t0 = null; }
      if (C.cmd === 'set') { if (C.fadeF != null) window.__fb14fadeF = C.fadeF; if (C.truthSeeds) { const o = window.__fb14seeds; window.__fb14seeds = { off: o && C.keepOff ? o.off : C.truthSeeds.off, s: Uint32Array.from(C.truthSeeds.s, x => typeof x === 'string' ? parseInt(x, 16) : x) }; if (C.skipCheck && window.__fb14 && window.__fb14.truthSkipCheck) window.__fb14.truthSkipCheck(); } }
      if (C.cmd === 'refs') { const tg = JSON.parse(localStorage.getItem('tot-targets') || '{}');
        for (const [cat, u] of [['M', C.refM], ['S', C.refS], ['B', C.refB]]) { if (!u) continue; const im = await img(u), vf = new VideoFrame(im, { timestamp: 0 });
          const keep = T.V.src; T.V.src = vf; const g = F.sample(BOX[cat], 24, 16), ref = []; for (let k = 0; k < g.length; k += 4) ref.push((g[k] + g[k + 1] + g[k + 2]) / 3); T.V.src = keep; vf.close(); im.close(); tg['jr_' + cat] = { box: BOX[cat], ref }; }
        localStorage.setItem('tot-targets', JSON.stringify(tg)); F.reloadTargets(); }
      if (C.cmd === 'feed') { const fr = C.frames || [], pre = fr.slice(0, 8).map(img); let k = 0;
        if (L.t0 == null) L.t0 = L.realNow() + 300;
        L.tBase = L.realNow() - (L.t0 + L.i * 1000 / 60);     // the fight's clock resumes where it stopped (the runner's own work between feeds takes no fight time)
        for (; k < fr.length; k++) { if (k + 8 < fr.length) pre.push(img(fr[k + 8])); const im = await pre[k];
          const tf = L.t0 + L.i * 1000 / 60, w = tf + L.tBase - L.realNow(); if (w > 1) await new Promise(r => setTimeout(r, w));
          L.vt = tf; const vf = new VideoFrame(im, { timestamp: Math.round(L.i * 1e6 / 60) }); im.close();
          T.V.src = vf; try { T.onFrame(tf); } finally { T.V.src = null; vf.close(); } L.i++;
          { const m = T.st ? T.st.msg : null; if (m !== L.msg) { L.msg = m; (L.msgs = L.msgs || []).push({ t: performance.now(), ev: 'harnessMsg', step: T.step(), msg: m ? String(m).slice(0, 200) : null }); } } } }     // v179: the headline's changes (the T8 that never planned)
      const S = T.SLOG, nw = S.slice(L.slog), cf = t => +((t - L.t0) * 60 / 1000).toFixed(1); L.slog = S.length;
      const fbe = nw.filter(x => /^fb14|^fb2|^fbP1|^charge(Lock|NoLock|Trigger|Narrow|Stream|NotSeen|Retry|Error|Arena)|^fbStream|^step$|^beepsStopped|^screenClosed|^pageError|^fbsWorkerError/.test(x.ev));
      if (L.msgs && L.msgs.length) { fbe.push(...L.msgs); L.msgs = []; }
      const plans = nw.filter(x => x.ev === 'fb14Plan').map(x => Object.assign({}, x, { tPressCap: x.tPress != null ? cf(x.tPress) : null }));
      return { i: L.i, t0: L.t0, events: fbe, plans, step: T.step(), fb14: { on: F.FB14.on, states: F.FB14.states.length }, fb2: window.__fb2 && { on: window.__fb2.FB2.on, plan: window.__fb2.FB2.plan, t7: window.__fb2.FB2.t7 ? { n: window.__fb2.FB2.t7.states.length, plan: window.__fb2.FB2.t7.plan || null, hit: !!window.__fb2.FB2.t7.hit, hpRead: window.__fb2.FB2.t7.hpRead } : null } };
    }, { C, base });
    out.pageErrors = errs.slice(nErr); nErr = errs.length;
    process.stdout.write(JSON.stringify(out) + '\n');
  }
  await b.close(); process.exit(0);
})();
