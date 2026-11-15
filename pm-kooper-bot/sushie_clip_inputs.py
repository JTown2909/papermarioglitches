"""Read a clip's input display (the layout in the runner's capture: stick gate at the top left, buttons to its right) at
30 fps. Prints per frame the stick-circle offset in pixels from neutral and which buttons are lit. Frames must be
extracted first: ffmpeg -i CLIP -vf fps=30 DIR/a%03d.png.  usage: sushie_clip_inputs.py DIR > data/sushie/clip_inputs.txt
Full tilt is about 20 px. The B / Z / C-down states were read by eye from contact sheets (see README)."""
import sys, glob, os
import numpy as np
from PIL import Image
D = sys.argv[1]
R = 17.0
th = np.linspace(0, 2 * np.pi, 90, endpoint=False)
for f in sorted(glob.glob(os.path.join(D, 'a*.png'))):
    im = np.asarray(Image.open(f).convert('L').crop((0, 0, 150, 80))).astype(float)
    m = im > 170
    best = None
    for cy in np.arange(20, 60, 0.5):
        for cx in np.arange(80, 128, 0.5):
            px = np.clip((cx + R * np.cos(th)).round().astype(int), 0, 149)
            py = np.clip((cy + R * np.sin(th)).round().astype(int), 0, 79)
            sc = m[py, px].mean()
            if best is None or sc > best[0]: best = (sc, cx, cy)
    rgb = np.asarray(Image.open(f).convert('RGB')).astype(float)
    cd = rgb[60:69, 272:281].mean()
    print(os.path.basename(f), 'stick_px %+.1f %+.1f' % (best[1] - 104, -(best[2] - 39)), 'cdown_level %.0f' % cd)
