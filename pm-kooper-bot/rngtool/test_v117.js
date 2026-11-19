/* v117 (charge_live/README.md v117): Jr. Troopa partnerless, console logs of Nov 15 / 17 / 18 (numbers only:
 * fixtures/console_1118_revive.json, fixtures/console_1118_pb.json), replayed through the page at their own clock.
 *  1. The Life Shroom revive carry (partnerless: JR_REVIVE_D_PL, 938-950 draws): every revive followed by a Charge lock agrees with
 *     that lock (v116: 2 of 8 in this replay, live 3 of 8, two of those at the d = +2 edge with weight ~0). The other routes take 932-950.
 *  2. The T7 Power Bounce (jrpb5p / jrpb6p: the first hit 13, every hit's 359-draws 11): j1729 (5 bounces on the clip, v116 planned
 *     6+ at 0.95 with doubt 0) is no longer a confident 6; x1822 (6 bounces) still plans 6+ confidently and both its states give 6 at
 *     the runner's press. The partnerless route step and JR_SEQ_PL use jrpb5p; the Bombette route keeps jrpb5.
 *  3. jrEnd (source check): "Power Bounce confirmed; the route ends here", not "the fight is over".
 * usage: node test_v117.js [PAGE=...] */
const fs = require('fs'), path = require('path');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
const REV = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_1118_revive.json'), 'utf8'));
const PB = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_1118_pb.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const open = async (set) => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(s => { try { localStorage.clear(); localStorage.setItem('tot-jrpl', '1'); if (s) localStorage.setItem('tot-settings', JSON.stringify(s)); } catch (e) {} window.__now = 1000; performance.now = () => window.__now; }, set || null);
    await p.goto('file://' + PAGE); return p; };
  // the v111 replay; opts.plan: make a plan at that time; opts.pb: the live Power Bounce confirm (the states' outcome there)
  const replay = async (L, opts) => {
    const p = await open(L.settings);
    const r = await p.evaluate(([L, opts]) => {
      const T = window.__tot, E = c => T.v111.ev(c), ev = L.events.slice(), res = { errs: [] };
      if (opts.plan) ev.push({ t: opts.plan, ev: '_plan' }); ev.sort((a, b) => a.t - b.t);
      const i1 = T.RT().findIndex(s => (s.seq || 'ultra') === 'ultrapl' && s.jr === 1), fight = ev.filter(e => e.ev === 'jrFight').pop();
      window.__now = fight.t - 2000; T.setStep(i1); const n0 = T.SLOG.length; let started = false;
      for (const e of ev) {
        if (e.t < fight.t - 3000) continue; window.__now = e.t;
        try {
          if (e.ev === 'chargeLock' && !started) { started = true; T.jrTrackerAt(parseInt(e.seed, 16), e.qs, fight.at, 0); for (const x of ev.filter(x => x.ev === 'jrStrategiesClosed' && x.t < e.t && x.t > fight.t)) E(`jrScreenClosed(${x.at})`); }
          else if (e.ev === 'chargeLock') { const tg = ev.filter(x => x.ev === 'chargeTrigger' && x.t < e.t).pop(), kb = ev.filter(x => x.ev === 'jrChargeBurst' && x.t < e.t).pop();
            E(`{ const tr = { t: ${tg.t - 11} }; Object.assign(CHG, { prof: CHG_PROF.jr, trig: tr, taps: [], pres: [], state: 'locked', qs: ${JSON.stringify(e.qs)} }); JRT.trigSeen = tr; JRT.chargeK = ${kb ? kb.k : 'JRT.chargeK'}; jrLock(${parseInt(e.seed, 16)}, ${JSON.stringify(e.qs)}); }`); }
          else if (!started) continue;
          else if (e.ev === '_plan') { const P = E(`st.plan = null; st.planTry = 0; st.dupMsgT = 0; makePlan(); st.plan && { prof: st.plan.prof, zwAbs: st.plan.zwAbs, mix: st.plan.mix }`); let mk = null; try { mk = E('drawStrip(); V.stripMarker'); } catch (x) { mk = null; } res.plan = P ? Object.assign(P, { mk: mk && mk.kind }) : { msg: E('st.msg') }; }
          else if (e.ev === 'shine') E(`addShine(${e.at}, true)`);
          else if (e.ev === 'coinBack') E(`coinBack(${e.hiddenMs})`);
          else if (e.ev === 'jrStrategiesClosed') E(`jrScreenClosed(${e.at})`);
          else if (e.ev === 'jrHide') {
            if (opts.pb != null && E(`(JRS()[JRT.k] || {}).id === 'jr_pb'`) && !res.pb) {
              // the carried states at the live Power Bounce confirm: their bounce class (4 / 5 / 6+) there
              res.pb = E(`zwUpdate(${opts.pb} - 4); zw.parts.map(q => ({ w: q.w, cls: window.__tot.jrClasses(q.S.s, q.S.nc, q.g, ${opts.pb}, ${opts.pb}, 'jrpb5p')[0], old: window.__tot.jrClasses(q.S.s, q.S.nc, q.g, ${opts.pb}, ${opts.pb}, 'jrpb5')[0] }))`);
            }
            E(`jrHide(${e.at}, ${e.upMs})`);
          }
          else if (e.ev === 'jrOutcome' && !e.dodge) E(`JRT.ccPend = null; jrDeath(${e.k}, ${e.frames})`);
        } catch (er) { res.errs.push(e.ev + ': ' + er); }
      }
      res.log = T.SLOG.slice(n0).filter(x => /^(jrReviveCarry|jrCrossCheck)$/.test(x.ev)).map(x => ({ ev: x.ev, k: x.k, agree: x.agree, d: x.d, why: x.why, states: x.states }));
      return res;
    }, [L, opts || {}]);
    await p.close(); return r;
  };
  // 0. the tables
  { const p = await open({ jrroute: 'pl', boots: 'ultra', duproute: 'charge' });
    const r = await p.evaluate(() => { const T = window.__tot, E = c => T.v111.ev(c);
      return { ver: T.VERSION, pl: E('JR_REVIVE_D_PL.map(x => x[0])'), any: E('JR_REVIVE_D_ANY.map(x => x[0])'), sum: E('JR_REVIVE_D_PL.reduce((a, x) => a + x[1], 0)'),
        t7: E(`JR_SEQ_PL[JR_SEQ_PL.length - 1].prof`), t6: E(`JR_SEQ[JR_SEQ.length - 1].prof`), step: T.RT().find(s => s.seq === 'ultrapl' && s.jr === 12).prof,
        fx5: E(`Object.values(R.PROFILES.jrpb5p.effects).map(a => a.length)`), fx6: E(`Object.values(R.PROFILES.jrpb6p.effects).map(a => a.length)`), top: E(`R.TOP.jrpb5p`), old6: E(`Object.values(R.PROFILES.jrpb6.effects).map(a => a.length)`) }; });
    console.log(JSON.stringify(r));
    ok(r.pl[0] === 938 && r.pl[r.pl.length - 1] === 950 && Math.abs(r.sum - 1) < 1e-9 && r.any[0] === 932 && r.any[r.any.length - 1] === 950, '0. the revive tables: partnerless 938-950 (sum 1), the other routes 932-950');
    ok(r.t7 === 'jrpb5p' && r.step === 'jrpb5p' && r.t6 === 'jrpb5' && r.top === 'jrpb6p', '0. partnerless T7 on jrpb5p (top jrpb6p); the Bombette route\'s T6 keeps jrpb5');
    ok(JSON.stringify(r.fx5) === '[11,11,11]' && JSON.stringify(r.fx6) === '[11,11,11,11]' && JSON.stringify(r.old6) === '[11,11,10,10]', '0. jrpb5p / jrpb6p: 11 draws a hit (first hit 13); jrpb6 unchanged ' + JSON.stringify([r.fx5, r.fx6, r.old6]));
    await p.close(); }
  // 1. the revives
  let nRev = 0, nAgree = 0;
  for (const name of Object.keys(REV).filter(n => n[0] !== '_')) {
    const L = REV[name], r = await replay(L), rows = [];
    for (let i = 0; i < r.log.length; i++) { const x = r.log[i]; if (x.ev !== 'jrReviveCarry') continue; const nx = r.log.slice(i + 1).find(y => y.ev === 'jrCrossCheck' || y.ev === 'jrReviveCarry'); if (nx && nx.ev === 'jrCrossCheck') rows.push({ k: x.k, next: nx.k, agree: nx.agree }); }
    const live = L.checks.filter((x, i) => x.ev === 'revive' && L.checks[i + 1] && L.checks[i + 1].ev === 'cross').map((x, i) => ({ k: x.k, agree: L.checks[L.checks.indexOf(x) + 1].agree }));
    console.log(name, L.page, 'replay', JSON.stringify(rows), 'live', JSON.stringify(live), r.errs.slice(0, 1));
    for (const x of rows) { nRev++; if (x.agree) nAgree++; ok(x.agree, '1. ' + name + ': the revive at k ' + x.k + ' agrees with the k ' + x.next + ' lock (live ' + L.page + ': ' + ((live.find(y => y.k === x.k) || {}).agree ? 'agreed' : 'disagreed') + ')'); }
    ok(!r.errs.length, '1. ' + name + ': no replay errors ' + r.errs.slice(0, 1).join(''));
  }
  ok(nRev === 8 && nAgree === 8, '1. all ' + nAgree + ' of ' + nRev + ' revive carries with a later lock agree (v116 replay: 2 of 8, live 3 of 8)');
  // 2. the T7 Power Bounce
  for (const name of ['j1729', 'x1822']) {
    const L = PB[name], r = await replay(L, { plan: L.plan.t, pb: L.pb }), P = r.plan || {}, m = P.mix || {};
    let sw = 0, w6 = 0, w6o = 0; for (const q of r.pb || []) { sw += q.w; if (q.cls === 6) w6 += q.w; if (q.old === 6) w6o += q.w; }
        console.log(name, JSON.stringify({ prof: P.prof, p: m.p, p4: m.p4, pp4: m.pp4, doubt: m.doubt, win4: m.win4, mk: P.mk, live: L.plan, seen: L.seen, at: L.pb, share6: sw ? +(w6 / sw).toFixed(3) : null, share6old: sw ? +(w6o / sw).toFixed(3) : null}));
    ok(P.prof === 'jrpb5p', '2. ' + name + ': T7 plans on the partnerless table (' + P.prof + ')');
    if (L.seen.bounces < 6) {
      ok(m.p4 != null && m.p4 < 0.8 && P.mk !== 'star', '2. ' + name + ' (clip: ' + L.seen.bounces + ' bounces): the 6 is no longer planned as confident (p4 ' + (m.p4 && m.p4.toFixed(2)) + ', marker ' + P.mk + '; v116 live: p4 ' + L.plan.p4 + ', doubt 0)');
      ok(w6o / sw > 0.99 && w6 / sw < 0.9, '2. ' + name + ': at the runner\'s press (' + L.pb + ') v116\'s table gave every state 6+ (' + (w6o / sw).toFixed(2) + '); jrpb5p gives ' + (w6 / sw).toFixed(2) + ' (the clip: 5)');
    } else {
      ok(m.p4 > 0.9, '2. ' + name + ' (clip: 6 bounces): 6+ still planned confidently (p4 ' + (m.p4 && m.p4.toFixed(2)) + ')');
      ok(sw > 0 && w6 / sw > 0.99, '2. ' + name + ': at the runner\'s press (' + L.pb + ') the states give 6+ (' + (w6 / sw).toFixed(2) + '), as the clip');
    }
    ok(!r.errs.length, '2. ' + name + ': no replay errors ' + r.errs.slice(0, 1).join(''));
  }
  const src = fs.readFileSync(path.join(__dirname, 'charge_live', 'jr_live.js'), 'utf8');
  ok(!/jrEnd\([^)]*fight is over/.test(src) && /\(JRS\(\)\[k\]\.what \|\| 'the last confirm'\) \+ ' confirmed; the route ends here'/.test(src), '3. jrEnd at the route\'s last confirm: "Power Bounce confirmed; the route ends here", no "the fight is over"');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
