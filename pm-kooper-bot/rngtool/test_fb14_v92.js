/* v92: the carried Final Bowser read made fast (charge_live/README.md v92), on the game's own state (fixtures/fb14_chain_logs.json,
 * as test_fb14_v87.js) and on log D's T2 (8576a774, when the logs are there):
 *  1. the carried candidates built during the burst (fb14PreCands, in slices) are the ones fb14ChgCands built after the maps;
 *  2. the held states are only those whose stream drew the locked rays (prefilter), the lock is the same as on all of them
 *     (fb14HeldVerify), and the fallback holds all of them when the prefiltered ones match none;
 *  3. the light fits (end seeds only): a carried match locks at once; no match returns 'light' with the turn kept for the
 *     refine (no fresh states from a light list);
 *  4. D T2's narrowed read: adce13ad, light fits, under 2.5 s (v91 4.5-4.8 s replayed; live 3.0 s).
 *  5. e2e 5eed0fb2 T1 (the route moved by a screen, T1's lock read as T2's): a lever screen closing within 2.5 s of its
 *     turn's Charge burst is the Charge's own (no confirm, the route stays); a lock keeps its burst's turn unless the
 *     runner moved the route after the burst; a screen closing with the status bar up (an action wheel's submenu) is not a
 *     Final Bowser confirm.
 *  7. a lock clearing an earlier hit keeps the HP watch's "10 HP seen" (5eed0fb2 attempt 2: T4's wave hit never read).
 *  6. no plan for a Charge turn's lever before that Charge was seen (e2e 5eed0fb2: T2 beeped during Bowser's T1 attack).
 * usage: node test_fb14_v92.js [PAGE] */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const L = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fb14_chain_logs.json'), 'utf8'))[0];
