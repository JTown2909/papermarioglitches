# blind: alternate (u search over 0..359 at the current ends) and (ends / width refine at the current u), per lifetime offset and mirror
import sys, numpy as np
sys.argv = sys.argv[:4] + ['-1']
exec(open('' + __import__('os').path.dirname(__import__('os').path.abspath(__file__)) + '/gtfit2.py').read().split('best = None')[0])
def refine(u, L0, mir, S, E, w):
    sb = score(u, L0, S, E, mir, w)
    for step in (8, 4, 2, 1):
        for k in range(5):
            for sgn in (-1, 1):
                S2, E2, w2 = S.copy(), E.copy(), w
                if k < 4: (S2 if k < 2 else E2)[k % 2] += sgn * step
                else: w2 = w * (1 + sgn * 0.05 * step)
                sc = score(u, L0, S2, E2, mir, w2)
                if sc > sb: sb, S, E, w = sc, S2, E2, w2
    return sb, S, E, w
res = []
for mir in (1, -1):
    for L0 in range(0, 4):
        S, E, w = S0.copy(), E0.copy(), 0.5
        for rnd in range(3):
            cand = sorted(((score(v, L0, S, E, mir, w), v) for v in range(0, 360, 3)), reverse=True)[:3]
            u = max(((score(v, L0, S, E, mir, w), v) for c, v0 in cand for v in range(v0 - 2, v0 + 3)))[1] % 360
            sb, S, E, w = refine(u, L0, mir, S, E, w)
        res.append((sb, u, L0, mir))
res.sort(reverse=True)
print('blind best:', [(round(s, 3), u, u % 120, L0, mir) for s, u, L0, mir in res[:4]])
