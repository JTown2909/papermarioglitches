/* v109 (README v109): the console logs of Nov 15 (logs1115: jr0701, jr0706, fb0709, fb0713, fb0718, fb0722, fb0727).
 * 1. Jr. T4 (jr0701): a 1-frame frame among alternating 60 / 40 frames vs a solid run in reach, within PP_SOLID_TOL with the
 *    press spread: the solid run (ppPick's solid rule).
 * 2. Short Strategies boxes (jr0701 T5 at 10 HP, 133 ms; fb0722 T3 after a hit): 2 game frames count on those steps.
 * 3. jr0701 T5 replayed (the T5 lock, its shines): a step by hand past the unread Do Nothing marks the carry lost (no 98% plan
 *    from states without it); with the short close kept, the Do Nothing goes in at it, the plan is made, and the frame the
 *    runner pressed (3 bounces) is a 4-or-less frame for the states (live v108: 5+ there). A close on the Power Bounce step is
 *    never taken as the Do Nothing.
 * 4. jr0706 T5 death replayed: the carry goes on through the Life Shroom revive (933-939 steps x the coin phase) and the Power
 *    Bounce is planned (v108: no plan, no beeps).
 * 5. Final Bowser steps: a second close within FB_RECLOSE_MS of the close that moved the route is the same box (fb0718 T3 -> T4);
 *    a step back by hand plans that turn again; T3's step reads T4's Charge (fb0722); triggers under CHG_FB_BASEMIN are no
 *    Charge (fb0722 Peach Beam, base 29.6); a T6 close before FB2_PMIN - 20 without a lock is not the Do Nothing; a step back
 *    to T6 re-arms its reader.
 * 6. Final Bowser presses on the strip (pressShow), the T6 / T7 plans' frames (tab), the refine / stop rules (fb0709 T2, T4),
 *    the route's stars, Erase log at once, the buttons' feedback.
 * usage: node test_v109.js [PAGE=...] [LOGS=/tmp/claude-0/pm/logs1115] */
