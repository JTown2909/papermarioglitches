//@ Shared by the Time Out Timer (page_template.html) and the High Power Bounce Manipulator (powerbounce/hpbm_template.html).
//@ Web Audio beeps scheduled on the performance.now() clock. Inlined at build time (shared/inline.py); //@ lines are dropped.
let ac = null;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
// v106: the scheduled beep times (a series = beeps no more than BEEP_CHAIN ms apart), kept whether or not audio plays, so
// a page can tell a series that has begun (beepsInFlight) and, with BEEP_GUARD on, never cut one short (cancelBeeps)
let beepT = []; const BEEP_CHAIN = 1500; var BEEP_GUARD;     // (var: a page sets it true before this file is inlined)
function beepAt(perfMs, freq, dur, noTrack) {
  if (!noTrack) { const now = performance.now(); if (perfMs >= now - 5) { beepT = beepT.filter(t => t > now - 4000); beepT.push(perfMs); beepT.sort((x, y) => x - y); } }
  const a = audio(); if (!a) return;
  const t = a.currentTime + (perfMs - performance.now()) / 1000; if (t < a.currentTime) return;
  const o = a.createOscillator(), g = a.createGain(); o.frequency.value = freq; o.type = 'square';
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  beeps.push(o);
}
let beeps = [];
// the series that has sounded its first beep and not yet its last: { tEnd: the last beep, left: beeps still to come, n }
function beepsInFlight(now) {
  now = now != null ? now : performance.now(); const T = beepT;
  for (let i = 0; i + 1 < T.length; i++) if (T[i] <= now && T[i + 1] > now && T[i + 1] - T[i] <= BEEP_CHAIN) {
    let s = i; while (s > 0 && T[s] - T[s - 1] <= BEEP_CHAIN) s--; let j = i + 1; while (j + 1 < T.length && T[j + 1] - T[j] <= BEEP_CHAIN) j++;
    return { tEnd: T[j], left: j - i, n: j - s + 1 }; }
  return null;
}
// o.force: cut a series that has begun (a visible STOP only); o.why: logged when a begun series is kept
function cancelBeeps(o) {
  if (BEEP_GUARD && !(o && o.force)) { const f = beepsInFlight(); if (f) { if (typeof slog === 'function') slog('beepsKept', { why: (o && o.why) || null, left: f.left, msLeft: Math.round(f.tEnd - performance.now()) }); return false; } }
  if (beeps.length && typeof slog === 'function') slog('beepsCancelled', { n: beeps.length }); beeps.forEach(o => { try { o.stop(); } catch (e) {} }); beeps = []; const now = performance.now(); beepT = beepT.filter(t => t <= now); return true; }
