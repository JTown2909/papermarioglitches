"""Route (B) T1 on Hallway Bowser (JP, Ultra Boots, Bombette out): Mario Charge, Bombette Do Nothing, Bowser's turn,
with Mario in Danger.  Logs every rand_int (frame relative to the Do Nothing confirm, caller, range, value) to T2's
menu or Mario's death.  Run from /tmp/claude-0/pm/hwub with M64P_DBG=1.
usage: b_t1_log.py SEED [DELAY_CHARGE] [DELAY_NOTHING] [HP]
DIAGNOSTIC writes (setup only): Mario's HP (the route arrives in Danger), gRandSeed."""
import os, sys, json
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *

seed = int(sys.argv[1], 16); d1 = int(sys.argv[2]) if len(sys.argv) > 2 else 0; d2 = int(sys.argv[3]) if len(sys.argv) > 3 else 0
hp = int(sys.argv[4]) if len(sys.argv) > 4 else 2
r = Run('bt1'); r.load(STATE_BOMB); r.e.w8(PLAYER_DATA + 2, hp)   # DIAGNOSTIC: Mario's HP (Danger)
r.seed(seed)
r.idle(10); r.charge(d1); c0 = r.marks['charge']
r.settle((14,), 20); r.do_nothing(d2); c1 = r.marks['nothing']
end = r.wait_state((13,), cap=2500)
out = dict(seed=seed, d1=d1, d2=d2, hp0=hp, charge=c0, nothing=c1, end_state=end, mario=mario_hp(r.e), bomb_ko=r.partner_ko(),
           bowser=r.bowser_hp(), draws=[(f - c1, nm, mx) for f, nm, mx in r.cnt(c0, len(r.rows)) if nm != 'coin'],
           rolls=rolls_after(r, c1))
print(json.dumps(out))
