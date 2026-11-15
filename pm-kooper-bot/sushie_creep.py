"""DIAGNOSTIC (RAM placement of the start point only, then inputs): east dock, Mario starts at (dnw, dsw0) - distances
to the NW / SW dock-wall lines x+z=748 / x-z=-272 - and creeps toward the SW wall with 1-frame taps at stick angle ANG
and magnitude MAG, waiting 3 frames and pressing C-down after each tap (mode tap), or walks while pressing C-down on
alternate frames (mode mash). Output data/sushie/creep_TAG.jsonl. usage: sushie_creep.py TAG DNW,DNW,...  env MODES."""
import sys, os, json, math
from emu import *
from pm import *
tag = sys.argv[1]; MODES = os.environ.get('MODES', 'tap,mash').split(','); dnws = [float(a) for a in sys.argv[2].split(',')]
e = Emu(os.environ.get('PM_ROM', 'pm-jp.z64'), '/dev/shm/pmsushie/ce_%s' % tag)
def part(): return [n for n in npcs(e) if n['id'] == -4][0]
os.makedirs('data/sushie', exist_ok=True)
out = open('data/sushie/creep_%s.jsonl' % tag, 'w')
for dnw in dnws:
    for ang in (219, 225, 231):
        for mag in (12, 30, 50, 80):
            for dsw0 in [28.0 + 0.37 * i for i in range(8)]:
                for mode in MODES:
                    u = 748 + dnw * 2 ** .5; v = -272 + dsw0 * 2 ** .5
                    x, z = (u + v) / 2, (u - v) / 2
                    e.load('states/sushie_dock.st')
                    for j in range(3):  # DIAGNOSTIC RAM WRITE: start point
                        e.wf32(PLAYER+0x28, x); e.wf32(PLAYER+0x2C, 10.0); e.wf32(PLAYER+0x30, z)
                        e.wf32(PLAYER+0x80, 225.0); e.wf32(PLAYER+0x84, 225.0); e.step(0,0,0,2)
                    for i in range(4): e.step(0,0,0,2)
                    sx = int(round(mag*math.sin(math.radians(ang)))); sy = int(round(mag*math.cos(math.radians(ang))))
                    for i in range(40):
                        if player(e)['action'] == 33: break
                        if mode == 'mash':
                            e.step(D_CBUTTON if i % 2 == 0 else 0, sx, sy, 2)
                        else:
                            e.step(0, sx, sy, 2)
                            for j in range(3): e.step(0, 0, 0, 2)
                            e.step(D_CBUTTON, 0, 0, 2)
                            for j in range(3): e.step(0, 0, 0, 2)
                    for i in range(45): e.step(0,0,0,2)
                    q = player(e); s = part()
                    res = 'none' if q['action'] != 33 else ('pocket' if s['y'] > -6 else 'water')
                    out.write(json.dumps(dict(dnw=dnw, ang=ang, mag=mag, dsw0=round(dsw0,2), mode=mode, res=res)) + '\n'); out.flush()
