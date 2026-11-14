//@ Final Bowser phase 2, T1 -> T4 (and the carry to T6), live (charge_live/README.md, v74; fb2_route/README.md section 7).
//@ Inlined into page_template.html after fb2_live.js; //@ lines are dropped. Needs the page globals R, FRAME, $, num, slog,
//@ st, V, CHG, chgRate, beepAt, cancelBeeps, playBeeps, nBeeps, earliestPress, pressDist, PRESS_ERR, zwChoose, render,
//@ isRoute, RT, routeStep, setStep, fb2Patterns, FB2_P130, FB2_P220, the ZW_* constants and chgSearch.
/* ---------- Final Bowser phase 2, T1-T4: the aura Charge lock, Bowser's misses, and the carry into T6 ----------
 * The route: T1 Super Charge, Cloud Nine; T2 Super Charge, Lakilester Do Nothing; T3 Jammin' Jelly, Do Nothing; T4 Super
 * Charge, Do Nothing (the Draining Shockwave, blocked); T5 Peach Beam; T6 Super Charge, the popup A; T7 Power Bounce.
 * Bowser's star aura draws 16 rand_int(359) per 20 frames, so the Hallway's Charge model does not fit these Charges:
 * the profile 'fb1' (charge_live.js) scores the rays with the aura, the lightning and the coin as unknown extra draws
 * (kernel.c fb1score: the best monotone path), then fits the fight's 20-frame aura pattern, the lightning pattern and
 * the first coin (fb1struct) and keeps every fit within FB14_TOL of the best. Each fit, with every lightning phase pair
 * behind its pattern and console lag 0 / 1 after the rays, is a state of the tracker below.
 * From the lock the turn is a closed model (fb2_route/t14model.py, emulator logs exact to the dodge test 64 / 64, and
 * through the next menu after every miss): per frame the bolts, the script draws (the Charge rays' creations on Mario's
 * confirm M + 13 / + 16, the Jelly's sparkles on M + 118, Cloud Nine's puffs on P + 200 .. 209, Bowser's AI on P + 13
 * after Do Nothing / P + 332 after Cloud Nine, the dodge test on AI + 52 / 62 / 55 / 72 by attack, the wave's own draws),
 * the coin, the aura, the rays' respawns, the wave's particles, the step. The lever is the partner's confirm P (the
 * runner waits on that screen): Bowser misses when the test is < 50 (Cloud Nine); on T4 the wave must also come.
 * The coin on every menu weighs the states (the v72 tracker's likelihood, ZW_*); each later Charge (T2, T4) is locked
 * again and checked against the carried states. The states are carried through T4 into T5's menu up to the Peach Beam
 * confirm; the beam itself is not modelled, but it takes 8654-9351 more random numbers than frames to T6's Charge
 * (fb2_route/t5_steps.py, 120 emulator runs), so the T6 Charge is searched only on that stretch of the carried stream
 * (charge_live.js chgSearch opts.cands) instead of all 2^32 seeds: no slow fresh lock at T6. */
const FB14_TOL = 0.008, FB14_SIG = 0.004, FB14_COMBOS = 4800, FB14_MAXH = 12000, FB14_LAGS = [[0, 0.75], [1, 0.25]];
const FB14_DELTA = { slam: 52, claw: 62, fire: 55, wave: 72, lightning: 99 }, FB14_AIAFTER = { cn: 332, nothing: 13 }, FB14_JELLY = 118;
const FB14_WAVE_POST = (() => { const o = { 66: 1, 68: 2, 70: 3, 72: 4, 74: 5, 76: 6, 78: 7, 80: 8, 126: 8, 128: 7, 130: 6, 132: 5, 134: 4, 136: 3, 138: 2, 140: 1 }; for (let d = 82; d <= 124; d += 2) o[d] = 9; return o; })();
// blind chances per lever frame (fb2_route/README.md section 3: route_build miss strings and the 20000-window study)
/* v87 (debug-core chain log of e2e 13579bdf, T4 popup left alone): 1 of 13 T4 waves split its e00742fc particles over odd
 * and even frames, which changes T4's test. Carried as a second hypothesis (FB14_WAVEB_P of the weight) from T4's Charge on. */
const FB14_WAVE_POST_B = { 67: 1, 68: 1, 69: 1, 70: 2, 71: 1, 72: 2, 73: 2, 74: 3, 75: 2, 76: 4, 77: 2, 78: 5, 79: 2, 80: 6, 81: 2, 82: 7, 83: 2, 84: 8, 85: 1, 86: 8, 87: 1, 88: 7, 89: 2, 90: 8, 91: 1, 92: 8, 93: 1, 94: 7, 95: 2, 96: 7, 97: 2, 98: 7, 99: 2, 100: 7, 101: 2, 102: 7, 103: 2, 104: 7, 105: 2, 106: 8, 107: 1, 108: 8, 109: 1, 110: 7, 111: 2, 112: 8, 113: 1, 114: 8, 115: 1, 116: 7, 117: 2, 118: 7, 119: 2, 120: 7, 121: 2, 122: 7, 123: 2, 124: 7, 125: 2, 126: 6, 127: 2, 128: 6, 129: 1, 130: 5, 131: 1, 132: 4, 133: 1, 134: 4, 136: 3, 138: 2, 140: 1 };
const FB14_WAVEB_P = 0.08;
/* v87: a T2 / T4 Charge's frame on the clock, read off its burst: -2 .. +2 (the e2e T2 Charge read 2 frames off), and the
 * narrowed search's fit tolerance on the carried stream (fb1Stage2) */
const FB14_CHGD = [[-2, 0.08], [-1, 0.22], [0, 0.4], [1, 0.22], [2, 0.08]], FB14_NTOL = 0.03;
const FB14_BLIND = { 1: 0.495, 2: 0.495, 3: 0.495, 4: 0.39 };
// the Peach Beam confirm -> the T6 Charge's rays frame 0: random numbers drawn = frames + this (t5_steps.py: Close Call
// 8654-8764, Bowser's hit 9116-9351; with margin for lag frames)
const FB14_T5 = [8540, 9420];
// the bar hiding after a confirm: the first picture without it shows confirm + 2 (Glide64 renders of the Charge and the
// Jelly, fb2_route/t14_log.py with SHOTS; the Peach Beam assumed the same); read to +-1 frame (FB14_JSHIFTS)
// the lever's screen: the first picture without its box shows the confirm + 1 (Cloud Nine's target, the マリオ name box) /
// + 2 (Lakilester's Strategies panel) in the same renders (the page's VAN, from console clips of other fights, says 2 / 3)
const FB14_VAN = { M: 1, S: 2, K: 3, Kon: 0 };     // v101: K the skip (Cloud Nine's message gone: the A + 3), Kon the message's first picture (P + 255 + Kon)
// a Charge burst this long after the last one, on that turn's lever step, is the next turn's Charge (Bowser's turn alone
// takes 15 s+ on console: T1 Cloud Nine -> T2 menu 18 s in the 2026-11-07 clip)
const FB14_NEXTCHG = 8000, FB14_NEWATTEMPT = 120000;
const FB14_MISSW = 0.01;     // v86: a state whose Bowser hit Mario on a turn the bar showed a miss (the HP read can be wrong: not 0)
const FB14_HIDE = { jelly: 2, peach: 2 }, FB14_JSHIFTS = [[-1, 0.25], [0, 0.5], [1, 0.25]];
var FB14 = { on: false };
function fb14Reset(why) { Object.assign(FB14, { on: false, why: why || null, states: [], t0: null, rate: null, taps: [], vis: [], visFrom: null, turn: 0, M: {}, P: {}, plan: null, lockN: 0, log: [], pb: null, t6: null, hideWatch: null, doubt: 0, bg: 0, p4t: null, pend: [], pT: {}, charges: [], inputs: [], lastBurst: null, gone: false, allOutLogged: false, prevPlan: null, hit: null, hp: null, hpw: null, missed: null, prior: null, earlyMsg: null, stream: why === 'boots' ? null : FB14.stream || null, trigStep: null, noEdge: {}, anchor: {}, hitLogged: null, routeOff: null, plans: [], decide: null, afterConf: null, pre: null, snap2: null, relock: null, relockTried: false, wide: false, atk: {}, atkW: {}, bolts: [], boltW: null, evLog: {}, sk: null, box: null, boxW: null, skTry: null, fresh: null }); }
fb14Reset();
/* ---- the random numbers (fast, no arrays) ---- */
let FBV = 0;
const fbAdv = s => (Math.imul(s, 0x5D588B65) + 1) >>> 0;
function fbRi(s, mx) {
  const m = mx === 1 ? 1000 : mx === 100 ? 1009 : mx, d = Math.floor(0xFFFFFFFF / (m + 1)) || 1; let v;
  do { s = fbAdv(s); v = Math.floor(s / d); } while (v > m);
  FBV = mx === 1 ? (v >= 501 ? 1 : 0) : mx === 100 ? Math.floor(v / 10) : v; return s;
}
const fbBolts = (f, ph) => { const m1 = (f + ph[0]) % 130, m2 = (f + ph[1]) % 220; return (m1 === 78 || m1 === 83 || m1 === 113 || m1 === 118 ? 1 : 0) + (m2 === 18 || m2 === 78 || m2 === 88 || m2 === 178 ? 1 : 0); };
/* ---- one state: { s, nc, f (the next logic frame to run), c (aura counts by f mod 20), ph (lightning phases, absolute,
 * 0 <= ph), l (console lag: logic frame = clock frame - l), w, resp (ray respawns, a 64-frame ring), ev (script events,
 * sorted by frame), wv (the frame of Bowser's AI when it chose the wave), prev (Bowser's last attack), out (per turn:
 * attack, test value, miss, ok), sh (logic frames of the predicted shines), from (the state's first frame) } ---- */
function fbClone(S) { return { mk: S.mk, s: S.s, nc: S.nc, f: S.f, c: S.c, ph: S.ph, l: S.l, w: S.w, resp: S.resp.slice(), ev: S.ev.slice(), wv: S.wv, prev: S.prev, lv: S.lv, rg: S.rg, out: Object.assign({}, S.out), sh: S.sh.slice(), from: S.from, key: S.key, lw: S.lw, err: S.err, tag: S.tag, ca: S.ca && Object.assign({}, S.ca), wb: S.wb, p1: S.p1 }; }
function fbNew(o) { return Object.assign({ resp: new Uint8Array(64), ev: [], wv: -1e9, lv: -1e9, rg: 0, prev: null, out: {}, sh: [], lw: 1, err: 0 }, o); }
function fbEv(S, e) { let i = S.ev.length; while (i > 0 && S.ev[i - 1].f > e.f) i--; S.ev.splice(i, 0, e); }
const mod20 = f => ((f % 20) + 20) % 20;
/* v86: Bowser's actor vars before his turn `turn` (TurnCount after the increment), from the attacks the state already
 * has on turns 1 .. turn - 1 (the phase-2 start: TurnCount 0, TurnsSinceShockwave / StarBeam / Recover 0, ClawSwipe /
 * BodySlam 3, RecoversLeft 3; final_bowser_2.c EVS_Init). The Star Rod aura is up from the start to the Peach Beam
 * (T5), and Mario has a jump charge from T1's Super Charge on (the wave would drain it: off the route then). */
function fbVars(S, turn) {
  const last = k => { let u = 0; for (let i = 1; i < turn; i++) if (S.out[i] && S.out[i].atk === k) u = i; return u; };
  const since = (k, base) => { const u = last(k); return u ? turn - u : base + turn; };
  let rec = 0; for (let i = 1; i < turn; i++) if (S.out[i] && S.out[i].atk === 'recover') rec++;
  return { turn, sinceShock: since('wave', 0), sinceStar: since('starrod', 0), sinceClaw: since('claw', 3), sinceSlam: since('slam', 3), sinceRecover: since('recover', 0), recovers: 3 - rec, enchanted: true, charged: true };
}
/* v86: the Recover check (Settings: Bowser's HP entering phase 2; Mario at 10 HP on T1-T4): 'hi' = never, 'lo' = always,
 * 'any' = both, half each (the coin and the turns' outcomes tell them apart) */
function fb14RgList() { const v = typeof $ === 'function' && $('s-fbhp') ? $('s-fbhp').value : 'hi'; return v === 'lo' ? [[1, 1]] : v === 'any' ? [[0, 0.5], [1, 0.5]] : [[0, 1]]; }
/* run frame S.f */
function fbStep(S) {
  const f = S.f; let s = S.s;
  // v87: the seed and coin on the frame after this Charge's rays (its M + 61), kept for a lock that lands after the state
  // has run past them (a late T2 lock: v86 skipped every carried state then, "matched 0 of 8000")
  if (S.ca && S.ca.s61 == null && f === S.ca.f61) { S.ca.s61 = s >>> 0; S.ca.nc61 = S.nc; }
  const m1 = (f + S.ph[0]) % 130, m2 = (f + S.ph[1]) % 220;
  if (m1 === 78 || m1 === 83 || m1 === 113 || m1 === 118) s = fbRi(s, 359);
  if (m2 === 18 || m2 === 78 || m2 === 88 || m2 === 178) s = fbRi(s, 359);
  while (S.ev.length && S.ev[0].f <= f) {
    const e = S.ev.shift(); if (e.f !== f) continue;
    if (e.k === 'chg') { if (!S.ca || S.ca.mk !== S.mk) S.ca = { mk: S.mk, a: fbAdv(s) >>> 0, f61: f + 48, s61: null, nc61: null };
      s = fbRi(s, 360); for (let i = 0; i < 10; i++) { s = fbRi(s, 10); s = fbRi(s, 10); for (let n = f + 9 + FBV; n < f + 45; n += 10) S.resp[n & 63]++; } }
    else if (e.k === 'jelly') { for (let i = 0; i < 10; i++) { s = fbRi(s, 359); s = fbRi(s, 10); s = fbRi(s, 10); } }
    else if (e.k === 'puff') { s = fbRi(s, 40); s = fbRi(s, 30); }
    else if (e.k === 'ai') {
      // v86: Bowser's whole EVS_TakeTurn_Inner (final_bowser_2.c; as pmrng_core.js fbnbAi, emulator-checked), from the
      // state's own history: the Recover check (S.rg: Mario's HP % more than 25 over Bowser's), the Star Rod (not while
      // the aura is up: T1-T4), the wave / Lightning Blast branches, the normal attacks
      const V = fbVars(S, e.turn); let atk = null;
      if (S.rg && V.recovers) { s = fbRi(s, 100); if (FBV < 75) { if (V.sinceRecover > 1) atk = 'recover'; else s = fbRi(s, 100); } }
      if (!atk && V.turn > 1 && !V.enchanted) { s = fbRi(s, 100); if (FBV < (V.sinceStar === 1 || V.sinceStar === 2 ? 0 : V.sinceStar === 3 ? 15 : 75)) atk = 'starrod'; }
      if (!atk && !(V.sinceShock < 3 || V.turn <= 3)) {
        if (V.sinceShock >= 6) { s = fbRi(s, 30); atk = FBV < 20 ? 'wave' : 'lightning'; }
        else { s = fbRi(s, 100); if (FBV < 75 && V.charged) atk = 'wave'; else { s = fbRi(s, 110); if (FBV < 30) atk = FBV < 20 ? 'wave' : 'lightning'; } }
      }
      if (!atk) { s = fbRi(s, 80); if (FBV < 20 && V.sinceSlam >= 2) atk = 'slam'; else { s = fbRi(s, 60); atk = FBV < 20 && V.sinceClaw >= 2 ? 'claw' : 'fire'; } }
      S.out[e.turn] = { atk, ai: f }; S.prev = atk;
      if (FB14_DELTA[atk] != null) fbEv(S, { k: 'test', f: f + FB14_DELTA[atk], turn: e.turn });
      else Object.assign(S.out[e.turn], { v: null, miss: false, ok: false, off: true });     // Recover / Star Rod: off the route (not modelled further)
      if (atk === 'wave') S.wv = f; else if (atk === 'lightning') S.lv = f;
    }
    else if (e.k === 'test') { s = fbRi(s, 100); const o = S.out[e.turn]; o.v = FBV; o.miss = FBV < 50; o.ok = o.miss && (e.turn !== 4 || o.atk === 'wave');
      if (o.atk === 'lightning') for (let i = 0; i < 3; i++) s = fbRi(s, 359); }   // v86: the blast's bolt, 3 x rand_int(359) right after the test
  }
  // v86: the Lightning Blast (fb2_route/lb_log.py, lb_model.py: 12 + 20 emulator runs exact): its energy effect on AI + 19
  // (1 x 360, 10 x (10, 20); each part respawns on + 19 + p, then every 20 frames while under + 50), rand_int(7) on AI + 69
  const dl = f - S.lv;
  if (dl === 19) { s = fbRi(s, 360); for (let i = 0; i < 10; i++) { s = fbRi(s, 10); s = fbRi(s, 20); for (let n = f + 19 + FBV; n < f + 50; n += 20) S.resp[n & 63]++; } }
  else if (dl === 69) s = fbRi(s, 7);
  const dw = f - S.wv;
  if (dw === 29) s = fbRi(s, 7); else if (dw === 76) for (let i = 0; i < 8; i++) s = fbRi(s, 359);
  if (f === S.nc) { s = fbRi(s, 100); if (FBV >= 70) S.sh.push(f); S.nc = f + (FBV >= 70 ? 48 : 24); }
  for (let i = S.c[mod20(f)]; i; i--) s = fbRi(s, 359);
  const r = S.resp[f & 63]; if (r) { for (let i = r; i; i--) s = fbRi(s, 359); S.resp[f & 63] = 0; }
  if (dw > 0 && dw <= 160) { const k = (S.wb ? FB14_WAVE_POST_B : FB14_WAVE_POST)[dw] || 0; for (let i = 0; i < k; i++) { s = fbRi(s, 359); s = fbRi(s, 359); s = fbRi(s, 10); s = fbRi(s, 15); s = fbRi(s, 15); } }
  S.s = fbRi(s, 1); S.f = f + 1;
}
function fbRun(S, to) { while (S.f < to) fbStep(S); return S; }
/* v105: a Charge's window M + 13 .. M + 60 run on the model from x0 (gRandSeed before frame M + 13's bolts) with aura split c,
 * lightning phases pa (any pair of the fit's pattern: the window's bolts are the pattern's) and the first coin on M + 13 + q:
 * the seed on M + 61, the next coin frame, the window's shines and whether the coin on q shone */
function fbEnd48(x0, M, q, c, pa) { const S = fbNew({ s: x0 >>> 0, nc: M + 13 + q, f: M + 13, c, ph: pa, l: 0, w: 1 }); fbEv(S, { k: 'chg', f: M + 13 }); fbEv(S, { k: 'chg', f: M + 16 }); S.mk = M; fbRun(S, M + 61);
  return { s: S.s >>> 0, nc: S.nc, sh: S.sh.slice(), shq: S.sh.includes(M + 13 + q) }; }
/* ---- the clock: logic frame 0 = T1's Mario confirm; FB14.t0 = the time the picture of frame 0 would show ---- */
const fbRate = () => FB14.rate || (typeof chgRate === 'function' ? chgRate() : FRAME);
const fbPic = t => (t - FB14.t0) / fbRate();
// the press for clock frame F: as Time Out's and the FB2 popup's (1.7 frames before that frame's picture, the runner's
// beep offset, the capture delay)
/* v86: the lever presses on console came 2.2 and 2.5 frames before the beeped frame (logs 1794169517521 / 1794170840652, T2's
 * Do Nothing, both read from the Strategies panel vanishing; the input display in the clips confirms the panel read: the
 * panel goes 11 video frames after the A shows there, as the Charge bar does 13 and the Cloud Nine list 10, i.e. the read
 * matches the emulator's P + 2). The runner's other presses (Jr. Troopa, Hallway) are near 0 on the same offset setting,
 * so this one is the Final Bowser lever's own: the beeps come later by minus the mean of the last 8 lever presses (these two
 * to start with; clamped to 3 frames). Kept in this browser (tot-fb14press). */
/* v87: one of the per-lever corrections (page_template.html leverBias: Final Bowser, Duplighosts); each press is kept as the
 * runner's own error against the beep (the measured error minus the correction the beeps had), so the correction does not
 * decay to 0 as the presses come in on time (v86 kept the error against the target) */
function fb14PressList() { return typeof leverList === 'function' ? leverList('fb14') : []; }
// v101: T1's skip A has its own store (page_template.html LEVER_STORE.fb14sk); the beeps of a skip plan use its correction
function fb14Bias(id) { return typeof leverBias === 'function' ? leverBias(id || fb14CurLever()) : 0; }
function fb14PressAdd(err, id) { return typeof leverAdd === 'function' ? leverAdd(id || 'fb14', err) : []; }
const fbPressT = (F, id) => FB14.t0 + (F - 1.7 + num('off') + fb14Bias(id)) * fbRate() - num('vlag');
/* v101: Settings "Final Bowser T1: Confirm Cloud Nine on the beep" (s-fbc9): 'bar' keeps the v100 lever (the Cloud Nine press,
 * read from the bar, its message plays out); the default 'skip' makes the A that skips the message T1's lever. The skip phase:
 * Cloud Nine is in the states (its confirm read), the skip not read yet, the message window not over, T2's Charge not seen. */
const fb14SkipMode = () => !(typeof $ === 'function' && $('s-fbc9') && $('s-fbc9').value === 'bar');
function fb14SkipPhase() {
  if (!fb14SkipMode() || !FB14.on || !FB14.pT || FB14.pT[1] == null || !FB14.P || FB14.P[1] == null || FB14.sk != null || (FB14.M && FB14.M[2] != null) || FB14.hit) return false;
  return FB14.skTestNow != null || FB14.t0 == null || fbPic(performance.now()) < fb14SkipBase() + FB14_SKIP.hi + 40;
}
const fb14SkipBase = () => (FB14.box && FB14.box.P != null ? FB14.box.P : FB14.P[1]);
/* the frames a skip plan may target: FB14_SKIP_M in from each end of the message; before the box is seen its P is Cloud Nine's
 * reading, which comes late when the T1 search loads the page (the runner now confirms Cloud Nine during it: e2e 9e3779b9
 * read +6, 1234abcd +3; the box onset read -1.5 .. -2 raw on both): the top end FB14_SKIP_LATE more in until the box shows */
const FB14_SKIP_LATE = 6, FB14_DNMIN = 176;
function fb14SkipWin() { const b = FB14.box && FB14.box.P != null, B0 = fb14SkipBase(); return [B0 + FB14_SKIP.lo + FB14_SKIP_M, B0 + FB14_SKIP.hi - FB14_SKIP_M - (b ? FB14.box.gap || 0 : FB14_SKIP_LATE)]; }
const fb14CurLever = () => (fb14SkipPhase() ? 'fb14sk' : 'fb14');
/* ---- the route: the Final Bowser steps (page_template.html ENDGAME) ---- */
const fb14Step = () => { const s = isRoute() && RT()[routeStep]; return s && s.fb14 ? s : null; };
/* ---- the lock (a Charge read with the aura profile): hypotheses -> states ---- */
/* v82: the doubt a lock starts with. A read that only just clears the lock (ratio under 3.5: the Final Bowser locks of these
 * logs read 2.3-2.6, the Jr. Troopa / Hallway ones 3-5), whose placement one frame off scores almost as well (within 10%),
 * or that contradicts the carried states (none of them drew its rays: one of the two reads is wrong, or the turn went off
 * the model) starts doubtful; the coin then confirms it (or not) as for any lock. 50%+ = no beeps until it has. */
