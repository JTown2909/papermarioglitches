//@ v116: Final Bowser Phase 1 on the Ultra Boots Laki route (charge_live/README.md v116, v132). Included by page_template.html
//@ after fb14_live.js.
/* Phase 1's T1 Super Charge is read with the aura profile (Bowser's Star Rod aura is up in Phase 1 too: console clip 16-06-01,
 * log 484e3220, the Phase 1 Charge locks 9bb456e7 at 6776 / 2.44x on the first placement with it).
 * v132 (the runner: "i can not do phase 1 because the bounce is still not tracked"): Phase 1 is tracked to the T2 Power Bounce
 * (fb2_route/p1model.py, p1g_log.py; test_v132 replays 12 emulator logs exactly on the page's model):
 *   - Bowser is Star Rod enchanted from Phase 1's start: his T1 attack (Body Slam / Claw 16, Fire Breath 20; a guard takes 1)
 *     kills Mario at 10 HP, the Life Shroom revives him (the same draws as phase 2's revive, fbStep 'p1hit'); his AI is on
 *     Lakilester's Do Nothing confirm P + 13 (RandInt 80, maybe 60); a guarded Body Slam drops a few draws (S.gd);
 *   - the T2 Power Bounce does no damage (Bowser is enchanted) but its continue rolls run: roll n on D + 71 + 27n (D = the
 *     target-screen A), as phase 2's; the runner wants a 5 cap (route row: a 5 cap needs 6+ on Phase 2 T7, 3 / 4 need 7).
 * Steps: T1 Charge (hand on Mario: its rays lock the seed -> FBP1.states, the fits of fb14Lock's fresh path), T1 Do Nothing
 * (Lakilester's Strategies screen: its close gives P), T2 Power Bounce (hand on Bowser: the plan beeps the target A for 5+).
 * The status-bar coin weighs the states all the way (the menu before the Charge, Mario's T2 menu). Phase 2 T1's Charge still
 * locks afresh (the Star Beam, a whole Peach battle and the Star Spirits come between): after the Power Bounce the route
 * moves to it and holds for FBP1_HOLD. */
var FBP1_HOLD = 90000;     // (var: chgShow runs before this file is evaluated)
var FBP1 = { t: null, seed: null, outcome: null, score: null, ratio: null };
var FBP1V = { taps: [], vis: [], visFrom: null };      // the coin's shines and the bar's stretches, kept from before the lock
CHG_PROF.fbp1 = Object.assign({}, CHG_PROF.fb1, { id: 'fbp1' });
CHG_PRESS.fbp1 = () => 20000;      // nothing waits on the lock: re-reads for 20 s
const FBP1_AI = 12;     // v133: Bowser's AI on Lakilester's Do Nothing confirm + 12 (battle 2303; v132's + 13 was phase 2's battle)
const FBP1_GOAL = 5, FBP1_MAXS = 6000, FBP1_PLANS = 1500, FBP1_BUDGET = 60, FBP1_GUARD = 0.7, FBP1_PF_MS = 4, FBP1_TICK = 250;
function fbp1Reset() { Object.assign(FBP1, { t: null, seed: null, outcome: null, score: null, ratio: null, states: null, t0: null, rate: null, lockT: null, pT: null, P: null, plan: null, pbT: null, doubt: 0, n0: 0, why: null, tickT: 0, pfI: 0, nPlans: 0, ended: false, allOut: false, kept: null, edgeLogged: null }); }
fbp1Reset();
function fbp1T1I() { return RT().findIndex(x => x.fb14 === 1 && x.fb14role === 'charge'); }
const fbp1StepI = k => RT().findIndex(x => x[k]);
function fbp1Hold(t) { return !!FBP1 && FBP1.t != null && (t != null ? t : performance.now()) - FBP1.t < FBP1_HOLD; }
const fbp1Pic = t => (t - FBP1.t0) / FBP1.rate;
const fbp1PressT = d => FBP1.t0 + (d + 3 - 4.7 + num('off')) * FBP1.rate - num('vlag');     // (fb2PressT with t0 = the burst - 16 frames)
/* v137 (console 17:28, log b87c9527: a retry with the route left on the Do Nothing step: the reader never armed (fbp1ArmOk held it for
 * the earlier attempt's read) and Lakilester's confirm went to that attempt's states): a Phase 1 read is this attempt's for
 * FBP1_STALE ms after its lock (the Charge -> Power Bounce takes ~25 s) */
