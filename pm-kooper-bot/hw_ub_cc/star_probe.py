"""Hallway Bowser (JP, Ultra Boots, Bombette): T1 Charge + Do Nothing at 10 HP, T2 a Star Spirit power (submenu
position SUB from the top, confirm after DELAY idle frames), then T3.. Charge/Do Nothing turns until Bowser acts or
TURNS run out.  Logs Bowser's debuff / duration (Actor 0x210/0x211) on every change, the status roll (the first
rand_int(100) after the confirm), Mario's HP per turn and whether Bowser's AI drew (= he acted).
usage (from /tmp/claude-0/pm/hwub, M64P_DBG=1): star_probe.py SEED SUB DELAY [TURNS] [HP]
DIAGNOSTIC writes (setup only): Mario's HP, gRandSeed."""
import os, sys, json
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *

seed = int(sys.argv[1], 16); sub = int(sys.argv[2]); delay = int(sys.argv[3])
turns = int(sys.argv[4]) if len(sys.argv) > 4 else 4; hp = int(sys.argv[5]) if len(sys.argv) > 5 else 10
r = Run('sp'); r.load(STATE_BOMB); r.e.w8(PLAYER_DATA + 2, hp)   # DIAGNOSTIC: Mario's HP
r.e.w8(PLAYER_DATA + 5, 30); r.e.w8(PLAYER_DATA + 6, 30)   # DIAGNOSTIC: FP 30 so every probe turn can Charge
r.seed(seed)
log = []; last = [None]
def watch_to(states, cap=3000):
    n = 0
    while bstate(r.e) not in states and n < cap:
        st = bowser_status(r.e)
        if st != last[0]: log.append((r.f, 'debuff', st)); last[0] = st
        r.step(A if (n % 25 == 24 and bstate(r.e) not in (13, 14, 17)) else 0); n += 1
    return bstate(r.e)
def turn_charge(wheel=0, sub=0):
    log.append((r.f, 'menu', None)); r.idle(10); r.charge(0, wheel, sub); m = r.marks['charge']; watch_to((14,)); r.idle(20); r.do_nothing(0); c = r.marks['nothing']
    s = watch_to((13,)); r.idle(20); return m, c, s
out = dict(seed=seed, sub=sub, delay=delay, turns=[])
m, c, s = turn_charge(0, 2); out['turns'].append(dict(t=1, mario=mario_hp(r.e), bowser=r.bowser_hp(), status=bowser_status(r.e),
                                                  ai=[x for x in rolls_after(r, c) if x[1] == 'evt'][:4]))
# T2: star power
items = r.moves(2) + [(A, 0, 20)] + r.moves(sub) + [(A, 0, 20), (A, 0, 1)]
log.append((r.f, 'menu', None)); r.seq(items, delay, 'star'); cs = r.marks['star']
watch_to((14,)); r.idle(20); r.do_nothing(0); c = r.marks['nothing']; watch_to((13,)); r.idle(20)
out['star_rolls'] = [x for x in rolls_after(r, cs) if x[2] == 100][:6]
out['turns'].append(dict(t=2, mario=mario_hp(r.e), bowser=r.bowser_hp(), status=bowser_status(r.e), star=r.e.s8(PLAYER_DATA + 0x290 + 1),
                         ai=[x for x in rolls_after(r, c) if x[1] == 'evt'][:4]))
for t in range(3, 3 + turns):
    m, c, s = turn_charge(-2 if t == 3 else 0, 2)
    out['turns'].append(dict(t=t, mario=mario_hp(r.e), bowser=r.bowser_hp(), status=bowser_status(r.e),
                             ai=[x for x in rolls_after(r, c) if x[1] == 'evt'][:4]))
out['debuff_log'] = log
print(json.dumps(out))
