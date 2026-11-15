// v112: the page core (pmrng_core.js TURNS) against jr_pl_routelog.py's emulator logs of the partnerless route, frame by frame from
// the T1 Charge to the T7 Power Bounce confirm (W6=jr_whacka shows the v111 break at Whacka + 191). usage: node jr_pl_check.js LOG.json ...
// check the page core's partnerless JR_SEQ_PL draws against the emulator logs (pl_route_log.py)
const R = require(require('path').join(__dirname, 'pmrng_core.js')), fs = require('fs');
const COIN = '80146d54', W6 = process.env.W6 || 'nb_whacka';
for (const fn of process.argv.slice(2)) {
  const r = JSON.parse(fs.readFileSync(fn)), L = r.log.map(x => ({ s0: parseInt(x.s0, 16) >>> 0, c: x.c, hp: x.hp }));
  const inputs = [];
  for (const x of r.ev) { const m = /^T(\d) (.*)$/.exec(x.name); if (!m) continue; const t = +m[1], w = m[2];
    if (w === 'Charge') inputs.push({ f: x.f, id: 'jr_charge' }); else if (w === 'Maple Syrup') inputs.push({ f: x.f, id: 'nb_syrup' });
    else if (w === 'Whacka') inputs.push({ f: x.f, id: W6 });
    else if (w === 'Do Nothing') inputs.push({ f: x.f, id: (t === 1 || t === 6 || x.hp >= 6) ? 'jr_nothing_hit' : 'jr_nothing_cc' });
    else if (w === 'Power Bounce') inputs.push({ f: x.f, id: 'jr_pb', pb: true }); }
  const c0 = inputs[0].f; let nc = c0; while (!L[nc].c.some(x => x[0] === COIN)) nc++;
  const ev = R.buildEv(inputs), S = { s: L[c0].s0, nc, inst: [] }, pb = inputs.find(x => x.pb).f;
  let f = c0, msg = 'ok to PB confirm';
  for (; f <= pb; f++) { if ((S.s >>> 0) !== L[f].s0) { const pc = inputs.filter(x => x.f <= f).pop(); msg = 'mismatch at ' + f + ' (+' + (f - pc.f) + ' after ' + pc.id + ')'; break; } R.frameEv(S, f, ev); }
  // bounces: count from the log (Jr. hp per frame not logged; count PB cap rolls rand_int(100) non-coin after PB)
  let ncp = pb; while (!L[ncp].c.some(x => x[0] === COIN)) ncp++; if (L[ncp].c[0][0] !== COIN) {} const page5 = R.works(L[pb].s0, ncp, pb, pb, R.PROFILES.jrpb5), page6 = R.PROFILES.jrpb6 ? R.works(L[pb].s0, ncp, pb, pb, R.PROFILES.jrpb6) : null;
  const rolls = []; for (let g = pb; g < Math.min(L.length, pb + 260); g++) { let s = L[g].s0; for (const [ra, mx] of L[g].c) { const q = R.randInt(s, mx); if (mx === 100 && ra !== COIN) rolls.push([g - pb, q[1]]); s = q[0]; } }
  console.log(fn, msg, 'frames', f - c0, '| PB page 5+', page5, '6+', page6, 'rolls', JSON.stringify(rolls), 'jrEnd', r.log[r.log.length - 1].jr);
}
