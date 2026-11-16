//@ Final Bowser phase 2, T6 -> T7, live (charge_live/README.md, FB2 section; fb2_route/README.md section 2). Inlined into
//@ page_template.html after charge_live.js; //@ lines are dropped. Needs the page globals R, FRAME, $, num, slog, sample,
//@ chgMap, CHG, beepAt, cancelBeeps, PRESS_ERR, render, st and the charge lock (chgSearch's FB2 profile).
/* ---------- FB2: the T6 Super Charge lock -> the popup A (Close Call) -> the T7 Power Bounce ----------
 * The T6 Charge's rays give the seed at the end of the rays (confirm + 61) up to the lightning: the rays window only
 * shows where the bolt draws shifted the stream, so the lock keeps every (lightning pattern, first coin q) whose score
 * is within FB2_TOL of the best, each with every lightning phase pair (p130, p220) that gives that pattern
 * (p130 = p220 mod 5), and console lag 0/1 after the rays. From there the stretch to the T7 bounces is closed
 * (fb2_route/t6model.py, 229/229 runs): only the A that closes the "+3" popup (confirm + K, K = 77..136; no press = 137)
 * moves Bowser's AI (K + 40: RandInt 100, 80, maybe 60), and the Close Call roll (rand_int(100) < 30) comes 52/62/55
 * frames later (Body Slam / Claw / Fire Breath); then the T7 menu, and the Power Bounce rolls from the target-screen A
 * (d): stars d + 45 + 27k, rolls d + 71 + 27k (powerbounce/fb2model.py, first hit 15). Same-frame order: bolts, script
 * draws, coin, step.
 * v97: on the runner's route (T4's wave blocked) Lakilester is up on T6 and his Do Nothing is the lever (fb2PlanP /
 * fb2Confirm / fb2SetP below; Bowser's AI on P + 13); the popup plan (fb2PlanK / fb2SetK) is kept for tests only.
 * 1. Lock -> plan K: the frame in the rest of the popup window that is best over the kept states (press 25/50/25 over
 *    -1/0/+1), with the T7 bounce windows as tie-breaker; 3 beeps 0.3 s apart, the last on the press.
 * 2. The popup closing (first picture without it = K + 2; the status bar comes back on K + 5) gives the K that happened.
 * 3. The status bar is up through Bowser's turn and the T7 menu: its coin shines prune the states.
 * 4. On the T7 Power Bounce target screen: the best target-A frame for 7+ bounces (the kill at Bowser 80 HP), as the
 *    page's other plans (lead, window, beeps). */
const FB2_TOL = 0.002, FB2_P130 = [78, 83, 113, 118], FB2_P220 = [18, 78, 88, 178];
const FB2_DELTA = { slam: 52, claw: 62, fire: 55 }, FB2_MENU = { slam: 101, claw: 83, fire: 134 }, FB2_KMIN = 77, FB2_KMAX = 137;
const FB2_LAGS = [[0, 0.75], [1, 0.25]], FB2_BEEPS = 3, FB2_GAP = 300, FB2_DMG0 = 15, FB2_HP = 80, FB2_MAXH = 4000;
const FB2_TH = (() => { const t = []; let c = 200; for (let i = 0; i < 30; i++) { c = Math.floor(c * 60 / 100); t.push(c); } return t; })();
var FB2 = { on: false };      // var: charge_live.js calls fb2Reset (via chgReset) before this file has run
/* v114: the runner's backup ending after a failed T6 Close Call (console fb1810): T6 "Close Call failed, Life Shroom", T7 "Charge;
 * Do Nothing - No Wave, Danger", T8 "Bounce x5". FB2B lives outside FB2 (chgReset -> fb2Reset clears FB2 for the T7 Charge's
 * lock); the route shows the backup lines while it is on (fb2BackupOn), its T7 / T8 steps carry b7 / b8. */
var FB2B = { on: false };
const fb2BackupOn = () => !!(FB2B && FB2B.on);
/* fb2_route/t6hit_log.py (emulator, JP): after the T7 Super Charge Mario has 15 charges; the T8 Power Bounce's first hit is 18 in
 * Danger (6 / 6 roll sequences exact with fb2model.py dmg0 18), so 18 + 17 + 16 + 15 + 14 = 80: 5 bounces end the fight */
const FB2B_DMG0 = 18, FB2B_GOAL = 5;
// (FB2 is reset when the backup starts, so every FB2 lock / plan while it is on belongs to the backup T7 / T8)
const fb2Dmg0 = () => (fb2BackupOn() ? FB2B_DMG0 : FB2_DMG0), fb2Goal = () => (fb2BackupOn() ? FB2B_GOAL : 7);
/* the step's words (T6 main / the backup T7) */
const fb2Txt = () => (fb2BackupOn() ? { turn: 'T7', goal: 'a Body Slam / Claw (no wave, Mario in Danger)', blind: 'a Body Slam / Claw about 8%', b: 0.08 } : { turn: 'T6', goal: 'Close Call', blind: 'Close Call about 30%', b: 0.3 });
const fb2Leg = () => { const s = typeof isRoute === 'function' && isRoute() && RT()[routeStep]; return s && s.b7 ? 'b7' : s && s.b8 ? 'b8' : 'main'; };
function fb2Reset() { if (!FB2) return; Object.assign(FB2, { rate: typeof chgRate === 'function' && typeof consoleRate === 'function' ? chgRate() : null, on: false, hyps: null, plan: null, plans: [], pObs: null, kObs: null, kSeen: null, kHow: null, t7: null, popup: null, why: null, taps: [], vis: [], visFrom: null, pT: null, hpw: null }); fb2Show(); }
const fb2nb = (f, p1, p2) => (FB2_P130.includes((f + p1) % 130) ? 1 : 0) + (FB2_P220.includes((f + p2) % 220) ? 1 : 0);
/* the window patterns (bolt counts on rays frames 0..47 = confirm + 13..60) and the phase pairs behind each */
function fb2Patterns() {
  if (fb2Patterns.c) return fb2Patterns.c;
  const idx = new Map(), list = [];
  for (let p2 = 0; p2 < 220; p2++) for (let p1 = p2 % 5; p1 < 130; p1 += 5) {
    const r = []; for (let n = 0; n < 48; n++) r.push(fb2nb(n + 13, p1, p2));
    const k = r.join(''); let i = idx.get(k); if (i == null) { i = list.length; idx.set(k, i); list.push({ r, ph: [] }); } list[i].ph.push([p1, p2]);
  }
  const bytes = new Uint8Array(list.length * 52); list.forEach((x, i) => x.r.forEach((v, n) => { bytes[i * 52 + n] = v; }));
  return (fb2Patterns.c = { list, bytes });
}
/* ---- the model (t6pay.c / t6model.py) ---- */
function fb2Frame1(S, f, ph) {      // the idle draws of frame f: bolts, coin, step
  for (let i = fb2nb(f, ph[0], ph[1]); i; i--) S.s = R.randInt(S.s, 359)[0];
  if (f === S.nc) { const r = R.randInt(S.s, 100); S.s = r[0]; S.nc += r[1] >= 70 ? 48 : 24; if (S.coins) S.coins.push([f, r[1] >= 70]); }
  S.s = R.adv(S.s);
}
function fb2Idle(S, f0, f1, ph) { for (let f = f0; f < f1; f++) fb2Frame1(S, f, ph); }
/* Bowser's T6 turn from state S at the start of frame E = K + 40: { lucky, atk, T, menu, S (start of frame T + 1) } */
/* v97 (fb2_route/t6dn_log.py, the runner's T6 "Charge; Do Nothing - Close Call": T4's wave blocked, so Lakilester is not
 * KO'd): Lakilester's Do Nothing confirm on frame P is the lever, Bowser's AI on E = P + 13 (as on T2-T4), the Close Call
 * test FB2_DNDELTA after it, the T7 menu FB2_DNMENU after the test. The popup A draws nothing and moves no draw once P is
 * fixed (the same seed at P for K = 77 / 100 / 130 / none). */
