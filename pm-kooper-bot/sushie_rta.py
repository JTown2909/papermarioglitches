"""Real-time setups for the mac_00 east-dock Sushie swim on land, cardinal stick only (plus the down-left that is held
during the neutral-spin + hammer facing trick). Inputs only from states/mac00_e1.st (east entrance, x 600 / z 0).
Each trial samples human jitter: hold lengths, light-tilt magnitudes, +-5 deg on full-tilt holds, hammer timing.

Route + reset (both setups):  Left (full) L1 frames, Down (full) until stopped, Left (full) until stopped,
    Down (full) ~0.5 s, Left (full) until stopped, light Left ~1 s  -> Mario sits in the dock's west corner against the SW edge (x - z = -259.00 exactly).
SETUP creep (recommended):  light Right N frames (N >= 12), light Down tap,
    loop { Z (neutral), down-left, B  [faces 225 without moving];  C-down;  if nothing happened: light Left tap }
SETUP base (the runner's clip method):  light Right N frames (12 exact), light Down tap, face, C-down once.
Dive-out (cardinal):  Right >= 20 frames, then Up >= 20 frames, C-down while holding Up, keep holding Up.
Success = riding Sushie (action 33, actingPartner 7) on the y=20 ground (Sushie y > 4) outside the dock.
usage: sushie_rta.py SETUP PART NTRIALS NLIST [seed]   -> data/sushie/rta_SETUP_PART.jsonl"""
import sys, os, math, random, json
from emu import *
from pm import *
PSTAT = 0x8010ED70
SETUP, k, NT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); NL = [int(a) for a in sys.argv[4].split(',')]
random.seed(int(sys.argv[5]) if len(sys.argv) > 5 else 4000 + k)
e = Emu(os.environ.get('PM_ROM', 'pm-jp.z64'), '/dev/shm/pmsushie/rta_%s_%d' % (SETUP, k))
def part(): return [n for n in npcs(e) if n['id'] == -4][0]
def st(a, m): return int(round(m*math.sin(math.radians(a)))), int(round(m*math.cos(math.radians(a))))
F = [0]
def step(b, s, n=1):
    for i in range(n): e.step(b, s[0], s[1], 2); F[0] += 1
J = lambda: random.uniform(-5, 5)          # full-tilt angle error
light = lambda: random.uniform(5, 12)      # light tilt magnitude (deadzone is 4)
def face():
    aj = random.uniform(-10, 10); bz = random.choice([4, 5, 6, 7])
    for i in range(bz + 4):
        step((Z if i < 3 else 0) | (B if i >= bz else 0), st(225 + aj, 80) if i >= 3 else (0, 0))
    step(0, (0, 0), random.choice([12, 14, 18]))   # hammer ends, then C-down
def check():
    face(); step(D_CBUTTON, (0, 0)); step(0, (0, 0), 3)
    return player(e)['action'] == 33
os.makedirs('data/sushie', exist_ok=True)
out = open('data/sushie/rta_%s_%d.jsonl' % (SETUP, k), 'w')
for t in range(NT):
    e.load('states/mac00_e1.st'); F[0] = 0
    L1 = random.randint(58, 72); step(0, st(270 + J(), 80), L1)
    step(0, st(180 + J(), 80), random.randint(115, 140))
    step(0, st(270 + J(), 80), random.randint(35, 60))
    step(0, st(180 + J(), 80), random.randint(8, 20))       # Down a moment: guarantees contact with the SW edge
    step(0, st(270 + J(), 80), random.randint(20, 40))      # Left until stopped again (slides back along the SW edge)
    step(0, st(270, random.uniform(5, 30)), random.randint(20, 40))
    step(0, (0, 0), random.randint(2, 8))
    p = player(e); c0 = (round(p['x'], 3), round(p['z'], 3))
    n = random.choice(NL); mr = light()
    step(0, st(90, mr), n); step(0, (0, 0), random.randint(2, 6))
    step(0, st(180, random.uniform(5, 10))); step(0, (0, 0), random.randint(2, 6))
    res, checks = 'none', 0
    for it in range(12):
        p = player(e); spot = (round(p['x'], 3), round(p['z'], 3)); checks += 1
        if check(): break
        if SETUP == 'base': break
        step(0, st(270, light())); step(0, (0, 0), 2)
    f_clip = F[0]
    if player(e)['action'] == 33:
        step(0, (0, 0), 42)
        if part()['y'] < -6: res = 'water'
        else:
            res = 'pocket'
            ju = J()
            step(0, st(90 + J(), 80), random.randint(20, 90))
            step(0, st(0 + ju, 80), random.randint(20, 60))
            step(D_CBUTTON, st(0 + ju, 80), random.randint(3, 15))
            land = None
            for i in range(120):
                step(0, st(0 + ju, 80))
                q = player(e); s = part()
                if q['action'] == 33 and e.s8(PSTAT + 3) == 7 and s['y'] > 4 and q['x'] - q['z'] > -150:
                    land = F[0]; break
            if land: res = 'SWIM_ON_LAND'
    rec = dict(L1=L1, c0=c0, n=n, mag=round(mr, 1), res=res, checks=checks, spot=spot, f_clip=f_clip,
               f_land=(land if res == 'SWIM_ON_LAND' else None))
    out.write(json.dumps(rec) + '\n'); out.flush()