function fb14Prior(res, contra) {
  const top = res && res.top, a = top && top[0], b = top && top[1], ratio = a && b && b.sc > 0 ? a.sc / b.sc : (CHG.info && CHG.info.best ? CHG.info.best.ratio : 9);
  const ps = res && res.placeScores, sc = ps ? [ps[0], ps[-1], ps[1]].filter(x => x != null).sort((x, y) => y - x) : null, close = sc && sc.length > 1 && sc[1] / sc[0] > 0.9;
  // v89: a lock on the RNG stream after this attempt's last lock (searched there, or found by the full search and on it)
  const sst = res && res.stream ? res.stream.steps : res && a && FB14.stream ? fbStreamSteps(a.seed) : -1;
  if (sst >= FBS_LO - 48) return { d: ZW_BG0, ratio: +(+ratio).toFixed(2), stream: sst, contra: !!contra };
  let d = ZW_BG0; if (ratio < 3.5) d = Math.max(d, Math.min(0.42, 0.05 + (3.5 - ratio) * 0.3)); if (close) d = Math.min(0.49, d + 0.1); if (contra) d = Math.max(d, 0.5);
  return { d: +d.toFixed(3), ratio: +(+ratio).toFixed(2), close: !!close, contra: !!contra };
}
function fb14Lock(res) {
  const tL0 = performance.now(), H = res.fb1 && res.fb1.hyps, stp = fb14Step(), trig0 = [FB14.trigTurn, FB14.trigStep];
  // v91 (A 153.4 s): the runner moved the route while the rays were read: the turn is theirs
  // v92 (e2e 5eed0fb2: the route moved by a screen during T1's read, and the T1 lock was taken as T2's): only a move of the
  // runner's own (a click after the burst) is theirs; one by a screen or a burst is not
  const userMoved = stp && FB14.trigStep != null && routeStep !== FB14.trigStep && st.userStepT != null && FB14.tTrig != null && st.userStepT >= FB14.tTrig;
  if (stp && FB14.trigStep != null && routeStep !== FB14.trigStep && !userMoved) slog('fb14TurnKept', { turn: FB14.trigTurn, step: routeStep, trigStep: FB14.trigStep });
  const turn = userMoved ? stp.fb14 : FB14.trigTurn || (stp ? stp.fb14 : 1); FB14.trigTurn = null; FB14.trigStep = null;
  if (!H || !H.hy.length) { FB14.why = 'no hypotheses from the rays'; fb14Show(); return; }
  const rate = chgRate(), P = fb2Patterns(), first = !FB14.on || FB14.t0 == null;
  FB14.menuT = CHG.menuSince || null;      // the bar up in Mario's menu before this Charge (charge_live.js chgFrame)
  const trigT = res.trigT != null ? res.trigT : CHG.trig.t;     // (the reader may have been reset for the next Charge meanwhile)
  if (first) { FB14.rate = rate; FB14.t0 = trigT - 16 * rate; }
  if (first && window.__fb14seeds) fb14TruthZero(FB14.t0);     // (diagnostic: tests)
  const M = first ? 0 : Math.round((trigT - FB14.t0) / fbRate() - 16) + (res.joint && res.joint.dM ? res.joint.dM : 0);   // (fb14Joint: the frame the Charges' rays agree on)
  FB14.t0 = trigT - (M + 16) * fbRate();            // the burst fixes the clock again (drift)
  const seen = new Set(); const hadCarry = !first && FB14.states.length > 0;
  // the menu's coin before the Charge: back to 1 s after the bar came up for that menu (at most 15 s)
  let menuF = FB14.menuT != null ? Math.min(M, Math.max(M - 450, Math.ceil(fbPic(FB14.menuT) + 30))) : M;
  const back0 = (x0, F0, q, c, pa) => { const r = fbBackShines(x0, F0, q, c, pa, menuF); return { ok: r.ok, sh: r.sh.sort((a, b) => a - b), from: Math.min(menuF, F0) }; };
  // v87: the fresh fits are built only when no carried state drew these rays (about 1 s on the page's thread)
  const buildFresh = () => {
  let fresh = [];
  // the fits x their aura splits, the likeliest FB14_COMBOS by weight (0.8% of the best keeps thousands of fits)
  const combos = [];
  // with the joint patterns: every kept pattern on its share of this Charge's best fits (a pattern the coin may still
  // prefer must not be crowded out by the joint score's favourite)
  const hyJ = J ? H.hy.slice().sort((x, y) => y.sc - x.sc).slice(0, Math.max(4, Math.ceil(FB14_COMBOS / J.keep.size))) : null;
  if (J) for (const h of hyJ) { const sig = Math.max(1, FB14_SIG * H.best), wf = Math.exp((h.sc - H.best) / sig);
    for (const [k, d] of J.keep) { const aura = new Array(20); for (let j = 0; j < 20; j++) aura[j] = +k[mod20(M + 13 + j)]; combos.push([h, { aura, w: wf * Math.exp(d / Math.max(1, FB14_JSIG * J.tot)) }]); } }
  for (const h of (J ? [] : H.hy)) for (const AV of fbAuraVariants(h, H.best)) combos.push([h, AV]);
  // v105: the seed and the next coin after the rays are each split's own (fbEnd48): the kernel's s48 / nc48 are its best split's,
  // and a split that moves a count between the window's once- and twice-seen residues (or across a coin) ends elsewhere
  // (e2e 1234abcd T1: the true split tied the best, its seed after the rays differed: no state of the lock followed the game).
  // A split whose coins do not run as its fit assumes (q, the second coin) is out (the kernel's esc check, per split now).
  const x0a = Math.imul(((H.a >>> 0) - 1) >>> 0, 0x6A76AE6D) >>> 0, endC = new Map();
  const endOf = (h, c) => { const k = h.p + ':' + h.q + ':' + h.br + ':' + c.join(''); let E = endC.get(k); if (E) return E; const pa = (() => { const ph = P.list[h.p].ph[0]; return [(((ph[0] - M) % 130) + 130) % 130, (((ph[1] - M) % 220) + 220) % 220]; })();
    let x0 = x0a; for (let i = fbBolts(M + 13, pa); i; i--) x0 = Math.imul((x0 - 1) >>> 0, 0x6A76AE6D) >>> 0;   // before frame M + 13's bolts
    E = fbEnd48(x0, M, h.q, c, pa); E.ok = h.br ? !E.shq : (h.q + 24 >= 48 || E.shq); endC.set(k, E); return E; };
  combos.sort((x, y) => y[1].w - x[1].w);
  const okC = []; let nOut = 0;
  for (const cb of combos) { if (!J && okC.length >= FB14_COMBOS) break; const [h, AV] = cb, c = new Uint8Array(20); for (let j = 0; j < 20; j++) c[mod20(M + 13 + j)] = AV.aura[j]; AV.E = endOf(h, c); if (AV.E.ok) okC.push(cb); else nOut++; }
  if (nOut) slog('fb14SplitCoinOut', { turn, out: nOut, kept: okC.length, of: combos.length });
  const wTop = okC.length ? okC[0][1].w : 1;
  for (const [h, AV0] of okC) {
    { const AV = { aura: AV0.aura, w: AV0.w / wTop }, E = AV0.E, s48 = E.s, nc48 = E.nc - (M + 13);
    const c = new Uint8Array(20); for (let j = 0; j < 20; j++) c[mod20(M + 13 + j)] = AV.aura[j];
    for (const ph of P.list[h.p].ph) {
      const pa = [(((ph[0] - M) % 130) + 130) % 130, (((ph[1] - M) % 220) + 220) % 220];
      for (const [l, wl] of FB14_LAGS) {
        const key = s48 + ':' + nc48 + ':' + c.join('') + ':' + pa[0] + ':' + pa[1] + ':' + l; if (seen.has(key)) continue; seen.add(key);
        const F0 = M + 13; let x0 = Math.imul(((H.a >>> 0) - 1) >>> 0, 0x6A76AE6D) >>> 0;   // the seed before A's base-angle draw
        for (let i = fbBolts(F0, pa); i; i--) x0 = Math.imul((x0 - 1) >>> 0, 0x6A76AE6D) >>> 0;   // before frame 0's bolts
        const B = back0(x0, F0, F0 + h.q, c, pa);
        for (const [rg, wr] of fb14RgList()) fresh.push(fbNew({ s: s48 >>> 0, nc: M + 13 + nc48, f: M + 61, c, ph: pa, l, rg, w: wr * wl * AV.w * (B.ok ? 1 : 1e-3), from: B.from, sh: B.sh.concat(E.sh), key: key + ':' + rg, tag: turn }));
      }
    }
    }
  }
  // the aura pattern is the fight's: a fresh fit after an earlier lock keeps only the patterns the carried states still
  // hold (when any is among them)
  if (!J && !first && FB14.states.length) { const cs = new Set(FB14.states.map(S => S.c.join(''))), f2 = fresh.filter(S => cs.has(S.c.join(''))); if (f2.length) fresh = f2; slog('fb14AuraKeep', { turn, fits: fresh.length, of: seen.size }); }
  if (window.__fb14seeds) FB14.tCombos = combos;     // (diagnostic: v105 fb14TruthLock)
  return fresh; };
  const J = res.joint && res.joint.keep && res.joint.keep.size ? res.joint : null;
  // v87: a T2 / T4 Charge held for the narrowed search (fb14ChgCands): the carried states get it now, at the shifts whose
  // stream drew these very rays (all of FB14_CHGD when none did)
  let held = null, mkHeld = null, heldPre = false; const N14 = typeof CHG !== 'undefined' ? CHG.narrow14 : null;
  if (!first && FB14.pendChg && N14 && N14.M === FB14.pendChg.M) {
    const pc = FB14.pendChg, a = H.a >>> 0; N14.used = true; FB14.pendChg = null;
    const ds = new Set(); for (const [x, set] of N14.dmap) if ((fbAdv(x) >>> 0) === a) for (const d of set) ds.add(d);
    const dsel = ds.size ? FB14_CHGD.filter(([d]) => ds.has(d)) : FB14_CHGD;
    // v92: with the burst's precompute only the states whose stream drew these rays at that shift are held (the rest
    // cannot match: 60000 held states took 1.6 s to check on D T2); every one again if none of those matches
    const Pp = N14.pre && N14.pre.ref === FB14.states && N14.pre.n === FB14.states.length && N14.pre.i >= N14.pre.n ? N14.pre : null;
    mkHeld = filt => { let h = [];
      FB14.states.forEach((S, i) => { for (const [d, wd] of dsel) { const F = pc.M + d - S.l; if (S.f > F + 13) continue;
        if (filt) { const k = filt.ds.indexOf(d), j = i * filt.ds.length + k; if (!filt.ok[j] || (fbAdv(filt.xs[j]) >>> 0) !== a) continue; }
        const T = fbClone(S); T.w = S.w * wd; T.mk = pc.M + d; fbInputEv(T, 'chg', F, pc.turn); h.push(T); } });
      if (pc.turn === 4) h = fb14WaveSplit(h);
      slog('fb14Held', { turn: pc.turn, M: pc.M, d: dsel.map(x => x[0]), states: h.length, pre: !!filt }); return h; };
    if (window.__fb14seeds) fb14Truth('preheld' + pc.turn);     // (diagnostic: v105)
    held = mkHeld(Pp); heldPre = !!Pp;
  }
  let keep = null, how = 'fresh', fresh = [];
  let carriedL = held || FB14.states;
  if (!first && carriedL.length) {      // the carried states: those that drew these very rays
    const a = H.a >>> 0; let match = [];
    const matchAll = () => {
    // v87: the seed on the frame after the rays only (v86 also asked for the coin's phase: the game's state was among the
    // fits with its coin 11 frames off, and the first v87 build dropped it and planned T2 at 99.85% on a frame Bowser hit)
    const ends = new Set(H.hy.map(h => String(h.s48 >>> 0)));
    for (const S of carriedL) {
      const m = (S.mk != null ? S.mk : M) - S.l;      // (v91: a held state is already its own copy: not cloned again)
      if (S.f > m + 13) {       // v87: a lock that landed after the state ran past the rays: the seeds it kept then
        const ca = S.ca; if (!ca || ca.mk !== S.mk || ca.a !== a) continue;
        if (ca.s61 != null) { if (ends.has(String(ca.s61))) match.push(S); continue; }
        continue;
      }
      const T = held ? S : fbClone(S);
      fbRun(T, m + 13); let x = T.s; for (let i = fbBolts(m + 13, T.ph); i; i--) x = fbRi(x, 359);
      if ((fbAdv(x) >>> 0) !== a) continue;
      fbRun(T, m + 61); if (!ends.has(String(T.s >>> 0))) { if (window.__fb14seeds) { FB14.tEnds = (FB14.tEnds || 0) + 1; if (fb14IsTrueS(T)) FB14.tEndsTrue = (FB14.tEndsTrue || 0) + 1; } continue; }
      match.push(T);       // (v87: the matched states keep their coin history)
    } };
    matchAll();
    if (!match.length && heldPre) { held = carriedL = mkHeld(null); heldPre = false; match = []; matchAll(); }     // v92: the prefilter's fallback
    if (window.__fb14verifyHeld && heldPre) { const m0 = match; held = carriedL = mkHeld(null); match = []; matchAll(); slog('fb14HeldVerify', { pre: m0.length, all: match.length, same: m0.length === match.length }); }   // (diagnostic: tests)
    if (match.length) { keep = match; how = 'carried';
      // v87: the clock follows the Charge frame the matched states vote for, weighed by the coin so far, and only when
      // 60%+ of that weight agrees
      const sv = [FB14.states, FB14.gone, FB14.allOutLogged]; FB14.states = match; const wgM = fb14Weigh(M + 61); [FB14.states, FB14.gone, FB14.allOutLogged] = sv;
      // v93 (log 00700c7e T4: 16 of 1388 carried states drew the rays, the coin then ruled out all 16: "carried", then
      // fb14CarryGone, no plan): a carry the coin already rules out is no carry. The lock goes on as a fresh one on these rays
      // (on the narrowed read, the refine's whole fit list: the stream after the last lock), with the turn's inputs replayed
      if (!wgM.list.length) { slog('fb14CarryWeak', { turn, M, matched: match.length, carried: carriedL.length }); match = []; keep = null; how = 'fresh'; }
    }
    if (match.length) {
      const by = {}; let tot = 0; for (const T of match) { const v = T.w * (T.lw == null ? 1 : T.lw); by[T.mk] = (by[T.mk] || 0) + v; tot += v; }
      const Mt = +Object.keys(by).sort((x, y) => by[y] - by[x])[0], share = tot > 0 ? by[Mt] / tot : 0;
      if (Mt !== M && Number.isFinite(Mt)) { if (share >= 0.6) { slog('fb14ClockFix', { turn, M, Mt, share: +share.toFixed(3) }); FB14.t0 = trigT - (Mt + 16) * fbRate(); } else slog('fb14ClockKept', { turn, M, Mt, share: +share.toFixed(3) }); }
    }
    slog('fb14Check', { turn, M, carried: carriedL.length, matched: match.length, held: held ? held.length : null, endsMiss: FB14.tEnds, endsMissTrue: FB14.tEndsTrue }); FB14.tEnds = FB14.tEndsTrue = undefined;
    if (!match.length && held) FB14.states = fb14Cap(held);
  }
  const tL1 = performance.now();
  // v92: the light fits of a narrowed read (end seeds only) cannot build fresh states: the placement / joint refine
  // (fb14Refine) fetches the whole list and locks again; the turn is decided then, as before this call
  if (!keep && H.light) { [FB14.trigTurn, FB14.trigStep] = trig0; slog('fb14LightNoMatch', { turn, M, ms: Math.round(tL1 - tL0) }); return 'light'; }
  if (!keep) { fresh = buildFresh(); keep = fresh; if (window.__fb14seeds) FB14.tLockCtx = { H, M, P, J: !!J }; }
  const sum = keep.reduce((x, S) => x + S.w, 0); keep.forEach(S => { S.w /= sum; S.lw = 1; S.err = 0; });
  // the menu's coin before the Charge weighs the fits now (fbBackShines), before any are dropped for the cap: with the
  // weights all equal an even sample would lose the true one (T2 render: 1605 fits x their lightning phases x 2 lags)
  if (window.__fb14dbg) { const T = window.__fb14truth; window.__fb14dbg.push({ pre: true, turn, M, n: keep.length, truth: T ? keep.filter(S => S.s === T.s && (T.nc == null || S.nc === T.nc)).map(S => ({ c: Array.from(S.c).join(''), ph: S.ph, l: S.l, w: S.w, sh: S.sh })) : null }); }
  FB14.states = keep; let n0 = keep.length;
  if (how === 'fresh' && keep.length > 1) { let Wg = fb14Weigh(M + 61);
    // v92 (e2e 5eed0fb2 T2 after T1's hit: the bar stayed up through Bowser's attack and the Life Shroom, 18 s; the
    // menu's coin window took in the revive's shines, which no menu draw explains, and every fit died: no T2 plan): when
    // the menu's coin leaves no fit, the fits are built again without it (the coin after the Charge still weighs them)
    if (!Wg.list.length && menuF < M) { slog('fb14MenuCoinDropped', { turn, M, menuF, fits: keep.length }); menuF = M; seen.clear(); FB14.gone = false; FB14.allOutLogged = false;
      keep = buildFresh(); const sum2 = keep.reduce((x, S) => x + S.w, 0); keep.forEach(S => { S.w /= sum2; S.lw = 1; S.err = 0; }); FB14.states = keep; n0 = keep.length; Wg = fb14Weigh(M + 61); }
    if (Wg.list.length) keep = Wg.list; }
  keep.sort((x, y) => y.w * y.lw - x.w * x.lw);
  if (keep.length > FB14_MAXH) { const top = keep[0].w * keep[0].lw, eq = keep.filter(S => S.w * S.lw >= top * 0.999);
    keep = eq.length >= FB14_MAXH ? eq.filter((S, i) => i % Math.ceil(eq.length / FB14_MAXH) === 0) : keep.slice(0, FB14_MAXH); }
  FB14.states = keep; FB14.n0 = n0;
  // v82: the prior doubt of a lock (the background's share before the coin has spoken). v81 started every lock at 5%: log
  // 1794170840652's T2 lock (2.5x) replaced a carry that matched none of its rays and planned at doubt 0.7% (70%, wrong)
  const d0 = how === 'carried' ? { d: ZW_BG0, carried: true } : fb14Prior(res, hadCarry); FB14.prior = d0;
  FB14.anchor = {};      // v96: a new lock is new evidence: its first plan sets the turn's frame again
  Object.assign(FB14, { on: true, why: null, turn, relock: null, wide: false, lockN: FB14.lockN + 1, plan: null, bg: d0.d / (1 - d0.d), bgFrom: Math.min(M + 61, menuF), how });
  FB14.doubt = d0.d; if (d0.d > ZW_BG0) slog('fb14Prior', d0);
  if (res.top && res.top[0]) fbStreamNote(res.top[0].seed, res.stream ? 'stream' : how || 'fresh');     // v89: the next Charge's window starts here
  FB14.M[turn] = M; FB14.fresh = how === 'fresh' ? { turn, F: M + 61 } : null;     // v102: an unconfirmed fresh lock (fb14DoubtFloor)
  if (res.joint && res.joint.cur) { res.joint.cur.M = M; FB14.charges = (FB14.charges || []).filter(c => c.M !== M).concat([res.joint.cur]).slice(-2); }
  // confirms the page saw before this lock landed (a slow lock): their frames from the clock the lock has just fixed
  // the inputs of this turn the page saw before this lock landed (a slow lock: the partner's confirm, T3's Jelly), onto
  // fresh states (carried ones have them already)
  if (how === 'fresh') for (const x of (FB14.inputs || []).map(x => Object.assign({}, x, { F: x.t != null ? Math.round(fbPic(x.t) - x.off) : x.F })).filter(x => x.F > M + 13 && x.turn >= turn).sort((a, b) => a.F - b.F)) { fb14Input(x.kind, x.F, x.turn, x.shifts, x.t, x.off); slog('fb14Replay', { kind: x.kind, F: x.F, turn: x.turn }); }
  const pend = (FB14.pend || []).filter(x => x.turn >= turn); FB14.pend = [];
  for (const x of pend) { const c = fbPic(x.tObs) - fb14Van(x.cat, x.src), F = Math.round(c); FB14.P[x.turn] = F; fb14Input(fb14Kind(x.turn), F, x.turn, x.shifts || (x.cat === 'S' ? FB14_SHIFTS_S : FB14_SHIFTS), x.tObs, fb14Van(x.cat, x.src)); slog('fb14LateConfirm', { turn: x.turn, F }); }
  if (window.__fb14dbg) { const T = window.__fb14truth; window.__fb14dbg.push({ turn, M, how, n: FB14.states.length, truth: T ? FB14.states.filter(S => S.s === T.s && (T.nc == null || S.nc === T.nc)).map(S => ({ c: Array.from(S.c).join(''), ph: S.ph, l: S.l, w: S.w, lw: S.lw })) : null }); }
  if (false) window.__fb14dbg.push({ turn, M, how, states: FB14.states.slice(0, 3000).map(S => ({ s: S.s >>> 0, nc: S.nc, f: S.f, l: S.l, c: Array.from(S.c).join(''), ph: S.ph, w: S.w, lw: S.lw, sh: S.sh })) });
  if (turn === 4) FB14.states = fb14WaveSplit(FB14.states);     // v87: the T4 wave's second particle order
  // v91 (B, log a53781d5: the hit of an earlier attempt kept every later plan at "hit", no log line): a fresh lock after a
  // hit (the Life Shroom revive) is this fight's seed again; its turns are planned
  if (FB14.hit && FB14.hit !== 4) { slog('fb14HitCleared', { hit: FB14.hit, turn, how }); FB14.hit = null; FB14.hpw = FB14.hpw ? { seen10: FB14.hpw.seen10, tenRun: 0, blankRun: 0, ok: {}, done: Object.assign({}, FB14.hpw.done) } : null; FB14.hitLogged = null; }
  // (v92, e2e 5eed0fb2 attempt 2: T4's lock landed after T4's confirm; the watch built anew then never saw the "10" before an
  // open turn, so T4's wave hit was never read, no "Route off", and the Peach Beam was taken: the watch keeps what it saw)
  // v98: the T2 lock's states kept (T3's re-lock on the stream from here when the carry dies or is contradicted on T3)
  if (turn === 2) { FB14.snap2 = { states: FB14.states.slice().sort((x, y) => y.w * (y.lw || 1) - x.w * (x.lw || 1)).slice(0, FB14_SNAP).map(fbClone), M }; FB14.relock = null; FB14.relockTried = false; FB14.wide = false; }
  slog('fb14Lock', { turn, M, how, hyps: H.hy.length, n: H.n, fits: FB14.n0, states: FB14.states.length, best: Math.round(H.best), a: (H.a >>> 0).toString(16), ms: { check: Math.round(tL1 - tL0), build: Math.round(performance.now() - tL1) }, stream: res.stream ? res.stream.steps : undefined });
  FB14.decide = { t: performance.now(), turn };      // v91 (logs B, E, F): every lock ends in a plan or a logged "No edge" (fb14Frame's watchdog)
  { const s1 = fb14Step(); if (s1 && s1.fb14 === 1 && s1.fb14role === 'charge') { const c1l = RT().findIndex(x => x.fb14 === 1 && x.fb14role === 'lever'); if (c1l >= 0) { slog('fb14StepByLock', { from: routeStep, to: c1l }); setStep(c1l); } } }
  if (window.__fb14seeds) { fb14Truth('lock' + turn); if (how === 'fresh' && FB14.tLockCtx) fb14TruthLock(turn, fresh); FB14.tLockCtx = null; }
  fb14Show(); return how;
}
/* The aura's split the rays cannot see: where a residue's frames have only faded or offscreen respawns (or none), the
 * counts of neighbouring residues trade with no change in the score, and the fit returns just one split (the end-to-end
 * render 1234abcd: '10110101201010201040' for the true '01110101021010201310'). The kernel lists every split of a fit
 * within the lock's tolerance (fb1alts); they are weighed by a star's chance to restart on a given frame (16 stars, 1/20
 * each: binomial) and the likeliest FB14_AV kept, each with its prior share. */
const FB14_AV = 600, FB14_BIN = [0.440, 0.371, 0.146, 0.036, 0.0061];
// each split weighed by its prior and by its score: exp((score - best) / (FB14_SIG x best)). The true fit scores within a
// few tenths of a percent of the best but not always inside 0.2% (render e2e 1234abcd: 7316 against 7354, the noise of
// one frame's respawns is ~200), so the lock keeps every fit within FB14_TOL (0.8%) and lets the score weigh them.
function fbAuraVariants(h, best) {
  const sig = Math.max(1, FB14_SIG * best), L = (h.alts && h.alts.length ? h.alts.map((aura, i) => [aura, h.altSc[i]]) : [[h.aura, h.sc]])
    .map(([aura, sc]) => ({ aura, w: aura.reduce((x, c) => x * (FB14_BIN[c] || 1e-4), 1) * Math.exp((sc - best) / sig) }));
  L.sort((x, y) => y.w - x.w); return L.slice(0, FB14_AV);
}
/* The coin before the Charge (Mario's menu): from a hypothesis' seed at the rays' frame 0 the earlier coin draws follow
 * backwards, as chgQBack does on the Hallway, now with the aura's and the lightning's draws of each frame known from the
 * hypothesis: the coin before the first one (q) came 24 frames earlier after a value < 70, 48 after one >= 70, and only
 * one of the two fits the stream (both: stop there). The rays leave the aura's split between neighbouring frames and the
 * first coin's frame partly open (T2 render 9e3779b9: 1600 states within 0.2%, the true coin frame in a minority); the
 * shines of the menu before the Charge then tell them apart. Returns the shine frames from fromF on, and whether the
 * walk was consistent. */
