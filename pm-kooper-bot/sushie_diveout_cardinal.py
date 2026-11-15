"""Cardinal-only dive-out windows: pockets from 5 DIAGNOSTIC placements + C-down, then Up U frames, Right R frames,
C-down holding Right or Up (prints successes out of 20). The recommended order (Right, then Up, C-down + Up) was
checked with +-5 deg stick error in sushie_rta.py."""
import sys, os, math, itertools

from emu import *
from pm import *
PSTAT = 0x8010ED70
e = Emu('pm-jp.z64', '/dev/shm/pmsushie/dc2')
def part(): return [n for n in npcs(e) if n['id'] == -4][0]
pockets = []
for (x, z) in [(277.6, 514.6), (278.1, 514.6), (278.6, 515.0), (279.3, 514.9), (278.0, 514.2)]:
    e.load('states/sushie_dock.st')
    for j in range(3):
        e.wf32(PLAYER+0x28, x); e.wf32(PLAYER+0x2C, 10.0); e.wf32(PLAYER+0x30, z)
        e.wf32(PLAYER+0x80, 225.0); e.wf32(PLAYER+0x84, 225.0); e.step(0,0,0,2)
    for i in range(4): e.step(0,0,0,2)
    e.step(D_CBUTTON,0,0,2)
    for i in range(45): e.step(0,0,0,2)
    if player(e)['action'] == 33 and part()['y'] > -6:
        path = '/dev/shm/pmsushie/pk_%d.st' % len(pockets); e.save(path); pockets.append(path)
print(len(pockets), 'pockets')
def run(pk, u, r, hold, cdir):
    e.load(pk)
    for i in range(u): e.step(0, 0, 80, 2)
    for i in range(r): e.step(0, 80, 0, 2)
    cd = (80, 0) if cdir == 'R' else (0, 80)
    for i in range(hold): e.step(D_CBUTTON, *cd, 2)
    for i in range(100): e.step(0, *cd, 2)
    q = player(e); s = part()
    return q['action'] == 33 and e.s8(PSTAT + 3) == 7 and s['y'] > 4
for u in (10, 15, 20, 30, 45, 60):
    row = []
    for r in (15, 20, 30, 45, 60, 90):
        ok = sum(run(pk, u, r, h, c) for pk in pockets for h in (3, 15) for c in ('R', 'U'))
        row.append('R%d:%d/%d' % (r, ok, len(pockets) * 4))
    print('U%d' % u, ' '.join(row))
