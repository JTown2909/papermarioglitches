/* v94: the true press timing on console (charge_live/README.md v94; fixtures/console_v94.json, numbers only).
 *  1. The clips with both input displays (11-09): the practice ROM's own display shows the A 8 vblanks after the external
 *     overlay; from it the Strategies panel close (the page's read) is 2 vblanks on every screen (Final Bowser, Jr. Troopa,
 *     Duplighosts), a Charge's bar hide 4, Cloud Nine's bar hide 6-7. The Nov 12 clips (overlay only) have the same
 *     overlay -> event delays within a vblank (no practice ROM lag to correct).
 *  2. The Final Bowser Do Nothing outcomes (00700c7e T2 / T3, a87486a0 T2 / T4): no constant offset fits on the trigger
 *     picture's clock (v93); with a87486a0 T4's clock moved a frame (its trigger picture is the burst's frame 2), one
 *     offset fits all four: 3.26 .. 3.51; the page takes 3.4, Cloud Nine's bar 3.4 - 2.25.
 *  3. The page: the readings (FB14_READX), a Do Nothing / Cloud Nine confirm at the logged closes, the beeps not moved.
 *  4. The burst phase fit on the 31 console fb1 captures: a87486a0 T4 and 1de38253 T2 a frame early, the rest on frame 3;
 *     the live anchor (fb14TrigT) on a capture.
 *  5. Jr. Troopa / Duplighosts / Hallway: their Strategies vanish (2.2) and the other profiles unchanged.
 * usage: node test_console_v94.js [page] */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const SP = '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad';