const FBP1_STALE = 60000;
const fbp1Fresh = t => FBP1.lockT == null || (t != null ? t : performance.now()) - FBP1.lockT < FBP1_STALE;     // (no lock time: tests, replays)
const fbp1On = () => !!(FBP1 && FBP1.states && FBP1.t0 != null && !FBP1.ended && fbp1Fresh());
const fbp1StepOn = () => { const s = isRoute() && RT()[routeStep]; return !!(s && (s.fbp1 || s.fbp1dn || s.fbp1pb)); };
/* the Phase 1 read is over (chgDecide / chgRetryStop) */
function fbp1Done(outcome, R) {      // R (v132): the read after fb14Refine (its placement and trigT)
  if (CHG.replay || chgP().id !== 'fbp1') return false;
  const I = CHG.info || {}, b = I.best || {}, trigT = R && R.trigT != null ? R.trigT : CHG.trig ? CHG.trig.t : performance.now();
  if (FBP1.pT != null && FBP1.pT < trigT) FBP1.pT = null;      // a confirm from an earlier attempt
  Object.assign(FBP1, { ended: false, allOut: false, P: null, plan: null, pbT: null, kept: null, edgeLogged: null, nPlans: 0, seed: outcome === 'lock' ? b.seed || null : null, outcome, score: b.score != null ? b.score : null, ratio: b.ratio != null ? b.ratio : null, lockT: performance.now() });
  let n = 0; if (outcome === 'lock') { try { n = fbp1Build(R || CHG.res, trigT); } catch (e) { slog('fbP1BuildError', { msg: String(e && e.message || e).slice(0, 160) }); n = 0; } }
  slog('fbP1Read', { outcome, seed: FBP1.seed, score: FBP1.score, ratio: FBP1.ratio, alt: CHG.alt || 0, mario: I.mario, states: n, holdMs: FBP1_HOLD });
  if (CHG.rec && typeof chgRecEnd === 'function') chgRecEnd(outcome === 'lock' ? 'lock' : 'nolock');
  chgReset();
  if (!n) {      // no lock (or no states): as v116, on to Phase 2 T1's Charge step, held
    FBP1.t = trigT; FBP1.states = null; const j = fbp1T1I(); if (j >= 0 && isRoute() && RT()[routeStep] && (RT()[routeStep].fbp1 || RT()[routeStep].fbp1dn)) setStep(j);
  } else {
    { const s = isRoute() && RT()[routeStep]; if (s && s.fbp1) { const j = fbp1StepI('fbp1dn'); if (j >= 0) setStep(j); } }
    if (FBP1.pT != null) fbp1Input(FBP1.pT);      // Lakilester's confirm was read before the lock
  }
  chgShow(); return true;
}
/* v133 (console 20:20, log e284a73c: the Phase 1 read locked 1.2 s after Lakilester's Do Nothing; the route was still on the Charge
 * step (its Mario screen never seen closing), so the Strategies box was not watched, the confirm was lost and the route never
 * reached the Power Bounce): the Charge burst moves the route to the Do Nothing step, as fb14Trigger does on phase 2 (v76) */