const FB2_T7_AHEAD = 600, FB2_DNAI = 13, FB2_PMIN = 130, FB2_DNDELTA = { slam: 52, claw: 55, fire: 55 }, FB2_DNMENU = { slam: 101, claw: 134, fire: 134 };
function fb2AI(S0, E, ph, slamOk, clawOk, dn) {
  const DL = dn ? FB2_DNDELTA : FB2_DELTA, MN = dn ? FB2_DNMENU : FB2_MENU;
  const S = { s: S0.s, nc: S0.nc, coins: S0.coins ? S0.coins.slice() : null };
  for (let i = fb2nb(E, ph[0], ph[1]); i; i--) S.s = R.randInt(S.s, 359)[0];
  S.s = R.randInt(S.s, 100)[0]; let r = R.randInt(S.s, 80); S.s = r[0]; let atk;
  if (r[1] < 20 && slamOk) atk = 'slam'; else { r = R.randInt(S.s, 60); S.s = r[0]; atk = r[1] < 20 && clawOk ? 'claw' : 'fire'; }
  if (E === S.nc) { const c = R.randInt(S.s, 100); S.s = c[0]; S.nc += c[1] >= 70 ? 48 : 24; if (S.coins) S.coins.push([E, c[1] >= 70]); }
  S.s = R.adv(S.s);
  const T = E + DL[atk]; fb2Idle(S, E + 1, T, ph);
  for (let i = fb2nb(T, ph[0], ph[1]); i; i--) S.s = R.randInt(S.s, 359)[0];
  const cc = R.randInt(S.s, 100); S.s = cc[0];
  if (T === S.nc) { const c = R.randInt(S.s, 100); S.s = c[0]; S.nc += c[1] >= 70 ? 48 : 24; if (S.coins) S.coins.push([T, c[1] >= 70]); }
  S.s = R.adv(S.s);
  return { lucky: cc[1] < 30, cc: cc[1], atk, T, menu: T + MN[atk], S };
}
/* v114: Bowser's turn after the backup T7's Do Nothing (fb2_route/t6hit_log.py sweep7; Mario 10 HP after the Life Shroom, Lakilester up,
 * 15 charges). AI on P + 13: RandInt(100) < FB2B_RECAST (13 cast, 15 not, in 90 runs): the Star Rod's power cast again (no attack, Mario stays at 10: no Danger);
 * else RandInt(100) < 75: the Draining Shockwave (Mario 10 -> 4, the charges gone); else RandInt(110) < 20: the wave too, < FB2B_X3:
 * an attack that KOs Mario (no Life Shroom left); else RandInt(80) < 20 (Body Slam allowed): Body Slam, 8 (Mario at 2: Danger, charges kept); else
 * RandInt(60) < 20 (Claw allowed): Claw, 9 (Mario at 1); else Fire Breath, a KO. The aim: Body Slam or Claw. Their draws on to the
 * T8 menu are fixed (FB2B_HIT, frames after the AI; FB2B_MENU: the T8 menu), so the carry runs on to the T8 Power Bounce. */
const FB2B_RECAST = 15, FB2B_X3 = 30, FB2B_HIT = { claw: { 64: [100].concat(new Array(10).fill(359)), 223: new Array(6).fill(359) },
  slam: { 69: new Array(10).fill(359), 74: [2, 2], 127: new Array(6).fill(359), 133: new Array(6).fill(359), 139: new Array(6).fill(359) } }, FB2B_MENU = { claw: 279, slam: 212 };
function fb2AI7(S0, E, ph, slamOk, clawOk) {
  const S = { s: S0.s, nc: S0.nc, coins: S0.coins ? S0.coins.slice() : null }, ri = m => { const r = R.randInt(S.s, m); S.s = r[0]; return r[1]; };
  for (let i = fb2nb(E, ph[0], ph[1]); i; i--) S.s = R.randInt(S.s, 359)[0];
  let atk;
  if (ri(100) < FB2B_RECAST) atk = 'recast';
  else if (ri(100) < 75) atk = 'wave';
  else { const v3 = ri(110); if (v3 < 20) atk = 'wave'; else if (v3 < FB2B_X3) atk = 'ko'; else if (ri(80) < 20 && slamOk) atk = 'slam'; else atk = ri(60) < 20 && clawOk ? 'claw' : 'fire'; }
  if (E === S.nc) { const c = ri(100); S.nc += c >= 70 ? 48 : 24; if (S.coins) S.coins.push([E, c >= 70]); }
  S.s = R.adv(S.s);
  const good = atk === 'slam' || atk === 'claw'; let T = E;
  if (good) { const H = FB2B_HIT[atk]; T = E + FB2B_MENU[atk];
    for (let f = E + 1; f <= T; f++) { for (let i = fb2nb(f, ph[0], ph[1]); i; i--) S.s = R.randInt(S.s, 359)[0]; for (const m of H[f - E] || []) ri(m);
      if (f === S.nc) { const c = ri(100); S.nc += c >= 70 ? 48 : 24; if (S.coins) S.coins.push([f, c >= 70]); } S.s = R.adv(S.s); } }
  return { lucky: good, cc: null, atk, T, menu: T, S };
}
/* Power Bounce from state S at the start of frame f0 (<= d), target-screen A on frame d: the number of bounces (the
 * 7th ends the fight at 80 HP: 15 + 14 + ... + 9 = 84) */
function fb2PB(S0, f0, d, ph) {
  const S = { s: S0.s, nc: S0.nc }; fb2Idle(S, f0, d, ph);
  let k = 0, hit = 0, dmg = 0;
  for (let f = d; f < d + 71 + 27 * 20; f++) {
    for (let i = fb2nb(f, ph[0], ph[1]); i; i--) S.s = R.randInt(S.s, 359)[0];
    if (f === d + 71 + 27 * k && k === hit - 1) { const r = R.randInt(S.s, 100); S.s = r[0]; if (r[1] > FB2_TH[k]) return k + 2; k++; }
    if (f === d + 45 + 27 * hit) { const dm = Math.max(1, fb2Dmg0() - hit); for (let i = dm >= 9 ? 11 : dm >= 5 ? 10 : dm >= 3 ? 8 : 6; i; i--) S.s = R.randInt(S.s, 359)[0]; hit++; dmg += dm; if (dmg >= FB2_HP) return hit; }
    if (f === S.nc) { const r = R.randInt(S.s, 100); S.s = r[0]; S.nc += r[1] >= 70 ? 48 : 24; }
    S.s = R.adv(S.s);
  }
  return k + 2;
}
/* the same for every d in [D0 - 1, D0 + W + 1] (the idle frames up to D0 - 1 simulated once) */
function fb2PBWin(S0, f0, D0, W, ph) {
  const S = { s: S0.s, nc: S0.nc }; fb2Idle(S, f0, D0 - 1, ph); const out = [];
  for (let d = D0 - 1; d <= D0 + W + 1; d++) { out.push(fb2PB(S, d, d, ph)); fb2Frame1(S, d, ph); }
  return out;
}
/* Bowser's attack flags at T6: a Body Slam or a Claw on T5 forbids that attack on T6 (fb2_route README section 4) */
function fb2Flags() { if (fb2BackupOn() && FB2B.atk6) { const A = FB2B.atk6, out = []; for (const [a, w] of Object.entries(A)) if (w > 0) out.push([a !== 'slam', a !== 'claw', w]); if (out.length) return out; }     // v114: the backup T7: Bowser's T6 attack (the hit's) forbids that one
  const v = ($('s-fb2t5') || {}).value || 'any'; return v === 'slam' ? [[false, true, 1]] : v === 'claw' ? [[true, false, 1]] : v === 'fire' ? [[true, true, 1]] : [[true, true, 1 / 3], [false, true, 1 / 3], [true, false, 1 / 3]]; }
