"""Stage lightning truth (JP, debug core): from a Final Bowser T1-menu state, idle N frames; per frame a screenshot and,
for every bolt drawn (breakpoint on lightning_bolt_appendGfx), its data read from RAM: type, lifetime, start/end,
the 12 vertices, edge lengths, unk_110 (the random value). DIAGNOSTIC: gRandSeed written at the start (setup only).
usage (cwd /tmp/claude-0/pm/bot1): DISPLAY=:88 M64P_GFX=... M64P_DATA=... M64P_DBG=1 PYTHONPATH=. python3 bolt_truth.py STATE SEEDHEX N OUT"""
import sys, os, json, struct
sys.path.insert(0, os.getcwd())
from emu import *
from pm import *
from rngsim import SEED, SEED2
from PIL import ImageGrab
APPEND = 0xE00BC374
st, seed, N, OUT = sys.argv[1], int(sys.argv[2], 16), int(sys.argv[3]), sys.argv[4]
os.makedirs(OUT, exist_ok=True)
e = Emu('pm-jp.z64', '/dev/shm/pmbot/bt%d' % os.getpid())
for i in range(60): e.step(0, 0, 0, 2)
e.load(st); e.step(0, 0, 0, 2)
e.w32(SEED, seed); e.w32(SEED2, seed)        # DIAGNOSTIC: gRandSeed (setup only)
e.bp_add(APPEND); e.dbg_log(1); e.dbg_events()
f32 = lambda a: struct.unpack('>f', struct.pack('>I', e.u32(a)))[0]
rows = []
for i in range(N):
    e.step(0, 0, 0, 2)
    ImageGrab.grab(bbox=(80, 60, 720, 540), xdisplay=os.environ.get('DISPLAY')).save('%s/s%05d.png' % (OUT, i), compress_level=1)
    seen = {}
    for x in e.dbg_events():
        if x['pc'] != APPEND: continue
        eff = x['a0'] & 0xFFFFFFFF; d = e.u32(eff + 0xC)
        if d in seen: continue
        seen[d] = dict(eff='%08x' % eff, data='%08x' % d, type=e.u32(d), life=e.u32(d + 0x2C), left=e.u32(d + 0x28) - (1 << 32 if e.u32(d + 0x28) >> 31 else 0),
                       start=[f32(d + 0x10 + 4 * k) for k in range(3)], end=[f32(d + 0x1C + 4 * k) for k in range(3)], ws=f32(d + 0x4C),
                       X=[f32(d + 0x50 + 4 * k) for k in range(12)], Y=[f32(d + 0x80 + 4 * k) for k in range(12)], Z=[f32(d + 0xB0 + 4 * k) for k in range(12)],
                       W=[f32(d + 0xE0 + 4 * k) for k in range(12)], u=e.u32(d + 0x110))
    rows.append(dict(i=i, bolts=list(seen.values())))
json.dump(rows, open(OUT + '/truth.json', 'w'))
print(len(rows), 'frames;', sum(len(r['bolts']) for r in rows), 'bolt renders')
