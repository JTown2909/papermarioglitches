/* v105: each aura split of a lock's fit gets its own seed and next coin after the rays (README v105). Numbers only in
 * fixtures/e2e_v105.json.
 * 1. fbEnd48 (the window M + 13 .. M + 60 on the model) gives the true seed / coin of the e2e's 1234abcd T1 state, and not the
 *    seed the kernel gave the fit (its best split's).
 * 2. Two splits of one fit that move a count between a once-seen and a twice-seen residue end on different seeds.
 * 3. fb14Lock (node, stubbed page): a fit whose best split and another split end differently builds each split with its own
 *    seed; a split whose coins do not run as the fit's (q, second coin) says is not built.
 * 4. The e2e measurements (fixtures/e2e_v105.json "runs", when present).
 * usage: node test_fb14_v105.js */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8');
const window = {}, stub = 'const FRAME = 1000 / 29.97, slog = (e, o) => (globalThis.__slog = globalThis.__slog || []).push([e, o]), $ = id => null, isRoute = () => false, RT = () => [], routeStep = 0, st = {}, V = {}, CHG = { trig: { t: 0 }, info: {} }, chgRate = () => FRAME, SLOG = [];\n' +
  'let PATS = null; const fb2Patterns = () => PATS, setStep = () => {}, render = () => {};\n' +
  'const ZW_PMISS = 0.02, ZW_FALSE = 1.8e-4, ZW_RHO = 0.3 / 31.2, ZW_CUT = 1e-4, ZW_MAXERR = 3, ZW_BG0 = 0.05; const num = k => ({ zwedge: 0.4, vlag: 0, off: 0 })[k] || 0;\n' +
  'globalThis.__setPats = p => { PATS = p; }; globalThis.__CHG = CHG;\n';
new Function('window', stub + src)(window);
const F = window.__fb14, X = F.FB14, V5 = F.v105;
const logs = n => (globalThis.__slog || []).filter(x => x[0] === n).map(x => x[1]);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'e2e_v105.json'), 'utf8')), T1 = fx.t1_1234abcd, hx = s => parseInt(s, 16) >>> 0;
const C = s => Uint8Array.from(s.split('').map(Number));
// 1.
{ const E = V5.end48(hx(T1.x0), T1.M, T1.q, C(T1.c), T1.pa);
  ok(E.s === hx(T1.s61) && E.nc === T1.nc, 'fbEnd48: the true split ends on the game\'s seed ' + T1.s61 + ' and coin ' + T1.nc + ' (got ' + E.s.toString(16) + ', ' + E.nc + ')');
  ok(E.s !== hx(T1.bestSplitS48), 'the kernel\'s seed for the fit (its best split\'s, ' + T1.bestSplitS48 + ') is not the true split\'s');
  ok(JSON.stringify(E.sh) === JSON.stringify(T1.sh) && !E.shq, 'the window\'s shine on ' + T1.sh + ', the coin on q = ' + T1.q + ' not shining (the second coin follows: br 1)'); }
// 2. residue j of the rays' window (j = frame - 13 mod 20): frames 13 + j, + 20, + 40 inside 13..60 for j < 8 (three times), else twice
{ const c = C(T1.c), j3 = (13 + 2) % 20, j2 = (13 + 12) % 20;      // rays-window residues 2 (thrice) and 12 (twice)
  const a = c.slice(); const b = c.slice(); if (b[j2] > 0) { b[j2]--; b[j3]++; } else { b[j3]--; b[j2]++; }
  const Ea = V5.end48(hx(T1.x0), 0, T1.q, a, T1.pa), Eb = V5.end48(hx(T1.x0), 0, T1.q, b, T1.pa);
  ok(Ea.s !== Eb.s, 'a split moving one count from a twice-seen to a thrice-seen residue ends on another seed (' + Ea.s.toString(16) + ' / ' + Eb.s.toString(16) + ')'); }