/* ---- clock: confirm-relative logic frames from the Charge trigger (the picture of rays frame 3 = confirm + 16) ---- */
/* v72: on the console's frame time (consoleRate, as the Hallway tracker since v70; 33.427 ms until the shines measure it),
 * fixed for the fight at the trigger (FB2.rate, fb2Reset). v71 ran this clock on 33.367 ms (59.94 Hz): ~0.25 frame late at
 * the popup and ~0.9 at the T7 target A on a real N64. Emulator renders run at 33.367: tests set Settings > Console frame
 * time to that. */
const fb2Rate = () => (FB2 && FB2.rate) || (typeof chgRate === 'function' ? chgRate() : FRAME);
const fb2Pic = t => 16 + (t - CHG.trig.t) / fb2Rate();                  // logic frame shown by a picture at time t (lag 0)
// the press for logic frame k: as Time Out's (zwPlan: 4.7 frames before the picture of that frame, minus the capture
// delay, plus the runner's offset)
const fb2PressT = k => CHG.trig.t + (k - 13 - 4.7 + num('off')) * fb2Rate() - num('vlag');
/* the lock: hypotheses from the worker's (pattern, q) pairs */
function fb2Lock(res) {
  const P = fb2Patterns(), hy = res.fb2 && res.fb2.hyps; if (!hy || !hy.pairs.length) { FB2.why = 'no hypotheses'; fb2Show(); return; }
  const seen = new Map(), H = [];
  for (const [p, q, sc, s48, nc48] of hy.pairs) for (const ph of P.list[p].ph) {
    const key = s48 + ':' + nc48 + ':' + ph[0] + ':' + ph[1]; if (seen.has(key)) continue;
    const h = { s: s48 >>> 0, nc: nc48 + 13, ph, w: 1 }; seen.set(key, h); H.push(h);
  }
  const wsum = H.length; H.forEach(h => { h.w = 1 / wsum; });
  const Hk = H.length > FB2_MAXH ? H.filter((h, i) => i % Math.ceil(H.length / FB2_MAXH) === 0) : H;   // too many: an even sample
  Hk.forEach(h => { h.w = 1 / Hk.length; });
  Object.assign(FB2, { on: true, hyps: Hk, pairs: hy.pairs.length, best: hy.best, kObs: null, plan: null, plans: [], t7: null, taps: [], vis: [], visFrom: null, tLock: performance.now() });
  slog('fb2Lock', { pairs: hy.pairs.length, hyps: H.length, states: new Set(H.map(h => h.s + ':' + h.nc)).size, kSeen: FB2.kSeen });
  // v97: the lever is Lakilester's Do Nothing (the popup A plays no part): a confirm seen before the lock is applied now
  if (FB2.pObs != null) { FB2.plan = { none: 'the lock came after the Do Nothing confirm' }; fb2SetP(FB2.pObs); } else fb2PlanP();
}
/* ---- v97: the T6 lever, Lakilester's Do Nothing (fb2_route/t6dn_log.py) ----
 * The press is read as T2-T4's Do Nothing (fb14_live.js): the Strategies box closing, FB14_VAN.S minus v94's +3.4
 * (fb14Van('S')), the beeps moved by the learned per-lever correction (fb14Bias, the same store: the same lever and
 * runner), the confirm carried on FB14_SHIFTS_S. Game frame = clock frame - console lag (FB2_LAGS), as the popup was. */
const fb2Bias = () => (typeof fb14Bias === 'function' ? fb14Bias() : 0);
const fb2DnPressT = k => fb2PressT(k) + fb2Bias() * fb2Rate();
function fb2PlanP(kAt) {      // kAt (tests): plan as if the earliest beepable frame were kAt, no beeps
  if (kAt == null && typeof seriesHold === 'function' && seriesHold('fb2')) return st.plan;      // v106: a begun series plays out
  const t0 = performance.now(), H = FB2.hyps, b7 = fb2BackupOn(), F = fb2Flags(), now = performance.now(), bias = fb2Bias();
  // v102 (console log fb0449 T6: planned 1.6 s ahead, its 3 beeps 300 ms apart: "the beeps seemed to glitch by speeding up"): the
  // T6 countdown is the runner's own (Settings: Beeps, Beep spacing, Lead time; playBeeps, earliestPress), never squeezed: the
  // first frame is the first whose press time leaves the whole countdown ahead, as T1-T4 and T7
  let kFirst = kAt; if (kAt == null) { kFirst = Math.max(FB2_PMIN, Math.ceil(fb2Pic(now + num('vlag')))); for (let i = 0; i < 900 && fb2DnPressT(kFirst) < earliestPress(now); i++) kFirst++; }
  const W = Math.max(10, Math.round(Math.max(1, num('zwwin')) * 1000 / fb2Rate())), P0 = kFirst - 4, P1 = kFirst + W + 4, rows = [];
  for (const h of H) for (const [so, co, wf] of F) {
    const S = { s: h.s, nc: h.nc }; fb2Idle(S, 61, P0 + FB2_DNAI, h.ph);
    const L = new Uint8Array(P1 - P0 + 1);
    for (let P = P0; P <= P1; P++) { const r = b7 ? fb2AI7(S, P + FB2_DNAI, h.ph, so, co) : fb2AI(S, P + FB2_DNAI, h.ph, so, co, true); L[P - P0] = r.lucky ? 1 : 0; fb2Frame1(S, P + FB2_DNAI, h.ph); }
    rows.push({ h, w: h.w * wf, L });
  }
  const luck = (row, P) => row.L[Math.max(0, Math.min(P1 - P0, P - P0))];
  const tot = rows.reduce((a, r) => a + r.w, 0);
  const pcc = k => { let v = 0; for (const r of rows) for (const [l, wl] of FB2_LAGS) for (const [d, q] of PRESS_ERR) v += r.w * wl * q * luck(r, k + d - l); return v / tot; };
  const ppk = k => { let v = 0; for (const r of rows) for (const [l, wl] of FB2_LAGS) v += r.w * wl * luck(r, k - l); return v / tot; };
  const a = kFirst - 1, b = kFirst + W + 1, sh = []; for (let k = a; k <= b; k++) sh.push(k >= kFirst && k <= kFirst + W ? ppk(k) : 0);
  const pk = ppPick(sh, null, a, b, kFirst, W, pcc, 'safe3');
  let k = pk.target; if (k == null || !(k >= kFirst)) { k = kFirst; for (let x = kFirst; x <= kFirst + W; x++) if (pcc(x) > pcc(k)) k = x; }
  const pl = { k, p: pcc(k), pp: ppk(k), win: pk.ok ? pk.run.length : 0, blind: fb2Txt().b, kFirst, W, bias: +bias.toFixed(2), lever: 'nothing', ms: Math.round(performance.now() - t0), states: rows.length };
  pl.tPress = fb2DnPressT(k);
  // the edge rule (zwedge), as every plan: a Close Call share under it is no plan (Do Nothing whenever you like)
  if (!(pl.pp >= num('zwedge'))) { const nl = { none: 'no Do Nothing frame gives ' + fb2Txt().goal + ' for enough of the states (best ' + Math.round(100 * (pl.pp || 0)) + '% with a perfect press)', edge: true, blind: fb2Txt().b, kFirst, pp: pl.pp, p: pl.p, lever: 'nothing' }; if (kAt != null) return nl; cancelBeeps(); FB2.plan = nl; if (st.plan && st.plan.prof === 'fb2') st.plan = null; st.msg = 'No edge: ' + nl.none + '. Do Nothing whenever you like (' + fb2Txt().blind + ').'; slog('fb2PlanP', { none: 'edge', pp: +(pl.pp || 0).toFixed(3), kFirst }); fb2Show(); if (typeof render === 'function') render(); return nl; }     // v99: the No edge text at once (v98 left it to makePlan, which the T6 step never reached)
  if (kAt != null) return pl;
  cancelBeeps(); playBeeps(pl.tPress);
  FB2.plan = pl; FB2.plans = (FB2.plans || []).concat([Object.assign({ tMade: now }, pl)]); slog('fb2PlanP', pl);
  // v99: early (made on the lock, before the Strategies screen opens): the screen-lost rule (planScreenLost) waits for that
  // v109 (console fb0709 T6, clip fb1153: "no track was shown but it beeped"): the plan carried no frames (tab: []), so the strip
  // drew nothing; now the perfect-press share per frame (>= 0.5 works), on a clock whose frame k reaches the now-line at its press
  const r6 = fb2Rate(), w6 = pk.ok ? pk.run : { start: k, end: k, length: 1 };
  st.msg = null; st.plan = { tMade: now, w: { start: w6.start, end: w6.end, length: w6.length }, target: k, tPress: pl.tPress, tLast: pl.tPress - (k - 0.5 + num('off')) * r6, rate: r6, carried: true, early: true, from: kFirst, to: kFirst + W, first: a, prof: 'fb2', tab: sh.map(v => v >= 0.5), tab4: null, chance: sh.map((v, i) => (a + i >= kFirst && a + i <= kFirst + W ? pcc(a + i) : 0)), mix: { p: pl.p, pp: pl.pp, win: pl.win, doubt: 0, groups: rows.length, zw: true } };
  fb2Show(); if (typeof render === 'function') render(); return pl;
}
/* the Do Nothing confirm (the Strategies box closing on T6's step): its frame into the states, the press into the learned
 * correction, the route on to T7 */
