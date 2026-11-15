"""Base states for the Toad Town (mac_00) Sushie swim-on-land work. Inputs only after loading the room state.
  states/mac00_e1.st  <- make_state_room.py PRA_MAP=mac_00 PRA_AREA=1 PRA_ENTRY=1 PARTNER=7  (east entrance, Sushie out;
                         that script uses RAM writes for the warp and the partner, a stand-in for a real save with Sushie)
  states/mac00_e3.st  <- same with PRA_ENTRY=3 (only for the centre-dock comparison)
Writes states/sushie_dock.st (standing on the east dock), states/sushie_R.st (corner reference R) and
states/sushie_cdock.st (on the centre dock)."""
import os, math
from emu import *
from pm import *
e = Emu(os.environ.get('PM_ROM', 'pm-jp.z64'), os.environ.get('PM_TMP', '/dev/shm/pmsushie/mk'))

def go(tx, tz, tol=4, maxf=400):
    for i in range(maxf):
        p = player(e); dx, dz = tx - p['x'], tz - p['z']; d = math.hypot(dx, dz)
        if d < tol: return True
        s = 80 if d > 20 else 40
        e.step(0, int(s * dx / d), int(-s * dz / d), 2)
    return False

e.load('states/mac00_e1.st')
go(420, 300); go(320, 480)
for i in range(60): e.step(0, 0, 0, 2)
print('east dock', player(e)); e.save('states/sushie_dock.st')
# corner reference R: up-left into the NW dock wall for 3 s, then down-left into the SW dock wall for 2 s
for i in range(90): e.step(0, -57, 57, 2)
for i in range(60): e.step(0, -57, -57, 2)
for i in range(15): e.step(0, 0, 0, 2)
print('R', player(e)); e.save('states/sushie_R.st')
if os.path.exists('states/mac00_e3.st'):
    e.load('states/mac00_e3.st')
    go(0, 400); go(0, 445)
    for i in range(60): e.step(0, 0, 0, 2)
    print('centre dock', player(e)); e.save('states/sushie_cdock.st')
