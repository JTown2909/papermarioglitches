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
const FB2_KEY_S = 3;     // v124: the Do Nothing's look-ahead past the base window (s)
const FB2_LAGS = [[0, 0.75], [1, 0.25]], FB2_BEEPS = 3, FB2_GAP = 300, FB2_DMG0 = 15, FB2_HP = 80, FB2_MAXH = 4000;
const FB2_TH = (() => { const t = []; let c = 200; for (let i = 0; i < 30; i++) { c = Math.floor(c * 60 / 100); t.push(c); } return t; })();
var FB2 = { on: false };      // var: charge_live.js calls fb2Reset (via chgReset) before this file has run
/* v114: the runner's backup ending after a failed T6 Close Call (console fb1810): T6 "Close Call failed, Life Shroom", T7 "Charge;
 * Do Nothing - No Wave or Shield" (v133), T8 "Bounce x5". FB2B lives outside FB2 (chgReset -> fb2Reset clears FB2 for the T7 Charge's
 * lock); the route shows the backup lines while it is on (fb2BackupOn), its T7 / T8 steps carry b7 / b8. */
var FB2B = { on: false };
const fb2BackupOn = () => !!(FB2B && FB2B.on);
/* fb2_route/t6hit_log.py (emulator, JP): after the T7 Super Charge Mario has 15 charges; the T8 Power Bounce's first hit is 18 in
 * Danger (6 / 6 roll sequences exact with fb2model.py dmg0 18), so 18 + 17 + 16 + 15 + 14 = 80: 5 bounces end the fight */
const FB2B_DMG0 = 18, FB2B_GOAL = 5;
// (FB2 is reset when the backup starts, so every FB2 lock / plan while it is on belongs to the backup T7 / T8)
const fb2Dmg0 = () => (fb2BackupOn() ? FB2B_DMG0 : FB2_DMG0), fb2Goal = () => (fb2BackupOn() ? FB2B_GOAL : FB2_GOAL7());     /* v123 (the runner: "need 6 or 7 bounce"): the main T7 plans for 6+ (6 or 7 both win on the route), the backup T8 for 5 */
/* the runner: "if we get a 5 cap in phase 1, we need a 6 cap in phase 2, if we get a 3/4 cap in phase 1, we need a 7 cap" (route row: P1 bounce) */
const FB2_GOAL7 = () => ((typeof $ === 'function' && $('s-fbp1cap') && $('s-fbp1cap').value === '34') ? 7 : 6);
/* the step's words (T6 main / the backup T7) */
const fb2Txt = () => (fb2BackupOn() ? { turn: 'T7', goal: 'a Body Slam / Claw (no wave, Mario in Danger)', blind: 'a Body Slam / Claw about 8%', b: 0.08 } : { turn: 'T6', goal: 'Close Call', blind: 'Close Call about 30%', b: 0.3 });
const fb2Leg = () => { const s = typeof isRoute === 'function' && isRoute() && RT()[routeStep]; return s && s.b7 ? 'b7' : s && s.b8 ? 'b8' : 'main'; };
function fb2Reset() { if (!FB2) return; Object.assign(FB2, { rate: typeof chgRate === 'function' && typeof consoleRate === 'function' ? chgRate() : null, on: false, hyps: null, plan: null, plans: [], pObs: null, kObs: null, kSeen: null, kHow: null, t7: null, popup: null, why: null, taps: [], vis: [], visFrom: null, pT: null, hpw: null }); fb2Show(); }
const fb2nb = (f, p1, p2) => (FB2_P130.includes(((f + p1) % 130 + 130) % 130) ? 1 : 0) + (FB2_P220.includes(((f + p2) % 220 + 220) % 220) ? 1 : 0);     // (v142: negative frames)
/* the window patterns (bolt counts on rays frames 0..47 = confirm + 13..60) and the phase pairs behind each */
/* v179 (console log v109b, Nov 15, T6 -> T7: with the dodge seen, only states on the pair 58 / 73 fit Bowser's coin - doubt 0.02 on
 * v118's mod-5 pairs; v143's mod 10 dropped them and every state missed the coin, doubt 0.73): on console T6's pair can be
 * p130 = p220 mod 5 but not mod 10 (the emulator's are mod 10 at every turn). T6 / the backup T7 (the 'fb2' read) take the mod-5
 * pairs again, those off mod 10 at FB2_PH5_W (0.5: the console log fits at both of test_v110 5's times, 0.488 / 0.042; 0.25 gave 0.55); T1-T4 and Phase 1 keep mod 10. */
