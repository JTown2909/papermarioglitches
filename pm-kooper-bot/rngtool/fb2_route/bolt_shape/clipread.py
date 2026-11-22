# read a bolt in the runner's capture: exact geometry, the battle camera, the page's capture layout (CHG_MAP0); candidates:
# which sky bolt, u, and the lifetime of the first picture used. Pictures: one per game frame (the capture shows each twice).
import sys, numpy as np
from scipy import ndimage
sys.path.insert(0, '' + __import__('os').path.dirname(__import__('os').path.abspath(__file__)) + '')
import model
from cam import project
d = np.load(sys.argv[1]); M = d['m']; f0 = int(d['f0']); frames = [int(x) for x in sys.argv[2].split(',')]; box = [int(x) for x in sys.argv[3].split(',')]
SX, OX, SY, OY = 3.2637, 272.82, 3.3221, -31.09
def cap(P): q = project(P) / 2; return np.stack([SX * q[:, 0] + OX, SY * q[:, 1] + OY], 1)
base = M[max(0, frames[0] - f0 - 4)]; x0, y0, x1, y1 = box
obs = []
for f in frames:
    m = M[f - f0] & ~base; mm = np.zeros_like(m); mm[y0:y1, x0:x1] = m[y0:y1, x0:x1]
    ys, xs = np.nonzero(mm); P = np.stack([xs, ys], 1).astype(float)
    if len(P) > 400: P = P[np.random.default_rng(1).choice(len(P), 400, replace=False)]
    obs.append((P, ndimage.distance_transform_edt(~mm)))
CAP = 40
def cost(u, Lf, bolt, sub=None):
    S, E = model.SKY[bolt]; t = 0; use = range(len(obs)) if sub is None else sub
    for g in use:
        P, dt = obs[g]
        V, w = model.verts(u, Lf + g, S, E, 1); Sv = cap(np.column_stack([V, np.full(12, -91.0)])); ok = (w[:-1] > 0) & (w[1:] > 0)
        if not ok.any() or not len(P): t += CAP; continue
        smp = np.concatenate([Sv[j] + np.linspace(0, 1, 10)[:, None] * (Sv[j + 1] - Sv[j]) for j in range(11) if ok[j]])
        xi = np.clip(smp[:, 0].astype(int), 0, dt.shape[1] - 1); yi = np.clip(smp[:, 1].astype(int), 0, dt.shape[0] - 1)
        inb = (smp[:, 1] >= y0) & (smp[:, 1] < y1) & (smp[:, 0] >= x0) & (smp[:, 0] < x1)
        a = np.minimum(dt[yi, xi][inb], CAP).mean() if inb.any() else CAP
        best = np.full(len(P), 1e9)
        for j in range(11):
            if not ok[j]: continue
            p, q = Sv[j], Sv[j + 1]; pq = q - p; tt = np.clip(((P - p) @ pq) / max(pq @ pq, 1e-9), 0, 1); best = np.minimum(best, np.hypot(*(P - (p + tt[:, None] * pq)).T))
        t += a + np.minimum(best, CAP).mean()
    return t / len(use)
for bolt in (1, 2, 3, 4):
    S, E = model.SKY[bolt]; e = cap(np.array([[*S, -91.0], [*E, -91.0]])); print('sky bolt', bolt, 'ends in the capture', np.round(e).tolist())
res = sorted((cost(u, Lf, b), u, Lf, b) for b in (1, 2, 3, 4) for Lf in (1, 2, 3, 4) for u in range(359))
print('best:', [(round(c, 2), u, u % 120, Lf, b) for c, u, Lf, b in res[:8]])
c, u, Lf, b = res[0]; n = len(obs)
# self-consistency: the first half and the second half of the pictures read alone
for name, sub in (('first half', list(range(n // 2 + 1))), ('second half', list(range(n // 2, n)))):
    r2 = sorted((cost(v, Lf, b, sub), v) for v in range(359))
    print(name, 'reads', [(round(cc, 2), v % 120) for cc, v in r2[:4]])