function fbBackShines(sR0, F0, q, c, ph, fromF) {
  const back = (x, n) => { for (let i = 0; i < n; i++) x = Math.imul((x - 1) >>> 0, 0x6A76AE6D) >>> 0; return x; };
  const per = f => fbBolts(f, ph) + c[mod20(f)] + 1;     // a menu frame's draws besides the coin
  let X = sR0, f = F0, nc = q, isR0 = true; const sh = [];
  for (let k = 0; k < 40; k++) {
    let found = null, n = 0;
    for (const gap of [24, 48]) {
      const f1 = nc - gap; if (f1 >= F0 || f1 < fromF) continue;
      // draws from just before the coin on f1 to X: the coin, f1's aura and step, the frames between, and (X just
      // before a coin draw) that frame's bolts
      let d = 1 + c[mod20(f1)] + 1; for (let g = f1 + 1; g < f; g++) d += per(g); if (!isR0) d += fbBolts(f, ph);
      const Y = back(X, d); fbRi(Y, 100); if ((FBV >= 70) === (gap === 48)) { found = [f1, Y, FBV]; n++; }
    }
    if (n !== 1) return { sh, ok: n === 2 || nc - 24 < fromF };
    f = found[0]; X = found[1]; nc = f; isR0 = false; if (found[2] >= 70) sh.push(f);
  }
  return { sh, ok: true };
}
/* a Charge's trigger with the tracker on (T2, T4): the carried states get that Charge's rays (their creations), so the
 * new lock can be checked against them; T3's Jelly and the partner confirms come in the same way */
function fb14Input(kind, Fc, turn, shifts, tRef, off) {
  if (kind !== 'chg') { FB14.inputs = (FB14.inputs || []).filter(x => !(x.kind === kind && x.turn === turn)).concat([{ kind, F: Fc, turn, shifts, t: tRef, off }]); }   // (replayed onto a lock that lands later)
  if (!FB14.on) return;
  const out = [];
  for (const S of FB14.states) for (const [d, wd] of (shifts || [[0, 1]])) {
    const F = Fc + d - S.l; if (S.f > F + (kind === 'chg' ? 13 : kind === 'jelly' ? FB14_JELLY : kind === 'skip' ? FB14_SKIP.ai : 13)) continue;   // too late for this state (should not happen: the horizon trails the inputs)
    const T = shifts ? fbClone(S) : S; T.w = S.w * wd; if (kind === 'chg') T.mk = Fc + d;
    fbInputEv(T, kind, F, turn);
    out.push(T);
  }
  if (shifts) FB14.states = fb14Cap(kind === 'chg' && turn === 4 ? fb14WaveSplit(out) : out);
  slog('fb14Input', { kind, F: Fc, turn, states: FB14.states.length });
  if (window.__fb14seeds) fb14Truth('input-' + kind + turn);     // (diagnostic: v105)
}
function fbInputEv(T, kind, F, turn) {
  if (kind === 'chg') { fbEv(T, { k: 'chg', f: F + 13 }); fbEv(T, { k: 'chg', f: F + 16 }); }
  else if (kind === 'jelly') fbEv(T, { k: 'jelly', f: F + FB14_JELLY });
  else if (kind === 'cn') { T.p1 = F; for (let i = 200; i < 210; i++) fbEv(T, { k: 'puff', f: F + i }); fbEv(T, { k: 'ai', f: F + FB14_AIAFTER.cn, turn }); }
  else if (kind === 'nothing') fbEv(T, { k: 'ai', f: F + FB14_AIAFTER.nothing, turn });
  else if (kind === 'skip') fbSkipEv(T, F, turn);
}
/* v101 (fb2_route/cn_skip.py, emulator, 3 seeds x 2 W x 3 three-chances patterns): an A on Cloud Nine's confirm P + k closes its
 * message ("てきのこうげきが はずれやすくなったぞ!", on screen from P + 255) for k in 255 .. 314, and Bowser's AI then draws on the
 * A's frame + 17 (else on P + 332: the message closes itself on + 315); no draw in between but the aura, bolts, coin and step, no
 * speech blip on the one A. So the skip moves the AI one frame per frame across a 60-frame window: a lever. */
const FB14_SKIP = { lo: 255, hi: 314, ai: 17, nat: 332 };
function fbSkipEv(T, F, turn) {
  // the window: the box's own onset once read (the same reading chain as the skip: a common offset cancels), else the state's P
  const B = FB14.box && FB14.box.P != null ? FB14.box.P : T.p1;
  if (B == null || F < B + FB14_SKIP.lo || F > B + FB14_SKIP.hi) return;      // before the box: ignored; after it closed: nothing to skip
  const i = T.ev.findIndex(e => e.k === 'ai' && e.turn === turn); if (i < 0) return;
  T.ev.splice(i, 1); fbEv(T, { k: 'ai', f: F + FB14_SKIP.ai, turn });
}
/* v87: the true state ranked 3000-7000 by prior and was cut after the x5 Do Nothing shifts: the cap keeps the likeliest by
 * prior and coin together (w x lw), FB14_MAXH 12000 */
function fb14Cap(L) {
  const by = new Map(); for (const S of L) { const k = S.s + ':' + S.nc + ':' + S.f + ':' + S.l + ':' + S.ph.join(',') + ':' + S.c.join('') + ':' + S.wv + ':' + S.lv + ':' + S.rg + ':' + (S.wb ? 1 : 0) + ':' + Object.keys(S.out).map(k => k + S.out[k].atk).join('') + ':' + S.resp.join('') + ':' + S.ev.map(e => e.k + e.f).join(','); const o = by.get(k); if (o) o.w += S.w; else by.set(k, S); }
  const A = [...by.values()].sort((x, y) => y.w * (y.lw || 1) - x.w * (x.lw || 1)); return A.length > FB14_MAXH ? A.slice(0, FB14_MAXH) : A;
}
/* v87: T4's wave in its second particle order (FB14_WAVE_POST_B): each state not yet split becomes both */
function fb14WaveSplit(L) {
  const out = [];
  for (const S of L) { if (S.wb != null) { out.push(S); continue; } const B = fbClone(S); S.wb = 0; S.w *= 1 - FB14_WAVEB_P; B.wb = 1; B.w *= FB14_WAVEB_P; out.push(S, B); }
  return out;
}
/* v87 (e2e 1234abcd / 9e3779b9): the T2 full search took 4-9 s and landed after the Do Nothing confirm. With the seed carried
 * the T2 / T4 Charge is searched on the carried stream instead (charge_live.js chgSearch opts.cands, as T6): every carried
 * state at each Charge frame FB14_CHGD gives the seed before A's base-angle draw (14-22 distinct seeds in the runs). The
 * Charge's input is held meanwhile (fb14Held), so the states have not run past it when the narrowed lock lands. */
function fb14ChgCands() {
  const pc = FB14.pendChg; if (!pc || !FB14.on || !FB14.states.length || typeof CHG === 'undefined') return null;
  const dmap = new Map(), ds = FB14_CHGD.map(x => x[0]).sort((a, b) => a - b), P = FB14.pre, tc = performance.now();
  if (P && P.M === pc.M && P.ref === FB14.states && P.n === FB14.states.length) {      // v92: built during the burst
    while (P.i < P.n) { const S = P.ref[P.i], B = fbClone(S), nd = P.ds.length;       // (the rest of it, if the burst was short)
      for (let k = 0; k < nd; k++) { const m = pc.M + P.ds[k] - S.l; if (B.f > m + 13) continue; fbRun(B, m + 13); let x = B.s; for (let j = fbBolts(m + 13, B.ph); j; j--) x = fbRi(x, 359); P.xs[P.i * nd + k] = x >>> 0; P.ok[P.i * nd + k] = 1; }
      P.i++; }
    for (let i = 0, nd = P.ds.length; i < P.n * nd; i++) if (P.ok[i]) { const x = P.xs[i]; let st = dmap.get(x); if (!st) dmap.set(x, st = new Set()); st.add(P.ds[i % nd]); }
    CHG.narrow14 = { M: pc.M, turn: pc.turn, done: false, n: dmap.size, dmap, pre: P };
    slog('fb14ChgCands', { M: pc.M, turn: pc.turn, states: FB14.states.length, cands: dmap.size, pre: { ms: Math.round(P.ms), wall: P.wall != null ? P.wall : null, here: Math.round(performance.now() - tc) } });
    return dmap.size ? [...dmap.keys()] : null;
  }
  for (const S of FB14.states) {
    const B = fbClone(S);       // (no Charge in the state yet: one stream for every shift)
    for (const d of ds) { const m = pc.M + d - S.l; if (B.f > m + 13) continue; fbRun(B, m + 13); let x = B.s; for (let i = fbBolts(m + 13, B.ph); i; i--) x = fbRi(x, 359); x >>>= 0; let st = dmap.get(x); if (!st) dmap.set(x, st = new Set()); st.add(d); }
  }
  CHG.narrow14 = { M: pc.M, turn: pc.turn, done: false, n: dmap.size, dmap };
  slog('fb14ChgCands', { M: pc.M, turn: pc.turn, states: FB14.states.length, cands: dmap.size });
  return dmap.size ? [...dmap.keys()] : null;
}
/* v89: the stream prior. Every Final Bowser Charge lock of this attempt (T1's, a carried one, a stream one) is kept as the
 * seed its rays start from (FB14.stream); a later Charge of the same attempt draws its rays FBS_LO..FBS_HI LCG steps after it
 * on one RNG stream (console 2026-11-09: T1 -> T2 2369 and 2376; a turn draws 1100-1250 per 100 frames, the T1 -> T2
 * stretch with Bowser's hit, Cloud Nine and the menus 2300-2500; FBS_HI leaves room for T1 -> T4 when T2 / T3 were not
 * read). So when the carry is gone (Bowser's hit is not modelled) or there is none, that window is searched first, on its
 * own threshold (FBS_RATIO, measured on wrong windows: README v89), before the full search. Kept across fb14CarryGone, reset
 * with the attempt (fb14Reset) and after FBS_MAXMS. */
const FBS_LO = 500, FBS_HI = 9000, FBS_RATIO = 1.5, FBS_MIN = 3000, FBS_MAXMS = 8 * 60000;
/* v91 (logs 032af46e / a53781d5 / 28b4ae32 / 8576a774): the console streams between Charges ran 77-89 LCG steps a second
 * (2442 / 2443 steps in 31.5 s, T1 -> T2 with a death and the Life Shroom; 7409 in 83.7 s across a retry; 3745 T2 -> T4).
 * The window reaches FBS_PERS steps a second since the kept lock (x 1.3, + 2500 for a turn's draws and Bowser's hit
 * path), never under FBS_HI, at most FBS_HIMAX (beyond it, ~3.5 min, no window: the full search) */
const FBS_PERS = 100, FBS_HIMAX = 30000;
function fbStreamHi(S, now) { S = S || FB14.stream; if (!S) return FBS_HI; const sec = Math.max(0, ((now != null ? now : performance.now()) - S.t) / 1000); return Math.max(FBS_HI, Math.round(1.3 * FBS_PERS * sec + 2500)); }
function fbStreamWin(now) { const S = FB14.stream; if (!S) return null; const hi = fbStreamHi(S, now); if (performance.now() - S.t > FBS_MAXMS || hi > FBS_HIMAX) return null; return Object.assign({}, S, { hi }); }
function fbStreamNote(seed, how) {
  FB14.stream = { seed: seed >>> 0, t: performance.now(), how, n: ((FB14.stream && FB14.stream.n) || 0) + 1 };
  slog('fbStreamNote', { seed: (seed >>> 0).toString(16).padStart(8, '0'), how });
}
function fbStreamOk() { const S = FB14.stream; return !!S && performance.now() - S.t < FBS_MAXMS; }
/* the window's seeds (before A's base-angle draw) after the kept lock */
function fbStreamCands(S) { S = S || FB14.stream; const out = new Array((S.hi || FBS_HI) - FBS_LO); let x = chgFwd(S.seed, FBS_LO); for (let i = 0; i < out.length; i++) { out[i] = x; x = (Math.imul(x, 0x5D588B65) + 1) >>> 0; } return out; }
/* LCG steps from the kept lock to seed (within FBS_HI + 48), or -1 */
function fbStreamSteps(seed, S) { S = S || FB14.stream; if (!S) return -1; let x = S.seed >>> 0; const t = seed >>> 0; for (let i = 0, n = Math.max(S.hi || 0, FBS_HI, FBS_HIMAX) + 48; i <= n; i++) { if (x === t) return i; x = (Math.imul(x, 0x5D588B65) + 1) >>> 0; } return -1; }
/* v87: hold the pending Charge's input while its narrowed search may still lock on the carried stream */
function fb14Held() {
  const pc = FB14.pendChg; if (!pc || !FB14.on || typeof CHG === 'undefined' || typeof chgP !== 'function' || chgP().id !== 'fb1') return false;
  const N = CHG.narrow14;
  if (!N || N.M !== pc.M) return CHG.state === 'maps';
  if (!N.done) return CHG.state === 'maps' || CHG.state === 'search';
  return !!(N.ok && !N.used && (CHG.state === 'search' || FB14.refining));
}
/* v87 (tests only: window.__fb14seeds = { off, s: [true seeds], ... }): whether the game's state is among the states */
function fb14IsTrue(S) { const T = window.__fb14seeds; if (!T) return false; const i = S.f + S.l - T.off; return i >= 0 && i < T.s.length && (S.s >>> 0) === (T.s[i] >>> 0); }
// v104 (diagnostic): the seed alone on one frame is shared by many states (1095 of the carried states at once in the e2e: the
// same seed with another coin timer or lightning phase; the seed only counts the draws): a state is the truth when a copy of
// it meets the true seed on every frame of the next 90 (as far as the trace reaches)
function fb14TruthScore(S, dd) { const T = window.__fb14seeds, C = fbClone(S); let n = 0, m = 0, first = null;
  while (C.f < S.f + 90) { const i = C.f + C.l - T.off + (dd || 0); if (i < 0 || i >= T.s.length) break; n++; if ((C.s >>> 0) === (T.s[i] >>> 0)) m++; else if (first == null) first = C.f - S.f; fbStep(C); } return { r: n ? m / n : 0, n, first, dd: dd || 0 }; }
function fb14TruthScoreD(S) { let b = null; for (let dd = -3; dd <= 3; dd++) { const x = fb14TruthScore(S, dd); if (!b || x.r > b.r) b = x; } return b; }
function fb14TruthTop(L) { const sc = (L.length > 1500 ? L.slice(0, 1500) : L).map(S => [fb14TruthScore(S, 0), S]).sort((a, b) => b[0].r - a[0].r); return sc.slice(0, 3).map(([x, S]) => [+x.r.toFixed(2), x.first, x.dd, S.l, S.p1, +(S.w * (S.lw || 1)).toExponential(1)]); }
function fb14IsTrueS(S) { if (!fb14IsTrue(S)) return false; const T = window.__fb14seeds, C = fbClone(S);
  while (C.f < S.f + 90) { fbStep(C); const i = C.f + C.l - T.off; if (i >= T.s.length) break; if ((C.s >>> 0) !== (T.s[i] >>> 0)) return false; } return true; }
// v102 (tests only): a fresh lock restarts the clock on its own turn's Mario confirm; the truth offset follows (the harness's
// zt: each turn's confirm on the page's time and its global step). v101's trace kept T1's offset after a hit: "no true state"
function fb14TruthZero(t0) { const T = window.__fb14seeds; if (!T || !T.zt || !T.zt.length) return; let b = null; for (const z of T.zt) if (!b || Math.abs(z[0] - t0) < Math.abs(b[0] - t0)) b = z; if (Math.abs(b[0] - t0) > 3000) return; T.off = -b[1]; slog('fb14TruthZero', { off: T.off, dtMs: Math.round(b[0] - t0) }); }
function fb14Truth(at) { if (!window.__fb14seeds) return; const L = FB14.states, n = L.filter(fb14IsTrue).length; let tot = 0, tw = 0; for (const S of L) { const v = S.w * (S.lw || 1); tot += v; if (fb14IsTrue(S)) tw += v; } slog('fb14Truth', { at, states: L.length, trueStates: n, strict: L.filter(fb14IsTrueS).length, trueShare: tot ? +(tw / tot).toFixed(4) : 0 }); fb14TruthPh(at); }
/* ---- the coin: shines (clock frame of the draw) and the stretches the coin was watched ---- */
// the coin is kept in page time (ms) and read on the clock when the states are weighed: a lock re-anchors the clock, and
// the shines of the menu the lock was searched in still count
function fb14Tap(t) { FB14.taps.push(t); if (FB14.taps.length > 400) FB14.taps.shift(); }
/* v91 (logs 032af46e / a53781d5 / 28b4ae32, clips 18-42-33 / 18-44-28 / 18-51-42): the runner retried phase 2 three times
 * and the page never saw a new attempt (FB14_NEWATTEMPT counts 120 s between Charges; these were 74-84 s apart): the old
 * attempt's T1 confirm time (pT), its hit (FB14.hit) and its clock stayed, so the next T1 Cloud Nine was never read
 * (pT[1] set), every plan said "hit" without a log line, and a T1 Charge was taken as T2 / T4. In the fight the bar is
 * never gone longer than ~25 s (Bowser's turn with a Life Shroom revive, the Peach Beam); between attempts it was gone
 * 44-75 s. The bar coming back after FB14_GAPNEW on a Final Bowser step = a new attempt: the route goes to T1's Charge
 * (the reader arms with the T1 profile) and the attempt's state is dropped (the RNG stream is kept: it runs on). */
const FB14_GAPNEW = 35000; let fb14BarGone = 0;
function fb14GapCheck(t, present) {
  if (!present) { if (!fb14BarGone) fb14BarGone = t; return; }
  const g = fb14BarGone ? t - fb14BarGone : 0; fb14BarGone = 0;
  if (g < FB14_GAPNEW || !isRoute()) return;
  const s = RT()[routeStep], c1 = RT().findIndex(x => x.fb14 === 1 && x.fb14role === 'charge');
  if (!s || c1 < 0 || !(s.fb14 || s.turn === 'fb2_pb' || s.turn === 'fb2_k')) return;
  if (!(FB14.lastBurst || FB14.t0 != null || FB14.stream)) return;      // nothing of a Final Bowser attempt yet
  if (routeStep === c1 && !FB14.on && FB14.t0 == null) return;
  slog('fb14NewAttempt', { from: routeStep, why: 'bar gone', gapMs: Math.round(g) }); fb14Reset('new attempt'); setStep(c1);
  if (typeof CHG !== 'undefined' && !['search', 'maps', 'armed', 'capture', 'idle'].includes(CHG.state)) chgReset();
}
function fb14Frame(t, present) {
  if (FB14.lastT !== t) { FB14.picPrev = FB14.lastT; } FB14.lastT = t; fb14GapCheck(t, present);
  if (FB14.pendChg && !['armed', 'capture'].includes(CHG.state) && !fb14Held()) { const { M, turn } = FB14.pendChg; FB14.pendChg = null; fb14Advance(Math.min(fb14Horizon(performance.now()), M + 10)); fb14Input('chg', M, turn, FB14_CHGD); if (window.__fb14seeds) fb14Truth('chg' + turn); }
  if (FB14.rearm && !FB14.refining && ['locked', 'nolock', 'failed'].includes(CHG.state)) { const n = fb14Step(); if (n && n.fb14 === FB14.rearm && n.chg === 'fb1') { slog('fb14ReaderRearmed', { turn: n.fb14 }); chgReset(); } FB14.rearm = null; }
  // v90 (log 8cc2055f): a T1 Charge that read no lock left the reader 'nolock' on the Cloud Nine step, so T2's Charge (its bar
  // hide 25 s later) was never captured and the route stayed on T1 until the runner clicked. Once a read has given up (no
  // re-read pending), the reader arms again for the next turn's Charge, as after a lock (fb14AfterLock).
  if (fb14Step() && ['nolock', 'failed'].includes(CHG.state) && !CHG.F0 && !CHG.replay && !FB14.refining) { slog('fb14ReaderRearmed', { turn: fb14Step().fb14, why: 'after a no-lock' }); chgReset('the last Charge read gave no clear seed'); }
  if (!FB14.on && !fb14Step()) { if (FB14.p4t != null && !FB14.pb) fb14HideWatch(t, present); return; }     // v99: the T5 mark (the Peach Beam's hide) on T6's step with no carry
  fbAtkFrame(t, present); fbBoltFrame(t, present);     // v100
  fb14BoxFrame(t); fb14SkipTick();     // v101: Cloud Nine's message on screen, the skip plan
  if (present && FB14.visFrom == null) FB14.visFrom = t;
  if (!present && FB14.visFrom != null) { FB14.vis.push([FB14.visFrom, t]); if (FB14.vis.length > 200) FB14.vis.shift(); FB14.visFrom = null; }
  fb14HideWatch(t, present);
  fb14HpWatch(t, present);
  fb14EarlyPlan(t);
  if (FB14.on && (!FB14.tickT || t - FB14.tickT > 250)) { FB14.tickT = t; fb14Tick(t); }
  // v91 (logs B, E, F: a stream / carried lock, then no plan and no "No edge" for 3-25 s: an earlier attempt's or turn's
  // hit kept every plan at "hit" without a word): a lock with no decision 0.5 s after the partner's menu can be up
  { const D = FB14.decide, s = fb14Step(); if (D && s && s.fb14role === 'lever' && !V.wasOn && performance.now() - D.t > 500 && !(FB14.pT && FB14.pT[s.fb14] != null)) {
    const M = FB14.M[s.fb14]; if (M == null && (s.chg || s.fb14 === 3)) { FB14.decide = null; fb14Plan(); }     // v92: this turn's Charge not seen yet: the plan waits for it (fb14WaitCharge), a decision
    else if (M == null || fbPic(performance.now()) >= M + 90) { slog('fb14NoDecision', { turn: s.fb14, lockTurn: D.turn, on: FB14.on, hit: FB14.hit, plan: !!st.plan, doubt: +(FB14.doubt || 0).toFixed(3) }); FB14.decide = null; fb14Plan(); } } }
}
/* v82 (logs 1794169517521 and 1794170840652, clips 15-24-14 / 15-46-32): Bowser's fire hit Mario after the lever (T2 of
 * the first, T1 of the second), HP 10 -> 0 and the Life Shroom. Neither the hit nor the revive is modelled, and the revive
 * ends the route (the first fight's carry died at T3; the second planned T2 at doubt 0.7% from a fresh lock and Bowser hit
 * again). Mario's HP tens place (jrTens, the Hallway's read, console-checked there): the "1" of 10 on the steady bar
 * before the lever, blank on the steady bar for 10 frames after it = a hit. From then on: no edge for this attempt. */
function fb14HpWatch(t, present) {
  /* v86: the watch follows the last lever confirmed (T1-T3), not the route's step: the step moves on at the confirm, so v82-v85
   * watched the next turn instead and never saw a hit on the turn just played (the hit is read 2-25 s after the confirm). It
   * also reads the miss: the "1" of 10 HP steady on the bar through Bowser's turn (30+ frames from 2 s after the confirm)
   * and no hit by the next turn's own action (its Charge or the Jelly) = Bowser missed. Each state's attack and test value
   * for that turn are then checked against it (fb14Weigh): on log 1794169517521's T1 (Bowser's fire breath missed) only
   * 36% of the weight predicted that, and with it the T2 shares are 93-99% or under 7% on almost every frame. */
  if (FB14.hit || typeof jrTens !== 'function') return;
  const stp = fb14Step(); if (!stp || !stp.fb14) return;
  const W = FB14.hpw || (FB14.hpw = { seen10: false, tenRun: 0, blankRun: 0, ok: {}, done: {} });
  const B = JRT.bar; if (!present || !B.since || t - B.since < 6 * FRAME) { W.tenRun = 0; W.blankRun = 0; return; }
  const v = jrTens(), one = v >= JR_TENS_MIN;
  W.tenRun = one ? W.tenRun + 1 : 0; W.blankRun = one ? 0 : W.blankRun + 1;
  const open = [4, 3, 2, 1].find(k => FB14.pT && FB14.pT[k] != null && !W.done[k]);
  if (open == null || FB14.pT[open] > t) { if (W.tenRun >= 6) W.seen10 = true; return; }
  const pT = FB14.pT[open]; if (t < pT + 2000) { if (W.tenRun >= 6) W.seen10 = true; return; } if (!W.seen10) return;     // (v92: a watch begun after the confirm reads the 10 HP there)
  if (t - pT > 25000) { W.done[open] = 'late'; return; }
  if (one) W.ok[open] = (W.ok[open] || 0) + 1;
  if (W.blankRun >= 10) { W.done[open] = 'hit'; FB14.hit = open; if (open === 4) FB14.routeOff = 'T4\'s wave hit Mario (the route needs it blocked)'; slog('fb14Hit', { turn: open, afterMs: Math.round(t - pT), tens: +v.toFixed(2) }); cancelBeeps(); if (st.plan && st.plan.fb14) st.plan = null; fb14CarryGone(); fb14Show(); render(); }
}
/* v86: the turn before `turn` is over (this turn's Charge burst, or the Jelly): Bowser missed it if the bar showed Mario's
 * 10 HP through his turn and no hit was read. Weighs the states from then on (fb14Weigh). */
