"""From a Phase 1 battle state: every Mario turn Star Beam (wheel: down 2 from Jump, the star list: up 1 = Star Beam), Lakilester
Do Nothing, text advanced with A every 20 frames outside menus. DIAG_MHP: DIAGNOSTIC Mario HP/max HP write at the first menu
(verification only, so Mario survives until Bowser casts the Star Rod). Runs until the battle ends, then keeps pressing A
every 20 frames in the field (cutscenes) with screenshots; saves OUT/<tag>_after_p1.st on the first field frame."""
import os, sys, subprocess
os.chdir('/tmp/claude-0/pm/bot1'); sys.path.insert(0, '/tmp/claude-0/pm/bot1')
from route import *
OUT = '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/kkjstate'
r = Run('p1b', log=False); e = r.e
r.load(sys.argv[1]); TAG = sys.argv[2]; CAP = int(sys.argv[3])
def shot(n): subprocess.run(['import', '-window', 'root', '-crop', '592x400+104+100', '%s/shots/%s_%05d_%s.png' % (OUT, TAG, r.f, n)])
mturn = 0; last = None; saved = False
while r.f < CAP:
    m = e.s16(GAME_MODE); s = bstate(e); w = where(e)
    if (m, s, w) != last:
        print('f', r.f, 'mode', m, 'bstate', s, 'battle %08x' % e.u32(0x800DC4C8), 'where', w, 'story', e.s8(STORY), flush=True); last = (m, s, w)
    bid = e.u32(0x800DC4C8)
    if m == 8 and s == 13 and bid != 0x2303:
        r.idle(20); shot('othermenu'); r.seq([(A, 0, 20), (A, 0, 20), (A, 0, 1)]); r.idle(5)
    elif m == 8 and s == 13:
        r.idle(20)
        if mturn == 0 and os.environ.get('DIAG_MHP'): [e.w8(PLAYER_DATA + a, int(os.environ['DIAG_MHP'])) for a in (2, 3)]   # DIAGNOSTIC
        print('mario menu', mturn, 'f', r.f, 'bowser hp', r.bowser_hp(), 'mario hp', e.s8(PLAYER_DATA + 2), flush=True)
        r.seq(r.moves(2) + [(A, 0, 20), (0, UP, 10), (A, 0, 20), (A, 0, 1)])
        r.idle(5); shot('beam%d' % mturn)
        r.seq(r.moves(-2) + [(0, 0, 1)]) if False else None
        mturn += 1
    elif m == 8 and s == 14 and bid == 0x2303:
        r.idle(20); r.do_nothing(0)
    else:
        r.step(A if r.f % 20 == 0 else 0)
    if m == GM_WORLD and not saved and r.f > 100:
        e.save('%s/%s_after_p1.st' % (OUT, TAG)); e.step(0, 0, 0, 1); saved = True; print('saved after_p1 at f', r.f, flush=True)
    if m == GM_WORLD and w == (4, 19, 1):
        e.save('%s/%s_kkj25_e1_cutscene.st' % (OUT, TAG)); e.step(0, 0, 0, 1); print('saved entry-1 cutscene state at f', r.f, flush=True)
        if os.environ.get('STOP_E1'): break
    if r.f % int(os.environ.get('SHOTN', '150')) == 0: shot('t')
    if m == 2: print('game over / defeat', r.f); break
