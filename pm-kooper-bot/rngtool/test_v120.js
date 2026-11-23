/* v120 (the runner, 2026-11-19 evening):
 *  1. route text: "T5: Peach Beam; Do Nothing - Danger" (Lakilester does nothing on T5, as on the other turns).
 *  2. the last-press table: "Last press · 1 frame late" (no label, no frame), green ✓ when the frame hit works, red ✗ when it
 *     fails, never a "?"; a gridded table with only Window and Chance (no Frame / Expected rows), no empty rows.
 *  3. zwPlan: when the best frame comes too soon for the 3 beeps and beats the reachable plan by ZW_SOON_GAIN, no beeps
 *     (console log 18:32: a 48% 1-frame plan 0.27 s after a better, unreachable window). Replayed from the upload when present.
 * usage: node test_v120.js [PAGE] */
const { chromium } = require('playwright'); const fs = require('fs'), http = require('http');
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const LOG2 = '/root/.claude/uploads/4de37507-9387-5f1e-bab5-10167305f887/2884c412-pm-rng-log-2026-11-19_18-32-11.json';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); fs.createReadStream(PAGE).pipe(r); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [];
  const open = async s => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(s => { localStorage.clear(); if (s) localStorage.setItem('tot-settings', JSON.stringify(s)); const real = performance.now.bind(performance); window.__dt = 0; performance.now = () => real() + window.__dt; }, s || null);
    await p.goto(url); return p; };
  const p = await open();
  const r = await p.evaluate(() => { const T = window.__tot, E = T.v111.ev;
    const li = [...document.querySelectorAll('#route-list li')].map(l => l.textContent);
    const late = E(`pressTable({ label: 'Final Bowser T6, Do Nothing', err: 1.04, f: 162, target: 161, w: { start: 160, end: 161 }, inWin: false, works: true, p: 0.74 })`);
    const fail = E(`pressTable({ label: 'x', err: -2.2, f: 158, target: 161, w: { start: 160, end: 161 }, inWin: false, works: false, p: 0.74 })`);
    const bare = E(`pressTable({ label: 'x', err: 0.8, works: null })`);
    return { v: T.VERSION, t5: li.some(t => /T5: Peach Beam; Do Nothing - Danger/.test(t)), late: { text: late.text, good: late.good, html: late.html }, fail: { text: fail.text, good: fail.good }, bare: bare.text }; });
  ok(r.v === 'v133', 'page version v120');
  ok(r.t5, '1. route: "T5: Peach Beam; Do Nothing - Danger"');
  ok(/^Last press · 1 frame late ✓ /.test(r.late.text) && r.late.good === true, '2. "Last press · 1 frame late ✓", green: the frame hit works (' + r.late.text + ')');
  ok(/Window: outside \(window 160-161, aimed 161\)/.test(r.late.text) && !/Chance|You hit|Frame|Expected|\?|Final Bowser/.test(r.late.text), '2. rows: Window only (v128: the odds are the % box\'s); no Chance / Frame / Expected / "?" / label');
  ok(/border:1px solid/.test(r.late.html), '2. a gridded table');
  ok(/^Last press · 2\.2 frames early ✗/.test(r.fail.text) && r.fail.good === false, '2. a failing frame: red ✗ (' + r.fail.text.slice(0, 60) + ')');
  ok(r.bare === 'Last press · 0.8 frames late ', '2. nothing known: no "?" and no empty rows ("' + r.bare + '")');
  await p.close();
  // 3. the too-soon rule on the 18:32 Hallway log
  if (!fs.existsSync(LOG2)) console.log('skip 3: the 18:32 log is not present');
  else {
    const L = JSON.parse(fs.readFileSync(LOG2, 'utf8')); const q = await open(L.settings);
    const o = await q.evaluate(L => { const T = window.__tot, ev = T.v111.ev, setNow = t => { window.__dt += t - performance.now(); };
      const E = L.events, cap = L.chargeCaptures[L.chargeCaptures.length - 1], lk = E.find(e => e.ev === 'chargeLock'), pl = E.find(e => e.ev === 'plan');
      const cf = E.filter(e => e.ev === 'chargeConfirm').pop(), sp = E.filter(e => e.ev === 'hudConfirm' && e.id === 'hw_spiny').pop();
      const hi = T.RT().findIndex(s => s.turn === 'hw_spiny'); T.v106.setStep(hi);
      setNow(lk.t); T.hwTrackerAt(parseInt(lk.best.seed, 16), lk.qs, cf.at - cap.hideMs);
      window.__spAt = sp.at; ev("zwInput('hw_spiny', window.__spAt, VAN.B(), CHG_IMPS)"); T.v106.setStep(hi + 1);
      for (const e of E) if (e.t > lk.t && e.t < pl.t && e.ev === 'shine') { setNow(e.at + 150); T.addShine(e.at, true); }
      setNow(pl.t); const n0 = T.v106.SLOG.length; ev("st.plan = null; zwPlan('test')");
      const s = T.v106.SLOG.slice(n0).find(e => e.ev === 'zwTooSoon');
      const first = { soon: s, plan: !!ev('st.plan'), msg: ev('st.msg') };
      for (const dt of [500, 1000, 1500, 2000]) { setNow(pl.t + dt); ev("zwPlan('retry')"); if (ev('st.plan')) { first.later = dt; break; } }
      return first;
    }, L);
    ok(!o.soon && o.plan, '3. (v121: no blind presses) 18:32 Time Out: the too-soon frame (57%) is gone, the reachable 43% plan beeps (better than blind 31%; ' + JSON.stringify(o.soon) + ' | ' + (o.msg || '') + ')');
    await q.close();
  }
  // 4. the backup T7 Charge from the T6 lock's seed (console 18:47 and two Nov 17 pairs): the candidates hold the T7 seed and lock it fast
  { const U = '/root/.claude/uploads/4de37507-9387-5f1e-bab5-10167305f887', L7 = [['b320f38f-pm-rng-log-2026-11-19_18-47-17.json'], ['484e3220-pm-rng-log-2026-11-17_16-12-04.json'], ['935fe013-pm-rng-log-2026-11-17_16-01-44.json']];
    const q = await open();
    for (const [fn] of L7) { const f = U + '/' + fn; if (!fs.existsSync(f)) { console.log('skip 4: ' + fn + ' not present'); continue; }
      const L = JSON.parse(fs.readFileSync(f, 'utf8')), C = L.chargeCaptures, i7 = C.findIndex((c, i) => i > 0 && /^Final Bowser T7/.test(c.stepT) && /^Final Bowser T6/.test(C[i - 1].stepT));
      const a = C[i7 - 1], c7 = C[i7], sec = (Date.parse(c7.wall) - Date.parse(a.wall)) / 1000;
      const o = await q.evaluate(async ([c7, s6, sec]) => { const T = window.__tot, ev = T.v111.ev;
        const cands = ev(`fb2T7CandsFrom(${parseInt(s6, 16)}, ${sec})`); if (!cands) return { none: true };
        let bin = ''; const u8 = new Uint8Array(new Uint32Array(cands).buffer); for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
        window.__fb2Wide = true; const t0 = performance.now();
        const r = await T.chgReplay(Object.assign({}, c7, { cands: btoa(bin) }), { maxAlts: 0 }); window.__fb2Wide = null;
        return { n: cands.length, inC: cands.includes(parseInt(c7.result.seed, 16) >>> 0), state: r.state, seed: r.best && r.best.seed, narrow: r.info.narrow, ms: Math.round(performance.now() - t0) };
      }, [c7, a.result.seed, sec]);
      ok(o.inC && o.state === 'locked' && o.seed === c7.result.seed && o.narrow && o.narrow.locked, '4. ' + fn.slice(0, 8) + ' backup T7 (' + sec.toFixed(2) + ' s after T6): ' + o.n + ' candidates from the T6 seed hold ' + c7.result.seed + ', locked by the narrow search in ' + o.ms + ' ms (' + JSON.stringify(o.narrow) + ')');
    }
    await q.close(); }
  ok(!errs.length, 'no page errors ' + JSON.stringify(errs.slice(0, 2)));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