function fbp1Trigger() {
  const s = isRoute() && RT()[routeStep]; if (!s || !s.fbp1) return;
  const j = fbp1StepI('fbp1dn'); if (j < 0) return;
  FBP1.pT = null; slog('fbP1StepByBurst', { from: routeStep, to: j }); setStep(j); st.lastStepClose = { t: performance.now(), to: j };
}
/* the lock's fits -> model states (fb14Lock's fresh path, no carry and no joint read: Phase 1's first Charge) */
function fbp1Build(res, trigT) {
  const H = res && res.fb1 && res.fb1.hyps; if (!H || !H.hy || !H.hy.length) { FBP1.why = 'no hypotheses from the rays'; return 0; }
  const rate = chgRate(), P = fb2Patterns(), M = 0; FBP1.rate = rate; FBP1.t0 = trigT - 16 * rate;
  const menuT = CHG.menuSince || null, menuF = menuT != null ? Math.min(M, Math.max(M - 450, Math.ceil(fbp1Pic(menuT) + 30))) : M;
  const back = x => Math.imul((x - 1) >>> 0, 0x6A76AE6D) >>> 0, x0a = back(H.a >>> 0), combos = [];
  // v133: battle 2303 has no Star Rod aura (emulator: the aura address draws only the Charge's own respawns, which 'chg' models; fbEnd48
  // with c = 0 lands on the logged seed at M + 61): one aura variant, all zero
  for (const h of H.hy) combos.push([h, { aura: new Uint8Array(20), w: Math.exp((h.sc - H.best) / Math.max(1, FB14_SIG * H.best)) }]);
  combos.sort((x, y) => y[1].w - x[1].w);
  const paOf = ph => [(((ph[0] - M) % 130) + 130) % 130, (((ph[1] - M) % 220) + 220) % 220], fresh = [], seen = new Set(); let nOk = 0;
  for (const [h, AV] of combos) {
    if (nOk >= FB14_COMBOS) break;
    const c = new Uint8Array(20); for (let j = 0; j < 20; j++) c[mod20(M + 13 + j)] = AV.aura[j];
    const pa0 = paOf(P.list[h.p].ph[0]); let x0 = x0a; for (let i = fbBolts(M + 13, pa0); i; i--) x0 = back(x0);
    const E = fbEnd48(x0, M, h.q, c, pa0); if (!(h.br ? !E.shq : (h.q + 24 >= 48 || E.shq))) continue; nOk++;
    for (const ph of P.list[h.p].ph) {
      const pa = paOf(ph); let y0 = x0a; for (let i = fbBolts(M + 13, pa); i; i--) y0 = back(y0);
      const Bs = fbBackShinesAll(y0, M + 13, M + 13 + h.q, c, pa, menuF);     // v140: every coin history the RNG allows
      for (const [l, wl] of FB14_LAGS) {
        const key = E.s + ':' + E.nc + ':' + c.join('') + ':' + pa[0] + ':' + pa[1] + ':' + l; if (seen.has(key)) continue; seen.add(key);
        Bs.forEach((B, bi) => fresh.push(fbNew({ s: E.s >>> 0, nc: E.nc, f: M + 61, c, ph: pa, l, rg: 0, w: wl * AV.w * B.w * (B.ok ? 1 : 1e-3), from: Math.min(menuF, M + 13), sh: B.sh.slice().sort((a, b) => a - b).concat(E.sh), key: key + (bi ? ':h' + bi : ''), tag: 'p1' })));
      }
    }
  }
  fresh.sort((x, y) => y.w - x.w); FBP1.states = fresh.slice(0, FBP1_MAXS); FBP1.n0 = fresh.length;
  slog('fbP1States', { fits: H.hy.length, combos: nOk, states: FBP1.states.length, of: fresh.length, menuF });
  return FBP1.states.length;
}
/* Lakilester's Do Nothing confirm (its Strategies screen closing, read at tObs): Bowser's AI on P + 13 in every state, the shifts
 * of phase 2's Do Nothing reads (FB14_SHIFTS_S) */
