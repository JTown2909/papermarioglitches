//@ v116: Final Bowser Phase 1 on the Ultra Boots Laki route (charge_live/README.md v116). Included by page_template.html after
//@ fb14_live.js.
/* Phase 1's T1 Super Charge is read with the aura profile (Bowser's Star Rod aura is up in Phase 1 too: console clip 16-06-01,
 * log 484e3220, the Phase 1 Charge locks 9bb456e7 at 6776 / 2.44x on the first placement with it, the same seed the Hallway
 * profile found at 2469 / 1.87x on its third). The lock is shown and logged, nothing is planned or beeped: Phase 1's turns
 * (Bowser's T1 attack, the T2 Power Bounce against Phase 1 Bowser) are not modelled, and the seed cannot be carried into
 * Phase 2: between them come the Star Beam cutscene, a whole Peach battle against Kammy (the runner's inputs, ~110 s on the
 * clip, clip 50-170 s) and the Star Spirits' cutscene. Phase 2 T1's Charge locks afresh, as before.
 * After the Phase 1 read (lock or no lock) the route moves to Phase 2 T1's Charge step, which takes no burst and no screen close
 * for FBP1_HOLD (Phase 1 T2 / T3, the Star Beam's flash: the clip's Phase 2 Charge came 220 s after Phase 1's). Before v116 the
 * Phase 1 Charge, read on Phase 2 T1's step, was taken as Phase 2 T1's lock (its Cloud Nine plan built on Phase 1's seed). */
var FBP1_HOLD = 90000;     // (var: chgShow runs before this file is evaluated)
var FBP1 = { t: null, seed: null, outcome: null, score: null, ratio: null };
CHG_PROF.fbp1 = Object.assign({}, CHG_PROF.fb1, { id: 'fbp1' });
CHG_PRESS.fbp1 = () => 20000;      // nothing waits on the lock: re-reads for 20 s
function fbp1Reset() { Object.assign(FBP1, { t: null, seed: null, outcome: null, score: null, ratio: null }); }
function fbp1T1I() { return RT().findIndex(x => x.fb14 === 1 && x.fb14role === 'charge'); }
function fbp1Hold(t) { return !!FBP1 && FBP1.t != null && (t != null ? t : performance.now()) - FBP1.t < FBP1_HOLD; }
/* the Phase 1 read is over (chgDecide / chgRetryStop): kept, the reader reset, the route on to Phase 2 T1's Charge step */
function fbp1Done(outcome) {
  if (CHG.replay || chgP().id !== 'fbp1') return false;
  const I = CHG.info || {}, b = I.best || {};
  Object.assign(FBP1, { t: CHG.trig ? CHG.trig.t : performance.now(), seed: outcome === 'lock' ? b.seed || null : null, outcome, score: b.score != null ? b.score : null, ratio: b.ratio != null ? b.ratio : null });
  slog('fbP1Read', { outcome, seed: FBP1.seed, score: FBP1.score, ratio: FBP1.ratio, alt: CHG.alt || 0, mario: I.mario, holdMs: FBP1_HOLD });
  if (CHG.rec && typeof chgRecEnd === 'function') chgRecEnd(outcome === 'lock' ? 'lock' : 'nolock');
  chgReset(); const j = fbp1T1I(); if (j >= 0 && isRoute() && RT()[routeStep] && RT()[routeStep].fbp1) setStep(j);
  chgShow(); return true;
}
/* Phase 2 T1's Charge step during the hold: no arming (chgFrame) */
function fbp1ArmOk(P, t) { if (!P || P.id !== 'fb1' || !fbp1Hold(t)) return true; const s = isRoute() && RT()[routeStep]; return !(s && s.fb14 === 1 && s.fb14role === 'charge'); }
/* a screen close on the Phase 1 step, or on Phase 2 T1's Charge step during the hold, does not move the route (checkPress) */
function fbp1KeepStep(stp, tObs) {
  if (stp && stp.fbp1) { slog('fbP1StepKept', { at: Math.round(tObs), why: 'Phase 1: only its Charge read moves the route' }); return true; }
  if (stp && stp.fb14 === 1 && stp.fb14role === 'charge' && fbp1Hold(tObs)) { slog('fbP1StepKept', { at: Math.round(tObs), why: 'Phase 1 T2 / T3 or the cutscenes', sinceMs: Math.round(tObs - FBP1.t) }); return true; }
  return false;
}
function fbp1Line() {
  if (!FBP1) return '';
  if (FBP1.t == null && !(isRoute() && RT()[routeStep] && RT()[routeStep].fbp1)) return '';
  const tail = ' Nothing is beeped in Phase 1, and Phase 2 T1\'s Charge locks afresh (the Peach battle comes between).';
  if (FBP1.t == null) return '<br><span class="note">Final Bowser Phase 1: its T1 Super Charge is read here (shown only).' + tail + '</span>';
  return '<br><span class="note">Final Bowser Phase 1: ' + (FBP1.outcome === 'lock' ? 'seed ' + FBP1.seed + ' read (' + FBP1.score + ', ' + FBP1.ratio + 'x)' : 'no clear seed') + '.' + tail + '</span>';
}