let FB2_PH5_W = 0.5;
function fb2Patterns(m) {
  m = m || 10; fb2Patterns.c = fb2Patterns.c || {}; if (fb2Patterns.c[m]) return fb2Patterns.c[m];
  const idx = new Map(), list = [];
  for (let p2 = 0; p2 < 220; p2++) for (let p1 = p2 % m; p1 < 130; p1 += m) {     // v143: both loops start with the battle (p130 = p220 mod 10)
    const r = []; for (let n = 0; n < 48; n++) r.push(fb2nb(n + 13, p1, p2));
    const k = r.join(''); let i = idx.get(k); if (i == null) { i = list.length; idx.set(k, i); list.push({ r, ph: [] }); } list[i].ph.push([p1, p2]);
  }
  const bytes = new Uint8Array(list.length * 52); list.forEach((x, i) => x.r.forEach((v, n) => { bytes[i * 52 + n] = v; }));
  return (fb2Patterns.c[m] = { list, bytes });
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
/* v179 (11-27 guarded test fights c7000003 / d7000004: a T6 Claw tested Close Call 7 frames after the page's frame): v97's "Claw" runs
 * all followed a T5 Claw, so Bowser could not Claw on T6 and they were Fire Breaths. A real T6 Claw (after a T5 Body Slam or Fire
 * Breath) tests 62 after the AI and opens the T7 menu 83 after the test (as fb2_route/t6model.py's Claw with Lakilester KO'd). */
const FB2_T7_AHEAD = 600, FB2_DNAI = 13, FB2_PMIN = 130, FB2_DNDELTA = { slam: 52, claw: 62, fire: 55 }, FB2_DNMENU = { slam: 101, claw: 83, fire: 134 };
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
/* v134: the same attack guarded (an A on the hit's frame - 3 .. - 1; the runner's clips show "ナイス" on Bowser's hits): Phase 1's
 * guarded tables (fb2_route/p1model.py, 28 emulator logs exact: these unguarded ones are its claw_u / slam_u) and phase 2's T3
 * slam (t14_log.py with the A, test_v134): only the 10 sparks on the hit, the T8 menu sooner. A Body Slam / Claw carry splits:
 * FB2B_GUARD of the weight guarded. */
// v164 (console 11-26 11:16: the backup T7 gave Fire Breath, guarded, Mario at 1; no state followed it and T8 had no beep): Phase 1's
// guarded Fire Breath (p1_extra.json fire_g: no draw of its own, the next menu on the AI + 160); unguarded it KOs Mario (no Life Shroom left)
// v179 (emulator, the backup T7 itself: det/b7meas.py on the 11-27 c7 / d7 T6 states, Mario 10 after the Life Shroom, 15 charges, the runner's
// guard): guarded Body Slam 10 sparks on +69 and the T8 menu on +145 (6 runs), guarded Fire Breath no draw and +161 (41 runs; Mario at 1), guarded Claw 10 sparks on +64 and +127 (6 runs; Mario at 3);
// a guarded Lightning leaves 1 too (+172, its draws vary: not carried):
// Phase 1's menus were a frame early here (the unguarded Body Slam's 212 and its draws matched exactly, 4 runs)
const FB2B_HIT_G = { claw: { 64: new Array(10).fill(359) }, slam: { 69: new Array(10).fill(359) }, fire: {} }, FB2B_MENU_G = { claw: 127, slam: 145, fire: 161 }, FB2B_GUARD = 0.7;
/* v181 (emulator, the backup T7: det/b7rows.py, every frame's seed matched from the AI to the T8 menu): a guarded Lightning Blast
 * (Mario at 1) carries to T8: its effect made on AI + 19 (rand_int 360, then 10 x (10, 20 = p)), each of the 10 respawned (a 359,
 * after the coin) on +19 + 19 + p and every 20 frames after while before +19 + 50 (fb2_route/lb_model.py), rand_int(7) on +69, the
 * strike's 3 x rand_int(359) on +99 with no dodge test; the T8 menu on +172 (fixtures/fb2_b7_lightning.json, test_v181.js). Unguarded it is a KO (no Life Shroom left). */
const FB2B_LB = { e: 19, r7: 69, bolt: 99, menu: 172 };
function fb2AI7(S0, E, ph, slamOk, clawOk, gd) {
  const S = { s: S0.s, nc: S0.nc, coins: S0.coins ? S0.coins.slice() : null }, ri = m => { const r = R.randInt(S.s, m); S.s = r[0]; return r[1]; };
  for (let i = fb2nb(E, ph[0], ph[1]); i; i--) S.s = R.randInt(S.s, 359)[0];
  let atk;
  if (ri(100) < FB2B_RECAST) atk = 'recast';
  else if (ri(100) < 75) atk = 'wave';
  else { const v3 = ri(110); if (v3 < 20) atk = 'wave'; else if (v3 < FB2B_X3) atk = 'ko'; else if (ri(80) < 20 && slamOk) atk = 'slam'; else atk = ri(60) < 20 && clawOk ? 'claw' : 'fire'; }
  if (E === S.nc) { const c = ri(100); S.nc += c >= 70 ? 48 : 24; if (S.coins) S.coins.push([E, c >= 70]); }
  S.s = R.adv(S.s);
  const good = atk === 'slam' || atk === 'claw' || ((atk === 'fire' || atk === 'ko') && !!gd); let T = E;     // v164: a guarded Fire Breath carries to T8 too; v181: a guarded Lightning as well
  if (atk === 'ko' && gd) { T = E + FB2B_LB.menu; const resp = {};
    for (let f = E + 1; f <= T; f++) { for (let i = fb2nb(f, ph[0], ph[1]); i; i--) S.s = R.randInt(S.s, 359)[0];
      if (f === E + FB2B_LB.e) { ri(360); for (let i = 0; i < 10; i++) { ri(10); const p = ri(20); for (let k = f + 19 + p; k < f + 50; k += 20) resp[k] = (resp[k] || 0) + 1; } }
      if (f === E + FB2B_LB.r7) ri(7);
      if (f === E + FB2B_LB.bolt) for (let i = 0; i < 3; i++) ri(359);     // the blast's strike (3 x 359; no dodge test when guarded)
      if (f === S.nc) { const c = ri(100); S.nc += c >= 70 ? 48 : 24; if (S.coins) S.coins.push([f, c >= 70]); }
      for (let i = resp[f] || 0; i; i--) ri(359);
      S.s = R.adv(S.s); } }
  else if (good) { const H = (gd ? FB2B_HIT_G : FB2B_HIT)[atk]; T = E + (gd ? FB2B_MENU_G : FB2B_MENU)[atk];
    for (let f = E + 1; f <= T; f++) { for (let i = fb2nb(f, ph[0], ph[1]); i; i--) S.s = R.randInt(S.s, 359)[0]; for (const m of H[f - E] || []) ri(m);
      if (f === S.nc) { const c = ri(100); S.nc += c >= 70 ? 48 : 24; if (S.coins) S.coins.push([f, c >= 70]); } S.s = R.adv(S.s); } }
  return { lucky: good, ok7: atk !== 'wave' && atk !== 'recast',     /* v154 (the runner: "turn 7 shield is a failure"); v155 ("fire or lightning ... both work, you survive one HP"): only the wave and the shield fail; the carry to T8 (lucky) follows Body Slam / Claw only (their draws are measured) */ cc: null, atk, T, menu: T, S, gd: good ? !!gd : undefined };     // v133 (the runner: the backup T7 is "No Wave or Shield"): the Star Rod recast (his shield) is a success too; the carry follows only Body Slam / Claw
}
const fb2Edge = b => (b < 0.15 ? Math.min(num('zwedge'), Math.max(b + 0.15, 2 * b)) : num('zwedge'));     // v122: the edge against low blind odds (the backup T7); else Best chance
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
/* v122: the bounces for target A frames d0..d1 of state o (as fb2PB(o.a.S, o.a.T + 1, d, o.h.ph) each), from a window kept on the
 * state's AI result and computed once FB2_PB_AHEAD frames past what is asked, so the replans as the screen runs reuse it */
const FB2_PB_AHEAD = 60, FB2_T7_MAXS = 1500, FB2_T7_BUDGET = 120;
const fb2PBHas = (o, d0, d1) => { const C = o.a._pbc; return d0 < o.a.T + 2 || (!!C && C.ph === o.h.ph && d0 >= C.lo && d1 <= C.lo + C.arr.length - 1); };
function fb2PBRow(o, d0, d1) {
  const a = o.a, ph = o.h.ph; if (d0 < a.T + 2) { const r = []; for (let d = d0; d <= d1; d++) r.push(fb2PB(a.S, a.T + 1, d, ph)); return r; }
  let C = a._pbc; if (!C || C.ph !== ph || d0 < C.lo || d1 > C.lo + C.arr.length - 1) { const W = d1 - d0 + FB2_PB_AHEAD; C = a._pbc = { ph, lo: d0, arr: fb2PBWin(a.S, a.T + 1, d0 + 1, W, ph) }; }
  return C.arr.slice(d0 - C.lo, d1 - C.lo + 1);
}
/* the same for every d in [D0 - 1, D0 + W + 1] (the idle frames up to D0 - 1 simulated once) */
function fb2PBWin(S0, f0, D0, W, ph) {
  const S = { s: S0.s, nc: S0.nc }; fb2Idle(S, f0, D0 - 1, ph); const out = [];
  for (let d = D0 - 1; d <= D0 + W + 1; d++) { out.push(fb2PB(S, d, d, ph)); fb2Frame1(S, d, ph); }
  return out;
}
/* Bowser's attack flags at T6: a Body Slam or a Claw on T5 forbids that attack on T6 (fb2_route README section 4) */
/* v156 (e2e d4000001: the T6 lock was the true seed, pressed on its frame, Bowser hit on it and both neighbours: Bowser's T5 Claw had
 * left Mario at 1 HP, so T6 could not be a Claw, but the setting "not set" weighed the three T5 cases equally): Mario's HP number on
 * T6's step before its Charge (after the Peach Beam's turn) tells T5's attack when the setting is "not set": 3 = Body Slam guarded,
 * 2 = Body Slam or Claw guarded, 1 = Claw (or Fire Breath / Lightning guarded), 10 = no damage (or a revive). Read like the backup
 * T7's number (fb2OnesDigit), held FB2_T5HP_N pictures. */
const FB2_T5HP_N = 15, FB2_T5_TRUST10 = false; var FB2HP5 = { v: null, d: null, run: 0 };
function fb2T5Watch(t, present) {
  const s = typeof isRoute === 'function' && isRoute() && RT()[routeStep]; if (!s) return;
  if (s.fb5 || (s.fb14 && s.fb14 <= 4)) { if (FB2HP5.v != null || FB2HP5.run || FB2HP5.t5ko) FB2HP5 = { v: null, d: null, run: 0 }; return; }     // T5's start / a new attempt: read again
  if (s.turn !== 'fb2_k' || s.b7 || (CHG.trig && chgP().id === 'fb2')) return;     // (T6's Charge: the last steady number stands)
  // the route is on T6's step from the Peach Beam's end, before Lakilester's T5 turn and Bowser's T5 attack: the last steady number
  // before T6's Charge is the one after the attack; a steady 0 on the way is a KO (the Life Shroom revived Mario)
  const B = window.__fb2OnesTest ? { since: -1e9 } : (typeof JRT !== 'undefined' ? JRT.bar : null); if (!present || !B || !B.since || t - B.since < 6 * FRAME) return;
  const tens = window.__fb2OnesTest ? (window.__fb2TensVal != null ? window.__fb2TensVal : 0) : (typeof jrTens === 'function' ? jrTens() : 1);
  // v181: the first picture under 10 after T5's Do Nothing is Bowser's hit: its frame tells a Body Slam (+82) from a Claw (+77)
  if (tens >= JR_TENS_MIN) FB2HP5.seen10 = t;
  else if (FB2HP5.c5 != null && FB2HP5.tHit == null && FB2HP5.seen10 != null && t - FB2HP5.seen10 < 4 * FRAME && t > FB2HP5.c5 && t - FB2HP5.c5 < 8000) {
    FB2HP5.tHit = t; FB2HP5.dt = (t - FB2HP5.c5) / fb2Rate() + (typeof fb14Van === 'function' ? fb14Van('S') : 2); slog('fb2T5Hit', { dt: +FB2HP5.dt.toFixed(2), w: fb2T5HitW() }); }
  const d = tens >= JR_TENS_MIN ? 10 : fb2OnesDigit(fb2OnesMask()); if (d == null) { FB2HP5.run = 0; return; }
  if (d === FB2HP5.d) FB2HP5.run++; else { FB2HP5.d = d; FB2HP5.run = 1; }
  if (FB2HP5.run === FB2_T5HP_N) {
    if (d === 0 && !FB2HP5.t5ko) { FB2HP5.t5ko = true; slog('fb2T5Ko', { why: 'HP 0 after T5: the Life Shroom' }); }
    if (d !== 0 && d !== FB2HP5.v) { FB2HP5.v = d; slog('fb2T5Hp', { hp: d, ko: !!FB2HP5.t5ko, flags: JSON.stringify(fb2T5Flags(d)) }); } }
}
/* v167 (console 11-26 12:09 and 11:57: after the T6 dodge 20318 / 28 states, T7 at 32% on 1 frame or no beep): Bowser's T6 attack read
 * as T1-T4's (fb14_live.js fbAtkFrame: Fire Breath fills a third of the game box with saturated orange for ~2.5 s; a watched stretch with
 * none is a Body Slam / Claw): from the T6 Do Nothing confirm, on the main T7 step; the T7 states whose own T6 attack differs keep FB2_ATKW */
const FB2_ATKW = 0.01, FB2_ATK_MS = 12000;
function fb2AtkWatch(t, present) {
  const s = typeof isRoute === 'function' && isRoute() && RT()[routeStep]; if (!s || s.turn !== 'fb2_pb' || s.b8 || fb2BackupOn()) return;
  const T7 = FB2.t7; if (!T7 || !T7.states || FB2.pT == null || T7.atkSeen != null || !present || t < FB2.pT || t - FB2.pT > FB2_ATK_MS) return;
  if (typeof fbVisGrid !== 'function' || typeof FB14_FIRE === 'undefined') return;
  const A = T7.atkW || (T7.atkW = { seen: 0, run: 0, best: 0, mx: 0 });
  const g = window.__fbVisTest ? window.__fbVisTest('game') : fbVisGrid(chgGame(), 32, 24); if (!g) return;
  let nf = 0; const n = g.length / 4; for (let i = 0; i < g.length; i += 4) { const R = g[i], G = g[i + 1], B = g[i + 2]; if (R > 190 && R - G > 90 && B < 90) nf++; }
  const fs = nf / n; A.seen++; A.mx = Math.max(A.mx, fs); A.run = fs >= FB14_FIRE.px ? A.run + 1 : 0; A.best = Math.max(A.best, A.run);
  let fire = null; if (A.best >= FB14_FIRE.run) fire = true; else if (A.seen >= FB14_FIRE.seen && A.mx < FB14_FIRE.none) fire = false;
  if (fire == null) return;
  T7.atkSeen = fire; let tot = 0, keep = 0;
  for (const o of T7.states) { tot += o.w; if ((o.a.atk === 'fire') === fire) keep += o.w; else o.w *= FB2_ATKW; }
  slog('fb2T6Attack', { fire, kept: tot ? +(keep / tot).toFixed(3) : 0, states: T7.states.length, afterMs: Math.round(t - FB2.pT), fireRun: A.best, fireMax: +A.mx.toFixed(3) });
  if (!(typeof seriesHold === 'function' && seriesHold('fb2')) && typeof makePlan === 'function') { if (st.plan && st.plan.prof === 'fb2' && st.plan.tPress - performance.now() > 1500) { cancelBeeps(); st.plan = null; } makePlan(); }
}
/* T6's (slamOk, clawOk, weight) from the HP after T5 (null: not read) */
/* v179 (emulator, the 11-27 T5 states at 10 HP, as the console's v136 note): Body Slam leaves 2 unguarded, 3 guarded; Claw 1 and
 * poisoned unguarded (he dies at T7's start whatever T6 does), 3 guarded; Fire Breath guarded leaves 1 (no poison). The runner
 * guards: 3 = Body Slam or Claw (Bowser's odds 1/4 each: half / half), 2 = Body Slam, 1 = Fire Breath (v156 read a 3 as a Body
 * Slam only, and its T6 "Claw" timing was a Fire Breath's: FB2_DNDELTA). [slam allowed on T6, claw allowed on T6, weight] */
/* v181: the hit's frame after T5's Do Nothing (emulator, c7000003's T5 guarded: Body Slam +82, Claw +77, Fire Breath +70 on Mario's HP;
 * FB2_T5HIT.lag: the first picture under 10 after that, calibrated live), weighed as N(dt; mean, sd) and held to [lo, 1 - lo] */
// calibrated live (e2e b7000002 v181: a guarded Fire Breath hit on +70, the page read 72.7): lag 2.7; held to 20 / 80 (one sample)
const FB2_T5HIT = { slam: 82, claw: 77, lag: 2.7, sd: 2.5, lo: 0.2, on: true };
function fb2T5HitW() { const H = FB2_T5HIT; if (!H.on || FB2HP5.dt == null) return null; const g = m => Math.exp(-0.5 * Math.pow((FB2HP5.dt - m - H.lag) / H.sd, 2));
  const a = g(H.slam), b = g(H.claw); if (!(a + b > 1e-6)) return null; return Math.min(1 - H.lo, Math.max(H.lo, a / (a + b))); }
function fb2T5Flags(hp) {
  if (hp === 3) { const w = fb2T5HitW(); return w == null ? [[false, true, 0.5], [true, false, 0.5]] : [[false, true, w], [true, false, 1 - w]]; }
  if (hp === 2) return [[false, true, 1]];
  if (hp === 1) return [[true, true, 1]];
  if (hp === 10) return [[true, true, 1]];
  return null;
}
function fb2Flags() { if (fb2BackupOn() && FB2B.atk6) { const A = FB2B.atk6, out = []; for (const [a, w] of Object.entries(A)) if (w > 0) out.push([a !== 'slam', a !== 'claw', w]); if (out.length) return out; }     // v114: the backup T7: Bowser's T6 attack (the hit's) forbids that one
  const v = ($('s-fb2t5') || {}).value || 'any'; if (v === 'any' && FB2HP5.v != null && (FB2HP5.v !== 10 || FB2_T5_TRUST10)) { const f5 = fb2T5Flags(FB2HP5.v); if (f5) return f5; }     // v162: a 10 is not trusted     // v156
  return v === 'slam' ? [[false, true, 1]] : v === 'claw' ? [[true, false, 1]] : v === 'fire' ? [[true, true, 1]] : [[true, true, 1 / 3], [false, true, 1 / 3], [true, false, 1 / 3]]; }
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
/* v120 (console 18:47, the backup T7's Charge: 6.7 s to lock, then no edge): the backup T7 Charge was searched on the T6
 * candidates (the Peach Beam carry, FB14.t6), which held no T7 seed. Between the T6 and T7 Charges the RNG runs 56.9 steps a
 * second plus 99-117 (3 console pairs, Nov 17-19: 1329 / 21.29 s, 1345 / 21.90 s, 1344 / 21.67 s; the v119 gap rule, its
 * 98-138 family): the T6 lock's seed and trigger are kept, and the backup T7 searches FB2_T7_OFF steps around that first. */
const FB2_T7_OFF = [40, 180], FB2_T7_SEC = [8, 60], FB2_T7_FIT = [655, 31.9], FB2_T7_FITPAD = 80;
var FB2_T6 = null;
function fb2T7CandsFrom(seed, sec) {
  if (!(sec >= FB2_T7_SEC[0] && sec <= FB2_T7_SEC[1])) return null;
  // v157 (console 11-26 10:13: the backup T7 seed 1451 steps after T6's at 24.92 s, under the window's 1458): 21 console T6 -> T7 pairs
  // (Nov 20-26) fit 655 + 31.9 s within +-9.4 (the RNG runs slower in a longer wait); the fit +-FB2_T7_FITPAD, with the old window
  const f = FB2_T7_FIT[0] + FB2_T7_FIT[1] * sec;
  const lo = Math.max(1, Math.min(Math.round(f - FB2_T7_FITPAD), Math.round(FBH_RATE * sec + FB2_T7_OFF[0]))), hi = Math.max(Math.round(f + FB2_T7_FITPAD), Math.round(FBH_RATE * sec + FB2_T7_OFF[1])), out = [];
  let x = seed >>> 0; for (let i = 0; i < lo; i++) x = fbAdv(x);
  for (let n = lo; n <= hi; n++) { out.push(x >>> 0); x = fbAdv(x); }
  return out;
}
function fb2T7Cands() {
  if (!FB2_T6 || !CHG.trig) return null;
  const sec = (CHG.trig.t - FB2_T6.t) / 1000, out = fb2T7CandsFrom(FB2_T6.seed, sec);
  slog('fb2T7Cands', { from: (FB2_T6.seed >>> 0).toString(16).padStart(8, '0'), sec: +sec.toFixed(2), cands: out ? out.length : 0 });
  return out;
}
/* the lock: hypotheses from the worker's (pattern, q) pairs */
function fb2Lock(res) {
  const P = fb2Patterns(5), hy = res.fb2 && res.fb2.hyps; if (!hy || !hy.pairs.length) { FB2.why = 'no hypotheses'; fb2Show(); return; }
  const seen = new Map(), H = [];
  for (const [p, q, sc, s48, nc48] of hy.pairs) for (const ph of P.list[p].ph) {
    const key = s48 + ':' + nc48 + ':' + ph[0] + ':' + ph[1]; if (seen.has(key)) continue;
    const h = { s: s48 >>> 0, nc: nc48 + 13, ph, w: (ph[0] - ph[1]) % 10 === 0 ? 1 : FB2_PH5_W }; seen.set(key, h); H.push(h);
  }
  const wsum = H.reduce((a, h) => a + h.w, 0); H.forEach(h => { h.w /= wsum; });
  const Hk = H.length > FB2_MAXH ? H.filter((h, i) => i % Math.ceil(H.length / FB2_MAXH) === 0) : H;   // too many: an even sample
  { const ws = Hk.reduce((a, h) => a + h.w, 0); Hk.forEach(h => { h.w /= ws; }); }
  Object.assign(FB2, { on: true, hyps: Hk, pairs: hy.pairs.length, best: hy.best, kObs: null, plan: null, plans: [], t7: null, taps: [], vis: [], visFrom: null, tLock: performance.now() });
  if (!fb2BackupOn() && res.top && res.top[0] && typeof CHG !== 'undefined' && CHG.trig) FB2_T6 = { seed: res.top[0].seed >>> 0, t: CHG.trig.t };     // v120: the backup T7's search starts from it
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
  const t0 = performance.now(), H = fb2TopHyps(), b7 = fb2BackupOn(), F = fb2Flags(), now = performance.now(), bias = fb2Bias();
  // v156: Close Call only works with Mario in Danger: at 10 HP after T5 (Bowser's T5 attack missed, or a KO the Life Shroom revived)
  // no T6 Do Nothing frame can dodge: no beep, the backup ending to come
  // v162 (console 11-26 11:07: the read stayed on 10 - Mario was at 3 after a guarded Body Slam - and this said "no Danger"; the runner's
  // Close Call worked unbeeped): a 10 is not trusted (a missed change reads the same); off unless FB2_T5_TRUST10
  if (!b7 && FB2HP5.v === 10 && FB2_T5_TRUST10) { const nl = { none: 'no Danger', lever: 'nothing' }; if (kAt != null) return nl; if (FB2.plan && FB2.plan.none === 'no Danger') return true;
    FB2.plan = nl; cancelBeeps(); if (st.plan && st.plan.prof === 'fb2') st.plan = null; slog('fb2NoEdge', { why: 'Mario at 10 HP after T5: no Danger, no Close Call' });
    st.msg = 'T6: Mario is at 10 HP (no Danger), so Close Call cannot make Bowser miss on any frame. Do Nothing whenever you like; the backup ending (T7 Charge, Do Nothing on its beep) follows.'; fb2Show(); if (typeof render === 'function') render(); return true; }
  // v102 (console log fb0449 T6: planned 1.6 s ahead, its 3 beeps 300 ms apart: "the beeps seemed to glitch by speeding up"): the
  // T6 countdown is the runner's own (Settings: Beeps, Beep spacing, Lead time; playBeeps, earliestPress), never squeezed: the
  // first frame is the first whose press time leaves the whole countdown ahead, as T1-T4 and T7
  let kFirst = kAt; if (kAt == null) { kFirst = Math.max(FB2_PMIN, Math.ceil(fb2Pic(now + num('vlag')))); for (let i = 0; i < 900 && fb2DnPressT(kFirst) < earliestPress(now); i++) kFirst++; }
  const W = Math.max(10, Math.round(Math.max(1, num('zwwin')) * 1000 / fb2Rate())), KL = kAt == null && !window.__noKeyLater ? Math.round(FB2_KEY_S * 1000 / fb2Rate()) : 0, P0 = kFirst - 4, P1 = kFirst + W + KL + 4, rows = [];
  for (const h of H) for (const [so, co, wf] of F) {
    const S = { s: h.s, nc: h.nc }; fb2Idle(S, 61, P0 + FB2_DNAI, h.ph);
    const L = new Uint8Array(P1 - P0 + 1);
    for (let P = P0; P <= P1; P++) { const r = b7 ? fb2AI7(S, P + FB2_DNAI, h.ph, so, co) : fb2AI(S, P + FB2_DNAI, h.ph, so, co, true); L[P - P0] = (b7 ? r.ok7 : r.lucky) ? 1 : 0; fb2Frame1(S, P + FB2_DNAI, h.ph); }
    rows.push({ h, w: h.w * wf, L });
  }
  const luck = (row, P) => row.L[Math.max(0, Math.min(P1 - P0, P - P0))];
  const tot = rows.reduce((a, r) => a + r.w, 0);
  const pcc = k => { let v = 0; for (const r of rows) for (const [l, wl] of FB2_LAGS) for (const [d, q] of PRESS_ERR) v += r.w * wl * q * luck(r, k + d - l); return v / tot; };
  const ppk = k => { let v = 0; for (const r of rows) for (const [l, wl] of FB2_LAGS) v += r.w * wl * luck(r, k - l); return v / tot; };
  const a = kFirst - 1, b0 = kFirst + W + 1, sh = []; for (let k = a; k <= b0; k++) sh.push(k >= kFirst && k <= kFirst + W ? ppk(k) : 0);
  let pk = ppPick(sh, null, a, b0, kFirst, W, pcc, 'safe3'); pk = ppWiden(pk, sh, a, b0, kFirst, W, 'fb2dn');     // v139
  let k = pk.target; if (k == null || !(k >= kFirst)) { k = kFirst; for (let x = kFirst; x <= kFirst + W; x++) if (pcc(x) > pcc(k)) k = x; }
  // v124 (console 11:52: T6 beeped a 1-frame window at 47%, the Close Call missed; the backup T7 at 52%, the wave): on the Strategies
  // screen the Do Nothing can wait, so a plan under KEY_AIM looks FB2_KEY_S further for the first frame at KEY_AIM (else one KEY_GAIN likelier)
  let b = b0;
  if (KL && pcc(k) < KEY_AIM) { const p0 = pcc(k); let hit = null, best = null; for (let x = kFirst + W + 1; x <= kFirst + W + KL; x++) { if (ppk(x) < 0.5) continue; const v = pcc(x); if (v >= KEY_AIM) { hit = x; break; } if (best == null || v > pcc(best)) best = x; }
    const x = hit != null ? hit : best != null && pcc(best) >= p0 + KEY_GAIN ? best : null;
    if (x != null) { b = x + 2; for (let c = b0 + 1; c <= b; c++) sh.push(ppk(c)); let s0 = x, e0 = x; while (s0 - 1 >= kFirst && ppk(s0 - 1) >= 0.5) s0--; while (ppk(e0 + 1) >= 0.5 && e0 + 1 <= b) e0++;
      slog('keyLater', { prof: b7 ? 'fb2b7' : 'fb2', from: k, to: x, p0: +p0.toFixed(3), p1: +pcc(x).toFixed(3), waitF: x - k }); k = x; pk = { ok: true, target: x, run: { start: s0, end: e0, length: e0 - s0 + 1 } }; } }
  const pl = { k, p: pcc(k), pp: ppk(k), win: pk.ok ? pk.run.length : 0, blind: fb2Txt().b, kFirst, W, bias: +bias.toFixed(2), lever: 'nothing', ms: Math.round(performance.now() - t0), states: rows.length };
  pl.tPress = fb2DnPressT(k);
  // the edge rule (zwedge), as every plan: a Close Call share under it is no plan (Do Nothing whenever you like)
  // v122 (console 21:08, the backup T7: best 28% with a perfect press against ~8% blind, no beeps, Do Nothing pressed blind): the
  // edge is measured against the blind odds: beeps when the plan is twice blind and 15 points over it (the main T6, 30% blind,
  // keeps zwedge), and its realistic chance still beats blind
  if (!(pl.pp >= fb2Edge(fb2Txt().b) && pl.p > fb2Txt().b)) { const nl = { none: 'no Do Nothing frame gives ' + fb2Txt().goal + ' for enough of the states (best ' + Math.round(100 * (pl.pp || 0)) + '% with a perfect press)', edge: true, blind: fb2Txt().b, kFirst, pp: pl.pp, p: pl.p, lever: 'nothing' }; if (kAt != null) return nl; cancelBeeps(); FB2.plan = nl; if (st.plan && st.plan.prof === 'fb2') st.plan = null; st.msg = 'No edge: ' + nl.none + '. Do Nothing whenever you like (' + fb2Txt().blind + ').'; slog('fb2PlanP', { none: 'edge', pp: +(pl.pp || 0).toFixed(3), kFirst }); fb2Show(); if (typeof render === 'function') render(); return nl; }     // v99: the No edge text at once (v98 left it to makePlan, which the T6 step never reached)
  if (kAt != null) return pl;
  cancelBeeps(); playBeeps(pl.tPress);
  FB2.plan = pl; FB2.plans = (FB2.plans || []).concat([Object.assign({ tMade: now }, pl)]); slog('fb2PlanP', pl);
  // v99: early (made on the lock, before the Strategies screen opens): the screen-lost rule (planScreenLost) waits for that
  // v109 (console fb0709 T6, clip fb1153: "no track was shown but it beeped"): the plan carried no frames (tab: []), so the strip
  // drew nothing; now the perfect-press share per frame (>= 0.5 works), on a clock whose frame k reaches the now-line at its press
  const r6 = fb2Rate(), w6 = pk.ok ? pk.run : { start: k, end: k, length: 1 };
  st.msg = null; st.plan = { tMade: now, w: { start: w6.start, end: w6.end, length: w6.length }, target: k, tPress: pl.tPress, tLast: pl.tPress - (k - 0.5 + num('off')) * r6, rate: r6, carried: true, early: true, from: kFirst, to: Math.max(kFirst + W, b - 1), first: a, prof: 'fb2', tab: sh.map(v => v >= Math.min(0.5, 0.8 * Math.max(...sh))), tab4: null, chance: sh.map((v, i) => (a + i >= kFirst && a + i <= b ? pcc(a + i) : 0)), mix: { p: pl.p, pp: pl.pp, win: pl.win, doubt: 0, groups: rows.length, zw: true } };
  fb2Show(); if (typeof render === 'function') render(); return pl;
}
/* the Do Nothing confirm (the Strategies box closing on T6's step): its frame into the states, the press into the learned
 * correction, the route on to T7 */
function fb2Confirm(tObs) {
  if (!CHG.trig) { slog('fb2ConfirmNoTrig', { at: Math.round(tObs) }); if (typeof FB2HP5 !== 'undefined' && !fb2BackupOn()) { FB2HP5.c5 = tObs; FB2HP5.tHit = null; FB2HP5.dt = null; } return; }     // v181: T5's Do Nothing, for the hit's time
  const c = fb2Pic(tObs) - (typeof fb14Van === 'function' ? fb14Van('S') : -1.4), P = FB2.plan && FB2.plan.k != null ? FB2.plan : null;
  // v109 (console fb0722 T5: a Strategies-like close 87 frames after a false trigger moved the route to T7): without a T6 lock, a
  // close before FB2_PMIN - 20 frames after the trigger is not the Do Nothing (console Do Nothing confirms: 149-392)
  if (!FB2.on && c < FB2_PMIN - 20) { slog('fb2ConfirmTooEarly', { c: +c.toFixed(2) }); return; }
  slog('fb2Confirm', { c: +c.toFixed(2), planned: P ? P.k : null, err: P ? +(c - P.k).toFixed(2) : null });
  if (P && Math.abs(c - P.k) <= 5 && typeof fb14PressAdd === 'function') { const L = fb14PressAdd(c - P.k - (P.bias || 0)); slog('fb2PressBias', { n: L.length, bias: +fb2Bias().toFixed(2) }); const SP = st.plan && st.plan.prof === 'fb2' && st.plan.target === P.k ? st.plan : null, wk = typeof pressShow === 'function' ? pressShow(SP, c, 'Final Bowser T6, Do Nothing') : null; if (typeof leverPressNote === 'function') leverPressNote('Final Bowser T6, Do Nothing', c - P.k, 'fb14', wk); }
  FB2.pObs = c; FB2.pT = tObs; FB2.hpw = null; cancelBeeps(); if (st.plan && st.plan.prof === 'fb2') st.plan = null;
  // v146 (console 11-24 20:56: T6's Charge did not lock, Bowser's Fire Breath took the Life Shroom, and the page never knew: the HP watch
  // and the outcome hang on T7's states): without a lock T6's outcome is still read off the HP, on no states (a hit -> the backup ending)
  if (!FB2.on && !FB2.t7) { FB2.t7 = { states: [], pLucky: 0, noLock: true }; slog('fb2NoLockWatch', { at: Math.round(tObs) }); }
  if (typeof isRoute === 'function' && isRoute() && RT()[routeStep] && RT()[routeStep].turn === 'fb2_k') { const i = RT().findIndex((x, j) => j > routeStep && x.turn === 'fb2_pb'); /* v114: the next one (T7 main / T8 backup) */ if (i >= 0) { slog('fb2StepByConfirm', { from: routeStep, to: i }); setStep(i); } }
  if (FB2.on) fb2SetP(c);
}
/* v125 (console 13:37: a T6 lock on 2370 hypotheses - each T6 plan took 2.1 s, its own press time passed before it was out ("beepsNoFit",
 * "target passed"), and the confirm's states, 60866 of them, held the page 1.5 s, so the HP watch saw no picture before the Close Call
 * test and the hit - Mario's Life Shroom - was never read): the T6 / backup T7 Do Nothing plans run on FB2_HMAX hypotheses sampled by weight (the confirm's states keep every one, faster) */
const FB2_HMAX = 400;
function fb2TopHyps() {     // a systematic sample by weight (each kept one standing for an equal share), so the odds stay those of the whole set
  const H = FB2.hyps || []; if (H.length <= FB2_HMAX) return H;
  if (FB2.topH && FB2.topH.src === H) return FB2.topH.list;
  const tot = H.reduce((a, h) => a + h.w, 0), step = tot / FB2_HMAX, out = []; let acc = 0, next = step / 2;
  for (const h of H) { acc += h.w; while (acc >= next && out.length < FB2_HMAX) { out.push(Object.assign({}, h, { w: step })); next += step; } }
  FB2.topH = { src: H, list: out }; return out;
}
function fb2SetP(c) {
  const b7 = fb2BackupOn(), F = fb2Flags(), out = [], shifts = typeof FB14_SHIFTS_S !== 'undefined' ? FB14_SHIFTS_S : [[0, 1]], F0 = Math.round(c);
  // every hypothesis (not fb2TopHyps' sample: a seed dropped here is gone for T7), its idle frames run once up to the earliest P and
  // stepped on from there (they were re-run from frame 61 for every lag / shift / flag: 60866 states held the page 1.5 s)
  const combos = []; for (const [l, wl] of FB2_LAGS) for (const [d, wd] of shifts) combos.push({ P: F0 + d - l, l, w: wl * wd });
  combos.sort((x, y) => x.P - y.P);
  for (const h of FB2.hyps) { const S = { s: h.s, nc: h.nc, coins: [] }; let at = 61;
    for (const cb of combos) { fb2Idle(S, at, cb.P + FB2_DNAI, h.ph); at = Math.max(at, cb.P + FB2_DNAI);
      for (const [so, co, wf] of F) { const a = b7 ? fb2AI7(S, cb.P + FB2_DNAI, h.ph, so, co) : fb2AI(S, cb.P + FB2_DNAI, h.ph, so, co, true), w = h.w * cb.w * wf;
        if (b7 && (a.lucky || a.atk === 'fire' || a.atk === 'ko')) {     // v164: Fire Breath guarded carries (unguarded: a KO); v181: the Lightning too
          out.push({ h, l: cb.l, P: cb.P, a, w: w * (1 - FB2B_GUARD) }); out.push({ h, l: cb.l, P: cb.P, a: fb2AI7(S, cb.P + FB2_DNAI, h.ph, so, co, true), w: w * FB2B_GUARD }); }     // v134: guarded or not
        else out.push({ h, l: cb.l, P: cb.P, a, w }); } } }
  const tot = out.reduce((x, o) => x + o.w, 0), luck = out.reduce((x, o) => x + ((b7 ? o.a.ok7 : o.a.lucky) ? o.w : 0), 0) / tot;
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
      if (!a || !a.lucky) continue; const D0 = a.menu + 45, b = fb2PBWin(a.S, a.T + 1, D0, 30, r.h.ph).map(x => (x >= fb2Goal() ? 1 : 0));
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
  fb2HpWatch(t, present); fb2B7Watch(t, present);
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
/* v123 (console 09:05, the backup T8 Power Bounce: "still no lock for the t8 bounce backup"; T7's Do Nothing beeped at 33%, pLucky
 * 0.21, then 13 s of "No edge" at doubt 0.96): the backup T7's outcome is not read (no HP watch there), so the wave / Star Rod
 * share stayed in the doubt. The T8 Power Bounce is only the route when Bowser used a Body Slam or a Claw (Mario in Danger, the
 * charges kept): on the T8 step the page plans on that branch, and says so. */
/* v123, withdrawn the same day (clip + log 09:26-09:28: Bowser's T7 Claw, Mario 1 HP, the T8 plan 69% at doubt 0.31 on 13 states
 * that gave 5 bounces on the pressed frame, ~0.4 frame early inside the 3-frame window; the bounce stopped at 4): the doubt the
 * unread T7 branch kept was the only thing between a wrong T8 state set and a beep at ~100%. Kept for the status line only. */
function fb2T8Assume() { return typeof fb2BackupOn === 'function' && fb2BackupOn() && typeof RT === 'function' && !!(RT()[routeStep] || {}).b8; }
function fb2Prune(upto) {
  const T7 = FB2.t7; if (!T7) return [];
  // v110 (hh, log v109b: the T6 Close Call dodged, then about 55 T7 replans at doubt 1 and no plan): the bar stays up through
  // Bowser's T6 turn after the Do Nothing (24 s there) and the coin seen in it (3 shines) fits no state: the turn after the Close
  // Call test is not in the model's coin (or its flashes read as shines). The coin counts from the T6 outcome read (the dodge seen,
  // 16 s after the confirm there), else FB2_T7_COIN_MS after the confirm; replayed: 93 states, doubt 0.02-0.37
  const okC = typeof CHG !== 'undefined' && CHG.trig, cut = okC && T7.outT != null ? fb2Pic(T7.outT) : okC && FB2.pT != null ? fb2Pic(FB2.pT + (fb2BackupOn() ? 0 : FB2_T7_COIN_MS)) : -1e9;     // v114: the backup T7's turn is modelled to the T8 menu (fb2AI7): its coin counts from the confirm
  const vis = FB2.vis.concat(FB2.visFrom != null ? [[FB2.visFrom, upto - 4]] : []).map(([a, b]) => [Math.max(a, cut), Math.min(b, upto - 4)]).filter(([a, b]) => b > a), taps = FB2.taps.filter(x => x < upto && x >= cut);
  const Wd = 5.5 * (ZW_RHO + ZW_FALSE), Lm = (1 - FB_PMISS) / Wd, Lmiss = FB_PMISS, Lf = ZW_FALSE / (ZW_RHO + ZW_FALSE);
  const near = (x, f) => x - f >= -2 && x - f <= 3.5, out = []; let mx = 0, tot0 = 0;
  for (const o of T7.states) {
    tot0 += o.w;
    // v122: each state's idle run is kept and stepped on from where the last call stopped (it was re-run from the T7 menu for
    // every state on every replan: 8454 states held the page ~10 s, console 21:12)
    const uf = Math.floor(upto); let C = o._idle; if (!C || C.f > uf || C.ph !== o.h.ph) C = o._idle = { f: o.a.T + 1, ph: o.h.ph, S: { s: o.a.S.s, nc: o.a.S.nc, coins: o.a.S.coins.slice() } };
    if (uf > C.f) { fb2Idle(C.S, C.f, uf, o.h.ph); C.f = uf; } const S = C.S;
    const sh = S.coins.filter(c => c[1]).map(c => c[0] + o.l); let lw = 1, err = 0;
    for (const x of taps) if (sh.some(f => near(x, f))) lw *= Lm; else { lw *= Lf; err++; }
    for (const f of sh) if (vis.some(([a, b]) => f >= a && f <= b) && !taps.some(x => near(x, f))) { lw *= Lmiss; err++; }
    if (err > FB_MAXERR) continue;
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
    if (W.pre.length < 3 && t < FB2.pT + 2100) { W.pre.push(v); return; }     // v125: 2.1 s (the Close Call test is on P + 68, 2.3 s; a slow confirm left none in 1.5 s)
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
/* v134: the backup T7's hit read off the HP number. Mario is at 10 after the revive; Body Slam leaves 2 (guarded 3), Claw 1
 * (guarded 2), the Draining Shockwave 4. The ones digit (320-space x 68..76, y 27..36, beside JR_TENS; 8 x 9 white cells, the
 * templates from the 20:33 clip's HP countdown 10 -> 0, the closest two digits 13 cells apart) once the tens is blank and the digit
 * has held FB2_B7HP_N pictures: each carried state whose attack and guard give another number keeps FB2_B7HP_W of its weight.
 * Also: no change for FB2_B7HP_SAME ms = the shield (v133's message: the HP watch is off on the backup leg, so it never came). */
const FB2_ONES = [68, 27, 76, 36], FB2_ONES_T = {"0": "000000000011110000111110011111100110011001100010111001100111111000111100", "9": "011111001111111011000110111001001111110000111100000110000011100000111000", "8": "011111001111110011000110111011100111110011111110111001111111111001111100", "7": "001111100111111111100110010001100000110000011000000110000001100000111000", "6": "000110000011100000110000011110000111110011100110110001100111111001111100", "5": "000111100111111001110000011111001111111011100111000011100001110000111000", "4": "000110000011100001110000011110001110110011001110111111101111110000011000", "3": "001110000111111011111110000011000001100000001100010011101111111001111100", "2": "000110000111110011111110111111100001110000111000011100001111111011111110", "1": "000011000011110001111100001111000001100000011000000110000011100000110000"};
// v136 (the runner: a guarded Body Slam and a guarded Claw both leave 3, a guarded Fire Breath 1 - v135's table was a guess from code
// comments and dropped the right states after a guarded Claw): the HP is logged, it weighs nothing (FB2_B7HP_ON) until measured
const FB2_B7HP_ON = false, FB2_B7HP_N = 20, FB2_B7HP_W = 0.02, FB2_B7HP_SAME = 12000, FB2_B7HP_EXP = { slam: [2, 3], claw: [1, 3], fire: [0, 1], ko: [0, 1] };     // v179: a guarded Claw leaves 3 (emulator)
function fb2OnesMask() {
  if (window.__fb2OnesTest) return window.__fb2OnesTest();     // (tests: a mask string)
  const [SX, OX, SY, OY] = chgMap(), [x0, y0, x1, y1] = FB2_ONES, g = sample({ x: (OX + x0 * SX) / 1280, y: (OY + y0 * SY) / 720, w: (x1 - x0) * SX / 1280, h: (y1 - y0) * SY / 720 }, 8, 9);
  let m = ''; for (let i = 0; i < g.length; i += 4) m += g[i] > 150 && g[i + 1] > 150 && g[i + 2] > 150 ? '1' : '0'; return m;
}
/* v166 (console 11-26 11:07 and 11:57: Mario at 3/10 after T5's guarded Body Slam for 3 s, the read stayed on 10): the console's 3 is 9-10
 * pixels off the stored one (the next digit 19 off), past the cut of 8: FB2_ONES_ALT holds that 3 (11:57 clip), and the cut is 10 with a
 * margin of 6 (each digit's best distance over its references; the runner-up is the best other digit) */
const FB2_ONES_ALT = { 3: ['011111001111110011011100000110000001100000001100111011101111111001111100', '011111001111110011111100000110000001100000001100111011101111111001111100'] }, FB2_ONES_CUT = 10, FB2_ONES_GAP = 6;
function fb2OnesDigit(m) {
  const dist = T => { let h = 0; for (let i = 0; i < T.length; i++) if (T[i] !== m[i]) h++; return h; };
  let best = null, b = 99, b2 = 99;
  for (const d in FB2_ONES_T) { let h = dist(FB2_ONES_T[d]); for (const A of FB2_ONES_ALT[d] || []) h = Math.min(h, dist(A)); if (h < b) { b2 = b; b = h; best = +d; } else if (h < b2) b2 = h; }
  return b <= FB2_ONES_CUT && b2 - b >= FB2_ONES_GAP ? best : null;
}
function fb2B7Watch(t, present) {
  if (!fb2BackupOn() || fb2Leg() === 'main' || FB2.pT == null) return; const T7 = FB2.t7; if (!T7 || T7.hpRead != null || T7.shield) return;     // (the T7 confirm moves the route to T8's step)
  const B = window.__fb2OnesTest ? { since: -1e9 } : (typeof JRT !== 'undefined' ? JRT.bar : null); if (!present || !B || !B.since || t - B.since < 6 * FRAME) return;
  const W = T7.b7w || (T7.b7w = { d: null, run: 0, ten: 0, pT: FB2.pT }); if (W.pT !== FB2.pT) Object.assign(W, { d: null, run: 0, ten: 0, pT: FB2.pT });
  const tens = window.__fb2OnesTest ? (window.__fb2TensVal != null ? window.__fb2TensVal : 0) : (typeof jrTens === 'function' ? jrTens() : 1);
  if (tens >= JR_TENS_MIN) { W.ten++; W.d = null; W.run = 0; if (t - FB2.pT > FB2_B7HP_SAME && W.ten > 60) { T7.hpRead = 10; fb2Outcome('dodge', { why: 'HP 10 held', afterMs: Math.round(t - FB2.pT) }); } return; }
  const d = fb2OnesDigit(fb2OnesMask()); if (d == null) { W.run = 0; return; }
  if (d === W.d) W.run++; else { W.d = d; W.run = 1; } if (W.run < FB2_B7HP_N || t < FB2.pT + 1500) return;
  T7.hpRead = d; let keep = 0, tot = 0;
  for (const o of T7.states) { const e = FB2_B7HP_EXP[o.a.atk], want = e ? e[o.a.gd ? 1 : 0] : null; tot += o.w; if (want === d) keep += o.w; else if (FB2_B7HP_ON) o.w *= FB2_B7HP_W; }
  slog('fb2B7Hp', { hp: d, kept: tot ? +(keep / tot).toFixed(3) : 0, states: T7.states.length, afterMs: Math.round(t - FB2.pT), means: d === 3 ? 'Body Slam guarded' : d === 2 ? 'Body Slam, or Claw guarded' : d === 1 ? 'Claw, Fire Breath or Lightning (v155: all a success; v164 / v181: Claw, guarded Fire Breath and guarded Lightning carry to T8)' : d === 4 ? 'the wave' : 'off the model' });
  if (FB2_B7HP_ON && (d === 4 || !(d >= 1 && d <= 3))) { st.msg = 'T7: HP ' + d + ' after Bowser\'s attack (' + (d === 4 ? 'the wave: the route is off' : 'not a Body Slam / Claw') + '). T8\'s beep, if any, is off the model.'; }
  fb2Show(); if (typeof render === 'function') render();
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
  // v133: on the backup T7 no HP change is Bowser's shield (the Star Rod recast: no attack); the carried states are Body Slam / Claw only,
  // so T8 has no modelled states after it (no beep: the shield's draws to the T8 menu are not measured)
  if (o === 'dodge' && fb2BackupOn() && fb2Leg() !== 'main') { T7.shield = true; T7.states = []; slog('fb2Shield', { why: 'no HP change on the backup T7: the shield (a failure for the route); T8 not modelled' }); st.msg = 'Bowser shielded on T7: the route needs a Body Slam or Claw there (the shield fails it). T8 is not modelled after the shield: no beep.'; }
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
  if (!S.length || S.doubt >= 0.5) { st.msg = 'No edge: the FB2 states the page kept do not fit what it saw in Bowser\'s turn (the coin' + (fb2BackupOn() ? ', or not a Body Slam / Claw / guarded Fire Breath or Lightning' : ', or the popup frame') + '). Press Power Bounce normally.'; FB2.t7.plan = { none: 'no state fits' }; { const dq = S.doubt != null ? Math.round(S.doubt * 20) : null; if (FB2.t7.nsLogged !== dq) { FB2.t7.nsLogged = dq; slog('fb2NoEdge', { doubt: S.doubt != null ? +S.doubt.toFixed(3) : null, states: S.length }); } }     /* v123: logged when the doubt moves 5 points (console 09:05: 314 lines in 5 s) */ fb2Show(); render(); return true; }
  const tot = S.reduce((a, o) => a + o.w, 0), W = Math.max(0, Math.round(Math.max(1, num('zwwin')) * 1000 / fb2Rate()));
  let from = Math.ceil(cNow + num('lead') * 1000 / fb2Rate() + 1);
  if (cScr == null) for (let i = 0; i < 300 && fb2PressT(from) < earliestPress(now); i++) from++;   // every beep still ahead
  const s7 = new Array(W + 1).fill(0), s6 = new Array(W + 1).fill(0);
  const e7 = new Array(W + 3).fill(0), e6 = new Array(W + 3).fill(0), t0 = performance.now();
  // v122 (console 21:12: 8454 states after the T6 dodge, each replan ~10 s with the page frozen, the capture restarted twice and
  // the coins that narrow the states were never seen): the heaviest FB2_T7_MAXS states are planned on (the rest count as no 7,
  // as the background does), and their Power Bounce windows are worked out FB2_T7_BUDGET ms per replan, so the capture keeps running
  const SP = S.length > FB2_T7_MAXS ? S.slice().sort((x, y) => y.w - x.w).slice(0, FB2_T7_MAXS) : S;
  if (cScr == null) { const tb = performance.now(); let left = 0;
    for (const o of SP) { if (fb2PBHas(o, from - 1 - o.l, from + W + 1 - o.l)) continue; if (performance.now() - tb > FB2_T7_BUDGET) { left++; continue; } fb2PBRow(o, from - 1 - o.l, from + W + 1 - o.l); }
    if (left) { if (st.plan && st.plan.prof === 'fb2') { st.plan = null; cancelBeeps(); } FB2.t7.plan = { none: 'working' }; st.msg = TN + ' Power Bounce: working out the bounces for ' + SP.length + ' seeds (' + Math.round(100 * (1 - left / SP.length)) + '%)'; if (FB2.t7.workLogged !== true) { FB2.t7.workLogged = true; slog('fb2T7Working', { states: S.length, planned: SP.length, left }); } fb2Show(); render(); return true; } }
  for (const o of SP) { const b = fb2PBRow(o, from - 1 - o.l, from + W + 1 - o.l);
    for (let k = 0; k <= W; k++) for (const [d, q] of PRESS_ERR) { s7[k] += o.w * q * (b[k + 1 + d] >= G ? 1 : 0); s6[k] += o.w * q * (b[k + 1 + d] >= G - 1 ? 1 : 0); }
    for (let i = 0; i < W + 3; i++) { if (b[i] >= G) e7[i] += o.w / tot; if (b[i] >= G - 1) e6[i] += o.w / tot; } }
  FB2.t7.planMs = Math.round(performance.now() - t0);
  // v83, the perfect press: the 7-bounce share on each frame itself (no spread), the centre of the widest run of frames
  // that give 7 for the states (ppPick); with no such frame, the best 7 frame as before. Spread-weighted p7 / p6 logged.
  let k = 0; for (let i = 1; i <= W; i++) if (s7[i] + 0.1 * s6[i] > s7[k] + 0.1 * s6[k] + 1e-12) k = i;
  const pk = ppWiden(ppPick(e7, e6, from - 1, from + W + 1, from, W, x => (s7[x - from] || 0) / tot, 'safe3'), e7, from - 1, from + W + 1, from, W, 'fb2pb'); if (pk.ok) k = pk.target - from;     // v139: ppWiden
  const d = from + k, dz = S.doubt || 0, plan = { d, p7: (1 - dz) * s7[k] / tot, p6: (1 - dz) * s6[k] / tot, pp7: (1 - dz) * e7[k + 1], pp6: (1 - dz) * e6[k + 1], win: pk.ok ? pk.run.length : 0, doubt: +dz.toFixed(3), states: S.length, planned: SP.length, tPress: fb2PressT(d) };   // the background's share counts as no 7 (blind 7 is ~7%)
  // v95 (log 906bfb29 T7: p7 0, p6 0, win 0 at doubt 0.44 on 3 states, and the countdown played; the runner got 3): the
  // page's edge rule as every other plan (zwChoose): beeps only when the perfect-press 7 share, the background counted as
  // no 7, reaches Settings > Best chance (zwedge). Below it: "No edge", no countdown.
  if (!(plan.pp7 >= num('zwedge'))) {
    plan.none = 'edge'; FB2.t7.plan = plan; if (cScr != null) return plan;
    const was = st.plan && st.plan.prof === 'fb2'; if (was || FB2.t7.edgeLogged !== d) { slog('fb2NoEdge', { why: 'edge', d, ms: FB2.t7.planMs, p7: +plan.p7.toFixed(3), pp7: +plan.pp7.toFixed(3), p6: +plan.p6.toFixed(3), win: plan.win, doubt: plan.doubt, states: plan.states }); FB2.t7.edgeLogged = d; }
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
    st.msg = null; st.plan = { tMade: now, w: { start: w7.start, end: w7.end, length: w7.length }, target: d, tPress: plan.tPress, tLast: plan.tPress - (d - 0.5 + num('off')) * r7, rate: r7, carried: true, from, to: from + W, first: from - 1, prof: 'fb2', tab: e7.map(v => (1 - dz) * v >= Math.min(0.5, 0.8 * (1 - dz) * Math.max(...e7))), chance: e7.map(v => +((1 - dz) * v).toFixed(3)), tab4: null,     /* v123 (console 09:16: a 42% plan with no frame at 50% showed no colours): the best frames are coloured, dimmed by their chance */ mix: { p: plan.p7, pp: plan.pp7, win: plan.win, doubt: dz, groups: S.length, zw: true } }; }
  slog('fb2PlanT7', plan); fb2Show(); if (cScr == null) render(); return true;
}
function fb2Show() {
  const el = $('fb2-status'); if (!el) return;
  if (!FB2.on) { el.innerHTML = '<b>FB2 T6 → T7:</b> ' + (FB2.why ? FB2.why : 'waiting for the T6 Super Charge lock'); return; }
  const P = FB2.plan, T = FB2.t7, pc = x => Math.round(100 * x) + '%';
  el.innerHTML = '<b>FB2 T6 → T7</b> (' + FB2.hyps.length + ' RNG states after the rays)' +
    '<br>Do Nothing (Lakilester): ' + (!P ? '…' : P.none ? 'no plan (' + P.none + '; blind about ' + pc(P.blind) + ')' : 'beep on +' + P.k + ': Close Call, ' + likelyText({ p: P.p, win: P.win }) + ' · perfect press ' + pc(P.pp != null ? P.pp : P.p) + (P.win ? ' (window ' + P.win + ')' : '') + ' (with your press spread ' + pc(P.p) + ')') +
    (FB2.pObs != null && T ? '<br>Seen: Do Nothing on +' + FB2.pObs.toFixed(1) + '; Close Call ' + (T.outcome === 'dodge' ? 'worked (seen)' : T.outcome === 'hit' ? 'missed: Bowser hit (seen)' : pc(T.pLucky)) + '; Bowser ' + Object.entries(T.atk).map(([a, w]) => a + ' ' + pc(w)).join(', ') : '') +
    (T && T.plan ? '<br>T7: ' + (T.plan.none ? 'no edge (' + (T.plan.none === 'edge' ? 'best ' + fb2Goal() + '+ ' + pc(T.plan.pp7) + ' with a perfect press' : T.plan.none) + ')' : 'target A on +' + T.plan.d + ': perfect press ' + fb2Goal() + '+ bounces ' + pc(T.plan.pp7 != null ? T.plan.pp7 : T.plan.p7) + (T.plan.win ? ' (window ' + T.plan.win + ')' : '') + ', 6+ ' + pc(T.plan.pp6 != null ? T.plan.pp6 : T.plan.p6) + '; with your press spread 7 ' + pc(T.plan.p7) + ', 6+ ' + pc(T.plan.p6) + ' (' + T.plan.states + ' states)') : '');
}
fb2Reset();
window.__fb2 = { v136: { hpOn: () => FB2_B7HP_ON }, v134: { onesDigit: m => fb2OnesDigit(m), T: FB2_ONES_T, watch: (t, p) => fb2B7Watch(t, p), EXP: FB2_B7HP_EXP }, v123: { assume: () => fb2T8Assume() }, v122: { planT7: () => fb2PlanT7(), maxS: FB2_T7_MAXS, budget: FB2_T7_BUDGET }, v114: { ai7: (s, nc, ph, P, so, co) => { const S = { s: s >>> 0, nc }; fb2Idle(S, P, P + FB2_DNAI, ph); const a = fb2AI7(S, P + FB2_DNAI, ph, so !== false, co !== false); return { atk: a.atk, lucky: a.lucky, T: a.T, s: a.S.s >>> 0, nc: a.S.nc }; }, pb: (s, nc, ph, f0, d) => fb2PB({ s: s >>> 0, nc }, f0, d, ph), backupOn: () => fb2BackupOn(), FB2B, backup: i => fb2Backup(i), hpVec: t => fb2HpVec(t), txt: () => fb2Txt() }, v108: { outcome: (o, i) => fb2Outcome(o, i), prune: c => fb2Prune(c), hpWatch: (t, pr) => fb2HpWatch(t, pr) }, FB2, ai: (s, nc, ph, E, so, co) => { const S = { s: s >>> 0, nc }; fb2Idle(S, 61, E, ph); const a = fb2AI(S, E, ph, so !== false, co !== false, true); return { atk: a.atk, cc: a.cc, lucky: a.lucky, T: a.T, menu: a.menu }; }, van: () => (typeof fb14Van === 'function' ? fb14Van('S') : null), bias: () => fb2Bias(), planPAt: k => fb2PlanP(k), confirm: t => fb2Confirm(t), setP: c => fb2SetP(c), dnPressT: k => fb2DnPressT(k), seenK: (k, how) => fb2SeenK(k, how || 'test'), planKAt: k => fb2PlanK(k), setK: (k, how, k0) => fb2SetK(k, how || 'test', k0), planT7At: c => fb2PlanT7(c), pic: t => fb2Pic(t), pressT: k => fb2PressT(k), prune: c => fb2Prune(c).length };   // for tests
