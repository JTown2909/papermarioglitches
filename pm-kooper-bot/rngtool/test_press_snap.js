/* v114 (console x1820 T3 / T4, page v112: pressed inside the window, dodged, judged "failing" at 0.25): a Jr. press is judged on
 * the newest states' shares kept while the planned frames were still ahead (P.shSnap, zwTick), not on the states at the read
 * (stepped past the press, every earlier frame 0). Replays x1803 and x1820 (fixtures/console_1115_v114_jr.json, numbers only)
 * with the tracker ticking, and checks every press the runner dodged with is judged a working frame (x1803 T3's 191.15 read on
 * 192-193 now reads inside with v113's Bomb read).
 * usage: [PAGE=...] node test_press_snap.js */
const fs = require('fs'), path = require('path');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v114/timeout_timer_standalone.html';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_1115_v114_jr.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  for (const name of ['x1803', 'x1820']) {
    const L = FIX[name], p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(s => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify(s)); } catch (e) {} window.__now = 1000; performance.now = () => window.__now; }, L.settings);
    await p.goto('file://' + PAGE);
    const r = await p.evaluate(L => {
      const T = window.__tot, E = c => T.v111.ev(c), ev = L.events.slice().sort((a, b) => a.t - b.t), res = { errs: [] };
      const i1 = T.RT().findIndex(s => (s.seq || 'ultra') === 'ultra' && s.jr === 1), fight = ev.find(e => e.ev === 'jrFight');
      window.__now = fight.t - 2000; T.setStep(i1); const n0 = T.SLOG.length; let started = false, tPrev = null;
      // the frame the console judged (its read c minus its err = the plan's frame): F per press k, from the bar hide / Strategies close
      const pr = ev.filter(e => e.ev === 'press'), src = k => ev.find(e => (e.ev === 'jrHide' || e.ev === 'jrStrategiesClosed') && e.k === k), snap = {}; res.cmp = [];
      const Fk = q => { const h = src(q.k); if (!h) return null; return E(`zwF(${h.at}, (${h.ev === 'jrHide'} ? JRS()[${q.k}].hide : R.PROFILES.jrcc_nothing.vanish) + num('pfix') + jrFix())`) - q.err; };
      const look = () => { for (const q of pr) { if (window.__now > q.t) continue; const F = Fk(q); if (F == null) continue; const f = Math.round(F), S = E('zwStates(performance.now())'); if (S.list.length && S.list.every(x => x.g <= f - 8)) snap[q.k] = { f, sh: Array.from(E(`zwShare(zwStates(performance.now()).list, ${f - 1}, ${f + 1}, R.PROFILES['${q.prof}'])`)) }; } };
      const tick = t => { if (!started || tPrev == null) return; for (let x = tPrev + 100; x < t; x += 100) { window.__now = x; try { E(`ZWD.t = 0; zwTick(${x})`); look(); } catch (er) {} } };
      for (const e of ev) {
        if (e.t < fight.t - 3000) continue; tick(e.t); window.__now = e.t; tPrev = e.t;
        try {
          if (e.ev === 'chargeLock' && !started) { started = true; T.jrTrackerAt(parseInt(e.seed, 16), e.qs, fight.at, 0); }
          else if (e.ev === 'chargeLock') { const tg = ev.filter(x => x.ev === 'chargeTrigger' && x.t < e.t).pop(), kb = ev.filter(x => x.ev === 'jrChargeBurst' && x.t < e.t).pop();
            E(`{ const tr = { t: ${tg.t - 11} }; Object.assign(CHG, { prof: CHG_PROF.jr, trig: tr, taps: [], pres: [], state: 'locked', qs: ${JSON.stringify(e.qs)} }); JRT.trigSeen = tr; JRT.chargeK = ${kb ? kb.k : 'JRT.chargeK'}; jrLock(${parseInt(e.seed, 16)}, ${JSON.stringify(e.qs)}); }`); }
          else if (!started) continue;
          else if (e.ev === 'shine') E(`addShine(${e.at}, true)`);
          else if (e.ev === 'coinBack') E(`coinBack(${e.hiddenMs})`);
          else if (e.ev === 'jrStrategiesClosed') E(`jrScreenClosed(${e.at})`);
          else if (e.ev === 'press') { const F = Fk(e), f = Math.round(F), old = Array.from(E(`zwShare(zwStates(performance.now()).list, ${f - 1}, ${f + 1}, R.PROFILES['${e.prof}'])`)), sn = snap[e.k], pv = a => a ? +(0.25 * a[0] + 0.5 * a[1] + 0.25 * a[2]).toFixed(3) : null;
            res.cmp.push({ k: e.k, prof: e.prof, f, console: e.pNow, oldAtRead: pv(old), snapAhead: sn ? pv(sn.sh) : null }); }
          else if (e.ev === 'jrHide') E(`jrHide(${e.at}, ${e.upMs})`);
          else if (e.ev === 'plan' && !E('st.plan')) E('st.planTry = 0; makePlan()');
        } catch (er) { res.errs.push(e.ev + ': ' + er); }
      }
      res.press0 = T.SLOG.slice(n0).filter(x => x.ev === 'press').map(x => ({ k: x.k, prof: x.prof, err: x.err, inWin: x.inWin, works: x.works, pNow: x.pNow }));
      return res;
    }, L);
    const want = L.events.filter(e => e.ev === 'jrOutcome' && e.dodge).map(e => e.k);
    console.log(name, JSON.stringify(r.cmp), r.errs.slice(0, 2));
    for (const k of want) { const q = r.cmp.find(x => x.k === k); if (!q || q.console == null) continue;
      ok(q.snapAhead != null && q.snapAhead >= 0.5, name + ' k ' + k + ' (' + q.prof + '): dodged in the game; on the frame the console judged, the states kept ahead give ' + q.snapAhead + ' (the console said ' + q.console + ', the states at the read ' + q.oldAtRead + ')'); }
    ok(!r.errs.length, name + ': no replay errors ' + r.errs.slice(0, 1).join(''));
    await p.close();
  }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
