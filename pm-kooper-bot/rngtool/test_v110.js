/* v110 (README v110): the runner's "works straight after opening" defaults and per-fight corrections, the lighter Final Bowser
 * input path, the route texts / steps of the day.
 * 0. A fresh page (empty localStorage): the defaults are the runner's tuned values (off -4.5, voff -4, zoom 1.5, the Duplighosts
 *    Charge route and its "4 if 2+ frame window" goal), the Settings corrections 0, the built-in per-fight read corrections
 *    (Jr. Troopa -0.5 on the Ultra and Normal Boots Jr. routes, the Normal Boots Hallway 0, Final Bowser 0, Duplighosts 0) and
 *    every lever's learned correction 0; each lever has its own capped record (LEVER_MAX).
 * 1. fb14Input clones only the (state, shift) pairs the cap can keep: the same states as cloning every pair and capping.
 * 2. Final Bowser T5 (Peach Beam) is a tracked step: no star, no Charge reader on it, the route goes on to T6 once the bar is
 *    back after the Peach Beam's hide.
 * 3. Route rows: the star is a fixed column left of the box for a long wrapped turn too (phone width); the Duplighosts' Charge
 *    route texts; the Normal Boots Goombario Final Bowser route as a selectable route (starred, untested, not beeped); Phase 1
 *    of the Ultra Boots Laki Final Bowser.
 * usage: node test_v110.js [PAGE=...] */
