"""Toad Town (mac_00) east-dock Sushie swim-on-land: inputs-only replay from the east-entrance state, with jitter.

Start: states/mac00_e1.st (make_state_room.py PRA_MAP=mac_00 PRA_AREA=1 PRA_ENTRY=1 PARTNER=7). Everything after the
load is controller input only (no RAM writes). Stages:
  walk to the dock -> corner reference R (hold up-left 90 f into the NW wall, down-left 60 f into the SW wall)
  -> recipe holds at full tilt (stick released 2 f between holds) -> final down-left move (sets the facing)
  -> C-down -> Sushie lands inside the dock ("pocket")
  -> hold up-right PRE frames, then C-down for HOLD frames while still holding up-right -> Sushie dives under the
     10-unit step and surfaces on the y=20 ground: swim on land.
usage: sushie_verify.py [nominal|jitter]
"""
import sys, os, math, json, itertools
from emu import *
from pm import *
PSTAT = 0x8010ED70   # gPartnerStatus (actingPartner at +3)
e = Emu(os.environ.get('PM_ROM', 'pm-jp.z64'), os.environ.get('PM_TMP', '/dev/shm/pmsushie/verify'))

def st(a, m=80):
    return int(round(m * math.sin(math.radians(a)))), int(round(m * math.cos(math.radians(a))))

def part():
    return [n for n in npcs(e) if n['id'] == -4][0]

def go(tx, tz, tol=4, maxf=400):
    for i in range(maxf):
        p = player(e); dx, dz = tx - p['x'], tz - p['z']; d = math.hypot(dx, dz)
        if d < tol: return
        s = 80 if d > 20 else 40
        e.step(0, int(s * dx / d), int(-s * dz / d), 2)

RECIPES = {
    # holds at full tilt: list of (world angle, frames); final = (angle, magnitude, frames)
    'A': dict(holds=[(135, 4), (45, 3)], final=(225, 8, 1)),            # down-right 4, up-right 3, light down-left tap
    'B': dict(holds=[(135, 2), (45, 3), (90, 2), (180, 1)], final=(225, 80, 1)),
    'C': dict(holds=[(135, 2), (45, 1), (90, 3)], final=(225, 8, 1)),
}

def make_dock_state(path):
    e.load('states/mac00_e1.st')
    go(420, 300); go(320, 480)
    for i in range(60): e.step(0, 0, 0, 2)
    e.save(path)

def run(dock_state, recipe, ref=((315, 90), (225, 60)), jit=None, pre=60, hold=10, angle_err=0.0, rest=2, cwait=4):
    jit = jit or {}
    e.load(dock_state)
    for a, n in ref:
        for i in range(n): e.step(0, *st(a), 2)
    for i in range(10): e.step(0, 0, 0, 2)
    for j, (a, n) in enumerate(recipe['holds']):
        for i in range(n + jit.get(j, 0)): e.step(0, *st(a + angle_err), 2)
        for i in range(rest): e.step(0, 0, 0, 2)
    fa, fm, fn = recipe['final']
    for i in range(fn + jit.get('f', 0)): e.step(0, *st(fa + angle_err, fm), 2)
    for i in range(cwait): e.step(0, 0, 0, 2)
    p = player(e)
    spot = dict(x=round(p['x'], 4), z=round(p['z'], 4))
    e.step(D_CBUTTON, 0, 0, 2)
    for i in range(45): e.step(0, 0, 0, 2)
    q = player(e); s = part()
    if q['action'] != 33: return 'no_reaction', spot
    if s['y'] < -6: return 'water', spot
    ur = st(45)
    for i in range(pre): e.step(0, *ur, 2)
    for i in range(hold): e.step(D_CBUTTON, *ur, 2)
    for i in range(90): e.step(0, *ur, 2)
    q = player(e); s = part()
    ok = q['action'] == 33 and e.s8(PSTAT + 3) == 7 and s['y'] > 4 and (q['x'] - q['z']) > -150
    return ('SWIM_ON_LAND' if ok else 'pocket_only'), spot

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'nominal'
    dock = os.environ.get('DOCK_STATE', 'states/sushie_dock.st')
    make_dock_state(dock)
    if mode == 'nominal':
        for k, r in RECIPES.items():
            print(k, run(dock, r))
    else:
        out = []
        for k, r in RECIPES.items():
            nseg = len(r['holds'])
            for j in list(range(nseg)) + ['f']:
                for dj in (-2, -1, 1, 2):
                    res, spot = run(dock, r, jit={j: dj})
                    out.append(dict(recipe=k, test='frames', seg=j, d=dj, res=res, **spot))
            for ae in (-3, -2, -1, 1, 2, 3):
                res, spot = run(dock, r, angle_err=ae)
                out.append(dict(recipe=k, test='angle', d=ae, res=res, **spot))
            for a2 in (222, 228, 232, 240, 270):
                res, spot = run(dock, r, ref=((315, 90), (a2, 60)))
                out.append(dict(recipe=k, test='ref_angle', d=a2, res=res, **spot))
            for rest in (1, 4, 8):
                res, spot = run(dock, r, rest=rest)
                out.append(dict(recipe=k, test='rest', d=rest, res=res, **spot))
            for cw in (1, 15, 90):
                res, spot = run(dock, r, cwait=cw)
                out.append(dict(recipe=k, test='cdown_wait', d=cw, res=res, **spot))
            for pre in (40, 120):
                for hold in (3, 30):
                    res, spot = run(dock, r, pre=pre, hold=hold)
                    out.append(dict(recipe=k, test='diveout', d=[pre, hold], res=res, **spot))
        os.makedirs('data/sushie', exist_ok=True)
        with open('data/sushie/verify_jitter.jsonl', 'w') as f:
            for o in out: f.write(json.dumps(o) + '\n')
        for o in out: print(o['recipe'], o['test'], o.get('seg', ''), o['d'], o['res'])
