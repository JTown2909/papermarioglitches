/* v156: (1) Mario's HP number on T6's step before its Charge tells Bowser's T5 attack when the setting is "not set" (fb2T5Watch,
 * FB2HP5): 3 -> T6 Body Slam impossible, 2 -> half / half, 1 -> T6 Claw impossible or no restriction, 10 -> no restriction; fb2Flags
 * uses it. (e2e d4000001: the T6 lock was the true seed and the plan weighed T5's three cases equally; T5 had been a Claw.)
 * (3) a steady 0 on the way (a T5 KO, the Life Shroom) skips T6's narrowed candidates: the carry has no T5 revive.
 * (4) at 10 HP after T5 (no Danger) Close Call cannot dodge: no T6 beep.
 * (2) the read is cleared on T5's step (a new attempt reads again); not on the backup T7. usage: node test_v156.js [page] */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') >= 'v156', 'page version v156+');
  const r = JSON.parse(await E(`(() => { const T = window.__tot, R = T.RT(), i6 = R.findIndex(s => s.turn === 'fb2_k' && !s.b7), i5 = R.findIndex(s => s.fb5), out = {};
    CHG.trig = null; const T1 = window.__fb2OnesTest; const ones = FB2_ONES_T;
    const read = (digit, tens) => { T.setStep(i5); fb2T5Watch(0, true); T.setStep(i6); window.__fb2TensVal = 1; window.__fb2OnesTest = () => '0'.repeat(72); for (let k = 0; k < 20; k++) fb2T5Watch(500 + k * 33, true);     /* 10 first (before Bowser's T5 attack), then the number after it */
      window.__fb2TensVal = tens; window.__fb2OnesTest = () => ones[String(digit)] || '0'.repeat(72);
      for (let k = 0; k < 20; k++) fb2T5Watch(1000 + k * 33, true); const f = fb2Flags(); return { v: FB2HP5.v, f: JSON.stringify(f) }; };
    out.hp3 = read(3, 0); out.hp2 = read(2, 0); out.hp1 = read(1, 0); out.hp10 = read(0, 1);
    T.setStep(i5); fb2T5Watch(0, true); T.setStep(i6); window.__fb2TensVal = 0; window.__fb2OnesTest = () => ones['0']; for (let k = 0; k < 20; k++) fb2T5Watch(2000 + k * 33, true); window.__fb2TensVal = 1; for (let k = 0; k < 20; k++) fb2T5Watch(3000 + k * 33, true);
    out.ko = { t5ko: !!FB2HP5.t5ko, v: FB2HP5.v, cands: (FB14.t6 = { bases: [], doubt: 0 }, CHG.trig = { t: 1 }, fb14T6Cands()) }; CHG.trig = null; FB14.t6 = null;
    FB2HP5.v = 10; FB2.hyps = FB2.hyps || []; CHG.trig = { t: 1 }; try { out.noDanger = fb2PlanP(200); } catch (e) { out.noDanger = { ran: String(e).slice(0, 40) }; } CHG.trig = null; FB2HP5.v = 1; CHG.trig = { t: 1 }; try { out.danger = (r => r && r.none)(fb2PlanP(200)); } catch (e) { out.danger = 'ran (' + String(e).slice(0, 40) + ')'; } CHG.trig = null;
    T.setStep(i5); fb2T5Watch(0, true); out.cleared = FB2HP5.v; out.unset = JSON.stringify(fb2Flags());
    delete window.__fb2OnesTest; delete window.__fb2TensVal; return JSON.stringify(out); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.hp3.v === 3 && r.hp3.f === '[[false,true,1]]', '(1) HP 3 after T5 (Body Slam guarded): T6 cannot be a Body Slam');
  ok(r.hp2.v === 2 && r.hp2.f === '[[false,true,0.5],[true,false,0.5]]', '(1) HP 2: Body Slam or Claw guarded, half / half');
  ok(r.hp1.v === 1 && r.hp1.f === '[[true,false,0.5],[true,true,0.5]]', '(1) HP 1: Claw (no T6 Claw) or Fire / Lightning guarded');
  ok(r.hp10.v === 10 && r.hp10.f === '[[true,true,0.3333333333333333],[false,true,0.3333333333333333],[true,false,0.3333333333333333]]', '(1) HP 10: not trusted (v162): the three cases');
  ok(r.ko.t5ko && r.ko.v === 10 && r.ko.cands === null, '(3) a steady 0 after T5 then 10 (the Life Shroom): a T5 KO, and T6 searches in full (no carried candidates)');
  ok(!(r.noDanger && r.noDanger.none === 'no Danger') && r.danger !== 'no Danger', '(4) v162: a 10 read does not stop the T6 plan (console 11:07: Mario was at 3); at 1 HP the plan runs');
  ok(r.cleared === null && r.unset === '[[true,true,0.3333333333333333],[false,true,0.3333333333333333],[true,false,0.3333333333333333]]', "(2) T5's step clears the read: back to the three cases");
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
