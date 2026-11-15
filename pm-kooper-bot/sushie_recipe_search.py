"""Inputs-only search from the corner reference R (states/sushie_R.st): hold down-right / up-right / right / down at
full tilt for a, b, c, d frames (stick released 2 frames between holds), then a final down-left move that also sets
Mario's facing, wait 4 frames, C-down. Output data/sushie/recipe_PART.jsonl. usage: sushie_recipe_search.py PART NPARTS"""
import sys, os, json, math, itertools
from emu import *
from pm import *
k, K = int(sys.argv[1]), int(sys.argv[2])
e = Emu(os.environ.get('PM_ROM', 'pm-jp.z64'), '/dev/shm/pmsushie/rs_%d' % k)
def part(): return [n for n in npcs(e) if n['id'] == -4][0]
def st(a, m): return int(round(m*math.sin(math.radians(a)))), int(round(m*math.cos(math.radians(a))))
os.makedirs('data/sushie', exist_ok=True)
out = open('data/sushie/recipe_%d.jsonl' % k, 'w')
finals = [('w8', 8, 1), ('w30', 30, 1), ('w54', 54, 1), ('r80', 80, 1), ('w8x2', 8, 2), ('w30x2', 30, 2)]
for (a, b, c, d, fi) in list(itertools.product(range(7), range(7), range(5), range(3), range(len(finals))))[k::K]:
    fname, fm, fn = finals[fi]
    # linear pre-filter (run 4.5469 per frame; walk 2.0469 + 0.0078 * (magnitude - 10))
    dnw = 13.11 + 4.547 * a + 3.215 * (c + d); dsw = 13.0 + 4.547 * b + 3.215 * (c - d)
    dsw -= (2.0469 + 0.0078 * (fm - 10) if fm < 60 else 4.5469) * fn
    if not (29.5 < dnw < 35 and 22.5 < dsw < 27.5): continue
    e.load('states/sushie_R.st')
    for ang, n in ((135, a), (45, b), (90, c), (180, d)):
        for i in range(n): e.step(0, *st(ang, 80), 2)
        for i in range(2): e.step(0, 0, 0, 2)
    for i in range(fn): e.step(0, *st(225, fm), 2)
    for i in range(4): e.step(0, 0, 0, 2)
    p = player(e)
    e.step(D_CBUTTON, 0, 0, 2)
    for i in range(45): e.step(0, 0, 0, 2)
    q = player(e); s = part()
    res = 'none' if q['action'] != 33 else ('pocket' if s['y'] > -6 else 'water')
    out.write(json.dumps(dict(a=a, b=b, c=c, d=d, final=fname, x=round(p['x'],4), z=round(p['z'],4),
        dnw=round((p['x']+p['z']-748)/2**.5,3), dsw=round((p['x']-p['z']+272)/2**.5,3), res=res)) + '\n'); out.flush()
