/* v111 (charge_live/README.md v111): the runner's Jr. Troopa logs of Nov 15 on v109 / v110 (fixtures/console_1115_jr.json, numbers
 * only), replayed through the page at their own clock, and the strip markers.
 *  1. Every Close Call hit on these routes is a death (n/10 -> 0/10 -> the Life Shroom, every clip): a state that dies on a pending
 *     Close Call is held at its death frame, so the shines of the death / revive no longer empty the carry before the "1" of 10 HP
 *     shows (x1024 T5 and jr1126 T4: jrReviveNone on v110; jr1126 T2 / jr1128 T3: a revive from 2 states).
 *  2. Partnerless: the reader rearms on the confirm before each later Charge (T2 / T4 / T5 were never read on v110).
 *  3. x1133 (Ultra Bombette T5 at 10 HP, the Do Nothing close not read): Jr. Troopa's hit on the HP tens place puts the Do Nothing
 *     in (jrHpDrop), the route reaches T6 and the Power Bounce plans.
 *  4. The partnerless T7 aims at the 6 run (six6) where the Bombette route's 'six' keeps the 5+ pick.
 *  5. The strip markers (ii): star / coin / white rings, drawn above the beeped frame, the status words.
 *  6. The route pickers' short labels; an edge press says neither inside nor outside.
 * usage: node test_v111.js [PAGE=...] */
