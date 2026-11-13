/* v100: the picture's evidence on Final Bowser (fb14_live.js fbAtkFrame / fbAtkDecide / fbBoltFrame / fb14V100), numbers
 * only in fixtures/console_v100.json (no picture).
 * 1. Bowser's attack per turn from the game box: the fire breath (orange share), claw or slam (where his warm colours go):
 *    the console clips' calibration in the fixture, and the classifier on synthetic grids.
 * 2. A state whose AI picked another attack that turn is cut (FB14_ATKW / FB14_CLSW), counted per evidence, and the doubt
 *    before / after is returned; off the model the attack is as likely as Bowser's odds.
 * 3. The stage lightning: an onset of new violet points after quiet pictures is a bolt; with FB14_BOLT_D set, a state with
 *    no draw of its phases near the bolt keeps FB14_BOLT_W.
 * usage: node test_fb14_v100.js */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'charge_live', 'fb14_live.js'), 'utf8');
const window = {}, stub = 'const FRAME = 1000 / 29.97, slog = (e, o) => (globalThis.__slog = globalThis.__slog || []).push([e, o]), $ = () => null, isRoute = () => false, RT = () => [], routeStep = 0, st = {}, V = {}, CHG = {};\n' +
  'const ZW_PMISS = 0.02, ZW_FALSE = 1.8e-4, ZW_RHO = 0.3 / 31.2, ZW_CUT = 1e-4, ZW_MAXERR = 3, ZW_BG0 = 0.05; const num = k => ({ zwedge: 0.4, vlag: 0, off: 0 })[k] || 0;\n';
new Function('window', stub + src)(window);
const F = window.__fb14, X = F.FB14, V = F.v100, FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v100.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const logs = n => (globalThis.__slog || []).filter(x => x[0] === n).map(x => x[1]);
// 1. the calibration (console clips of Nov 12 and the emulator)
{ const C = FIX.attack; let fireOk = 0, n = 0;
  for (const r of C.turns) { n++; const cls = r.fireMax >= V.FIRE.px && r.fireRunS >= 1.5 ? 'fire' : r.fireMax < V.FIRE.none ? 'nofire' : '?'; if ((cls === 'fire') === (r.truth === 'fire') && cls !== '?') fireOk++; }
  ok(fireOk === n, 'fire / not fire on ' + n + ' console and emulator Bowser turns: ' + fireOk + ' right (fire 0.13-0.34 for 2.5-3 s; no fire at most ' + C.noFireMax + ')');
  const sl = C.turns.filter(r => r.truth === 'slam' && r.minC != null), cl = C.turns.filter(r => r.truth === 'claw' && r.minC != null);
  ok(sl.every(r => r.minC <= V.CLS.slam) && cl.every(r => r.minC >= V.CLS.claw), 'claw / slam margin: slams ' + sl.map(r => r.minC).join(', ') + ' <= ' + V.CLS.slam + ', claws ' + cl.map(r => r.minC).join(', ') + ' >= ' + V.CLS.claw); }
// the classifier on synthetic 32x24 game grids
function grid(fire, cx) { const g = new Uint8ClampedArray(32 * 24 * 4); for (let j = 0; j < 32 * 24; j++) { const x = j % 32, y = Math.floor(j / 32); let c = [30, 20, 60];
  if (cx != null && Math.abs(x + 0.5 - cx * 32) < 3 && y > 6 && y < 20) c = [230, 190, 60];
  if (fire && x < 13 && y > 6 && y < 20) c = [255, 120, 20]; g.set([...c, 255], j * 4); } return g; }
function turn(k, frames) { X.atk = {}; X.atkW = {}; X.hit = null; X.pT = { [k]: 1000 }; let t = 1100; for (const [n, fire, cx] of frames) for (let i = 0; i < n; i++) { window.__fbVisTest = () => grid(fire, cx); V.atkFrame(t += 16.7, true); } V.atkDecide(k); return X.atk[k]; }
{ ok(turn(1, [[200, false, 0.6], [150, true, 0.6], [200, false, 0.6]]).fire === true, 'a 2.5 s fire run: fire');
  const a = turn(2, [[200, false, 0.6], [80, false, 0.18], [200, false, 0.6]]); ok(a.fire === false && a.cls === 'slam', 'no fire, Bowser\'s colours down to x 0.18: a body slam (' + JSON.stringify(a) + ')');
  const b = turn(3, [[300, false, 0.6], [100, false, 0.35], [100, false, 0.6]]); ok(b.fire === false && b.cls === 'claw', 'no fire, down to x 0.35: a claw');
  const c = turn(2, [[300, false, 0.6], [100, false, 0.27]]); ok(c.fire === false && c.cls === null, 'inside the margin: claw or slam unread');
  const d = turn(1, [[100, false, 0.6]]); ok(d.fire === null, 'a stretch watched under 4 s: unread');
  X.pT = { 1: 1000 }; X.atk = {}; X.atkW = {}; X.hit = 1; for (let i = 0; i < 400; i++) { window.__fbVisTest = () => grid(false, 0.2); V.atkFrame(1100 + 16.7 * i, true); } V.atkDecide(1); ok(X.atk[1].fire === false && X.atk[1].cls === null, 'a hit turn: not fire, claw / slam not read (the revive moves the camera)'); }
