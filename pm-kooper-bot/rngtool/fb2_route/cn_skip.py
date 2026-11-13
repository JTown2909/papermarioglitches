"""v101: the A that skips Cloud Nine's message, emulator (JP, debug core). DIAGNOSTIC: gRandSeed written at T1's menu (setup only).
From BUILD/t1_menu.st: T1 Super Charge (popup A on +82), Cloud Nine confirmed after W frames on its target,
then for each skip frame S (one A at confirm + S; -1 none; 'a,b' = two presses) to Bowser's AI and test. Prints per S: AI frame, test frame,
test value, LCG steps confirm->AI, the non-step non-aura/bolt/coin draws after +210 (the blips), the box's last frame (bstate)."""
import sys, os, json
sys.path.insert(0, '/home/user/papermarioglitches/pm-kooper-bot/rngtool/powerbounce')
from fb2model import internal
def rint(s, mx):
    if mx == 1: s, v = internal(s, 1000); return s, int(v >= 501)
    if mx == 100: s, v = internal(s, 1009); return s, v // 10
    return internal(s, mx)
sys.path.insert(0, '/home/user/papermarioglitches/pm-kooper-bot/rngtool/fb2_route')
from route import *
build, seed, W, out = sys.argv[1], int(sys.argv[2], 16), int(sys.argv[3]), sys.argv[5]
AC = tuple(int(x) for x in os.environ.get('AC', '132,152,172').split(',') if x)
skips = [[int(y) for y in x.split('+')] for x in sys.argv[4].split(',')]
r = Run('cnsc')
r.load(build + '/t1_menu.st'); r.seed(seed)        # DIAGNOSTIC: gRandSeed at T1's menu (setup only)
r.idle(50); r.charge(0); c0 = r.marks['charge']
while bstate(r.e) != 14 and r.f - c0 < 600: r.step(A if r.f - c0 == 82 else 0)
r.idle(20); r.seq([(A, 0, 20), (0, DOWN, 10), (0, DOWN, 10), (A, 0, 15)]); r.idle(W)
ST = '/dev/shm/pmbot/cnsc_%d.st' % os.getpid(); r.e.save(ST)
res = []
for sk in skips:
    r.e.load(ST); r.rows = []; r.f = 0
    r.step(A)
    n = 0; ai = test = tv = None
    while n < 600:
        k = r.f
        r.step(A if (k in AC or k in sk) else 0); n += 1
        row = r.rows[-1]
        for nm, mx in row['d']:
            if nm == 'evt' and mx == 80 and k > 250 and ai is None: ai = k
            if nm == 'testtgt' and test is None: test = k
        if test is not None and k > test: break
    s = r.rows[0]['s0']; t = r.rows[ai]['s0']; st = 0
    while s != t: s = adv(s); st += 1
    blips = [(x['f'], nm, mx) for x in r.rows[210:ai + 1] for nm, mx in x['d'] if nm not in ('step', 'aura', 'bolt', 'coin')]
    tv = None
    x = r.rows[test]; sv = x['s0']
    for nm, mx in x['d']:
        sv, v = rint(sv, mx)
        if nm == 'testtgt': tv = v; break
    atk = {52: 'slam', 55: 'fire', 62: 'claw', 72: 'wave'}.get(test - ai)
    b19 = max(i for i, x in enumerate(r.rows[:ai]) if x['bs'] == 19)
    o = dict(skip=sk, ai=ai, test=test, tv=tv, atk=atk, steps=st, s_ai='%08x' % r.rows[ai]['s0'], nblip=len(blips), blips=sorted(set((b[1], b[2]) for b in blips)), blipf=[blips[0][0], blips[-1][0]] if blips else None, last19=b19)
    print(json.dumps(o), flush=True); res.append(o)
json.dump(res, open(out, 'w'))
# usage (from /tmp/claude-0/pm/bot1): M64P_DBG=1 PYTHONPATH=. python3 cn_skip.py BUILD SEEDHEX W SKIPS OUT.json   (SKIPS: -1,255,256 or a+b; AC=132,152,172)