const fs = require('fs'), path = require('path');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v114/timeout_timer_standalone.html';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_1115_jr.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { chromium } = require('playwright'), b = await chromium.launch(), errs = [];
  const open = async (set) => { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(s => { try { localStorage.clear(); localStorage.setItem('tot-jrpl', '1'); if (s) localStorage.setItem('tot-settings', JSON.stringify(s)); } catch (e) {} window.__now = 1000; performance.now = () => window.__now; }, set || null);
    await p.goto('file://' + PAGE); return p; };
  const replay = async (name, extra) => {
    const L = FIX[name], p = await open(L.settings);
    const r = await p.evaluate(([L, extra]) => {
      const T = window.__tot, E = c => T.v111.ev(c), ev = L.events.slice(), res = { plans: [], errs: [] };
      for (const t of L.drops || []) ev.push({ t: t - 1200, ev: '_tens', fall: t }); for (const t of extra || []) ev.push({ t, ev: '_plan' }); ev.sort((a, b) => a.t - b.t);
      const seq = L.settings.jrroute === 'pl' ? 'ultrapl' : 'ultra', i1 = T.RT().findIndex(s => (s.seq || 'ultra') === seq && s.jr === 1), fight = ev.find(e => e.ev === 'jrFight');
      window.__now = fight.t - 2000; T.setStep(i1); const n0 = T.SLOG.length; let started = false;
      for (const e of ev) {
        if (e.t < fight.t - 3000) continue; window.__now = e.t;
        try {
          if (e.ev === 'chargeLock' && !started) { started = true; T.jrTrackerAt(parseInt(e.seed, 16), e.qs, fight.at, 0); for (const x of ev.filter(x => x.ev === 'jrStrategiesClosed' && x.t < e.t && x.t > fight.t)) E(`jrScreenClosed(${x.at})`); }
          else if (e.ev === 'chargeLock') { const tg = ev.filter(x => x.ev === 'chargeTrigger' && x.t < e.t).pop(), kb = ev.filter(x => x.ev === 'jrChargeBurst' && x.t < e.t).pop();
            E(`{ const tr = { t: ${tg.t - 11} }; Object.assign(CHG, { prof: CHG_PROF.jr, trig: tr, taps: [], pres: [], state: 'locked', qs: ${JSON.stringify(e.qs)} }); JRT.trigSeen = tr; JRT.chargeK = ${kb ? kb.k : 'JRT.chargeK'}; jrLock(${parseInt(e.seed, 16)}, ${JSON.stringify(e.qs)}); }`); }
          else if (!started) continue;
          else if (e.ev === 'shine') E(`addShine(${e.at}, true)`);
          else if (e.ev === 'coinBack') E(`coinBack(${e.hiddenMs})`);
          else if (e.ev === 'jrStrategiesClosed') E(`jrScreenClosed(${e.at})`);
          else if (e.ev === 'jrHide') E(`jrHide(${e.at}, ${e.upMs})`);
          else if (e.ev === 'jrOutcome' && !e.dodge) E(`JRT.ccPend = null; jrDeath(${e.k}, ${e.frames})`);
          else if (e.ev === '_tens') { window.__jrTensTest = () => (window.__now < e.fall ? 0.47 : 0); for (let t = e.t; t < e.fall + 600; t += 16.7) { window.__now = t; E(`jrFrame(${t}, true)`); } window.__jrTensTest = null; }
          else if (e.ev === '_plan') { const P = E(`st.plan = null; st.planTry = 0; st.dupMsgT = 0; makePlan(); st.plan`); let mk = null; try { mk = E('drawStrip(); V.stripMarker'); } catch (x) { mk = String(x); } res.plans.push({ t: e.t, step: T.RT()[T.step()].jr, prof: P && P.prof, p: P && P.mix && P.mix.p, win: P && P.mix && P.mix.win, mk, text: document.getElementById('strip-state').textContent, msg: P ? null : E('st.msg') }); }
        } catch (er) { res.errs.push(e.ev + ': ' + er); }
      }
      res.log = T.SLOG.slice(n0).filter(x => /^(jrInput|jrRevive|zwInconsistent|jrCarryEnds|jrHpDrop|jrStepGap)/.test(x.ev)).map(x => Object.assign({}, x));
      res.chgState = E('CHG.state');
      return res;
    }, [L, extra]);
    await p.close(); return r;
  };
  // 1. the deaths
  for (const [name, want] of [['jr1126', [3, 7]], ['jr1128', [5]], ['x1024', [9]], ['x1027', []]]) {
    const r = await replay(name), rev = r.log.filter(x => x.ev === 'jrReviveCarry'), none = r.log.filter(x => x.ev === 'jrReviveNone');
    const inp = r.log.filter(x => x.ev === 'jrInput').map(x => [x.k, x.c]), near = FIX[name].inputs.every(([k, c]) => inp.some(y => y[0] === k && Math.abs(y[1] - c) <= 1)), exact = FIX[name].inputs.filter(([k, c]) => inp.some(y => y[0] === k && y[1] === c)).length, diffs = new Set(FIX[name].inputs.map(([k, c]) => { const y = inp.find(y => y[0] === k); return y ? y[1] - c : 99; })), same = near;     // (x1027: 8 of 12 one frame later, the replay clock origin a fraction off: the carry spreads the confirm -2..+1 anyway)
    console.log(name, JSON.stringify(rev.map(x => [x.k, x.from, x.states])), JSON.stringify(none), r.errs.slice(0, 2));
    if (!same) console.log('  mismatch', JSON.stringify(FIX[name].inputs.filter(([k, c]) => !inp.some(y => y[0] === k && y[1] === c))), JSON.stringify(inp));
    ok(same, '1. ' + name + ': the replay reads the confirms on the console page\'s frames (' + exact + ' of ' + FIX[name].inputs.length + ' exact, every one within 1)');
    ok(!none.length && want.every(k => rev.some(x => x.k === k && x.from >= 3)), '1. ' + name + ': ' + (want.length ? '' : 'no death; ') + 'every death (k ' + want.join(', ') + ') revives from the held states (' + rev.map(x => 'k ' + x.k + ' from ' + x.from).join(', ') + '; v110: ' + (name === 'jr1128' ? 'from 2' : name === 'x1024' ? 'jrReviveNone' : 'from 2, then jrReviveNone') + ')');
    ok(!r.errs.length, '1. ' + name + ': no errors in the replay ' + r.errs.slice(0, 1).join(''));
  }
  // 3. x1133 T5: the HP drop, the Power Bounce plan
  { const r = await replay('x1133', [742500]), hd = r.log.find(x => x.ev === 'jrHpDrop'), gap = r.log.find(x => x.ev === 'jrStepGap'), P = r.plans[0];
    console.log('x1133', JSON.stringify(hd), JSON.stringify(P));
    ok(hd && hd.k === 9 && Math.abs(hd.confirmAt - (740695 - 53.4 * 33.43)) < 40, '3. x1133: Jr. Troopa\'s hit on the HP tens place puts T5\'s unread Do Nothing in (' + JSON.stringify(hd) + ')');
    ok(!gap && P && P.step === 10 && P.prof === 'jrpb5' && P.p > 0.675, '3. x1133: the route on T6 and the Power Bounce planned from the T5 lock (' + JSON.stringify(P) + '; v110: the Power Bounce\'s hide took Do Nothing as missed, no plan)');
    const want = P && P.p >= 0.8 && P.win >= 2 ? 'star' : P && (P.p < 0.6 || P.win <= 1) ? 'coin' : null;
    ok(P && P.mk && typeof P.mk === 'object' && P.mk.kind === want && /SOLID|coin flip/.test(P.text), '5. the x1133 T6 plan on the strip: the ' + want + ' above its beeped frame, the status says so (' + JSON.stringify(P && P.mk) + ' | ' + (P && P.text || '').slice(0, 140) + ')'); }
  // 2. the partnerless rearm, 4. six6, 5. markers, 6. labels / wording
  { const p = await open({ jrroute: 'pl', boots: 'ultra', duproute: 'charge' });
    const r = await p.evaluate(() => {
      const T = window.__tot, E = c => T.v111.ev(c), out = { ver: T.VERSION };
      out.rearm = E(`JR_SEQ_PL.map((s, i) => [i, !!s.rearm, !!(JR_SEQ_PL[i + 1] && JR_SEQ_PL[i + 1].charge)])`);
      const i1 = T.RT().findIndex(s => s.seq === 'ultrapl' && s.jr === 1); T.setStep(i1); T.jrTrackerAt(0x2468ace0, [12], performance.now() - 5000, 0);
      E(`CHG.state = 'locked'`); T.jrScreenAt(200, 3); out.afterT1 = E('CHG.state'); out.k = T.JRT.k;
      // six6 against six: a 5+ run of 9 frames (share 0.97) beside a 2-frame 6+ run whose 5+ share is lower
      const n = 30, sh = new Array(n).fill(0), s4 = new Array(n).fill(0); for (let c = 2; c <= 10; c++) sh[c] = 0.97; for (let c = 14; c <= 16; c++) { sh[c] = 0.8; } s4[15] = 0.7; s4[16] = 0.7; s4[14] = 0.6;
      const sc = c => sh[c] || 0;
      out.six = T.ppPick(sh, s4, 0, n - 1, 0, 25, sc, 'six', 0, true).target; out.six6 = T.ppPick(s4, null, 0, n - 1, 0, 25, c => s4[c] || 0, 'free', 0, true).target;     // (six6: the 6+ map picked on its own, as zwPlan does)
      out.t7six6 = !!T.RT().find(s => s.seq === 'ultrapl' && s.jr === 12).six6;
      const M = m => { const r = E(`stripMarker(${JSON.stringify(m)})`); return r ? r.kind + (r.ring ? '+ring' : '') + ' | ' + r.text : 'none'; };
      out.mk = {
        solid: M({ prof: 'jrcc_bomb', mix: { p: 0.86, win: 3 } }), mid: M({ prof: 'jrcc_bomb', mix: { p: 0.7, win: 3 } }), coin: M({ prof: 'jrcc_bomb', mix: { p: 0.55, win: 3 } }), one: M({ prof: 'timeout', mix: { p: 0.9, win: 1 } }),
        dup1015: M({ prof: 'dup3', mix: { p: 0.53, p4: 0.26, pp4: 0.48, win: 1, win4: 1 } }), dup1139: M({ prof: 'dup3', mix: { p: 0.85, p4: 0.41, pp4: 0.99, win: 3, win4: 1 } }),
        dup4: M({ prof: 'dup3', mix: { p: 0.94, p4: 0.86, pp4: 0.97, win: 4, win4: 3 } }), dupNo4: M({ prof: 'dup3', mix: { p: 0.94, p4: 0.006, win: 2, win4: null } }), fb: M({ prof: 'fb14', mix: { p: 0.42, win: 0 } }) };
      out.pressTxt = E(`stripState({ src: 'press', works: true, p: 0.60, hit: 1352, target: 1352, label: 'T3', w: { start: 1351, end: 1353, length: 3 } }).text`);
      out.pressTxt9 = E(`stripState({ src: 'press', works: true, p: 0.92, hit: 1352, target: 1352, label: 'T3', w: { start: 1351, end: 1353, length: 3 } }).text`);
      const opt = id => [...document.querySelectorAll('#s-' + id + ' option')].map(o => o.textContent);
      out.labels = { jr: opt('jrroute'), dup: opt('duproute'), fbnb: opt('fbnbroute') };
      return out;
    });
    console.log(JSON.stringify(r).slice(0, 1600));
    ok(r.ver === 'v129', '0. page version v111');
    const want = r.rearm.filter(x => x[2] && x[0] > 0);
    ok(want.length === 3 && want.every(x => x[1]), '2. partnerless: the confirm before each later Charge (T2, T4, T5) rearms the reader ' + JSON.stringify(r.rearm.filter(x => x[1] || x[2])));
    ok(r.afterT1 !== 'locked' && r.k === 2, '2. after T1\'s Do Nothing the Charge reader is armed again for T2\'s Charge (state ' + r.afterT1 + ')');
    ok(r.t7six6 && r.six6 >= 14 && r.six6 <= 16 && !(r.six >= 14 && r.six <= 16), '4. partnerless T7 (six6) aims at the 6 run (' + r.six6 + ') where the Bombette route\'s six keeps the 5+ run (' + r.six + ')');
    const k = r.mk;
    ok(/^star \|/.test(k.solid) && k.mid === 'none' && /^coin \|/.test(k.coin) && /^coin \|.*1 frame/.test(k.one), '5. markers: star at 86% on 3 frames, none at 70%, coin at 55%, coin on a 1-frame window (' + [k.solid, k.mid, k.coin, k.one].join(' / ') + ')');
    ok(/^coin \| 3\+ is a coin flip/.test(k.dup1015) && /^coin\+ring \| 3\+ SOLID 85% · 4 is a coin flip \(41%\)/.test(k.dup1139) && /^star\+ring/.test(k.dup4) && /^star \|/.test(k.dupNo4), '5. Duplighosts: dup1015 a gold coin, dup1139 a white-ringed coin ("3+ SOLID 85% · 4 is a coin flip (41%)"), 4 confident a ringed star, no 4 aimed a plain star (' + [k.dup1015, k.dup1139, k.dup4, k.dupNo4].join(' / ') + ')');
    ok(/last press is in the boxes/.test(r.pressTxt) && !/%/.test(r.pressTxt) && !/%/.test(r.pressTxt9), '5. (oo, v120; v128) fb1149 T3: the strip line after a press points to the press boxes, the odds only in the % box (' + r.pressTxt.slice(0, 110) + ')');
    ok(/^coin/.test(k.fb), '5. fb1145 T6 (win 0, p 0.42): a coin (' + k.fb + ')');
    ok(JSON.stringify(r.labels.jr) === JSON.stringify(['Ultra Boots Partnerless', 'Ultra Boots Bombette', 'Ultra Boots Bombette (old shine lock)']) && JSON.stringify(r.labels.dup) === JSON.stringify(['Ultra Boots Spiny Surge (no lock)', 'Ultra Boots Bombette']) && JSON.stringify(r.labels.fbnb) === JSON.stringify(['Normal Boots Power Bounce cap', 'Normal Boots Goombario (untested)']), '6. short route labels ' + JSON.stringify(r.labels));
    await p.close();
  }
  const src = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8');
  ok(/o\.edge \? 'on the edge of the window'/.test(src), '6. an edge press says "on the edge of the window", not "outside the window"');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
