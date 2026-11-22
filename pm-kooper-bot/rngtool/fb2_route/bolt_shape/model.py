import numpy as np
P0 = [  # D_E00BCC30 (type 0): offset[12], width[12] per lifetime index 0..10
 ([5]*12, [10,9,3,1,0,0,0,0,0,0,0,0]),
 ([5]*12, [8,7,6,5,4,3,2,1,0,0,0,0]),
 ([35,5,25,5,0,25,35,5,15,0,0,0], [10,13,15,12,11,13,10,12,5,1,0,0]),
 ([45,15,35,15,0,35,45,55,25,5,2,0], [13,10,12,10,13,10,13,10,12,9,5,1]),
 ([15,15,15,15,15,15,0,15,15,5,2,0], [14,10,15,10,13,30,32,30,24,50,40,60]),
 ([1,5,15,15,35,45,40,35,25,5,2,0], [4,6,10,5,8,14,6,10,14,35,50,50]),
 ([1,15,25,15,25,35,45,40,35,15,5,0], [2,2,23,12,8,15,15,5,6,18,38,60]),
 ([30,25,15,5,15,15,25,30,35,25,5,0], [3,3,3,11,3,12,4,5,2,12,42,50]),
 ([33,33,20,12,25,17,15,20,22,20,5,0], [3,3,3,2,10,2,2,12,2,2,2,20]),
 ([30,30,25,25,35,20,15,10,15,15,5,0], [2,2,2,2,2,2,6,2,2,2,6,5]),
 ([27,27,22,22,32,17,12,7,12,12,2,0], [2,2,2,2,2,2,2,2,2,2,2,0])]
def cmod(a, m): r = np.fmod(a, m); return r      # C's %: the dividend's sign
def verts(u, L, S, E, mirror=1):
    """screen vertices (12x2) of a type-0 bolt, phase u, lifetime L, screen start/end S,E; the projection taken as a
    similarity (mirror=-1: screen y down flips the rotation)"""
    off, wid = P0[min(max(L - 1, 0), 10)]
    S = np.asarray(S, float); E = np.asarray(E, float); a = (E - S) / 11.0
    i = np.arange(12); th = np.radians(cmod(u + (i - L) * 10, 120) - 60) * mirror
    k = np.array(off) * 0.04
    s, c = np.sin(th) * k, np.cos(th) * k
    dx = a[0] * c - a[1] * s; dy = a[0] * s + a[1] * c
    V = S[None, :] + np.outer(i, a) + np.stack([dx, dy], 1)
    return V, np.array(wid) * 0.1

def strip(u, L, S, E, mir=1, wscale=1.0):
    """the drawn quad strip (2x12 points) in screen units: half-width 8 * wscale * width/10 perpendicular to the local
    direction (the last vertex's edge horizontal, as the game's -90 deg), wscale = screen px per world unit"""
    V, w = verts(u, L, S, E, mir); n = len(V); pts = []
    for i in range(n):
        if i == 0: d = V[0] - V[1]
        elif i == n - 1: d = None
        else:
            d1 = V[i] - V[i + 1]; d0 = V[i - 1] - V[i]
            a1 = np.arctan2(d1[1], d1[0]); a0 = np.arctan2(d0[1], d0[0])
            if a0 - a1 > np.pi: a1 += 2 * np.pi
            elif a0 - a1 < -np.pi: a0 += 2 * np.pi
            a = (a0 + a1) / 2; d = np.array([np.cos(a), np.sin(a)])
        if d is None: e = np.array([1.0, 0.0])
        else: d = d / (np.hypot(*d) or 1); e = np.array([-d[1], d[0]])
        hw = 8 * wscale * w[i]
        pts.append((V[i] + e * hw, V[i] - e * hw))
    return V, w, pts
def raster(u, L, S, E, shape, mir=1, wscale=1.0):
    from PIL import Image, ImageDraw
    V, w, pts = strip(u, L, S, E, mir, wscale)
    im = Image.new('L', (shape[1], shape[0]), 0); dr = ImageDraw.Draw(im)
    for i in range(len(pts) - 1):
        a, b = pts[i]; c, d = pts[i + 1]
        if w[i] <= 0 and w[i + 1] <= 0: continue
        dr.polygon([tuple(a), tuple(c), tuple(d), tuple(b)], fill=1)
    return np.asarray(im, bool)

SKY = {1: ((-22, 190), (-88, 21)), 2: ((-1, 190), (88, 24)), 3: ((-67, 190), (-122, 10)), 4: ((57, 190), (-4, 17))}
def world_raster(u, L, bolt, A, shape, origin=(0, 0)):
    """the strip built in world x/y (the stage's ends, half-width 8 * width / 10 world units) and mapped to the screen
    by the 2x3 affine A (screen = A @ [x, y, 1]); origin: the raster's top-left in screen pixels"""
    from PIL import Image, ImageDraw
    S, E = SKY[bolt]
    V, w, pts = strip(u, L, S, E, 1, 1.0)
    P = lambda p: tuple(A[:, :2] @ np.asarray(p) + A[:, 2] - np.asarray(origin))
    im = Image.new('L', (shape[1], shape[0]), 0); dr = ImageDraw.Draw(im)
    for i in range(len(pts) - 1):
        if w[i] <= 0 and w[i + 1] <= 0: continue
        a, b = pts[i]; c, d = pts[i + 1]
        dr.polygon([P(a), P(c), P(d), P(b)], fill=1)
    return np.asarray(im, bool)
