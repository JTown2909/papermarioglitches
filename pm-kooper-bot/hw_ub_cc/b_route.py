"""Route (B) end to end on Hallway Bowser (JP, Ultra Boots, Bombette Super): T1 Charge + Do Nothing, T2 Time Out + Do
Nothing (retried over confirm delays until Bowser is stopped), T3 Charge + Do Nothing, T4 Maple Syrup + Do Nothing, then at
T5 a sweep of Power Bounce target-confirm delays: hits, damage per hit, Bowser's HP after, and (if alive) Bombette's Bomb.
Mario's HP is set to 10 so the T1 hit does not end the run (the Close Call part is b_t1_sweep.py).
usage (from /tmp/claude-0/pm/hwub, M64P_DBG=1): [STAR=lullaby] b_route.py SEED NPB [PB_PERIOD] > out.json
STAR=lullaby: T2 Lullaby instead of Time Out and the Power Bounce sweep on T3 against the sleeping Bowser (route C check).
DIAGNOSTIC writes (setup only): Mario's HP, gRandSeed."""
import os, sys, json
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *

seed = int(sys.argv[1], 16); NPB = int(sys.argv[2]); PER = int(sys.argv[3]) if len(sys.argv) > 3 else 27
PB_RA = 'pbroll'
r = Run('br'); r.load(STATE_BOMB); r.e.w8(PLAYER_DATA + 2, 10)   # DIAGNOSTIC: Mario's HP 10 (survive T1's hit)
r.seed(seed)
info = {}
def nothing():
    r.wait_state((14,)); r.idle(20); r.do_nothing(0); r.wait_state((13,)); r.idle(20)
def snap(tag): p = '/dev/shm/pmbot/br_%s_%d.st' % (tag, os.getpid()); r.e.save(p); r.e.step(0, 0, 0, 1); return p
r.idle(10); r.charge(0, 0, 2); nothing(); info['t1'] = dict(mario=mario_hp(r.e), bowser=r.bowser_hp())
t2 = snap('t2')
SL = os.environ.get('STAR') == 'lullaby'
for d in range(0, 200):
    r.load(t2); r.logging = True
    r.seq(r.moves(2) + [(A, 0, 20)] + r.moves(2 if SL else -2) + [(A, 0, 20), (A, 0, 1)], d, 'star')
    r.wait_state((14,))
    if bowser_status(r.e)[0] == (6 if SL else 8): info['star_delay'] = d; break
nothing(); info['t2'] = dict(status=bowser_status(r.e))
if not SL:
    r.charge(0, -2, 2); nothing(); info['t3'] = dict(mario=mario_hp(r.e), status=bowser_status(r.e))
    r.seq(r.moves(-1) + [(A, 0, 20), (0, DOWN, 10), (A, 0, 15), (A, 0, 1)], 0, 'syrup'); nothing()
info['t4'] = dict(mario=mario_hp(r.e), status=bowser_status(r.e), bowser=r.bowser_hp())
t5 = snap('t5'); runs = []
for D in range(NPB):
    r.load(t5); r.seq(r.moves(-2 if SL else 1) + [(A, 0, 20), (0, DOWN, 10), (A, 0, 15), (A, 0, 1)], D, 'pb'); dc = r.marks['pb']
    hp_tr = []; prev = r.bowser_hp()[0]; stl = [(0, bowser_status(r.e))]
    for i in range(40 + PER * 12):
        k = r.f - dc; r.step(A if k >= 47 and (k - 47) % PER == 0 and k < 47 + PER * 9 else 0)
        h = r.bowser_hp()[0]
        if h != prev: hp_tr.append((k, prev - h)); prev = h
        if bowser_status(r.e) != stl[-1][1]: stl.append((k, bowser_status(r.e)))
    print('  status during/after the Power Bounce', stl, 'state', bstate(r.e), file=sys.stderr, flush=True)
    rl = [(x[0], x[3]) for x in rolls_after(r, dc) if x[1] == PB_RA]
    bomb = None
    if r.bowser_hp()[0] > 0 and r.wait_state((14,), cap=600) == 14:      # Bombette's Bomb (mash through its meter)
        r.idle(20); h0 = r.bowser_hp()[0]; r.seq([(A, 0, 20), (A, 0, 15), (A, 0, 1)], 0, 'bomb')
        for i in range(400): r.step(A if i % 3 == 0 else 0)
        bomb = h0 - r.bowser_hp()[0]
    runs.append(dict(D=D, rolls=rl, hits=hp_tr, bomb=bomb, status_after=bowser_status(r.e), bowser=r.bowser_hp(), state=bstate(r.e)))
    print('D %d rolls %s hits %s bomb %s bowser %s' % (D, rl, hp_tr, bomb, r.bowser_hp()), file=sys.stderr, flush=True)
for p in (t2, t5): os.remove(p)
print(json.dumps(dict(seed=seed, info=info, pb=runs)))
