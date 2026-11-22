# area match: rasterized strip vs the violet mask (IoU), emulator frames with a known value
import sys, numpy as np
from PIL import Image
sys.path.insert(0, '' + __import__('os').path.dirname(__import__('os').path.abspath(__file__)) + '')
import model
d0 = int(sys.argv[1]); ks = [int(x) for x in sys.argv[2].split(',')]; box = [int(x) for x in sys.argv[3].split(',')]; utrue = int(sys.argv[4])
def mask(i):
    f = np.asarray(Image.open('/dev/shm/boltgt/s%05d.png' % i).convert('RGB')).astype(np.int16); r, g, b = f[..., 0], f[..., 1], f[..., 2]
    return (b > 140) & (b - g > 60) & (r > g + 10)
base = mask(d0); x0, y0, x1, y1 = box
obs = []
for k in ks:
    m = mask(d0 + k) & ~base; mm = np.zeros_like(m); mm[y0:y1, x0:x1] = m[y0:y1, x0:x1]; obs.append(mm[y0:y1, x0:x1])
H, W = y1 - y0, x1 - x0
def score(u, L0, S, E, mir, ws):
    s = 0
    for g, (k, o) in enumerate(zip(ks, obs)):
        R = model.raster(u, L0 + g, (S[0] - x0, S[1] - y0), (E[0] - x0, E[1] - y0), (H, W), mir, ws)
        inter = (R & o).sum(); uni = (R | o).sum(); s += inter / max(uni, 1)
    return s / len(obs)
allY = np.concatenate([np.nonzero(o)[0] for o in obs]); allX = np.concatenate([np.nonzero(o)[1] for o in obs])
S0 = np.array([allX[allY.argmin()] + x0, allY.min() + y0], float); E0 = np.array([allX[allY.argmax()] + x0, allY.max() + y0], float)
best = None
for mir in (1, -1):
    for L0 in range(0, 5):
        for ws in (0.6, 1.0, 1.5):
            S, E, w = S0.copy(), E0.copy(), ws; sb = score(utrue, L0, S, E, mir, w)
            for step in (12, 6, 3, 1):
                for it in range(2):
                    for k in range(5):
                        for sgn in (-1, 1):
                            S2, E2, w2 = S.copy(), E.copy(), w
                            if k < 4: (S2 if k < 2 else E2)[k % 2] += sgn * step
                            else: w2 = w * (1 + sgn * 0.05 * step)
                            sc = score(utrue, L0, S2, E2, mir, w2)
                            if sc > sb: sb, S, E, w = sc, S2, E2, w2
            if best is None or sb > best[0]: best = (sb, L0, mir, S, E, w)
sb, L0, mir, S, E, w = best
print('true', utrue, 'IoU', round(sb, 3), 'L0', L0, 'mir', mir, 'S', S, 'E', E, 'ws', round(w, 3))
sc = sorted(((score(v, L0, S, E, mir, w), v) for v in range(359)), reverse=True)
print(' top u:', [(round(s, 3), v) for s, v in sc[:10]], '| true rank', [v for s, v in sc].index(utrue), '| mod120 of top:', sorted(set(v % 120 for s, v in sc[:6])))