const fs = require('fs');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v114/timeout_timer_standalone.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  if (!fs.existsSync(PAGE)) { console.log('(skipped: no page at ' + PAGE + ')'); console.log('all ok'); return; }
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const open = async (set, vp) => { const p = await b.newPage(vp ? { viewport: vp } : {}); p.on('pageerror', e => errs.push(String(e))); await p.addInitScript(s => { try { localStorage.clear(); if (s) localStorage.setItem('tot-settings', JSON.stringify(s)); } catch (e) {} }, set || null); await p.goto('file://' + PAGE); return p; };
  // ---- 0. a fresh page
  { const p = await open(null);
    const r = await p.evaluate(() => { const T = window.__tot, X = T.v110, v = id => document.getElementById('s-' + id).value, out = {};
      out.ver = T.VERSION; out.set = { off: v('off'), voff: v('voff'), zoom: v('zoom'), duproute: v('duproute'), dupgoal: v('dupgoal'), jrfix: v('jrfix'), pfix: v('pfix'), fbnbroute: v('fbnbroute') };
      out.fix = { jr: X.builtinFix('jr'), hw: X.builtinFix('hw'), dup: X.builtinFix('dup'), fb14: X.builtinFix('fb14') };
      out.keys = ['jrcc_bomb', 'jrcc_syrup', 'jrcc_nothing', 'jrpb5', 'jrcc_gchw', 'jrcc_hb', 'jrpb5n', 'hwcc_gchw', 'timeout', 'dup3', 'fb14'].map(id => id + ':' + X.leverKey(id));
      out.bias = ['jr', 'hw', 'dup', 'fb14', 'fb14sk'].map(k => X.leverBias(k));
      const iJ = T.RT().findIndex(s => s.prof === 'jrcc_bomb'); T.setStep(iJ); out.jrFixUltra = X.jrFix();
      // the learned correction: capped, per lever, not shared
      for (let i = 0; i < 8; i++) X.leverAdd('jr', 3); out.capped = X.leverBias('jr'); out.otherAfter = X.leverBias('hw');
      for (let i = 0; i < 8; i++) X.leverAdd('jr', 0); out.back = X.leverBias('jr');
      return out; });
    console.log('0', JSON.stringify(r));
    ok(r.ver === 'v114', '0. page version v110');
    ok(r.set.off === '-4.5' && r.set.voff === '-4' && r.set.zoom === '1.5' && r.set.duproute === 'charge' && r.set.dupgoal === 'run2', '0. fresh page: the runner\'s tuned defaults (' + JSON.stringify(r.set) + ')');
    ok(r.set.jrfix === '0' && r.set.pfix === '0' && r.set.fbnbroute === 'cap', '0. the Settings corrections default to 0 (fine-tune on top of the built-in values)');
    ok(r.fix.jr === -0.5 && r.fix.hw === 0 && r.fix.dup === 0 && r.fix.fb14 === 0, '0. built-in read corrections per fight: Jr. -0.5, Hallway / Duplighosts / Final Bowser 0');
    ok(r.jrFixUltra === -0.5, '0. a fresh page reads a Jr. Troopa press with -0.5 (built-in + setting 0): ' + r.jrFixUltra);
    ok(r.keys.join() === 'jrcc_bomb:jr,jrcc_syrup:jr,jrcc_nothing:jr,jrpb5:jr,jrcc_gchw:jr,jrcc_hb:jr,jrpb5n:jr,hwcc_gchw:hw,timeout:hw,dup3:dup,fb14:fb14', '0. every lever has its own record: ' + r.keys.join(' '));
    ok(r.bias.every(x => x === 0), '0. a fresh page starts every learned correction at 0');
    ok(Math.abs(r.capped + 1.5) < 1e-9 && r.otherAfter === 0 && Math.abs(r.back) < 1e-9, '0. the learned correction is capped at 1.5 frames (' + r.capped + '), per lever (Hallway still ' + r.otherAfter + '), and follows the last 8 presses');
    await p.close(); }
  { const p = await open({ boots: 'normal', duproute: 'charge' });
    const r = await p.evaluate(() => { const T = window.__tot, X = T.v110; const iH = T.RT().findIndex(s => s.seq === 'nbhw'), iJ = T.RT().findIndex(s => s.seq === 'nbjr' && s.prof); T.setStep(iJ); const a = X.jrFix(); T.setStep(iH); return { nbjr: a, nbhw: X.jrFix(), iH, iJ }; });
    ok(r.nbjr === -0.5 && r.nbhw === 0, '0. Normal Boots: Jr. Troopa -0.5, the Hallway 0 (' + JSON.stringify(r) + ')');
    await p.close(); }
  // ---- 1. fb14Input's pre-filter: the same states as clone-all-then-cap
  { const p = await open({ prof: 'endgame', off: '-5', vlag: '50', fbc9: 'skip' });
    const r = await p.evaluate(() => { const X = window.__fb14, FB = X.FB14, out = {};
      const mk = () => { const L = []; let x = 12345; const rnd = () => (x = (Math.imul(x, 1103515245) + 12345) >>> 0) / 4294967296;
        for (let i = 0; i < 2600; i++) { const c = new Uint8Array(20); for (let j = 0; j < 20; j++) c[j] = Math.floor(rnd() * 3); L.push(X.fbNew({ s: Math.floor(rnd() * 4294967296) >>> 0, nc: 100 + Math.floor(rnd() * 40), f: 600, c, ph: [Math.floor(rnd() * 130), Math.floor(rnd() * 220)], l: rnd() < 0.75 ? 0 : 1, w: rnd() * rnd(), from: 0 })); }
        return L; };
      const run = cfg => { window.__fb14cfg = cfg; X.reset(); FB.on = true; FB.t0 = 0; FB.states = mk(); const t = performance.now(); X.input('nothing', 640, 2, X.SHIFTS_S); const ms = performance.now() - t;
        const keys = FB.states.map(S => X.v110.key(S) + ':' + S.w.toFixed(12)); delete window.__fb14cfg; return { n: FB.states.length, keys, ms }; };
      const A = run({ maxc: 12000 }), B = run({ maxc: 1e9 });
      const Bs = B.keys.slice(0, 12000), set = new Set(A.keys); out.nA = A.n; out.nB = B.n; out.same = Bs.length === A.keys.length && Bs.every(k => set.has(k)); out.msA = Math.round(A.ms); out.msB = Math.round(B.ms);
      return out; });
    ok(r.same && r.nA === 12000, '1. fb14Input with the pre-filter keeps exactly the 12000 states clone-all-then-cap keeps (' + JSON.stringify(r) + ')');
    await p.close(); }
  // ---- 2. the T5 step
  { const p = await open({ prof: 'endgame', off: '-4.5', vlag: '50', fbc9: 'skip' });
    const r = await p.evaluate(() => { const T = window.__tot, X = window.__fb14, out = {};
      const i5 = T.RT().findIndex(s => s.fb5), i4 = T.RT().findIndex(s => s.fb14 === 4 && s.fb14role === 'lever'), i6 = T.RT().findIndex(s => s.turn === 'fb2_k');
      out.order = [i4, i5, i6]; T.setStep(i5); out.prof = T.chgProfNow ? T.chgProfNow() : 'n/a';
      let t = 100000; const fr = (n, pr) => { for (let i = 0; i < n; i++) { t += 33.4; X.v110.t5Watch(t, pr); } };
      fr(150, true); out.early = T.step();          // the bar up from T4 (Bowser's turn), no hide yet
      fr(60, false); fr(10, true); out.mid = T.step();   // the Peach Beam's hide, the bar back only briefly
      fr(40, true); out.end = T.step();
      const li = [...document.querySelectorAll('#route-list li')].find(l => /T5: Peach Beam - Danger/.test(l.textContent)); out.star = li ? li.querySelector('.rngstar') && li.querySelector('.rngstar').textContent : 'no li';
      return out; });
    console.log('2', JSON.stringify(r));
    ok(r.order[0] + 1 === r.order[1] && r.order[1] + 1 === r.order[2], '2. T4 -> T5 (Peach Beam) -> T6 steps');
    ok(!r.prof, '2. no Charge reader on the T5 step (the T6 reader waits): ' + JSON.stringify(r.prof));
    ok(r.early === r.order[1] && r.mid === r.order[1] && r.end === r.order[2], '2. the route stays on T5 through Bowser\'s T4 turn and the beam, then goes to T6 once the bar is back (' + [r.early, r.mid, r.end] + ')');
    ok(r.star === '', '2. T5 has no star');
    await p.close(); }
  // ---- 4. (gg) log v109a: Jammin' Jelly's flash on T3, a false burst's step rolled back, a new attempt from a stale T1 step
  { const p = await open({ prof: 'endgame', off: '-4.5', vlag: '50', fbc9: 'skip' });
    const r = await p.evaluate(() => { const T = window.__tot, X = window.__fb14, FB = X.FB14, C = T.v106.CHG(), out = {}, now = () => performance.now();
      const i3 = T.RT().findIndex(s => s.fb14 === 3 && s.fb14role === 'lever'), i4 = T.RT().findIndex(s => s.fb14 === 4 && s.fb14role === 'lever'), i1 = T.RT().findIndex(s => s.fb14 === 1 && s.fb14role === 'lever');
      out.idx = [i1, i3, i4];
      // the log's T3: the bar up 20.4 s from T2's Do Nothing (Bowser's turn, the menu), the Jelly's hide at 1024978, the trigger 766 ms later
      X.reset(); T.setStep(i3); let t = now() - 30000; const fr = (n, pr) => { for (let i = 0; i < n; i++) { t += 33.4; X.v110.t3Hides(t, pr); } };
      fr(610, true); const hideT = t + 33.4; fr(20, false);
      FB.lastBurst = { turn: 2, t: hideT - 40000 }; C.trig = { t: hideT + 766 }; X.v110.trigger(); out.jelly = T.step(); out.jellyLog = X.slogTail(10).some(e => e.ev === 'fb14BurstJelly');
      // the same burst with no Jelly hide on record (the v109 T3 rule: T4's Charge moves the route), then judged no Charge: back to T3
      FB.t3h = null; C.trig = { t: now() }; X.v110.trigger(); out.moved = T.step(); X.v110.falseBurst(); out.back = T.step(); out.backLog = X.slogTail(10).some(e => e.ev === 'fb14BurstRolledBack');
      // a stale T1 step: the route on T1's Cloud Nine step from the attempt before, the next attempt's T1 Charge 70 s after that T1's
      X.reset(); T.setStep(i1); FB.lastBurst = { turn: 1, t: now() - 70000 }; C.trig = { t: now() }; X.v110.trigger(); out.stale = T.step(); out.staleLog = X.slogTail(12).filter(e => /fb14NewAttempt|fb14StepByBurst/.test(e.ev)).map(e => e.ev);
      // a T2 Charge 30 s after T1's on T1's lever step still moves to T2
      X.reset(); T.setStep(i1); FB.lastBurst = { turn: 1, t: now() - 30000 }; C.trig = { t: now() }; X.v110.trigger(); out.t2 = T.step();
      return out; });
    console.log('4', JSON.stringify(r));
    const [i1, i3, i4] = r.idx, i2 = i1 + 1;
    ok(r.jelly === i3 && r.jellyLog, '4. v109a T3: Jammin\' Jelly\'s flash 0.77 s after its hide does not move the route to T4 (fb14BurstJelly)');
    ok(r.moved === i4 && r.back === i3 && r.backLog, '4. a burst that moved the route and is then judged no Charge moves it back (fb14BurstRolledBack)');
    ok(r.stale === i1 && r.staleLog.includes('fb14NewAttempt'), '4. v109a: a burst on T1\'s Cloud Nine step 70 s after T1\'s Charge is the next attempt\'s T1 Charge: the route stays on T1 (' + r.staleLog.join(',') + ')');
    ok(r.t2 === i2, '4. a burst there 30 s after T1\'s Charge is still T2\'s (route to T2)');
    await p.close(); }
  // ---- 5. (hh) log v109b T6 -> T7: the dodge seen, the coin in Bowser's T6 turn no longer rules out every T7 state
  const LB = '/tmp/claude-0/pm/logs1115/v109b/log.json';
  if (!fs.existsSync(LB)) console.log('(5 skipped: no log ' + LB + ')');
  else { const Lg = JSON.parse(fs.readFileSync(LB, 'utf8')), E = Lg.events, cap = Lg.chargeCaptures.find(c => c.prof === 'fb2'), TR = 1242114, shines = E.filter(e => e.ev === 'shine' && e.at > TR).map(e => e.at);
    const p = await open(Lg.settings);
    const r = await p.evaluate(async ({ cap, TR, shines }) => { const T = window.__tot, X = window.__fb2, FB2 = X.FB2, out = { plans: [] };
      T.setStep(T.RT().findIndex(s => s.turn === 'fb2_k')); const t0 = performance.now() - 3000, rel = t => t0 + (t - TR);
      await T.chgReplay(cap, { t0, fb2: true }); if (!FB2.on) return out;
      FB2.pObs = 174.45; X.setP(174.45); out.n = FB2.t7.states.length; X.v108.outcome('dodge', { test: true }); FB2.t7.outT = rel(1263423);     // the log's fb2Dodged
      for (const tt of [1265000, 1268000]) { FB2.taps = shines.filter(a => a < tt).map(a => X.pic(rel(a)) - 4.8); FB2.vis = [[X.pic(rel(1244394)), X.pic(rel(tt))]]; FB2.visFrom = null;
        const c = X.pic(rel(tt)), S = X.v108.prune(c), P = X.planT7At(c); out.plans.push({ tt, n: S.length, doubt: +S.doubt.toFixed(3), plan: P ? (P.none || 'plan') : null }); }
      return out; }, { cap, TR, shines });
    console.log('5', JSON.stringify(r));
    ok(r.plans.length === 2 && r.plans.every(x => x.n > 0 && x.doubt < 0.5), '5. v109b T7: with the dodge seen the T7 states fit the coin (v109: 0 states, doubt 1, 55 times): ' + JSON.stringify(r.plans));
    await p.close(); }
  // ---- 3. route rows
  for (const vp of [{ width: 1280, height: 900 }, { width: 360, height: 800 }]) {
    const p = await open({ boots: 'normal', duproute: 'charge' }, vp);
    const r = await p.evaluate(() => { const lis = [...document.querySelectorAll('#route-list li.rturn')], out = { rows: [] };
      for (const li of lis) { const st = li.querySelector('.rngstar'), ch = li.querySelector('.chip') || li.lastElementChild; if (!st || !ch) continue; const a = st.getBoundingClientRect(), c = ch.getBoundingClientRect();
        out.rows.push({ t: ch.textContent.slice(0, 40), star: st.textContent, sr: a.right, cl: c.left, st: a.top, ct: c.top, cb: c.bottom, ch: c.height }); }
      out.docW = document.documentElement.scrollWidth; out.winW = window.innerWidth; return out; });
    const long = r.rows.find(x => /Bombette Do Nothing/.test(x.t));
    const bad = r.rows.filter(x => !(x.sr <= x.cl + 0.5 && x.st >= x.ct - 2 && x.st <= x.cb));
    ok(long && long.star === '★' && !bad.length, '3. ' + vp.width + ' px: every star (or spacer) left of its box and inside its height; the long Duplighosts line ' + (long ? 'h ' + Math.round(long.ch) + ' px, star.right ' + Math.round(long.sr) + ' <= box.left ' + Math.round(long.cl) : 'missing') + (bad.length ? ' BAD ' + JSON.stringify(bad[0]) : ''));
    const lefts = new Set(r.rows.map(x => Math.round(x.cl))); ok(lefts.size === 1, '3. ' + vp.width + ' px: all boxes line up (' + [...lefts] + ')');
    await p.close(); }
  { const p = await open({ boots: 'normal', duproute: 'charge', fbnbroute: 'goomba' });
    const r = await p.evaluate(() => { const T = window.__tot, rows = [...document.querySelectorAll('#route-list li')].map(l => l.textContent);
      const i = T.RT().findIndex(s => s.timed && s.nomodel); T.setStep(i); return { route: T.v110.fbnbRoute(), rows, step: T.RT()[i] && T.RT()[i].label, i }; });
    const want = ['T1: Charge; Do Nothing', 'T2: Bounce x3; Do Nothing', 'T3: Star Beam', 'T1: Peach Beam; Charge', '★T2: Charge; Charge - Close Call', '★T3: Charge; Charge - Close Call', '★T4: Charge; Headbonk x2 - Close Call, No Star Shield', "★T5: Jammin' Jelly - Close Call Wave, No Star Shield", '★T6: Charge; Do Nothing - Close Call, No Star Shield', '★T7: Charge; Do Nothing - Close Call, No Star Shield', '★T8: Bounce x6'];
    const k = r.rows.findIndex(x => /Normal Boots Goombario\) Phase 1/.test(x));
    ok(r.route === 'goomba' && k >= 0 && want.every(w => r.rows.includes(w)), '3. Normal Boots Goombario Final Bowser: selectable, its turns verbatim, the timed ones starred (' + r.rows.slice(k, k + 14).join(' | ') + ')');
    ok(r.i > 0 && /untested/.test(r.step || ''), '3. its timed steps say untested and beep nothing');
    await p.close(); }
  { const p = await open({ prof: 'endgame', duproute: 'charge' });
    const rows = await p.evaluate(() => [...document.querySelectorAll('#route-list li')].map(l => l.textContent));
    const i = rows.indexOf('Ultra Boots Laki Final Bowser');
    ok(i >= 0 && rows.slice(i + 1, i + 6).join('|') === 'Phase 1:|T1: Charge; Do Nothing|★T2: Bounce x5; Do Nothing|T3: Star Beam|Phase 2:', '3. Ultra Boots Laki Final Bowser: Phase 1 lines (T2 starred, untested) before Phase 2 (' + rows.slice(i, i + 8).join(' | ') + ')');
    const d = rows.indexOf('Duplighosts'); ok(rows.slice(d + 1, d + 3).join('|') === '★T1: Charge; Do Nothing|T2: Jump x2; Power Bomb', '3. Duplighosts (Charge route): ' + rows.slice(d + 1, d + 3).join(' | '));
    await p.close(); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
