/* v114 (charge_live/README.md v114): Final Bowser phase 2, the failed T6 Close Call and the runner's backup ending
 * (fixtures/console_1115_fb1810.json, numbers only: console fb1810 and the emulator's fb2_route/t6hit_log.py).
 *  1. fb1810 T6: Mario's HP number (the clip's, by time from the Do Nothing confirm) through fb2HpWatch on the T6 lock's states:
 *     a hit 2.6 s after the confirm (v113: "fb2Dodged" 16 s after it, on the Life Shroom's 10), never a dodge; the route moves
 *     to the backup T7 and the route panel shows the backup lines in place of T6 / T7.
 *  2. Synthetic: the same number to the end = a dodge; a change after a dodge (within 22 s) withdraws it (fb2HitLate).
 *  3. The backup T7 model (fb2AI7) against the emulator's runs: the outcome class of every run (Body Slam / Claw = Danger with
 *     the charges kept; the wave; the Star Rod cast again; a KO), and for Body Slam / Claw the T8 menu frame and the seed after it.
 *  4. The T8 Power Bounce at 15 charges (first hit 18: 5 bounces end the fight) against the emulator's runs.
 *  5. End to end on the emulator's true T7 state: the T7 plan beeps a Body Slam / Claw frame; from that confirm the T8 states give
 *     the emulator's bounce counts at its target-A frames.
 * usage: node test_v114.js [PAGE=...] */