function fb14TurnOver(turn) {
  fbAtkDecide(turn - 1);
  const k = turn - 1, W = FB14.hpw; if (k < 1 || k > 3 || !W || W.done[k] || FB14.hit || !FB14.pT || FB14.pT[k] == null) return;
  if (W.seen10 && (W.ok[k] || 0) >= 30) { W.done[k] = 'miss'; FB14.missed = FB14.missed || {}; FB14.missed[k] = true; slog('fb14Missed', { turn: k, frames10: W.ok[k] }); }
  else { W.done[k] = 'unread'; slog('fb14MissUnread', { turn: k, seen10: W.seen10, frames10: W.ok[k] || 0 }); }
}
/* ---- v100: the picture's evidence beyond the coin (Bowser's attack each turn, the stage lightning) ----
 * Bowser's attack: the fire breath fills a third of the game box with saturated orange for ~2.5 s (console clips of Nov 12:
 * every fire turn 0.13-0.34 of the 32x24 grid for 2.5-3 s, every other picture of those clips at most 0.012; the emulator's
 * T1 fire 0.26-0.34). A turn whose Bowser stretch was watched with no fire is a claw, a body slam or (T4) the wave. Claw or
 * slam from where Bowser's warm colours go (their x-centroid on the game box, 0..1): the slam lands on Mario (console
 * 18-41 / 17-47 slams 0.20-0.21), the claw stays a step off (15-33, 04-35, 17-33: 0.32-0.34); a hit turn's death and revive
 * move the camera, so only read on a turn with no hit, and only outside a margin. Each state's own attack that turn
 * (S.out[k].atk) is checked against it in fb14Weigh: a state whose AI picked a different attack keeps FB14_ATKW (fire / not
 * fire) or FB14_CLSW (claw / slam) of its weight. */
const FB14_FIRE = { px: 0.08, run: 20, seen: 240, none: 0.05 }, FB14_ATKW = 0.003, FB14_CLSW = 0.15, FB14_CLS = { slam: 0.24, claw: 0.30 };
function fbVisGrid(box, w, h) { try { return sample(box, w, h); } catch (e) { return null; } }
function fbAtkFrame(t, present) {
  if (!FB14.pT || !present) return;
  const k = [4, 3, 2, 1].find(j => FB14.pT[j] != null && !(FB14.atk && FB14.atk[j]) && t > FB14.pT[j] && t - FB14.pT[j] < 25000);
  if (k == null) return;
  const A = FB14.atkW[k] || (FB14.atkW[k] = { seen: 0, run: 0, best: 0, mx: 0, cs: [], minC: null });
  const g = window.__fbVisTest ? window.__fbVisTest('game') : fbVisGrid(chgGame(), 32, 24); if (!g) return;
  let nf = 0, nw = 0, sx = 0; const n = g.length / 4;
  for (let i = 0, j = 0; i < g.length; i += 4, j++) { const R = g[i], G = g[i + 1], B = g[i + 2];
    if (R > 190 && R - G > 90 && B < 90) nf++;
    if (R > 150 && G > 90 && R - B > 70) { nw++; sx += (j % 32) + 0.5; } }
  const fs = nf / n; A.seen++; A.mx = Math.max(A.mx, fs); A.run = fs >= FB14_FIRE.px ? A.run + 1 : 0; A.best = Math.max(A.best, A.run);
  if (nw > 8 && fs < FB14_FIRE.none) { A.cs.push(sx / nw / 32); if (A.cs.length > 8) A.cs.shift(); if (A.cs.length >= 6) { const m = A.cs.reduce((a, x) => a + x, 0) / A.cs.length; A.minC = A.minC == null ? m : Math.min(A.minC, m); } }
}
// the turn's Bowser stretch is over (the next turn's Charge burst or the Jelly; T4: the Peach Beam): what he did
function fbAtkDecide(k) {
  if (!FB14.atk || FB14.atk[k] || !FB14.pT || FB14.pT[k] == null) return;
  const A = FB14.atkW[k]; let fire = null, cls = null;
  if (A && A.best >= FB14_FIRE.run) fire = true;
  else if (A && A.seen >= FB14_FIRE.seen && A.mx < FB14_FIRE.none) fire = false;
  if (fire === false && k <= 3 && FB14.hit !== k && A.minC != null) cls = A.minC <= FB14_CLS.slam ? 'slam' : A.minC >= FB14_CLS.claw ? 'claw' : null;
  FB14.atk[k] = { fire, cls };
  slog('fb14Attack', { turn: k, fire, cls, seen: A ? A.seen : 0, fireRun: A ? A.best : 0, fireMax: A ? +A.mx.toFixed(3) : 0, minC: A && A.minC != null ? +A.minC.toFixed(3) : null, hit: FB14.hit === k });
}
/* the stage lightning: each bolt is a rand_int(359) on the frames the phases give (fbBolts); a bolt shows as a thin violet
 * streak in the sky. Read in Mario's and the partner's menus (no Bowser stretch, no Charge burst), on the sky under the bar
 * (320-space x 25..215, y 42..105; Bowser's head is right of it): violet grid points that were not violet in the running
 * baseline; an onset is 4+ new points after 6 quiet pictures. The clock frame of the draw is the onset's picture minus
 * FB14_BOLT_D (calibrated on the emulator, fb14BoltCal); null: logged only. */
const FB14_BOLT = { x0: 25, x1: 215, y0: 42, y1: 105, gw: 64, gh: 21, on: 4, quiet: 6, ev: 6, c9: 120 }, FB14_BOLT_W = 0.05, FB14_BOLT_TOL = 2;
let FB14_BOLT_D = null;
/* v103: what decides a bolt (pmdecomp battle/common/stage/area_kkj/kkj_02.inc.c, effects/lightning_bolt.c): the stage's two
 * looping scripts, EVS_CirculatingBolts (waits 5, 30, 5, 90: the 130 loop) and EVS_RandomBolts (60, 10, 90, 60: the 220 loop),
 * each bolt at a FIXED place of its loop. No random number decides when or where a bolt shows; its one rand_int(359) (the
 * effect's unk_110) only sets the zigzag's phase. So an onset tells the states' phases and their lag after the rays (l), not
 * the seed: a soft factor per onset (FB14_BOLT_SIG, a floor FB14_BOLT_FLOOR for a picture that was not a bolt), never a cut. */
const FB14_BOLT_SIG = 0.4, FB14_BOLT_FLOOR = 0.15, FB14_BOLT_REACH = 3, FB14_BOLT_Q = 0.05;
function fbBoltBox() { const [SX, OX, SY, OY] = chgMap(), B = FB14_BOLT; return { x: (OX + B.x0 * SX) / 1280, y: (OY + B.y0 * SY) / 720, w: (B.x1 - B.x0) * SX / 1280, h: (B.y1 - B.y0) * SY / 720 }; }
function fbBoltFrame(t, present) {
  const W = FB14.boltW || (FB14.boltW = { base: null, quiet: 99 });
  // v103: T1 in skip mode reads on from Cloud Nine's confirm to P + FB14_BOLT.c9 (the battle camera; Cloud Nine's own camera
  // from ~P + 133 pans over the arena's violet frame and its action-command icons are blue: not read)
  const c9 = fb14SkipMode() && FB14.pT && FB14.pT[1] != null && FB14.pT[2] == null && t < FB14.pT[1] + FB14_BOLT.c9 * fbRate();
  const busy = !present || (FB14.pT && [1, 2, 3, 4].some(j => FB14.pT[j] != null && t > FB14.pT[j] - 200 && !(FB14.atk && FB14.atk[j]) && !(j === 1 && c9))) || (FB14.lastBurst && t - FB14.lastBurst.t < 3000) || (typeof CHG !== 'undefined' && CHG.state === 'capture');
  if (busy) { W.base = null; W.quiet = 0; return; }
  const g = window.__fbVisTest ? window.__fbVisTest('sky') : fbVisGrid(fbBoltBox(), FB14_BOLT.gw, FB14_BOLT.gh); if (!g) return;
  const n = g.length / 4; if (!W.base || W.base.length !== n) { W.base = new Float32Array(n); for (let i = 0, j = 0; i < g.length; i += 4, j++) W.base[j] = fbVio(g, i) ? 1 : 0; W.quiet = 0; return; }
  let nw = 0; for (let i = 0, j = 0; i < g.length; i += 4, j++) { const v = fbVio(g, i) ? 1 : 0; if (v && W.base[j] < 0.3) nw++; W.base[j] = 0.9 * W.base[j] + 0.1 * v; }
  if (nw >= FB14_BOLT.on && W.quiet >= FB14_BOLT.quiet) { if (nw >= FB14_BOLT.ev) FB14.bolts.push(t); if (FB14.bolts.length > 200) FB14.bolts.shift(); slog('fb14Bolt', { at: Math.round(t), F: FB14.t0 != null ? +fbPic(t).toFixed(1) : null, n: nw }); }
  W.quiet = nw < 2 ? W.quiet + 1 : 0;
}
const fbVio = (g, i) => { const R = g[i], G = g[i + 1], B = g[i + 2]; return B > 110 && B - G > 45 && R > 70 && B > R + 15; };
// v100 (diagnostic, the e2e's truth trace only): the true states' lightning phases and lag, for fb14BoltCal
// v104 (diagnostic, the e2e's truth trace only): why the true states are not in a plan's kept states: their best weight against
// the kept maximum, their errors, and for the best of them the taps it does not explain and the shines it predicted unseen
function fb14TruthWhy(at) { const C = FB14.wctx; if (!window.__fb14seeds || !C) return null; const Tl0 = FB14.states.filter(fb14IsTrue), Tl = Tl0.filter(fb14IsTrueS); if (!Tl.length) return { at, trueAll: 0, aliases: Tl0.length };
  let b = null; for (const S of Tl) if (!b || S.w * S.lw > b.w * b.lw) b = S; const sh = b.sh.map(f => f + b.l), near = (x, f) => x - f >= C.nlo && x - f <= C.nhi, taps = C.tapF.filter(x => x < C.h && x >= b.from + b.l);
  const fl = taps.filter(x => !sh.some(f => near(x, f))).map(x => +x.toFixed(1)), ms = sh.filter(f => f < C.h - 6 && C.vis.some(([a, z]) => f >= a && f <= z) && !taps.some(x => near(x, f)));
  const ns = f => { let d = 1e9; for (const x of taps) if (Math.abs(x - f) < Math.abs(d)) d = x - f; return +d.toFixed(1); };
  return { at, trueAll: Tl.length, best: +(b.w * b.lw / (C.mx || 1)).toExponential(2), err: b.err, l: b.l, p1: b.p1, falseTaps: fl.slice(-6), missed: ms.slice(-6).map(f => [f, ns(f), ((f - b.l + b.ph[0]) % 130 + 130) % 130, ((f - b.l + b.ph[1]) % 220 + 220) % 220, b.c[mod20(f - b.l)] || 0]), ph: b.ph, c: Array.from(b.c).join(''), shines: sh.filter(f => f > C.h - 200 && f < C.h).slice(-8), top: (() => { let k = null; for (const S of FB14.states) if (S.err <= ZW_MAXERR && (!k || S.w * S.lw > k.w * k.lw)) k = S; return k ? { l: k.l, p1: k.p1, err: k.err, shines: k.sh.map(f => f + k.l).filter(f => f > C.h - 200 && f < C.h).slice(-8) } : null; })(), taps: taps.filter(x => x > C.h - 200).map(x => +x.toFixed(1)).slice(-8), vis: C.vis.map(v => v.map(x => +x.toFixed(1))).slice(-4) }; }
// v104 (diagnostic): no state holds the truth any more: run the last true state seen on, frame by frame, against the trace;
// the frame it leaves the truth on (the model, not the coin, lost it) or none (the states lost it)
function fb14TruthDiv(h) { const T = window.__fb14seeds, C = fbClone(FB14.tRef), f0 = C.f; let div = null;
  while (C.f < h + 90) { const i = C.f + C.l - T.off; if (i >= T.s.length) break; if ((C.s >>> 0) !== (T.s[i] >>> 0)) { div = C.f + C.l; break; } fbStep(C); }
  slog('fb14TruthDiv', { h, from: f0 + C.l, div, l: C.l, p1: C.p1, ev: C.ev.map(e => e.k + e.f).slice(0, 6), w: +(FB14.tRef.w || 0).toExponential(2) }); FB14.tRef = null; }
function fb14TruthPh(at) { if (!window.__fb14seeds) return; const ph = new Set(); for (const S of FB14.states) if (fb14IsTrue(S)) ph.add(S.ph[0] + ',' + S.ph[1] + ',' + S.l); slog('fb14TruthPh', { at, ph: [...ph].slice(0, 8) }); }
/* the v100 factors of one state (1: nothing against it), and per evidence the count of states it cut */
// v105 (diagnostic, the e2e only): where a fresh lock loses the truth. Every fit whose seed after the rays is the game's (lag 0 / 1)
// is built again with every aura split the kernel listed and every lightning phase pair of its pattern (no FB14_AV / FB14_COMBOS /
// FB14_MAXH cut), each checked frame by frame against the trace (fb14IsTrueS); logged: the true splits' prior rank among the fit's
// splits, and the best true state's rank by weight in the fresh fits and in the kept states
function fb14TruthLock(turn, fresh) { const T = window.__fb14seeds, X = FB14.tLockCtx; if (!T || !X) return; const { H, M, P } = X, out = { turn, M, hy: H.hy.length, hyTrue: 0, splitsTrue: 0, built: 0, strict: 0, rows: [] };
  const sOf = l => { const i = M + 61 + l - T.off; return i >= 0 && i < T.s.length ? T.s[i] >>> 0 : null; };
  const dd = (x, y) => { for (let i = 0; i < 400; i++) { if (x === y) return i; x = fbAdv(x); } return -1; }; out.v = H.v; out.d03 = [0, 1].map(l => { const i = M + 13 + l - T.off; return i >= 0 && i + 3 < T.s.length ? dd(T.s[i] >>> 0, T.s[i + 3] >>> 0) : null; });
  const x0a = Math.imul(((H.a >>> 0) - 1) >>> 0, 0x6A76AE6D) >>> 0;
  for (const h of H.hy) { const ph0 = P.list[h.p].ph[0], pa0 = [(((ph0[0] - M) % 130) + 130) % 130, (((ph0[1] - M) % 220) + 220) % 220]; let x0 = x0a; for (let i = fbBolts(M + 13, pa0); i; i--) x0 = Math.imul((x0 - 1) >>> 0, 0x6A76AE6D) >>> 0;
    if ([0, 1].some(l => sOf(l) === (h.s48 >>> 0))) out.hyTrue++;
    const L = (h.alts && h.alts.length ? h.alts.map((a, i) => [a, h.altSc[i]]) : [[h.aura, h.sc]]).map(([a, sc]) => ({ a, sc, pr: a.reduce((x, c) => x * (FB14_BIN[c] || 1e-4), 1) })), byPr = L.slice().sort((x, y) => y.pr - x.pr);
    for (const V of L) { const c = new Uint8Array(20); for (let j = 0; j < 20; j++) c[mod20(M + 13 + j)] = V.a[j]; const E = fbEnd48(x0, M, h.q, c, pa0), ls = [0, 1].filter(l => sOf(l) === E.s); if (!ls.length) continue; out.splitsTrue++;
      for (const ph of P.list[h.p].ph) { const pa = [(((ph[0] - M) % 130) + 130) % 130, (((ph[1] - M) % 220) + 220) % 220];
        for (const l of ls) { out.built++; const S = fbNew({ s: E.s, nc: E.nc, f: M + 61, c, ph: pa, l, rg: 0, w: 1 }); if (!fb14IsTrueS(S)) continue; out.strict++;
          if (out.rows.length < 4) { const key = E.s + ':' + (E.nc - M - 13) + ':' + c.join('') + ':' + pa[0] + ':' + pa[1] + ':' + l;
            const fi = fresh.findIndex(x => x.key && x.key.startsWith(key)), ki = FB14.states.findIndex(x => x.key && x.key.startsWith(key)), fs = fresh.slice().sort((x, y) => y.w - x.w), fr = fi >= 0 ? fs.indexOf(fresh[fi]) : -1;
            out.rows.push({ hyp: h.p + '/' + h.q + '/' + h.br, c: c.join(''), ph: pa, l, nc: E.nc - M - 13, sc: +(V.sc - H.best).toFixed(1), prRank: byPr.indexOf(V), alts: L.length, maxC: Math.max(...V.a), coinOk: h.br ? !E.shq : (h.q + 24 >= 48 || E.shq), comboRank: (FB14.tCombos || []).findIndex(([hh, AV]) => hh === h && AV.aura.every((x, j) => x === V.a[j])), combos: (FB14.tCombos || []).length, inFresh: fi >= 0, freshRank: fr, freshN: fresh.length, wRel: fi >= 0 ? +(fresh[fi].w / fs[0].w).toExponential(2) : null, kept: ki >= 0, keptN: FB14.states.length }); } } } } }
  if (window.__v105t) { const V = window.__v105t, hs = H.hy.filter(h => h.p === V.hyp[0] && h.q === V.hyp[1] && h.br === V.hyp[2]), c = new Uint8Array(20); for (let k = 0; k < 20; k++) c[k] = +V.c[k];
    out.v105 = hs.map(h => ({ s48: (h.s48 >>> 0).toString(16), nc48: h.nc48, inAlts: (h.alts || []).some(a => a.every((x, j) => x === c[mod20(M + 13 + j)])), sc: (P.list[h.p].ph.map(ph => { const pa = [(((ph[0] - M) % 130) + 130) % 130, (((ph[1] - M) % 220) + 220) % 220]; const S = fbNew({ s: h.s48 >>> 0, nc: M + 13 + h.nc48, f: M + 61, c, ph: pa, l: 0, rg: 0, w: 1 }); const x = fb14TruthScore(S, 0); return pa.join(',') + ':' + x.r.toFixed(2) + ':' + x.first; })).join(' '), true61: (sOf(0) || 0).toString(16) })); }
  slog('fb14TruthLock', out); }
function fb14V100(S, h, bolts, cnt) {
  let f = 1;
  for (const k in FB14.atk) { const a = FB14.atk[k], o = S.out[k]; if (!a || !o || !o.atk) continue;
    if (a.fire != null && (o.atk === 'fire') !== a.fire) { f *= FB14_ATKW; cnt.fire++; }
    else if (a.cls && (o.atk === 'claw' || o.atk === 'slam') && o.atk !== a.cls) { f *= FB14_CLSW; cnt.cls++; } }
  if (bolts) { let miss = 0; for (const x of bolts) { if (x < S.from + S.l || x >= h) continue; let ok = false; for (let d = -FB14_BOLT_TOL; d <= FB14_BOLT_TOL && !ok; d++) if (fbBolts(Math.round(x) + d - S.l, S.ph)) ok = true; if (!ok) { f *= FB14_BOLT_W; miss++; } } if (miss) cnt.bolt++; }
  return f;
}
/* v103: one state's factor for the onsets (page frames of the draws: the onset's picture - FB14_BOLT_D): per onset after the
 * state's rays, the nearest draw of its phases (on its own frames, lag l) within FB14_BOLT_REACH: floor + (1 - floor) x a
 * Gaussian of the distance (sigma FB14_BOLT_SIG frames) */
function fb14BoltLik(S, h, bolts, cnt) {
  let f = 1, miss = 0;
  for (const x of bolts) { if (x < S.from + S.l + 2 || x >= h) continue; const y = x - S.l, r0 = Math.round(y); let best = 99;
    for (let d = r0 - FB14_BOLT_REACH; d <= r0 + FB14_BOLT_REACH; d++) if (fbBolts(d, S.ph)) best = Math.min(best, Math.abs(y - d));
    const L = FB14_BOLT_FLOOR + (1 - FB14_BOLT_FLOOR) * Math.exp(-best * best / (2 * FB14_BOLT_SIG * FB14_BOLT_SIG)); f *= L; if (L < 0.5) miss++; }
  if (miss && cnt) cnt.bolt++; return f;
}
/* v82 (log 1794170840652: the T1 lock landed, then nothing for 21 s): on a lever step the plan is made as soon as the turn's
 * lock is in, without waiting for the target screen (whose picture may never have been saved: no plan and no confirm on
 * T1 in either log), and "No edge" / "being read" says so at once. Not before the partner's menu can be up (the Charge's
 * frame + 90), and not again once this lever was confirmed. */
function fb14EarlyPlan(t) {
  const stp = fb14Step(); if (!stp || stp.fb14role !== 'lever' || V.wasOn) return;
  const turn = stp.fb14, now = performance.now();
  if (FB14.pT && FB14.pT[turn] != null) { if (turn === 1 && fb14SkipMode()) return; if (FB14.earlyMsg !== turn && !FB14.hit) { FB14.earlyMsg = turn; if (!(st.plan && st.plan.fb14 === turn)) { st.msg = 'T' + turn + ': ' + (turn === 1 ? 'Cloud Nine' : 'Do Nothing') + ' was confirmed' + (FB14.on ? '' : ' before the seed was read (blind)') + '. Next time wait on its screen for the beeps (they come about 4-5 s after the Charge), or "No edge".'; render(); } } return; }
  if (turn === 3 || (turn !== 1 && FB14.on && FB14.M[turn] == null && !['capture', 'maps', 'search'].includes(CHG.state))) return;   // T3: on its screen (no Charge to time it)
  if (FB14.on && FB14.M[turn] != null && fbPic(now) < FB14.M[turn] + 90) return;
  if (st.plan && now < st.plan.tPress + 600) return;
  if (st.planTry && now - st.planTry < 500) return; st.planTry = now;
  st.planEarly = true; try { makePlan(); } finally { st.planEarly = false; }
  if (st.plan && st.plan.fb14 === turn && st.plan.tMade >= now) st.plan.early = true;
}
/* the bar hiding: T3's Jelly confirm (Mario's turn of T3), T5's Peach Beam confirm (after T4's Do Nothing) */
/* v91 (log a53781d5 at 266.1 s, clip 18-44-28 8.05 s): the T1 lock's work held the page's thread 1.5 s and the bar's hide
 * was seen 1.07 s late (the first picture after the stall). A hide seen after a gap of g ms between pictures happened
 * anywhere in that gap: the confirm's shifts are spread back over it (uniform), at most 40 frames */
function fb14GapShifts(base, gap) {
  const K = Math.min(40, Math.floor((gap || 0) / FRAME)); if (K < 3) return base;
  const m = new Map(); for (let k = 0; k <= K; k++) for (const [d, w] of base) m.set(d - k, (m.get(d - k) || 0) + w / (K + 1));
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}
function fb14HideWatch(t, present) {
  const W = FB14.hideWatch || (FB14.hideWatch = { up: 0, gone: 0 });
  if (present) { if (!W.up) W.up = t; W.gone = 0; W.lp = t; return; }
  if (!W.gone) { W.gone = t; W.gap = W.lp ? t - W.lp : 0; } if (t - W.gone < 8 * FRAME) return;              // gone for 8 frames: not a flicker
  if (!W.up) return; const upMs = W.gone - W.up; W.up = 0; t = W.gone; if (upMs < 600) return;
  // v82 (log 1794169517521, clip 15-24-14): T1's Cloud Nine confirm from the bar hiding when its target screen was not
  // read (the runner confirmed 0.27 s after the target hand showed, 0.25 s before the T1 lock; the screen never matched).
  // v81 then carried T1 without Cloud Nine (its puffs and Bowser's AI): T2's doubt 63% where the same states with it read
  // 1.5% (that lock replayed with the log's coin, test_console_1108b). The bar goes FB14_C9HIDE frames after the A, as
  // Lakilester's Spiny Flip in the Hallway (route clips, not measured for Cloud Nine): -2..+2 carried, the coin settles it
  // v86 (end-to-end run 1234abcd): with Mario's target screen saved (cat M: Cloud Nine's is the same screen) the T1 Super
  // Charge's own confirm closes it and moves the route to the Cloud Nine step before the Charge's bar hide: v82-v85 took that
  // hide as Cloud Nine's confirm (frame 0: before the rays, every state dropped, "No edge" for all of T1). Cloud Nine's bar
  // hide comes after the T1 Charge's burst (its partner menu opens 3 s later): only then.
  { const s1 = fb14Step(), lb = FB14.lastBurst; if (s1 && s1.fb14 === 1 && s1.fb14role === 'lever' && !(FB14.pT && FB14.pT[1] != null) && lb && lb.turn === 1 && t - lb.t > FB14_C9AFTER) { const gs = fb14GapShifts(FB14_C9SHIFTS, W.gap); slog('fb14CloudNineByBar', { at: Math.round(t), upMs: Math.round(upMs), gapMs: Math.round(W.gap || 0), shifts: gs.length }); fb14Confirm(t - (FB14_C9HIDE - FB14_VAN.M) * FRAME, s1, gs, 'bar'); return; } }
  // v99 (7483f3b1: T4's carry gone at 196.9 s, then the Peach Beam's hide at 207.65 s set no mark, and fb14ArmOk held the T6
  // Charge's hide at 229.29 s for p4t + 45 s: no trigger): the Peach Beam's hide marks T5 with or without a carry
  if (FB14.t0 == null) { if (FB14.p4t != null && !FB14.pb && !FB14.routeOff && t - FB14.p4t > 5000) { FB14.pb = { F: null, t }; slog('fb14Peach', { F: null, why: 'no carry' }); if (!['search', 'maps', 'idle'].includes(CHG.state)) chgReset(); } return; }
  const stp = fb14Step(), F = fbPic(t);
  if (stp && stp.fb14 === 3 && FB14.M[3] == null && FB14.pT && FB14.pT[2] != null && t - FB14.pT[2] > 3000) { fb14TurnOver(3); FB14.M[3] = Math.round(F - FB14_HIDE.jelly); fb14Input('jelly', FB14.M[3], 3, FB14_JSHIFTS, t, FB14_HIDE.jelly); slog('fb14Jelly', { M: FB14.M[3] }); }
  else if (FB14.p4t != null && !FB14.pb && !FB14.routeOff && t - FB14.p4t > 5000) { fbAtkDecide(4); FB14.pb = { F: Math.round(F - FB14_HIDE.peach), t }; slog('fb14Peach', { F: FB14.pb.F }); if (!['search', 'maps', 'idle'].includes(CHG.state)) chgReset(); fb14Peach(); }   // nothing before the T6 menu is the T6 Charge
}
/* the states' weights from the coin since their lock (as fb2Prune / zwUpdate): a seen shine a state has, a predicted
 * shine inside a watched stretch that was not seen (missed), a seen shine it does not have (false) */
