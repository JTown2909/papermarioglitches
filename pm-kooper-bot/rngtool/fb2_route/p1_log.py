"""Final Bowser PHASE 1 (Ultra Boots Laki route): per-frame draw logs from the T1 menu: Super Charge (confirm after C idle
frames), Lakilester's Do Nothing (after W), Bowser's T1 turn to the T2 menu, 20 idle frames, then the Power Bounce (target A
after D more idle frames, an A one frame before each landing: D+44+27k, as powerbounce/fb2model.py). Every rand_int
(caller, max) per frame, the battle state, Mario's HP per frame. DIAGNOSTIC: gRandSeed written at the T1 menu (setup).
From states/boss_2304_p1_menu.st (the route's loadout: Power Bounce, S.Jump Charge, Power Rush, Close Call).
Run from /tmp/claude-0/pm/bot1: M64P_DBG=1 PYTHONPATH=. python3 p1_log.py SEEDHEX C W D OUT.json [PBSUB]"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from route import *
seed, C, W, D, out = int(sys.argv[1], 16), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
PBSUB = int(sys.argv[6]) if len(sys.argv) > 6 else -1
r = Run('p1l'); e = r.e
_st = r.step
def _step(b=0, y=0):
    _st(b, y); r.rows[-1]['hp'] = e.s8(PLAYER_DATA + 2)
r.step = _step
r.load(os.environ.get('P1_STATE', 'states/boss_2304_p1_menu.st')); r.seed(seed)
hp0 = e.s8(PLAYER_DATA + 2); bh0 = r.bowser_hp()
r.idle(30); r.charge(C, wheel=0, sub=2); c0 = r.marks['charge']
n = 0
while bstate(e) != 14 and n < 600: r.step(); n += 1
r.idle(20); r.do_nothing(W); p0 = r.marks['nothing']
n = 0
while bstate(e) != 13 and n < 4000: r.step(A if (n % 25 == 24 and bstate(e) not in (13, 14, 17)) else 0); n += 1
m2 = r.f; hp1 = e.s8(PLAYER_DATA + 2); bh1 = r.bowser_hp()
r.idle(20); r.power_bounce(D, wheel=0, sub=PBSUB); dc = r.marks['pb']
for i in range(27 * 12 + 150):
    k = r.f - dc; r.step(A if k >= 44 and (k - 44) % 27 == 0 else 0)
rolls = [(x['f'] - dc, mx) for x in r.rows for nm, mx in x['d'] if nm == 'pbroll']
res = dict(seed='%08x' % seed, C=C, W=W, D=D, marks=dict(charge=c0, nothing=p0, menu2=m2, pb=dc), hp=[hp0, hp1, e.s8(PLAYER_DATA + 2)],
           bowser=[bh0, bh1, r.bowser_hp()], rolls=rolls, rows=[dict(f=x['f'], bs=x['bs'], hp=x.get('hp'), s0='%08x' % x['s0'], s1='%08x' % x['s1'], d=x['d']) for x in r.rows])
json.dump(res, open(out, 'w'))
print(json.dumps({k: v for k, v in res.items() if k != 'rows'}))
