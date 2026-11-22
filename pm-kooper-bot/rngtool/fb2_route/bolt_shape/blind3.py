# blind, centre-line match: the world vertex path mapped by the affine vs the mask (two-way chamfer)
import sys, numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, '' + __import__('os').path.dirname(__import__('os').path.abspath(__file__)) + '')
import model
d0 = int(sys.argv[1]); ks = [int(x) for x in sys.argv[2].split(',')]; box = [int(x) for x in sys.argv[3].split(',')]; bolt = int(sys.argv[4]); utrue = int(sys.argv[5])
A = np.array([[1.57024509, -0.0967431477, 314.511260], [-0.00599545978, -1.03283801, 297.803168]])
def mask(i):
    f = np.asarray(Image.open('/dev/shm/boltgt/s%05d.png' % i).convert('RGB')).astype(np.int16); r, g, b = f[..., 0], f[..., 1], f[..., 2]
    return (b > 140) & (b - g > 60) & (r > g + 10)
base = mask(d0); x0, y0, x1, y1 = box
obs = []
for k in ks:
    o = np.zeros_like(base); o[y0:y1, x0:x1] = (mask(d0 + k) & ~base)[y0:y1, x0:x1]
    ys, xs = np.nonzero(o); P = np.stack([xs, ys], 1).astype(float)
    if len(P) > 300: P = P[np.random.default_rng(1).choice(len(P), 300, replace=False)]
    obs.append((P, ndimage.distance_transform_edt(~o)))
S, E = model.SKY[bolt]
def cost(u, L0):
    tot = 0
    for g, (P, dt) in enumerate(obs):
        V, w = model.verts(u, L0 + g, S, E, 1); Vs = V @ A[:, :2].T + A[:, 2]; ok = (w[:-1] > 0) & (w[1:] > 0)
        if not ok.any() or not len(P): tot += 30; continue
        smp = np.concatenate([Vs[j] + np.linspace(0, 1, 10)[:, None] * (Vs[j + 1] - Vs[j]) for j in range(11) if ok[j]])
        xi = np.clip(smp[:, 0].astype(int), 0, dt.shape[1] - 1); yi = np.clip(smp[:, 1].astype(int), 0, dt.shape[0] - 1)
        a = np.minimum(dt[yi, xi], 25).mean()
        best = np.full(len(P), 1e9)
        for j in range(11):
            if not ok[j]: continue
            p, q = Vs[j], Vs[j + 1]; pq = q - p; t = np.clip(((P - p) @ pq) / max(pq @ pq, 1e-9), 0, 1); best = np.minimum(best, np.hypot(*(P - (p + t[:, None] * pq)).T))
        tot += a + np.minimum(best, 25).mean()
    return tot / len(obs)
res = sorted((cost(u, L0), u, L0) for L0 in range(0, 4) for u in range(359))
print('true', utrue, utrue % 120, '| blind top:', [(round(c, 2), u, u % 120, L0) for c, u, L0 in res[:6]], '| true u best cost', round(min(cost(utrue, L) for L in range(4)), 2))
