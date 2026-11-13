"""v99: the Jelly's HUD timing in the emulator (charge_live README v99 section 4): from BUILD/t1_menu.st plays T1 (Charge, Cloud
Nine) and T2 (Charge, Do Nothing), then the Jelly, and prints the top HUD strip's mean luma per game frame from the Jelly
confirm (and T2's Charge confirm -> Lakilester's menu). DIAGNOSTIC: gRandSeed written at the T1 menu (setup only). Numbers only.
Run from /tmp/claude-0/pm/bot1: DISPLAY=:93 M64P_GFX=... PYTHONPATH=. python3 jelly_hud.py BUILD SEEDHEX"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from route import *
out = {}
for seed in [int(x, 16) for x in sys.argv[2:]]:
    r = Run('jf', log=False); r.load(sys.argv[1] + '/t1_menu.st'); r.seed(seed)   # DIAGNOSTIC: gRandSeed
    r.charge(0, wheel=0, sub=2); r.wait_state((14,)); r.idle(20); r.cloud_nine(0); r.wait_state((13,)); r.idle(20)
    r.charge(0, wheel=0, sub=2); r.wait_state((14,)); c2 = r.f - r.marks['charge']; r.idle(20); r.do_nothing(0); r.wait_state((13,)); r.idle(20)
    r.jelly(0, wheel=-1, sub=0); m = r.marks['jelly']; s = []
    from PIL import ImageGrab
    lum = []
    while r.f - m < 200:
        s.append(bstate(r.e)); r.step(0)
        im = ImageGrab.grab(bbox=(80, 60, 720, 540), xdisplay=os.environ.get('DISPLAY')).convert('L')
        top = im.crop((0, 0, 640, 60)); px = list(top.getdata()); lum.append((r.f - m, bstate(r.e), round(sum(px) / len(px), 1)))
    print(json.dumps(lum))
    out['%08x' % seed] = {'charge2_to_menu': c2, 'states': sorted(set(s))}
    print(json.dumps(out['%08x' % seed]), flush=True)
