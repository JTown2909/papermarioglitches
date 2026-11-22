# find lightning bolt frames in a clip: violet pixels that were not violet 4 frames earlier (half resolution)
import sys, subprocess, numpy as np, json
clip, out = sys.argv[1], sys.argv[2]
W, H = 640, 360
p = subprocess.Popen(['nice', '-n', '19', 'ffmpeg', '-v', 'error', '-i', clip, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
hist = []; res = []; n = 0
while True:
    b = p.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    f = np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.int16)
    r, g, bl = f[..., 0], f[..., 1], f[..., 2]
    v = (bl > 150) & (bl - g > 70) & (r > g + 15) & (r < 230)
    v[:, :110] = False
    hist.append(v)
    if len(hist) > 5: hist.pop(0)
    new = v & ~hist[0] if len(hist) == 5 else v & False
    c = int(new.sum())
    if c > 25:
        ys, xs = np.nonzero(new)
        res.append({'f': n, 't': round(n / 60, 3), 'n': c, 'x0': int(xs.min()) * 2, 'x1': int(xs.max()) * 2, 'y0': int(ys.min()) * 2, 'y1': int(ys.max()) * 2})
    n += 1
json.dump(res, open(out, 'w'))
print(n, 'frames,', len(res), 'with new violet')
