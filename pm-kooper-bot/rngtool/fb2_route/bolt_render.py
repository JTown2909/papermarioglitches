"""v103: the stage lightning rendered (JP, debug core, glide64). DIAGNOSTIC: gRandSeed written at T1's menu (setup only).
From BUILD/t1_menu.st: T1 Super Charge (popup A on +82), Cloud Nine confirmed after W frames on its target (its message
plays out, or one A on confirm + SKIP), Bowser's turn, then N frames idle in T2's Mario menu. Every step: a screenshot
(OUT/s%05d.png = the picture after step i) and the bolt draws (caller 0xE00BC194, rand_int(359)) with their values.
log.json: per step i the frame's draws ('bolt' with value), bstate; marks (charge, cn, t2menu).
usage (from /tmp/claude-0/pm/bot1): DISPLAY=:88 M64P_GFX=... M64P_DATA=... M64P_DBG=1 PYTHONPATH=. python3 bolt_render.py BUILD SEEDHEX W SKIP N OUT"""
import sys, os, json
sys.path.insert(0, '/home/user/papermarioglitches/pm-kooper-bot/rngtool/powerbounce')
from fb2model import internal
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from route import *
from PIL import ImageGrab
def rint(s, mx):
    if mx == 1: s, v = internal(s, 1000); return s, int(v >= 501)
    if mx == 100: s, v = internal(s, 1009); return s, v // 10
    return internal(s, mx)
build, seed, W, SKIP, N, OUT = sys.argv[1], int(sys.argv[2], 16), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
os.makedirs(OUT, exist_ok=True)
r = Run('bolt')
r.load(build + '/t1_menu.st'); r.seed(seed)        # DIAGNOSTIC: gRandSeed at T1's menu (setup only)
n = [0]; shots = bool(os.environ.get('M64P_GFX'))
def st(b=0, y=0):
    r.step(b, y)
    if shots: ImageGrab.grab(bbox=(80, 60, 720, 540), xdisplay=os.environ.get('DISPLAY')).save('%s/s%05d.png' % (OUT, n[0]), compress_level=1)
    n[0] += 1
for i in range(50): st()
for b, y, k in r.moves(0) + [(A, 0, 20)] + r.moves(2) + [(A, 0, 15)]:
    st(b, y); [st() for _ in range(k - 1)]
c0 = r.f; st(A)
while bstate(r.e) != 14 and r.f - c0 < 600: st(A if r.f - c0 == 82 else 0)
for i in range(20): st()
items = [(A, 0, 20), (0, DOWN, 10), (0, DOWN, 10)]
for b, y, k in items: st(b, y); [st() for _ in range(k - 1)]
for i in range(W): st()
p0 = r.f; st(A)
AC = (132, 152, 172)
while r.f - p0 < 340 or bstate(r.e) not in (13,):
    k = r.f - p0
    st(A if (k in AC or k == SKIP) else 0)
    if r.f - p0 > 2500: break
t2 = r.f
for i in range(N): st()
rows = []
for x in r.rows:
    s = x['s0']; d = []
    for nm, mx in x['d']:
        s, v = rint(s, mx)
        if nm == 'bolt': d.append(v)
    rows.append(dict(f=x['f'], bs=x['bs'], bolt=d, nd=len(x['d']), s0='%08x' % x['s0']))
out = dict(seed='%08x' % seed, W=W, SKIP=SKIP, charge=c0, cn=p0, t2menu=t2, rows=rows)
json.dump(out, open(OUT + '/log.json', 'w'))
print(json.dumps(dict(charge=c0, cn=p0, t2menu=t2, nbolt=sum(len(x['bolt']) for x in rows))))
