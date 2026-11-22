/* v129: Final Bowser's plan shares in a worker (fb14_live.js fb14Share). The worker gets the model's own functions (their source
 * text: fbStep and what it calls) and constants, and runs fb14ShareSync on plain copies of the sampled states. A live plan
 * (fbsBegin .. fbsEnd) records each share it lacks; fbsEnd sends them in one job and the plan stops ("Planning ...");
 * the answer fills the cache and the plan is made again (the same states and frames: every share is a hit). A share is
 * keyed by its states (each one's fixed draw fb14U, its weight, its frame), the turn, the kind and the Cloud Nine box's
 * frame; a cached share answers any frames inside its own. window.__fbsSync: no worker. */
const FBS_STALE = 3000, FBS_FRESH = 600, FBS_PAD = 60, FBS_WAIT = 4000;
const FBS = { w: null, ok: null, seq: 0, live: false, want: [], cache: [], pend: new Set(), t0: 0 };
function fbsSrc() {
  const fns = [fbRi, fbEv, fbVars, fbStep, fbRun, fbClone, fbNew, fbInputEv, fbSkipEv, fb14ShareSync];
  return 'let FBV = 0; const FB_RID = new Float64Array(1011);\nconst fbAdv = ' + fbAdv.toString() + ';\nconst mod20 = ' + mod20.toString() + ';\n'
    + 'const FB14_DELTA = ' + JSON.stringify(FB14_DELTA) + ', FB14_AIAFTER = ' + JSON.stringify(FB14_AIAFTER) + ', FB14_JELLY = ' + JSON.stringify(FB14_JELLY) + ', FB14_SKIP = ' + JSON.stringify(FB14_SKIP) + ', FB14_PBTH = ' + JSON.stringify(FB14_PBTH) + ';\n'
    + 'const FB14_WAVE_POST = ' + JSON.stringify(FB14_WAVE_POST) + ', FB14_WAVE_POST_B = ' + JSON.stringify(FB14_WAVE_POST_B) + ';\nconst FB14_REVIVE_SP = ' + JSON.stringify(FB14_REVIVE_SP) + ';\nlet FB14 = { box: null };\n'
    + fns.map(f => f.toString()).join('\n')
    + '\nonmessage = e => { const d = e.data; FB14 = { box: d.boxP != null ? { P: d.boxP } : null }; const out = d.jobs.map(j => fb14ShareSync(j.L, j.a, j.b, d.turn, j.kind)); postMessage({ id: d.id, out }, out.map(x => x.buffer)); };';
}
function fbsOn() {
  if (window.__fbsSync || typeof Worker === 'undefined') return false;
  if (FBS.ok === false) return false;
  if (!FBS.w) { try { FBS.w = new Worker(URL.createObjectURL(new Blob([fbsSrc()], { type: 'text/javascript' }))); FBS.w.onmessage = fbsDone; FBS.w.onerror = e => { slog('fbsWorkerError', { msg: String(e.message || e).slice(0, 160) }); FBS.ok = false; FBS.w = null; }; FBS.ok = true; } catch (e) { FBS.ok = false; return false; } }
  return true;
}
const fbsBoxP = () => (FB14.box && FB14.box.P != null ? FB14.box.P : null);
function fbsKey(L, turn, kind) {
  let h = 2166136261 >>> 0; const mix = x => { h = Math.imul(h ^ (x >>> 0), 16777619) >>> 0; };
  for (const S of L) { mix(Math.round(fb14U(S.base || S) * 1e6)); mix(Math.round(S.w * (S.lw == null ? 1 : S.lw) * 1e6) | 0); mix(S.f | 0); mix(S.l | 0); }
  return turn + ':' + kind + ':' + L.length + ':' + h + ':' + fbsBoxP();
}
// the same states (seeds, frames, lags) whatever their weights: what a stale share must share (v129: a share of another lock's
// states with the same count stood in for a new lock's, test_console_1107)
function fbsIds(L) { let h = 2166136261 >>> 0; const mix = x => { h = Math.imul(h ^ (x >>> 0), 16777619) >>> 0; }; for (const S of L) { const B = S.base || S; mix(B.s); mix(B.nc | 0); mix(S.f | 0); mix(S.l | 0); } return h; }
// a plan of this turn waits on a job (sent or queued) for at most FBS_WAIT ms
function fbsWaiting(turn) { const now = performance.now(); if (FBS.next && FBS.next.hard && FBS.next.turn === turn && now - FBS.next.t < FBS_WAIT) return true;
  return Object.values(FBS.jobs || {}).some(J => J.hard && J.turn === turn && now - J.t0 < FBS_WAIT); }
