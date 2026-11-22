"""Final Bowser phase 2 T1 with a hit: every rand_int draw (caller, range) and gRandSeed per frame from the Cloud Nine
confirm through Mario's death and the Life Shroom revive to the T2 menu (route harness, debug core). A is pressed only after
Mario's HP reaches 0 (an A during Bowser's attack guards), every PER frames. One seed per process.
Usage: PER=25 python3 revive_log.py <seed hex> <out.json>. revive_fixture.json (test_v129) was made from six runs (31415926, 7bcd4248, a11336d9 found by trying seeds)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from route import *
PER = int(os.environ.get('PER', '25'))
out = []
for seed in [int(x, 16) for x in sys.argv[1].split(',')]:
    r = Run('rv'); r.load(os.environ['T1_STATE']); r.seed(seed)
    hp0 = r.e.s8(PLAYER_DATA + 2)
    for i in range(30): r.step()
    for b, y, k in r.moves(0) + [(A, 0, 20)] + r.moves(2) + [(A, 0, 15)]:
        r.step(b, y); [r.step() for _ in range(k - 1)]
    c0 = r.f; r.step(A)
    while bstate(r.e) != 14 and r.f - c0 < 600: r.step(A if r.f - c0 == 82 else 0)
    for i in range(20): r.step()
    for b, y, k in [(A, 0, 20), (0, DOWN, 10), (0, DOWN, 10)]: r.step(b, y); [r.step() for _ in range(k - 1)]
    for i in range(30): r.step()
    p0 = r.f; r.step(A)      # Cloud Nine confirm, no action command presses: the message plays out
    hmin = 99; adv = []
    while r.f - p0 < 3000:
        k = r.f - p0; b = A if (k in (132, 152, 172) or (hmin == 0 and k % PER == PER - 1 and bstate(r.e) not in (13, 14, 17))) else 0
        if b: adv.append(k)
        r.step(b); hmin = min(hmin, r.e.s8(PLAYER_DATA + 2))
        if r.f - p0 > 300 and bstate(r.e) == 13: break
    hit = hmin < hp0
    rows = [dict(f=x['f'] - p0, bs=x['bs'], d=[[n, m] for n, m in x["d"]], s0='%08x' % x['s0'], s1='%08x' % x['s1']) for x in r.rows if x['f'] >= p0]
    out.append(dict(seed='%08x' % seed, hp0=hp0, hmin=hmin, hit=hit, menu=r.f - p0, rows=rows, hp1=r.e.s8(PLAYER_DATA + 2), adv=adv))
    print(json.dumps(dict(seed='%08x' % seed, hit=hit, hmin=hmin, hp1=out[-1]['hp1'], menu=r.f - p0)), flush=True)
json.dump(out, open(sys.argv[2], 'w'))
