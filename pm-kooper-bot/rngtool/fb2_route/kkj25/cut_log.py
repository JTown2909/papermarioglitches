"""Log every rand_int (caller, max) per frame from the post-Kammy cutscene state to Phase 2's first Mario menu + EXTRA frames.
A pressed every CAD frames starting at OFF. usage (from bot1, M64P_DBG=1): cut_log.py STATE CAD OFF EXTRA OUT.json [SEEDHEX]"""
import sys, os, json
sys.path.insert(0, '/home/user/papermarioglitches/pm-kooper-bot/rngtool/fb2_route')
from route import *
st, CAD, OFF, EXTRA, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
r = Run('cut', log=True); e = r.e
r.load(st)
if len(sys.argv) > 6: r.seed(int(sys.argv[6], 16))        # DIAGNOSTIC: gRandSeed write (setup only)
bstart = None; menu = None; k = 0
while k < 4000:
    b = A if (k >= OFF and (k - OFF) % CAD == 0) else 0
    if menu is not None: b = 0
    r.step(b); k += 1
    gm = e.s16(GAME_MODE); r.rows[-1]['gm'] = gm
    if bstart is None and gm != GM_WORLD and bstate(e) > 0: bstart = r.f
    if bstart is not None and menu is None and bstate(e) in MENU: menu = r.f
    if menu is not None and r.f >= menu + EXTRA: break
json.dump(dict(st=st, CAD=CAD, OFF=OFF, bstart=bstart, menu=menu, rows=r.rows), open(out, 'w'))
print('bstart', bstart, 'menu', menu, 'frames', r.f)
