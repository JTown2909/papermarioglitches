import sys, os, json, struct
sys.path.insert(0, os.getcwd())
from emu import *
from rngsim import SEED, SEED2
e = Emu('pm-jp.z64', '/dev/shm/pmbot/cr%d' % os.getpid())
for i in range(60): e.step(0, 0, 0, 2)
e.load(sys.argv[1]); e.w32(SEED, 0x1234abcd); e.w32(SEED2, 0x1234abcd)
out = []
for f in range(int(sys.argv[2])):
    e.step(0, 0, 0, 2)
    c = 0x800B1D60 + 0x558 * 1
    f32 = lambda a: struct.unpack('>f', struct.pack('>I', e.u32(a)))[0]
    s16 = lambda a: struct.unpack('>h', struct.pack('>H', (e.u32(a & ~3) >> (16 if a % 4 == 0 else 0)) & 0xFFFF))[0]
    out.append(dict(f=f, vp=[s16(c + 0xA), s16(c + 0xC), s16(c + 0xE), s16(c + 0x10)], vfov=f32(c + 0x18), eye=[f32(c + 0x3C + 4 * k) for k in range(3)], obj=[f32(c + 0x48 + 4 * k) for k in range(3)],
                    P=[f32(c + 0xD4 + 4 * k) for k in range(16)], V=[f32(c + 0x114 + 4 * k) for k in range(16)]))
json.dump(out, open(sys.argv[3], 'w')); print(json.dumps({k: out[-1][k] for k in ('vp', 'vfov', 'eye', 'obj')}))