function fb2Confirm(tObs) {
  if (!CHG.trig) { slog('fb2ConfirmNoTrig', { at: Math.round(tObs) }); return; }
  const c = fb2Pic(tObs) - (typeof fb14Van === 'function' ? fb14Van('S') : -1.4), P = FB2.plan && FB2.plan.k != null ? FB2.plan : null;
  // v109 (console fb0722 T5: a Strategies-like close 87 frames after a false trigger moved the route to T7): without a T6 lock, a
  // close before FB2_PMIN - 20 frames after the trigger is not the Do Nothing (console Do Nothing confirms: 149-392)
  if (!FB2.on && c < FB2_PMIN - 20) { slog('fb2ConfirmTooEarly', { c: +c.toFixed(2) }); return; }
  slog('fb2Confirm', { c: +c.toFixed(2), planned: P ? P.k : null, err: P ? +(c - P.k).toFixed(2) : null });
  if (P && Math.abs(c - P.k) <= 5 && typeof fb14PressAdd === 'function') { const L = fb14PressAdd(c - P.k - (P.bias || 0)); slog('fb2PressBias', { n: L.length, bias: +fb2Bias().toFixed(2) }); const SP = st.plan && st.plan.prof === 'fb2' && st.plan.target === P.k ? st.plan : null, wk = typeof pressShow === 'function' ? pressShow(SP, c, 'Final Bowser T6, Do Nothing') : null; if (typeof leverPressNote === 'function') leverPressNote('Final Bowser T6, Do Nothing', c - P.k, 'fb14', wk); }
  FB2.pObs = c; FB2.pT = tObs; FB2.hpw = null; cancelBeeps(); if (st.plan && st.plan.prof === 'fb2') st.plan = null;
  if (typeof isRoute === 'function' && isRoute() && RT()[routeStep] && RT()[routeStep].turn === 'fb2_k') { const i = RT().findIndex((x, j) => j > routeStep && x.turn === 'fb2_pb'); /* v114: the next one (T7 main / T8 backup) */ if (i >= 0) { slog('fb2StepByConfirm', { from: routeStep, to: i }); setStep(i); } }
  if (FB2.on) fb2SetP(c);
}
function fb2SetP(c) {
  const b7 = fb2BackupOn(), F = fb2Flags(), out = [], shifts = typeof FB14_SHIFTS_S !== 'undefined' ? FB14_SHIFTS_S : [[0, 1]], F0 = Math.round(c);
  for (const h of FB2.hyps) for (const [l, wl] of FB2_LAGS) for (const [d, wd] of shifts) for (const [so, co, wf] of F) {
    const P = F0 + d - l, S = { s: h.s, nc: h.nc, coins: [] }; fb2Idle(S, 61, P + FB2_DNAI, h.ph);
    const a = b7 ? fb2AI7(S, P + FB2_DNAI, h.ph, so, co) : fb2AI(S, P + FB2_DNAI, h.ph, so, co, true); out.push({ h, l, P, a, w: h.w * wl * wd * wf });
  }
  const tot = out.reduce((x, o) => x + o.w, 0), luck = out.reduce((x, o) => x + (o.a.lucky ? o.w : 0), 0) / tot;
  const atk = {}; out.forEach(o => { atk[o.a.atk] = (atk[o.a.atk] || 0) + o.w / tot; });
  const hitAtk = {}, hw = out.reduce((x, o) => x + (o.a.lucky ? 0 : o.w), 0); out.forEach(o => { if (!o.a.lucky) hitAtk[o.a.atk] = (hitAtk[o.a.atk] || 0) + o.w / (hw || 1); });
  FB2.t7 = { states: out.filter(o => o.a.lucky), pLucky: luck, atk, hitAtk };
  slog('fb2P', { c: +c.toFixed(2), pLucky: +luck.toFixed(3), atk, planned: FB2.plan && FB2.plan.k }); fb2Show();
}
/* the K plan: lucky per hypothesis x flags for every logic K, then the best time frame k in the rest of the window */
function fb2PlanK(kAt) {      // kAt (tests): plan as if the earliest beepable frame were kAt, no beeps
  if (kAt == null && typeof seriesHold === 'function' && seriesHold('fb2')) return st.plan;      // v106: a begun series plays out
  const t0 = performance.now(), H = FB2.hyps, F = fb2Flags(), now = performance.now();
  const kFirst = kAt != null ? kAt : Math.max(FB2_KMIN + 1, Math.ceil(fb2Pic(now + num('vlag')) + (FB2_BEEPS - 1) * FB2_GAP / fb2Rate() + 0.15 * 1000 / fb2Rate() + 2));
  const rows = [], K0 = Math.max(FB2_KMIN, Math.min(FB2_KMAX, kFirst - 3));   // per (h, flag): lucky for K = K0..137 and the AI result
  for (const h of H) for (const [so, co, wf] of F) {
    const S = { s: h.s, nc: h.nc }; fb2Idle(S, 61, K0 + 40, h.ph);
    const L = new Uint8Array(FB2_KMAX - FB2_KMIN + 1), A = [];
    for (let K = K0; K <= FB2_KMAX; K++) { const r = fb2AI(S, K + 40, h.ph, so, co); L[K - FB2_KMIN] = r.lucky ? 1 : 0; A[K - FB2_KMIN] = r; fb2Frame1(S, K + 40, h.ph); }
    rows.push({ h, w: h.w * wf, L, A });
  }
  const luck = (row, K) => row.L[(K < FB2_KMIN || K > FB2_KMAX ? FB2_KMAX : K) - FB2_KMIN];
  const pcc = k => { let v = 0; for (const r of rows) for (const [l, wl] of FB2_LAGS) for (const [d, q] of PRESS_ERR) v += r.w * wl * q * luck(r, k + d - l); return v; };
  const tot = rows.reduce((a, r) => a + r.w, 0), cand = [];
  for (let k = kFirst; k <= FB2_KMAX - 1; k++) cand.push({ k, p: pcc(k) / tot });
  const blind = pcc(FB2_KMAX + 5) / tot;                         // no press: the popup closes by itself (K = 137)
  if (!cand.length) { const pl = { none: 'the lock came too late for the popup window (closes on +136)', blind, kFirst }; if (kAt != null) return pl; FB2.plan = pl; slog('fb2PlanK', { none: true, kFirst }); fb2Show(); return pl; }
  cand.sort((a, b) => b.p - a.p);
  // tie-break on the T7 windows: P(Close Call and 7+ with the best target-A frame in 1 s from the earliest), on a
  // sample of the states, for the k within 3 points of the best
  const top = cand.filter(c => c.p >= cand[0].p - 0.03).slice(0, 3), sub = rows.length > 24 ? rows.filter((r, i) => i % Math.ceil(rows.length / 24) === 0) : rows;
  const p7Of = c => {
    let v = 0, w = 0;
    for (const r of sub) for (const [l, wl] of FB2_LAGS) for (const [d, q] of PRESS_ERR) {
      const K = Math.min(FB2_KMAX, Math.max(FB2_KMIN, c.k + d - l)), K2 = c.k + d - l < FB2_KMIN ? FB2_KMAX : K, a = r.A[K2 - FB2_KMIN]; w += r.w * wl * q;
      if (!a || !a.lucky) continue; const D0 = a.menu + 45, b = fb2PBWin(a.S, a.T + 1, D0, 30, r.h.ph).map(x => (x >= 7 ? 1 : 0));
      let best = 0; for (let i = 1; i <= 30; i++) best = Math.max(best, 0.25 * b[i - 1] + 0.5 * b[i] + 0.25 * b[i + 1]); v += r.w * wl * q * best;
    }
    c.p7 = w ? v / w : 0;
  };
  for (const c of top) p7Of(c);
  top.sort((a, b) => (b.p + b.p7) - (a.p + a.p7)); let c = top[0];
  // v83, the perfect press (zwChoose's ppPick): a frame the Close Call works on for the states (the console lag 0 / 1
  // unseen, so weighed in), the centre of the widest run of such frames; the spread-weighted p kept for the log
  { const ppk = k => { let v = 0; for (const r of rows) for (const [l, wl] of FB2_LAGS) v += r.w * wl * luck(r, k - l); return v / tot; };
    const a = kFirst - 1, b = FB2_KMAX - 1, sh = []; for (let k = a; k <= b; k++) sh.push(k >= kFirst ? ppk(k) : 0);
    const pk = ppPick(sh, null, a, b, kFirst, b - kFirst, k => pcc(k) / tot, 'safe3'), q = cand.find(x => x.k === pk.target) || c;
    if (q.p7 == null) p7Of(q); c = Object.assign({}, q, { pp: ppk(pk.target), win: pk.run.length }); }
  const tPress = fb2PressT(c.k), pl = { k: c.k, p: c.p, pp: c.pp, win: c.win, p7: c.p7, blind, tPress, kFirst, ms: Math.round(performance.now() - t0), states: rows.length,
    alt: cand.slice(0, 5).map(x => [x.k, +x.p.toFixed(3)]) };
  // v95: the edge rule (zwedge) on the popup beep too: a Close Call share under it is no plan (close the popup normally)
  if (!(pl.pp >= num('zwedge'))) { const nl = { none: 'no popup frame gives Close Call for enough of the states (best ' + Math.round(100 * (pl.pp || 0)) + '% with a perfect press)', edge: true, blind, kFirst, pp: pl.pp, p: pl.p }; if (kAt != null) return nl; cancelBeeps(); FB2.plan = nl; slog('fb2PlanK', { none: 'edge', pp: +(pl.pp || 0).toFixed(3), p: +pl.p.toFixed(3), k: pl.k }); fb2Show(); return nl; }
  if (kAt != null) return pl;
  cancelBeeps(); if (typeof BEEP_STOP_MS !== 'undefined') playBeeps(tPress, FB2_BEEPS, FB2_GAP); else for (let i = 0; i < FB2_BEEPS; i++) beepAt(tPress - (FB2_BEEPS - 1 - i) * FB2_GAP, i === FB2_BEEPS - 1 ? 1320 : 880, i === FB2_BEEPS - 1 ? 0.12 : 0.06);     // v106: whole series only
  FB2.plan = pl; slog('fb2PlanK', FB2.plan); fb2Show(); return pl;
}
/* per picture after the lock: the popup ("+3", a bright box across the top middle: 320-space x 70..250, y 65..100) */
function fb2PopupBox() { const [SX, OX, SY, OY] = chgMap(); return { x: (OX + 80 * SX) / 1280, y: (OY + 70 * SY) / 720, w: 160 * SX / 1280, h: 25 * SY / 720 }; }
function fb2Frame(t, present) {
  if (!CHG.trig) return;
  if (FB2.kSeen == null) {
    const g = sample(fb2PopupBox(), 32, 8); let m = 0; for (let i = 0; i < g.length; i += 4) m += 0.299 * g[i] + 0.587 * g[i + 1] + 0.114 * g[i + 2]; m /= 256;
    const P = FB2.popup || (FB2.popup = { seen: false }), f = fb2Pic(t);     // the popup is up on frames 76 .. K + 1 (K <= 137)
    if (f > 145) { fb2SeenK(P.seen ? FB2_KMAX : null, P.seen ? 'popup (to the end)' : 'not seen'); return; }
    if (m > 85 && f > 70) { P.seen = true; P.lastOn = t; }
    else if (P.seen && t - P.lastOn < 400) fb2SeenK(Math.round(f - 2), 'popup', Math.min(Math.round(f - 2), Math.round(fb2Pic(P.lastOn)) - 1));   // pictures dropped in between: K from the last one with the popup on
    else if (!P.seen && present && f > 80) fb2SeenK(Math.round(f - 5), 'bar');   // the popup was missed: the bar comes back on K + 5
    return;
  }
  // the coin through Bowser's turn and the T7 menu
  fb2HpWatch(t, present);
  if (!CHG.trig) return;      // v114: a hit read just now started the backup (chgReset)
  if (present && FB2.visFrom == null) FB2.visFrom = fb2Pic(t) + 30;
  if (!present && FB2.visFrom != null) { FB2.vis.push([FB2.visFrom, fb2Pic(t) - 4]); FB2.visFrom = null; }
}
function fb2SeenK(k, how, k0) {
  // v97: the popup A is no lever on the runner's route (Lakilester's Do Nothing is, fb2Confirm): its closing is logged and
  // starts the coin watch only; the route stays on T6 until the Do Nothing confirm (v93-v96 moved it to T7 here)
  FB2.kHow = how; FB2.kFrom = k0 != null ? k0 : k; slog('fb2Seen', { k, how }); if (k == null) { FB2.kSeen = -1; return; } FB2.kSeen = k; }
