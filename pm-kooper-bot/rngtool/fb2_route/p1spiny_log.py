"""v175: Final Bowser PHASE 1 T1 on the runner's route (Charge; Lakilester Spiny Flip): per-frame draw logs from the T1 menu, to check
Hallway Bowser's Spiny Flip model (pmrng_core.js hw_spiny: energy effect on confirm + 39 lasting to + 119 with 20-frame respawns, the
impact's 8 x rand(359) on + imp, Bowser's AI on impact + 44) in battle 2303. Super Charge (confirm after C idle frames), Spiny Flip
(target confirm after W; aim: AIM idle frames then right for R frames, no A: the throw on the aim timer, as hw1_turnlog.py), then
Bowser's T1 to Mario's T2 menu (guard: an A on AI + G, G < 0 none). DIAGNOSTIC (setup only): gRandSeed at the T1 menu.
Run from /tmp/claude-0/pm/bot1: M64P_DBG=1 PYTHONPATH=. python3 p1spiny_log.py SEEDHEX C W AIM R G OUT.json"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from route import *
seed, C, W, AIM, R, G, out = int(sys.argv[1], 16), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6]), sys.argv[7]
r = Run('p1s'); e = r.e
def stepx(b=0, x=0, y=0):
    s0 = e.u32(SEED); e.step(b, x, y, 2); d = []
    for ev in e.dbg_events(): d.append((NAMES.get(ev['ra'], '%08x' % ev['ra']), ev['a0'] if ev['a0'] < 0x80000000 else ev['a0'] - (1 << 32)))
    r.rows.append(dict(f=r.f, b=b, y=y, x=x, bs=bstate(e), s0=s0, s1=e.u32(SEED), d=d, hp=e.s8(PLAYER_DATA + 2))); r.f += 1
r.load(os.environ.get('P1_STATE', 'states/boss_2303_p1r_menu.st')); r.seed(seed)
r.idle(30); r.charge(C, wheel=0, sub=2); c0 = r.marks['charge']
n = 0
while bstate(e) != 14 and n < 600: r.step(); n += 1
r.idle(20)
for k in range(25): stepx(A if k == 0 else 0)        # the partner menu: Abilities
for k in range(25): stepx(A if k == 0 else 0)        # Spiny Flip
n = 0
while bstate(e) != 17 and n < 120: stepx(); n += 1
for k in range(W): stepx()
P = r.f; stepx(A)                                     # the target confirm (the bar hides about here on console)
for k in range(AIM): stepx()
for k in range(R): stepx(0, 70, 0)
TA = int(os.environ.get('THROWA', '-1'))     # v175: the runner throws with A ("ナイス"): an A this many frames after the aim
if TA >= 0:
    for k in range(TA): stepx(0, 70, 0)
    stepx(A, 70, 0)
ai = None; n = 0
while not (bstate(e) == 13 and n > 200) and n < 3000:
    b = A if (ai is not None and G >= 0 and r.f == ai + G) else 0
    stepx(b); n += 1
    if ai is None and any(nm == 'evt' and mx == 80 for nm, mx in r.rows[-1]['d']): ai = r.rows[-1]['f']
rows = r.rows[c0:]
res = dict(seed='%08x' % seed, C=C, W=W, AIM=AIM, R=R, G=G, charge=c0, P=P, ai=ai, t2=r.f, hp=e.s8(PLAYER_DATA + 2), bowser=r.bowser_hp(), rows=[dict(f=x['f'], s0=x['s0'], d=x['d'], bs=x['bs']) for x in rows])
json.dump(res, open(out, 'w'))
big = [(x['f'] - P, len(x['d']), sorted(set(m for _, m in x['d']))) for x in r.rows[P:] if len([1 for nm, m in x['d'] if m in (359, 360)]) >= 4]
print('seed %08x: P %d, AI %s (P+%s), T2 menu P+%d, Mario %d, Bowser %s; big draw frames (P+k, n, ranges): %s' % (seed, P, ai, (ai - P) if ai else None, r.f - P, res['hp'], res['bowser'], big[:12]), flush=True)
