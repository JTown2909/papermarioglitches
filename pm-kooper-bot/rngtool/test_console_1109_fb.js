/* v88: the Final Bowser Charge reads of the console logs of 2026-11-09 (charge_live/README.md, v88).
 *  1. The placement on the console's picture clock (fixtures/console_1109_fb.json: capture times, levels and new-picture
 *     flags only): every placed picture fits a clock of 2 vblanks per game frame, frames that ran long and pictures one vblank
 *     late (a late picture and the next one are 1 vblank apart: consecutive frames, not a skip). v87 skipped a frame there on the flat part of Final Bowser's burst and
 *     read the rest of the Charge one frame off (4bc65351 T2: from frame 13 on). The control reads (Jr. Troopa, Hallway,
 *     Duplighosts) keep the frames they locked with.
 *  2. The T1 and T2 locks of one fight are one RNG stream (LCG steps between the two seeds): the console locks are true.
 *  3. With the logs (skipped when absent): the reads replayed through the page. c565d268 T1 and 4bc65351 T1 / T2 lock their
 *     seeds; b75b56e2 T1 and 4bc65351's first T2 make no confident lock (still unread: README v88, not done); that T2 read
 *     on the stream after its fight's T1 lock finds its seed; the control reads lock their live seeds.
 * usage: node test_console_1109_fb.js   (PAGE=path to timeout_timer_standalone.html; serves on 127.0.0.1 only) */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const SP = '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad';
const PAGE = process.env.PAGE || SP + '/timeout_timer/timeout_timer_standalone.html';
const LD = process.env.LOGS || '/tmp/claude-0/pm/logs1109';
const LOGS = { b75b56e2: 'b75b56e2-pm-rng-log-1794270556695.json', c565d268: 'c565d268-pm-rng-log-1794273124474.json', '4bc65351': '4bc65351-pm-rng-log-1794273591960.json' };
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_1109_fb.json'), 'utf8'));
let bad = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };
const fwd = (s, n) => { for (let i = 0; i < n; i++) s = (Math.imul(s, 0x5D588B65) + 1) >>> 0; return s; };
const steps = (a, b, max) => { let s = parseInt(a, 16) >>> 0; const t = parseInt(b, 16) >>> 0; for (let i = 0; i <= max; i++) { if (s === t) return i; s = fwd(s, 1); } return -1; };
const VB = 1000 / 29.97 / 2;
/* placed pictures (n per capture frame, -1 if not a game frame's first picture): how many steps no picture clock allows.
 * Between two placed pictures the vblanks are 2 per game frame, plus one per frame that ran long (never fewer), plus the
 * lateness change (each picture on time or one vblank late): the fewest steps with a negative "ran long" count over every
 * lateness assignment (a small DP). */
