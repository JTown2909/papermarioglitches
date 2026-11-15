"""Record the recommended real-time setup (sushie_rta.py 'creep', no jitter) with the glide64 plugin on an X display:
cardinal route from the east entrance, corner reset (Left, Down a moment, Left), light Right 13 f, light Down tap, check / light-Left-tap loop with
the neutral-spin + hammer facing, clip into the dock, cardinal dive-out (Right, Up, C-down + Up), stop 1 s after Mario
surfaces on the grass.  usage: DISPLAY=:N M64P_GFX=.../mupen64plus-video-glide64mk2.so sushie_record_rta.py OUTDIR
(the emulator data dir needs Glide64mk2.ini). Writes OUTDIR/f%04d.png and OUTDIR/log.json."""
import os, sys, math, json, subprocess
from emu import *
from pm import *
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
e = Emu('pm-jp.z64', '/dev/shm/pmsushie/rec')
def st(a, m=80): return int(round(m * math.sin(math.radians(a)))), int(round(m * math.cos(math.radians(a))))
def part(): return [n for n in npcs(e) if n['id'] == -4]
log = []
def frame(b, s, tag, n=1):
    for _ in range(n):
        e.step(b, s[0], s[1], 2)
        p = player(e); sp = part()
        i = len(log)
        subprocess.run(['import', '-window', 'root', os.path.join(OUT, 'f%04d.png' % i)], check=True)
        log.append(dict(i=i, tag=tag, x=p['x'], y=p['y'], z=p['z'], a=p['action'], sy=sp[0]['y'] if sp else None))
for i in range(5): e.step(0, 0, 0, 2)
e.load('states/mac00_e1.st')
N0 = (0, 0)
frame(0, N0, 'mac_00 east entrance, Sushie out', 10)
frame(0, st(270), 'route: hold Left (65 f)', 65)
frame(0, st(180), 'route: hold Down until stopped', 125)
frame(0, st(270), 'reset: hold Left until stopped (west corner)', 45)
frame(0, st(180), 'reset: Down a moment (touch the lower-left edge)', 12)
frame(0, st(270), 'reset: hold Left until stopped again', 30)
frame(0, st(270, 8), 'reset: light Left 1 s (settle)', 30)
frame(0, N0, 'corner: x - z = -259.00', 4)
frame(0, st(90, 8), 'light Right 13 frames', 13)
frame(0, N0, 'light Right 13 frames', 3)
frame(0, st(180, 5), 'light Down tap')
frame(0, N0, 'light Down tap', 3)
for it in range(6):
    for i in range(9):
        frame((Z if i < 3 else 0) | (B if i >= 5 else 0), st(225) if i >= 3 else N0, 'check %d: Z, down-left, B (face down-left, no move)' % (it + 1))
    frame(0, N0, 'check %d: hammer' % (it + 1), 14)
    frame(D_CBUTTON, N0, 'check %d: C-DOWN' % (it + 1))
    frame(0, N0, 'check %d: C-DOWN' % (it + 1), 3)
    if player(e)['action'] == 33: break
    frame(0, N0, 'nothing happened -> light Left tap', 3)
    frame(0, st(270, 8), 'nothing happened -> light Left tap')
    frame(0, N0, 'nothing happened -> light Left tap', 2)
frame(0, N0, 'clip-in: Sushie lands inside the dock', 30)
frame(0, st(90), 'dive-out: hold Right', 30)
frame(0, st(0), 'dive-out: hold Up', 30)
frame(D_CBUTTON, st(0), 'dive-out: C-DOWN + Up', 10)
surf = None
for i in range(150):
    frame(0, st(0), 'diving under the step')
    if log[-1]['sy'] is not None and log[-1]['sy'] > 4 and surf is None: surf = len(log)
    if surf and len(log) >= surf + 30: break
for r in log:
    if surf and r['i'] >= surf - 1: r['tag'] = 'swim on land: riding Sushie on the grass'
json.dump(log, open(os.path.join(OUT, 'log.json'), 'w'))
print(len(log), 'surface frame', surf, log[-1])
