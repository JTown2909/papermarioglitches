/* v97: every route turn text pinned (the runner: "stop changing what the route says ... all turns should resemble what I
 * put there"). The turn texts are the runner's own wording; instructions go in the step labels or the status line, never
 * in a turn text. A change to any line here needs the runner's new wording, quoted in the README.
 * Sources: Duplighosts / Jr. Troopa / Hallway (Ultra Boots) as the runner wrote them, v87 without the Life Shroom and the
 * Spiny Flip numbers (his request); Final Bowser (Ultra Boots) v97, T3-T6 verbatim from the runner, T1 / T2 / T7 in the same
 * style; the Normal Boots route as his spec of 2026-11-08 (v84), Final Bowser there as v85 (his "we can route around it,
 * we just need a high cap").  usage: node test_route_texts.js */
const fs = require('fs'), path = require('path');
const PIN = {
  'Duplighosts (RTA)': ['T1: Do Nothing; Do Nothing - 4 Transform', 'T2: Power Bomb'],
  'Jr. Troopa (RTA)': ['T1: Charge; Bomb', 'T2: Bomb; Whacka [Up 1]', 'T3: Charge; Bomb', 'T4: Bomb; Maple Syrup [Down 1]', 'T5: Charge; Do Nothing', 'T6: Bounce x6; Bomb if 5 capped', 'T7: Star Storm if 4 capped / Shooting Star [Down 5] if 4 capped'],
  'Hallway Bowser': ['T1: Charge; Spiny Flip - Danger', 'T2: Time Out; Spiny Flip', 'T3: Bounce x3; Spiny Flip', 'T4: Bounce x3; Spiny Flip', 'T5: Jump x2; Spiny Flip'],
  'Final Bowser': ['T1: Charge; Cloud Nine', 'T2: Charge; Do Nothing', "T3: Jammin' Jelly; Do Nothing", 'T4: Charge; Do Nothing - Block Wave', 'T5: Peach Beam - Danger', 'T6: Charge; Do Nothing - Close Call', 'T7: Bounce x7'],
  'Jr. Troopa (ENDGAME_JR)': ['T1: Charge; Bomb', 'T2: Bomb; Whacka [Up 1]', 'T3: Charge; Bomb', 'T4: Bomb; Maple Syrup [Down 1]', 'T5: Charge; Do Nothing', 'T6: Bounce x6; Bomb if 5 capped', 'T7: Star Storm if 4 capped / Shooting Star [Down 5] if 4 capped'],
  'Duplighosts (Charge route)': ['T1: Charge; Bombette Do Nothing on the beep - 3+ Transform (4 ideal)', 'T2: Power Bomb; Jump x2 on the one that did not transform'],
  'NB Duplighosts': ['T1: Charge; Bombette Do Nothing on the beep - 3+ Transform (4 ideal: 3 costs 2 damage)', 'T2: Power Bomb; Jump x2 on the one that did not transform', 'T3: Jump x1'],
  'NB Jr. Troopa': ['T1: Super Charge; Charge [3HP, 5FP]', 'T2: Super Charge; Charge [3HP, 0FP] - Close Call', 'T3: Maple; Charge [3HP, 9FP] - Close Call', 'T4: Super Charge; Charge [3HP, 4FP] - Close Call', 'T5: Super Charge; Headbonk x2 [3HP, 0FP] - Close Call', 'T6: Whacka; Do Nothing [3HP, 10FP]', 'T7: Bounce x5 [3HP, 7FP]'],
  'NB Hallway Bowser': ['T1: Super Charge; Charge [3HP, 2FP] - Close Call', 'T2: Time Out; Charge [3HP, 1FP]', 'T3: Maple; Charge [3HP, 9FP]', 'T4: Super Charge; Charge [3HP, 4FP]', 'T5: Bounce x6; Headbonk x2 [3HP, 1FP]'],
  'NB Final Bowser': ['Phase 1 (not tracked): T1 Charge; Charge - T2 Jump x2; Headbonk x1 [Bowser at 89 HP] - T3 Star Beam', 'Phase 2 (route it as you like; no Close Call / Star Shield / wave rule): Super Charges, then a high Power Bounce cap', 'Phase 2 Power Bounce turn (whichever turn you Power Bounce on)'] };
let fail = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fail++; };
const src = fs.readFileSync(path.join(__dirname, 'page_template.html'), 'utf8');
const re = /\{ text: '((?:[^'\\]|\\.)*)'/g; let m; const got = [];
while ((m = re.exec(src))) got.push(m[1].replace(/\\'/g, "'"));
const want = [].concat(...Object.values(PIN));
check(got.length === want.length, 'the page has ' + got.length + ' turn texts, the pin ' + want.length);
let i = 0;
for (const [fight, L] of Object.entries(PIN)) for (const t of L) { const g = got[i++]; check(g === t, fight + ': "' + t + '"' + (g === t ? '' : ' -- the page says "' + g + '"')); }
// Final Bowser's turn texts carry no instruction (v95 / v96 put "(equip Close Call ...)", "(Close Call equipped)" and the
// HOLD line in them)
const fb = PIN['Final Bowser'];
check(fb.every(t => !/[()]|beep|HOLD|equip/.test(t)), 'Final Bowser: no parentheses, beeps, HOLD or equip notes in the turn texts');
check(/Close Call equipped before the fight/.test(src), 'the Close Call reminder lives in the T1 Charge step label');
console.log(fail ? fail + ' FAILED' : 'all ok'); process.exit(fail ? 1 : 0);
