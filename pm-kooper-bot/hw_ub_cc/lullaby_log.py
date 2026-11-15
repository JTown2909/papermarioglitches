"""Lullaby on Hallway Bowser (JP, debug core): T1 Charge + Do Nothing at 10 HP, T2 Lullaby (Star Spirits, 2 down) confirmed
after each delay D in 0..N-1; logs every non-coin rand_int from the confirm to the partner's menu (frame, caller, range,
value) and Bowser's debuff/duration afterwards.  usage (from /tmp/claude-0/pm/hwub, M64P_DBG=1): lullaby_log.py N [SEED]
DIAGNOSTIC writes (setup only): Mario's HP, gRandSeed."""
import os, sys, json
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *
N = int(sys.argv[1]); seed = int(sys.argv[2], 16) if len(sys.argv) > 2 else 0x2468ace0
r = Run('ll'); r.load(STATE_BOMB); r.e.w8(PLAYER_DATA + 2, 10)   # DIAGNOSTIC: Mario's HP
r.seed(seed)
r.idle(10); r.charge(0, 0, 2); r.wait_state((14,)); r.idle(20); r.do_nothing(0); r.wait_state((13,)); r.idle(20)
p = '/dev/shm/pmbot/ll_%d.st' % os.getpid(); r.e.save(p); r.e.step(0, 0, 0, 1)
for D in ([int(x) for x in os.environ["DS"].split(",")] if os.environ.get("DS") else range(N)):
    r.load(p); r.seq(r.moves(2) + [(A, 0, 20)] + r.moves(2) + [(A, 0, 20), (A, 0, 1)], D, 'lul'); c = r.marks['lul']
    r.wait_state((14,), cap=1500)
    rl = [x for x in rolls_after(r, c) if x[1] not in ('aura',)]
    print(json.dumps(dict(D=D, status=bowser_status(r.e), rolls100=[x for x in rl if x[2] == 100], game=[x for x in rl if not x[1].startswith("e0")], other=sorted(set((x[1], x[2]) for x in rl if x[2] != 100)))), flush=True)
os.remove(p)
