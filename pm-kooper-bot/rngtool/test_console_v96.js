/* v96: the Final Bowser lever timing pinned on every console attempt so far (charge_live/README.md v96; fixtures/console_v96.json,
 * numbers only).
 *  1. The carry-and-stream counts: a Charge seed fixes the number of draws, so the T2 lock is reached from every Cloud Nine
 *     frame tried (906bfb29), and the T4 lock from every Do Nothing pair: the carry cannot pin either lever.
 *  2. The overlay A against the beeps: the reading minus the A's lag is one constant per lever (within a game frame); Cloud
 *     Nine's bar is 0.87 frame later than the Do Nothing panel for the same press, so x(Cloud Nine) = 3.4 - 0.87; the outcomes
 *     leave x >= 2.25 (Cloud Nine) and cap the Do Nothing offset near 3.5: the page reads the bar at +2.5.
 *  3. The runner is late: the six stored Do Nothing presses +0.7 .. +2.4, the overlay A ~0.8 frame later after the beep than on
 *     the attempt that won; the Do Nothing outcomes rule out a runner on the beep (offset 1.8) ~14:1. The learned correction is on.
 *  4. The replan anchor (0dfd444d T2: 205 -> 214 -> 227 in 0.7 s), the tick's 0.25 drop.
 *  5. T6: the HOLD headline from the step arming; the T6 timing.
 * usage: node test_console_v96.js [page] */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const SP = '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad';
