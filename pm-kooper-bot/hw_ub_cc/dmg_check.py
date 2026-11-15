"""Runner's Hallway loadout damage check (JP): badges Power Bounce, Charge (0x10A or 0x10B, see README), Power Rush (0x10D),
Close Call; Ultra Boots; Bombette (rank from the state).  T1 Charge (submenu position SUB) + Do Nothing with Mario at 10 HP,
then Mario's HP written to H (DIAGNOSTIC: Danger without taking Bowser's hit), T2 Power Bounce (confirm after D idle frames,
action commands every 27 frames), then Bombette's Bomb (A mashed every 2 frames).  Prints the damage of every hit.
usage (from /tmp/claude-0/pm/hwub): [PBSUB=n] [ADDBADGE=10d] dmg_check.py STATE SUB H [D] [SEED]   (0x10A state: Charge SUB 1, PBSUB=2)
DIAGNOSTIC writes: Mario's HP (10 for T1, H after it), gRandSeed."""
import os, sys
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *
st, sub, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); D = int(sys.argv[4]) if len(sys.argv) > 4 else 0
seed = int(sys.argv[5], 16) if len(sys.argv) > 5 else 0x2468ace0
r = Run('dc', log=False); r.load(st); r.e.w8(PLAYER_DATA + 2, 10)   # DIAGNOSTIC: Mario 10 HP for T1
r.seed(seed)                                                         # DIAGNOSTIC: gRandSeed
fp0 = r.e.s8(PLAYER_DATA + 5)
T1PB = os.environ.get('T1PB')   # T1PB=1: skip the T1 Charge turn, Power Bounce on T1 at H HP
if T1PB: r.e.w8(PLAYER_DATA + 2, H); fp1 = fp0; r.idle(10)   # DIAGNOSTIC: Mario's HP H
else:
  r.idle(10); r.charge(0, 0, sub); r.wait_state((14,)); fp1 = r.e.s8(PLAYER_DATA + 5); r.idle(20); r.do_nothing(0); r.wait_state((13,)); r.idle(20)
  if H > 0: r.e.w8(PLAYER_DATA + 2, H)                                 # DIAGNOSTIC: Mario's HP for T2 (H 0: keep what Bowser's T1 hit left)
if os.environ.get('ADDBADGE'):                                       # DIAGNOSTIC: badge added to the equipped list mid-battle
    for i in range(64):
        if r.e.u16(PLAYER_DATA + 0x208 + 2 * i) == 0: r.e.w16(PLAYER_DATA + 0x208 + 2 * i, int(os.environ['ADDBADGE'], 16)); break
def watch(cap, press, until=None):
    prev = r.bowser_hp()[0]; k0 = r.f; hits = []
    for i in range(cap):
        if until and bstate(r.e) in until and i > 30: break
        k = r.f - k0; r.step(press(k)); h = r.bowser_hp()[0]
        if h != prev: hits.append(prev - h); prev = h
    return hits
r.seq([(A, 0, 20)] + r.moves(int(os.environ.get('PBSUB', '1'))) + [(A, 0, 15), (A, 0, 1)], D, 'pb')
fp2 = r.e.s8(PLAYER_DATA + 5); pb = watch(47 + 27 * 9 + 20, lambda k: A if k >= 46 and (k - 46) % 27 == 0 else 0)
r.wait_state((14,), cap=800); r.idle(20)
r.seq([(A, 0, 20), (A, 0, 15), (A, 0, 1)], 0, 'bomb')
bomb = watch(500, lambda k: A if k % 2 == 0 else 0, until=(13,))
print('FP before PB %d;' % fp2, 'state %s sub %d H %d D %d: charge FP %d -> %d, PB hits %s (sum %d), Bomb %s, Bowser %s' % (st, sub, H, D, fp0, fp1, pb, sum(pb), bomb, r.bowser_hp()))
