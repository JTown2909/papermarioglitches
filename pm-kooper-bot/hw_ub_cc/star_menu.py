"""Which Star Spirit power sits at submenu position SUB (JP, Hallway Bowser, Bombette state): T1 Charge + Do Nothing at
10 HP, T2 Star Spirits wheel, SUB moves, select + target confirm; logs Bowser's debuff, HP and attack/defense changes,
Mario's HP/FP and star energy for 700 frames.  usage (from /tmp/claude-0/pm/hwub): star_menu.py SUB [SEED]
DIAGNOSTIC writes (setup only): Mario's HP, gRandSeed."""
import os, sys, json
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *
sub = int(sys.argv[1]); seed = int(sys.argv[2], 16) if len(sys.argv) > 2 else 0x2468ace0
r = Run('sm', log=False); r.load(STATE_BOMB); r.e.w8(PLAYER_DATA + 2, 10)   # DIAGNOSTIC: Mario's HP
r.seed(seed)
r.idle(10); r.charge(0, 0, 2); r.wait_state((14,)); r.idle(20); r.do_nothing(0); r.wait_state((13,)); r.idle(20)
e = r.e; star0 = e.u16(PLAYER_DATA + 0x290)
r.seq(r.moves(2) + [(A, 0, 20)] + r.moves(sub) + [(A, 0, 20), (A, 0, 1)], 0, 'star')
seen = []
for i in range(900):
    a = actor(e, 0xE0)
    row = (bstate(e), bowser_status(e), r.bowser_hp(), mario_hp(e), e.u16(PLAYER_DATA + 0x290))
    if not seen or seen[-1][1:] != row: seen.append((i,) + row)
    r.step(A if (i % 25 == 24 and bstate(e) not in (13, 14, 17)) else 0)
    if bstate(e) == 14 and i > 50: break
print(json.dumps(dict(sub=sub, star0=star0, log=seen[:30])))