const PAGE = process.argv[2] || process.env.PAGE || SP + '/timeout_timer_v96/timeout_timer_standalone.html';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v96.json'), 'utf8'));
const F95 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v95.json'), 'utf8'));
let bad = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };
const lcg = x => (Math.imul(x, 0x5D588B65) + 1) >>> 0;
const steps = (a, b, n) => { let x = parseInt(a, 16) >>> 0; const t = parseInt(b, 16) >>> 0; for (let i = 0; i <= n; i++) { if (x === t) return i; x = lcg(x); } return -1; };
const inWin = (c, x, a, b, ph) => { const F = Math.floor(c + x + (ph || 0) + 0.5); return F >= a && F <= b; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
(async () => {
  // ---- 1. the carry
  const C = FIX.carry906;
  check(steps(C.t1Seed, C.t2Seed, 5000) === C.t2Steps, '1. 906bfb29: T1\'s lock ' + C.t1Seed + ' -> T2\'s narrowed lock ' + C.t2Seed + ' ' + C.t2Steps + ' steps');
  check(C.cnFramesReaching === C.cnFramesTried[1] - C.cnFramesTried[0] + 1 && C.coinShinesBetweenT1T2 <= 2, '1. the carry does not pin Cloud Nine: all ' + C.cnFramesReaching + ' frames ' + C.cnFramesTried.join('-') + ' (Bowser missing) reach T2\'s seed and its rays\' end seed by some T1 fit (' + C.cnHitStates + ' states); ' + C.coinShinesBetweenT1T2 + ' shines between to tell them apart');
  check(C.dn.t2Reaching >= 18 && C.dn.t3Reaching >= 18, '1. nor Do Nothing: T2 ' + C.dn.t2Reaching + ' of 19 frames, T3 ' + C.dn.t3Reaching + ' of 19 reach T4\'s seed ' + C.dn.t4Seed + ' (a Charge seed fixes the number of draws, which the lever frame rarely changes)');
  // ---- 2. the overlay A against the reading
  const K = (r) => r[3] - r[4] / 2, dn = FIX.presses.filter(r => r[1] === 'S'), cn = FIX.presses.filter(r => r[1] === 'bar' && r[5] === 'full');
  const KD = dn.map(K), KC = cn.map(K), kd = mean(KD), kc = mean(KC);
  console.log('  K (v92 reading err - overlay lag): Do Nothing ' + KD.map(x => x.toFixed(2)).join(' ') + ' (mean ' + kd.toFixed(2) + '); Cloud Nine ' + KC.map(x => x.toFixed(2)).join(' ') + ' (mean ' + kc.toFixed(2) + ')');
  check(Math.max(...KD) - Math.min(...KD) <= 2.05 && KD.filter(x => x >= -5.75 && x <= -4.7).length >= 10, '2. Do Nothing: the reading minus the overlay A\'s lag is one constant within a game frame on 10 of 11 presses (' + Math.min(...KD).toFixed(2) + ' .. ' + Math.max(...KD).toFixed(2) + '): the reading follows the press');
  const xc = 3.4 + kd - kc;
  check(Math.abs(kc - kd - 0.87) < 0.05 && xc > 2.45 && xc < 2.6, '2. Cloud Nine\'s bar reads ' + (kc - kd).toFixed(2) + ' frame later than the panel after the same press: x = 3.4 - ' + (kc - kd).toFixed(2) + ' = ' + xc.toFixed(2));
  const likC = x => FIX.cloudNineOutcomes.reduce((a, [n, c, lo, hi, pp, o]) => { const i = inWin(c, x, lo, hi), pm = i ? pp : 0.495; return a + Math.log(o === 'miss' ? pm : 1 - pm); }, 0);
  const xs = []; for (let x = -3; x <= 5.0001; x += 0.05) xs.push(+x.toFixed(2)); const LC = xs.map(likC), mC = Math.max(...LC), okC = xs.filter((x, i) => LC[i] > mC - 0.7);
  check(!okC.some(x => x > -1.2 && x < 2.15) && likC(2.25) > mC - 0.01 && likC(2.5) > mC - 0.01 && likC(1.15) < mC - 3, '2. the six Cloud Nine outcomes (0dfd444d T1 added): no offset in -1.2 .. +2.15 within 0.7 of the best (v94\'s +1.15 at ' + (likC(1.15) - mC).toFixed(1) + '); the best from +2.25, +2.5 among them');
  const DN = F95.doNothing.concat(FIX.doNothingNew), likD = x => DN.reduce((a, [n, c, lo, hi, pp, o, ph]) => { const i = inWin(c, x, lo, hi, ph), pm = i ? pp : (/T4/.test(n) ? 0.39 : 0.5); return a + Math.log(o === 'miss' ? pm : 1 - pm); }, 0);
  const LD = xs.map(likD), mD = Math.max(...LD), topD = xs.filter((x, i) => LD[i] > mD - 0.7);
  check(likD(3.4) > mD - 0.2 && topD[topD.length - 1] <= 3.55 && likD(1.8) < mD - 2.5, '2./3. the 10 Do Nothing outcomes (0dfd444d T2 hit at +1.79, T4 the wave missed at +1.37): 3.4 within ' + (mD - likD(3.4)).toFixed(2) + ' of the best, nothing above ' + topD[topD.length - 1] + '; a runner on the beep (offset 1.8) ' + Math.exp(mD - likD(1.8)).toFixed(0) + ':1 against');
  const band = [Math.max(2.25, 3.4 + kd - kc - (3.4 - 3.12)), 3.55 + kd - kc];
  check(band[0] <= 2.5 && 2.5 <= band[1], '2. with the Do Nothing offset 3.12 .. 3.55 (Cloud Nine\'s floor 2.25 = 3.12 there): Cloud Nine 2.25 .. ' + band[1].toFixed(2) + ', the page\'s 2.5 inside');
  // ---- 3. the runner
  const L = FIX.leverStore, lagWin = mean(FIX.presses.filter(r => /^00700c7e/.test(r[0]) && r[1] === 'S').map(r => r[4])), lagNew = mean(FIX.presses.filter(r => /^(906bfb29|1509e942|0dfd444d)/.test(r[0]) && r[1] === 'S').map(r => r[4]));
  check(L.every(x => x > 0.7) && mean(L) > 1.5 && (lagNew - lagWin) / 2 > 0.6, '3. the runner is late: the six stored presses +' + Math.min(...L) + ' .. +' + Math.max(...L) + ' (mean ' + mean(L).toFixed(2) + '); the overlay A ' + (lagNew / 2).toFixed(2) + ' frames after the beep against ' + (lagWin / 2).toFixed(2) + ' on the attempt that won');
  // ---- page
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(L => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', off: '-5', vlag: '50' })); localStorage.setItem('tot-fb14press-v93', JSON.stringify(L)); } catch (e) {} }, L);
  await p.goto('file://' + PAGE);
  check(await p.evaluate(() => window.__tot.VERSION) === 'v96', 'page version v96');
  const k = await p.evaluate(() => { const X = window.__fb14; return { bar: X.readX('M', 'bar'), S: X.readX('S'), unc: X.C9UNC, sh: X.C9SHIFTS.map(x => x[0]), drop: X.TICK_DROP, tol: X.ANCHOR_TOL }; });
  check(k.bar === 2.5 && k.S === 3.4, '2. FB14_READX: Cloud Nine\'s bar +2.5 (v94 +1.15), Do Nothing +3.4');
  check(JSON.stringify(k.unc) === '[[-1,0.2],[0,0.6],[1,0.2]]' && k.sh.join() === '-3,-2,-1,0,1,2,3', '2. the T1 share over -1 .. +1 (0.2 / 0.6 / 0.2; v95 -2 .. +3 even), the Cloud Nine confirm carried on -3 .. +3');
  // ---- 3. the learned correction on the six presses
  const lb = await p.evaluate(() => { const T = window.__tot, X = window.__fb14; X.reset(); X.FB14.t0 = 1000; X.FB14.rate = 33.367; return { bias: T.leverBias('fb14'), n: T.leverList('fb14').length, pt: X.pressT(900), v85: 1000 + (900 - 1.7 - 5) * 33.367 - 50 }; });
  check(lb.n === 6 && Math.abs(lb.bias + mean(L) * 6 / 10) < 0.01 && Math.abs((lb.pt - lb.v85) / 33.367 - lb.bias) < 0.01, '3. LEVER_LEARN on: the six presses give ' + lb.bias.toFixed(2) + ' frame (shrunk 6/10 of the mean): the beeps ' + Math.abs(lb.bias).toFixed(2) + ' frame earlier');
  // ---- 4. the replan anchor
  check(k.drop === 0.25 && k.tol === 0.1, '4. the tick replans at a drop of 0.25 (v95 0.15: 0dfd444d T2\'s second replan came at 0.775 of 0.989) or under the edge');
  const an = await p.evaluate(() => { const X = window.__fb14; X.reset(); const out = {};
    // shares on 198 .. 240 (a = 198): 205 fell to 0.49 after the coin, 212 .. 214 hold 0.99, 227 0.99 (the plan's best of the next second)
    const mk = (fn) => { const share = []; for (let c = 198; c <= 240; c++) share.push(fn(c)); return { target: null, w: null, none: null, a: 198, share, doubt: 0.017, pp: null }; };
    const sh1 = c => (c >= 212 && c <= 214) ? 0.99 : c === 227 ? 0.995 : c === 205 ? 0.49 : 0.3;
    // the first plan of the turn sets the anchor
    let C = mk(c => c === 205 ? 0.81 : 0.3); C.target = 205; C.pp = 0.81; X.anchor(C, 198, 30, 2, [[0, 1]]); out.a0 = X.FB14.anchor[2];
    C = mk(sh1); C.target = 227; C.pp = 0.995 * 0.983 + 0.017 * 0.495; X.anchor(C, 198, 30, 2, [[0, 1]]); out.r1 = { target: C.target, w: C.w, pp: +C.pp.toFixed(3) };
    // the old frame still works: kept
    C = mk(c => c === 205 ? 0.97 : c === 227 ? 0.995 : 0.3); C.target = 227; C.pp = 0.995 * 0.983 + 0.017 * 0.495; X.anchor(C, 198, 30, 2, [[0, 1]]); out.r2 = C.target;
    // nothing near works: the best is taken (logged as moved)
    C = mk(c => c === 236 ? 0.99 : 0.2); C.target = 236; C.pp = 0.99; X.anchor(C, 206, 30, 2, [[0, 1]]); out.r3 = C.target;
    out.log = X.slogTail(10).filter(e => /^fb14Replan/.test(e.ev)).map(e => e.ev);
    return out; });
  check(an.a0 === 205 && an.r1.target === 212 && an.r1.w.start === 212 && an.r1.w.end === 214, '4. 0dfd444d T2 shape: the first plan (205) anchors the turn; a replan whose best is 227 takes 212 (window 212-214, ' + an.r1.pp + '), the workable frame nearest 205, not the best of the next second');
  check(an.r2 === 205, '4. a replan keeps the anchored frame while it is within ' + k.tol + ' of the best (the runner keeps the beep he is counting on)');
  check(an.r3 === 236 && an.log.includes('fb14ReplanNear') && an.log.includes('fb14ReplanMoved'), '4. with nothing workable near it the plan moves (logged fb14ReplanMoved)');
  // ---- 5. T6
  const t6 = await p.evaluate(() => { const T = window.__tot, RT = T.RT(), i = RT.findIndex(s => s.turn === 'fb2_k'), j = RT.findIndex(s => s.fb14 === 4 && s.fb14role === 'lever');
    T.setStep(j); T.st.msg = null; T.setStep(i); const h = document.getElementById('headline');
    const out = { head: h.textContent, bg: h.style.background, fs: h.style.fontSize, blink: h.classList.contains('hold-blink'), msg: T.st.msg, logged: T.SLOG.some(e => e.ev === 'fb2HoldShown'), chg: T.CHG.state };
    T.makePlan(); out.head2 = h.textContent; T.setStep(j); out.after = h.classList.contains('hold-blink'); return out; });
  check(/^HOLD THE \+3 POPUP/.test(t6.head) && /c62828|198, 40, 40/.test(t6.bg) && t6.fs === '1.9em' && t6.blink && t6.logged, '5. T6: the step arming (T4 -> T6, before any Charge: reader ' + t6.chg + ') shows "' + t6.head + '", red, 1.9em, blinking; logged fb2HoldShown');
  check(/^HOLD/.test(t6.msg) && /do NOT press A until the beep/.test(t6.msg) && /^HOLD THE \+3 POPUP/.test(t6.head2), '5. the detail: "' + t6.msg.slice(0, 70) + '…", and the plan loop keeps it until the popup beep');
  const T6 = FIX.t6_0dfd, s6 = T6.narrowMs - T6.stage.joint - T6.stage.stage2 - T6.stage.hyps;
  check(T6.tPopup < T6.tFb2Lock && T6.tFb2Lock - T6.tTrig === 2356 && s6 > 250, '5. 0dfd444d T6: the popup closed on k ' + T6.kSeen + ' at ' + (T6.tPopup - T6.tTrig) + ' ms after the trigger, the lock at ' + (T6.tFb2Lock - T6.tTrig) + ' ms; of the narrow\'s ' + T6.narrowMs + ' ms ' + s6 + ' are the workers starting (stage 2 ' + T6.stage.stage2 + '): a warm pool would land it ~0.3 s sooner, still after k 77');
  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  await b.close(); console.log(bad ? bad + ' FAILED' : 'all ok'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