function fbsBegin() { FBS.live = true; FBS.want = []; }
// a cached share for these states over a..b (a slice of a wider one), else null; on a live plan the miss is recorded (zeros
// stand in until the worker answers: fbsEnd stops the plan before anything is scheduled)
function fbsLookup(L, a, b, turn, kind) {
  if (!FBS.cache.length && !FBS.live) return null;
  const key = fbsKey(L, turn, kind), c = FBS.cache.find(e => e.key === key && e.a <= a && e.b >= b);
  if (c) return c.sh.slice(a - c.a, b - c.a + 1);
  // v131 (log 15:27, T4 with 24000 states: no plan in 12 s, the worker's answers 0.9 s rising to 4.4 s): the states' weights move
  // with every shine, and with that many states the sample moves too, so an answer for the exact states never came back in time.
  // An answer for the same lock (fbsGen), turn, kind and frames stands in (newest first): under FBS_STALE ms old, or any age
  // while a fresher one is being worked out; the fresh one is still asked for (soft: the plan does not wait on it)
  const g = fbsGen(), now = performance.now(), o = FBS.cache.filter(e => e.gen === g && e.turn === turn && e.kind === kind && e.a <= a && e.b >= b && (now - e.t < FBS_STALE || FBS.pend.size)).pop();
  if (o) { FBS.stale = (FBS.stale || 0) + 1; if (FBS.live && now - o.t > FBS_FRESH) fbsWant(key, a, b, kind, L, true); return o.sh.slice(a - o.a, b - o.a + 1); }
  if (!FBS.live) return null;
  fbsWant(key, a, b, kind, L, false);
  return new Float64Array(Math.max(0, b - a + 1));
}
// the lock the states belong to: a share of another lock's states never stands in (test_console_1107)
const fbsGen = () => (typeof FB14 === 'object' && FB14 ? FB14.lockN + '/' + (FB14.relock || 0) + '/' + FB14.t0 : '');
// asked-for frames run FBS_PAD past the plan's (the plan's window moves on with the clock: the next ticks' fall inside it)
function fbsWant(key, a, b, kind, L, soft) { if (!FBS.want.some(w => w.key === key && w.a === a && w.b === b)) FBS.want.push({ key, a, b, bx: b + FBS_PAD, kind, L, ids: fbsIds(L), soft }); }
function fbsEnd(turn) {
  FBS.live = false; const W = FBS.want.filter(w => !FBS.pend.has(w.key + ':' + w.a + ':' + w.b)); FBS.want = [];
  const hard = W.some(w => !w.soft);
  if (!W.length) return FBS.pend.size > 0 && !FBS.softOnly;
  // v131: one job at a time (the 15:27 log's queue grew answer by answer); the newest round waits for the one being worked out
  if (FBS.jobs && Object.keys(FBS.jobs).length) { FBS.next = { W, turn, hard, t: performance.now() }; return hard; }
  return fbsSend(W, turn, hard);
}
function fbsSend(W, turn, hard) {
  const id = ++FBS.seq, jobs = W.map(w => ({ a: w.a, b: w.bx, kind: w.kind, L: w.L.map(S => fbClone(S)) }));
  W.forEach(w => FBS.pend.add(w.key + ':' + w.a + ':' + w.b)); FBS.jobs = FBS.jobs || {}; FBS.jobs[id] = { W, t0: performance.now(), turn, gen: fbsGen(), hard }; FBS.softOnly = !hard;
  try { FBS.w.postMessage({ id, turn, boxP: fbsBoxP(), jobs }); } catch (e) { slog('fbsPostError', { msg: String(e).slice(0, 120) }); FBS.ok = false; W.forEach(w => FBS.pend.delete(w.key + ':' + w.a + ':' + w.b)); delete FBS.jobs[id]; return false; }
  return hard;
}
function fbsDone(e) {
  const d = e.data, J = FBS.jobs && FBS.jobs[d.id]; if (!J) return; delete FBS.jobs[d.id];
  J.W.forEach((w, i) => { FBS.pend.delete(w.key + ':' + w.a + ':' + w.b); FBS.cache.push({ key: w.key, a: w.a, b: w.bx, sh: d.out[i], turn: J.turn, kind: w.kind, n: w.L.length, ids: w.ids, gen: J.gen, t: performance.now() }); });
  while (FBS.cache.length > 12) FBS.cache.shift();
  slog('fbsShares', { turn: J.turn, jobs: J.W.length, ms: Math.round(performance.now() - J.t0) });
  const N = FBS.next; FBS.next = null;
  if (N && N.turn === J.turn) { const W = N.W.filter(w => !FBS.pend.has(w.key + ':' + w.a + ':' + w.b) && !FBS.cache.some(c => c.key === w.key && c.a <= w.a && c.b >= w.b)); if (W.length) fbsSend(W, N.turn, N.hard); }
  // v131 (log 15:31, T2: an answer every 100 ms for 7 s, each one a whole plan on the page's thread, the coin's shines lost in the
  // dropped pictures, every state then ruled out): only a plan that waits on the worker is made again here; a fresher answer
  // the plan did not wait for is picked up by the plan's own next tick
  if (J.hard && !FBS.pend.size) { if (typeof fb14Plan === 'function') { try { if (!fb14Plan()) { if (typeof makePlan === 'function') makePlan(); } else { fb14Show(); render(); } } catch (err) { slog('fbsReplanError', { msg: String(err).slice(0, 160) }); } } }
}
