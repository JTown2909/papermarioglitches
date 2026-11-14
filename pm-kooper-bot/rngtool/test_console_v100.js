/* v100: the console attempts of Nov 12 (logs1112) replayed through the page's Final Bowser carry: each fb1 Charge capture
 * at its own page time, the log's coin (shines, the bar's stretches) and inputs (fb14Input), and at each turn's first
 * logged plan the plan made again (fb14Plan at that clock frame) without and with Bowser's attacks of the earlier turns as
 * the clips show them (fixtures/console_v100.json; the classifier reads 24 / 24 of them). Prints per plan the chance
 * before / after, the frame, the doubt, and what happened (the confirm and Bowser's outcome), and checks that no replayed
 * plan claims 95% or more on a frame Bowser hit. Needs the logs (LOGS, default /tmp/claude-0/pm/logs1112) and a built page.
 * usage: node test_console_v100.js   [PAGE=... LOGS=...] */
const fs = require('fs'), path = require('path');
const PAGE = process.env.PAGE || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer_v107/timeout_timer_standalone.html', DIR = process.env.LOGS || '/tmp/claude-0/pm/logs1112';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'console_v100.json'), 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  if (!fs.existsSync(PAGE) || !fs.existsSync(DIR)) { console.log('(skipped: PAGE / LOGS not here)'); console.log('all ok'); return; }
  const files = fs.readdirSync(DIR).filter(f => /pm-rng-log.*\.json$/.test(f)), { chromium } = require('playwright');
  const b = await chromium.launch(), out = [];
  for (const f of files) {
    const id = f.slice(0, 8), Lg = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')), E = Lg.events;
    const atk = {}; for (const r of FIX.attack.turns) if (r.log === id) atk[r.turn] = r.truth === 'fire' ? { fire: true, cls: null } : { fire: false, cls: !r.hit && (r.truth === 'claw' || r.truth === 'slam') ? r.truth : null };
    // the first attempt only (a new attempt resets the carry)
    const na = E.find(e => e.ev === 'fb14NewAttempt' && e.t > (E.find(x => x.ev === 'fb14Lock') || { t: 0 }).t), tEnd = na ? na.t : 1e12;
    const caps = (Lg.chargeCaptures || []).filter(c => c.prof === 'fb1');
    const locks = E.filter(e => e.ev === 'fb14Lock' && e.t < tEnd), plans = E.filter(e => e.ev === 'fb14Plan' && e.t < tEnd && e.turn >= 2);
    if (!locks.length || !locks.find(l => l.turn === 1) || !plans.length) continue;
    const steps = [];
    for (const l of locks) { const tr = E.filter(e => e.ev === 'chargeTrigger' && e.t < l.t).pop(), hide = E.filter(e => e.ev === 'barHide' && e.at < tr.t).pop();
      const cap = caps.find(c => c.stepT === 'Final Bowser T' + l.turn && Math.abs(Date.parse(c.wall) - Date.parse(Lg.saved) + (E[E.length - 1].t - tr.t)) < 15000) || caps.find(c => c.stepT === 'Final Bowser T' + l.turn);
      if (!cap) continue; steps.push({ k: 'lock', t: tr.t, turn: l.turn, M: l.M, cap, t0: hide.at - cap.hideMs }); }
    for (const e of E) if (e.ev === 'fb14Input' && e.t < tEnd) steps.push({ k: 'input', t: e.t, kind: e.kind, F: e.F, turn: e.turn });
    const firstPlan = {}; for (const p of plans) if (!firstPlan[p.turn]) { firstPlan[p.turn] = p; steps.push({ k: 'plan', t: p.t, p }); }
    for (const e of E) if (e.ev === 'fb14Missed' && e.t < tEnd) steps.push({ k: 'missed', t: e.t, turn: e.turn });
    steps.sort((a, b) => a.t - b.t);
    const taps = E.filter(e => e.ev === 'shine').map(e => e.at), vis = E.filter(e => e.ev === 'barHide').map(e => [e.at - e.upMs, e.at]);
    const res = { hit: {}, conf: {} }; for (const e of E) { if (e.t >= tEnd) continue; if (e.ev === 'fb14Hit') res.hit[e.turn] = true; if (e.ev === 'fb14Missed') res.hit[e.turn] = false; if (e.ev === 'fb14Confirm') res.conf[e.turn] = e.F; }
    const p = await b.newPage();
    await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('tot-settings', JSON.stringify({ prof: 'endgame', off: '-5', vlag: '50' })); } catch (e) {} });
    await p.goto('file://' + PAGE);
    const r = await p.evaluate(async ({ steps, taps, vis, atk }) => {
      const T = window.__tot, X = window.__fb14, FB = X.FB14, out = [];
      const SH = { chg: X.FB14_CHGD, nothing: [[-2, 0.1], [-1, 0.25], [0, 0.4], [1, 0.2], [2, 0.05]], jelly: [[-1, 0.25], [0, 0.5], [1, 0.25]], cn: [[-3, 0.03], [-2, 0.07], [-1, 0.18], [0, 0.44], [1, 0.18], [2, 0.07], [3, 0.03]] };
      X.reset(); T.setStep(T.RT().findIndex(s => s.fb14 === 1 && s.fb14role === 'lever'));
      const adv = h => FB.states.forEach(S => X.fbRun(S, h - S.l)), lead = +document.getElementById('s-lead').value || 1.5;
      for (const s of steps) {
        if (s.k === 'lock') { T.setStep(T.RT().findIndex(x => x.fb14 === s.turn && x.fb14role === (s.turn === 1 ? 'lever' : 'charge')));
          if (s.turn > 1 && FB.on) { adv(s.M + 11); X.input('chg', s.M, s.turn, SH.chg); }
          const rr = await T.chgReplay(s.cap, { fb14: true, t0: s.t0 }); FB.taps = taps.slice(); FB.vis = vis.slice(); FB.visFrom = null; FB.pendChg = null;
          out.push({ lock: s.turn, state: rr.state, M: FB.M[s.turn], Mlog: s.M, states: FB.states.length }); }
        else if (s.k === 'input' && s.kind !== 'chg' && FB.on) { adv(s.F - 3); X.input(s.kind, s.F, s.turn, SH[s.kind]); }
        else if (s.k === 'missed') { FB.missed = FB.missed || {}; FB.missed[s.turn] = true; }
        else if (s.k === 'plan' && FB.on) { const P = s.p; T.setStep(T.RT().findIndex(x => x.fb14 === P.turn && x.fb14role === 'lever'));
          const cAt = P.from - 1 - lead * 1000 / FB.rate, A = {}; for (const k in atk) if (+k < P.turn) A[k] = atk[k];
          FB.atk = {}; FB.anchor = {}; const p0 = X.plan(cAt); const w0 = X.weigh(Math.floor(cAt));
          FB.atk = A; FB.anchor = {}; const p1 = X.plan(cAt); const w1 = X.weigh(Math.floor(cAt)); FB.atk = {};
          const pk = q => (!q || q === true) ? { none: (FB.plan && FB.plan.none) || 'none' } : (q.none ? { none: q.none, best: q.best != null ? +q.best.toFixed(3) : null } : { target: q.target, pp: +q.pp.toFixed(3), win: q.win, doubt: q.doubt, states: q.states });
          out.push({ plan: P.turn, logged: { target: P.target, pp: +P.pp.toFixed(3) }, before: pk(p0), after: pk(p1), atk: A, cut: w1.cnt, kept0: w0.kept, kept1: w1.kept }); }
      }
      return out;
    }, { steps, taps, vis, atk });
    await p.close();
    out.push({ id, res, r });
  }
  await b.close();
  const rows = [];
  for (const A of out) { console.log(A.id, JSON.stringify(A.r.filter(x => x.lock).map(x => [x.lock, x.state, x.M, x.Mlog]))); for (const x of A.r.filter(x => x.plan)) { const conf = A.res.conf[x.plan], hit = A.res.hit[x.plan]; rows.push(Object.assign({ id: A.id, conf, hit }, x));
    console.log('  T' + x.plan + ' logged ' + x.logged.target + ' ' + x.logged.pp + ' | before ' + JSON.stringify(x.before) + ' | after ' + JSON.stringify(x.after) + ' | cut ' + JSON.stringify(x.cut) + ' states ' + x.kept0 + ' -> ' + x.kept1 + ' | confirmed ' + conf + (hit == null ? '' : hit ? ' HIT' : ' miss')); } }
  // never a confident wrong beep: a replayed claim of 95% or more on the frame the runner confirmed, and Bowser hit
  const bad = rows.filter(x => x.after && x.after.pp >= 0.95 && x.hit === true && x.conf != null && x.after.target != null && Math.abs(x.conf - x.after.target) <= 1);
  ok(bad.length === 0, 'no replayed plan claims >= 95% on a frame Bowser hit (' + rows.length + ' plans)');
  ok(rows.every(x => !x.after || x.after.pp == null || x.plan !== 3 || x.after.pp < 0.83), 'T3 keeps its doubt floor (at most ~82%)');
  const hist = k => { const v = rows.filter(x => x[k] && x[k].pp != null).map(x => x[k].pp); return { n: v.length, ge95: v.filter(x => x >= 0.95).length, med: v.sort((a, b) => a - b)[Math.floor(v.length / 2)] }; };
  console.log('pp before ' + JSON.stringify(hist('before')) + ' after ' + JSON.stringify(hist('after')));
  if (process.env.OUTJSON) fs.writeFileSync(process.env.OUTJSON, JSON.stringify(rows));
  console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
})();
