"""Can the partner use an item on Mario (JP)?  Bombette state, Mario 2 HP (DIAGNOSTIC), T1 Mario Charge, then in the
partner's menu: wheel moves W (+ down / - up), A, A, A; prints Mario's HP and the item list after.  usage: partner_item.py W"""
import os, sys
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *
W = int(sys.argv[1])
r = Run('pi', log=False); r.load(STATE_BOMB); r.e.w8(PLAYER_DATA + 2, 2)   # DIAGNOSTIC: Mario's HP (Danger)
items = lambda: [hex(r.e.u16(PLAYER_DATA + 0x1B4 + 2 * i)) for i in range(3)]
r.idle(10); r.charge(0, 0, 2); r.wait_state((14,)); r.idle(20)
r.seq(r.moves(W) + [(A, 0, 20), (A, 0, 20), (A, 0, 20)])
seen = []
for i in range(400):
    s = bstate(r.e); seen.append(s) if not seen or seen[-1] != s else None; r.step()
print('W', W, 'states', seen[:12], 'mario', mario_hp(r.e), 'items', items())