const PAGE = process.argv[2] || process.env.PAGE || SP + '/timeout_timer_v101/timeout_timer_standalone.html';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v94.json'), 'utf8'));
let bad = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };
const median = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
(async () => {
  // ---- 1. the displays
  const H = FIX.overlayToInGameIsolated, iso = []; for (const [k, n] of Object.entries(H)) for (let i = 0; i < n; i++) iso.push(+k);
  const m = mean(iso), sd = Math.sqrt(mean(iso.map(x => (x - m) ** 2)));
  check(iso.length === 67 && median(iso) === 8 && Math.abs(m - 8.0) < 0.3, '1. the in-game A shows ' + median(iso) + ' vblanks (median; mean ' + m.toFixed(2) + ', sd ' + sd.toFixed(2) + ', ' + Math.min(...iso) + '-' + Math.max(...iso) + ') after the overlay A, ' + iso.length + ' isolated presses');
  check(FIX.inGameTo.strategiesClose.every(x => x === 2), '1. in-game A -> the Strategies panel close: 2 vblanks on all ' + FIX.inGameTo.strategiesClose.length + ' (Final Bowser as Jr. Troopa / Duplighosts)');
  const c9 = mean(FIX.inGameTo.cloudNineHide), dC = (c9 - 2) / 2;
  check(Object.keys(FIX.inGameTo.chargeHide).join() === '4' && Math.abs(dC - FIX.fit.cloudNineMinusPanel) < 0.2, '1. a Charge\'s bar hides 4 vblanks after the in-game A, Cloud Nine\'s ' + FIX.inGameTo.cloudNineHide.join('/') + ': its read is ' + dC.toFixed(2) + ' frames later than the panel\'s for the same press');
  const O = FIX.overlayTo, dCh = mean(O.nov12.chargeHide) - mean(O.practice1109.chargeHideFb), dCl = mean(O.nov12.strategiesClose) - mean(O.practice1109.strategiesClose);
  check(Math.abs(dCh) < 1.5 && Math.abs(dCl) < 1.5 && Math.abs(FIX.consoleRate.practice1109 - FIX.consoleRate.page) < 0.01, '1. overlay -> events on Nov 12 against the practice ROM clips: Charge hide ' + dCh.toFixed(2) + ', panel close ' + dCl.toFixed(2) + ' vblanks; the frame time ' + FIX.consoleRate.practice1109 + ' ms (no extra lag measured)');
  // ---- 2. the outcomes
  const fits = (r, x, ph) => { const F = Math.round(r.c + x + (ph ? r.phaseShift : 0)), inW = F >= r.win[0] && F <= r.win[1]; return r.outcome === 'miss' ? inW : !inW; };
  const xs = []; for (let x = -3; x <= 6.001; x += 0.01) xs.push(+x.toFixed(2));
  const v93 = xs.filter(x => FIX.doNothing.every(r => fits(r, x, false))), v94 = xs.filter(x => FIX.doNothing.every(r => fits(r, x, true)));
  check(v93.length === 0, '2. on the trigger picture\'s clock no constant offset fits the four Do Nothing outcomes (v93)');
  check(v94.length > 0 && Math.abs(v94[0] - FIX.fit.S[0]) < 0.011 && Math.abs(v94[v94.length - 1] - FIX.fit.S[1]) < 0.011, '2. with a87486a0 T4\'s clock a frame later: one offset fits all four, ' + v94[0] + ' .. ' + v94[v94.length - 1]);
  check(v94.includes(FIX.fit.chosenS), '2. the page\'s ' + FIX.fit.chosenS + ' is inside');
  for (const r of FIX.doNothing) { const lead = (r.ovA - r.tPress) / 33.427; check(lead > 1.5 && lead < 4.5, '2. ' + r.log + ' T' + r.turn + ': the overlay A ' + lead.toFixed(2) + ' frames after the beep\'s press time; read ' + (r.c + FIX.fit.chosenS + r.phaseShift).toFixed(2) + ' (window ' + r.win.join('-') + ', ' + (r.outcome === 'miss' ? 'Bowser missed' : 'Bowser hit') + ')'); }
  for (const r of FIX.cloudNine) { const F = Math.round(r.c + FIX.fit.bar), inW = F >= r.win[0] && F <= r.win[1]; check(r.outcome === 'hit' && (!inW || r.pp < 0.85), '2. Cloud Nine ' + r.log + ' T' + r.turn + ': read ' + (r.c + FIX.fit.bar).toFixed(2) + ', window ' + r.win.join('-') + ', hit' + (inW ? ' (in the window: a ' + Math.round(100 * (1 - r.pp)) + '% miss of the plan)' : ' (outside)')); }
  check(Math.abs(FIX.fit.bar - (FIX.fit.chosenS - FIX.fit.cloudNineMinusPanel)) < 1e-9, '2. Cloud Nine\'s bar: ' + FIX.fit.chosenS + ' - ' + FIX.fit.cloudNineMinusPanel + ' = ' + FIX.fit.bar);
  // ---- the page
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', off: '-5', vlag: '50' })); } catch (e) {} });
  await p.goto('file://' + PAGE);
  check(await p.evaluate(() => window.__tot.VERSION) === 'v101', 'page version v101');
  // ---- 3. the readings
  const r3 = await p.evaluate(D => { const T = window.__tot, X = window.__fb14, FB = X.FB14, RT = T.RT(), out = { readS: X.readX('S'), readBar: X.readX('M', 'bar'), readM: X.readX('M'), vanS: X.van('S'), shifts: X.SHIFTS_S.map(x => x[0]) };
    const mk = () => X.fbNew({ s: 1, nc: 0, f: 0, c: new Uint8Array(20), ph: [0, 0], l: 0, rg: 0, w: 1, from: 0, sh: [], tag: 2 });
    out.c = [];
    for (const r of D) { const i = RT.findIndex(s => s.fb14 === Math.min(r.turn, 4) && s.fb14role === 'lever' && s.cat === 'S'); T.setStep(i); X.reset();
      const t0 = performance.now() - 30000; Object.assign(FB, { on: true, t0, rate: 33.427, states: [mk()], M: { 1: 0, 2: 0, 4: 0 } });
      X.confirm(t0 + (r.c + 2) * 33.427, RT[i]); const L = X.slogTail(20).filter(e => e.ev === 'fb14Confirm').pop(); out.c.push(L ? L.c : null); }
    { const i = RT.findIndex(s => s.fb14 === 1 && s.fb14role === 'lever'); T.setStep(i); X.reset(); const t0 = performance.now() - 30000; Object.assign(FB, { on: true, t0, rate: 33.427, states: [mk()], M: { 1: 0 } });
      X.confirm(t0 + 345.55 * 33.427, RT[i]); out.cnScreen = (X.slogTail(20).filter(e => e.ev === 'fb14Confirm').pop() || {}).c; }
    X.reset(); FB.t0 = 1000; FB.rate = 33.367; out.pt = X.pressT(900); out.v85 = 1000 + (900 - 1.7 - 5) * 33.367 - 50;
    return out; }, FIX.doNothing);
  check(r3.readS === 3.4 && r3.readBar === 2.5 && r3.readM === 0 && Math.abs(r3.vanS - (2 - 3.4)) < 1e-9, '3. FB14_READX: Do Nothing +3.4, Cloud Nine by the bar +2.5 (v96, pinned: test_console_v96; v94 +1.15), a Mario target screen 0 (vanish S ' + r3.vanS.toFixed(2) + ')');
  FIX.doNothing.forEach((r, k) => check(r3.c[k] != null && Math.abs(r3.c[k] - (r.c + 3.4)) < 0.02, '3. ' + r.log + ' T' + r.turn + ': the close that v92 read ' + r.c + ' reads ' + (r3.c[k] == null ? '-' : r3.c[k].toFixed(2))));
  check(r3.cnScreen != null && Math.abs(r3.cnScreen - 344.55) < 0.02, '3. Cloud Nine\'s own screen close (cat M, not the bar) is read as before: ' + r3.cnScreen);
  check(r3.shifts.join() === '-3,-2,-1,0,1,2,3', '3. the Do Nothing shifts -3 .. +3 around the v94 reading (v93: -2 .. +5 around v92\'s)');
  check(Math.abs(r3.pt - r3.v85) < 0.01, '3. the beeps are not moved (pressT on v85\'s frame): the runner on the beep landed on the frame');
  // ---- 4. the burst phase
  const r4 = await p.evaluate(C => C.map(c => window.__fb14.phaseFit(c.pts)), FIX.fb1Captures);
  FIX.fb1Captures.forEach((c, k) => { const d = r4[k], sh = d == null ? 0 : d <= -0.5 ? -1 : d >= 0.5 ? 1 : 0;
    check(sh === c.shift, '4. ' + c.log + ' ' + c.turn + ' ' + c.wall + ' (d0 ' + c.d0 + '): fit ' + d + ', anchor ' + (sh ? (sh > 0 ? '+' : '') + sh : 'kept')); });
  const r4b = await p.evaluate(c => { const T = window.__tot, X = window.__fb14, C = T.CHG, keep = { prof: C.prof, trig: C.trig, frames: C.frames }, FR = 1000 / (60000 / 1001 / 2), base = 81.5;
    C.prof = { id: 'fb1' }; C.trig = { t: 50000, base }; C.frames = c.pts.map(([t, v]) => ({ t: 50000 + t * FR, m: base + v, rep: false }));
    const out = { t: X.trigT(), FR }; C.prof = { id: 'jr' }; out.jr = X.trigT(); Object.assign(C, keep); return out; }, FIX.fb1Captures.find(c => c.log === 'a87486a0' && c.turn === 'T4'));
  check(Math.abs(r4b.t - (50000 + r4b.FR)) < 0.01 && r4b.jr === 50000, '4. live: a87486a0 T4\'s capture puts the anchor a frame after its trigger picture (fb1 only; a Jr. Troopa trigger kept)');
  // ---- 5. the other fights
  const r5 = await p.evaluate(() => { const R = window.__tot.R || window.R; const P = R && R.PROFILES; return P ? { jr: P.jrcc_nothing.vanish, dup3: P.dup3.vanish, dup4: P.dup4.vanish } : null; });
  check(r5 && r5.jr === 2.2 && r5.dup3 === 2.2 && r5.dup4 === 2.2, '5. Jr. Troopa / Duplighosts Strategies vanish 2.2 (v90) unchanged: ' + JSON.stringify(r5));
  check(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