// 3. the lock, stubbed: one fit (pattern 0 = the true phase pair), its best split some other split, the true split an alt
{ const c = C(T1.c), aura = j => Array.from({ length: 20 }, (_, i) => c[(13 + i) % 20]);
  const tr = aura(), other = tr.slice(); { const i = other.findIndex((x, k) => x > 0 && k >= 8); other[i]--; other[(i + 12) % 20 < 8 ? (i + 12) % 20 : 2]++; }
  const cOf = A => { const z = new Uint8Array(20); for (let i = 0; i < 20; i++) z[(13 + i) % 20] = A[i]; return z; };
  const Eo = V5.end48(hx(T1.x0), 0, T1.q, cOf(other), T1.pa);
  globalThis.__setPats({ list: [{ ph: [T1.pa] }] });
  const h = { p: 0, q: T1.q, br: T1.br, sc: 6000, esc: 6000, aura: other, alts: [other, tr], altSc: [6000, 6000], s48: Eo.s, nc48: Eo.nc - 13 };
  // a split whose first coin shines (the fit says the second coin follows on q + 24): out
  let qb = 0; while (qb < 23 && !V5.end48(hx(T1.x0), 0, qb, cOf(tr), T1.pa).shq) qb++; const Eb = V5.end48(hx(T1.x0), 0, qb, cOf(tr), T1.pa);
  const bad = { p: 0, q: qb, br: 1, sc: 5999, esc: 5999, aura: tr, alts: [tr], altSc: [5999], s48: Eb.s, nc48: Eb.nc - 13 };
  F.reset(); globalThis.__slog = [];
  const res = { fb1: { hyps: { a: hx(T1.a), best: 6000, v: 1, hy: [h, bad] } }, trigT: 16 * 1000 / 29.97, top: [{ seed: 1, sc: 6000 }, { seed: 2, sc: 1000 }] };
  let err = null; try { F.lock(res); } catch (e) { err = e; }
  ok(!err, 'fb14Lock ran on the stubbed page' + (err ? ': ' + err.message : ''));
  const L = X.states || [], trueS = L.filter(S => S.s === hx(T1.s61) && S.c.join('') === T1.c), wrong = L.filter(S => S.c.join('') === T1.c && S.s === Eo.s && Eo.s !== hx(T1.s61));
  if (process.env.DBG) console.log(trueS.map(S => [S.nc, S.f, S.l, S.sh, S.key]));
  ok(trueS.some(S => S.nc === T1.nc), 'the true split is built with its own seed and coin (' + trueS.filter(S => S.nc === T1.nc).length + ' states: the lags)');
  ok(wrong.length === 0, 'no state pairs the true split with the best split\'s seed (v104 built ' + 'those)');
  ok(L.some(S => S.s === Eo.s && S.c.join('') === Array.from(cOf(other)).join('')), 'the best split keeps its own seed');
  ok(Eb.shq && !L.some(S => S.nc === Eb.nc && S.sh.includes(13 + qb)), 'a split whose coins contradict its fit (q = ' + qb + ' shining, the fit says a second coin on q + 24) is not built');
  ok(logs('fb14SplitCoinOut').length === 1, 'the cut logged (fb14SplitCoinOut)');
  ok(trueS.filter(S => S.nc === T1.nc).every(S => S.sh.includes(54)), 'the window\'s own shine (54) is in the true states\' shines'); }
// 4.
{ const R = fx.runs; if (!R) console.log('(no runs in the fixture yet)'); else {
  ok(R.after.hiHit === 0, 'after: no plan >= 95% with Bowser hitting (' + R.after.hi + ' >= 95% of ' + R.after.plans + ')');
  ok(R.before.hiHit === 0, 'before: none either (' + R.before.hi + ' >= 95% of ' + R.before.plans + ')');
  ok(R.after.t1True > R.before.t1True, 'T1 locks holding the truth: ' + R.after.t1True + ' of ' + R.after.t1Locks + ' (before ' + R.before.t1True + ' of ' + R.before.t1Locks + '; 0badf00d\'s now)');
  ok(R.after.buckets.every(([lo, hi, n, m]) => !n || lo < 0.9 || m === n), 'after: every plan claimed >= 90% had Bowser miss'); } }
const tpl = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8'); ok(/VERSION = 'v10[5-9]'/.test(tpl), 'page VERSION v105+');
console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