function fbp1Input(tObs) {
  if (!fbp1On()) return; const c = fbp1Pic(tObs) - fb14Van('S', 'screen'), F = Math.round(c), out = [];
  fbp1Advance(F - 3);
  for (const S of FBP1.states) for (const [d, wd] of FB14_SHIFTS_S) {
    const Fd = F + d - S.l; if (S.f > Fd + FBP1_AI) continue;
    const T = fbClone(S); T.w = S.w * wd; T.p1m = 1; T.gd = null; T.aiF = Fd + FBP1_AI; fbEv(T, { k: 'ai', f: Fd + FBP1_AI, turn: 1 }); out.push(T);
  }
  out.sort((x, y) => y.w * (y.lw || 1) - x.w * (x.lw || 1)); FBP1.states = out.slice(0, FBP1_MAXS); FBP1.P = F;
  slog('fbP1DoNothing', { F, c: +c.toFixed(2), states: FBP1.states.length, of: out.length });
}
/* a state past Bowser's AI splits into guarded (FBP1_GUARD) and not: v133, every attack draws differently with the guard (battle 2303) */
function fbp1Split(S, out) {
  if (S.gd !== null || S.aiF == null || S.f <= S.aiF) return;
  S.gd = 1; const T = fbClone(S); T.gd = 0; T.w = S.w * (1 - FBP1_GUARD); S.w *= FBP1_GUARD; out.push(T);
}
/* every state to logic frame h (- its lag), at most FBP1_PF_MS of work when budgeted */
function fbp1Advance(h, budget) {
  const L = FBP1.states; if (!L || !L.length) return true; const t0 = performance.now(), add = []; let i = budget && FBP1.pfRef === L ? FBP1.pfI || 0 : 0, done = true; if (!(i < L.length)) i = 0; FBP1.pfRef = L;     // v136 (console 17:09: the Do Nothing input cut 42000 states to 6000 and a stale pfI past the new list's end threw on every picture: no plan)
  for (let n = 0; n < L.length; n++) { const S = L[i]; i = i + 1 < L.length ? i + 1 : 0;
    if (S.aiF != null && S.gd === null && S.f < h - S.l) { fbRun(S, Math.min(h - S.l, S.aiF + 1)); fbp1Split(S, add); }
    if (S.f < h - S.l) fbRun(S, h - S.l);
    if (budget && (n & 31) === 31 && performance.now() - t0 > budget) { done = false; break; } }
  FBP1.pfI = i; if (add.length) for (const T of add) { if (T.f < h - T.l) fbRun(T, h - T.l); L.push(T); }
  return done;
}
/* the states' weights from the coin since their lock (fb14Weigh without the attack / bolt evidence) */
function fbp1Weigh(h) {
  const V = FBP1V, vis = V.vis.concat(V.visFrom != null ? [[V.visFrom, null]] : []).map(([a, b]) => [fbp1Pic(a) + 30, Math.min(b == null ? h - 4 : fbp1Pic(b) - 4, h - 4)]).filter(([a, b]) => b > a);
  const tapF = V.taps.map(t => fbp1Pic(t) - 4.8), Wd = 6.5 * (ZW_RHO + ZW_FALSE), Lm = (1 - FB_PMISS) / Wd, Lf = ZW_FALSE / (ZW_RHO + ZW_FALSE), near = (x, f) => x - f >= -2 && x - f <= 4.5;
  let mx = 0, tot0 = 0; const out = [];
  for (const S of FBP1.states) {
    tot0 += S.w; const sh = S.sh.map(f => f + S.l), taps = tapF.filter(x => x < h && x >= S.from + S.l); let lw = 1, err = 0;
    for (const x of taps) if (sh.some(f => near(x, f))) lw *= Lm; else { lw *= Lf; err++; }
    for (const f of sh) if (f < h - 6 && vis.some(([a, b]) => f >= a && f <= b) && !taps.some(x => near(x, f))) { lw *= FB_PMISS; err++; }
    S.lw = lw; S.err = err; if (err > FB_MAXERR) continue; out.push(S); mx = Math.max(mx, S.w * lw);
  }
  const keep = out.filter(S => S.w * S.lw >= mx * ZW_CUT), sum = keep.reduce((a, S) => a + S.w * S.lw, 0);
  let nVis = 0; for (const [a, b] of vis) nVis += Math.max(0, b - Math.max(a, 0));
  const bg = tot0 * ZW_BG0 * Math.exp(-ZW_RHO * nVis);
  return { list: keep, doubt: keep.length ? bg / (bg + sum) : 1, n: FBP1.states.length };
}
const fbp1Horizon = now => Math.floor(fbp1Pic(now - num('vlag')) - 10);
/* the pictures: the bar's stretches, the states stepped toward the horizon, the plan kept current on the Power Bounce step */
function fbp1Frame(t, present) {
  const V = FBP1V;
  if (present && V.visFrom == null) V.visFrom = t;
  if (!present && V.visFrom != null) { V.vis.push([V.visFrom, t]); if (V.vis.length > 200) V.vis.shift(); V.visFrom = null; }
  if (!fbp1On()) return;
  if (!fbp1StepOn()) { FBP1.ended = true; slog('fbP1Ended', { states: FBP1.states.length, plans: FBP1.nPlans || 0 }); return; }     // the route left Phase 1 (the press, a retry, a reset): no more stepping
  if (t - (FBP1.tickT || 0) > FBP1_TICK) {
    FBP1.tickT = t; const h = fbp1Horizon(performance.now());
    if (fbp1Advance(h, FBP1_PF_MS * 3)) {
      const W = fbp1Weigh(h); FBP1.doubt = W.doubt; FBP1.kept = W.list.length;
      if (W.list.length && W.list.length < FBP1.states.length && FBP1.states.length > 64) FBP1.states = W.list;     // the coin's misfits go
      if (!W.list.length && !FBP1.allOut) { FBP1.allOut = true; slog('fbP1AllOut', { h, taps: V.taps.map(x => +fbp1Pic(x).toFixed(1)).filter(x => x < h).slice(-12) }); }
    }
  } else fbp1Advance(fbp1Horizon(performance.now()), FBP1_PF_MS);
}
function fbp1Tap(t) { FBP1V.taps.push(t); if (FBP1V.taps.length > 400) FBP1V.taps.shift(); }
/* the bounces for target-A frames d0..d1 (logic) of state S: each value the bounce count, FBP1_GOAL meaning that many or more
 * (v133: hits from D + 45 with their damage stars; a cap is the first failed roll + 2, so once rolls 0..GOAL-3 pass, 5+ is certain) */
