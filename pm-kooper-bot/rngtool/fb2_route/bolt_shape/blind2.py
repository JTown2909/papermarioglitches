# blind with the stage's world ends and the fitted screen affine: only u and the lifetime offset are free
import sys, numpy as np
from PIL import Image
sys.path.insert(0, '' + __import__('os').path.dirname(__import__('os').path.abspath(__file__)) + '')
import model
d0 = int(sys.argv[1]); ks = [int(x) for x in sys.argv[2].split(',')]; box = [int(x) for x in sys.argv[3].split(',')]; bolt = int(sys.argv[4]); utrue = int(sys.argv[5])
A = np.array([[1.57024509, -0.0967431477, 314.511260], [-0.00599545978, -1.03283801, 297.803168]])
def mask(i):
    f = np.asarray(Image.open('/dev/shm/boltgt/s%05d.png' % i).convert('RGB')).astype(np.int16); r, g, b = f[..., 0], f[..., 1], f[..., 2]
    return (b > 140) & (b - g > 60) & (r > g + 10)
base = mask(d0); x0, y0, x1, y1 = box
obs = [(mask(d0 + k) & ~base)[y0:y1, x0:x1] for k in ks]
def score(u, L0):
    s = 0
    for g, o in enumerate(obs):
        R = model.world_raster(u, L0 + g, bolt, A, o.shape, (x0, y0)); s += (R & o).sum() / max((R | o).sum(), 1)
    return s / len(obs)
res = sorted(((score(u, L0), u, L0) for L0 in range(0, 4) for u in range(359)), reverse=True)
top = res[:8]
print('true', utrue, utrue % 120, '| blind top:', [(round(s, 3), u, u % 120, L0) for s, u, L0 in top])
