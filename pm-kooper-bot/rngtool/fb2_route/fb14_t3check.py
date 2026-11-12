"""v98: the emulator check that the Final Bowser carry reaches T3 (charge_live README v98). For each fb14_e2e.py report
(RUNNER=patient GUARD=1 TRUTH=1, TURNS >= 3): T2's lock, whether the carry was dropped between T2's confirm and T3's
confirm (fb14CarryGone / fb14AllOut), a re-lock (fb14Relock), T3's plans (best claim; v98: never over 0.83) and whether
Bowser missed with the confirm pressed. PASS when every report carries into T3 (a T3 plan made on carried or re-locked
states) and no T3 claim is over 0.83.
Run (one seed at a time, idle machine), e.g. from /tmp/claude-0/pm/bot1, the page served on 127.0.0.1:
  for s in 1234abcd 9e3779b9 2b7e1516; do RUNNER=patient GUARD=1 TRUTH=1 MARIO_HP=10 VCLOCK=1 LATEMS=600000 ... \\
    python3 fb14_e2e.py BUILD $s OUT_$s URLBASE 3 0; done
  python3 fb14_t3check.py OUT_*/report.json"""
import sys, json

bad = 0
for p in sys.argv[1:]:
    R = json.load(open(p)); T = {t['turn']: t for t in R['turns'] if t.get('attempt', 1) == 1}
    if 3 not in T: print('FAIL', p, 'no T3 in the report'); bad += 1; continue
    ev2 = T[2]['page']['events']; ev3 = T[3]['page']['events']
    lock2 = next((e for e in ev2 if e['ev'] == 'fb14Lock' and e['turn'] == 2), None)
    c2 = next((e['t'] for e in ev3 if e['ev'] == 'fb14Confirm' and e['turn'] == 2), None)
    gone = [e for e in ev3 if e['ev'] in ('fb14CarryGone', 'fb14AllOut') and c2 is not None and e['t'] > c2]
    rel = [e for e in ev3 if e['ev'] in ('fb14Relock', 'fb14RelockNone')]
    p3 = [e for e in ev3 if e['ev'] == 'fb14Plan' and e['turn'] == 3]
    best = max([e['pp'] for e in p3] or [0])
    carried = bool(p3) and (lock2 is not None)
    ok = carried and best <= 0.83
    bad += not ok
    print('ok  ' if ok else 'FAIL', R['seed'], 'T2 lock', lock2 and lock2['how'], '| dropped', [e['ev'] for e in gone], '| relock', [e['ev'] for e in rel],
          '| T3 plans', len(p3), 'best', round(best, 3), '| T3 miss (-1/0/+1)', T[3].get('miss_m1'), T[3].get('miss'), T[3].get('miss_p1'))
print('PASS' if not bad else '%d FAILED' % bad)
