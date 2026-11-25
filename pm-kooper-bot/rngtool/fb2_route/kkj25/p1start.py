"""From kkj25_prebattle (no input): per frame the game mode, bolt draws and screen brightness, to 300 frames after the battle's load."""
import sys, os, subprocess, numpy as np
sys.path.insert(0, '/home/user/papermarioglitches/pm-kooper-bot/rngtool/fb2_route')
from route import *
r = Run('p1s', log=True); e = r.e; r.load(sys.argv[1])
def br():
    p = subprocess.run(['import', '-window', 'root', '-crop', '640x480+80+60', '+repage', 'gray:-'], capture_output=True).stdout
    return np.frombuffer(p, np.uint8).mean() if p else -1
gb = None; out = []
for k in range(1, 800):
    r.step(0); gm = e.s16(GAME_MODE); nb = sum(n == 'bolt' for n, _ in r.rows[-1]['d'])
    if gb is None and gm == 8 and k > 1: gb = k
    b = round(br(), 1) if gb is not None and k <= gb + 40 else None
    out.append((k, gm, nb, b))
    if gb is not None and k >= gb + 300: break
print('gb', gb)
print('bright', [(k - gb, b) for k, gm, nb, b in out if b is not None])
print('bolts from load', [k - gb for k, gm, nb, b in out if gb and k >= gb and nb])
