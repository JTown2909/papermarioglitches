"""DIAGNOSTIC map of where C-down with Sushie lands her (RAM writes: Mario's position and facing are placed, then
inputs). For each grid point and facing: place Mario, idle 4 frames, and if gCollisionStatus.curWall is the dock-wall
collider, press C-down and record where Sushie ends up after 45 frames:
  water  = normal boarding (Sushie y about -12 + bob)
  pocket = Sushie inside the dock / strip box, riding on the dock top (y about -2 + bob for the east dock)
usage: sushie_grid.py TAG PART NPARTS X0 X1 Z0 Z1 STEP YAW,YAW,...
env: BASE (default states/sushie_dock.st), DOCK (dock-wall collider, 102 east / 101 centre), Y (dock top, 10 / 13).
Output: data/sushie/grid_TAG_PART.jsonl"""
import sys, os, json
from emu import *
from pm import *
DOCK = int(os.environ.get('DOCK', '102')); Y = float(os.environ.get('Y', '10'))
BASE = os.environ.get('BASE', 'states/sushie_dock.st')
tag, k, K = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
x0, x1, z0, z1, st = map(float, sys.argv[4:9]); yaws = [float(a) for a in sys.argv[9].split(',')]
e = Emu(os.environ.get('PM_ROM', 'pm-jp.z64'), '/dev/shm/pmsushie/g_%s_%d' % (tag, k))
def part(): return [n for n in npcs(e) if n['id'] == -4][0]
os.makedirs('data/sushie', exist_ok=True)
out = open('data/sushie/grid_%s_%d.jsonl' % (tag, k), 'w')
pts = []
x = x0
while x <= x1 + 1e-6:
    z = z0
    while z <= z1 + 1e-6:
        pts.append((round(x, 3), round(z, 3))); z += st
    x += st
for (x, z) in pts[k::K]:
    for yaw in yaws:
        e.load(BASE)
        for j in range(3):  # DIAGNOSTIC RAM WRITE: Mario's position and facing
            e.wf32(PLAYER+0x28, x); e.wf32(PLAYER+0x2C, Y); e.wf32(PLAYER+0x30, z)
            e.wf32(PLAYER+0x80, yaw); e.wf32(PLAYER+0x84, yaw); e.step(0,0,0,2)
        for i in range(4): e.step(0,0,0,2)
        p = player(e); wall = e.s16(COLLISION+0x12)
        if wall != DOCK or abs(p['y'] - Y) > 0.01: continue
        e.step(D_CBUTTON,0,0,2)
        for i in range(45): e.step(0,0,0,2)
        p2 = player(e); s = part()
        out.write(json.dumps(dict(x=round(p['x'],3), z=round(p['z'],3), px=x, pz=z, yaw=yaw, a=p2['action'],
            mx=round(p2['x'],2), mz=round(p2['z'],2), my=round(p2['y'],2), sy=round(s['y'],2))) + '\n')
        out.flush()
