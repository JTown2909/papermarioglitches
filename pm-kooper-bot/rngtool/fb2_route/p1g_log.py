"""Final Bowser PHASE 1 with the route's guard (Ultra Boots Laki route): per-frame draw logs from the T1 menu: Super Charge
(confirm after C idle frames), Lakilester's Do Nothing (after W), Bowser's T1 attack guarded by an A on AI + G (AI = the frame
of Bowser's RandInt(80); G < 0: no guard), then the T2 menu, 20 idle frames and the Power Bounce (target A after D idle
frames, an A one frame before each landing: D+44+27k, as powerbounce/fb2model.py).
DIAGNOSTIC (setup only): gRandSeed written at the T1 menu. State: states/boss_2303_p1r_menu.st (v133, below).
Run from /tmp/claude-0/pm/bot1: M64P_DBG=1 PYTHONPATH=. python3 p1g_log.py SEEDHEX C W G D OUT.json [PBSUB]"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from route import *
seed, C, W, G, D, out = int(sys.argv[1], 16), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
PBSUB = int(sys.argv[7]) if len(sys.argv) > 7 else -1
PBA = int(os.environ.get('PBA', '44'))     # v133 (study): the bounces' A, D + PBA + 27 k
r = Run('p1g'); e = r.e
_st = r.step
def _step(b=0, y=0):
    _st(b, y); r.rows[-1]['hp'] = e.s8(PLAYER_DATA + 2)
r.step = _step
r.load(os.environ.get('P1_STATE', 'states/boss_2303_p1r_menu.st')); r.seed(seed)
# v133: Phase 1 is battle 2303 (powerbounce/README.md; Bowser 99 / 99, no Star Rod flag: as on console, clip 20-20-51). v132 used
# boss_2304_p1 (phase 2's battle 2304, Bowser 1 / 99 enchanted) with his HP written to 99: wrong fight. The state: battle 2303
# started with boss_2304_p1_menu.st's gPlayerData copied as is (the route's loadout; boss_battle_start_setup.py + PDATA).
if os.environ.get('BHP'): r.set_bowser_hp(int(os.environ['BHP']))     # DIAGNOSTIC (study only)
if os.environ.get('ENCH') is not None:                                  # DIAGNOSTIC (study only): the Star Rod flag on / off
    _a = e.u32(BSTATUS + 0xE0); _p = e.u32(_a + 0x1F4); _f = e.u32(_p + 0x7C)
    e.w32(_p + 0x7C, ((_f | 0x00080000) if int(os.environ['ENCH']) else (_f & ~0x00080000)) & 0xFFFFFFFF)
if os.environ.get('MHP'): e.w8(PLAYER_DATA + 2, int(os.environ['MHP']))   # DIAGNOSTIC (study only): Mario HP, to read the damage
hp0 = e.s8(PLAYER_DATA + 2); bh0 = r.bowser_hp()
r.idle(30); r.charge(C, wheel=0, sub=2); c0 = r.marks['charge']
n = 0
while bstate(e) != 14 and n < 600: r.step(); n += 1
r.idle(20); r.do_nothing(W); p0 = r.marks['nothing']
ai = None; atk = None; n = 0; gA = None
while bstate(e) != 13 and n < 4000:
    b = 0
    if ai is not None and G >= 0 and r.f == ai + G: b = A; gA = r.f
    elif ai is None and n % 25 == 24 and bstate(e) not in (13, 14, 17): b = A
    r.step(b); n += 1
    if ai is None:
        ev = [mx for nm, mx in r.rows[-1]['d'] if nm == 'evt']
        if 80 in ev:
            ai = r.rows[-1]['f']
            if os.environ.get('MHPAI'): e.w8(PLAYER_DATA + 2, int(os.environ['MHPAI']))   # DIAGNOSTIC (study only): Mario HP after Bowser's pick, to read the damage
m2 = r.f; hp1 = e.s8(PLAYER_DATA + 2); bh1 = r.bowser_hp()
hpf = [x['f'] for i, x in enumerate(r.rows[1:], 1) if x['hp'] != r.rows[i - 1]['hp']]
r.idle(20); r.power_bounce(D, wheel=0, sub=PBSUB); dc = r.marks['pb']
for i in range(27 * 12 + 150):
    k = r.f - dc; r.step(A if k >= PBA and (k - PBA) % 27 == 0 else 0)
rolls = [(x['f'] - dc, mx) for x in r.rows for nm, mx in x['d'] if nm == 'pbroll']
res = dict(seed='%08x' % seed, C=C, W=W, G=G, D=D, marks=dict(charge=c0, nothing=p0, ai=ai, guardA=gA, menu2=m2, pb=dc),
           hp=[hp0, hp1, e.s8(PLAYER_DATA + 2)], hpf=hpf, bowser=[bh0, bh1, r.bowser_hp()], rolls=rolls,
           rows=[dict(f=x['f'], bs=x['bs'], hp=x.get('hp'), s0='%08x' % x['s0'], s1='%08x' % x['s1'], d=x['d']) for x in r.rows])
json.dump(res, open(out, 'w'))
print(json.dumps({k: v for k, v in res.items() if k != 'rows'}))