function fb14Weigh(h, noV) {     // noV (v100): without the picture's evidence (the before / after log)
  // a stretch counts from 1 s after the bar came up to 4 frames before it went (a shine drawn later never showed)
  const vis = FB14.vis.concat(FB14.visFrom != null ? [[FB14.visFrom, null]] : []).map(([a, b]) => [fbPic(a) + 30, Math.min(b == null ? h - 4 : fbPic(b) - 4, h - 4)]).filter(([a, b]) => b > a);
  const tapF = FB14.taps.map(t => fbPic(t) - 4.8);
  // the match window: -2 .. +4.5 frames (the capture shows a flash up to ~3 frames after the console calibration in the
  // emulator renders, and a dropped picture reads it later still; v72's Duplighost tracker takes 4)
  const Wd = 6.5 * (ZW_RHO + ZW_FALSE), Lm = (1 - ZW_PMISS) / Wd, Lf = ZW_FALSE / (ZW_RHO + ZW_FALSE), nlo = FB14.wide ? FB14_WIDE[0] : -2, nhi = FB14.wide ? FB14_WIDE[1] : 4.5, near = (x, f) => x - f >= nlo && x - f <= nhi;
  let mx = 0, tot0 = 0; const out = [], cnt = { fire: 0, cls: 0, bolt: 0 }, bolts = !noV && FB14_BOLT_D != null && FB14.bolts.length ? FB14.bolts.map(t => fbPic(t) - FB14_BOLT_D) : null, useV = !noV && (bolts || Object.keys(FB14.atk || {}).length);
  for (const S of FB14.states) {
    tot0 += S.w; const sh = S.sh.map(f => f + S.l), taps = tapF.filter(x => x < h && x >= S.from + S.l); let lw = 1, err = 0;
    for (const x of taps) if (sh.some(f => near(x, f))) lw *= Lm; else { lw *= Lf; err++; }
    for (const f of sh) if (f < h - 6 && vis.some(([a, b]) => f >= a && f <= b) && !taps.some(x => near(x, f))) { lw *= ZW_PMISS; err++; }
    if (FB14.missed) for (const k in FB14.missed) { const o = S.out[k]; if (o && (o.off || (o.v != null && !o.miss))) { lw *= FB14_MISSW; err++; } }   // v86: Bowser was seen to miss that turn
    if (useV) lw *= fb14V100(S, h, null, cnt) * (bolts ? fb14BoltLik(S, h, bolts, cnt) : 1);     // v100: Bowser's attacks; v103: the lightning (soft)
    S.lw = lw; S.err = err; if (err > ZW_MAXERR) continue; out.push(S); mx = Math.max(mx, S.w * lw);
  }
  const keep = out.filter(S => S.w * S.lw >= mx * ZW_CUT), sum = keep.reduce((a, S) => a + S.w * S.lw, 0);
  if (window.__fb14seeds) FB14.wctx = { vis, tapF, nlo, nhi, mx, h };     // (diagnostic: the truth trace, fb14TruthWhy)
  if (!keep.length && FB14.states.length && !FB14.allOutLogged) { FB14.allOutLogged = true; FB14.gone = true; slog('fb14AllOut', { h, taps: tapF.filter(x => x < h).map(x => +x.toFixed(1)).slice(-20), vis: vis.map(v => v.map(x => +x.toFixed(1))).slice(-8), sample: FB14.states.slice(0, 4).map(S => ({ f: S.f, l: S.l, from: S.from, sh: S.sh.slice(-12), err: S.err })) }); }
  let nVis = 0; for (const [a, b] of vis) nVis += Math.max(0, b - Math.max(a, FB14.bgFrom || 0));
  let bg = tot0 * FB14.bg * Math.exp(-ZW_RHO * nVis);
  if (FB14.missed) for (const k in FB14.missed) bg *= fb14Blind(+k);     // v86: a state off the model would have missed as often as blind
  // v100: off the model, the attack seen is as likely as Bowser's own odds (fire about half; claw or slam a quarter each), a bolt
  // falls near a random phase's draw about a quarter of the time (counted at most 4 times)
  if (useV) { for (const k in FB14.atk) { const a = FB14.atk[k]; if (a && a.fire != null) bg *= 0.5; if (a && a.cls) bg *= 0.5; } if (bolts) { const f0 = FB14.states.reduce((a, S) => Math.min(a, S.from + S.l + 2), 1e9); bg *= Math.pow(FB14_BOLT_FLOOR + (1 - FB14_BOLT_FLOOR) * FB14_BOLT_Q, bolts.filter(x => x >= f0 && x < h).length); } }
  return { list: keep, doubt: keep.length ? bg / (bg + sum) : 1, sum, cnt: useV ? cnt : null, kept: keep.length, n: FB14.states.length };
}
/* every state to the horizon (frames whose shines have had time to be read) */
// (from the newest picture's time: the same as now live; a capture that lags must not move the states past inputs not yet seen)
function fb14Horizon(now) { return Math.floor(fbPic(Math.min(now, FB14.lastT || now) - num('vlag')) - 10); }
// v86 (end-to-end run 1234abcd, T2): the Charge's input waits for the rays' capture (FB14.pendChg); a plan made meanwhile ran
// the states past the Charge's frame, its input then found none to take it (every state dropped, "No edge" for T2), and
// the plan beeped without the Charge's draws. No state runs past a pending Charge, and no plan is made before it is in.
function fb14Advance(h) { if (FB14.pendChg) h = Math.min(h, FB14.pendChg.M + 10); for (const S of FB14.states) fbRun(S, h - S.l); }
/* ---- the plan: the partner's confirm frame (the lever) ---- */
// share[F - a] = the weighted share of the states for which a confirm on clock frame F gives Bowser's miss (T4: the wave,
// missed). The states are stepped once along the window; each frame's outcome is simulated from its own state.
function fb14Share(L, a, b, turn, kind) {
  const sh = new Float64Array(Math.max(0, b - a + 1)), tot = L.reduce((x, S) => x + S.w * S.lw, 0) || 1, lead = kind === 'cn' ? 200 : kind === 'skip' ? FB14_SKIP.ai - 1 : 0;
  for (const S0 of L) {
    // the frames before the first event of a confirm on F draw the same whatever F is: one state is stepped along them
    // and each F's outcome is simulated from its own copy (T1: from F + 200, the first puff)
    const B = fbClone(S0); fbRun(B, a - B.l + lead); const wt = S0.w * S0.lw / tot;
    for (let F = a; F <= b; F++) {
      const T = fbClone(B), P = F - T.l; fbInputEv(T, kind, P, turn);
      const end = kind === 'skip' ? Math.max(P + FB14_SKIP.ai, T.p1 != null ? T.p1 + FB14_SKIP.nat : 0) + 120 : P + (kind === 'cn' ? FB14_AIAFTER.cn : FB14_AIAFTER.nothing) + 80;
      while (T.f < end && !(T.out[turn] && T.out[turn].v != null)) fbStep(T);
      if (T.out[turn] && T.out[turn].ok) sh[F - a] += wt;
      fbStep(B);
    }
  }
  return sh;
}
/* v98 (logs c6469b35 / 7483f3b1 T4: plans at 0.81-0.93 stopped 1-2 s later at 0.14-0.56 with the doubt at 0.002-0.04, eight
 * times in a row on 7483f3b1): the sample was every k-th state by list position, unweighted, k from the list's length. A
 * state cut by the coin moved k and swapped the whole sample, the plan's best-of-60-frames share then fell back on the next
 * tick (the replayed T4 states: frame 212 reads 0.42-0.71 on samples of one list, 0.50 on all of it). Now each state is in
 * the sample by its own fixed draw u (hashed once from its content), with a chance proportional to its weight (capped at 1),
 * and stands in for weight / that chance (Horvitz-Thompson): the same states stay in while the weights move, and the heavy
 * states are always in. The tick re-scores the plan's own sample (fb14Resample). */
