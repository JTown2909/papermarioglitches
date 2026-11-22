/* v129: Final Bowser's plan shares in a worker (fb14_live.js fb14Share). The worker gets the model's own functions (their source
 * text: fbStep and what it calls) and constants, and runs fb14ShareSync on plain copies of the sampled states. A live plan
 * (fbsBegin .. fbsEnd) records each share it lacks; fbsEnd sends them in one job and the plan stops ("Planning ...");
 * the answer fills the cache and the plan is made again (the same states and frames: every share is a hit). A share is
 * keyed by its states (each one's fixed draw fb14U, its weight, its frame), the turn, the kind and the Cloud Nine box's
 * frame; a cached share answers any frames inside its own. window.__fbsSync: no worker. */
const FBS_STALE = 3000;
const FBS = { w: null, ok: null, seq: 0, live: false, want: [], cache: [], pend: new Set(), t0: 0 };
function fbsSrc() {
  const fns = [fbRi, fbEv, fbVars, fbStep, fbRun, fbClone, fbNew, fbInputEv, fbSkipEv, fb14ShareSync];
  return 'let FBV = 0; const FB_RID = new Float64Array(1011);\nconst fbAdv = ' + fbAdv.toString() + ';\nconst mod20 = ' + mod20.toString() + ';\n'
    + 'const FB14_DELTA = ' + JSON.stringify(FB14_DELTA) + ', FB14_AIAFTER = ' + JSON.stringify(FB14_AIAFTER) + ', FB14_JELLY = ' + JSON.stringify(FB14_JELLY) + ', FB14_SKIP = ' + JSON.stringify(FB14_SKIP) + ';\n'
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
function fbsBegin() { FBS.live = true; FBS.want = []; }
// a cached share for these states over a..b (a slice of a wider one), else null; on a live plan the miss is recorded (zeros
// stand in until the worker answers: fbsEnd stops the plan before anything is scheduled)
function fbsLookup(L, a, b, turn, kind) {
  if (!FBS.cache.length && !FBS.live) return null;
  const key = fbsKey(L, turn, kind), c = FBS.cache.find(e => e.key === key && e.a <= a && e.b >= b);
  if (c) return c.sh.slice(a - c.a, b - c.a + 1);
  // the states' weights move with every shine while the worker runs: a share of this turn, kind and frames under FBS_STALE ms
  // old stands in (a plan's share averages hundreds of states), so a live plan does not wait round after round
  if (FBS.live) { const now = performance.now(), o = FBS.cache.filter(e => e.turn === turn && e.kind === kind && e.a <= a && e.b >= b && now - e.t < FBS_STALE && e.n === L.length && e.ids === fbsIds(L)).pop();
    if (o) { FBS.stale = (FBS.stale || 0) + 1; return o.sh.slice(a - o.a, b - o.a + 1); } }
  if (!FBS.live) return null;
  if (!FBS.want.some(w => w.key === key && w.a === a && w.b === b)) FBS.want.push({ key, a, b, kind, L, ids: fbsIds(L) });
  return new Float64Array(Math.max(0, b - a + 1));
}
function fbsEnd(turn) {
  FBS.live = false; const W = FBS.want.filter(w => !FBS.pend.has(w.key + ':' + w.a + ':' + w.b)); FBS.want = [];
  const missing = W.length || FBS.pend.size; if (!W.length) return missing > 0;
  const id = ++FBS.seq, jobs = W.map(w => ({ a: w.a, b: w.b, kind: w.kind, L: w.L.map(S => fbClone(S)) }));
  W.forEach(w => FBS.pend.add(w.key + ':' + w.a + ':' + w.b)); FBS.jobs = FBS.jobs || {}; FBS.jobs[id] = { W, t0: performance.now(), turn };
  try { FBS.w.postMessage({ id, turn, boxP: fbsBoxP(), jobs }); } catch (e) { slog('fbsPostError', { msg: String(e).slice(0, 120) }); FBS.ok = false; W.forEach(w => FBS.pend.delete(w.key + ':' + w.a + ':' + w.b)); return false; }
  return true;
}
function fbsDone(e) {
  const d = e.data, J = FBS.jobs && FBS.jobs[d.id]; if (!J) return; delete FBS.jobs[d.id];
  J.W.forEach((w, i) => { FBS.pend.delete(w.key + ':' + w.a + ':' + w.b); FBS.cache.push({ key: w.key, a: w.a, b: w.b, sh: d.out[i], turn: J.turn, kind: w.kind, n: w.L.length, ids: w.ids, t: performance.now() }); });
  while (FBS.cache.length > 12) FBS.cache.shift();
  slog('fbsShares', { turn: J.turn, jobs: J.W.length, ms: Math.round(performance.now() - J.t0) });
  if (!FBS.pend.size && typeof fb14Plan === 'function') { try { if (!fb14Plan()) { if (typeof makePlan === 'function') makePlan(); } else { fb14Show(); render(); } } catch (err) { slog('fbsReplanError', { msg: String(err).slice(0, 160) }); } }
}
