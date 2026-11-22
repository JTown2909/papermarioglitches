# full-res violet masks for frames [f0, f1) of a clip -> npz (mask stack, frame numbers)
import sys, subprocess, numpy as np
clip, f0, f1, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
W, H = 1280, 720
p = subprocess.Popen(['nice', '-n', '19', 'ffmpeg', '-v', 'error', '-ss', str(f0 / 60), '-i', clip, '-frames:v', str(f1 - f0), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
M = []; RGB = []
for i in range(f1 - f0):
    b = p.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    f = np.frombuffer(b, np.uint8).reshape(H, W, 3)
    RGB.append(f[::2, ::2].copy())
    g = f.astype(np.int16); r, gg, bl = g[..., 0], g[..., 1], g[..., 2]
    M.append((bl > 140) & (bl - gg > 60) & (r > gg + 10))
np.savez_compressed(out, m=np.array(M), rgb=np.array(RGB), f0=f0)
print(len(M), 'frames')