function fbp1Row(S, d0, d1) {
  const B = fbClone(S); if (B.f > d0 + 45) return null; fbRun(B, d0 + 45); const out = new Int8Array(d1 - d0 + 1), end = 71 + 27 * (FBP1_GOAL - 3) + 1;
  for (let d = d0; d <= d1; d++) {
    const T = fbClone(B); T.pbn = 0; T.pbgo = true; T.pbk = -1; fbEv(T, { k: 'pbh', f: d + 45, n: 0 });
    while (T.f < d + end && T.pbgo !== false) fbStep(T);
    out[d - d0] = T.pbgo === false ? Math.min(FBP1_GOAL, T.pbk + 2) : FBP1_GOAL; fbStep(B);
  }
  return out;
}
function fbp1RowC(S, d0, d1) { const C = S._pb; if (C && d0 >= C.lo && d1 <= C.lo + C.arr.length - 1) return C.arr.subarray(d0 - C.lo, d1 - C.lo + 1); const W = d1 - d0 + 40, arr = fbp1Row(S, d0, d0 + W); if (!arr) return null; S._pb = { lo: d0, arr }; return arr.subarray(0, d1 - d0 + 1); }
const fbp1HasRow = (S, d0, d1) => !!(S._pb && d0 >= S._pb.lo && d1 <= S._pb.lo + S._pb.arr.length - 1);
/* the T2 Power Bounce plan (makePlan, on the Power Bounce step while its target screen is up): the target-A frame with the best
 * 5+ share (fb2PlanT7's rule: the perfect-press share must reach Settings > Best chance) */
