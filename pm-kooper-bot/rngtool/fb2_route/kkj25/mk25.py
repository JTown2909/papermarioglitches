"""Final Bowser arena (kkj_25 entry 0) field state with the Ultra Boots Lakilester route's loadout.
DIAGNOSTIC setup (RAM writes before the walk): nok_14 left exit -> GotoMap(kkj_25, 0); STORY 95; global flags 0x1FA,0x1FB
(Hallway Bowser beaten); Lakilester Super out; equipped badges e4,10c,10d,112; Ultra Boots; 10 HP / 15 FP; items a2,95;
action commands; 7 star spirits, full star power, starBeamLevel 1 (Star Beam). Then inputs only:
walk right (stick 80,0) into the arena until the intro scene takes control, then A every 8 frames until the battle.
Saves kkj25_arrive.st (control at the door), kkj25_scene.st (scene just took control), kkj25_prebattle.st (PRE frames
before the game mode leaves the field), kkj25_battle.st (battle running)."""
import os, sys, struct
sys.path.insert(0, '/tmp/claude-0/pm/bot1')
from emu import *
from pm import *
from btl import BSTATE
OUT = '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/kkjstate'
e = Emu('/tmp/claude-0/pm/bot1/pm-jp.z64', '/dev/shm/kkjst/m%d' % os.getpid())
e.load('/tmp/claude-0/pm/bot1/states/nok14_start_goombario.st'); e.step(0, 0, 0, 2)
lo, hi = 0x80200000, 0x80400000
raw = b''.join(struct.pack('>I', e.u32(a)) for a in range(lo, hi, 4))
hits = []; i = raw.find(b'nok_13\x00')
while i >= 0: hits.append(lo + i); i = raw.find(b'nok_13\x00', i + 1)
ok = False
for s in hits:
    j = raw.find(struct.pack('>II', s, 2))
    while j >= 0:
        for k, ch in enumerate(b'kkj_25\x00\x00'): e.w8(s + k, ch)
        e.w32(lo + j + 4, 0); ok = True; j = raw.find(struct.pack('>II', s, 2), j + 1)
assert ok
P = PLAYER_DATA
e.w8(STORY, 95)
for f in (0x1FA, 0x1FB):
    a = SAVE + 0xFB0 + 4 * (f // 32); e.w32(a, e.u32(a) | (1 << (f % 32)))
e.w8(P + 0xA, 1)
for a in (2, 3, 4): e.w8(P + a, 10)
for a in (5, 6, 7): e.w8(P + a, 15)
e.w8(P + 0, 2)
pid = 8; e.w8(P + 0x14 + 8 * pid, 1); e.w8(P + 0x15 + 8 * pid, 1); e.w8(P + 0x12, pid)
il = [0xa2, 0x95]
for i in range(10): e.w16(P + 0x1B4 + 2 * i, il[i] if i < len(il) else 0)
bl = [0xe4, 0x10c, 0x10d, 0x112]
for i in range(64): e.w16(P + 0x208 + 2 * i, bl[i] if i < len(bl) else 0)
e.w8(P + 0x292, int(os.environ.get('STARBEAM', '1'))); e.w8(P + 0x28E, 7); e.w16(P + 0x290, 7 * 256)
for i in range(300):
    e.step(0, -80, 0, 2)
    if where(e)[0] != 6 and e.s16(GAME_MODE) == GM_WORLD: break
ok = 0
for i in range(600):
    e.step(0, 0, 0, 2); p = player(e)
    ok = ok + 1 if (p['action'] == 0 and not (p['flags'] & 0x2000)) else 0
    if ok >= 20: break
print('arrived', where(e), player(e), flush=True)
e.save(OUT + '/kkj25_arrive.st'); e.step(0, 0, 0, 1)
# walk right until the scene disables input (flags bit 0x2000 seen when the scene holds Mario)
n = 0
while not (player(e)['flags'] & 0x2000 and player(e)['x'] > -400):
    e.step(0, 80, 0, 2); n += 1
    assert n < 400
print('scene took control after', n, 'walk steps', player(e), flush=True)
e.save(OUT + '/kkj25_scene.st'); e.step(0, 0, 0, 1)
f0 = e.frame
seq = []
for i in range(3000):
    b = A if i % 4 == 0 else 0
    seq.append(b); e.step(b, 0, 0, 2)
    if e.s16(GAME_MODE) != GM_WORLD: break
print('mode', e.s16(GAME_MODE), 'after', len(seq), 'A-steps', flush=True)
PRE = int(os.environ.get('PRE', '10'))
e.load(OUT + '/kkj25_scene.st'); e.step(0, 0, 0, 1)
for b in seq[:-PRE]: e.step(b, 0, 0, 2)
print('prebattle mode', e.s16(GAME_MODE), where(e))
e.save(OUT + '/kkj25_prebattle.st'); e.step(0, 0, 0, 1)
for b in seq[-PRE:]: e.step(b, 0, 0, 2)
for i in range(400): e.step(0, 0, 0, 2)
print('battle id %08x' % e.u32(0x800DC4C8), 'bstate', e.s32(BSTATE), 'mode', e.s16(GAME_MODE))
e.save(OUT + "/kkj25_battle.st"); e.step(0, 0, 0, 1)
