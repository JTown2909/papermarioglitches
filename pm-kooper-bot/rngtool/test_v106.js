/* v106 (README v106): the console logs of Nov 14 (logs1114).
 * 1. Final Bowser T2 (fb1010, 937-943 s): a carried Charge lock that agrees, then a coin that disagrees (doubt 0.82): the plan
 *    is made with the doubt in its claim and a warning (fb14CoinWarn), never silently nothing; a fresh lock keeps "No edge".
 *    Replayed through the page from the log's Charge captures, shines and inputs (when the logs are here), and synthetic.
 * 2. Beeps: a series plays whole or not at all (playBeeps), a begun one is never cut by cancelBeeps / replaced, stopBeeps cuts it
 *    with a visible STOP only with 0.4 s or more left, else keeps it and says after the press that the coin turned late.
 * 3. fb14Anchor picks by the realistic chance (press spread, broad), nearness only within FB14_ANCHOR_RTOL; ppPick: a later
 *    narrower frame or a patchy pick needs PP_SC_GAIN with the spread.
 * 4. The Jr. re-lock replan rule (zwRelockReplan wired in zwTick / jrStartFrom).
 * 5. Jr. Power Bounce (goal free): the widest 6+ run up to zwlater, aimed at its middle; the 5+ middle without one.
 * 6. The capture-drop warning (fb1001's T1 Charge: 64% of the pictures dropped).
 * 7. The log's file name in local time. 8. "Reset seed" and "Erase log".
 * usage: node test_v106.js [PAGE=...] [LOGS=/tmp/claude-0/pm/logs1114] */
