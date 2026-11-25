/* v112 (charge_live/README.md v112): the runner's console logs of Nov 15 on v109 / v111 (fixtures/console_1115_v112.json, numbers only).
 *  1. Partnerless Jr. T6: Whacka without Jr. Troopa's +190 hit (emulator: jr_pl_routelog.py / jr_pl_check.js): x1420 / x1027 / x1428
 *     carry through T6 (no zwInconsistent) and T7 plans; at x1420's press the states give 5+ (the clip: 5 bounces).
 *  2. Duplighosts: the all-4 frame is beeped when its realistic 3+ chance is >= 0.90 (d1416's states); a press on another all-4 run
 *     says "hit the 4" and stays out of the lever's learned correction.
 *  3. One Final Bowser route menu following the Boots selector (saved key fbnbroute kept).
 *  4. The plan's per-frame chance reaches the strip; the lock badge shows the plan's chance.
 *  5. A Jr. Charge relock re-scores a plan a late "Seed changed" had frozen (x1434 / x1439 / x1441 / x1425); the press verdict on a
 *     coin-flip plan and after a hit; a lock landing after the rearm confirm arms the reader (x1425 / x1436); the capture-drop line.
 * usage: node test_v112.js [PAGE=...] */
const fs = require('fs'), path = require('path');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v114/timeout_timer_standalone.html';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_1115_v112.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const open = async (set) => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(s => { try { localStorage.clear(); localStorage.setItem('tot-jrpl', '1'); if (s) localStorage.setItem('tot-settings', JSON.stringify(s)); } catch (e) {} window.__now = 1000; performance.now = () => window.__now; }, set || null);
    await p.goto('file://' + PAGE); return p; };
  const replay = async (name, extra) => {
    const L = Object.assign({}, FIX[name], extra && extra.at ? { at: extra.at } : {}), p = await open(L.settings); extra = extra && extra.t ? extra.t : extra;
    const r = await p.evaluate(([L, extra]) => {
      const T = window.__tot, E = c => T.v111.ev(c), ev = L.events.slice(), res = { plans: [], errs: [] };
      for (const t of L.drops || []) ev.push({ t: t - 1200, ev: '_tens', fall: t }); for (const t of extra || []) ev.push({ t, ev: '_plan' }); ev.sort((a, b) => a.t - b.t);
      const seq = L.settings.jrroute === 'pl' ? 'ultrapl' : 'ultra', i1 = T.RT().findIndex(s => (s.seq || 'ultra') === seq && s.jr === 1), fight = ev.find(e => e.ev === 'jrFight');
      window.__now = fight.t - 2000; T.setStep(i1); const n0 = T.SLOG.length; let started = false;
      for (const e of ev) {
        if (e.t < fight.t - 3000) continue; window.__now = e.t;
        try {
          if (e.ev === 'chargeLock' && !started) { started = true; T.jrTrackerAt(parseInt(e.seed, 16), e.qs, fight.at, 0); for (const x of ev.filter(x => (x.ev === 'jrStrategiesClosed' || x.ev === 'jrHpDrop') && x.t < e.t && x.t > fight.t)) E(x.ev === 'jrHpDrop' ? `JRT.stratAt = ${x.confirmAt}; jrConfirm(${x.k}, ${x.confirmAt}, R.PROFILES.jrcc_nothing.vanish, 'hpdrop', JR_HPDROP_SHIFTS)` : `jrScreenClosed(${x.at})`); }
          else if (e.ev === 'chargeLock') { const tg = ev.filter(x => x.ev === 'chargeTrigger' && x.t < e.t).pop(), kb = ev.filter(x => x.ev === 'jrChargeBurst' && x.t < e.t).pop();
            E(`{ const tr = { t: ${tg.t - 11} }; Object.assign(CHG, { prof: CHG_PROF.jr, trig: tr, taps: [], pres: [], state: 'locked', qs: ${JSON.stringify(e.qs)} }); JRT.trigSeen = tr; JRT.chargeK = ${kb ? kb.k : 'JRT.chargeK'}; jrLock(${parseInt(e.seed, 16)}, ${JSON.stringify(e.qs)}); }`); }
          else if (!started) continue;
          else if (e.ev === 'shine') E(`addShine(${e.at}, true)`);
          else if (e.ev === 'jrHpDrop') E(`JRT.stratAt = ${e.confirmAt}; jrConfirm(${e.k}, ${e.confirmAt}, R.PROFILES.jrcc_nothing.vanish, 'hpdrop', JR_HPDROP_SHIFTS)`);
          else if (e.ev === 'coinBack') E(`coinBack(${e.hiddenMs})`);
          else if (e.ev === 'jrStrategiesClosed') E(`jrScreenClosed(${e.at})`);
          else if (e.ev === 'jrHide') E(`jrHide(${e.at}, ${e.upMs})`);
          else if (e.ev === 'jrOutcome' && !e.dodge) E(`JRT.ccPend = null; jrDeath(${e.k}, ${e.frames})`);
          else if (e.ev === '_tens') { window.__jrTensTest = () => (window.__now < e.fall ? 0.47 : 0); for (let t = e.t; t < e.fall + 600; t += 16.7) { window.__now = t; E(`jrFrame(${t}, true)`); } window.__jrTensTest = null; }
          else if (e.ev === '_plan') { const P = E(`st.plan = null; st.planTry = 0; st.dupMsgT = 0; makePlan(); st.plan`); let mk = null; try { mk = E('drawStrip(); V.stripMarker'); } catch (x) { mk = String(x); } res.plans.push({ t: e.t, step: T.RT()[T.step()].jr, prof: P && P.prof, p: P && P.mix && P.mix.p, win: P && P.mix && P.mix.win, mk, text: document.getElementById('strip-state').textContent, msg: P ? null : E('st.msg'), chance: E('st.plan && st.plan.chance ? st.plan.chance.length : 0'), badge: E('lockBadgeShow().why'), at: L.at ? E(`(() => { const L0 = zwStates(performance.now()).list; return { s5: zwShare(L0, ${L.at}, ${L.at}, R.PROFILES.jrpb5)[0], s6: zwShare(L0, ${L.at}, ${L.at}, R.PROFILES.jrpb6)[0] }; })()`) : null }); }
        } catch (er) { res.errs.push(e.ev + ': ' + er); }
      }
      res.log = T.SLOG.slice(n0).filter(x => /^(jrInput|jrRevive|zwInconsistent|jrCarryEnds|jrHpDrop|jrStepGap|jrLateRearm)/.test(x.ev)).map(x => Object.assign({}, x));
      res.chgState = E('CHG.state');
      return res;
    }, [L, extra]);
    await p.close(); return r;
  };
  // 1. the partnerless T6 / T7
  for (const [name, tPlan, at] of [['x1420', 397000, 817], ['x1027', 2638318, null], ['x1428', 843713, null]]) {
    const r = await replay(name, { t: [tPlan], at }), inc = r.log.filter(x => x.ev === 'zwInconsistent'), ids = r.log.filter(x => x.ev === 'jrInput' && x.k === 10).map(x => x.id), P = r.plans[0];
    console.log(name, JSON.stringify(inc), JSON.stringify(ids), JSON.stringify(P).slice(0, 400), r.errs.slice(0, 2));
    ok(!inc.length && ids[0] === 'nb_whacka', '1. ' + name + ': T6 Whacka carried without the Bombette route\'s +190 hit, no zwInconsistent (v111: at 776 / 1891 on x1420 / x1027)');
    ok(P && P.prof === 'jrpb5p' && P.step === 12 && P.p > 0.7, '1. ' + name + ': T7 plans (v117: the partnerless table jrpb5p; ' + (P && P.p != null ? P.p.toFixed(2) : P && P.msg) + ', window ' + (P && P.win) + ')');
    if (at != null) ok(P && P.at && P.at.s5 >= 0.9 && P.at.s6 < 0.5, '1. x1420: at the runner\'s press (c ' + at + ') the states give 5 bounces, not 6 (5+ ' + (P && P.at && P.at.s5.toFixed(2)) + ', 6+ ' + (P && P.at && P.at.s6.toFixed(2)) + '; the clip: 5 bounces)');
    ok(P && P.chance > 0 && /^plan \d+%$/.test(P.badge), '4. ' + name + ': the plan carries each cell\'s chance for the strip, the badge shows the plan\'s (' + (P && P.badge) + ')');
    ok(!r.errs.length, '1. ' + name + ': no replay errors ' + r.errs.slice(0, 1).join(''));
  }
  // 5. x1425: the T1 lock after T1's Do Nothing arms the reader for T2's Charge
  { const p = await open({ jrroute: 'pl', boots: 'ultra', duproute: 'charge' });
    const r = await p.evaluate(() => { const T = window.__tot, E = c => T.v111.ev(c), i1 = T.RT().findIndex(s => s.seq === 'ultrapl' && s.jr === 1); T.setStep(i1);
      T.jrTrackerAt(0x72d9a7e1, [27, 28], performance.now() - 5000, 0); T.jrScreenAt(200, 3);
      E(`Object.assign(CHG, { prof: CHG_PROF.jr, state: 'locked' }); JRT.lockK = 0;`); const before = E('CHG.state'); E('jrLateRearm()');
      const out = { before, after: E('CHG.state'), log: T.SLOG.filter(x => x.ev === 'jrLateRearm').length, k: T.JRT.k };
      // 5. the relock: a plan frozen by a late "Seed changed" is scored again
      E(`st.plan = { tMade: performance.now() - 500, mix: { zw: true, p: 0.55, pp: 0.79, win: 1 }, zwAbs: 415, target: 415, w: { start: 415, end: 415, length: 1 }, seedNote: true, tPress: performance.now() + 2500, early: true };`); out.plan = true;
      E('Object.assign(CHG, { prof: CHG_PROF.jr, trig: { t: performance.now() - 2500 }, taps: [], pres: [] }); jrStartFrom(2, 0x0e7bd3af, [2], null)'); out.note = E('st.plan ? st.plan.seedNote : null'); out.relock = E('!!(st.plan && st.plan.relock)');
      // the press verdicts
      E(`st.plan = null; st.lastPress = { err: 0.02, works: true, inWin: true, p: 0.53, k: 3, target: 196 }; showPresses();`); out.t1 = document.getElementById('press-msg').textContent;
      E('jrPressOutcome(3, false)'); out.t2 = document.getElementById('press-msg').textContent;
      E(`st.lastPress = { err: 0.1, works: true, inWin: true, p: 0.92, k: 5, target: 200 }; showPresses();`); out.t3 = document.getElementById('press-msg').textContent;
      E(`CHG.dropWarn = { t: performance.now(), share: 0.44 }; setText('x', 'y');`); out.drop = document.getElementById('detail').textContent;
      return out; });
    console.log(JSON.stringify(r).slice(0, 900));
    ok(r.before === 'locked' && r.after !== 'locked' && r.log === 1, '5. x1425: a T1 lock landing after T1\'s Do Nothing (the rearm confirm) arms the reader for the T2 Charge (' + r.before + ' -> ' + r.after + ')');
    ok(r.plan && r.note === false && r.relock, '5. a Charge relock clears the frozen "Seed changed" mark so the plan is scored again (seedNote ' + r.note + ')');
    ok(/on time ✓/.test(r.t1) && !/dodge \d+% · hit|Chance|You hit/.test(r.t1) && !/coin flip|\?|Expected|Frame/.test(r.t1), '5. d1423 (v120 table; v128: the odds are the % box\'s, not a row here): a working frame on a 53% plan: green ✓, no odds row, no "?" / Expected / Frame (' + r.t1.slice(0, 90) + ')');
    ok(/Result ?hit \(the 47%\)/.test(r.t2), '5. after the hit (v113 table): a Result row "hit (the 47%)" (' + r.t2.slice(0, 90) + ')');
    ok(/✓/.test(r.t3) && !/coin flip|\?/.test(r.t3), '5. a 92% plan keeps its ✓ (' + r.t3.slice(0, 70) + ')');
    ok(/^Capture dropping 44% of frames: check OBS\. y/.test(r.drop), '6. the capture-drop line comes first (' + r.drop.slice(0, 60) + ')');
    await p.close(); }
  // 2. Duplighosts
  { const p = await open({ duproute: 'charge', dupgoal: 'run2', boots: 'ultra' });
    const r = await p.evaluate(() => { const T = window.__tot, E = c => T.v111.ev(c); T.setStep(0); T.dupTrackerAt(0xd34bb989, [4], performance.now() - 3000);
      const sd = 0.95, PD = []; let s = 0; for (let d = -4; d <= 4; d++) { const w = Math.exp(-d * d / (2 * sd * sd)); PD.push([d, w]); s += w; } PD.forEach(x => x[1] /= s);
      const pl = T.dupPlanAt(150, 1.5, 1, 'run2', PD), out = { target: pl.target, p3: pl.p3, p4: pl.p4, w4: pl.w4 };
      // synthetic: 3+ everywhere 200-210 (0.97), the 4 on 202 (3+ 0.92 there) and 206: the 4 frame with the likelier 4 wins; then 3+ 0.85 at the 4: the safe 3+ frame
      const mk = (s3, s4) => { const a = 195, sh = new Float64Array(30), sh4 = new Float64Array(30); for (const [c, v] of s3) sh[c - a] = v; for (const [c, v] of s4) sh4[c - a] = v; return { a, sh, sh4 }; };
      out.zwc = E(`(() => { const run = (s3, s4) => { const a = 195, b = 224, share = new Float64Array(30), share4 = new Float64Array(30); for (const [c, v] of s3) share[c - a] = v; for (const [c, v] of s4) share4[c - a] = v;
        const sc = c => 0.25 * (share[c - 1 - a] || 0) + 0.5 * (share[c - a] || 0) + 0.25 * (share[c + 1 - a] || 0), sc4 = c => 0.25 * (share4[c - 1 - a] || 0) + 0.5 * (share4[c - a] || 0) + 0.25 * (share4[c + 1 - a] || 0);
        let c4 = null; for (let c = 199; c <= 215; c++) if (share4[c - a] >= 0.5 && sc(c) >= DUP4_AIM && (c4 == null || sc4(c) > sc4(c4))) c4 = c; return c4; };
        const A = [], B = []; for (let c = 200; c <= 210; c++) A.push([c, 1]); return { pick: run(A, [[202, 0.6], [206, 0.8]]), none: run([[201, 0.5], [202, 1], [203, 0.5]], [[202, 0.8]]) }; })()`);
      // the press on another all-4 run (d1416: the 4 on 202, beeps on the 4 on 204)
      const tab = new Array(40).fill(false), tab4 = new Array(40).fill(false); for (let c = 203; c <= 206; c++) tab[c - 180] = true; tab4[202 - 180] = tab4[204 - 180] = true; tab[202 - 180] = true;
      E(`st.plan = { tMade: 0, w: { start: 203, end: 206, length: 4 }, target: 204, tPress: 1e12, tLast: 0, rate: 33.4, seedBL: 0xd34bb989, baseF: 0, first: 180, tab: ${JSON.stringify(tab)}, tab4: ${JSON.stringify(tab4)}, prof: 'dup3', mix: { p: 0.96, p4: 0.46, win: 4, win4: 1, zw: true }, bias: 0 };`);
      const n0 = E("leverList('dup').length"), c = 202.42, tObs = (c + E('VANISH_()') + E("num('pfix')")) * 33.4 + E("num('vlag')");
      E(`measurePress(${tObs})`); out.m = E('JSON.parse(JSON.stringify(st.plan.measured))'); out.n1 = E("leverList('dup').length") - n0; out.txt = document.getElementById('press-msg').textContent;
      E(`st.plan.measured = null; measurePress(${(204.1 + E('VANISH_()') + E("num('pfix')")) * 33.4 + E("num('vlag')")})`); out.m2 = E('JSON.parse(JSON.stringify(st.plan.measured))'); out.n2 = E("leverList('dup').length") - n0;
      return out; });
    console.log(JSON.stringify(r).slice(0, 900));
    ok(r.target === 204 && r.w4 && r.w4.start === 204 && r.p3 > 0.9, '2. d1416\'s states: the beep on the all-4 frame 204 (3+ ' + (r.p3 && r.p3.toFixed(2)) + ', 4 ' + (r.p4 && r.p4.toFixed(2)) + '); the 4 on 202 has 3+ under 0.90');
    ok(r.zwc.pick === 206 && r.zwc.none === null, '2. the all-4 frame with 3+ >= 0.90 and the likelier 4 is the pick (' + r.zwc.pick + '); none when 3+ there is under 0.90');
    ok((r.m.hit4 || r.m.on4) && r.m.off4 && !r.m.onBeeps && r.n1 === 0 && /(hit|on) the 4.*not the beeped frame/.test(r.txt) && !/outside the window|early/.test(r.txt), '2. d1416: the press on the 4 at 202 says "on the 4" (202.42, the edge to 203) and stays out of the lever correction (' + r.txt.slice(0, 80) + ')');
    ok(r.m2.hit4 && !r.m2.off4 && r.m2.onBeeps && r.n2 === 1, '2. a press on the beeped all-4 frame is an ordinary press on the beeps');
    await p.close(); }
  // 3. the Final Bowser route menu
  { const p = await open({ boots: 'ultra', fbnbroute: 'goomba' });
    const r = await p.evaluate(() => { const o = () => [...document.querySelectorAll('#s-fbroute option')].map(x => x.textContent), out = { ultra: o(), lbl: document.getElementById('s-fbroute').parentElement.firstChild.textContent };
      const bs = document.getElementById('s-boots'); bs.value = 'normal'; bs.dispatchEvent(new Event('change')); out.normal = o(); out.val = document.getElementById('s-fbroute').value;
      const m = document.getElementById('s-fbroute'); m.value = 'cap'; m.dispatchEvent(new Event('change')); out.saved = JSON.parse(localStorage.getItem('tot-settings')).fbnbroute; out.nb = window.__tot.v110.fbnbRoute();
      bs.value = 'ultra'; bs.dispatchEvent(new Event('change')); out.back = o(); return out; });
    console.log(JSON.stringify(r));
    ok(r.lbl === 'Final Bowser route' && JSON.stringify(r.ultra) === '["Ultra Boots Laki"]' && JSON.stringify(r.back) === '["Ultra Boots Laki"]', '3. Ultra Boots: one route, "Ultra Boots Laki"');
    ok(JSON.stringify(r.normal) === JSON.stringify(['Normal Boots Power Bounce cap', 'Normal Boots Goombario (untested)']) && r.val === 'goomba' && r.saved === 'cap' && r.nb === 'cap', '3. Normal Boots: its two routes, the saved fbnbroute shown and kept (' + r.val + ' -> ' + r.saved + ')');
    await p.close(); }
  { const p = await open(); ok(await p.evaluate(() => window.__tot.VERSION) === 'v151', '0. page version v112'); await p.close(); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
