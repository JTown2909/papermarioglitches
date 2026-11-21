"""v121: Hallway Bowser, the current route through T3 (JP, Ultra Boots, Lakilester Super; the runner's badges Power Bounce,
S.Jump Charge 0x10C, Power Rush 0x10D, Close Call): T1 Charge; Spiny Flip / T2 Time Out; Spiny Flip / T3 Power Bounce.
Logs every rand_int per frame (caller, max) with the frame's seeds and the confirm frames, for the page's T3 Power Bounce
4+ / 5+ profiles and the carry from the Time Out confirm to the Power Bounce confirm.
usage (from /tmp/claude-0/pm/hwub, M64P_DBG=1): t3pb_log.py SEED PBDELAY OUT.json [STARDELAY0]
DIAGNOSTIC writes (setup only): gRandSeed at the first menu; Mario's HP 10 at the first menu (Bowser's T1 hit must not end
the run) and 5 at the T2 menu (Danger before T3's begin_turn: Power Rush on, as on the route).
State: states/boss_2302_lrun_menu.st (AC=1 PARTNER=8 BRANK=1 BADGES=e4,10c,10d,112 BOOTS=2 HP=10 FP=15 ITEMS=8e,a3,95
NOFS=1 STARBEAM=0 SUF=_lrun boss_battle_start_setup.py 2302)."""
import os, sys, json
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'rngtool', 'fb2_route'))
from route import *
from hwlib import *
seed, PBD, OUT = int(sys.argv[1], 16), int(sys.argv[2]), sys.argv[3]; SD0 = int(sys.argv[4]) if len(sys.argv) > 4 else 0
r = Run('t3'); r.load('states/boss_2302_lrun_menu.st'); r.e.w8(PLAYER_DATA + 2, 10)   # DIAGNOSTIC: Mario's HP
r.seed(seed); e = r.e
info = {'seed': '%08x' % seed, 'pbd': PBD}
def stepx(b=0, x=0, y=0):                       # r.step with a stick x (logged the same way)
    s0 = e.u32(SEED); e.step(b, x, y, 2); d = []
    for ev in e.dbg_events(): d.append((NAMES.get(ev['ra'], '%08x' % ev['ra']), ev['a0'] if ev['a0'] < 0x80000000 else ev['a0'] - (1 << 32)))
    r.rows.append(dict(f=r.f, b=b, y=y, x=x, bs=bstate(e), s0=s0, s1=e.u32(SEED), d=d)); r.f += 1
def watch(cap, until=None, press=None):
    for i in range(cap):
        if until and bstate(e) in until and i > 5: break
        k = i; b = press(k) if press else (A if (i % 25 == 24 and bstate(e) not in (13, 14, 17)) else 0)
        r.step(b)
def spiny(tag):
    r.wait_state((14,)); r.idle(20); r.seq([(A, 0, 20), (A, 0, 15), (A, 0, 1)], 0, tag)
    for f in range(42): r.step()
    for f in range(12): r.step()
    for f in range(12): stepx(0, 70)              # stick right: onto Bowser (the A-throw lands)
    watch(2500, until=(13,)); r.idle(20)
def star(tag):
    p = '/dev/shm/pmbot/t3_%d.st' % os.getpid(); e.save(p); e.step(0, 0, 0, 1)
    n0, f0, m0 = len(r.rows), r.f, dict(r.marks)
    for d in range(SD0, SD0 + 200):
        e.load(p); e.step(0, 0, 0, 2); e.dbg_events(); del r.rows[n0:]; r.f = f0; r.marks = dict(m0)
        r.seq(r.moves(2) + [(A, 0, 20)] + r.moves(-2) + [(A, 0, 20), (A, 0, 1)], d, tag); r.wait_state((14,))
        if bowser_status(e)[0] == 8: info['starDelay'] = d; break
    os.remove(p)
r.idle(10); r.marks['T1menu'] = r.f; r.charge(0, 0, 2); r.marks['T1charge'] = r.f - 1
spiny('T1spiny'); info['hpT1'] = mario_hp(e)
e.w8(PLAYER_DATA + 2, 5)                          # DIAGNOSTIC: Danger at the T2 menu (Power Rush from T3's begin_turn)
star('T2timeout'); info['statusT2'] = bowser_status(e)
spiny('T2spiny')
r.wait_state((14,)); r.idle(20)
hp0 = r.bowser_hp()[0]
r.seq(r.moves(-2) + [(A, 0, 20), (0, DOWN, 10), (A, 0, 15), (A, 0, 1)], PBD, 'T3pb')
hits = []; prev = hp0
for k in range(40 + 27 * 12):
    r.step(A if k >= 47 and (k - 47) % 27 == 0 else 0); h = r.bowser_hp()[0]
    if h != prev: hits.append((k + 1, prev - h)); prev = h
info['hits'] = hits; info['bowserAfter'] = r.bowser_hp(); info['marks'] = r.marks
json.dump({'info': info, 'rows': r.rows}, open(OUT, 'w'))
print(json.dumps(info))