function fbp1Plan(cScr) {
  const s = isRoute() && RT()[routeStep]; if (!s || !s.fbp1pb) return false;
  if (cScr == null && typeof seriesHold === 'function' && seriesHold('fbp1')) return true;
  if (!fbp1On()) { st.msg = FBP1.outcome === 'lock' ? 'No edge: the Phase 1 states are gone. Power Bounce normally (5 cap about 13%).' : 'No beeps: Phase 1\'s Charge did not lock. Power Bounce normally (5 cap about 13%).'; if (cScr == null) render(); return true; }
  if (FBP1.P == null) { st.msg = 'No edge: Lakilester\'s Do Nothing confirm was not read (its Strategies screen closing). Power Bounce normally (5 cap about 13%).'; if (cScr == null) render(); return true; }
  const now = performance.now(), rate = FBP1.rate, cNow = cScr != null ? cScr : fbp1Pic(now + num('vlag')), h = Math.floor(cNow) - 10;
  fbp1Advance(h); const Wt = fbp1Weigh(h), L = Wt.list, dz = Wt.doubt;
  if (!L.length || dz >= 0.5) { FBP1.plan = { none: 'no state fits' }; st.msg = 'No edge: the coin does not fit the Phase 1 states the page kept. Power Bounce normally (5 cap about 13%).'; if (cScr == null) { if (st.plan && st.plan.prof === 'fbp1') st.plan = null; cancelBeeps(); render(); } return true; }
  const G = FBP1_GOAL, W = Math.max(0, Math.round(Math.max(1, num('zwwin')) * 1000 / rate));
  let from = Math.ceil(cNow + num('lead') * 1000 / rate + 1);
  if (cScr == null) for (let i = 0; i < 300 && fbp1PressT(from) < earliestPress(now); i++) from++;
  const SP = L.length > FBP1_PLANS ? L.slice().sort((x, y) => y.w * y.lw - x.w * x.lw).slice(0, FBP1_PLANS) : L, tot = SP.reduce((a, S) => a + S.w * S.lw, 0);
  if (cScr == null) { const tb = performance.now(); let left = 0;
    for (const S of SP) { if (fbp1HasRow(S, from - 1 - S.l, from + W + 1 - S.l)) continue; if (performance.now() - tb > FBP1_BUDGET) { left++; continue; } fbp1RowC(S, from - 1 - S.l, from + W + 1 - S.l); }
    if (left) { if (st.plan && st.plan.prof === 'fbp1') { st.plan = null; cancelBeeps(); } FBP1.plan = { none: 'working' }; st.msg = 'Phase 1 Power Bounce: working out the bounces for ' + SP.length + ' seeds (' + Math.round(100 * (1 - left / SP.length)) + '%). Stay on the target screen.'; render(); return true; } }
  const s5 = new Array(W + 1).fill(0), e5 = new Array(W + 3).fill(0), e4 = new Array(W + 3).fill(0);
  for (const S of SP) { const b = fbp1RowC(S, from - 1 - S.l, from + W + 1 - S.l); if (!b) continue; const w = S.w * S.lw / tot;
    for (let k = 0; k <= W; k++) for (const [d, q] of PRESS_ERR) s5[k] += w * q * (b[k + 1 + d] >= G ? 1 : 0);
    for (let i = 0; i < W + 3; i++) { if (b[i] >= G) e5[i] += w; if (b[i] >= G - 1) e4[i] += w; } }
  let k = 0; for (let i = 1; i <= W; i++) if (s5[i] > s5[k] + 1e-12) k = i;
  const pk = ppWiden(ppPick(e5, e4, from - 1, from + W + 1, from, W, x => s5[x - from] || 0, 'safe3'), e5, from - 1, from + W + 1, from, W, 'fbp1'); if (pk.ok) k = pk.target - from;     // v139: ppWiden
  const d = from + k, plan = { d, p5: (1 - dz) * s5[k], pp5: (1 - dz) * e5[k + 1], win: pk.ok ? pk.run.length : 0, doubt: +dz.toFixed(3), states: L.length, planned: SP.length, tPress: fbp1PressT(d) };
  FBP1.plan = plan; if (cScr != null) return plan;
  if (!(plan.pp5 >= num('zwedge'))) {
    plan.none = 'edge'; if (st.plan && st.plan.prof === 'fbp1') st.plan = null; cancelBeeps();
    if (FBP1.edgeLogged !== d) { FBP1.edgeLogged = d; slog('fbP1NoEdge', { d, pp5: +plan.pp5.toFixed(3), p5: +plan.p5.toFixed(3), doubt: plan.doubt, states: plan.states }); }
    st.msg = 'No edge yet: no target-A frame in the next ' + num('zwwin') + ' s gives 5 bounces for enough of the ' + L.length + ' Phase 1 states (best ' + Math.round(100 * plan.pp5) + '% with a perfect press). Stay on the target screen: the page keeps looking (or Power Bounce normally, about 32%).';
    render(); return true;
  }
  cancelBeeps(); playBeeps(plan.tPress);
  const w5 = pk.ok ? pk.run : { start: d, end: d, length: 1 };
  st.msg = null; st.plan = { tMade: now, w: { start: w5.start, end: w5.end, length: w5.length }, target: d, tPress: plan.tPress, tLast: plan.tPress - (d - 0.5 + num('off')) * rate, rate, carried: true, from, to: from + W, first: from - 1, prof: 'fbp1', tab: e5.map(v => (1 - dz) * v >= Math.min(0.5, 0.8 * (1 - dz) * Math.max(...e5))), chance: e5.map(v => +((1 - dz) * v).toFixed(3)), tab4: null, type: 'fbp1', beeps: nBeeps() };
  FBP1.nPlans++; slog('fbP1Plan', plan); render(); return true;
}
/* Phase 2 T1's Charge step during the hold: no arming (chgFrame); Phase 1's Do Nothing step after the read: no second read */
function fbp1ArmOk(P, t) {
  const s = isRoute() && RT()[routeStep];
  if (P && P.id === 'fbp1' && s && s.fbp1dn && FBP1.outcome != null && FBP1.lockT != null && fbp1Fresh(t)) return false;     // v137: an earlier attempt's read does not hold it
  if (!P || P.id !== 'fb1' || !fbp1Hold(t)) return true; return !(s && s.fb14 === 1 && s.fb14role === 'charge');
}
/* a screen close on a Phase 1 step (checkPress): the Charge's moves on to the Do Nothing step; the Do Nothing's gives P; the
 * Power Bounce's is the press (its readout), then Phase 2 T1's Charge step, held. On Phase 2 T1's Charge step during the hold
 * the route stays. Returns true when the route is not to move by the usual next step. */
