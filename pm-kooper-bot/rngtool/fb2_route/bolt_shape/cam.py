import numpy as np
EYE, OBJ, FOV, VP = np.array([0.0, 129.6279754638672, 495.1170349121094]), np.array([0.0, 60.0, 0.0]), 25.0, (296, 200, 12, 20)
def project(P, scale=2.0, eye=EYE, obj=OBJ, fov=FOV, vp=VP):
    """world points (n x 3) -> screen pixels (n x 2) in the emulator's 640x480 (scale 2 x the 320x240 frame)"""
    f = obj - eye; f /= np.linalg.norm(f); up = np.array([0, 1.0, 0]); s = np.cross(f, up); s /= np.linalg.norm(s); u = np.cross(s, f)
    d = np.asarray(P, float) - eye; xc, yc, zc = d @ s, d @ u, -(d @ f)
    t = 1 / np.tan(np.radians(fov) / 2); asp = vp[0] / vp[1]
    xn = (t / asp) * xc / -zc; yn = t * yc / -zc
    return np.stack([(vp[2] + vp[0] / 2 * (1 + xn)) * scale, (vp[3] + vp[1] / 2 * (1 - yn)) * scale], 1)