function fb2Tap(t) { if (CHG.trig && FB2.kSeen != null && FB2.kSeen >= 0) FB2.taps.push(fb2Pic(t) - 4.8); }      // the flash shows ~4.8 frames after the draw
function fb2SetK(k, how, k0) {      // the popup A on frame k (k0..k when pictures were dropped around the closing)
  FB2.kObs = k; FB2.kHow = how; const F = fb2Flags(), out = [], ks = []; for (let x = Math.min(k, k0 != null ? k0 : k); x <= k; x++) ks.push(x);
  for (const h of FB2.hyps) for (const [l, wl] of FB2_LAGS) for (const kk of ks) for (const [so, co, wf] of F) {
    const K = kk - l < FB2_KMIN ? FB2_KMAX : Math.min(FB2_KMAX, kk - l), S = { s: h.s, nc: h.nc, coins: [] }; fb2Idle(S, 61, K + 40, h.ph);
    const a = fb2AI(S, K + 40, h.ph, so, co); out.push({ h, l, K, a, w: h.w * wl * wf / ks.length });
  }
  const tot = out.reduce((x, o) => x + o.w, 0), luck = out.reduce((x, o) => x + (o.a.lucky ? o.w : 0), 0) / tot;
  const atk = {}; out.forEach(o => { atk[o.a.atk] = (atk[o.a.atk] || 0) + o.w / tot; });
  FB2.t7 = { states: out.filter(o => o.a.lucky), pLucky: luck, atk };
  slog('fb2K', { k, k0: ks[0], how, pLucky: +luck.toFixed(3), atk, planned: FB2.plan && FB2.plan.k }); fb2Show();
}
/* the states left after the coin seen since K, weighed as the zero-wait tracker weighs its states (v72, zwLR): a seen
 * shine a state has (+-2 frames, a dropped picture reads it up to 3.5 late), a predicted shine inside a stretch with the
 * bar up that was not seen (a missed shine), a seen shine it does not have (a false one). v71 dropped a state on any one
 * of them. Returns the states with their weights (w) and the background's share (doubt, as zwDoubt). */