function clockBreaks(F, nOf, ti) {
  const P = []; for (let i = ti; i < F.length; i++) if (nOf[i] >= 3 && nOf[i] < 48) P.push(i);
  let c = [0, 0];
  for (let k = 1; k < P.length; k++) { const dv = Math.round((F[P[k]][0] - F[P[k - 1]][0]) / VB), dn = nOf[P[k]] - nOf[P[k - 1]], nc = [1e9, 1e9];
    for (let L = 0; L < 2; L++) for (let Lp = 0; Lp < 2; Lp++) nc[L] = Math.min(nc[L], c[Lp] + (dv - 2 * dn - (L - Lp) < 0 ? 1 : 0)); c = nc; }
  return Math.min(c[0], c[1]);
}
(async () => {
  const srv = http.createServer((q, r) => { if (!q.url.startsWith('/tot.html')) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': 'text/html' }); fs.createReadStream(PAGE).pipe(r); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:' + srv.address().port + '/tot.html');
  check(await p.evaluate(() => window.__tot.VERSION) === 'v88', 'page version v88');
  // ---- 1. the placement
  for (const R of FIX.reads) {
    const out = await p.evaluate(R => { const T = window.__tot, FR = 1000 / 29.97;
      const frames = R.F.map(e => ({ t: e[0], m: e[1], fresh: e[2], Y: null })), tg = R.trig;
      const trig = { t: -(tg.n - 3) * FR, tRaw: 0, n: tg.n, base: tg.base, i: tg.i, d0: tg.d0, cut: tg.cut };
      return T.chgPlaceTest(frames, trig, R.prof); }, R);
    const nOld = R.F.map(() => -1); R.oldG.forEach((gi, n) => { if (gi != null && gi >= 0 && nOld[gi] < 0) nOld[gi] = n; });
    const bNew = clockBreaks(R.F, out.n, R.trig.i), bOld = clockBreaks(R.F, nOld, R.trig.i), tag = R.log + ' ' + R.stepT + ' (' + R.prof + ')';
    check(bNew === 0, '1. ' + tag + ': every picture on a possible game-frame clock (steps off: v88 ' + bNew + ', v87 ' + bOld + ')');
    if (R.prof !== 'fb1') { let same = 0, all = 0; for (let n = 3; n < 37; n++) { const gi = R.oldG[n]; if (gi == null) continue; all++; if (out.n[gi] === n) same++; }
      check(same >= all - 2, '1. ' + tag + ': the frames it locked with (live ' + R.live.seed + ') are placed as before (' + same + ' / ' + all + ')'); }
  }
  const b4 = FIX.reads.find(R => R.log === '4bc65351' && R.idx === 8), n4 = b4.F.map(() => -1); b4.oldG.forEach((gi, n) => { if (gi != null && gi >= 0 && n4[gi] < 0) n4[gi] = n; });
  check(clockBreaks(b4.F, n4, b4.trig.i) >= 1, '1. (v87 placed 4bc65351 T2 off the clock: ' + clockBreaks(b4.F, n4, b4.trig.i) + ' steps)');
  // ---- 2. one stream per fight
  const S = FIX.v88.stream;
  check(steps(S.t1t2[0], S.t1t2[1], 10000) === S.t1t2[2], '2. 4bc65351 2nd fight: T1 lock ' + S.t1t2[0] + ' -> T2 lock ' + S.t1t2[1] + ' in ' + S.t1t2[2] + ' LCG steps');
  check(steps(S.c56t2[0], S.c56t2[1], 10000) === S.c56t2[2], '2. c565d268 fight: T1 lock ' + S.c56t2[0] + ' -> its T2 seed ' + S.c56t2[1] + ' in ' + S.c56t2[2] + ' steps (as many as the other fight)');
  // ---- 3. the reads replayed (the logs hold the pictures; never committed)
  const caps = {}; for (const [k, f] of Object.entries(LOGS)) { const fp = path.join(LD, f); if (fs.existsSync(fp)) caps[k] = JSON.parse(fs.readFileSync(fp, 'utf8')).chargeCaptures; }
  if (Object.keys(caps).length < 3) console.log('skip 3: the 2026-11-09 logs are not in ' + LD);
  else {
    const replay = (c, alts, cands) => p.evaluate(async ([c, alts, cands]) => { if (cands) c = Object.assign({}, c, { cands }); const r = await window.__tot.chgReplay(c, { maxAlts: alts });
      return { state: r.state, best: r.best, attempts: r.attempts.length }; }, [c, alts, cands || null]);
    for (const [key, [seed, ratio]] of Object.entries(FIX.v88.locks)) {
      const [k, i] = key.split(':'), r = await replay(caps[k][+i], 3), live = caps[k][+i].result;
      check(r.state === 'locked' && r.best.seed === seed && r.best.ratio >= ratio, '3. ' + key + ' ' + caps[k][+i].stepT + ' locks ' + seed + ': ' + (r.best && r.best.score + ' / ' + r.best.ratio) + ' (live ' + live.score + ' / ' + live.ratio + ')');
    }
    for (const key of FIX.v88.noise) {
      const [k, i] = key.split(':'), r = await replay(caps[k][+i], 3);
      check(r.state !== 'locked' || r.best.ratio < 1.8, '3. ' + key + ' ' + caps[k][+i].stepT + ': no confident lock (' + r.state + ' ' + (r.best && r.best.seed + ' ' + r.best.score + ' / ' + r.best.ratio) + ')');
    }
    const u = new Uint32Array(2500); let s = fwd(parseInt(S.c56t2[0], 16) >>> 0, 1500); for (let i = 0; i < u.length; i++) { u[i] = s; s = fwd(s, 1); }
    const rs = await replay(caps['4bc65351'][8], 0, Buffer.from(u.buffer).toString('base64'));
    const k2 = rs.best ? steps(S.c56t2[0], rs.best.seed, 5000) : -1;
    check(rs.state === 'locked' && Math.abs(k2 - S.c56t2[2]) <= 48, '3. 4bc65351 T2 (c565d268 fight) on the stream 1500-4000 steps after its T1 lock: ' + (rs.best && rs.best.seed + ' ' + rs.best.score + ' / ' + rs.best.ratio) + ', ' + k2 + ' steps (the same stream as ' + S.c56t2[1] + ' within 48)');
    for (const R of FIX.reads.filter(R => R.prof !== 'fb1')) {
      const r = await replay(caps[R.log][R.idx], 2);
      check(r.state === 'locked' && r.best.seed === R.live.seed, '3. control ' + R.log + ' ' + R.stepT + ' locks ' + R.live.seed + ' (' + (r.best && r.best.seed + ' ' + r.best.score + ' / ' + r.best.ratio) + ', live ' + R.live.score + ' / ' + R.live.ratio + ')');
    }
  }
  check(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); srv.close();
  console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
