# blind reading, exact geometry, picture = the frame after the logged one; score: violet pixels' distance to the projected
# centre line (visible segments) and the centre line's distance to the violet (two-way chamfer, capped)
import json, numpy as np, sys
from PIL import Image
from scipy import ndimage
sys.path.insert(0, '' + __import__('os').path.dirname(__import__('os').path.abspath(__file__)) + '')
import model
from cam import project
D = sys.argv[1]; LAG = int(sys.argv[2]) if len(sys.argv) > 2 else 1; R = json.load(open(D + '/truth.json'))
def mask(i):
    f = np.asarray(Image.open('%s/s%05d.png' % (D, i)).convert('RGB')).astype(np.int16); r, g, b = f[..., 0], f[..., 1], f[..., 2]
    return (b > 140) & (b - g > 60) & (r > g + 10)
G = {}
for r in R:
    for b in r['bolts']:
        if abs(b['start'][2] + 91) > 1: continue
        G.setdefault((b['data'], tuple(b['start'])), []).append((r['i'], b))
def centre(u, L, S3, E3):
    V, w = model.verts(u, L, S3[:2], E3[:2], 1); z = S3[2]
    Sv = project(np.column_stack([V, np.full(12, z)])); ok = (w[:-1] > 0) & (w[1:] > 0); return Sv, ok
ok_n = 0; tot = 0
for k, fr in G.items():
    fr = [x for x in fr if 3 <= x[1]['life'] <= 7]
    if len(fr) < 3: continue
    i0 = fr[0][0]; base = mask(max(0, i0 - 4)); u0 = fr[0][1]['u']; L0 = fr[0][1]['life']; S3, E3 = fr[0][1]['start'], fr[0][1]['end']
    obs = []
    for i, b in fr:
        m = mask(i + LAG) & ~base; m[:60] = False
        ys, xs = np.nonzero(m); P = np.stack([xs, ys], 1).astype(float)
        if len(P) > 300: P = P[np.random.default_rng(1).choice(len(P), 300, replace=False)]
        obs.append((i - i0, P, ndimage.distance_transform_edt(~m)))
    def cost(u, Lf):
        t = 0
        for di, P, dt in obs:
            Sv, ok = centre(u, Lf + di, S3, E3)
            if not ok.any() or len(P) == 0: t += 20; continue
            smp = np.concatenate([Sv[j] + np.linspace(0, 1, 10)[:, None] * (Sv[j + 1] - Sv[j]) for j in range(11) if ok[j]])
            xi = np.clip(smp[:, 0].astype(int), 0, dt.shape[1] - 1); yi = np.clip(smp[:, 1].astype(int), 0, dt.shape[0] - 1)
            inside = (smp[:, 1] >= 60)
            a = np.minimum(dt[yi, xi][inside], 20).mean() if inside.any() else 20
            best = np.full(len(P), 1e9)
            for j in range(11):
                if not ok[j]: continue
                p, q = Sv[j], Sv[j + 1]; pq = q - p; tt = np.clip(((P - p) @ pq) / max(pq @ pq, 1e-9), 0, 1); best = np.minimum(best, np.hypot(*(P - (p + tt[:, None] * pq)).T))
            t += a + np.minimum(best, 20).mean()
        return t / len(obs)
    res = sorted((cost(u, Lf), u, Lf) for Lf in (L0 - 1, L0, L0 + 1) for u in range(359))
    bu = res[0][1]; dmod = min((bu - u0) % 120, (u0 - bu) % 120); tot += 1; ok_n += dmod <= 2
    print('bolt', [round(x) for x in S3[:2]], 'true', u0, u0 % 120, 'L0', L0, '| read', bu, bu % 120, 'L', res[0][2], '| cost', round(res[0][0], 2), '(true', round(min(cost(u0, L) for L in (L0,)), 2), ') off', dmod)
print('within 2 (mod 120):', ok_n, 'of', tot)
