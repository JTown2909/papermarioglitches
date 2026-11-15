"""dump mac_00's (Toad Town gate district, the three docks) loaded collision and triggers to data/mac00_collision.json.
Needs states/mac00_e1.st (make_state_room.py PRA_MAP=mac_00 PRA_AREA=1 PRA_ENTRY=1 PARTNER=7)."""
import json, os
from emu import Emu
from pm import *
from dump_collision_mac02 import read_collision, read_triggers

e = Emu(os.environ.get('PM_ROM', 'pm-jp.z64'), os.environ.get('PM_TMP', '/dev/shm/pmsushie/dump'))
e.load('states/mac00_e1.st')
for i in range(30): e.step()
cols = read_collision(e)
json.dump({'colliders': cols, 'zones': read_collision(e, 0x800D91B0), 'triggers': read_triggers(e)},
          open('data/mac00_collision.json', 'w'))
for c in cols:
    if c['flags'] & 0xFF == 4:   # SURFACE_TYPE_DOCK_WALL
        xs = [v[0] for t in c['tris'] for v in t['v']]; zs = [v[2] for t in c['tris'] for v in t['v']]
        print('dock wall collider', c['id'], hex(c['flags']), 'x %.0f..%.0f z %.0f..%.0f' % (min(xs), max(xs), min(zs), max(zs)))