const fs = require('fs'), path = require('path');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v106/timeout_timer_standalone.html', LOGS = process.env.LOGS || '/tmp/claude-0/pm/logs1114';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  if (!fs.existsSync(PAGE)) { console.log('(skipped: no page at ' + PAGE + ')'); console.log('all ok'); return; }
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const open = async (init) => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e))); await p.addInitScript(init || (() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', off: '-5', vlag: '50', fbc9: 'skip' })); } catch (e) {} })); await p.goto('file://' + PAGE); return p; };
  let p = await open();
  ok(await p.evaluate(() => window.__tot.VERSION) === 'v106', 'page version v106');

  // ---- 2. beeps
  const bp = await p.evaluate(async () => {
    const V = window.__tot.v106, sl = () => window.__fb14.slogTail(40), out = {}, w = ms => new Promise(r => setTimeout(r, ms)), now = () => performance.now();
    out.noFit = V.playBeeps(now() + 600, 3, 500);                         // first beep 400 ms ago: not played
    out.noFitLog = sl().some(e => e.ev === 'beepsNoFit');
    out.inFlight0 = !!V.inFlight();
    out.played = V.playBeeps(now() + 1100, 3, 500); await w(200);          // first beep at +100: sounded now
    out.inFlight = V.inFlight(); out.cancel = V.cancelBeeps({ why: 'test' }); out.keptLog = sl().some(e => e.ev === 'beepsKept');
    out.replace = V.playBeeps(now() + 1500, 3, 500);                      // overlapping new series: refused
    const st = V.st(); st.plan = { tPress: now() + 900, mix: { pp: 0.8 } }; out.hold = V.seriesHold('test');
    out.stop = V.stopBeeps('test', 0.2, st.plan); out.stopMsg = st.msg; out.afterStop = !!V.inFlight();
    // a series within its last 0.4 s: kept, said after the press
    st.plan = null; st.msg = null; const t2 = now() + 1050; V.playBeeps(t2, 3, 500); await w(t2 - now() - 300);
    out.late = V.stopBeeps('test', 0.31, { mix: { pp: 0.78 } }); out.lateFlight = !!V.inFlight(); out.lateMsg0 = st.msg;
    await w(t2 - now() + 300); if (st.lateTurn) V.lateTurnTick(now()); out.lateMsg = st.msg; out.lateLog = sl().filter(e => /beepsLateTurn|lateTurnShown/.test(e.ev)).map(e => e.ev);
    out.before = V.stopBeeps('test', 0.1, null);                          // nothing begun: a plain cancel
    st.plan = null; return out; });
  ok(bp.noFit === false && bp.noFitLog && !bp.inFlight0, '2. a series whose first beep is already past is not played (logged beepsNoFit): never 2 beeps of 3');
  ok(bp.played === true && bp.inFlight && bp.inFlight.left === 2 && bp.cancel === false && bp.keptLog, '2. a begun series (2 beeps left) survives cancelBeeps (logged beepsKept)');
  ok(bp.replace === false && bp.hold === true, '2. a new series overlapping a begun one is refused, and a plan holds (no replan) while its series plays');
  ok(bp.stop === 'stop' && /^STOP/.test(bp.stopMsg) && !bp.afterStop, '2. a frame turned bad with >= 0.4 s left: the series is cut with a visible STOP ("' + (bp.stopMsg || '').slice(0, 60) + '…")');
  ok(bp.late === 'kept' && bp.lateFlight && !bp.lateMsg0 && /coin turned late/.test(bp.lateMsg || '') && /31%/.test(bp.lateMsg) && bp.lateLog.join() === 'beepsLateTurn,lateTurnShown', '2. inside the last 0.4 s it plays out; after the press: "' + (bp.lateMsg || '').slice(0, 70) + '…"');
  ok(bp.before === 'cancelled', '2. before the first beep a stop is a plain cancel (the caller may replan)');
  // fb1006 T3's two beeps: the first was past when scheduled; the plan now takes its frames from now + FB14_PLAN_MS
  const src14 = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8'), tpl = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8');
  ok(/earliestPress\(now \+ FB14_PLAN_MS\)/.test(src14) && /stopBeeps\('fb14', p, P\)/.test(src14) && /fb14ReplanHeld/.test(src14) && /seriesHold\('fb2'\)/.test(fs.readFileSync(path.join(__dirname, 'charge_live', 'fb2_live.js'), 'utf8')) && /stopBeeps\('zw ' \+ why/.test(tpl), '2. every lever goes through it: zwTick, fb14Tick / fb14Plan, fb2 (seriesHold), the T6 series via playBeeps');

  // ---- 3. replans by realistic chance
  const an = await p.evaluate(() => { const X = window.__fb14; X.reset(); const out = {};
    const mk = fn => { const share = []; for (let c = 195; c <= 240; c++) share.push(fn(c)); return { target: null, w: null, none: null, a: 195, share, doubt: 0.02, pp: null }; };
    const sh = c => (c >= 205 && c <= 209) ? 0.9 : c === 215 ? 0.95 : 0.3, PD = [[-2, 0.1], [-1, 0.2], [0, 0.4], [1, 0.2], [2, 0.1]];
    let C = mk(c => c === 214 ? 0.8 : 0.3); C.target = 214; C.pp = 0.8; X.anchor(C, 198, 30, 2, PD); out.a0 = X.FB14.anchor[2];
    C = mk(sh); C.target = 215; C.pp = 0.98 * 0.95 + 0.02 * 0.495; X.anchor(C, 198, 30, 2, PD); out.r1 = { target: C.target, w: C.w, p: +C.p.toFixed(3), pp: +C.pp.toFixed(3) };
    // equal realistic chance: the frame nearest the anchor
    C = mk(c => (c >= 205 && c <= 209) || (c >= 220 && c <= 224) ? 0.9 : 0.3); C.target = 222; C.pp = 0.98 * 0.9 + 0.01; X.anchor(C, 198, 30, 2, PD); out.r2 = C.target;
    out.log = X.slogTail(6).filter(e => e.ev === 'fb14ReplanNear').map(e => [e.target, e.real, e.bestReal]);
    return out; });
  ok(an.a0 === 214 && an.r1.target === 207 && an.r1.w.length === 5, '3. fb1006 T2 shape: anchor 214; the best perfect-press frame 215 is a 1-frame window, the 5-frame window 205-209 wins on the press spread (' + JSON.stringify(an.log[0]) + '): 207, not the nearest 215');
  ok(an.r2 === 207, '3. two windows with the same realistic chance: the one nearer the anchor (207 of 207 / 222)');
  const pk = await p.evaluate(() => { const T = window.__tot, PD = [[-2, 0.1], [-1, 0.2], [0, 0.4], [1, 0.2], [2, 0.1]];
    const mkSc = (sh, a) => c => { let v = 0; for (const [d, q] of PD) v += q * (sh[c + d - a] || 0); return v; };
    // a 2-frame run in reach, later a 1-frame peak between gaps: the later narrow frame needs PP_SC_GAIN
    const a = 90, sh = []; for (let c = a; c <= 160; c++) sh.push(c >= 100 && c <= 101 ? 0.92 : c === 135 ? 0.95 : (c === 134 || c === 136) ? 0.75 : 0.2);
    const r1 = T.ppPick(sh, null, a, 160, 95, 30, mkSc(sh, a), 'safe3', 15);
    // the widest run vs a slightly narrower clean one: unchanged (W3 first) unless the spread gain is PP_SC_GAIN
    const sh2 = []; for (let c = a; c <= 160; c++) sh2.push(c >= 100 && c <= 103 ? 0.9 : c >= 110 && c <= 112 ? 0.9 : 0.2);
    const r2 = T.ppPick(sh2, null, a, 160, 95, 30, mkSc(sh2, a), 'safe3', 0);
    return { r1: [r1.target, r1.run.length, !!r1.later], r2: [r2.target, r2.run.length] }; });
  ok(pk.r1[0] === 100 || pk.r1[0] === 101, '3. ppPick: a later 1-frame peak among gaps does not replace a 2-frame run for a small spread gain (picked ' + JSON.stringify(pk.r1) + ')');
  ok(pk.r2[1] === 4, '3. ppPick: the widest run still first when the spread does not say otherwise (' + JSON.stringify(pk.r2) + ')');

  // ---- 4. Jr. re-lock
  const jrSrc = fs.readFileSync(path.join(__dirname, 'charge_live', 'jr_live.js'), 'utf8');
  ok(/P\.relock = true/.test(jrSrc) && /zwRelockReplan\(P, ch\)/.test(tpl) && /pNew >= pOld \+ ZW_RELOCK_GAIN/.test(tpl) && (await p.evaluate(() => window.__tot.v106.relockGain)) === 0.1, '4. after a Jr. re-lock (jrStartFrom marks the plan) zwTick plans again while every beep is ahead; the new plan stands at +0.10 with the press spread, else the old one and its beeps come back');

  // ---- 5. Power Bounce 6 run
  const pb = await p.evaluate(() => { const T = window.__tot.v106, a = 90, b = 170, sh5 = [], sh6 = [], sc = c => sh5[c - a] || 0;
    for (let c = a; c <= b; c++) { sh5.push(c >= 100 && c <= 110 ? 0.95 : c >= 125 && c <= 136 ? 0.95 : 0.2); sh6.push(c >= 127 && c <= 134 ? 0.9 : 0.05); }
    const r = window.__tot.ppPick(sh5, sh6, a, b, 100, 15, sc, 'free', 30);
    const sh6b = sh6.map(() => 0.05), r2 = window.__tot.ppPick(sh5, sh6b, a, b, 100, 15, sc, 'free', 30);
    return { r: [r.target, r.run4 && r.run4.length, !!r.later], r2: [r2.target, r2.run.length] }; });
  ok(pb.r[0] === 130 || pb.r[0] === 131, '5. fb0748 shape: 5+ for 11 frames now (no 6), an 8-frame 6+ run 1 s later: aimed at the 6 run\'s middle (' + JSON.stringify(pb.r) + ')');
  ok(pb.r2[0] === 105, '5. no 6+ run in reach: the 5+ run\'s middle as before (' + JSON.stringify(pb.r2) + ')');

  // ---- 7 / 8. file name, buttons
  const ui = await p.evaluate(() => { const T = window.__tot, V = T.v106, d = new Date(2026, 10, 14, 10, 10, 55);
    const bs = [...document.querySelectorAll('#status-btns button')].map(x => x.id + ':' + x.textContent);
    try { localStorage.setItem('tot-fb14press-v93', JSON.stringify([1, 2])); } catch (e) {}
    const set0 = localStorage.getItem('tot-settings');
    V.SLOG.push({ t: 1, ev: 'x' }); T.CHG_CAPS.push({ id: 'a' }); const n0 = V.SLOG.length;
    window.confirm = () => true; document.getElementById('erase-log').click();
    const after = { slog: V.SLOG.map(e => e.ev), caps: T.CHG_CAPS.length, lever: localStorage.getItem('tot-fb14press-v93'), settings: localStorage.getItem('tot-settings') === set0 };
    window.confirm = () => false; V.SLOG.push({ t: 2, ev: 'y' }); const e = document.getElementById('erase-log'); e.click(); const armed = e.textContent; e.click();
    return { name: V.logFileName(d), bs, n0, after, armed, second: V.SLOG.map(e => e.ev) }; });
  ok(ui.name === 'pm-rng-log-2026-11-14_10-10-55.json', '7. the saved log is named in local time like the OBS clips: ' + ui.name);
  ok(ui.bs.join() === 'dl-log:Download session log,reset:Reset seed,erase-log:Erase log', '8. buttons: ' + ui.bs.join(' | '));
  ok(ui.after.slog.join() === 'logErased' && ui.after.caps === 0 && ui.after.lever === '[1,2]' && ui.after.settings, '8. Erase log (confirmed): the log and the kept Charge reads go (left: ' + ui.after.slog.join() + '), settings and press corrections stay');
  ok(ui.armed === 'Click again to erase' && ui.second.join() === 'logErased', '8. where confirm() returns at once (a sandboxed frame), a second click erases');
  await p.close();

  // ---- 1 / 6. the console logs
  const L1010 = path.join(LOGS, 'fb1010', 'log.json'), L1001 = path.join(LOGS, 'fb1001', 'log.json');
  if (!fs.existsSync(L1010)) console.log('(1 / 6 skipped: no logs at ' + LOGS + ')');
  else {
    const Lg = JSON.parse(fs.readFileSync(L1010, 'utf8')), E = Lg.events, caps = (Lg.chargeCaptures || []).filter(c => c.prof === 'fb1'), TA = 915000, TB = 943000, PT = 938418;
    const steps = [];
    for (const l of E.filter(e => e.ev === 'fb14Lock' && e.t > TA && e.t < TB)) { const tr = E.filter(e => e.ev === 'chargeTrigger' && e.t < l.t).pop(), hide = E.filter(e => e.ev === 'barHide' && e.at < tr.t).pop(), wl = Date.parse(Lg.saved) - (E[E.length - 1].t - tr.t);
      const cap = caps.filter(c => c.stepT === 'Final Bowser T' + l.turn).sort((x, y) => Math.abs(Date.parse(x.wall) - wl) - Math.abs(Date.parse(y.wall) - wl))[0]; steps.push({ k: 'lock', t: tr.t, turn: l.turn, M: l.M, cap, t0: hide.at - cap.hideMs }); }
    for (const e of E) if (e.ev === 'fb14Input' && e.t > TA && e.t < TB) steps.push({ k: 'input', t: e.t, kind: e.kind, F: e.F });
    steps.sort((x, y) => x.t - y.t);
    const taps = E.filter(e => e.ev === 'shine' && e.at < PT).map(e => e.at), vis = E.filter(e => e.ev === 'barHide' && e.at < PT).map(e => [e.at - e.upMs, e.at]);
    p = await open();
    const r = await p.evaluate(async ({ steps, taps, vis, PT }) => {
      const T = window.__tot, X = window.__fb14, FB = X.FB14, SH = { chg: X.FB14_CHGD, cn: [[-3, 0.03], [-2, 0.07], [-1, 0.18], [0, 0.44], [1, 0.18], [2, 0.07], [3, 0.03]] }, out = {};
      X.reset(); T.setStep(T.RT().findIndex(s => s.fb14 === 1 && s.fb14role === 'lever')); const adv = h => FB.states.forEach(S => X.fbRun(S, h - S.l));
      for (const s of steps) {
        if (s.k === 'lock') { T.setStep(T.RT().findIndex(x => x.fb14 === s.turn && x.fb14role === 'lever')); if (s.turn > 1 && FB.on) { adv(s.M + 11); X.input('chg', s.M, s.turn, SH.chg); }
          await T.chgReplay(s.cap, Object.assign({ fb14: true, t0: s.t0 }, s.turn === 1 ? { stream: '6ba35b1e', streamHi: 27431 } : {})); FB.taps = taps.slice(); FB.vis = vis.slice(); FB.visFrom = null; FB.pendChg = null; out['lock' + s.turn] = { how: FB.how, M: FB.M[s.turn], states: FB.states.length }; }
        else if (s.kind !== 'chg' && FB.on) { adv(s.F - 3); X.input(s.kind, s.F, 1, SH[s.kind] || X.SHIFTS_S); } }
      T.setStep(T.RT().findIndex(x => x.fb14 === 2 && x.fb14role === 'lever'));
      const h = Math.floor(X.pic(PT - 50) - 10); adv(h); const W = X.weigh(h); out.real = { doubt: +W.doubt.toFixed(4), kept: W.kept, n: W.n };
      out.plan0 = X.plan(h);
      // the live doubt (0.82, not reproduced from the kept pictures): the same states, the coin's doubt forced
      window.__fb14WeighTest = hh => { const w = X.weigh(hh); return Object.assign({}, w, { doubt: 0.82 }); };
      out.planWarn = X.plan(h); FB.how = 'fresh'; X.plan(h); out.planFresh = FB.plan; FB.how = 'carried'; delete window.__fb14WeighTest;
      return out; }, { steps, taps, vis, PT });
    console.log('   fb1010 T2 replay: ' + JSON.stringify(r).slice(0, 600));
    ok(r.lock2 && r.lock2.how === 'carried' && r.lock2.M === 578, '1. fb1010 T2 replayed: the T2 Charge locks carried on M 578 as live (' + JSON.stringify(r.lock2) + ')');
    ok(r.real.doubt < 0.05 && r.real.kept > 0, '1. on the kept pictures the carried states explain both shines (F107, F513) and the empty menu: doubt ' + r.real.doubt + ' (' + r.real.kept + ' kept of ' + r.real.n + '): the coin read was not wrong; the live set (another T1 fit list) lacked those states');
    const pw = r.planWarn || {};
    ok(pw.coinWarn === true && pw.target != null && pw.pp <= 0.18 * 1 + 0.82 * 0.495 + 1e-6 && pw.pp >= 0.495 + 0.03, '1. with the live doubt 0.82 the carried lock still plans, honestly (claim ' + (pw.pp != null ? pw.pp.toFixed(3) : '-') + ' <= 0.18 + 0.82 x blind), with a warning (coinWarn)');
    ok(r.planFresh && r.planFresh.none === 'doubt', '1. a fresh lock at the same doubt stays "No edge" (' + JSON.stringify(r.planFresh) + ')');
    await p.close();
  }
  if (fs.existsSync(L1001)) {
    const Lg = JSON.parse(fs.readFileSync(L1001, 'utf8')), cap = (Lg.chargeCaptures || []).find(c => c.prof === 'fb1' && c.stepT === 'Final Bowser T1' && Math.abs(Date.parse(c.wall) - Date.parse(Lg.saved) + (Lg.events[Lg.events.length - 1].t - 380000)) < 20000) || (Lg.chargeCaptures || []).find(c => c.prof === 'fb1');
    p = await open();
    const d = await p.evaluate(async cap => { const T = window.__tot, V = T.v106; try { await T.chgReplay(cap, { fb14: true, maxAlts: 0 }); } catch (e) {} const C = V.CHG(); return { drops: C.info && C.info.drops, note: V.chgDropNote() }; }, cap);
    const share = (() => { const g = cap.info.gaps.split(',').map(Number); return g.filter(x => x >= 30).length / g.length; })();
    ok(share < 0.3 || (d.drops != null && Math.abs(d.drops - share) < 0.02 && /^Warning: the capture dropped \d+% of the pictures/.test(d.note) && /hardware encoder/.test(d.note)), '6. a Charge read with ' + Math.round(100 * share) + '% of its pictures dropped: "' + (d.note || '').slice(0, 90) + '…"');
    await p.close();
  }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
