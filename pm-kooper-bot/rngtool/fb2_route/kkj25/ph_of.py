import sys, json
sys.path.insert(0, '/home/user/papermarioglitches/pm-kooper-bot/rngtool/fb2_route')
from route import *
r = Run('ph', log=True); r.load(sys.argv[1]); r.idle(700)
N = {x['f']: sum(n == 'bolt' for n, _ in x['d']) for x in r.rows}; B = [f for f in N if N[f]]
S1 = {78, 83, 113, 118}; S2 = {18, 78, 88, 178}
fits = [(p1, p2) for p1 in range(130) for p2 in range(220) if all(((f + p1) % 130 in S1) or ((f + p2) % 220 in S2) for f in B) and
        all(((f + p1) % 130 in S1) + ((f + p2) % 220 in S2) == N[f] for f in range(60, 700))]
print(sys.argv[1].split('/')[-1], 'bolts', len(B), B[:12], 'fits', fits[:6], 'diff mod 10', sorted({(a - b) % 10 for a, b in fits}))