function fbp1KeepStep(stp, tObs) {
  if (stp && stp.fbp1) return false;      // v132: on to the Do Nothing step
  if (stp && stp.fbp1dn) {
    FBP1.pT = tObs; slog('fbP1Confirm', { at: Math.round(tObs), locked: fbp1On() });
    if (fbp1On()) fbp1Input(tObs); return false;
  }
  if (stp && stp.fbp1pb) {
    FBP1.pbT = tObs; FBP1.t = tObs; const P = st.plan && st.plan.prof === 'fbp1' ? st.plan : null;
    if (P && fbp1On()) { const c = (tObs - P.tLast - num('vlag')) / P.rate - VAN.B() - num('pfix');     // (as fb2PbPress reads T7's)
      slog('fbP1Press', { target: P.target, c: +c.toFixed(2), err: +(c - P.target).toFixed(2) }); try { const wk = pressShow(P, c, 'Final Bowser Phase 1, Power Bounce'); if (typeof leverPressNote === 'function') leverPressNote('Final Bowser Phase 1, Power Bounce', c - P.target, 'fbp1', wk); } catch (e) {} }
    const j = fbp1T1I(); if (j >= 0) { setStep(j); st.lastStepClose = { t: tObs, to: j }; }
    st.msg = 'Phase 1 Power Bounce pressed. Set "P1 bounce" (top of the route) to the cap you got: a 5 cap needs 6+ on Phase 2 T7, a 3 / 4 cap needs 7.'; if (typeof render === 'function') render(); return true;
  }
  if (stp && stp.fb14 === 1 && stp.fb14role === 'charge' && fbp1Hold(tObs)) { slog('fbP1StepKept', { at: Math.round(tObs), why: 'Phase 1 T2 / T3 or the cutscenes', sinceMs: Math.round(tObs - FBP1.t) }); return true; }
  return false;
}
function fbp1Line() {
  if (!FBP1) return '';
  const s = isRoute() && RT()[routeStep], on = s && (s.fbp1 || s.fbp1dn || s.fbp1pb);
  if (FBP1.outcome == null && !on) return '';
  const tail = ' Phase 2 T1\'s Charge locks afresh (the Peach battle comes between).';
  if (FBP1.outcome == null) return '<br><span class="note">Final Bowser Phase 1: its T1 Super Charge is read here; then Lakilester\'s Do Nothing (just confirm it) and the T2 Power Bounce on the beep (5 bounces).' + tail + '</span>';
  if (FBP1.outcome !== 'lock' || !FBP1.states) return '<br><span class="note">Final Bowser Phase 1: ' + (FBP1.outcome === 'lock' ? 'seed ' + FBP1.seed + ' read, but no model state came of it' : 'no clear seed') + ': no Power Bounce beep this time.' + tail + '</span>';
  const pc = x => Math.round(100 * x) + '%', P = FBP1.plan;
  return '<br><span class="note">Final Bowser Phase 1: seed ' + FBP1.seed + ' (' + FBP1.score + ', ' + FBP1.ratio + 'x), ' + FBP1.states.length + ' states' + (FBP1.doubt ? ', doubt ' + pc(FBP1.doubt) : '') +
    (FBP1.P != null ? '; Do Nothing read' : '; waiting for Lakilester\'s Do Nothing') + (P ? '; T2 Power Bounce: ' + (P.none ? 'no plan (' + P.none + (P.pp5 != null ? ', best 5+ ' + pc(P.pp5) : '') + ')' : 'target A on +' + P.d + ': 5+ bounces ' + pc(P.pp5) + ' with a perfect press (window ' + P.win + '), ' + pc(P.p5) + ' with your press spread') : '') + '.' + tail + '</span>';
}
window.__fbp1 = { v132: { build: (res, t) => fbp1Build(res, t), input: t => fbp1Input(t), advance: h => fbp1Advance(h), weigh: h => fbp1Weigh(h), row: (S, a, b) => fbp1Row(S, a, b), plan: c => fbp1Plan(c), S: () => FBP1, V: () => FBP1V, pic: t => fbp1Pic(t), GOAL: FBP1_GOAL } };