function fb2Prune(upto) {
  const T7 = FB2.t7; if (!T7) return [];
  // v110 (hh, log v109b: the T6 Close Call dodged, then about 55 T7 replans at doubt 1 and no plan): the bar stays up through
  // Bowser's T6 turn after the Do Nothing (24 s there) and the coin seen in it (3 shines) fits no state: the turn after the Close
  // Call test is not in the model's coin (or its flashes read as shines). The coin counts from the T6 outcome read (the dodge seen,
  // 16 s after the confirm there), else FB2_T7_COIN_MS after the confirm; replayed: 93 states, doubt 0.02-0.37
  const okC = typeof CHG !== 'undefined' && CHG.trig, cut = okC && T7.outT != null ? fb2Pic(T7.outT) : okC && FB2.pT != null ? fb2Pic(FB2.pT + (fb2BackupOn() ? 0 : FB2_T7_COIN_MS)) : -1e9;     // v114: the backup T7's turn is modelled to the T8 menu (fb2AI7): its coin counts from the confirm
  const vis = FB2.vis.concat(FB2.visFrom != null ? [[FB2.visFrom, upto - 4]] : []).map(([a, b]) => [Math.max(a, cut), Math.min(b, upto - 4)]).filter(([a, b]) => b > a), taps = FB2.taps.filter(x => x < upto && x >= cut);
  const Wd = 5.5 * (ZW_RHO + ZW_FALSE), Lm = (1 - ZW_PMISS) / Wd, Lmiss = ZW_PMISS, Lf = ZW_FALSE / (ZW_RHO + ZW_FALSE);
  const near = (x, f) => x - f >= -2 && x - f <= 3.5, out = []; let mx = 0, tot0 = 0;
  for (const o of T7.states) {
    tot0 += o.w;
    const S = { s: o.a.S.s, nc: o.a.S.nc, coins: o.a.S.coins.slice() }; fb2Idle(S, o.a.T + 1, Math.floor(upto), o.h.ph);
    const sh = S.coins.filter(c => c[1]).map(c => c[0] + o.l); let lw = 1, err = 0;
    for (const x of taps) if (sh.some(f => near(x, f))) lw *= Lm; else { lw *= Lf; err++; }
    for (const f of sh) if (vis.some(([a, b]) => f >= a && f <= b) && !taps.some(x => near(x, f))) { lw *= Lmiss; err++; }
    if (err > ZW_MAXERR) continue;
    const w = o.w * lw; out.push(Object.assign({}, o, { w, err })); mx = Math.max(mx, w);
  }
  const nVis = vis.reduce((a, [x, y]) => a + (y - x), 0), keep = out.filter(o => o.w >= mx * ZW_CUT), sum = keep.reduce((a, o) => a + o.w, 0), pL = T7.outcome === 'dodge' ? 1 : T7.pLucky != null ? Math.max(1e-3, T7.pLucky) : 1, bg = tot0 * (ZW_BG0 / (1 - ZW_BG0) + (1 - pL) / pL) * Math.exp(-ZW_RHO * nVis);
  keep.doubt = keep.length ? bg / (bg + sum) : 1;
  return keep;
}
/* v108 (console fb1548 T6 -> T7: the Close Call worked, pLucky 0.531, and the T7 plan said "No edge" at doubt 0.29-0.38, then
 * 0.9): the page never learned the T6 outcome. Its T7 states were already the dodge branch (fb2SetP keeps the lucky states at
 * the measured confirm, its read spread and console lag), but fb2Prune kept the hit branch's share ((1 - pLucky) / pLucky,
 * 0.88 here) as background on every plan: most of the doubt. Now the outcome is read as on T1-T4 (fb14HpWatch): Mario's HP
 * tens place on the steady bar, the "1" of 10 before the confirm; blank for 10 frames after it = a hit; the "1" steady for
 * FB2_DODGE_N frames from FB2_DODGE_MS after the confirm (past the Close Call test, P + 68, and the attack's damage) = a dodge.
 * A dodge drops the hit branch from the background (the states are conditioned on it); a hit leaves no modelled T7 state. */
const FB2_DODGE_MS = 3800, FB2_DODGE_N = 30, FB2_HIT_N = 8, FB2_T7_COIN_MS = 15000, FB2_HP_CHG = 0.15, FB2_HP_SAME = 0.08, FB2_LATE_MS = 22000;
/* v114 (console fb1810 T6: the Close Call failed at 1/10 HP, Fire Breath's 9 took Mario to 0, the Life Shroom revived him to 10/10
 * 15.4 s after the confirm, and v108's watch called it a dodge 16 s after the confirm: it waited for the "1" of 10, which Mario at
 * Danger never shows before the confirm; the revive's 10 was that "1"). The Close Call is a Danger turn (1-5 HP: the tens place is
 * blank), so the watch now compares Mario's whole HP number with the picture before the confirm: the tens place (JR_TENS) and the
 * units place's three columns (FB2_HPBOX, 320-space; fb1810's clip: the units "1" reads 0.08 / 0.71 / 0.59, the "0" after the hit
 * 0.40 / 0.70 / 0.59, the revive's "10" lights the tens place 0.48). A change (any part by FB2_HP_CHG) on FB2_HIT_N steady
 * pictures = a hit (fb1810: 2.65 s after the confirm); the same number (every part within FB2_HP_SAME) on FB2_DODGE_N steady
 * pictures from FB2_DODGE_MS on, with no change seen since the confirm = a dodge. A dodge is withdrawn when the number changes
 * within FB2_LATE_MS of the confirm (fb2HitLate): a hit is never kept as a dodge. */
