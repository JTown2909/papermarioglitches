"""Route (B) T1 per-frame Close Call map (JP emulator, debug core): one seed, Mario Charge, Bombette's Strategies
menu on Do Nothing, then the Do Nothing confirm on each of N consecutive frames; logs Bowser's AI rolls and the
Close Call roll (rand_int(100) by 0x80277518, lucky if < 30) per confirm frame, plus the seed / coin phase at the
confirm so hw_model.py can be checked against it.
usage (from /tmp/claude-0/pm/hwub, M64P_DBG=1): b_t1_sweep.py SEED N [HP] > out.json
DIAGNOSTIC writes (setup only): Mario's HP, gRandSeed."""
import os, sys, json
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *

seed = int(sys.argv[1], 16); N = int(sys.argv[2]); hp = int(sys.argv[3]) if len(sys.argv) > 3 else 2
r = Run('bsw'); r.load(STATE_BOMB); r.e.w8(PLAYER_DATA + 2, hp)   # DIAGNOSTIC: Mario's HP (Danger)
r.seed(seed); r.idle(10); r.charge(0); c0 = r.marks['charge']
r.settle((14,), 20); r.seq([(0, UP, 10), (A, 0, 20), (0, DOWN, 12)])          # Strategies, hand on Do Nothing
coins = [row['f'] - c0 for row in r.rows if any(nm == 'coin' for nm, mx in row['d'])]
base = r.f - c0; snap = '/dev/shm/pmbot/bsw_%d.st' % os.getpid(); r.e.save(snap); r.e.step(0, 0, 0, 1)
pre_rows = list(r.rows)
out = dict(seed=seed, hp=hp, base=base, coins_before=coins, runs=[])
for d in range(N):
    r.e.load(snap); r.e.dbg_events(); r.rows = []; r.f = 0
    r.idle(d); c1 = r.f; r.step(A)
    for i in range(100): r.step()
    rl = rolls_after(r, c1)
    ai = [x for x in rl if x[1] == 'evt' and x[2] in (80, 60)]
    cc = [x for x in rl if x[1] == '%08x' % CC_RA]
    coin_rows = [row['f'] - c1 for row in r.rows if any(nm == 'coin' for nm, mx in row['d'])]
    out['runs'].append(dict(d=d, confirm=base + d, s0=r.rows[c1]['s0'], ai=ai, cc=cc, coins=coin_rows[:6]))
os.remove(snap)
print(json.dumps(out))