const buf = Buffer.from(L.s0, 'base64'), seeds = Array.from({ length: L.n }, (_, i) => buf.readUInt32LE(4 * i));
const LD = process.env.LOGS || '/tmp/claude-0/pm/logs1110', DLOG = path.join(LD, '8576a774-pm-rng-log-1794355083614.json');
let fails = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); fs.createReadStream(PAGE).pipe(r); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame' })); } catch (e) {} });
  await p.goto(url);
  check(await p.evaluate(() => window.__tot.VERSION) === 'v96', 'page version v96');
  const r = await p.evaluate(async ({ L, seeds }) => {
    const T = window.__tot, X = window.__fb14, FB = X.FB14, rate = 33.367, T1 = L.turns[0], T2 = L.turns[1], M = T2.M, out = {};
    const sAt = f => seeds[f - L.f0] >>> 0;
    // the game's state before T2's Charge (from the log's first frame with T1's true inputs), and 40 decoys
    const truth = () => { const S = X.fbNew({ s: seeds[0], nc: L.nc, f: L.f0, c: Uint8Array.from(L.aura), ph: [L.ph[0], L.ph[1]], l: 0, w: 1, from: L.f0 });
      S.ev.push({ k: 'chg', f: T1.M + 13 }, { k: 'chg', f: T1.M + 16 }); for (let i = 200; i < 210; i++) S.ev.push({ k: 'puff', f: T1.P + i }); S.ev.push({ k: 'ai', f: T1.P + 332, turn: 1 });
      S.ev.sort((a, b) => a.f - b.f); X.fbRun(S, M - 30); return S; };
    const setup = () => { X.reset(); const S = truth(), L2 = [S]; for (let i = 0; i < 40; i++) { const D = X.fbClone(S); D.s = (Math.imul(i + 1, 0x9E3779B1) ^ S.s) >>> 0; D.w = 0.5; L2.push(D); }
      const t0 = performance.now() - (M + 300) * rate; Object.assign(FB, { on: true, t0, rate, states: L2, turn: 1, M: { 1: T1.M }, lockN: 1 }); FB.trigTurn = 2; T.CHG.narrow14 = null; return S; };
    // the rays' A (the seed after its base-angle draw) and the seed after the rays, from the true state
    const S0 = setup(), A = X.fbClone(S0); X.fbRun(A, M + 13); let x = A.s; const bl = (f, ph) => { const m1 = (f + ph[0]) % 130, m2 = (f + ph[1]) % 220; return (m1 === 78 || m1 === 83 || m1 === 113 || m1 === 118 ? 1 : 0) + (m2 === 18 || m2 === 78 || m2 === 88 || m2 === 178 ? 1 : 0); };
    for (let i = bl(M + 13, A.ph); i; i--) x = X.fbRi(x, 359); const a = X.fbAdv(x) >>> 0, s61 = sAt(M + 61);
    const res = nc48 => ({ fb1: { hyps: { hy: [{ s48: s61, nc48, sc: 100, esc: 100, p: 0, q: 0, aura: Array.from(S0.c) }], a, best: 100, n: 1 } }, trigT: FB.t0 + (M + 16) * rate });
    const isTrue = S => (S.s >>> 0) === sAt(S.f);
    const wait = ms => new Promise(r => setTimeout(r, ms)), sorted = a => (a || []).slice().sort((x, y) => x - y).join(',');
    const narrowed = async (pre, hres, verify, before) => { setup(); if (before) before(); const n0 = T.SLOG.length; FB.pendChg = { M, turn: 2 }; T.CHG.state = 'search'; const pr0 = T.CHG.prof; T.CHG.prof = { id: 'fb1' };
      if (pre) { X.preCands(); for (let k = 0; k < 200 && !(FB.pre && FB.pre.done); k++) await wait(5); }
      const c = X.chgCands(), N = T.CHG.narrow14; N.done = true; N.ok = true; window.__fb14verifyHeld = !!verify;
      const how = X.lock(hres), log = T.SLOG.slice(n0); window.__fb14verifyHeld = false; T.CHG.state = 'idle'; T.CHG.prof = pr0;
      return { c: sorted(c), how, pre: !!N.pre, held: log.filter(e => e.ev === 'fb14Held').map(e => [e.states, e.pre]), ver: log.filter(e => e.ev === 'fb14HeldVerify')[0] || null, light: log.some(e => e.ev === 'fb14LightNoMatch'), trigTurn: FB.trigTurn,
        nTrue: FB.states.filter(S => { const C = X.fbClone(S); X.fbRun(C, M + 61); return (C.s >>> 0) === s61; }).length }; };
    const bad = r0 => { const r = res(0); r.fb1.hyps.hy[0].s48 = (s61 ^ 0x5a5a5a5a) >>> 0; if (r0) r.fb1.hyps.light = true; return r; };
    const lite = () => { const r = res(0); r.fb1.hyps.light = true; return r; };
    out.full = await narrowed(false, res(0));
    out.pre = await narrowed(true, res(0), true);
    out.fallback = await narrowed(true, bad(false));
    out.lightOk = await narrowed(true, lite());
    out.lightNo = await narrowed(true, bad(true));
    // 7. a lock after a T3 hit keeps the HP watch's "10 seen" (attempt 2 of 5eed0fb2: T4's wave hit never read)
    await narrowed(true, res(0), false, () => { FB.hit = 3; FB.hpw = { seen10: true, tenRun: 0, blankRun: 0, ok: {}, done: { 3: 'hit' } }; });
    out.hpw = { hit: FB.hit, seen10: FB.hpw && FB.hpw.seen10, done3: FB.hpw && FB.hpw.done[3] };
    // 5. the Charge's own screen after its burst; the lock's turn
    { const RT = T.RT(), l1 = RT.findIndex(x => x.fb14 === 1 && x.fb14role === 'lever'), l2 = RT.findIndex(x => x.fb14 === 2 && x.fb14role === 'lever'), l4 = RT.findIndex(x => x.fb14 === 4 && x.fb14role === 'lever');
      X.reset(); T.setStep(l1); const now = performance.now(); FB.lastBurst = { turn: 1, t: now - 60 };
      const n0 = T.SLOG.length; T.screenClosed(now); const own = { step: T.step(), l1, ev: T.SLOG.slice(n0).map(e => e.ev), pT: Object.keys(FB.pT || {}).length };
      own.late = X.ownClose(now + 4000, RT[l1]); own.otherTurn = X.ownClose(now, RT[l2]);
      out.own = own;
      const lockTurn = async user => { setup(); FB.trigTurn = 2; FB.trigStep = l2; FB.tTrig = performance.now(); T.setStep(l2); await wait(5); if (user) T.userStep(l4); else T.setStep(l4);
        const n1 = T.SLOG.length; X.lock(res(0)); const L2 = T.SLOG.slice(n1); return { turn: (L2.find(e => e.ev === 'fb14Lock') || {}).turn, kept: L2.some(e => e.ev === 'fb14TurnKept') }; };
      // a close with the status bar still up (a submenu opened from the action wheel): dropped; with the bar hiding: a confirm
      { X.reset(); T.setStep(l1); const t1 = performance.now() + 100000, V = T.V, n2 = T.SLOG.length; V.present = true; V.hudGone = 0; T.screenClosed(t1); T.closeTick(t1 + 500, false);
        const a = { step: T.step(), ev: T.SLOG.slice(n2).map(e => e.ev) }; const n3 = T.SLOG.length; T.screenClosed(t1 + 1000); V.hudGone = t1 + 1060; T.closeTick(t1 + 1070, false);
        out.noHide = { a, b: { step: T.step(), ev: T.SLOG.slice(n3).map(e => e.ev) }, l1 };
        // Lakilester's Do Nothing (cat S) leaves the bar up: its close is a confirm at once
        X.reset(); T.setStep(l2); FB.M = { 2: 0 }; V.hudGone = 0; const n5 = T.SLOG.length; T.screenClosed(t1 + 2000); out.noHide.s = T.SLOG.slice(n5).map(e => e.ev); V.present = false; V.hudGone = 0; }
      // 6. a Charge turn's lever before its Charge: no plan (e2e 5eed0fb2: T2 beeped during Bowser's T1 attack)
      { setup(); FB.M = { 1: 0 }; T.setStep(l2); const n4 = T.SLOG.length; X.plan(); const ev = T.SLOG.slice(n4).map(e => e.ev); out.waitChg = { none: FB.plan && FB.plan.none, ev, beeps: ev.includes('fb14Plan') };
        setup(); FB.M = { 1: 0, 2: 300 }; T.setStep(RT.findIndex(x => x.fb14 === 3 && x.fb14role === 'lever')); const n6 = T.SLOG.length; X.plan(); out.waitChg.t3 = { none: FB.plan && FB.plan.none, ev: T.SLOG.slice(n6).map(e => e.ev) }; }
      out.turnScreen = await lockTurn(false); out.turnUser = await lockTurn(true); }
    return out;
  }, { L, seeds });
  console.log(JSON.stringify(r).slice(0, 1500));
  check(r.pre.pre && r.pre.c === r.full.c && r.pre.c.length > 0, '1. the candidates built during the burst are the ones built after the maps (' + r.full.c.split(',').length + ')');
  check(r.full.how === 'carried' && r.pre.how === 'carried' && r.pre.nTrue >= 1 && r.pre.held[0] && r.pre.held[0][1] && r.pre.held[0][0] < r.full.held[0][0] && r.pre.held[0][0] >= 1, '2. prefiltered: ' + (r.pre.held[0] && r.pre.held[0][0]) + ' held states, not ' + r.full.held[0][0] + '; carried, the game\'s state kept');
  check(r.pre.ver && r.pre.ver.same && r.pre.ver.pre === r.pre.ver.all, '2. the same matches as on every held state ' + JSON.stringify(r.pre.ver));
  check(r.fallback.held.length === 2 && r.fallback.held[0][1] && r.fallback.held[0][0] < r.fallback.held[1][0] && !r.fallback.held[1][1] && r.fallback.held[1][0] === r.full.held[0][0], '2. no prefiltered match: every state held again ' + JSON.stringify(r.fallback.held));
  check(r.lightOk.how === 'carried' && r.lightOk.nTrue >= 1, '3. light fits, a carried match: locked at once');
  check(r.lightNo.how === 'light' && r.lightNo.light && r.lightNo.trigTurn === 2, '3. light fits, no match: \'light\' (refine next), the turn kept (' + r.lightNo.trigTurn + ')');
  check(r.own.step === r.own.l1 && r.own.ev.includes('fb14OwnClose') && !r.own.ev.includes('fb14ConfirmBeforeLock') && r.own.pT === 0, '5. Cloud Nine\'s screen closing 60 ms after T1\'s burst: the Charge\'s own, no confirm, the route stays ' + JSON.stringify(r.own.ev));
  check(r.noHide.a.step === r.noHide.l1 && r.noHide.a.ev.includes('fb14CloseNoHide') && !r.noHide.a.ev.includes('fb14ConfirmBeforeLock') && r.noHide.b.ev.includes('fb14ConfirmBeforeLock') && r.noHide.s.includes('fb14ConfirmBeforeLock') && !r.noHide.s.includes('fb14CloseNoHide'), '5. a Final Bowser Mario screen closing with the status bar up (a submenu from the wheel): not a confirm; with the bar hiding: a confirm; Do Nothing\'s screen (the bar stays up): a confirm at once ' + JSON.stringify(r.noHide));
  check(r.hpw.hit === null && r.hpw.seen10 === true && r.hpw.done3 === 'hit', '7. a lock clearing T3\'s hit keeps the HP watch\'s 10 HP seen (T4\'s wave hit is read) ' + JSON.stringify(r.hpw));
  check(r.waitChg.none === 'charge' && r.waitChg.ev.includes('fb14WaitCharge') && !r.waitChg.beeps && r.waitChg.t3.none === 'charge' && r.waitChg.t3.ev.includes('fb14WaitCharge'), '6. T2\'s Do Nothing step before T2\'s Charge, T3\'s before its Jelly: no plan, waiting ' + JSON.stringify(r.waitChg));
  check(!r.own.late && !r.own.otherTurn, '5. 4 s after the burst, or another turn\'s step: a confirm as before');
  check(r.turnScreen.turn === 2 && r.turnScreen.kept && r.turnUser.turn === 4 && !r.turnUser.kept, '5. the route moved by the page during the read: the lock keeps the burst\'s T2 (' + JSON.stringify(r.turnScreen) + '); by the runner: their T4 (' + JSON.stringify(r.turnUser) + ')');
  if (!fs.existsSync(DLOG)) console.log('skip 4: log D is not in ' + LD);
  else {
    const caps = JSON.parse(fs.readFileSync(DLOG, 'utf8')).chargeCaptures;
    const d = await p.evaluate(async c => { const t0 = performance.now(); const r = await window.__tot.chgReplay(c, { maxAlts: 0 }); return { state: r.state, best: r.best, narrow: r.info.narrow, stage: r.info.stage, ms: Math.round(performance.now() - t0) }; }, caps[10]);
    check(d.state === 'locked' && d.best.seed === 'adce13ad' && d.narrow && d.narrow.ms < 2500, '4. D T2: the narrowed read locks adce13ad in ' + (d.narrow && d.narrow.ms) + ' ms (fits ' + (d.stage && d.stage.hyps) + ' ms; v91 4500-4800 replayed)');
  }
  check(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
