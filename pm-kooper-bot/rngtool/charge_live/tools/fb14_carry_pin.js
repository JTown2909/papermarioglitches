/* v96 (README v96): the carry-and-stream check. Replays a Final Bowser lock's capture from a console log through the page,
 * then puts each candidate lever frame (stages: kind, turn, Fs, need 'miss') into the states and lists which frames carry
 * them onto a later lock's seed (the seed before A's base-angle draw at the Charge, target.M + d); with cap2 the later
 * Charge is replayed fresh too and only states whose seed after its rays matches are kept; with coin, the shines between
 * weigh them. Numbers only out (JSON).
 * usage: node fb14_carry_pin.js spec.json   (PAGE=the built standalone page) */
// spec   (spec: { log, cap (capture id), hideAt, stages:[{kind,turn,Fs:[clock frames]}], target:{M, seed, ds:[...] , turn} })
const { chromium } = require('playwright'), fs = require('fs');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v96/timeout_timer_standalone.html';
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
(async () => {
  const L = JSON.parse(fs.readFileSync(spec.log, 'utf8')), cap = L.chargeCaptures.find(c => c.id === spec.cap);
  if (!cap) throw new Error('no cap');
  const b = await chromium.launch(), p = await b.newPage(); p.on('pageerror', e => console.log('pageerr', String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', off: '-5', vlag: '50' })); } catch (e) {} });
  await p.goto('file://' + PAGE);
  const T0 = spec.hideAt - cap.hideMs; if (spec.cap2) { spec.cap2obj = L.chargeCaptures.find(c => c.id === spec.cap2); spec.T02 = spec.hideAt2 - spec.cap2obj.hideMs; }
  const r = await p.evaluate(async ({ cap, T0, spec }) => {
    const T = window.__tot, X = window.__fb14; X.reset();
    T.setStep(T.RT().findIndex(s => s.fb14 === spec.turn0 && s.fb14role === 'lever'));
    if (spec.stream) X.FB14.stream = { seed: parseInt(spec.stream, 16) >>> 0, t: performance.now() - 1000, how: 'carried', n: 3 };
    if (spec.prevM != null) { X.FB14.on = true; }
    const rr = await T.chgReplay(cap, { fb14: true, t0: T0 }); if (rr.state !== 'locked') return { lock: rr.state };
    const { fbRun, fbClone, fbRi } = X; const fbRate = () => X.FB14.rate; const AIA = { cn: 332, nothing: 13 };
    const fbBolts = (f, ph) => { const m1 = (f + ph[0]) % 130, m2 = (f + ph[1]) % 220; return (m1 === 78 || m1 === 83 || m1 === 113 || m1 === 118 ? 1 : 0) + (m2 === 18 || m2 === 78 || m2 === 88 || m2 === 178 ? 1 : 0); };
    const fbEv = (S, e) => { let i = S.ev.length; while (i > 0 && S.ev[i - 1].f > e.f) i--; S.ev.splice(i, 0, e); };
    const fbInputEv = (T, kind, F, turn) => { if (kind === 'chg') { fbEv(T, { k: 'chg', f: F + 13 }); fbEv(T, { k: 'chg', f: F + 16 }); } else if (kind === 'jelly') fbEv(T, { k: 'jelly', f: F + X.FB14_JELLY }); else if (kind === 'cn') { for (let i = 200; i < 210; i++) fbEv(T, { k: 'puff', f: F + i }); fbEv(T, { k: 'ai', f: F + AIA.cn, turn }); } else if (kind === 'nothing') fbEv(T, { k: 'ai', f: F + AIA.nothing, turn }); };
    const FB14 = X.FB14, ph = T.SLOG.filter(e => e.ev === 'fb14TrigPhase').pop(), pl = T.SLOG.filter(e => e.ev === 'fb14Placement').pop();
    const lk = T.SLOG.filter(e => e.ev === 'fb14Lock').pop();
    const out = { seed: rr.best && rr.best.seed, t0: FB14.t0, rate: fbRate(), M: lk && lk.M, states: FB14.states.length, phase: ph, place: pl };
    // the readings in this clock
    out.reads = (spec.reads || []).map(x => ({ n: x.n, at: x.at, pic: +((x.at - FB14.t0) / fbRate()).toFixed(3) }));
    if (spec.tM) out.Mlive = spec.tM.map(t => +((t - FB14.t0) / fbRate() - 16).toFixed(2));
    const key = S => S.s + ':' + S.nc + ':' + S.f + ':' + S.l + ':' + S.ph.join(',') + ':' + S.c.join('') + ':' + S.wv + ':' + S.lv + ':' + S.rg + ':' + (S.wb ? 1 : 0) + ':' + S.resp.join('') + ':' + S.ev.map(e => e.k + e.f).join(',') + (spec.coin ? ':' + S.sh.join(',') : '');
    // stage sets: Map key -> { S, tags: [tuples] }
    let set = new Map(); FB14.states.forEach((S, i) => { const k = key(S); if (!set.has(k)) set.set(k, { S: fbClone(S), tags: [[]], w: S.w }); else set.get(k).w += S.w; });
    const stages = spec.stages, info = [];
    for (let si = 0; si < stages.length; si++) {
      const sg = stages[si], nxt = new Map();
      for (const { S, tags, w } of set.values()) for (const Fc of sg.Fs) {
        const F = Fc - S.l; if (S.f > F + 13) continue;
        const Tt = fbClone(S); fbInputEv(Tt, sg.kind, F, sg.turn);
        // run until the next stage's earliest event, or the target's earliest
        const ns = stages[si + 1]; const to = ns ? Math.min(...ns.Fs) - 1 - 1 : Math.min(...spec.target.ds) + spec.target.M - 2;
        fbRun(Tt, to - Tt.l);
        if (sg.need && Tt.out[sg.turn] && sg.need === 'miss' && !Tt.out[sg.turn].miss) continue;
        const k = key(Tt), o = Tt.out[sg.turn]; const tg = tags.map(t => t.concat([[Fc, o ? o.atk : null, o ? o.v : null]]));
        const e = nxt.get(k); if (e) { e.tags.push(...tg); e.w += w; } else nxt.set(k, { S: Tt, tags: tg, w });
      }
      info.push({ stage: si, in: set.size, out: nxt.size }); set = nxt;
    }
    let ref = null;
    if (spec.cap2) { const saved = set; X.reset(); X.FB14.stream = null;
      const r2 = await T.chgReplay(spec.cap2obj, { fb14: true, t0: spec.T02 }); ref = new Map();
      for (const S of X.FB14.states) { const k = String(S.s >>> 0); if (!ref.has(k)) ref.set(k, []); ref.get(k).push(S.c.join('')); }
      out.t2 = { keys: [...ref.keys()], f: X.FB14.states[0].f, seed: r2.best && r2.best.seed, n: X.FB14.states.length, t0: X.FB14.t0, refKeys: ref.size }; set = saved; }
    const hits = []; const tgt = parseInt(spec.target.seed, 16) >>> 0;
    for (const { S, tags, w } of set.values()) for (const d of spec.target.ds) {
      const m = spec.target.M + d - S.l; if (S.f > m + 13) continue; const B = fbClone(S); fbRun(B, m + 13); let x = B.s; for (let i = fbBolts(m + 13, B.ph); i; i--) x = fbRi(x, 359);
      if ((x >>> 0) !== tgt) continue;
      let ok2 = null; if (ref) { B.ev.push(); const C = fbClone(S); fbInputEv(C, 'chg', m, 2); fbRun(C, m + 61); const k = String(C.s >>> 0); const cs = ref.get(k);
        if (!out.dbg) out.dbg = []; if (out.dbg.length < 30) out.dbg.push(k + ' f' + C.f + ' d' + d + ' l' + S.l);
        if (cs) { const rot = Array.from({ length: 20 }, (_, j) => C.c[(((j + (spec.target.M + d)) % 20) + 20) % 20]).join(''); ok2 = cs.includes(rot) ? 'full' : 'sNc'; } else ok2 = false; }
      if (spec.cap2 && !ok2) continue;
      let lw = 1; if (spec.coin) { const R = fbRate(), pic = t => (t - FB14.t0) / R, h = spec.target.M + d; const tapF = spec.coin.taps.map(t => pic(t) - 4.8).filter(x => x > 61 + 30 && x < h);
        const vis = spec.coin.vis.map(([a, b]) => [pic(a) + 30, Math.min(pic(b) - 4, h - 4)]).filter(([a, b]) => b > a && a > 61);
        const sh = S.sh.map(f => f + S.l).filter(f => f > 61 + 30), near = (x, f) => x - f >= -2 && x - f <= 4.5;
        for (const x of tapF) lw *= sh.some(f => near(x, f)) ? 1 : 0.02;
        for (const f of sh) if (f < h - 6 && vis.some(([a, b]) => f >= a && f <= b) && !tapF.some(x => near(x, f))) lw *= 0.1; }
      hits.push({ d, l: S.l, w, lw, ok2, tags: tags.slice(0, 60), ntags: tags.length });
    }
    out.info = info; out.hits = hits; return out;
  }, { cap, T0, spec });
  console.log(JSON.stringify(r, null, 0));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