const FB2_HPBOX = [[61, 27, 67, 36], [68, 27, 70, 36], [70, 27, 72, 36], [72, 27, 74, 36]];
function fb2HpVec(t) {
  if (window.__fb2HpTest) return window.__fb2HpTest(t);           // (tests: the 4 shares)
  if (window.__fb2TensTest) return [window.__fb2TensTest(t), 0, 0, 0];      // (v108 tests: the tens place only)
  const [SX, OX, SY, OY] = chgMap();
  return FB2_HPBOX.map(([x0, y0, x1, y1]) => { const g = sample({ x: (OX + x0 * SX) / 1280, y: (OY + y0 * SY) / 720, w: (x1 - x0) * SX / 1280, h: (y1 - y0) * SY / 720 }, 6, 12); let n = 0;
    for (let i = 0; i < g.length; i += 4) if (g[i] > 150 && g[i + 1] > 150 && g[i + 2] > 150) n++; return n / (g.length / 4); });
}
const fb2HpDiff = (v, r) => Math.max(...v.map((x, i) => Math.abs(x - r[i])));
function fb2HpWatch(t, present) {
  if (fb2BackupOn()) return;      // v114: the backup T7's attack is meant to hit (Danger); the coin tells its branch
  if (typeof JRT === 'undefined' && !window.__fb2HpTest && !window.__fb2TensTest) return;
  const TT = window.__fb2HpTest || window.__fb2TensTest, B = TT ? { since: -1e9 } : JRT.bar;
  const W = FB2.hpw || (FB2.hpw = { pre: [], ref: null, chg: 0, ok: 0, changed: false });
  if (!present || !B || !B.since || t - B.since < 6 * FRAME) { W.chg = 0; return; }
  const v = fb2HpVec(t);
  if (FB2.pT == null) { W.pre.push(v); if (W.pre.length > 10) W.pre.shift(); return; }      // before the confirm: the number to compare with
  const T7 = FB2.t7; if (!T7) return;
  const late = T7.outcome === 'dodge' && t - FB2.pT < FB2_LATE_MS;
  if (T7.outcome && !late) return;
  if (!W.ref) {      // the median of the pictures before the confirm, else of the first ones after it (before the test, P + 68)
    if (W.pre.length < 3 && t < FB2.pT + 1500) { W.pre.push(v); return; }
    if (W.pre.length < 3) { fb2Outcome('unread', { why: 'no HP picture before the test' }); return; }
    W.ref = [0, 1, 2, 3].map(i => W.pre.map(x => x[i]).sort((a, b) => a - b)[W.pre.length >> 1]);
  }
  if (t - FB2.pT > 25000 && !T7.outcome) { fb2Outcome('unread', { ok: W.ok }); return; }
  const d = fb2HpDiff(v, W.ref);
  if (d > FB2_HP_CHG) { W.chg++; if (W.chg >= 2) W.ok = 0; } else W.chg = 0;
  if (W.chg >= FB2_HIT_N) {
    const info = { afterMs: Math.round(t - FB2.pT), hp: v.map(x => +x.toFixed(2)), ref: W.ref.map(x => +x.toFixed(2)) };
    if (late) fb2HitLate(info); else fb2Outcome('hit', info);
    return;
  }
  if (late) return;
  if (d <= FB2_HP_SAME && t >= FB2.pT + FB2_DODGE_MS) { W.ok++; if (W.ok >= FB2_DODGE_N) fb2Outcome('dodge', { afterMs: Math.round(t - FB2.pT), frames: W.ok }); }
}
/* v114: the HP number changed after a dodge was read (within FB2_LATE_MS of the confirm): it was a hit */
function fb2HitLate(info) {
  const T7 = FB2.t7; if (!T7) return; T7.outcome = null; slog('fb2HitLate', info); fb2Outcome('hit', info);
}
/* the T6 outcome seen (the HP watch, or tests / the runner): 'dodge' | 'hit' | 'unread' */
function fb2Outcome(o, info) {
  const T7 = FB2.t7; if (!T7 || T7.outcome) return; T7.outcome = o; T7.outT = performance.now();
  slog(o === 'dodge' ? 'fb2Dodged' : o === 'hit' ? 'fb2HitSeen' : 'fb2OutcomeUnread', Object.assign({ pLucky: +(T7.pLucky || 0).toFixed(3), states: T7.states.length }, info || {}));
  if (o === 'hit') { T7.hit = true; if (st.plan && st.plan.prof === 'fb2') { cancelBeeps(); st.plan = null; } }
  fb2Show();
  if (o === 'hit' && !fb2BackupOn() && fb2Leg() === 'main' && typeof isRoute === 'function' && isRoute() && RT()[routeStep] && /^fb2_(k|pb)$/.test(RT()[routeStep].turn || '')) fb2Backup(info);     // on the main T6 / T7 steps only
}
/* v114: the T6 Close Call failed: the route switches to the backup ending (its T7 step: the T7 Super Charge locks the seed again).
 * The T6 states are dropped (chgReset -> fb2Reset): the T7 Charge is read from scratch, as T6's was. */
function fb2Backup(info) {
  if (FB2B.on || typeof RT !== 'function') return; const i7 = RT().findIndex(x => x.b7); if (i7 < 0) return;
  Object.assign(FB2B, { on: true, tHit: performance.now(), info: info || null, atk6: FB2.t7 && FB2.t7.hitAtk ? Object.assign({}, FB2.t7.hitAtk) : null });
  slog('fb2Backup', Object.assign({ to: i7 }, info || {}));
  if (typeof chgReset === 'function') chgReset('backup T7');
  setStep(i7);
  st.msg = 'Close Call failed on T6 (Mario was hit): backup ending. After the Life Shroom: T7 Super Charge, then wait on Lakilester\'s Strategies screen for the Do Nothing beep.'; if (typeof render === 'function') render();
}
/* v95 (log 906bfb29: Close Call not equipped, popup closed on k 77 with pLucky 0.134, and the T7 plan went on with the 13%
 * as if Mario had dodged): the T7 states are the dodge branch only. A hit (no roll when Close Call is not equipped:
 * 1A5830.c:192 tests the badge before rand_int(100), so no draw; or a roll of 30+) is not modelled after the test (the hit
 * animation and the T7 menu frames), so its share (1 - pLucky) is counted as background in fb2Prune: the coin must show the
 * dodge branch before a T7 beep. */
