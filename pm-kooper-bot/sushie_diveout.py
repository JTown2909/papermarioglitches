"""Stage 2 of the mac_00 east-dock Sushie swim-on-land: from the pocket (Sushie riding inside the dock / strip box,
held in by the 10-unit grass step), steer and dive under the step onto the y=20 ground. Inputs only: the pocket is
reached from states/sushie_R.st with recipe A (down-right 4 f, up-right 3 f, light down-left 1 f, C-down).
Sweep: stick world angle (full tilt), frames of steering before C-down, C-down hold length.
Result: data/sushie/diveout.json; Y = riding on the y20 ground, d = Mario got off Sushie (dismount), . = still inside."""
import os, math, json
from emu import *
from pm import *
PSTAT = 0x8010ED70
e = Emu(os.environ.get('PM_ROM', 'pm-jp.z64'), '/dev/shm/pmsushie/do')
def st(a, m=80): return int(round(m*math.sin(math.radians(a)))), int(round(m*math.cos(math.radians(a))))
def part(): return [n for n in npcs(e) if n['id'] == -4][0]
e.load('states/sushie_R.st')
for a, n in ((135, 4), (45, 3)):
    for i in range(n): e.step(0, *st(a), 2)
    for i in range(2): e.step(0, 0, 0, 2)
e.step(0, *st(225, 8), 2)
for i in range(4): e.step(0, 0, 0, 2)
e.step(D_CBUTTON, 0, 0, 2)
for i in range(45): e.step(0, 0, 0, 2)
p = player(e); s = part()
assert p['action'] == 33 and s['y'] > -6, 'no pocket'
print('pocket: Mario %.4f %.4f y %.3f, Sushie y %.3f' % (p['x'], p['z'], p['y'], s['y']))
e.save('/dev/shm/pmsushie/pocket.st')
res = []
for ang in range(0, 91, 5):
    row = ''
    for pre in (1, 10, 20, 30, 40, 50, 60, 90, 120, 180):
        for hold in (3, 10, 30):
            e.load('/dev/shm/pmsushie/pocket.st')
            for i in range(pre): e.step(0, *st(ang), 2)
            for i in range(hold): e.step(D_CBUTTON, *st(ang), 2)
            for i in range(90): e.step(0, *st(ang), 2)
            q = player(e); s = part()
            r = 'Y' if (q['action'] == 33 and e.s8(PSTAT + 3) == 7 and s['y'] > 4) else ('d' if q['action'] != 33 else '.')
            res.append(dict(ang=ang, pre=pre, hold=hold, res=r, x=round(q['x'], 2), z=round(q['z'], 2)))
            row += r
        row += ' '
    print('%3d' % ang, row)
os.makedirs('data/sushie', exist_ok=True)
json.dump(res, open('data/sushie/diveout.json', 'w'))
