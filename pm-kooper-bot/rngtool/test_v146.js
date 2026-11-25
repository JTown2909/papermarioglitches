/* v146 (console 11-24 20:54 / 20:56 / 21:00, v145):
 * (1) T6's Charge did not lock and Bowser's Fire Breath took the Life Shroom: the page never knew (the HP watch and the outcome hung on T7's
 *     states). Now the Do Nothing confirm without a lock sets a stateless T7, the HP watch reads the hit and the route goes to the backup.
 *     The same with the number held: a dodge, no backup.
 * (2) Phase 1: a lock, Lakilester read, no Power Bounce plan and no word why. The silent no-plans are logged (fbP1NoPlan); the 20:54
 *     attempt's capture replayed (if its log is in the uploads folder): 'coin' (the coin fits none of the kept states).
 * (3) the v145 hit-fresh step on a narrowed read (no fit list): 'light' (the refine locks again), no throw (source check; e2e FORCE_HIT=1).
 * usage: node test_v146.js [page] */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const UP = '/root/.claude/uploads/4de37507-9387-5f1e-bab5-10167305f887', LG = path.join(UP, '510a4b7c-pm-rng-log-2026-11-24_20-55-17.json');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async () => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e))); await p.goto('file://' + PAGE); return p; };
  { const p = await open(); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
    ok(await E('VERSION') === 'v149', 'page version v146');
    // (1)
    const r1 = JSON.parse(await E(`(() => { const T = window.__tot, X = window.__fb2, out = {};
      const run = chg => { const i6 = T.RT().findIndex(s => s.turn === 'fb2_k' && !s.backup); T.setStep(i6); X.v114.FB2B.on = false; fb2Reset();
        const n0 = T.SLOG.length, tc = 500000 + (chg ? 100000 : 0); CHG.trig = { t: tc - 6000 }; window.__now = tc;
        window.__fb2HpTest = t => (chg && t >= tc + 2600 ? [0, 0.4, 0.7, 0.59] : [0, 0.08, 0.71, 0.59]);
        for (let t = tc - 1000; t < tc; t += 33.4) { window.__now = t; X.v108.hpWatch(t, true); }
        fb2Confirm(tc); const st7 = !!(FB2.t7 && FB2.t7.noLock);
        for (let t = tc; t < tc + 20000; t += 33.4) { window.__now = t; X.v108.hpWatch(t, true); }
        window.__fb2HpTest = null; const L = T.SLOG.slice(n0).filter(e => /^fb2(NoLockWatch|Dodged|HitSeen|Backup)$/.test(e.ev)).map(e => e.ev);
        return { st7, L, backup: X.v114.backupOn(), step: T.RT()[T.step()].label || T.RT()[T.step()].turn }; };
      out.hit = run(true); out.held = run(false); return JSON.stringify(out); })()`));
    console.log('     ' + JSON.stringify(r1));
    ok(r1.hit.st7 && r1.hit.L.includes('fb2NoLockWatch') && r1.hit.L.includes('fb2HitSeen') && r1.hit.backup, '(1) no T6 lock, the HP number drops: the hit is read and the route takes the backup ending (' + r1.hit.L.join() + ')');
    ok(r1.held.L.includes('fb2Dodged') && !r1.held.L.includes('fb2HitSeen') && !r1.held.backup, '(1) no T6 lock, the number held: a dodge, no backup');
    // (3)
    const src = await E(`fb14Lock.toString()`);
    ok(/afterHit && H\.light\) \{[\s\S]{0,160}?return 'light'/.test(src), '(3) a carried narrowed read after a hit goes back for the whole fit list');
    await p.close(); }
  // (2)
  if (!fs.existsSync(LG)) console.log('skip (2): the 20:54 log is not in the uploads folder');
  else { const p = await open(); const L = JSON.parse(fs.readFileSync(LG, 'utf8')), C = L.chargeCaptures[0], EV = L.events;
    const trigLog = EV.find(e => e.ev === 'chargeTrigger').t, conf = EV.find(e => e.ev === 'fbP1Confirm').at;
    const shines = EV.filter(e => e.ev === 'shine').map(e => e.at), bars = EV.filter(e => e.ev === 'barHide').map(e => [e.at - e.upMs, e.at]);
    const r2 = await p.evaluate(async ({ cap, trigLog, conf, shines, bars }) => { const T = window.__tot, t0 = performance.now() + 5000, off = t0 - trigLog;
      const r = await T.chgReplay(cap, { maxAlts: 0, fbp1: true, t0, menuRel: bars[0][0] - trigLog });
      return JSON.parse(T.v111.ev(`(() => { const off = ${off}; for (const s of ${JSON.stringify(shines)}) fbp1Tap(s + off); for (const [a, z] of ${JSON.stringify(bars)}) FBP1V.vis.push([a + off, z + off]);
        fbp1Input(${conf} + off); const T = window.__tot; T.setStep(T.RT().findIndex(s => s.fbp1pb)); FBP1.lockT = null; fbp1Plan(fbp1Pic(104000 + off));
        const e = T.SLOG.filter(x => x.ev === 'fbP1NoPlan').pop(); return JSON.stringify({ lock: ${JSON.stringify(r.state)}, seed: ${JSON.stringify(r.best && r.best.seed)}, why: e && e.why, doubt: e && e.doubt, msg: st.msg }); })()`)); },
      { cap: Object.assign({}, C, { prof: 'fbp1' }), trigLog, conf, shines, bars });
    console.log('     ' + JSON.stringify(r2));
    ok(r2.lock === 'locked' && r2.seed === '95ae4254' && r2.why === 'coin', '(2) the 20:54 Phase 1 read locks as live (95ae4254), and its no-plan is logged: ' + r2.why + ' (doubt ' + r2.doubt + ')');
    await p.close(); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
