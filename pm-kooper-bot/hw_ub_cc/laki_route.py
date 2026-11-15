"""Lakilester routes on Hallway Bowser (JP, Ultra Boots, Lakilester Super; Mario 10 HP so Bowser's hits do not end the run):
plays a route turn by turn and logs Bowser's HP drop per hit, his debuff, Mario's HP, and whether the battle ended.
ROUTE = current : T1 Charge; Spiny Flip / T2 Time Out; Spiny Flip / T3 Bounce; Spiny / T4 Bounce; Spiny / T5 Jump; Spiny
        C       : T1 Charge; Spiny Flip / T2 Lullaby; Spiny Flip / T3 Bounce; Spiny / T4 Bounce; Spiny
The star power is retried over confirm delays until Bowser gets the status; each Power Bounce takes PB delays from argv.
usage (from /tmp/claude-0/pm/hwub, M64P_DBG=1): laki_route.py ROUTE SEED [PBD3] [PBD4]
DIAGNOSTIC writes (setup only): Mario's HP, gRandSeed.  State: states/boss_2302_laki7_menu.st (README)."""
import os, sys, json
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *
ROUTE = sys.argv[1]; seed = int(sys.argv[2], 16); pbd = [int(x) for x in sys.argv[3:5]] + [0, 0]
r = Run('lr'); r.load('states/boss_2302_laki7_menu.st'); r.e.w8(PLAYER_DATA + 2, 10)   # DIAGNOSTIC: Mario's HP
r.seed(seed)
log = []
def watch(cap, until=None, press=None, tag=''):
    prev = r.bowser_hp()[0]; k0 = r.f
    for i in range(cap):
        if until and bstate(r.e) in until and i > 5: break
        k = r.f - k0; b = press(k) if press else (A if (i % 25 == 24 and bstate(r.e) not in (13, 14, 17)) else 0)
        r.step(b); h = r.bowser_hp()[0]
        if h != prev: log.append((tag, k, prev - h, h)); prev = h
    return bstate(r.e)
def spiny(tag):
    r.wait_state((14,)); r.idle(20); r.seq([(A, 0, 20), (A, 0, 15), (A, 0, 1)], 0, 'spiny')
    for f in range(42): r.step()
    for f in range(12): r.step(0, 0)
    r.e.step(0, 70, 0, 2)                                         # stick right (r.step has no x): onto Bowser
    for f in range(11): r.e.step(0, 70, 0, 2)
    watch(2500, until=(13,), tag=tag); r.idle(20)
def star(sub, want, tag):
    p = '/dev/shm/pmbot/lr_%d.st' % os.getpid(); r.e.save(p); r.e.step(0, 0, 0, 1)
    for d in range(200):
        r.e.load(p); r.e.step(0, 0, 0, 2)
        r.seq(r.moves(2) + [(A, 0, 20)] + r.moves(sub) + [(A, 0, 20), (A, 0, 1)], d, 'star'); r.wait_state((14,))
        if bowser_status(r.e)[0] == want: log.append((tag, 'delay', d, bowser_status(r.e))); break
    os.remove(p)
def pb(wheel, D, tag):
    r.seq(r.moves(wheel) + [(A, 0, 20), (0, DOWN, 10), (A, 0, 15), (A, 0, 1)], D, 'pb'); dc = r.marks['pb']
    watch(40 + 27 * 12, press=lambda k: A if k >= 47 and (k - 47) % 27 == 0 else 0, tag=tag)
def jump(wheel, tag):
    r.seq(r.moves(wheel) + [(A, 0, 20), (A, 0, 15), (A, 0, 1)], 0, 'jump')
    watch(160, press=lambda k: A if k in range(20, 60, 2) else 0, tag=tag)
st = lambda t: log.append((t, 'end', dict(mario=mario_hp(r.e), bowser=r.bowser_hp(), status=bowser_status(r.e), bs=bstate(r.e))))
r.idle(10); r.charge(0, 0, 2); spiny('T1 spiny'); st('T1')
star(-2 if ROUTE == 'current' else 2, 8 if ROUTE == 'current' else 6, 'T2 star'); spiny('T2 spiny'); st('T2')
pb(-2, pbd[0], 'T3 pb'); spiny('T3 spiny'); st('T3')
pb(0, pbd[1], 'T4 pb'); spiny('T4 spiny'); st('T4')
if ROUTE == 'current': jump(0, 'T5 jump'); spiny('T5 spiny'); st('T5')
for x in log: print(x)
