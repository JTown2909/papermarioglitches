"""Does Power Bounce wake the sleeping Hallway Bowser, and does he act in T3 / T4? (JP)  Bombette state, Mario 10 HP
(DIAGNOSTIC), seed 2468ace0 (DIAGNOSTIC): T1 Charge + Do Nothing, T2 Lullaby confirmed after 2 idle frames (asleep with this
seed, lullaby_log.py) + Do Nothing, T3 Power Bounce (action commands every 27 frames) + Do Nothing, T4 Charge + Do Nothing.
Prints Bowser's debuff on every change with the battle state, and Mario's HP at each menu.  usage: sleep_check.py [PBDELAY]"""
import os, sys
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *
D = int(sys.argv[1]) if len(sys.argv) > 1 else 0
r = Run('sc', log=False); r.load(STATE_BOMB); r.e.w8(PLAYER_DATA + 2, 10)   # DIAGNOSTIC: Mario's HP
r.seed(0x2468ace0)                                                          # DIAGNOSTIC: gRandSeed
last = [None]; out = []
def run(cap, until, press=None):
    k0 = r.f
    for i in range(cap):
        st = (bowser_status(r.e), bstate(r.e))
        if st[0] != last[0]: out.append((r.f, 'debuff', st)); last[0] = st[0]
        if bstate(r.e) in until and i > 5: return
        r.step(press(r.f - k0) if press else (A if (i % 25 == 24 and bstate(r.e) not in (13, 14, 17)) else 0))
def menu(tag): out.append((r.f, tag, 'mario', mario_hp(r.e), 'bowser', r.bowser_hp())); r.idle(20)
def nothing(): run(3000, (14,)); r.idle(20); r.do_nothing(0); run(3000, (13,))
r.idle(10); r.charge(0, 0, 2); nothing(); menu('T2 menu')
r.seq(r.moves(2) + [(A, 0, 20)] + r.moves(2) + [(A, 0, 20), (A, 0, 1)], 2, 'lul'); nothing(); menu('T3 menu')
r.seq(r.moves(-2) + [(A, 0, 20), (0, DOWN, 10), (A, 0, 15), (A, 0, 1)], D, 'pb')
run(420, (14,), press=lambda k: A if k >= 47 and (k - 47) % 27 == 0 and k < 47 + 27 * 9 else 0)
out.append((r.f, 'after PB', bstate(r.e), r.bowser_hp())); nothing(); menu('T4 menu')
r.charge(0, 0, 2); nothing(); menu('T5 menu')
for x in out: print(x)