/* the T7 plan on the Power Bounce target screen (or at clock frame cScr in tests): the best target-A frame for 7+ */
function fb2PlanT7(cScr) {
  if (cScr == null && typeof seriesHold === 'function' && seriesHold('fb2')) return st.plan;      // v106: a begun series plays out
  if (!FB2.on || !FB2.t7) return false;
  if (FB2.t7.hit) { FB2.t7.plan = { none: 'hit' }; if (cScr != null) return FB2.t7.plan; if (FB2.t7.hitMsg !== true) { FB2.t7.hitMsg = true; slog('fb2NoEdge', { why: 'hit' }); } st.msg = 'No edge: Bowser hit Mario on T6 (the Close Call missed). Press Power Bounce normally.'; fb2Show(); render(); return true; }
  const G = fb2Goal(), TN = fb2BackupOn() ? 'T8' : 'T7', now = performance.now(), cNow = cScr != null ? cScr : fb2Pic(now + num('vlag')), S = fb2Prune(cNow);
  if (!S.length || S.doubt >= 0.5) { st.msg = 'No edge: the FB2 states the page kept do not fit what it saw in Bowser\'s turn (the coin' + (fb2BackupOn() ? ', or not a Body Slam / Claw' : ', or the popup frame') + '). Press Power Bounce normally.'; FB2.t7.plan = { none: 'no state fits' }; slog('fb2NoEdge', { doubt: S.doubt != null ? +S.doubt.toFixed(3) : null }); fb2Show(); render(); return true; }
  const tot = S.reduce((a, o) => a + o.w, 0), W = Math.max(0, Math.round(Math.max(1, num('zwwin')) * 1000 / fb2Rate()));
  let from = Math.ceil(cNow + num('lead') * 1000 / fb2Rate() + 1);
  if (cScr == null) for (let i = 0; i < 300 && fb2PressT(from) < earliestPress(now); i++) from++;   // every beep still ahead
  const s7 = new Array(W + 1).fill(0), s6 = new Array(W + 1).fill(0);
  for (const o of S) { const b = []; for (let x = from - 1; x <= from + W + 1; x++) b.push(fb2PB(o.a.S, o.a.T + 1, x - o.l, o.h.ph));
    for (let k = 0; k <= W; k++) for (const [d, q] of PRESS_ERR) { s7[k] += o.w * q * (b[k + 1 + d] >= G ? 1 : 0); s6[k] += o.w * q * (b[k + 1 + d] >= G - 1 ? 1 : 0); } }
  // v83, the perfect press: the 7-bounce share on each frame itself (no spread), the centre of the widest run of frames
  // that give 7 for the states (ppPick); with no such frame, the best 7 frame as before. Spread-weighted p7 / p6 logged.
  const e7 = new Array(W + 3).fill(0), e6 = new Array(W + 3).fill(0);
  for (const o of S) for (let x = from - 1; x <= from + W + 1; x++) { const v = fb2PB(o.a.S, o.a.T + 1, x - o.l, o.h.ph); if (v >= G) e7[x - from + 1] += o.w / tot; if (v >= G - 1) e6[x - from + 1] += o.w / tot; }
  let k = 0; for (let i = 1; i <= W; i++) if (s7[i] + 0.1 * s6[i] > s7[k] + 0.1 * s6[k] + 1e-12) k = i;
  const pk = ppPick(e7, e6, from - 1, from + W + 1, from, W, x => (s7[x - from] || 0) / tot, 'safe3'); if (pk.ok) k = pk.target - from;
  const d = from + k, dz = S.doubt || 0, plan = { d, p7: (1 - dz) * s7[k] / tot, p6: (1 - dz) * s6[k] / tot, pp7: (1 - dz) * e7[k + 1], pp6: (1 - dz) * e6[k + 1], win: pk.ok ? pk.run.length : 0, doubt: +dz.toFixed(3), states: S.length, tPress: fb2PressT(d) };   // the background's share counts as no 7 (blind 7 is ~7%)
  // v95 (log 906bfb29 T7: p7 0, p6 0, win 0 at doubt 0.44 on 3 states, and the countdown played; the runner got 3): the
  // page's edge rule as every other plan (zwChoose): beeps only when the perfect-press 7 share, the background counted as
  // no 7, reaches Settings > Best chance (zwedge). Below it: "No edge", no countdown.
  if (!(plan.pp7 >= num('zwedge'))) {
    plan.none = 'edge'; FB2.t7.plan = plan; if (cScr != null) return plan;
    const was = st.plan && st.plan.prof === 'fb2'; if (was || FB2.t7.edgeLogged !== d) { slog('fb2NoEdge', { why: 'edge', d, p7: +plan.p7.toFixed(3), pp7: +plan.pp7.toFixed(3), p6: +plan.p6.toFixed(3), win: plan.win, doubt: plan.doubt, states: plan.states }); FB2.t7.edgeLogged = d; }
    if (was) st.plan = null; cancelBeeps();
    // v109 (console fb0731 T7: 9 s of "No edge" before a 7 window, the runner did not know whether the page was waiting or broken):
    // the next frame where 7 bounces work for most states, looked for up to FB2_T7_AHEAD frames on
    if (!FB2.t7.next || FB2.t7.next.from > from || (FB2.t7.next.at != null && FB2.t7.next.at < from + W) || (FB2.t7.next.at == null && from - FB2.t7.next.from > 60)) { let at = null; if (S.length <= 64) for (let x = from + W + 1; x <= from + W + FB2_T7_AHEAD && at == null; x++) { let v = 0; for (const o of S) if (fb2PB(o.a.S, o.a.T + 1, x - o.l, o.h.ph) >= G) v += o.w / tot; if ((1 - dz) * v >= num('zwedge')) at = x; } FB2.t7.next = { from, at }; }
    const nx = FB2.t7.next && FB2.t7.next.at != null ? ' Waiting for the next ' + G + '-bounce window, in about ' + Math.max(0, (FB2.t7.next.at - W - from) * fb2Rate() / 1000).toFixed(0) + ' s: stay on the target screen for its beeps.' : '';
    st.msg = 'No edge, press normally' + (nx ? ' or wait' : '') + ': no target-A frame in the next ' + num('zwwin') + ' s gives ' + G + ' bounces for enough of the ' + S.length + ' FB2 states (best ' + Math.round(100 * plan.pp7) + '% with a perfect press, ' + (G - 1) + '+ ' + Math.round(100 * plan.pp6) + '%' + (dz ? '; ' + Math.round(100 * dz) + '% that none of them is the game\'s' : '') + ').' + (nx || ' Press Power Bounce normally.');
    fb2Show(); render(); return true;
  }
  FB2.t7.plan = plan;
  if (cScr != null) return plan;
  if (cScr == null) { cancelBeeps(); playBeeps(plan.tPress);
    const r7 = fb2Rate(), w7 = pk.ok ? pk.run : { start: d, end: d, length: 1 };      // v109: the strip's frames (7 bounces for most states), as T6
    st.msg = null; st.plan = { tMade: now, w: { start: w7.start, end: w7.end, length: w7.length }, target: d, tPress: plan.tPress, tLast: plan.tPress - (d - 0.5 + num('off')) * r7, rate: r7, carried: true, from, to: from + W, first: from - 1, prof: 'fb2', tab: e7.map(v => (1 - dz) * v >= 0.5), tab4: null, mix: { p: plan.p7, pp: plan.pp7, win: plan.win, doubt: dz, groups: S.length, zw: true } }; }
  slog('fb2PlanT7', plan); fb2Show(); if (cScr == null) render(); return true;
}
function fb2Show() {
  const el = $('fb2-status'); if (!el) return;
  if (!FB2.on) { el.innerHTML = '<b>FB2 T6 → T7:</b> ' + (FB2.why ? FB2.why : 'waiting for the T6 Super Charge lock'); return; }
  const P = FB2.plan, T = FB2.t7, pc = x => Math.round(100 * x) + '%';
  el.innerHTML = '<b>FB2 T6 → T7</b> (' + FB2.hyps.length + ' RNG states after the rays)' +
    '<br>Do Nothing (Lakilester): ' + (!P ? '…' : P.none ? 'no plan (' + P.none + '; blind about ' + pc(P.blind) + ')' : 'beep on +' + P.k + ': Close Call, ' + likelyText({ p: P.p, win: P.win }) + ' · perfect press ' + pc(P.pp != null ? P.pp : P.p) + (P.win ? ' (window ' + P.win + ')' : '') + ' (with your press spread ' + pc(P.p) + ')') +
    (FB2.pObs != null && T ? '<br>Seen: Do Nothing on +' + FB2.pObs.toFixed(1) + '; Close Call ' + (T.outcome === 'dodge' ? 'worked (seen)' : T.outcome === 'hit' ? 'missed: Bowser hit (seen)' : pc(T.pLucky)) + '; Bowser ' + Object.entries(T.atk).map(([a, w]) => a + ' ' + pc(w)).join(', ') : '') +
    (T && T.plan ? '<br>T7: ' + (T.plan.none ? 'no edge (' + (T.plan.none === 'edge' ? 'best 7 ' + pc(T.plan.pp7) + ' with a perfect press' : T.plan.none) + ')' : 'target A on +' + T.plan.d + ': perfect press 7 bounces ' + pc(T.plan.pp7 != null ? T.plan.pp7 : T.plan.p7) + (T.plan.win ? ' (window ' + T.plan.win + ')' : '') + ', 6+ ' + pc(T.plan.pp6 != null ? T.plan.pp6 : T.plan.p6) + '; with your press spread 7 ' + pc(T.plan.p7) + ', 6+ ' + pc(T.plan.p6) + ' (' + T.plan.states + ' states)') : '');
}
fb2Reset();
window.__fb2 = { v114: { ai7: (s, nc, ph, P, so, co) => { const S = { s: s >>> 0, nc }; fb2Idle(S, P, P + FB2_DNAI, ph); const a = fb2AI7(S, P + FB2_DNAI, ph, so !== false, co !== false); return { atk: a.atk, lucky: a.lucky, T: a.T, s: a.S.s >>> 0, nc: a.S.nc }; }, pb: (s, nc, ph, f0, d) => fb2PB({ s: s >>> 0, nc }, f0, d, ph), backupOn: () => fb2BackupOn(), FB2B, backup: i => fb2Backup(i), hpVec: t => fb2HpVec(t), txt: () => fb2Txt() }, v108: { outcome: (o, i) => fb2Outcome(o, i), prune: c => fb2Prune(c), hpWatch: (t, pr) => fb2HpWatch(t, pr) }, FB2, ai: (s, nc, ph, E, so, co) => { const S = { s: s >>> 0, nc }; fb2Idle(S, 61, E, ph); const a = fb2AI(S, E, ph, so !== false, co !== false, true); return { atk: a.atk, cc: a.cc, lucky: a.lucky, T: a.T, menu: a.menu }; }, van: () => (typeof fb14Van === 'function' ? fb14Van('S') : null), bias: () => fb2Bias(), planPAt: k => fb2PlanP(k), confirm: t => fb2Confirm(t), setP: c => fb2SetP(c), dnPressT: k => fb2DnPressT(k), seenK: (k, how) => fb2SeenK(k, how || 'test'), planKAt: k => fb2PlanK(k), setK: (k, how, k0) => fb2SetK(k, how || 'test', k0), planT7At: c => fb2PlanT7(c), pic: t => fb2Pic(t), pressT: k => fb2PressT(k), prune: c => fb2Prune(c).length };   // for tests