const fs = require('fs'), path = require('path');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v114/timeout_timer_standalone.html';
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_1115_fb1810.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const open = async () => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', boots: 'ultra', off: '-4.5', vlag: '50', zwedge: '0.4', zwwin: '1', fb2t5: 'any' })); } catch (e) {} window.__now = 100000; performance.now = () => window.__now; });
    await p.goto('file://' + PAGE); return p; };
  { const p = await open(); ok(await p.evaluate(() => window.__tot.VERSION) === 'v118', '0. page version v114'); await p.close(); }
  // ---- 1. fb1810 T6
  { const p = await open();
    const r = await p.evaluate(FX => {
      const T = window.__tot, X = window.__fb2, FB2 = X.FB2, out = {}, i6 = T.RT().findIndex(s => s.turn === 'fb2_k' && !s.backup);
      T.setStep(i6); out.mainShown = /T7: Bounce x7/.test(document.getElementById('route-list').textContent); out.backupHidden = !/Life Shroom/.test(document.getElementById('route-list').textContent);
      const tc = 200000; window.__now = tc - 3000;
      Object.assign(FB2, { on: true, hyps: FX.lock6.map(h => ({ s: h[0] >>> 0, nc: h[1], ph: [h[2], h[3]], w: 1 / FX.lock6.length })), plan: { k: 169, p: 0.85, pp: 0.87, win: 2 }, plans: [], t7: null, taps: [], vis: [], visFrom: null, pObs: null, pT: null, hpw: null });
      const H = FX.hp; window.__fb2HpTest = t => { let i = 0; while (i < H.length - 1 && tc + H[i + 1][0] <= t) i++; return H[i].slice(1); };
      for (const row of H) { const t = tc + row[0]; if (row[0] >= 0) break; window.__now = t; X.v108.hpWatch(t, true); }
      window.__now = tc; FB2.pObs = FX.c6; FB2.pT = tc; X.setP(FX.c6); out.pL = +FB2.t7.pLucky.toFixed(3); out.hitAtk = FB2.t7.hitAtk;
      // the route moves on to T7 on the confirm (fb2Confirm), as live
      T.setStep(T.RT().findIndex((s, j) => j > i6 && s.turn === 'fb2_pb'));
      for (const row of H) { const t = tc + row[0]; if (row[0] < 0) continue; window.__now = t; X.v108.hpWatch(t, true); }
      const L = T.SLOG.filter(e => /^fb2(Dodged|HitSeen|Backup|HitLate)$/.test(e.ev));
      out.evs = L.map(e => e.ev); out.hit = L.find(e => e.ev === 'fb2HitSeen'); out.step = T.RT()[T.step()]; out.backup = X.v114.backupOn(); out.atk6 = X.v114.FB2B.atk6;
      const rl = document.getElementById('route-list').textContent; out.rl = { b6: /Close Call failed, Life Shroom/.test(rl), b7: /No Wave, Danger/.test(rl), b8: /T8: Bounce x5/.test(rl), main7: /T7: Bounce x7/.test(rl), main6: /T6: Charge; Do Nothing - Close Call(?!\s*failed)/.test(rl) };
      out.msg = T.st ? T.st.msg : null; window.__fb2HpTest = null; return out; }, FX);
    console.log('1.', JSON.stringify(r).slice(0, 700));
    ok(r.mainShown && r.backupHidden, '1. before a failure the route shows the main T6 / T7 and hides the backup lines');
    ok(Math.abs(r.pL - FX.pLucky6) < 0.002, '1. the T6 lock\'s states at the read confirm (c ' + FX.c6 + ') give the console\'s Close Call share (' + r.pL + ', console ' + FX.pLucky6 + ')');
    ok(r.hit && !r.evs.includes('fb2Dodged') && r.hit.afterMs > 2200 && r.hit.afterMs < 3300, '1. fb1810: the hit read ' + (r.hit && r.hit.afterMs) + ' ms after the confirm (the units digit 1 -> 0), no dodge (v113: fb2Dodged at 16000 ms on the revive\'s 10)');
    ok(r.backup && r.step && r.step.b7 && r.evs.includes('fb2Backup'), '1. the route switches to the backup T7 step (' + (r.step && r.step.label) + ')');
    ok(r.rl.b6 && r.rl.b7 && r.rl.b8 && !r.rl.main7 && !r.rl.main6, '1. the route panel shows the backup lines in place of T6 / T7 ' + JSON.stringify(r.rl));
    ok(r.atk6 && Object.keys(r.atk6).length > 0, '1. Bowser\'s T6 attack on the hit branch is kept for the T7 flags ' + JSON.stringify(r.atk6));
    await p.close(); }
  // ---- 2. synthetic: a dodge, and a late change withdrawing it
  { const p = await open();
    const r = await p.evaluate(() => {
      const T = window.__tot, X = window.__fb2, FB2 = X.FB2, i7 = T.RT().findIndex(s => s.turn === 'fb2_pb' && !s.backup), res = {};
      let tcN = 300000; const run = (chgAt) => { T.setStep(i7); X.v114.FB2B.on = false; const tc = (tcN += 100000); Object.assign(FB2, { on: true, hyps: [{ s: 1, nc: 70, ph: [0, 0], w: 1 }], t7: { states: [{ w: 1 }], pLucky: 0.5, atk: {} }, pT: null, hpw: null });
        window.__fb2HpTest = t => (chgAt != null && t >= tc + chgAt ? [0, 0.4, 0.7, 0.59] : [0, 0.08, 0.71, 0.59]);
        for (let t = tc - 1000; t < tc; t += 33.4) { window.__now = t; X.v108.hpWatch(t, true); } FB2.pT = tc;
        for (let t = tc; t < tc + 12000; t += 33.4) { window.__now = t; X.v108.hpWatch(t, true); }
        const L = T.SLOG.filter(e => /^fb2(Dodged|HitSeen|HitLate|Backup)$/.test(e.ev) && e.t >= tc).map(e => e.ev); window.__fb2HpTest = null; return { L, outcome: FB2.t7 ? FB2.t7.outcome : 'reset', backup: X.v114.backupOn() }; };
      res.dodge = run(null); res.late = run(7000); return res; });
    console.log('2.', JSON.stringify(r));
    ok(r.dodge.L.join() === 'fb2Dodged' && r.dodge.outcome === 'dodge' && !r.dodge.backup, '2. the same HP number to the end: a dodge, no backup');
    ok(r.late.L.join() === 'fb2Dodged,fb2HitLate,fb2HitSeen,fb2Backup' && r.late.backup, '2. the number changing 7 s after the confirm withdraws the dodge: a hit, the backup (' + r.late.L.join() + ')');
    await p.close(); }
  // ---- 3 / 4 / 5: the backup model against the emulator
  { const p = await open();
    const r = await p.evaluate(FX => {
      const T = window.__tot, X = window.__fb2, FB2 = X.FB2, out = { s7: [], t8: [] };
      for (const [s, nc, p1, p2, P, cls, hp, Tm, sT] of FX.s7) { const a = X.v114.ai7(s, nc, [p1, p2], P, true, true);
        const c = a.atk === 'slam' || a.atk === 'claw' ? 'good' : a.atk === 'wave' ? 'wave' : a.atk === 'recast' ? 'stay' : 'ko';
        out.s7.push({ P, cls, c, atk: a.atk, hp, T: a.T, Tm, s: a.s, sT, okT: cls !== 'good' || (a.T === Tm && a.s === sT && (a.atk === 'claw') === (hp === 1)) }); }
      X.v114.FB2B.on = true;
      for (const [s, nc, p1, p2, d, n] of FX.t8) out.t8.push({ d, n, page: X.v114.pb(s, nc, [p1, p2], 0, d) });
      // 5. the T7 plan on the true state, then the T8 states from the beeped confirm
      const i7 = T.RT().findIndex(s => s.b7); T.setStep(i7); X.v114.FB2B.on = true; X.v114.FB2B.atk6 = { fire: 1 };
      T.CHG.trig = { t: window.__now - 3000 }; const L7 = FX.lock7; Object.assign(FB2, { on: true, hyps: [{ s: L7[0] >>> 0, nc: L7[1], ph: [L7[2], L7[3]], w: 1 }], plan: null, plans: [], t7: null, pObs: null, pT: null, hpw: null });
      const runs = FX.s7.filter(x => x[0] && FX.s7.indexOf(x) < 30), good = runs.filter(x => x[5] === 'good').map(x => x[4]);
      const pl = X.planPAt(runs[0][4]); out.plan = { k: pl.k, pp: pl.pp, p: pl.p, win: pl.win, none: pl.none, good };
      X.setP(FX.t8P7); const st0 = FB2.t7.states.find(o => o.l === 0 && o.P === FX.t8P7); out.t7 = { n: FB2.t7.states.length, pL: FB2.t7.pLucky, atk: st0 && st0.a.atk };
      if (st0) out.e2e = FX.t8.map(([s, nc, p1, p2, d, n]) => ({ d: FX.t8base + d, n, page: X.v114.pb(st0.a.S.s, st0.a.S.nc, st0.h.ph, st0.a.T + 1, FX.t8base + d) }));
      out.txt = X.v114.txt();
      return out; }, FX);
    const bad = r.s7.filter(x => x.c !== x.cls || !x.okT);
    console.log('3.', JSON.stringify(bad.slice(0, 3)), r.s7.length, 'runs;', JSON.stringify(r.s7.reduce((a, x) => { a[x.cls] = (a[x.cls] || 0) + 1; return a; }, {})));
    ok(r.s7.length >= 30 && !bad.length, '3. fb2AI7: the outcome of every emulator run (' + r.s7.length + '), and for Body Slam / Claw the T8 menu frame and the seed after it');
    console.log('4.', JSON.stringify(r.t8));
    ok(r.t8.length >= 6 && r.t8.every(x => x.page === x.n), '4. T8 Power Bounce at 15 charges (first hit 18): the page\'s bounce count = the emulator\'s on every run');
    console.log('5.', JSON.stringify(r.plan), JSON.stringify(r.t7), JSON.stringify(r.e2e));
    ok(r.plan && r.plan.k != null && r.plan.good.includes(r.plan.k) && r.plan.pp >= 0.4, '5. the backup T7 plan on the true state beeps a Body Slam / Claw frame (' + r.plan.k + ', perfect press ' + (r.plan.pp && r.plan.pp.toFixed(2)) + '; the emulator\'s: ' + r.plan.good.join(', ') + ')');
    ok(r.t7.atk === 'claw' && r.e2e && r.e2e.every(x => x.page === x.n), '5. from that Do Nothing (P ' + FX.t8P7 + ', Claw) the T8 states give the emulator\'s bounces at its target-A frames ' + JSON.stringify(r.e2e && r.e2e.map(x => x.page + '/' + x.n)));
    ok(/T7/.test(r.txt.turn) && /Body Slam/.test(r.txt.goal), '5. the backup step\'s words name T7 and its aim');
    await p.close(); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