function fb14U(S) {
  if (S.u == null) { let h = 2166136261 >>> 0; const mix = x => { h = Math.imul(h ^ (x >>> 0), 16777619) >>> 0; };
    mix(S.s); mix(S.nc); mix(S.f); mix(S.l + 7); mix(S.ph[0]); mix(S.ph[1]); mix(S.wv); mix(S.lv); mix(S.rg); mix(S.wb ? 3 : 1);
    for (let i = 0; i < 20; i++) mix(S.c[i] || 0); for (const e of S.ev) mix(e.f * 31 + e.k.length);
    for (const k in S.out) mix(k.charCodeAt(0) * 131 + (S.out[k].atk || '').length + (S.out[k].v || 0));
    S.u = ((Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000003) / 1000003; }
  return S.u;
}
function fb14Wrap(S, pi) { const W = Object.create(S); W.w = S.w * (S.lw || 1) / pi; W.lw = 1; W.pi = pi; W.base = S; return W; }
function fb14Sample(L, n) {
  if (L.length <= n) return L;
  const tot = L.reduce((a, S) => a + S.w * (S.lw || 1), 0) || 1, out = [];
  for (const S of L) { const pi = Math.min(1, n * S.w * (S.lw || 1) / tot); if (pi > 0 && fb14U(S) < pi) out.push(fb14Wrap(S, pi)); }
  return out.length ? out : L.slice(0, n);
}
// the plan's sample again, with the states' weights now (those the coin has cut are out); null: none left, sample afresh
function fb14Resample(Ls, list) {
  if (!Ls || !Ls.length) return null; const live = new Set(list), out = [];
  for (const W of Ls) { const S = W.base || W; if (live.has(S)) out.push(W.base ? fb14Wrap(S, W.pi) : S); }
  return out.length >= Math.min(30, Ls.length) ? out : null;
}
/* v95: the share the plan uses: Cloud Nine's (T1) averaged over the unpinned offset FB14_C9UNC (the press lands u frames
 * from the frame the beeps aim at), the Do Nothing turns as they are */
function fb14ShareU(L, a, b, turn) {
  if (fb14Kind(turn) !== 'cn') return fb14Share(L, a, b, turn, 'nothing');
  // v101: T1's lever is the skip A once Cloud Nine is in (Settings: not "Confirm Cloud Nine on the beep"), averaged over FB14_SKUNC
  // (its reading is transferred from the emulator, not borne out on console yet)
  const kind = fb14SkipPhase() ? 'skip' : 'cn', U = kind === 'skip' ? FB14_SKUNC : FB14_C9UNC;
  const lo = Math.min(...U.map(x => x[0])), hi = Math.max(...U.map(x => x[0])), raw = fb14Share(L, a + lo, b + hi, turn, kind), out = new Float64Array(b - a + 1);
  for (let F = a; F <= b; F++) { let v = 0; for (const [u, w] of U) v += w * raw[F + u - (a + lo)]; out[F - a] = v; }
  return out;
}
// v100: per plan, what the picture's evidence did: per evidence the states it cut, the doubt and the plan's chance without / with it
const fb14HasV = () => !!((FB14_BOLT_D != null && FB14.bolts && FB14.bolts.length) || Object.keys(FB14.atk || {}).length);
function fb14EvLog(turn, W0, Wg, L0, C, from, W, X, D, PD) {
  let pp0 = null;
  if (L0) { const sh0 = fb14ShareU(L0, from - D, from + W + X + D, turn), pr0 = { id: 'fb14', share: (a, b) => (a === from - D ? sh0 : sh0.slice(a - (from - D), b - (from - D) + 1)) };
    const C0 = zwChoose(L0, from, W, PD, pr0, { d: fb14DoubtFloor(turn, W0.doubt), b3: fb14Blind(turn), b4: 0 }); pp0 = C0.none ? +(C0.pp || 0).toFixed(3) : +C0.pp.toFixed(3); }
  const e = { turn, cut: Wg.cnt, states0: W0.kept, states: Wg.kept, doubt0: +W0.doubt.toFixed(4), doubt: +Wg.doubt.toFixed(4), pp0, pp: C.pp != null ? +C.pp.toFixed(3) : null, atk: FB14.atk, bolts: FB14_BOLT_D != null ? FB14.bolts.length : undefined };
  const key = JSON.stringify([e.cut, e.states0, e.states, e.pp0, e.pp]); if (FB14.evLog[turn] === key) return; FB14.evLog[turn] = key;
  slog('fb14Evidence', e);
}
function fb14Kind(turn) { return turn === 1 ? 'cn' : 'nothing'; }
function fb14Blind(turn) { return FB14_BLIND[turn] || 0.5; }
function fb14Goal(turn) { return turn === 4 ? 'the wave, and it misses Mario' : 'Bowser misses'; }
function fb14BlindText(turn) { return 'play it blind: ' + (turn === 1 ? (fb14SkipMode() ? 'skip Cloud Nine\'s message (A)' : 'Cloud Nine') : 'Do Nothing') + ' whenever you like (' + fb14Goal(turn) + ' about ' + Math.round(100 * fb14Blind(turn)) + '%; T1-T4 all blind about 5%)'; }
function fb14Plan(cAt) {      // cAt (tests): plan as if the screen showed on clock frame cAt, no beeps
  // v101: in T1's skip phase the plan is T1's skip whatever step the route shows (Cloud Nine's screen closing moves it to T2's Charge)
  const skp = fb14SkipPhase(), stp0 = fb14Step(), stp = skp ? (RT().find(x => x.fb14 === 1 && x.fb14role === 'lever') || stp0) : stp0, turn = stp && stp.fb14;
  if (!turn || stp.fb14role !== 'lever') return false;
  if (cAt == null) FB14.decide = null;
  if (FB14.hit && FB14.hitLogged !== turn) { FB14.hitLogged = turn; slog('fb14NoEdge', { turn, why: 'hit', hit: FB14.hit }); }
  if (FB14.hit === 4 || FB14.routeOff) { st.msg = 'Route off: ' + (FB14.routeOff || 'Mario was hit on T4') + '. The page plans no Final Bowser lever from this attempt (the next attempt\'s T1 Charge locks again).'; FB14.plan = { none: 'route off', turn }; fb14Show(); if (cAt == null) { cancelBeeps(); render(); } return true; }
  if (FB14.hit) { st.msg = 'No edge: Mario was hit on T' + FB14.hit + ' (the Life Shroom revive is not modelled, and it ends the route\'s dodge). ' + fb14BlindText(turn)[0].toUpperCase() + fb14BlindText(turn).slice(1) + '.'; FB14.plan = { none: 'hit', turn }; fb14Show(); if (cAt == null) { cancelBeeps(); render(); } return true; }
  // v91 (logs E 1511.16 s, F): no plan once this turn's lever was confirmed
  if (cAt == null && FB14.pT && FB14.pT[turn] != null && !(turn === 1 && skp)) { if (FB14.afterConf !== turn) { FB14.afterConf = turn; slog('fb14PlanAfterConfirm', { turn }); } cancelBeeps(); return true; }
  // v93 (log a87486a0 attempt 2 T1, 259.67 s: a second plan, target 273, 0.34 s after the bar hid on Cloud Nine's confirm and
  // 0.03 s before that hide was taken as the confirm): the plan's beeps had played, the page's own plan loop asked again. The
  // bar gone on a lever step is a confirm being read: no plan until the hide watch has decided (FB14_C9WAIT)
  if (cAt == null && FB14.hideWatch && FB14.hideWatch.gone && performance.now() - FB14.hideWatch.gone < FB14_C9WAIT) { if (FB14.heldLogged !== FB14.hideWatch.gone) { FB14.heldLogged = FB14.hideWatch.gone; slog('fb14PlanHeld', { turn, goneMs: Math.round(performance.now() - FB14.hideWatch.gone) }); } return true; }
  if (turn === 1 && fb14SkipMode() && !(FB14.pT && FB14.pT[1] != null) && cAt == null) { if (FB14.c9Msg !== FB14.lockN) { FB14.c9Msg = FB14.lockN; slog('fb14SkipFirst', { on: FB14.on }); }
    st.msg = 'T1: Cloud Nine now, no beep for it (hand on Mario, A). Then keep your thumb on A: ' + (FB14.on ? 'the beep says when to press A to skip its message (that A is the lever).' : 'once the seed is read (3-5 s after the Charge) the beep says when to press A to skip its message.'); FB14.plan = { none: 'Cloud Nine first', turn }; cancelBeeps(); fb14Show(); render(); return true; }
  if (!FB14.on && cAt == null && (['capture', 'maps', 'search'].includes(CHG.state) || FB14.refining)) { st.msg = 'WAIT, searching… The Charge rays are being read (about 3-5 s after the Charge; console Cloud Nine confirms came 4 s after it). Wait on ' + (turn === 1 ? 'Cloud Nine\'s target (hand on Mario)' : 'Lakilester\'s Do Nothing') + ': the beeps, or "No edge", come as soon as the seed is read.'; FB14.plan = { none: 'reading', turn }; fb14Show(); render(); return true; }
  if (!FB14.on) { st.msg = 'No Final Bowser lock: ' + fb14BlindText(turn) + '.'; FB14.plan = { none: 'no lock', turn }; fb14Show(); if (cAt == null) render(); return true; }
  // v92 (e2e 5eed0fb2: T2's Do Nothing beeped during Bowser's T1 attack, 25 s before T2's Charge, at 95%; e2e 9e3779b9 /
  // 1234abcd: fb14NoDecision on T3 before its Jelly): a lever turn (T3: its Jelly)
  // with a Charge is planned only once that Charge was seen (its frame is in the states); before it the beeps could only be wrong
  if ((stp.chg || turn === 3) && FB14.M[turn] == null && cAt == null) { if (FB14.waitChg !== turn) { FB14.waitChg = turn; slog('fb14WaitCharge', { turn }); } st.msg = 'T' + turn + ': waiting for this turn\'s ' + (turn === 3 ? 'Jammin\' Jelly' : 'Super Charge (its rays are read') + ', then the beeps or "No edge"' + (turn === 3 ? '.' : ').'); FB14.plan = { none: 'charge', turn }; cancelBeeps(); fb14Show(); render(); return true; }
  if (FB14.pendChg && cAt == null) { st.msg = 'WAIT, searching… this turn\'s Charge rays are being read. Wait on ' + (turn === 1 ? 'Cloud Nine\'s target (hand on Mario)' : 'Lakilester\'s Do Nothing') + '.'; FB14.plan = { none: 'reading', turn }; fb14Show(); render(); return true; }
  const now = performance.now(), h = cAt != null ? cAt : fb14Horizon(now); fb14Advance(h);
  const EV0 = cAt == null && !window.__fb14WeighTest && fb14HasV() ? fb14Weigh(h, true) : null, L0 = EV0 && EV0.list.length ? fb14Sample(EV0.list, FB14_NSAMPLE) : null;     // v100: the same plan without the picture's evidence (logged)
  const Wg = (window.__fb14WeighTest || fb14Weigh)(h); FB14.doubt = Wg.doubt;     // (__fb14WeighTest: tests only, v91 hysteresis)
  // v76: every state ruled out = the carried seed is gone (an off-route turn: an item instead of Charge / Cloud Nine, an
  // unblocked attack, a Life Shroom; or a carry from an earlier attempt). Say so once and let the next Charge lock afresh
  // (log 1794071163309, attempt A: no edge at doubt 1 for the rest of the fight).
  if (turn === 3 && cAt == null && (!Wg.list.length || Wg.doubt >= FB14_EDGE_ON) && fb14Relock3(h)) { const W2 = fb14Weigh(h); Wg.list = W2.list; Wg.doubt = W2.doubt; Wg.sum = W2.sum; FB14.doubt = W2.doubt; }
  if (!Wg.list.length && FB14.gone) { fb14CarryGone(); st.msg = 'The carried seed is gone: what the page saw since the last lock does not fit the route (an item or Life Shroom instead of Charge / Cloud Nine, an unblocked attack, or a lock from an earlier attempt). The next Super Charge locks again. ' + fb14BlindText(turn)[0].toUpperCase() + fb14BlindText(turn).slice(1) + '.'; FB14.plan = { none: 'gone', turn }; fb14Show(); if (cAt == null) render(); return true; }
  // v91 (log 28b4ae32 T2: 13 s at doubt 0.47-0.78, three plans and three cancels, "No edge" every 0.5 s): hysteresis. After
  // "No edge" a plan needs the doubt under FB14_EDGE_ON; a running plan (a replan) holds to FB14_EDGE_OFF
  const offNow = FB14.noEdge && FB14.noEdge[turn], lim = FB14.prevPlan && FB14.prevPlan.fb14 === turn ? FB14_EDGE_OFF : offNow ? FB14_EDGE_ON : 0.5;
  if (!Wg.list.length || Wg.doubt >= lim) { st.msg = 'No edge yet: the coin does not confirm the Final Bowser lock (the beeps come if it does). ' + fb14BlindText(turn)[0].toUpperCase() + fb14BlindText(turn).slice(1) + '.'; FB14.plan = { none: 'doubt', turn, doubt: Wg.doubt }; if (!offNow) slog('fb14NoEdge', { turn, doubt: +Wg.doubt.toFixed(3), states: Wg.list.length, lim }); FB14.noEdge = FB14.noEdge || {}; FB14.noEdge[turn] = true; fb14Show(); if (cAt == null) { cancelBeeps(); render(); } return true; }
  const rate = fbRate(); let W = Math.max(0, Math.round(num('zwwin') * 1000 / rate));
  let from = cAt != null ? Math.ceil(cAt + num('lead') * 1000 / rate + 1) : Math.max(h + 1, Math.ceil(fbPic(now) + 1));
  if (cAt == null) for (let i = 0; i < 600 && fbPressT(from) < earliestPress(now); i++) from++;
  // v101 (e2e 9e3779b9 T2: the carried lock in 3.5 s planned M + 166, 3 frames before the runner could be on Do Nothing; Bowser
  // hit on M + 169): a Charge turn's Do Nothing is not planned before FB14_DNMIN after its Charge (the e2e's partner menus with
  // the popup closed on + 78 .. + 100: the earliest confirm M + 157 .. + 174; console confirms with no beep 5.2-5.9 s after the hide)
  if (!skp && stp.chg && FB14.M[turn] != null && from < FB14.M[turn] + FB14_DNMIN) { from = FB14.M[turn] + FB14_DNMIN; if (FB14.dnMinLog !== turn) { FB14.dnMinLog = turn; slog('fb14DnMin', { turn, from }); } }
  // v101: the skip's frames are the message's (P + 258 .. P + 311 of the box onset's P, else of Cloud Nine's reading): the
  // whole window, FB14_SKIP_M frames in from each end
  if (skp) { const [w0, w1] = fb14SkipWin(); from = Math.max(from, w0); W = w1 - from;
    if (W < 0) { const pl = { none: 'the message window is over', turn, sk: true }; FB14.plan = pl; if (cAt != null) return pl; st.msg = 'No edge: Cloud Nine\'s message window is over. ' + fb14BlindText(1)[0].toUpperCase() + fb14BlindText(1).slice(1) + '.'; slog('fb14NoEdge', { turn, why: 'skip window over' }); cancelBeeps(); fb14Show(); render(); return true; } }
  const L = fb14Sample(Wg.list, FB14_NSAMPLE), PD = cAt != null ? PRESS_ERR : pressDist(), D = Math.max(...PD.map(x => Math.abs(x[0]))), X = 10;
  const t1 = performance.now(), share = fb14ShareU(L, from - D, from + W + X + D, turn), ms = Math.round(performance.now() - t1);
  const prof = { id: 'fb14', share: (a, b) => (a === from - D ? share : share.slice(a - (from - D), b - (from - D) + 1)) };
  // v101 (e2e 2b7e1516 T1: zwChoose's "later" reach picked + 315, past the message: a skip that does nothing): a skip plan's frames
  // are held inside the message's window (zwChoose lim)
  const dEff = fb14DoubtFloor(turn, Wg.doubt), C = zwChoose(L, from, W, PD, prof, { d: dEff, b3: fb14Blind(turn), b4: 0 }, undefined, skp ? { lo: from, hi: from + W } : undefined);
  if (EV0) fb14EvLog(turn, EV0, Wg, L0, C, from, W, X, D, PD);
  if (cAt == null || window.__fb14ReplanTest) fb14Anchor(C, from, W, turn, PD);
  if (!window.__fb14WeighTest) fb14Broad(C, Wg, turn, dEff, PD);     // v104: the claim no higher than every state the coin has not ruled out supports
  // v101 (diagnostic, the e2e's truth trace only): the true states' own share around the planned frame (v102: after the anchor,
  // the frame the beeps aim at; pp the plan's claim there)
  if (window.__fb14seeds && !C.none && C.target != null) { const Tl = Wg.list.filter(S => fb14IsTrue(S)), TlS = Tl.filter(fb14IsTrueS), nS = TlS.length, allS = FB14.states.filter(fb14IsTrueS), nAll = allS.length; if (allS.length) FB14.tRef = fbClone(allS[0]); else if (FB14.tRef) fb14TruthDiv(h); if (Tl.length) { const sh = fb14Share(Tl, C.target - 2, C.target + 2, turn, skp ? 'skip' : fb14Kind(turn)); const by = {}; for (const S of Tl) { const k = S.p1 + '/' + S.l; (by[k] = by[k] || []).push(S); } const per = {}; for (const k in by) per[k] = Array.from(fb14Share(by[k], C.target - 2, C.target + 2, turn, skp ? 'skip' : fb14Kind(turn))).map(x => +x.toFixed(2));
    slog('fb14TruthPlan', { turn, target: C.target, pp: +C.pp.toFixed(3), fresh: FB14.how !== 'carried', n: Tl.length, nS, nAll, topK: fb14TruthTop(Wg.list), topA: fb14TruthTop(FB14.states), why: nS ? undefined : fb14TruthWhy(h), shS: nS ? Array.from(fb14Share(TlS, C.target - 2, C.target + 2, turn, skp ? 'skip' : fb14Kind(turn))).map(x => +x.toFixed(2)) : undefined, sh: Array.from(sh).map(x => +x.toFixed(2)), p1: [...new Set(Tl.map(S => S.p1))].slice(0, 8), per }); } else slog('fb14TruthPlan', { turn, target: C.target, pp: +C.pp.toFixed(3), fresh: FB14.how !== 'carried', n: 0, nS: 0, nAll, topA: fb14TruthTop(FB14.states), why: fb14TruthWhy(h) }); }
  if (C.none) { const pl = { none: C.none, turn, best: C.pp, spread: C.p }; FB14.plan = pl; if (cAt != null) return pl;
    st.msg = 'No edge: ' + Wg.list.length + ' possible states and no frame in the next ' + num('zwwin') + ' s works for enough of them with a perfect press (best ' + Math.round(100 * (C.pp || 0)) + '%). ' + fb14BlindText(turn)[0].toUpperCase() + fb14BlindText(turn).slice(1) + '.'; slog('fb14NoEdge', { turn, best: C.pp, spread: C.p }); cancelBeeps(); fb14Show(); render(); return true; }
  const pl = { turn, sk: skp || undefined, target: C.target, p: C.p, pp: C.pp, win: C.w.length, pStates: C.pStates, doubt: +Wg.doubt.toFixed(3), floor: dEff > Wg.doubt ? +dEff.toFixed(3) : undefined, fresh: FB14.fresh ? true : undefined, relock: FB14.relock || undefined, states: Wg.list.length, broad: C.broad, ms, from, W, w: C.w, tPress: fbPressT(C.target), blind: fb14Blind(turn) };
  FB14.plan = pl; if (cAt != null) return pl;
  if (FB14.noEdge) FB14.noEdge[turn] = false;
  const prev = FB14.prevPlan, same = prev && prev.target === C.target && Math.abs(prev.tPress - pl.tPress) < 5;   // v76: a replan on the same frame keeps the beeps already scheduled
  if (!same) { cancelBeeps(); playBeeps(pl.tPress); } else slog('fb14SameTarget', { target: C.target });
  const tLast = FB14.t0 + (fb14Bias() - 1.2) * rate - num('vlag');      // pressTime(tLast, rate, F) = fbPressT(F)
  const a = C.a, tab = []; for (let F = from - 30; F <= from + W + 30; F++) tab.push(F >= a && F <= C.b ? C.share[F - a] >= 0.5 : false);
  st.plan = { tMade: now, w: C.w, target: C.target, tPress: pl.tPress, tLast, rate, carried: true, from, to: from + W, first: from - 30, prof: 'fb14', tab, tab4: null, type: C.type, beeps: nBeeps(),
    mix: { p: C.p, pStates: C.pStates, pp: C.pp, ppStates: C.ppStates, win: C.w.length, doubt: pl.doubt, groups: Wg.list.length, zw: true, fb14: turn }, PD, zwAbs: C.target, fb14: turn, bias: fb14Bias(), sk: skp, lever: skp ? 'fb14sk' : 'fb14', freshCap: !!pl.fresh };
  Object.defineProperty(st.plan, 'L', { value: L, enumerable: false });      // v98: the tick re-scores this sample
  FB14.plans = (FB14.plans || []).concat([{ turn, target: C.target, tMade: now, tPress: pl.tPress, bias: fb14Bias(), sk: skp || undefined }]).slice(-20);
  st.msg = null; slog('fb14Plan', pl); fb14Show(); render(); return true;
}
/* v96 (log 0dfd444d T2: plans 205 -> 214 -> 227 within 0.7 s of the stream lock; the runner pressed 229 on the last): after
 * this turn's first plan the target does not chase later frames. A replan keeps the frame the runner is already counting on
 * while it still works (perfect press at the edge and within FB14_ANCHOR_TOL of the best frame in reach); otherwise it takes
 * the workable frame nearest to it (ties: the earlier), not the best of the whole next second. FB14.anchor[turn] holds the
 * first planned frame of the turn. */
const FB14_ANCHOR_TOL = 0.1, FB14_NSAMPLE = 300;
/* v98 (logs c6469b35, 7483f3b1 and the v89 e2e 1234abcd): T3 has failed on every console attempt that reached it with a
 * carry: the coin dropped every carried state between T2's confirm and T3's lever (c6469b35: shines 4-7 frames after the
 * frames the states give), or the states all agreed and T3 planned at 100% on a frame Bowser hit (7483f3b1: 1434, window 4,
 * doubt 0, pressed -0.37). The model replays the emulator exactly from T2's confirm to T3's lever (chain logs, also with the
 * Jelly at the first Mario menu: fb2_route/chain_log.py KMIN), so what differs on console is not pinned yet. Until it is, T3's
 * claim keeps at least FB14_T3_FLOOR of the blind chance (at most about 82%; a re-lock FB14_T3_RELOCK, about 77%): never a
 * 100% T3 beep. */
const FB14_T3_FLOOR = 0.35, FB14_T3_RELOCK = 0.45, FB14_SNAP = 1500, FB14_WIDE = [-3, 7];
const FB14_RL_N = [[-4, 0.03], [-3, 0.06], [-2, 0.12], [-1, 0.18], [0, 0.22], [1, 0.18], [2, 0.12], [3, 0.06], [4, 0.03]], FB14_RL_J = [[-2, 0.1], [-1, 0.2], [0, 0.4], [1, 0.2], [2, 0.1]];
/* v102 (the user: "never beep a confident wrong answer"): a fresh lock (no carried state drew its rays: T1, a lock after a hit
 * or a dropped carry) rests on one Charge read alone until a coin shine after its rays is seen (the states that survive it
 * explain it: an unexplained shine costs a state ZW_FALSE). Until then its doubt is at least FB14_FRESH_D, so its claim stays
 * under 95% (1 - 0.1 x (1 - blind): T2 0.95, T4 0.94) and the plan is made again (fb14Refine, under FB14_UP) once the coin
 * confirms it. A carried lock (two reads agreeing on one stream) is not capped. */
// v104: 0.12 (was 0.1: T2's cap 0.9495 shows as "95%" on the page; now 0.939, T4 0.927)
const FB14_FRESH_D = 0.12;
function fb14FreshOpen(h) { const Fr = FB14.fresh; if (!Fr) return false; const hh = h != null ? h : fb14Horizon(performance.now()); for (const t of FB14.taps) { const x = fbPic(t) - 4.8; if (x > Fr.F && x < hh) { FB14.fresh = null; slog('fb14FreshConfirmed', { turn: Fr.turn, F: Fr.F, shine: +x.toFixed(1) }); return false; } } return true; }
/* v104 (e2e PLANCHECK, 9e3779b9 T2 after the hit: a fresh lock of 22 states, none of them the truth on the per-frame check,
 * the coin "confirmed" it on its first shine and it planned at 100% on a frame Bowser hit): one shine cannot tell the truth
 * from a state a coin check apart. A fresh lock after T1 keeps FB14_FRESH_D until a later Charge locks carried (two reads on
 * one stream); T1 as v102 (capped until the coin, its claims stay under 95% anyway). */
function fb14DoubtFloor(turn, d) { if (fb14FreshOpen() || (turn > 1 && FB14.how === 'fresh')) d = Math.max(d, FB14_FRESH_D); return turn === 3 ? Math.max(d, FB14.relock === 3 ? FB14_T3_RELOCK : FB14_T3_FLOOR) : d; }
/* v98: T3 has no Charge to lock on. When the carry is gone or contradicted there (the coin), the states of T2's lock
 * (FB14.snap2: on the stream from that lock) are taken again with T2's Do Nothing confirm and T3's Jelly at wider shifts and
 * the coin matched in a wider window (FB14_WIDE): a coin-based re-lock on the stream, planned under FB14_T3_RELOCK, or the
 * carry is dropped as before. Once per attempt's T2 lock. */
function fb14Relock3(h) {
  const S2 = FB14.snap2; if (!S2 || FB14.relockTried || !S2.states.length) return false;
  FB14.relockTried = true;
  const xs = (FB14.inputs || []).filter(x => (x.turn === 2 && x.kind === 'nothing') || (x.turn === 3 && x.kind === 'jelly')).map(x => Object.assign({}, x, { F: x.t != null && FB14.t0 != null ? Math.round(fbPic(x.t) - (x.off || 0)) : x.F })).sort((a, b) => a.F - b.F);
  if (!xs.some(x => x.turn === 2)) { slog('fb14RelockNone', { turn: 3, why: 'no T2 confirm' }); return false; }
  const keepSt = FB14.states, wasOn = FB14.on, sum0 = S2.states.reduce((a, S) => a + S.w, 0) || 1;
  FB14.on = true; FB14.states = S2.states.map(S => { const T = fbClone(S); T.w = S.w / sum0; T.lw = 1; T.err = 0; return T; });
  for (const x of xs) { const sh = x.kind === 'nothing' ? FB14_RL_N : FB14_RL_J; const before = FB14.inputs; fb14Input(x.kind, x.F, x.turn, sh, x.t, x.off); FB14.inputs = before; }
  fb14Advance(h); FB14.wide = true; FB14.gone = false; FB14.allOutLogged = false;
  const W = fb14Weigh(h);
  if (!W.list.length) { slog('fb14RelockNone', { turn: 3, states: FB14.states.length, why: 'the coin' }); FB14.wide = false; FB14.states = keepSt; FB14.on = wasOn; FB14.gone = !keepSt.length || FB14.gone; return false; }
  FB14.states = W.list; FB14.relock = 3; FB14.bg = FB14_T3_RELOCK / (1 - FB14_T3_RELOCK); FB14.bgFrom = h; FB14.anchor = {};
  slog('fb14Relock', { turn: 3, from: S2.M, states: W.list.length, doubt: +W.doubt.toFixed(3), inputs: xs.map(x => x.kind + x.F) });
  return true;
}
/* v104 (e2e v103: 3 of 25 plans at 96-100% kept no true state; README v104): the coin's soft weighting (a matched shine x15, a
 * shine read outside a state's -2 .. +4.5 window x0.02) picks among states whose shines come a frame or a coin check apart,
 * and the e2e showed it picking wrong ones (2b7e1516 T2: 117 -> 48 -> 18 kept, then 151 again; 9e3779b9 T2 after the hit: 20
 * -> 8): the claim then rose to 100% on the narrowed set while the doubt, which only counts "off the model", stayed 0. Now
 * the claim is re-scored on every state the coin has not ruled out (ZW_MAXERR errors or fewer, by their prior weight, the
 * coin's soft factors left out) and the plan claims the lower of the two: narrowing never raises a claim above what all the
 * states still possible support. The target is the kept states' (the coin still picks the frame). */
function fb14Broad(C, Wg, turn, d, PD) {
  if (C.none || C.target == null) return C;
  const B = FB14.states.filter(S => S.err <= ZW_MAXERR); if (B.length <= Wg.list.length) return C;
  const L = fb14Sample(B.map(S => { const X = Object.create(S); X.lw = 1; return X; }), FB14_NSAMPLE), Dm = Math.max(...(PD || [[0, 1]]).map(x => Math.abs(x[0])));
  const sh = fb14ShareU(L, C.target - Dm, C.target + Dm, turn), at0 = sh[Dm] || 0, bl = fb14Blind(turn); let v = 0; for (const [dd, q] of (PD || [[0, 1]])) v += q * (sh[dd + Dm] || 0);
  const pp = (1 - d) * at0 + d * bl, p = (1 - d) * v + d * bl; C.broad = { states: B.length, kept: Wg.list.length, pp: +pp.toFixed(3), ppKept: +C.pp.toFixed(3) };
  if (window.__fb14NoBroad) return C;     // (diagnostic: the e2e's before run, NOBROAD=1)
  if (pp < C.pp - 1e-9) { slog('fb14Broad', { turn, target: C.target, pp: +C.pp.toFixed(3), broad: +pp.toFixed(3), states: B.length, kept: Wg.list.length }); C.pp = pp; C.ppStates = at0;
    if (pp < num('zwedge')) C.none = 'broad'; }
  if (p < C.p) { C.p = p; C.pStates = v; }
  return C;
}
function fb14Anchor(C, from, W, turn, PD) {
  FB14.anchor = FB14.anchor || {}; const A = FB14.anchor[turn];
  if (C.none || C.target == null) return C;
  if (A == null) { FB14.anchor[turn] = C.target; return C; }
  if (C.target === A) return C;
  const at = c => C.share[c - C.a] || 0, honest = c => (1 - C.doubt) * at(c) + C.doubt * fb14Blind(turn), thr = Math.max(num('zwedge'), C.pp - FB14_ANCHOR_TOL);
  let pick = null; for (let c = from; c <= from + W; c++) { if (honest(c) < thr - 1e-12) continue; if (pick == null || Math.abs(c - A) < Math.abs(pick - A)) pick = c; }
  if (pick == null || pick === C.target) { slog('fb14ReplanMoved', { turn, anchor: A, target: C.target, pp: +C.pp.toFixed(3) }); return C; }
  let s0 = pick, e0 = pick; while (s0 - 1 >= from && honest(s0 - 1) >= thr) s0--; while (e0 + 1 <= from + W && honest(e0 + 1) >= thr) e0++;
  slog('fb14ReplanNear', { turn, anchor: A, best: C.target, bestPP: +C.pp.toFixed(3), target: pick, pp: +honest(pick).toFixed(3) });
  C.target = pick; C.w = { start: s0, end: e0, length: e0 - s0 + 1 }; C.pp = honest(pick); C.ppStates = at(pick);
  let v = 0; for (const [d, q] of (PD || [[0, 1]])) v += q * at(pick + d); C.pStates = v; C.p = (1 - C.doubt) * v + C.doubt * fb14Blind(turn);
  return C;
}
/* about 4 times a second with a plan running: the coin may have moved the weights; a planned frame that no longer works
 * for enough of the states stops its beeps (and replans while the beeps still fit) */
function fb14Tick(t) {
  const P = st.plan; if (!P || !P.fb14 || P.stopped || P.tPress < performance.now() - 300) return;
  if (FB14.pendChg) return;
  { const HW = FB14.hideWatch; if (HW && HW.gone && performance.now() - HW.gone < 600) return; }     // v91 (log E 1510.8 s): the bar just hid: maybe the confirm, no replan
  const h = fb14Horizon(performance.now()); if (FB14.tickH === h) return; FB14.tickH = h;
  // v76: re-score exactly as the plan scored (log 1794071163309, Final Bowser T2: 37 plans in 9 s). The tick summed the press
  // spread over -1..+1 only, while the plan's pressDist() reaches -4..+4 (the runner's spread, sd ~1.5): every re-score read
  // ~0.6 of the plan's 0.93 and replanned the same frame every 250 ms, so the beeps never played through. Same states sample
  // (150), same press spread.
  fb14Advance(h); const Wg = fb14Weigh(h); FB14.doubt = Wg.doubt; const PDt = P.PD || PRESS_ERR, D = Math.max(...PDt.map(x => Math.abs(x[0]))), sh = fb14ShareU(fb14Resample(P.L, Wg.list) || fb14Sample(Wg.list, FB14_NSAMPLE), P.target - D, P.target + D, P.fb14);
  let v = 0; for (const [d, q] of PDt) v += q * (sh[d + D] || 0);
  // v83: the plan is a perfect press: re-scored on the planned frame itself (the spread-weighted chance only logged)
  const dT = fb14DoubtFloor(P.fb14, Wg.doubt), pS = (1 - dT) * v + dT * fb14Blind(P.fb14), p = P.mix.pp != null ? (1 - dT) * (sh[D] || 0) + dT * fb14Blind(P.fb14) : pS; P.mix.pNow = +p.toFixed(3); P.mix.pSpreadNow = +pS.toFixed(3);
  if (Wg.doubt < FB14_EDGE_OFF && p >= num('zwedge') && p >= (P.mix.pp != null ? P.mix.pp : P.mix.p) - FB14_TICK_DROP) {
    // v100: the states narrowed after the plan (the coin, Bowser's attack, a bolt): refine it while its beeps have not begun. The
    // replan keeps the anchored frame unless a frame FB14_ANCHOR_TOL better is in reach (fb14Anchor): no jumping
    const now = performance.now(), narrowed = Wg.list.length < 0.9 * (P.mix.groups || 1e9) || Wg.doubt < (P.mix.doubt || 0) - 0.02 || (P.freshCap && !FB14.fresh);     // v102: the fresh lock's cap lifted by the coin
    if (narrowed && (P.mix.pp || 0) < FB14_UP && P.tPress - (nBeeps() - 1) * num('gapms') > now + 300 && now - (P.upT || P.tMade) > 700) {
      slog('fb14Refine', { from: P.target, pp: +(P.mix.pp || 0).toFixed(3), pNow: +p.toFixed(3), states: Wg.list.length, was: P.mix.groups, doubt: +Wg.doubt.toFixed(3) });
      FB14.prevPlan = P; st.plan = null; fb14Plan(); FB14.prevPlan = null; if (st.plan) st.plan.upT = now; }
    return; }     // v96: 0.25 (was 0.15: 0dfd444d T2's second replan at 0.775 of 0.989)
  if (P.tPress - (nBeeps() - 1) * num('gapms') > performance.now() + 200) { slog('fb14Replan', { from: P.target, p: +p.toFixed(3) }); FB14.prevPlan = P; st.plan = null; fb14Plan(); FB14.prevPlan = null; return; }
  cancelBeeps(); P.stopped = true; slog('beepsStopped', { from: P.target, why: 'fb14', p: +p.toFixed(3), doubt: +Wg.doubt.toFixed(3) });
  st.msg = 'Beeps stopped: the coin no longer supports the planned frame. ' + fb14BlindText(P.fb14)[0].toUpperCase() + fb14BlindText(P.fb14).slice(1) + '.'; render();
}
/* the step's screen closed: the partner's confirm (the lever), read off the video to about +-2 frames */
const FB14_EDGE_ON = 0.4, FB14_EDGE_OFF = 0.55, FB14_TICK_DROP = 0.25, FB14_UP = 0.95;
const FB14_SHIFTS = [[-2, 0.1], [-1, 0.25], [0, 0.4], [1, 0.2], [2, 0.05]];
const FB14_C9WAIT = 1200;
/* v93 (console logs 00700c7e / a87486a0): the Do Nothing readings on console sit 1-4 frames before the frames the model gave the
 * outcomes seen (-3.54 / -3.76 against one-frame windows Bowser missed on; -1.02 against a two-frame window the wave missed
 * on; -1.03 off a one-frame window, hit): the carried states take the confirm on -2 .. +5 of the reading so that the true
 * one stays in the carry whichever it is (v92's -2 .. +2 cut it: the T4 carried check matched 16 wrong states, then none) */
// v94: the reading moved +3.4 (FB14_READX): the -2 .. +5 hedge of v93 (peak +3 / +4) is now centred on 0, -3 .. +3
const FB14_SHIFTS_S = [[-3, 0.03], [-2, 0.06], [-1, 0.16], [0, 0.44], [1, 0.19], [2, 0.08], [3, 0.04]];
/* v94 (README v94; fixtures/console_v94.json): the Final Bowser lever readings against the true press.
 * The practice ROM's own input display (11-09 clips) shows the A 8 vblanks after the external overlay; the Strategies panel
 * closes (the page's grey read) 2 vblanks after it on Final Bowser as on Jr. Troopa / Duplighosts, Cloud Nine's bar hides
 * 6-7 vblanks after it (a Charge's 4). The four Nov 12 Do Nothing outcomes fit one offset, true = reading + 3.26 .. 3.51,
 * once T4's clock is anchored on its burst (fb14TrigPhase): S 3.4. Cloud Nine's bar is 2.25 frames later after the same
 * press than the panel is: 3.4 - 2.25. The beeps do not move (the runner on the beep landed on the frame: 00700c7e T2 / T3). */
/* v96 (README v96): Cloud Nine's bar 2.5, pinned from the clips' overlay A against the same beeps: the reading minus the A's
 * lag after the beep is 0.87 frame later on Cloud Nine (4 presses with full beeps, -4.37 on v92 readings) than on Do Nothing
 * (11 presses, -5.24), so with both levers on one press chain x = 3.4 - 0.87 = 2.53; the six Cloud Nine outcomes leave only
 * x >= 2.25 (or x < -1) and the Do Nothing outcomes cap 3.4 at ~3.5, so 2.25 .. 2.65. The carry (906bfb29 T1 -> T2's
 * narrowed lock) does not pin it: a Charge seed fixes the number of draws, and Cloud Nine on 20 of 21 frames 260-280 reaches it. */
/* v101: K, Cloud Nine's message box (its onset and the skip), transferred from the panel as v96 did the bar: in the emulator
 * renders through the capture simulation and the page (fb14_e2e.py, SKIP=1) the box's readings sit 2.0 frames before the
 * truth (raw, VAN.K 3 / Kon 0) where the panel's sit 0.72 before; the console's panel needs 3.4, so the box 3.4 + 2.0 - 0.72 */
/* v102 (console skip clips fb0443 / fb0447 / fb0449, frame by frame against the in-game A icon): the page sees the message box and the
 * Strategies panel with the same delay (to 1 ms), and on console the box goes 2 game frames after the A icon, the panel 1 (VAN.K 3 -
 * VAN.S 2): the emulator's "box 2.0 early against the panel's 0.72" does not carry over, so K is the panel's 3.4 (v101: 4.7) */
const FB14_READX = { S: 3.4, bar: 2.5, K: 3.4 };
const fb14ReadX = (cat, src) => src === 'bar' ? FB14_READX.bar : (FB14_READX[cat] || 0);
const fb14Van = (cat, src) => (FB14_VAN[cat] || 2) + num('pfix') - fb14ReadX(cat, src);
/* v94: which burst frame the fb1 trigger picture is. The page takes it as frame 3; the console's levels (base-relative) by
 * burst frame, the median of 26 console fb1 captures of 11-09 .. 11-12: a trigger picture a whole frame early (a87486a0 T4:
 * +6.2 where frame 3 reads +9.8; its curve is the others' one picture later) put that turn's clock a frame early. Fitted on
 * the new pictures -1.5 .. +3.5 frames around the trigger; a fit at -0.5 or below (or +0.5 and up) moves the anchor a frame. */
const FB14_PHASE_TPL = [[1, 1.5], [2, 4.8], [3, 9.8], [4, 15.8], [5, 23.9], [6, 32.0], [7, 38.6]];
function fb14PhaseFit(pts) {      // pts: [frames from the trigger, level - base] of new pictures
  const T = n => { const K = FB14_PHASE_TPL; if (n <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (n <= K[i][0]) { const [a, va] = K[i - 1], [b, vb] = K[i]; return va + (vb - va) * (n - a) / (b - a); } return K[K.length - 1][1]; };
  const P = pts.filter(([t]) => t >= -1.5 && t <= 3.5); if (P.length < 4) return null;
  let best = null; for (let d = -1.5; d <= 1.5001; d += 0.05) { let e = 0; for (const [t, v] of P) e += (v - T(3 + t + d)) ** 2; if (!best || e < best.e) best = { d: +d.toFixed(2), e }; }
  return best.d;
}
/* v95 (logs 906bfb29 / 1509e942: every fb14TrigPhase read n 0): CHG.frames is emptied once the maps are made and CHG.F0
 * dropped at the lock; the levels are kept in CHG.Fm (charge_live.js); v94 read CHG.frames only (its test filled CHG.frames by hand), so the anchor never ran live
 * (906bfb29 T4's capture fits -1.0: its clock stayed a frame off). */
function fb14TrigPhase() {
  const tr = CHG.trig, P = CHG.prof; if (!tr || !P || P.id !== 'fb1' || tr.base == null) return 0;
  const pts = ((CHG.frames && CHG.frames.length ? CHG.frames : CHG.Fm) || []).filter(f => f && !f.rep && Number.isFinite(f.m)).map(f => [(f.t - tr.t) / FRAME, f.m - tr.base]);
  const d = fb14PhaseFit(pts); const shift = d == null ? 0 : d <= -0.5 ? -1 : d >= 0.5 ? 1 : 0;
  slog('fb14TrigPhase', { fit: d, shift, n: pts.length });
  return shift;
}
const fb14TrigT = () => CHG.trig ? CHG.trig.t - fb14TrigPhase() * FRAME : null;   // the frame-3 picture's time
/* v95 (log 1509e942 T1: a 97.6% Cloud Nine plan, read inside its window, and Bowser hit; on the true seed: T1's fresh lock
 * lies 21792 steps on the stream of the attempt before, T2's stream lock 2657 after it): Cloud Nine's +1.15 is not borne out.
 * Of the 5 planned Cloud Nines on console 4 were hit where the plans expected 0.9; on these windows the outcomes leave the
 * offset anywhere outside -0.85 .. +2.15 (README v95). Until it is pinned: the T1 share is the mean over the offsets
 * FB14_C9UNC frames from the reading (so a plan needs a long run of frames to claim much), and the Cloud Nine confirm goes into
 * the carried states on -3 .. +4 (FB14_C9SHIFTS). */
// v96: pinned to 2.25 .. 2.65 (FB14_READX): the T1 share is the mean over -1 .. +1 (0.2 / 0.6 / 0.2), the confirm carried on -3 .. +3
const FB14_C9UNC = [[-1, 0.2], [0, 0.6], [1, 0.2]];
const FB14_C9AFTER = 2500, FB14_C9HIDE = 2, FB14_C9SHIFTS = [[-3, 0.03], [-2, 0.07], [-1, 0.18], [0, 0.44], [1, 0.18], [2, 0.07], [3, 0.03]];
/* v92 (e2e 5eed0fb2 T1: Mario's action wheel matched the saved Mario target screen, the screen "closed" when the submenu
 * opened and moved the route to Cloud Nine's step; the Charge's own target screen then closed 0.06 s after its burst and
 * was taken as Cloud Nine's confirm, the route went to T2 and T1's lock was read as T2's). A lever screen closing within
 * FB14_OWNCLOSE of this turn's Charge burst is that Charge's own: the partner's screen is up 4.5 s after the burst at the
 * earliest (every console clip 5.2-5.9 s after the hide). Not a confirm, the route stays. */
const FB14_OWNCLOSE = 2500;
function fb14OwnClose(tObs, stp) {
  const lb = FB14.lastBurst; if (!stp || !stp.fb14 || stp.fb14role !== 'lever' || !lb || lb.turn !== stp.fb14) return false;
  const dt = tObs - lb.t; if (dt < -200 || dt > FB14_OWNCLOSE) return false;
  slog('fb14OwnClose', { turn: stp.fb14, afterMs: Math.round(dt), step: routeStep }); return true;
}
function fb14Confirm(tObs, stp, shifts, src) {
  if (!stp || !stp.fb14) return;
  const turn = stp.fb14;
  if (stp.fb14role !== 'lever') return;
  if (turn === 4) FB14.p4t = tObs; FB14.pT = FB14.pT || {}; FB14.pT[turn] = tObs;
  // v101 (e2e 1234abcd / 9e3779b9: Cloud Nine read 3-7 frames late): in skip mode the runner confirms Cloud Nine while the T1
  // search loads the page and pictures are dropped; a screen-read Cloud Nine seen after a gap between pictures happened anywhere
  // in it (as the bar's hide, fb14GapShifts)
  if (turn === 1 && fb14SkipMode() && src !== 'bar' && !shifts) { const pv = FB14.lastT != null && FB14.lastT < tObs ? FB14.lastT : FB14.picPrev, gap = pv != null ? tObs - pv : 0; shifts = fb14GapShifts(FB14_SHIFTS, gap); if (shifts !== FB14_SHIFTS) slog('fb14C9Gap', { gapMs: Math.round(gap), shifts: shifts.length }); }
  if (FB14.t0 == null || !FB14.on) { FB14.pend = (FB14.pend || []).concat([{ tObs, turn, cat: stp.cat, shifts, src }]); slog('fb14ConfirmBeforeLock', { turn, src }); return; }   // the lock comes later: applied then
  const c = fbPic(tObs) - fb14Van(stp.cat, src), F = Math.round(c);
  FB14.P[turn] = F; if (turn === 4) FB14.p4t = tObs; const P0 = st.plan && st.plan.fb14 === turn && !st.plan.sk ? st.plan : null;
  // v91 (logs E, F: the confirm logged at err -91 / -63 against a replan made after the press): the plan up at the press
  const Ph = (FB14.plans || []).filter(x => x.turn === turn && !x.sk && x.tMade <= tObs).pop(), P = Ph && (!P0 || P0.tMade > tObs) ? Object.assign({}, P0 || {}, { target: Ph.target, tMade: Ph.tMade, bias: Ph.bias, stopped: false }) : P0;
  slog('fb14Confirm', { turn, F, c: +c.toFixed(2), planned: P ? P.target : null, err: P ? +(c - P.target).toFixed(2) : null, src, lever: turn === 1 && fb14SkipMode() ? 'cloud nine (not the lever: the skip is)' : undefined });
  if (P && !P.stopped && src !== 'bar' && Math.abs(c - P.target) <= 5) { const L = fb14PressAdd(c - P.target - (P.bias || 0), 'fb14'); slog('fb14PressBias', { n: L.length, bias: +fb14Bias().toFixed(2) }); if (typeof leverPressNote === 'function') leverPressNote('Final Bowser T' + turn + ', ' + (turn === 1 ? 'Cloud Nine' : 'Do Nothing'), c - P.target, 'fb14'); }
  if (FB14.on) { const h = fb14Horizon(performance.now()); fb14Advance(Math.min(h, F - 3)); fb14Input(fb14Kind(turn), F, turn, shifts || (stp.cat === 'S' ? FB14_SHIFTS_S : FB14_SHIFTS), tObs, fb14Van(stp.cat, src)); }
  fb14Show();
}
/* v101: Cloud Nine's message box on screen. The box (320-space x 47..272, y 82..105; opaque beige 200,191,164 in the Glide64
 * renders, dark text) shows from P + 255 to the skip + 2 (or + 317 left alone). Read on a 22 x 4 grid inside it (x 50..270,
 * y 84..103): the box is up when FB14_BOX.frac of the cells are its beige. Watched only in T1's skip phase window
 * (P + 200 .. P + 400). The onset gives P again (the box's own frame, to a frame); its first picture gone is the skip. */
const FB14_BOX = { x0: 50, x1: 270, y0: 84, y1: 103, gw: 22, gh: 4, frac: 0.55, need: 2 };
// the skip into the carried states on the panel's -3 .. +3 (the same press chain, the offset transferred: not borne out on console);
// the plan keeps FB14_SKIP_M frames off each end of the message (a transfer off by up to ~2.7 frames still lands inside)
const FB14_SKSHIFTS = [[-3, 0.03], [-2, 0.06], [-1, 0.16], [0, 0.44], [1, 0.19], [2, 0.08], [3, 0.04]], FB14_SKUNC = [[-1, 0.2], [0, 0.6], [1, 0.2]], FB14_SKIP_M = 3;
function fb14BoxBox() { const [SX, OX, SY, OY] = chgMap(), B = FB14_BOX; return { x: (OX + B.x0 * SX) / 1280, y: (OY + B.y0 * SY) / 720, w: (B.x1 - B.x0) * SX / 1280, h: (B.y1 - B.y0) * SY / 720 }; }
const fbBoxPx = (g, i) => { const R = g[i], G = g[i + 1], B = g[i + 2]; return R > 140 && G > 128 && B > 95 && R - B > 8 && R - B < 85 && Math.abs(R - G) < 35; };
function fb14BoxShare(g) { let n = 0; for (let i = 0; i < g.length; i += 4) if (fbBoxPx(g, i)) n++; return n / (g.length / 4); }
function fb14BoxFrame(t) {
  if (!fb14SkipMode() || !FB14.pT || FB14.pT[1] == null || FB14.sk != null || FB14.t0 == null) return;
  const F = fbPic(t), P1 = FB14.P && FB14.P[1] != null ? FB14.P[1] : fbPic(FB14.pT[1]); if (F < P1 + 200 || F > P1 + 400) return;
  const g = window.__fbVisTest ? window.__fbVisTest('box') : fbVisGrid(fb14BoxBox(), FB14_BOX.gw, FB14_BOX.gh); if (!g) return;
  const fr = fb14BoxShare(g), up = fr >= FB14_BOX.frac, W = FB14.boxW || (FB14.boxW = { run: 0, off: 0, t1: null, gone: null, seen: 0, mx: 0 });
  W.mx = Math.max(W.mx, fr);
  if (!FB14.box) {
    // v102 (console fb0449: the onset read ~1.5 frames late after dropped pictures): the frames between the last picture without
    // the box and its first picture are where it may have shown; the window's top end comes in by them (fb14SkipWin)
    if (up) { if (!W.run) { W.t1 = t; W.gap1 = W.lastT != null ? Math.max(0, Math.min(10, Math.round((t - W.lastT) / fbRate()) - 1)) : 0; } W.run++; } else W.run = 0;
    W.lastT = t;
    if (W.run >= FB14_BOX.need) { const c = fbPic(W.t1) - (FB14_VAN.Kon + num('pfix') - FB14_READX.K); FB14.box = { t: W.t1, c: +c.toFixed(2), P: Math.round(c) - FB14_SKIP.lo, P1, gap: W.gap1 || 0 }; W.seen = W.run;
      slog('fb14BoxOn', { at: Math.round(W.t1), c: FB14.box.c, P: FB14.box.P, P1, frac: +fr.toFixed(2), gap: FB14.box.gap || undefined });
      // a skip plan made on Cloud Nine's reading whose frame is outside the box's own window: planned again
      const SP = st.plan && st.plan.sk ? st.plan : null, w = fb14SkipWin();
      if (SP && !SP.stopped && SP.tPress > performance.now() && (SP.target < w[0] || SP.target > w[1])) { slog('fb14SkipReplan', { from: SP.target, win: w }); cancelBeeps(); FB14.prevPlan = SP; st.plan = null; fb14Plan(); FB14.prevPlan = null; } }
    return;
  }
  if (up) { W.seen++; W.gone = null; W.off = 0; return; }
  if (W.gone == null) W.gone = t; W.off++;
  if (W.off >= FB14_BOX.need && W.seen >= 3) fb14SkipConfirm(W.gone);
}
// the skip read (its box's first picture gone): the T1 lever's frame
function fb14SkipConfirm(tObs) {
  const van = fb14Van('K'), c = fbPic(tObs) - van, F = Math.round(c), B0 = fb14SkipBase(), nat = F > B0 + FB14_SKIP.hi;
  const P = st.plan && st.plan.sk ? st.plan : (FB14.plans || []).filter(x => x.sk && x.tMade <= tObs).pop() || null;
  FB14.sk = F;
  slog('fb14Confirm', { turn: 1, lever: 'skip', F, c: +c.toFixed(2), planned: P ? P.target : null, err: P ? +(c - P.target).toFixed(2) : null, base: B0, k: F - B0, natural: nat || undefined, src: 'box' });
  if (P && !P.stopped && !nat && Math.abs(c - P.target) <= 5) { const L = fb14PressAdd(c - P.target - (P.bias || 0), 'fb14sk'); slog('fb14PressBias', { lever: 'fb14sk', n: L.length, bias: +fb14Bias('fb14sk').toFixed(2) }); if (typeof leverPressNote === 'function') leverPressNote('Final Bowser T1, the A that skips Cloud Nine\'s message', c - P.target, 'fb14sk'); }
  if (FB14.on) { fb14Advance(Math.min(fb14Horizon(performance.now()), F - 3)); fb14Input('skip', F, 1, FB14_SKSHIFTS, tObs, van); }
  if (st.plan && st.plan.sk) { if (st.plan.tPress > performance.now()) cancelBeeps(); st.plan = null; }
  fb14Show();
}
// T1's skip plan, made as soon as Cloud Nine is in (the route may already show T2's Charge step); fb14Tick keeps it
function fb14SkipTick() {
  if (!fb14SkipPhase()) return; const now = performance.now();
  if (st.plan && st.plan.sk) return;
  if (FB14.plan && FB14.plan.none && FB14.plan.sk) return;
  if (FB14.skTry && now - FB14.skTry < 500) return; FB14.skTry = now;
  FB14.decide = null; fb14Plan();
}
/* ---- T5: the Peach Beam confirm; T6: the Charge searched on the carried stream ---- */
function fb14Peach() {
  if (!FB14.on || !FB14.pb || FB14.pb.F == null) return;
  const F = FB14.pb.F, out = []; fb14Advance(Math.min(fb14Horizon(performance.now()), F));
  const Wg = fb14Weigh(F); if (!Wg.list.length) { FB14.why = 'no state left at the Peach Beam'; fb14Show(); return; }
  for (const S of Wg.list.slice(0, 200)) { const T = fbClone(S); fbRun(T, F - T.l); out.push({ s: T.s >>> 0, w: T.w * T.lw, l: T.l, F: F - T.l }); }
  FB14.t6 = { at: F, bases: out, doubt: Wg.doubt };
  slog('fb14T6Ready', { F, bases: out.length, doubt: +Wg.doubt.toFixed(3) });
  fb14Show();
}
/* the T6 Charge's candidates: every seed FB14_T5 random numbers (plus the frames) after a carried Peach Beam seed. The
 * bases are merged where their stretches overlap (they are points on the same LCG stream a few steps apart). Returns
 * the seeds before A's base-angle draw, or null (no carry). */
function fb14T6Cands() {
  const T6 = FB14.t6; if (!T6 || !CHG.trig || T6.doubt >= 0.5) return null;
  const M6 = Math.round(fbPic(CHG.trig.t) - 16), out = new Set();
  const groups = [];
  for (const b of T6.bases) {
    const n0 = (M6 - b.l) + 13 - b.F, lo = n0 + FB14_T5[0], hi = n0 + FB14_T5[1];
    if (lo < 0) continue;
    let g = groups.find(G => { let x = G.s; for (let i = 0; i < 400; i++) { if (x === b.s) { G.lo = Math.min(G.lo, lo + i); G.hi = Math.max(G.hi, hi + i); return true; } x = fbAdv(x); } return false; });
    if (!g) groups.push({ s: b.s, lo, hi });
  }
  for (const G of groups) { let x = G.s; for (let i = 0; i < G.lo; i++) x = fbAdv(x); for (let n = G.lo; n <= G.hi; n++) { out.add(x >>> 0); x = fbAdv(x); } }
  if (window.__fb14truthT6 != null) { let x = window.__fb14truthT6 >>> 0, hit = -1; for (let k = 0; k < 3; k++) { if (out.has(x >>> 0)) hit = k; x = fbAdv(x); } slog('fb14T6Truth', { inCands: hit >= 0, bolts: hit }); }
  slog('fb14T6Cands', { M6, groups: groups.length, cands: out.size });
  return out.size ? [...out] : null;
}
/* ---- route glue ---- */
/* a T2 / T4 Charge's burst: its Mario confirm on the fight's clock, and its rays' creations into the carried states */
const t0Trig = () => (typeof CHG !== 'undefined' && CHG.trig ? CHG.trig.t : performance.now());
function fb14Trigger() {
  // v76 (console 2026-11-07 11:55, log 1794070564756): the route waited on T1's Charge step for the Mario target screen to
  // close, and that screen was never saved, so the step never moved: no Cloud Nine step, and the reader stayed 'locked'
  // through T2's Charge (no T2 lock, no Do Nothing plan). A Charge burst is proof enough of where the fight is: on T1's
  // Charge step it is that Charge (the route goes to the Cloud Nine step); on a lever step after that turn's lock it is
  // the next Charge (T2 / T4: the lever went by unseen, the route goes to that turn's step).
  { let s = fb14Step(); const t = CHG.trig ? CHG.trig.t : performance.now(), lb = FB14.lastBurst, c1 = RT().findIndex(x => x.fb14 === 1 && x.fb14role === 'charge');
    // a Charge this long after the last one is a new attempt (T1-T4's Charges are 20-60 s apart): the old carry goes
    // (log 1794071163309, attempt A: a T1 lock from the attempt 5 minutes before was still carried and every state died)
    if (s && lb && t - lb.t > FB14_NEWATTEMPT && c1 >= 0) { slog('fb14NewAttempt', { from: routeStep, after: Math.round(t - lb.t) }); fb14Reset('new attempt'); setStep(c1); s = fb14Step(); }
    // v86 (clip 15-24-14 fed to the page): a saved Mario target screen matched twice in T1's menus before the Charge, the
    // route ran on to T2's Do Nothing step, the T1 lock was taken as T2's and T2's Charge as T4's. The first burst of an
    // attempt with no lock yet is T1's Charge whatever step the screens moved the route to: back to Cloud Nine's step, and
    // the confirms read before it dropped (Cloud Nine comes after the Charge)
    const c1l = RT().findIndex(x => x.fb14 === 1 && x.fb14role === 'lever');
    if (s && s.fb14 > 1 && !FB14.on && FB14.t0 == null && !FB14.lastBurst && c1l >= 0) { slog('fb14StepToT1', { from: routeStep, pend: (FB14.pend || []).length }); FB14.pend = []; FB14.pT = {}; setStep(c1l); s = fb14Step(); }
    const lb2 = FB14.lastBurst;
    if (s && s.fb14role === 'charge') { slog('fb14StepByBurst', { from: routeStep, turn: s.fb14 }); setStep(routeStep + 1); }
    else if (s && s.fb14role === 'lever' && s.fb14 === 2 && s.chg && lb2 && lb2.turn === 2 && !(FB14.pT && FB14.pT[2] != null) && FB14.M[3] == null) slog('fb14BurstSameTurn', { step: routeStep, turn: 2, why: 'no T2 confirm or Jelly since its Charge' });   // v91 (A 176.1 s): not T4's
    else if (s && s.fb14role === 'lever' && (!s.chg || (lb2 && lb2.turn === s.fb14 && t - lb2.t > FB14_NEXTCHG))) {
      const j = RT().findIndex((x, i) => i > routeStep && x.fb14 && x.fb14 > s.fb14 && x.chg === 'fb1');
      if (j >= 0) { slog('fb14StepByBurst', { from: routeStep, to: j, turn: RT()[j].fb14 }); setStep(j); }
    }
    const s2 = fb14Step(); if (s2) FB14.lastBurst = { turn: s2.fb14, t }; }
  const stp0 = fb14Step(); FB14.trigTurn = stp0 ? stp0.fb14 : null; FB14.trigStep = routeStep; FB14.tTrig = t0Trig();
  if (FB14.t0 == null || !CHG.trig) return;
  const M = Math.round(fbPic(CHG.trig.t) - 16), stp = stp0, turn = stp ? stp.fb14 : null;
  if (turn === 2 || turn === 4) fb14TurnOver(turn);
  if (!FB14.on || turn == null || turn === 1 || FB14.M[turn] != null) return;
  // the burst places the confirm on the clock to about a frame (the trigger picture's time, dropped pictures): every
  // carried state gets the Charge at M - 1, M and M + 1; the lock keeps the ones that drew these rays
  // (applied once the pictures of the rays are captured: tripling thousands of states at the trigger stalled the page's
  // thread and dropped half the rays' pictures in the end-to-end run)
  FB14.M[turn] = M; FB14.pendChg = { M, turn };
  fb14PreCands();
}
/* v92 (D T2: trigger -> plan 6.6 s, the runner confirms 5.2-5.9 s after the bar hide): the carried candidates are built
 * while the burst's pictures are still coming (in slices of FB14_PRESLICE states, so no picture is late), not after the
 * maps; each state's seed before A's base draw is kept per shift (the held states are then only those whose stream drew
 * the locked rays). Used by fb14ChgCands when the states have not changed since. */
const FB14_PRESLICE = 400;
function fb14PreCands() {
  const pc = FB14.pendChg; FB14.pre = null; if (!pc || !FB14.on || !FB14.states.length) return;
  const L = FB14.states, ds = FB14_CHGD.map(x => x[0]).sort((a, b) => a - b), nd = ds.length, xs = new Uint32Array(L.length * nd), ok = new Uint8Array(L.length * nd);
  const P = FB14.pre = { M: pc.M, turn: pc.turn, ref: L, n: L.length, ds, xs, ok, i: 0, done: false, t0: performance.now(), ms: 0 };
  const slice = () => {
    if (FB14.pre !== P) return; const ta = performance.now();
    for (const e = Math.min(P.n, P.i + FB14_PRESLICE); P.i < e; P.i++) { const S = L[P.i], B = fbClone(S);
      for (let k = 0; k < nd; k++) { const m = pc.M + ds[k] - S.l; if (B.f > m + 13) continue; fbRun(B, m + 13); let x = B.s; for (let j = fbBolts(m + 13, B.ph); j; j--) x = fbRi(x, 359); xs[P.i * nd + k] = x >>> 0; ok[P.i * nd + k] = 1; } }
    P.ms += performance.now() - ta;
    if (P.i < P.n) setTimeout(slice, 0); else { P.done = true; P.wall = Math.round(performance.now() - P.t0); }
  };
  setTimeout(slice, 0);
}
/* the FB2 profile (T6) arms on any bar hide: not during T4's Bowser turn and T5's Peach Beam turn (the wave and the beam
 * flash the arena), only from the T6 menu on: 20 s after the Peach Beam confirm (its turn takes 22 s+), or 45 s after
 * T4's confirm when the Peach Beam was not seen */
function fb14ArmOk(P, t) {
  if (!P || P.id !== 'fb2' || FB14.p4t == null) return true;
  if (FB14.pb) return t - FB14.pb.t > 20000;
  return t - FB14.p4t > 45000;
}
/* v76: the carry is gone (every state ruled out): the tracker off and its clock dropped, so the next Charge's lock is a
 * fresh one (the reader is armed again if a lock left it 'locked') */
function fb14CarryGone() {
  if (!FB14.on && FB14.t0 == null) return;
  slog('fb14CarryGone', { turn: (fb14Step() || {}).fb14 || null });
  Object.assign(FB14, { on: false, t0: null, states: [], M: {}, P: {}, fresh: null, charges: [], gone: false, allOutLogged: false, why: 'the carried seed is gone (an off-route turn); the next Super Charge locks again' });
  if (typeof CHG !== 'undefined' && ['locked', 'nolock', 'failed'].includes(CHG.state)) chgReset();
}
/* v76: after a T1-T4 lock the reader arms again at once, so the next turn's Charge is read even when no target screen moved
 * the route (the burst then moves it, fb14Trigger). Only real bar hides arm it (bar up 0.6 s+), so Bowser's turn does not. */
function fb14AfterLock() {
  const s = fb14Step(); if (!s || FB14.refining || typeof CHG === 'undefined' || CHG.state !== 'locked') return;
  slog('fb14ReaderRearmed', { turn: s.fb14, why: 'after the lock' }); chgReset();
}
/* a step change: the next turn's Charge needs the Charge reader armed again (it stays 'locked' after T1's) */
function fb14StepChange(was) {
  const W = RT()[was], N = RT()[routeStep];
  if (N && N.fb14 && N.chg === 'fb1' && (!W || W.fb14 !== N.fb14) && typeof CHG !== 'undefined' && !['search', 'maps', 'armed', 'capture'].includes(CHG.state) && CHG.state !== 'idle') chgReset();
  // a search still running for the last turn's Charge (a slow lock): the reader is armed again once it has finished
  if (N && N.fb14 && N.chg === 'fb1' && (!W || W.fb14 !== N.fb14) && typeof CHG !== 'undefined' && ['search', 'maps'].includes(CHG.state)) FB14.rearm = N.fb14;
  if (N && N.fb14 === 1 && N.fb14role === 'charge' && (!W || !W.fb14)) fb14Reset();      // a new attempt at the fight
  // v91 (B 249.3 s, A 153.4 s: the runner's clicks): T1's Charge set from a later turn = a new attempt too (B tracked the
  // retry as the old attempt's turns, M 3448 / 4391). A read in flight then is this attempt's T1 Charge.
  else if (N && N.fb14 === 1 && N.fb14role === 'charge' && W && (W.fb14 || W.turn === 'fb2_pb' || W.turn === 'fb2_k') && !(W.fb14 === 1 && W.fb14role === 'charge')) {
    const fly = typeof CHG !== 'undefined' && ['search', 'maps', 'capture'].includes(CHG.state);
    slog('fb14NewAttempt', { from: was, why: 'route set to T1', readInFlight: fly }); fb14Reset('new attempt');
    if (fly) { FB14.trigTurn = 1; FB14.trigStep = routeStep; FB14.lastBurst = { turn: 1, t: CHG.trig ? CHG.trig.t : performance.now() }; } }
  // from T4 on to the T6 Charge (the FB2 step): a reader left 'locked' / 'nolock' by T4's Charge must arm again
  if (W && W.fb14 && N && (N.turn === 'fb2_pb' || N.turn === 'fb2_k') && typeof CHG !== 'undefined' && !['search', 'maps', 'armed', 'capture', 'idle'].includes(CHG.state)) chgReset();
}
function fb14Show() {
  const el = $('fb14-status'); if (!el) return;
  const stp = fb14Step(), turn = stp ? stp.fb14 : null, P = FB14.plan, pc = x => Math.round(100 * x) + '%';
  if (!FB14.on) { el.innerHTML = '<b>FB2 T1 → T4:</b> ' + (FB14.why ? FB14.why : 'waiting for the T1 Super Charge lock') + (turn ? '<br>No lock: ' + fb14BlindText(turn) + '.' : ''); return; }
  el.innerHTML = '<b>FB2 T1 → T4</b> (' + FB14.states.length + ' RNG states, ' + (FB14.how === 'carried' ? 'the carried seed fits the last Charge' : FB14.prior && FB14.prior.stream >= 0 ? 'locked on the RNG stream, ' + FB14.prior.stream + ' steps after the last lock' : 'from the last Charge') + ', seed confidence ' + pc(1 - (FB14.doubt || 0)) + ')' +
    (P && !P.none && P.turn ? '<br>T' + P.turn + ': ' + (P.turn === 1 ? (P.sk ? 'skip Cloud Nine\'s message (A)' : 'Cloud Nine') : 'Do Nothing') + ' on the beep (+' + P.target + '): ' + fb14Goal(P.turn) + '. ' + ppText({ pp: P.pp, ppStates: P.pp != null ? (P.pp - P.doubt * P.blind) / Math.max(1e-9, 1 - P.doubt) : null, win: P.win, p: P.p, doubt: P.doubt }, 'fb14') + ' (blind ' + pc(P.blind) + '; with your press spread ' + pc(P.p) + ')' : P && P.none ? '<br>T' + P.turn + ': no edge (' + P.none + '): ' + fb14BlindText(P.turn) : '') +
    '<br>Lever beeps ' + (fb14Bias('fb14') >= 0 ? 'later' : 'earlier') + ' by ' + Math.abs(fb14Bias('fb14')).toFixed(1) + ' frames: your Final Bowser lever presses so far came ' + (-fb14Bias('fb14')).toFixed(1) + ' frames off on average (last ' + fb14PressList().length + ').' + (fb14SkipMode() ? ' T1 skip beeps ' + (fb14Bias('fb14sk') >= 0 ? 'later' : 'earlier') + ' by ' + Math.abs(fb14Bias('fb14sk')).toFixed(1) + ' (last ' + (typeof leverList === 'function' ? leverList('fb14sk').length : 0) + ' skips).' : '') + (FB14.t6 ? '<br>T6: the Charge is searched on the carried stream (' + FB14.t6.bases.length + ' seeds at the Peach Beam)' : '');
}
/* The burst places its pictures on game frames by brightness (CHG_BRIGHT_FB1), but over this arena it varies from run to
 * run by a few levels (the stars, the lightning, Lakilester): on the end-to-end render 1234abcd frame 2 read +6.5 above
 * the menu where the curve has 3.4, so the trigger picture (6.1) was taken as frame 3 and every picture sat one frame
 * late. The seed still locked (7101 at 2.7x), but the aura fit bent to absorb the frame (the true pattern was in none of
 * the 21312 states) and the clock ran a frame off. With the seed known, the pictures one frame earlier and later are
 * scored too (the same seed, every aura / lightning / coin path: fb1score); the best of the three placements is kept, its
 * fit redone, and the trigger time moved with it. */
/* the pictures of a placement one frame earlier (d = -1) or later (d = +1): game frame n gets the picture placed on n + d
 * (G: frames 0 .. CHG_N + 1, then frames -2, -1) */
function fbShiftG(G, d) {
  const N = CHG_N, at = m => (m >= 0 && m < N + 2 ? G[m] : m === -1 ? G[N + 3] : m === -2 ? G[N + 2] : null), out = new Array(G.length).fill(null);
  for (let n = 0; n < N + 2; n++) out[n] = at(n + d); out[N + 2] = at(-2 + d); out[N + 3] = at(-1 + d); return out;
}
/* The fight's aura pattern from every Charge so far: the rays of one Charge leave it open where its respawns are faint or
 * missing and a frame's noise (~200) can outscore the true split (the end-to-end render: the true pattern 0.5% below the
 * best fit of T1, outside every T1 fit kept). Each Charge sees the pattern at another rotation (its confirm's frame mod
 * 20), so a pattern scored on the earlier Charges' rays and this one's together is far better pinned. The candidates: the
 * carried states' patterns and this Charge's fits' splits; each is scored as the best over the top fits of every Charge
 * (kernel fb1cscore); returned: the patterns within FB14_JTOL of the best sum, with their joint score. */
const FB14_JTOL = 0.025, FB14_JSIG = 0.01, FB14_JC = 600, FB14_JH = 20;
async function fb14Joint(res, maps, one) {
  const H = res.fb1 && res.fb1.hyps; if (!H || !H.hy.length || res.trigT == null) return null;
  const M = FB14.t0 == null ? 0 : Math.round((res.trigT - FB14.t0) / fbRate() - 16);
  const cur = { maps, a: H.a >>> 0, M, hyps: H.hy.slice().sort((x, y) => y.sc - x.sc).slice(0, FB14_JH).map(h => [h.p, h.q, h.br]), best: H.best };
  const prev = (FB14.charges || []).filter(c => c.M !== M).slice(-2);
  if (window.__v105t && FB14.t0 == null) { const V = window.__v105t, B = new Uint8Array(20); for (let j = 0; j < 20; j++) B[j] = +V.c[mod20(M + 13 + j)];     // (diagnostic, v105)
    const h0 = H.hy.find(h => h.p === V.hyp[0] && h.q === V.hyp[1] && h.br === V.hyp[2]);
    const r = await one(maps, [{ type: 'cscore', a: H.a >>> 0, hyps: [V.hyp], cands: B }]); slog('fb14V105Score', { truth: +(r[0].out[0] - H.best).toFixed(1), hypBest: h0 ? +(h0.sc - H.best).toFixed(1) : null, best: H.best, tol: +(H.best * FB14_TOL).toFixed(1) }); }
  if (!FB14.on || !prev.length) return { cur };
  const cand = new Map(), add = (k, w) => { if (!cand.has(k) || cand.get(k) < w) cand.set(k, w); };
  for (const S of FB14.states.slice().sort((x, y) => y.w * y.lw - x.w * x.lw).slice(0, FB14_JC)) add(S.c.join(''), S.w * S.lw);
  // (this Charge's fits at each of the three frames its confirm may be on: M - 1, M, M + 1)
  for (const dM of [0, -1, 1]) for (const h of H.hy.slice(0, 200)) for (const AV of fbAuraVariants(h, H.best)) { const c = new Array(20); for (let j = 0; j < 20; j++) c[mod20(M + dM + 13 + j)] = AV.aura[j]; add(c.join(''), AV.w); }
  // and their neighbours: one count moved to a residue 1-2 frames away (all), two moves (the likeliest few): the true pattern
  // sat 2-3 such moves from every T1 fit in the end-to-end run
  const base = [...cand.entries()].sort((x, y) => y[1] - x[1]).map(([k]) => k);
  const moves = k => { const out = [], p = k.split('').map(Number); for (let j = 0; j < 20; j++) if (p[j] > 0) for (const dj of [-2, -1, 1, 2]) { const i = (j + dj + 20) % 20; if (p[i] >= 4) continue; const q = p.slice(); q[j]--; q[i]++; out.push(q.join('')); } return out; };
  const all = new Set(base); for (const k of base) for (const k2 of moves(k)) all.add(k2);
  for (const k of base.slice(0, 4)) for (const k2 of moves(k)) for (const k3 of moves(k2)) all.add(k3);
  const keys = [...all], tot = prev.concat([cur]).reduce((x, c) => x + c.best, 0);
  const scoreOf = async (ch, dM) => { const B = new Uint8Array(keys.length * 20); keys.forEach((k, i) => { for (let j = 0; j < 20; j++) B[i * 20 + j] = +k[mod20(ch.M + dM + 13 + j)]; });
    const r = await one(ch.maps, [{ type: 'cscore', a: ch.a, hyps: ch.hyps, cands: B }]); return Array.from(r[0].out, x => x - ch.best); };
  const sp = new Float64Array(keys.length);
  for (const ch of prev) (await scoreOf(ch, 0)).forEach((x, i) => { sp[i] += x; });
  // this Charge's confirm on the clock is good to a frame (the trigger picture): each of M - 1, M, M + 1 is tried
  let bestD = 0, bestMx = -1e30, bestS = null;
  for (const dM of [0, -1, 1]) { const sc = await scoreOf(cur, dM), S = sc.map((x, i) => x + sp[i]), mx = Math.max(...S); if (mx > bestMx + 1e-6) { bestMx = mx; bestD = dM; bestS = S; } }
  const keep = new Map(); keys.forEach((k, i) => { if (bestS[i] >= bestMx - FB14_JTOL * tot) keep.set(k, bestS[i] - bestMx); });
  if (keep.size > 64) { const top = [...keep.entries()].sort((x, y) => y[1] - x[1]).slice(0, 64); keep.clear(); for (const [k, v] of top) keep.set(k, v); }
  slog('fb14Joint', { charges: prev.length + 1, cands: keys.length, kept: keep.size, best: Math.round(bestMx), dM: bestD });
  if (window.__fb14truthAura) { const i = keys.indexOf(window.__fb14truthAura); slog('fb14JointTruth', { inCands: i >= 0, rel: i >= 0 ? Math.round(bestS[i] - bestMx) : null, tot: Math.round(tot), perCharge: i >= 0 ? Math.round(bestS[i] - sp[i]) + ' / ' + Math.round(sp[i]) : null }); }
  return { cur, keep, tot, dM: bestD };
}
async function fb14Refine(res, G) {
  FB14.refining = true;
  try { return await fb14Refine1(res, G); } finally { FB14.refining = false; }
}
async function fb14Refine1(res, G) {
  res.trigT = fb14TrigT();      // v94: on the burst's frame 3 (fb14TrigPhase)
  try {
    const top = res.top && res.top[0]; if (!top || !G || !CHG.cen || !chgSearch.mod) return res;
    const shifted = d => fbShiftG(G, d);
    const one = (maps, msgs) => new Promise((resolve, reject) => {
      const w = new Worker(chgSearch.url), out = []; let k = -1;
      const next = () => { k++; if (k >= msgs.length) { w.terminate(); resolve(out); return; } w.postMessage(msgs[k]); };
      w.onmessage = e => { if (e.data.type === 'error') { w.terminate(); reject(new Error(e.data.msg)); return; } if (e.data.type !== 'ready') out.push(e.data); next(); };
      w.onerror = e => { w.terminate(); reject(new Error(e.message || 'worker')); };
      w.postMessage({ type: 'init', mod: chgSearch.mod, S: maps.S, C: maps.C, N: CHG_N, ND: CHG_ND, K: 16, pat: fb2Patterns().bytes });
    });
    const t0 = performance.now(), sc = { 0: top.sc }, alt = {};
    // v92 (e2e 5eed0fb2 T2 on the stream: trigger -> plan 9 s, 2.8 s of it this re-read): a stream lock chose its placement
    // in the window's own search (as placed, then one frame early: no console read was late), so it is not re-read here
    if (res.stream) { slog('fb14Placement', { kept: res.stream.shift || 0, skipped: 'stream' }); res.placeScores = sc; const maps = chgMaps(G, CHG.cen, CHG_N); let out = res;
      if (out.fb1 && out.fb1.hyps && out.fb1.hyps.light) { const r = await one(maps, [{ type: 'fb1h', s0: top.seed, tol: FB14_NTOL, max: 20000 }]); out = Object.assign({}, out, { fb1: Object.assign({}, out.fb1, { hyps: r[0] }) }); }
      out.maps0 = maps; out.joint = await fb14Joint(out, maps, one).catch(e => { slog('fb14JointError', { msg: String(e && e.message || e) }); return null; }); return out; }
    // v99 (e2e 1234abcd T1 on this machine: the placement 3.05 s, the plan 0.1 s after the patient runner's 12 s): the two
    // shifted reads in parallel workers
    for (const d of [-1, 1]) alt[d] = chgMaps(shifted(d), CHG.cen, CHG_N);
    const rs = await Promise.all([-1, 1].map(d => one(alt[d], [{ type: 'fb1', seeds: [top.seed], v: null }]))); [-1, 1].forEach((d, i) => { sc[d] = rs[i][0].out[0].sc; });
    let best = 0; for (const d of [-1, 1]) if (sc[d] > sc[best] * 1.03) best = d;
    slog('fb14Placement', { scores: { '-1': Math.round(sc[-1]), 0: Math.round(sc[0]), '+1': Math.round(sc[1]) }, kept: best, ms: Math.round(performance.now() - t0) });
    res.placeScores = sc;
    let out = res, maps = best ? alt[best] : chgMaps(G, CHG.cen, CHG_N);
    if (best) {
      const r = await one(alt[best], [{ type: 'fb1h', s0: top.seed, tol: FB14_TOL, max: 4000 }]);
      if (CHG.trig) { CHG.trig.t += best * FRAME; CHG.trig.n = (CHG.trig.n || 3) - best; }     // the trigger picture was frame 3 - best
      res.trigT += best * FRAME;
      CHG.info.placementShift = best;
      out = Object.assign({}, res, { fb1: Object.assign({}, res.fb1, { hyps: r[0] }) }); out.trigT = res.trigT;
    }
    // v92: a narrowed (carried) read sent only the fits' end seeds (fb1h light: 0.6 s, not 4 s); its rays matched none of
    // the carried states, so the fresh fits need the whole list now
    if (out.fb1 && out.fb1.hyps && out.fb1.hyps.light) { const r = await one(maps, [{ type: 'fb1h', s0: top.seed, tol: FB14_NTOL, max: 20000 }]); out = Object.assign({}, out, { fb1: Object.assign({}, out.fb1, { hyps: r[0] }) }); }
    out.maps0 = maps; out.joint = await fb14Joint(out, maps, one).catch(e => { slog('fb14JointError', { msg: String(e && e.message || e) }); return null; });
    return out;
  } catch (e) { slog('fb14PlacementError', { msg: String(e && e.message || e) }); return res; }
}
/* FB2 profile 'fb1' stage 2 (charge_live.js chgSearch): the relaxed score of every candidate, then the structured fit of
 * the best one */
async function fb1Stage2(W, call, top, times, t3, narrow) {
  const ps = [];
  const V = top.v && top.v.every(x => x != null) ? top.v : null;
  for (let k = 0; k < W.length; k++) { const idx = top.map((x, i) => i).filter(i => i % W.length === k), sd = idx.map(i => top[i]); if (sd.length) ps.push(call(W[k], { type: 'fb1', seeds: sd, v: V ? idx.map(i => V[i]) : null }, 'fb1').then(r => r.out.map((o, i) => ({ seed: sd[i], sc: o.sc })))); }
  let all = [].concat(...(await Promise.all(ps))).sort((a, b) => b.sc - a.sc);
  // a candidate on the best one's stream a few steps away shares B's rays and every respawn (B's creation is 24 + v steps
  // after A's base draw for any v), so it scores all but A's initial rays: the same seed, not a rival (T1 render: the true
  // seed 5853, the one 1 step off 4645). The runner-up for the lock's ratio is the best candidate off that stream.
  if (all.length > 1) { const b0 = all[0].seed >>> 0, near = new Set(); let x = b0, y = b0; for (let k = 0; k <= 48; k++) { near.add(x >>> 0); near.add(y >>> 0); x = fbAdv(x); y = Math.imul((y - 1) >>> 0, 0x6A76AE6D) >>> 0; }
    const same = all.filter((o, i) => i > 0 && near.has(o.seed >>> 0)); all = [all[0]].concat(all.slice(1).filter(o => !near.has(o.seed >>> 0))); times.sameStream = same.length; }
  times.stage2 = Math.round(performance.now() - t3); const t4 = performance.now();
  // v87: on the carried stream (T2 / T4 narrowed) the fits are kept wider: the carried states pick among them
  const hy = all.length ? await call(W[0], { type: 'fb1h', s0: all[0].seed, tol: narrow ? FB14_NTOL : FB14_TOL, max: narrow ? 20000 : 4000, light: narrow && !window.__fb14full }, 'fb1h') : null;
  times.hyps = Math.round(performance.now() - t4);
  return { top: all.slice(0, 5), fb1: { hyps: hy, times } };
}
window.__fb14 = { v103: { boltLik: (S, h, b, c) => fb14BoltLik(S, h, b, c), SIG: FB14_BOLT_SIG, FLOOR: FB14_BOLT_FLOOR, Q: FB14_BOLT_Q, BOLT: FB14_BOLT }, v100: { atkFrame: (t, p) => fbAtkFrame(t, p), atkDecide: k => fbAtkDecide(k), boltFrame: (t, p) => fbBoltFrame(t, p), V: (S, h, b, c) => fb14V100(S, h, b, c), setBoltD: d => { FB14_BOLT_D = d; }, boltD: () => FB14_BOLT_D, FIRE: FB14_FIRE, CLS: FB14_CLS, ATKW: FB14_ATKW, CLSW: FB14_CLSW, BOLT: FB14_BOLT, BOLT_W: FB14_BOLT_W, UP: FB14_UP, hasV: () => fb14HasV(), weigh0: h => fb14Weigh(h, true) }, FB14_READX, armOk: (P, t) => fb14ArmOk(P, t), shareRaw: (L, a, b, turn) => fb14ShareU(L, a, b, turn), stSample: (L, n) => fb14Sample(L, n), resample: (Ls, l) => fb14Resample(Ls, l), doubtFloor: (t, d) => fb14DoubtFloor(t, d), relock3: h => fb14Relock3(h), T3: { FLOOR: FB14_T3_FLOOR, RELOCK: FB14_T3_RELOCK, WIDE: FB14_WIDE, NSAMPLE: FB14_NSAMPLE }, readX: (c, s) => fb14ReadX(c, s), van: (c, s) => fb14Van(c, s), phaseFit: pts => fb14PhaseFit(pts), trigPhase: () => fb14TrigPhase(), trigT: () => fb14TrigT(), SHIFTS_S: FB14_SHIFTS_S, FB14, FB14_DELTA, FB14_JELLY, FB14_MAXH, FB14_CHGD, cap: L => fb14Cap(L), held: () => fb14Held(), chgCands: () => fb14ChgCands(), preCands: () => fb14PreCands(), ownClose: (t, s) => fb14OwnClose(t, s), streamCands: S => fbStreamCands(S), streamSteps: (x, S) => fbStreamSteps(x, S), streamNote: (x, h) => fbStreamNote(x, h), slogTail: n => SLOG.slice(-n), frame: (t, pr) => fb14Frame(t, pr), chgState: v => { if (v != null) CHG.state = v; return CHG.state; }, msg: () => st.msg, FBS: () => ({ FBS_LO, FBS_HI, FBS_RATIO, FBS_MIN, FBS_HIMAX }), streamHi: (S, now) => fbStreamHi(S, now), streamWin: now => fbStreamWin(now), gapShifts: (b, g) => fb14GapShifts(b, g), gapCheck: (t, p) => fb14GapCheck(t, p), waveSplit: L => fb14WaveSplit(L), fbVars, trigger: () => fb14Trigger(), advance: h => fb14Advance(h), turnOver: k => fb14TurnOver(k), hpWatch: (t, pr) => fb14HpWatch(t, pr), fbStep, fbRun, fbClone, fbRi, fbAdv, plan: c => fb14Plan(c), weigh: h => fb14Weigh(h), input: (k, F, turn, sh) => fb14Input(k, F, turn, sh), lock: r => fb14Lock(r), reset: () => fb14Reset(), confirm: (t, s) => fb14Confirm(t, s), pic: t => fbPic(t), pressT: F => fbPressT(F), bias: () => fb14Bias(), pressAdd: e => fb14PressAdd(e), t6cands: () => fb14T6Cands(), peach: () => fb14Peach(), fbNew: o => fbNew(o),
  v101: { SKIP: FB14_SKIP, BOX: FB14_BOX, VAN: FB14_VAN, win: () => fb14SkipWin(), LATE: FB14_SKIP_LATE, M: FB14_SKIP_M, SKSHIFTS: FB14_SKSHIFTS, SKUNC: FB14_SKUNC, skipMode: () => fb14SkipMode(), skipPhase: () => fb14SkipPhase(), skipBase: () => fb14SkipBase(), boxShare: g => fb14BoxShare(g), boxFrame: t => fb14BoxFrame(t), skipConfirm: t => fb14SkipConfirm(t), skipEv: (T, F, turn) => fbSkipEv(T, F, turn), leverId: () => fb14CurLever(), bias: id => fb14Bias(id), pressT: (F, id) => fbPressT(F, id) },
  shareU: (h, a, b, turn) => { fb14Advance(h); const W = fb14Weigh(h); return Array.from(fb14ShareU(fb14Sample(W.list, 300), a, b, turn)); }, C9UNC: FB14_C9UNC, C9SHIFTS: FB14_C9SHIFTS, anchor: (C, from, W, turn, PD) => fb14Anchor(C, from, W, turn, PD), TICK_DROP: FB14_TICK_DROP, ANCHOR_TOL: FB14_ANCHOR_TOL,
  share: (h, a, b, turn) => { fb14Advance(h); const W = fb14Weigh(h); return { doubt: W.doubt, n: W.list.length, share: Array.from(fb14Share(fb14Sample(W.list, 300), a, b, turn, fb14Kind(turn))) }; },
  sample: (b, w, h) => sample(b, w, h), tick: t => { FB14.tickH = null; fb14Tick(t); }, carryGone: () => fb14CarryGone(), reloadTargets: () => { targets = JSON.parse(localStorage.getItem('tot-targets') || '{}'); useTarget(); } };   // for tests
window.__fb14.v104 = { broad: (C, Wg, t, d, PD) => fb14Broad(C, Wg, t, d, PD), blind: t => fb14Blind(t), truthScore: (S, d) => fb14TruthScore(S, d), isTrueS: S => fb14IsTrueS(S) };
window.__fb14.v102 = { truthZero: t => fb14TruthZero(t), freshOpen: h => fb14FreshOpen(h), FRESH_D: FB14_FRESH_D, isTrue: S => fb14IsTrue(S) };   // for tests (v102)
