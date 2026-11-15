"""Does Hallway Bowser's battle end only at 0 HP? (JP)  DIAGNOSTIC: Bowser's HP written to H at the T1 menu, Mario 10 HP;
T1 Charge + Lakilester Spiny Flip (3 damage), then 600 frames: prints Bowser's HP and the battle states seen.
usage (from /tmp/claude-0/pm/hwub): end_test.py H"""
import os, sys
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *
H = int(sys.argv[1])
r = Run('et', log=False); r.load('states/boss_2302_laki7_menu.st'); r.e.w8(PLAYER_DATA + 2, 10)   # DIAGNOSTIC: Mario's HP
r.set_bowser_hp(H)                                                                                # DIAGNOSTIC: Bowser's HP
r.idle(10); r.charge(0, 0, 2); r.wait_state((14,)); r.idle(20); r.seq([(A, 0, 20), (A, 0, 15), (A, 0, 1)], 0, 'spiny')
for f in range(54): r.step()
for f in range(12): r.e.step(0, 70, 0, 2)
seen = []
for i in range(1500):
    s = bstate(r.e)
    if not seen or seen[-1][0] != s: seen.append((s, r.bowser_hp(), r.e.s16(GAME_MODE)))
    r.step(A if i % 25 == 24 else 0)
    if s == 13 and i > 30: break
print('H', H, seen[-12:])
