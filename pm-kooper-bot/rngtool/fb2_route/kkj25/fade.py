"""From the post-Kammy cutscene state, A every CAD frames from OFF: per frame the screen's mean brightness and the game mode,
from 60 frames before the battle's game-mode change to 60 after. usage (bot1, DISPLAY + M64P_GFX): fade.py STATE CAD OFF"""
import sys, os, subprocess, numpy as np
from PIL import Image
sys.path.insert(0, '/home/user/papermarioglitches/pm-kooper-bot/rngtool/fb2_route')
from route import *
st, CAD, OFF = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
r = Run('fade', log=False); e = r.e; r.load(st)
def br():
    p = subprocess.run(['import', '-window', 'root', '-crop', '640x480+80+60', '+repage', 'gray:-'], capture_output=True).stdout
    return np.frombuffer(p, np.uint8).mean() if p else -1
k = 0; gb = None; hist = []
while k < 4000:
    b = A if (k >= OFF and (k - OFF) % CAD == 0) else 0
    if gb is not None: b = 0
    r.step(b); k += 1; gm = e.s16(GAME_MODE)
    if gb is None and hist and hist[-1][1] == 4 and gm == 8: gb = k
    if gb is None and k > 1100 or gb is not None:
        hist.append((k, gm, round(br(), 1)))
    else: hist.append((k, gm, None))
    if gb is not None and k >= gb + 80: break
print('gb', gb)
for x in hist:
    if x[2] is not None and x[0] >= gb - 80: print(x[0] - gb, x[1], x[2])
