"""Record one inputs-only replay of the mac_00 east-dock Sushie swim on land (recipe A) with the real video plugin.
Run with an X display and the glide64 plugin, e.g.
  DISPLAY=:92 M64P_GFX=/usr/lib/x86_64-linux-gnu/mupen64plus/mupen64plus-video-glide64mk2.so python3 sushie_record.py OUTDIR
The emulator data dir needs a copy of Glide64mk2.ini (/usr/share/games/mupen64plus/).
Writes OUTDIR/f%04d.png (one per game frame) and OUTDIR/log.json (step name, Mario x/y/z, action) for captioning."""
import os, sys, math, json, subprocess
from emu import *
from pm import *
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
e = Emu('pm-jp.z64', '/dev/shm/pmsushie/rec')
def st(a, m=80): return int(round(m * math.sin(math.radians(a)))), int(round(m * math.cos(math.radians(a))))
def part(): return [n for n in npcs(e) if n['id'] == -4][0]
log = []
def frame(b, sx, sy, tag):
    e.step(b, sx, sy, 2)
    p = player(e)
    s = [n for n in npcs(e) if n['id'] == -4]
    i = len(log)
    subprocess.run(['import', '-window', 'root', os.path.join(OUT, 'f%04d.png' % i)], check=True)
    log.append(dict(i=i, tag=tag, x=p['x'], y=p['y'], z=p['z'], a=p['action'], sy=s[0]['y'] if s else None,
                    map=list(where(e))))
def go(tx, tz, tag, tol=4, maxf=400):
    for i in range(maxf):
        p = player(e); dx, dz = tx - p['x'], tz - p['z']; d = math.hypot(dx, dz)
        if d < tol: return
        s = 80 if d > 20 else 40
        frame(0, int(s * dx / d), int(-s * dz / d), tag)
for i in range(5): e.step(0, 0, 0, 2)   # let the video plugin start before loading the state
e.load('states/mac00_e1.st')
for i in range(20): frame(0, 0, 0, 'start: mac_00 east entrance, Sushie out')
go(420, 300, 'walk to the east dock'); go(320, 480, 'walk to the east dock')
for i in range(20): frame(0, 0, 0, 'walk to the east dock')
for i in range(90): frame(0, *st(315), 'reference R: hold up-left into the NW dock wall (3 s)')
for i in range(60): frame(0, *st(225), 'reference R: hold down-left into the SW dock wall (2 s)')
for i in range(15): frame(0, 0, 0, 'R = (256.47, 510.09)')
for a, n, name in ((135, 4, 'down-right 4 frames'), (45, 3, 'up-right 3 frames')):
    for i in range(n): frame(0, *st(a), 'recipe A: ' + name)
    for i in range(6): frame(0, 0, 0, 'recipe A: ' + name)
frame(0, *st(225, 8), 'recipe A: light down-left tap (sets facing)')
for i in range(10): frame(0, 0, 0, 'standing at (277.55, 514.72) facing down-left')
frame(D_CBUTTON, 0, 0, 'C-DOWN')
for i in range(55): frame(0, 0, 0, 'stage 1: Sushie lands inside the dock (pocket)')
for i in range(60): frame(0, *st(45), 'stage 2: hold up-right to the grass step')
for i in range(10): frame(D_CBUTTON, *st(45), 'stage 2: C-DOWN (dive) + up-right')
for i in range(45): frame(0, *st(45), 'stage 2: dive under the step, surface on the grass')
go(560, 150, 'swim on land: riding Sushie over the town ground', maxf=200)
for i in range(140):
    if where(e)[1] != 1 and i > 5: break
    frame(0, 80, 0, 'swim on land: riding to the mac_01 exit')
for i in range(70): frame(0, 0, 0, 'mac_01, still riding Sushie')
for i in range(40): frame(0, -80, 0, 'mac_01, still riding Sushie')
json.dump(log, open(os.path.join(OUT, 'log.json'), 'w'))
print(len(log), log[-1])
