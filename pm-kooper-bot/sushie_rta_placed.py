"""DIAGNOSTIC variant of sushie_rta.py: the start is a RAM-placed random spot on the east dock (stands in for route
variance), then inputs only: corner reset, Right (light: walk / walkfirst / base, or full tilt: run) N frames, light Down
tap, check / light-Left-tap loop. Clip-in only (no dive-out). usage: sushie_rta_placed.py PART N SETUP NLIST"""
import sys, os, math, random, json

from emu import *
from pm import *
k, N, SETUP = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]; NL = [int(a) for a in sys.argv[4].split(',')]
random.seed(3000 + k * 7 + hash(SETUP) % 1000)
e = Emu('pm-jp.z64', '/dev/shm/pmsushie/r2_%s_%d' % (SETUP, k))
def part(): return [n for n in npcs(e) if n['id'] == -4][0]
def st(a, m): return int(round(m*math.sin(math.radians(a)))), int(round(m*math.cos(math.radians(a))))
out = open('data/sushie/rta_placed_%s_%d.jsonl' % (SETUP, k), 'w')
F = [0]
def step(b, s, n=1):
    for i in range(n): e.step(b, s[0], s[1], 2); F[0] += 1
def face():
    aj = random.uniform(-10, 10); bz = random.choice([5, 6, 7, 8])
    for i in range(12):
        b = (Z if i < 3 else 0) | (B if bz <= i < bz + 4 else 0)
        step(b, st(225 + aj, 80) if 3 <= i < bz + 4 else (0, 0))
    step(0, (0, 0), 14)
def check():
    face(); step(D_CBUTTON, (0, 0)); step(0, (0, 0), 4)
    return player(e)['action'] == 33
light = lambda: random.uniform(5, 12)
for t in range(N):
    while True:
        u = random.uniform(770, 860); v = random.uniform(-255, -185)
        if -252 < v < -171: break
    x, z = (u + v) / 2, (u - v) / 2
    e.load('states/sushie_dock.st')
    for j in range(3):
        e.wf32(PLAYER+0x28, x); e.wf32(PLAYER+0x2C, 10.0); e.wf32(PLAYER+0x30, z); e.step(0,0,0,2)
    a = lambda: random.uniform(-5, 5)
    F[0] = 0
    for i in range(20): step(0, st(180 + a(), 80))
    for i in range(45): step(0, st(270 + a(), 80))
    for i in range(30): step(0, st(270, random.uniform(5, 30)))
    step(0, (0, 0), 3)
    p = player(e); c0 = (round(p['x'], 3), round(p['z'], 3))
    n = random.choice(NL)
    if SETUP in ('walk', 'walkfirst', 'base'):
        mr = random.uniform(5, 15)
        for i in range(n): step(0, st(90, mr))
    else:
        for i in range(n): step(0, st(90 + a(), 80))
    step(0, (0, 0), 3)
    step(0, st(180, random.uniform(5, 10)))
    step(0, (0, 0), 3)
    res = 'none'; spots = []
    for it in range(10):
        if not (SETUP == 'walkfirst' and it == 0):
            p = player(e); spots.append((round(p['x'], 3), round(p['z'], 3)))
            if check():
                step(0, (0, 0), 40); res = 'pocket' if part()['y'] > -6 else 'water'; break
            if SETUP == 'base': break
        step(0, st(270, light())); step(0, (0, 0), 2)
    out.write(json.dumps(dict(c0=c0, n=n, res=res, it=len(spots), frames=F[0], spots=spots)) + '\n'); out.flush()