// 2. the cut, from the model: carried T1 states whose AI picks differ
{ const R = 33.367; Object.assign(X, { on: true, t0: 0, rate: R, taps: [], vis: [], visFrom: null, bg: 0.05, bgFrom: 0, inputs: [], gone: false, allOutLogged: false, missed: null, hit: null, wide: false, bolts: [] });
  let r = 11; const rnd = () => (r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296; const L = [];
  for (let i = 0; i < 400; i++) { const S = F.fbNew({ s: (rnd() * 4294967296) >>> 0, nc: 100 + i % 24, f: 100, c: new Uint8Array(20), ph: [i % 130, (i * 7) % 220], l: 0, w: 1, from: 100, sh: [] }); S.ev.push({ k: 'ai', f: 200, turn: 1 }); F.fbRun(S, 300); L.push(S); }
  X.states = L; const by = {}; for (const S of L) by[S.out[1].atk] = (by[S.out[1].atk] || 0) + 1;
  ok(by.fire > 100 && by.claw > 30 && by.slam > 30, 'Bowser\'s T1 picks over 400 random states: ' + JSON.stringify(by));
  X.atk = {}; const W0 = F.weigh(320); X.atk = { 1: { fire: true, cls: null } }; const W1 = F.weigh(320);
  ok(W1.cnt.fire === by.claw + by.slam && W1.kept === W0.kept, 'fire seen: ' + W1.cnt.fire + ' states cut to ' + V.ATKW + ' (claw + slam), kept by the coin\'s rule ' + W1.kept);
  ok(W1.doubt > W0.doubt * 0.5 && W1.doubt < W0.doubt * 1.6, 'the doubt before / after ' + W0.doubt.toFixed(4) + ' / ' + W1.doubt.toFixed(4) + ' (off the model, fire about half)');
  const sumF = L.filter(S => S.out[1].atk === 'fire').reduce((a, S) => a + S.lw, 0), sumO = L.filter(S => S.out[1].atk !== 'fire').reduce((a, S) => a + S.lw, 0);
  ok(sumO / (sumF + sumO) < 0.01, 'the weight left on other attacks ' + (sumO / (sumF + sumO)).toExponential(2));
  X.atk = { 1: { fire: false, cls: 'slam' } }; const W2 = F.weigh(320); ok(W2.cnt.fire === by.fire && W2.cnt.cls === by.claw, 'slam seen: fire states cut ' + W2.cnt.fire + ', claws ' + W2.cnt.cls + ' to ' + V.CLSW);
  const W3 = V.weigh0(320); ok(W3.cnt === null && Math.abs(W3.doubt - W0.doubt) < 1e-12, 'weighed without the picture: as v99');
  X.atk = { 1: { fire: true, cls: null } }; X.states = L.filter(S => S.out[1].atk === 'claw'); const W4 = F.weigh(320); ok(W4.doubt > 0.55, 'every carried state contradicted: doubt ' + W4.doubt.toFixed(3) + ' (over FB14_EDGE_OFF: no edge, never a confident beep)'); X.atk = {}; }
// 3. the lightning
{ X.atk = {}; X.atkW = {}; X.pT = {}; X.lastBurst = null; X.boltW = null; X.bolts = []; X.t0 = 0; X.rate = 33.367; globalThis.__slog = [];
  const sky = bolt => { const n = V.BOLT.gw * V.BOLT.gh, g = new Uint8ClampedArray(n * 4); for (let j = 0; j < n; j++) { const x = j % V.BOLT.gw; g.set(bolt && Math.abs(x - bolt) < 1 ? [190, 110, 250, 255] : [35, 25, 70, 255], j * 4); } return g; };
  const seq = [[20, 0], [8, 30], [30, 0], [3, 10], [3, 0], [10, 50], [40, 0]]; let t = 0;
  for (const [n, b] of seq) for (let i = 0; i < n; i++) { window.__fbVisTest = () => sky(b); V.boltFrame(t += 33.367, true); }
  const on = logs('fb14Bolt'); ok(on.length === 2, 'bolt onsets after quiet pictures: ' + on.map(o => o.F).join(', ') + ' (the third came 3 pictures after one: not quiet)');
  ok(V.boltD() === null || typeof V.boltD() === 'number', 'FB14_BOLT_D ' + V.boltD());
  const S = F.fbNew({ s: 1, nc: 0, f: 0, c: new Uint8Array(20), ph: [0, 0], l: 0, w: 1, from: 0 }); let fb = -1; for (let f = 10; f < 300; f++) if (F.fbBolts ? 0 : 0) {}
  const drawF = []; for (let f = 10; f < 400; f++) { const m1 = f % 130, m2 = f % 220; if ([78, 83, 113, 118].includes(m1) || [18, 78, 88, 178].includes(m2)) drawF.push(f); }
  const c1 = { fire: 0, cls: 0, bolt: 0 }; const f1 = V.V(S, 500, [drawF[0] + 1, drawF[2] - 1], c1);
  const c2 = { fire: 0, cls: 0, bolt: 0 }; const f2 = V.V(S, 500, [drawF[0] + 9, 250.5 + 0.5], c2);
  ok(f1 === 1 && c1.bolt === 0, 'bolts at the state\'s draws (+-2 frames): kept (draws ' + drawF.slice(0, 4).join(', ') + ')');
  ok(f2 < V.BOLT_W + 1e-9 && c2.bolt === 1, 'bolts off its draws: ' + f2.toExponential(2)); }
console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