const fs = require('fs'), path = require('path');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v114/timeout_timer_standalone.html', LOGS = process.env.LOGS || '/tmp/claude-0/pm/logs1115';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const readLog = n => { const f = path.join(LOGS, n, 'log.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
(async () => {
  if (!fs.existsSync(PAGE)) { console.log('(skipped: no page at ' + PAGE + ')'); console.log('all ok'); return; }
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const open = async (set, presses) => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e))); await p.addInitScript(([s, pr]) => { try { localStorage.clear(); localStorage.setItem('tot-jrpl', '1'); localStorage.setItem('tot-settings', JSON.stringify(s)); if (pr) localStorage.setItem('tot-presses', JSON.stringify(pr)); } catch (e) {} }, [set || { prof: 'endgame', off: '-4.5', vlag: '50', jrroute: 'charge', duproute: 'charge' }, presses || null]); await p.goto('file://' + PAGE); return p; };
  const p = await open();
  ok(await p.evaluate(() => window.__tot.VERSION) === 'v124', 'page version v109');

  // ---- 1. the solid window (synthetic jr0701 T4 shape)
  const s1 = await p.evaluate(() => {
    const V = window.__tot.v109, PD = [[-4, 0.0028], [-3, 0.0218], [-2, 0.0945], [-1, 0.228], [0, 0.306], [1, 0.228], [2, 0.0945], [3, 0.0218], [4, 0.0028]];
    const a = 0, b = 90, sh = new Array(b - a + 1).fill(0); [[10, .6], [11, .4], [12, .6], [13, .4], [14, .6], [38, .4], [39, .6], [40, .6], [41, .6]].forEach(([f, v]) => { sh[f] = v; });
    const sc = c => PD.reduce((x, [d, q]) => x + q * (sh[c + d] || 0), 0);
    const old = V.ppPick(sh, null, a, b, 5, 20, sc, 'safe3', 40, false), neu = V.ppPick(sh, null, a, b, 5, 20, sc, 'safe3', 40, true);
    return { old: [old.target, old.run.length], neu: [neu.target, neu.run.length], sOld: sc(old.target), sNew: sc(neu.target), tol: V.PP_SOLID_TOL };
  });
  ok(s1.old[0] === 12 && s1.old[1] === 1, '1. without the rule: the 1-frame island 12 between 40% frames (on off on off on), ' + s1.sOld.toFixed(3) + ' with the spread');
  ok(s1.neu[1] === 3 && s1.neu[0] >= 39 && s1.neu[0] <= 41 && s1.sNew >= s1.sOld - s1.tol, '1. with it: the solid 3-frame run ' + s1.neu[0] + ' (' + s1.sNew.toFixed(3) + ', within ' + s1.tol + ')');

  // ---- 2. short Strategies boxes
  const s2 = await p.evaluate(() => { const T = window.__tot, V = T.v109, L = T.RT(), at = f => { const i = L.findIndex(f); T.setStep(i); return Math.round(V.closeMinMs()); };
    return { jrS: at(s => s.prof === 'jrcc_nothing'), jrM: at(s => s.prof === 'jrcc_syrup'), jrK: at(s => s.prof === 'jrpb5'), fbS: at(s => s.fb14 === 3), t6: at(s => s.turn === 'fb2_k') }; });
  ok(s2.jrS < 70 && s2.fbS < 70 && s2.t6 < 70 && s2.jrM === 20 && s2.jrK === 200, '2. a close counts after ' + s2.jrS + ' ms on a Jr. / Final Bowser Strategies step (jr0701 T5 box up 133 ms; 200 ms before), Mario screens ' + s2.jrM + ', others ' + s2.jrK);
  await p.close();

  // ---- 3. jr0701 T5 (Do Nothing at 10 HP unread, the Power Bounce stepped to by hand)
  const J1 = readLog('jr0701');
  if (!J1) console.log('skip 3: jr0701 not present');
  else for (const mode of ['gap', 'short']) {
    const q = await open(J1.settings, J1.more.presses);
    const r = await q.evaluate(([ev, mode]) => {
      const T = window.__tot, real = performance.now.bind(performance); let dt = 0; performance.now = () => real() + dt;
      const js = ev.filter(e => e.ev === 'jrStart' && e.k === 8).pop(), lk = ev.filter(e => e.ev === 'chargeLock' && e.t <= js.t + 5).pop(), trig = ev.filter(e => e.ev === 'chargeTrigger' && e.t < js.t).pop();
      const K = real() - js.t, map = t => t + K, setNow = t => { dt = map(t) - real(); };
      T.jrTrackerAt(parseInt(lk.best.seed, 16), lk.qs, map(trig.t), 8, { 9: true });
      T.setStep(T.RT().findIndex(s => s.prof === 'jrcc_nothing'));
      for (const s of ev.filter(e => e.ev === 'shine' && e.t > trig.t && e.t < 101800)) T.zwTap(map(s.at));
      if (mode === 'short') T.V.shortClose = { t: map(94080), step: T.step(), onFor: 67 };      // the clip: the box closed at page 94.08 s
      setNow(101860); T.userStep(T.step() + 1);
      const out = { k: T.JRT.k, dead: !!T.zw.dead, lost: T.JRT.lost, src: (T.JRT.inputs.find(x => x.k === 9) || {}).src };
      setNow(102200); T.st.plan = null; T.st.planTry = 0; T.makePlan(); out.msg = T.st.msg; const P = T.st.plan; out.plan = P && { target: P.zwAbs, p: P.mix.p, p6: P.mix.p4 };
      const fPB = Math.round(T.zwF(map(104217), 3)); out.fPB = fPB;
      if (!T.zw.dead) { const S = T.zwStates(performance.now()); let w4 = 0, w = 0; for (const s of S.list) { const c = T.jrClasses(s.s, s.nc, s.g, fPB, fPB, 'jrpb5')[0]; w += s.w; if (c === 4) w4 += s.w; } out.share4 = w4 / w; }
      // a close on the Power Bounce step is never the Do Nothing
      const n0 = T.SLOG.length; T.JRT.k = 9; out.closeOnPB = T.v109.jrStepGap ? (window.__tot.jrScreenAt ? (T.jrScreenAt(300, 3), T.SLOG.slice(n0).map(e => e.ev)) : []) : [];
      return out;
    }, [J1.events, mode]);
    console.log('3 ' + mode, JSON.stringify(r).slice(0, 400));
    if (mode === 'gap') {
      ok(r.k === 10 && r.dead && /T5 Do Nothing was not seen/.test(r.lost || '') && !r.plan && /T5 Do Nothing was not seen/.test(r.msg || ''), '3. jr0701 stepped on by hand past the unread Do Nothing: the carry is lost and the page says why (no plan; v108: 98% 5+ from states without it, a 3 cap)');
      ok((r.closeOnPB || []).includes('jrCloseNotStrat') && !(r.closeOnPB || []).includes('jrStrategiesClosed'), '3. the Power Bounce screen closing is not taken as the Do Nothing (v108: Do Nothing c 407 after the bounce)');
    } else {
      ok(r.k === 10 && !r.dead && r.src === 'short' && r.plan && r.plan.p > 0.675, '3. with the short close kept: the Do Nothing goes in at it and the bounce is planned (' + (r.plan && r.plan.target) + ', 5+ ' + (r.plan && r.plan.p.toFixed(3)) + ', 6+ ' + (r.plan && r.plan.p6 && r.plan.p6.toFixed(3)) + ')');
      ok(r.share4 != null && r.share4 > 0.5, '3. the frame the runner pressed (' + r.fPB + ', 3 bounces) gives 4 or fewer for ' + Math.round(100 * (r.share4 || 0)) + '% of the states with the Do Nothing in (v108 without it: 5+ 98%)');
    }
    await q.close();
  }

  // ---- 4. jr0706: the T5 death, the revive carried
  const J6 = readLog('jr0706');
  if (!J6) console.log('skip 4: jr0706 not present');
  else {
    const q = await open(J6.settings, J6.more.presses);
    const r = await q.evaluate(ev => {
      const T = window.__tot, real = performance.now.bind(performance); let dt = 0; performance.now = () => real() + dt;
      const js = ev.filter(e => e.ev === 'jrStart' && e.k === 8).pop(), lk = ev.filter(e => e.ev === 'chargeLock' && e.t <= js.t + 5).pop(), trig = ev.filter(e => e.ev === 'chargeTrigger' && e.t < js.t).pop();
      const K = real() - js.t, map = t => t + K, setNow = t => { dt = map(t) - real(); };
      T.jrTrackerAt(parseInt(lk.best.seed, 16), lk.qs, map(trig.t), 8);
      T.setStep(T.RT().findIndex(s => s.prof === 'jrcc_nothing'));
      const sh = ev.filter(e => e.ev === 'shine' && e.t > trig.t).map(e => e.at), dn = ev.filter(e => e.ev === 'jrInput' && e.k === 9).pop();
      for (const s of sh.filter(x => x < 352000)) T.zwTap(map(s));
      setNow(352060); T.jrScreenAt(dn.c, 3);
      for (const s of sh.filter(x => x > 352000 && x < 366810)) T.zwTap(map(s));
      setNow(366810); const n0 = T.SLOG.length; T.v109.jrDeath(9, 443);
      const out = { on: T.zw.on && T.zw.fight === 'jr', rev: T.SLOG.slice(n0).find(e => e.ev === 'jrReviveCarry'), ends: T.SLOG.slice(n0).some(e => e.ev === 'jrCarryEnds') };
      setNow(367600); T.st.plan = null; T.st.planTry = 0; T.makePlan(); const P = T.st.plan; out.msg = T.st.msg; out.plan = P && { target: P.zwAbs, p: P.mix.p, p6: P.mix.p4, doubt: P.mix.doubt, msAhead: Math.round(P.tPress - performance.now()) };
      return out;
    }, J6.events);
    console.log('4', JSON.stringify(r).slice(0, 400));
    ok(r.on && r.rev && r.rev.states > 100 && !r.ends, '4. jr0706 T5 death: the carry goes on through the revive (' + (r.rev && r.rev.states) + ' states on the T6 menu; v108: jrCarryEnds, no plan)');
    ok(r.plan && r.plan.p > 0.675 && r.plan.msAhead > 1000, '4. the Power Bounce is planned 0.8 s after the HP read (' + (r.plan && r.plan.target) + ': 5+ ' + (r.plan && r.plan.p.toFixed(3)) + ', 6+ ' + (r.plan && r.plan.p6 && r.plan.p6.toFixed(3)) + ', doubt ' + (r.plan && r.plan.doubt) + ')');
    await q.close();
  }

  // ---- 5. Final Bowser step tracking
  {
    const q = await open({ prof: 'endgame', off: '-4.5', vlag: '50', fbc9: 'skip' });
    const r = await q.evaluate(() => {
      const T = window.__tot, V = T.v109, L = T.RT(), i3 = L.findIndex(s => s.fb14 === 3), i4 = L.findIndex(s => s.fb14 === 4), i6 = L.findIndex(s => s.turn === 'fb2_k'), out = {};
      T.setStep(i3); const t = performance.now(); T.st.lastStepClose = { t: t - 317, to: i3 };
      const n0 = T.SLOG.length; T.checkPress(t); out.soon = T.SLOG.slice(n0).map(e => e.ev); out.stepSoon = T.step();
      T.checkPress(t + 2000); out.stepLate = T.step();
      out.prof3 = (T.setStep(i3), V.chgProfNow()); out.prof4 = (T.setStep(i4), V.chgProfNow());
      out.base = [V.CHG_PROF.fb1.baseMin, V.CHG_PROF.fb2.baseMin, V.CHG_PROF.jr.baseMin || 0];
      // a step back by hand onto a lever whose confirm was read plans again
      const FB = T.lockFB().FB14; FB.pT = FB.pT || {}; FB.pT[4] = t; T.setStep(i4 + 1); T.userStep(i4); out.undone = FB.pT[4] == null && T.SLOG.some(e => e.ev === 'fb14ConfirmUndone');
      // T6: a close 87 frames after a trigger with no lock is not the Do Nothing; a step back re-arms the reader
      T.setStep(i6); T.CHG.trig = { t: performance.now() - 87 * 33.4 - 100 }; const n1 = T.SLOG.length; window.__fb2.confirm(performance.now()); out.t6early = T.SLOG.slice(n1).map(e => e.ev); out.t6step = T.step();
      T.setStep(i6 + 1); T.CHG.state = 'nolock'; T.userStep(i6); out.rearm = T.SLOG.some(e => e.ev === 'fb2Rearmed') && T.CHG.state === 'idle';
      out.i = [i3, i4, i6];
      return out;
    });
    console.log('5', JSON.stringify(r).slice(0, 400));
    ok(r.soon.includes('closeTooSoon') && r.stepSoon === r.i[0] && r.stepLate === r.i[0] + 1, '5. fb0718: a close 317 ms after the one that moved the route here is the same box (T4 not skipped); 2 s later it counts');
    ok(r.prof3 === 'fb1' && r.prof4 === 'fb1', '5. fb0722: T3\'s step reads T4\'s Charge (its burst moves the route on when T3\'s Do Nothing was not read)');
    ok(r.base[0] === 70 && r.base[1] === 70, '5. fb0722: a Final Bowser trigger under base 70 is no Charge (Peach Beam 29.6; console locks 81-96)');
    ok(r.undone, '5. fb0718: a step back by hand onto a lever whose confirm was read lets it plan again (v108: fb14PlanAfterConfirm, nothing)');
    ok(r.t6early.includes('fb2ConfirmTooEarly') && r.t6step === r.i[2], '5. fb0722: no T6 lock and a close 87 frames after the trigger: not the Do Nothing, the route stays on T6');
    ok(r.rearm, '5. fb0722: a step back by hand to T6 re-arms its Charge reader');
    await q.close();
  }

  // ---- 6. the press on the strip, plans' frames, refine / stop rules, stars, buttons
  {
    const q = await open({ prof: 'endgame', off: '-4.5', vlag: '50', fbc9: 'skip', jrroute: 'charge' });
    const r = await q.evaluate(() => {
      const T = window.__tot, L = T.RT(), i2 = L.findIndex(s => s.fb14 === 2), out = {};
      T.setStep(i2);
      const tab = []; for (let f = 740; f <= 830; f++) tab.push(f === 769 || f === 770);
      const P = { tab, first: 740, w: { start: 769, end: 770, length: 2 }, target: 770, rate: 33.4, tMade: performance.now() - 2000 };
      out.works = T.v109.pressShow(P, 769.7, 'Final Bowser T2, Do Nothing'); out.fails = null;
      T.leverPressNote('Final Bowser T2, Do Nothing', -0.3, 'fb14', out.works); out.msg = document.getElementById('press-msg').textContent;
      T.setStep(i2 + 1); T.st.plan = null; const d = T.stripData(); out.src = d.src; out.hit = d.hit; out.state = T.stripState();
      out.fail = T.v109.pressShow(P, 793.86, 'Final Bowser T2, Do Nothing'); out.state2 = T.stripState();
      T.st.plan = { tMade: performance.now(), tab: [true], first: 0, w: { start: 0, end: 0, length: 1 }, target: 0, rate: 33.4, tPress: performance.now() + 3000 }; out.after = T.stripData().src; T.st.plan = null;
      // the route's stars
      const lis = [...document.querySelectorAll('#route-list li')]; out.stars = lis.filter(li => li.querySelector('.rngstar') && li.querySelector('.rngstar').textContent === '★').map(li => (li.querySelector('[data-i]') || li.lastElementChild).textContent);     // (v110: a text-only timed turn has no chip)
      out.starOutside = lis.every(li => !li.querySelector('[data-i] .rngstar'));
      // Erase log / Reset seed
      let asked = 0; window.confirm = () => { asked++; return true; }; T.SLOG.push({ t: 1, ev: 'x' }); document.getElementById('erase-log').click(); out.erased = T.SLOG.map(e => e.ev).join(); out.asked = asked;
      out.eraseLabel = document.getElementById('erase-log').textContent; out.eraseCls = document.getElementById('erase-log').classList.contains('done');
      document.getElementById('reset').click(); out.resetLabel = document.getElementById('reset').textContent;
      return out;
    });
    console.log('6', JSON.stringify(r).slice(0, 600));
    ok(r.works === true && /Last press · on time ✓/.test(r.msg), '6. a Final Bowser press on a working frame: the Press check row in green with ✓ ("' + r.msg.slice(0, 80) + '")');
    ok(r.src === 'press' && Math.abs(r.hit - 769.7) < 1e-9 && /works ✓/.test(r.state.text), '6. after the route moves on the strip keeps the window and the frame hit: "' + r.state.text.slice(0, 90) + '"');
    ok(r.fail === false && /fails ✗/.test(r.state2.text), '6. a press off the window (fb0709 T2 794 on 791-792): red ✗');
    ok(r.after === 'plan', '6. the next plan replaces it');
    const want = ['T1: Charge; Do Nothing', 'T3: Charge; Bomb',     // (v110: the Duplighosts Charge route is the default)
       'T4: Bomb; Maple Syrup [Down 1]', 'T5: Charge; Do Nothing', 'T6: Bounce x6; Bomb if 5 capped', 'T2: Time Out; Spiny Flip', 'T1: Charge; Cloud Nine', 'T2: Charge; Do Nothing', 'T3: Jammin\' Jelly; Do Nothing', 'T4: Charge; Do Nothing - Block Wave', 'T6: Charge; Do Nothing - Close Call', 'T7: Bounce x7'];
    ok(want.every(w => r.stars.includes(w)) && !r.stars.some(s => /Whacka|T1: Charge; Bomb|Spiny Flip - Danger/.test(s)) && r.starOutside, '6. a star left of every timed turn, outside the chip (' + r.stars.length + ': ' + r.stars.join(' | ').slice(0, 200) + ')');
    ok(r.erased === 'logErased' && r.asked === 0 && r.eraseLabel === 'Log erased ✓' && r.eraseCls && r.resetLabel === 'Seed reset ✓', '6. Erase log at once (no confirm), "Log erased ✓" / "Seed reset ✓" for 1.5 s');
    await q.close();
  }
  // ---- 6b. after Erase log the page logs on (log 07-48-18: one event, then nothing); a capture with no pictures says so
  {
    const q = await open({ prof: 'endgame', off: '-4.5', vlag: '50' });
    const r = await q.evaluate(async () => { const T = window.__tot, ref = T.SLOG; document.getElementById('erase-log').click(); T.setStep(3); T.setStep(4);
      const after = T.SLOG.map(e => e.ev), same = ref === T.SLOG;
      T.V.stream = { getVideoTracks: () => [{ readyState: 'live', muted: false }] }; T.V.camOn = true; T.V.lastFrameT = performance.now() - 4000; await new Promise(r => setTimeout(r, 1300)); const kick = T.SLOG.some(e => e.ev === 'captureLoopRestart'); await new Promise(r => setTimeout(r, 4300));
      setTimeout(() => { throw new Error('v109 test error'); }, 0); await new Promise(r => setTimeout(r, 50)); const pe = T.SLOG.find(e => e.ev === 'pageError');
      const st = T.SLOG.find(e => e.ev === 'captureStalled'), b = document.getElementById('cap-banner'); const out = { after, same, st: st && st.why, msg: !b.hidden && document.getElementById('cap-banner-msg').textContent, btn: !!document.getElementById('cap-restart'), kick, pe: pe && pe.msg };
      T.V.stream = null; T.V.camOn = false; return out; });
    ok(r.same && r.after.join() === 'logErased,step,step', '6b. after Erase log the same log goes on (' + r.after.join() + ')');
    ok(r.kick && /v109 test error/.test(r.pe || ''), '6b. the watchdog first restarts the picture loop (captureLoopRestart); an uncaught error goes into the log (pageError: ' + r.pe + ')');
    ok(/no new picture/.test(r.st || '') && /Not seeing the game/.test(r.msg || '') && r.btn, '6b. a capture with no pictures for 3 s: captureStalled (' + r.st + '), the red banner with Restart capture ("' + (r.msg || '').slice(0, 70) + '")');
    await q.close();
  }
  // ---- 6c. Normal Boots (jrg0753 / jrg0744): T6's Do Nothing read moves the route to the bounce; wait-mode plans aim early
  {
    const q = await open({ prof: 'endgame', off: '-4.5', vlag: '50', boots: 'normal', nbcc: 'wait', duproute: 'charge' });
    const r = await q.evaluate(() => { const T = window.__tot, L = T.RT(), i6 = L.findIndex(s => s.seq === 'nbjr' && s.jr === 11), i1 = L.findIndex(s => s.seq === 'nbjr' && s.jr != null);
      T.setStep(i1); T.jrTrackerAt(0x13572468, [10], performance.now() + 3600000, 0); T.setStep(i6); T.JRT.k = 11; const min = Math.round(T.v109.closeMinMs());
      T.jrScreenAt(5000, 3); return { i6, step: T.step(), next: (T.RT()[T.step()] || {}).jr, min, tol: T.v109.PP_WAIT_TOL }; });
    ok(r.next === 12 && r.min < 70, '6c. jrg0753: Normal Boots T6\'s Do Nothing (a 2-frame box counts: ' + r.min + ' ms) moves the route to the bounce (step ' + r.step + ', jr ' + r.next + ')');
    ok(r.tol === 0.05 && /prof\.lever === 'wait' && pk\.ok/.test(fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8')), '6c. jrg0753: a wait-mode Close Call aims at the earliest frame within 0.05 of the pick with the spread');
    await q.close();
  }
  // ---- 6d. the exception that stopped the picture loop after a Normal Boots fight (logs 07-48-18 / 07-49-56)
  {
    const q = await open({ prof: 'endgame', boots: 'normal', nbcc: 'wait', duproute: 'charge', vlag: '50' });
    const r = await q.evaluate(() => { const T = window.__tot, L = T.RT(), i1 = L.findIndex(s => s.seq === 'nbjr' && s.jr != null), errs = [];
      T.setStep(i1); T.jrTrackerAt(0x13572468, [10], performance.now() - 120000, 0); let c = 100;
      for (let k = 1; k <= 12; k++) { T.jrConfirmClock(k, c); c += 300; for (const pr of [true, false]) errs.push(...T.v109.frameParts(performance.now(), pr)); }
      T.setStep(T.step() + 1); errs.push(...T.v109.frameParts(performance.now(), true)); T.userStep(1); errs.push(...T.v109.frameParts(performance.now(), true));
      return errs; });
    ok(!r.length, '6d. a whole Normal Boots fight to its bounce and the steps after: no exception in the picture path (v108: jrStatusLine read JR_SEQ[12]) ' + r.slice(0, 2).join(' | '));
    await q.close();
  }
  // ---- 7. the partnerless route (unit level: Mario's own Do Nothing is not modelled from the emulator; see README v109)
  {
    const q = await open({ prof: 'endgame', off: '-4.5', vlag: '50', jrroute: 'pl', duproute: 'charge' });
    const r = await q.evaluate(() => {
      const T = window.__tot, out = { opt: !!document.querySelector('#s-jrroute option[value="pl"]') };
      out.turns = [...document.querySelectorAll('#route-list [data-i]')].map(x => x.textContent).filter(t => /Do Nothing|Bounce x6/.test(t));
      out.head = [...document.querySelectorAll('#route-list li')].map(x => x.textContent).find(t => /Partnerless/.test(t)) || null;
      const L = T.RT(), i1 = L.findIndex(s => s.seq === 'ultrapl' && s.jr === 1); T.setStep(i1);
      T.jrTrackerAt(0x2468ace0, [12], performance.now() + 3600000, 0);
      out.seq = T.JRT.k; T.jrScreenAt(200, 3); out.k1 = T.JRT.k; T.jrConfirmClock(2, 600); out.stepT2 = T.RT()[T.step()].jr;
      const plans = []; let c = 600;
      const cc = (k, pre) => { const P = T.jrPlanAt(c + pre, 1.5, 1, 'jrcc_nothing'); plans.push({ k, target: P.target, p: P.p, pp: P.pp, none: P.none }); if (P.target == null) return false; T.jrScreenAt(P.target, 3); T.jrDodge(k); c = P.target; return true; };
      cc(3, 115); T.jrConfirmClock(4, c + 120); c += 120; cc(5, 165); T.jrConfirmClock(6, c + 120); c += 120; cc(7, 115); T.jrConfirmClock(8, c + 120); c += 120; cc(9, 115);
      T.jrConfirmClock(10, c + 130); c += 130; T.jrScreenAt(c + 200, 3); c += 200; out.stepT7 = T.RT()[T.step()]; out.stepT7 = out.stepT7 && out.stepT7.jr;
      const P7 = T.jrPlanAt(c + 100, 1.5, 1.5, 'jrpb5'); out.pb = { target: P7.target, p: P7.p, p6: P7.p6, none: P7.none, w4: P7.w4 };
      out.plans = plans; out.k = T.JRT.k; out.inputs = T.JRT.inputs.map(x => x.id + ':' + x.c);
      return out;
    });
    console.log('7', JSON.stringify(r).slice(0, 900));
    const PLT = ['T1: Charge; Do Nothing', 'T2: Charge; Do Nothing - Close Call', 'T3: Maple; Do Nothing - Close Call', 'T4: Charge; Do Nothing - Close Call', 'T5: Charge; Do Nothing - Close Call', 'T6: Whacka; Do Nothing', 'T7: Bounce x6'], i0 = r.turns.indexOf(PLT[1]) - 1;     // (v110: the Duplighosts' T1 reads the same as the partnerless T1)
    ok(r.opt && i0 >= 0 && PLT.every((t, j) => r.turns[i0 + j] === t) && /Partnerless/.test(r.head || ''), '7. the partnerless route is a Jr. Troopa route option and shows its 7 turns under its header (' + r.turns.slice(i0, i0 + 7).join(' | ') + ')');
    ok(r.k1 === 2 && r.stepT2 === 3, '7. T1\'s Do Nothing read from its Strategies box moves the route to T2');
    ok(r.plans.length === 4 && r.plans.every(x => x.target != null && !x.none && x.p > 0.3), '7. T2-T5\'s Do Nothing Close Calls planned from a known seed (' + r.plans.map(x => x.target + ' ' + (x.p || 0).toFixed(2)).join(', ') + ')');
    ok(r.stepT7 === 12 && r.pb.target != null && !r.pb.none && r.pb.p > 0.675, '7. after Whacka and T6\'s Do Nothing, T7\'s Power Bounce planned (' + r.pb.target + ', 5+ ' + (r.pb.p || 0).toFixed(2) + ', 6+ ' + (r.pb.p6 || 0).toFixed(2) + ')');
    await q.close();
  }
  // the rules in the source (replays of these need the Final Bowser lock pictures; numbers in README v109)
  const src = n => fs.readFileSync(path.join(__dirname, n), 'utf8'), fb14 = src('charge_live/fb14_live.js'), fb2 = src('charge_live/fb2_live.js');
  ok(/const reach = fbPressT\(P\.target\) >= earliestPress\(now \+ FB14_PLAN_MS\)/.test(fb14) && /narrowed && reach &&/.test(fb14), '6. fb0709 T2: a refine runs only while a new plan can still aim at the planned frame (770 at 0.994 was swapped for 792, 0.51)');
  ok(/p >= Math\.max\(num\('zwedge'\), fb14Blind\(P\.fb14\) \+ FB14_KEEP_EDGE\)/.test(fb14), '6. fb0709 T4: too late to move, a frame still 5 points over blind keeps its beeps (0.626 was stopped 0.19 s before the first beep)');
  ok((fb2.match(/tab: sh\.map\(v => v >= |tab: e7\.map/g) || []).length === 2, '6. fb0709 T6: the T6 / T7 plans carry their frames (v108: tab [], no strip)');
  const errs2 = errs.filter(e => !/v109 test error/.test(e)); ok(!errs2.length, 'no page errors ' + errs2.join(' | ').slice(0, 300));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
