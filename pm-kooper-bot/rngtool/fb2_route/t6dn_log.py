"""v97: Final Bowser phase 2 T6 on the runner's route, "Charge; Do Nothing - Close Call" (JP, debug core).
T4 is guarded (A on P + 87: Lakilester blocks the wave, not KO'd), so on T6 Lakilester acts: Mario's Super Charge, the
"+3" popup (closed by A on confirm + K, or by itself), then Lakilester's Strategies -> Do Nothing, whose confirm (P) hands
the turn to Bowser. Measures: the draws between the popup closing and the Strategies menu, Bowser's AI frame after P, the
Close Call test frame per attack, and whether the popup frame K changes anything once P is fixed (absolute frame).

  stage 1 (MODE=build): from /dev/shm/fb2r/t1menu.st plays T1-T5 (T1-T4 each lever on the first wait that makes Bowser
     miss, T4 with the wave and the guard; T5 Peach Beam + Do Nothing) and saves OUT/t6_menu.st.
  stage 2 (MODE=t6): from OUT/t6_menu.st, for each K in KS (popup A on confirm + K, 'n' = no press) and each absolute
     Do Nothing confirm frame P in PS (confirm-relative), logs every draw from the confirm to the T7 menu.
DIAGNOSTIC writes (setup only): Mario HP 10 and Bowser HP 80 and gRandSeed at the T1 menu; MARIO_T6HP (default: none)
writes Mario's HP at the T6 menu when T5 did not leave him at Danger; CURE=1 clears a poison (debuff) at the T6 menu
(build 1234abcd's T5 wait 1: Fire / Claw left Mario at 1 HP and poisoned, so he died at the T7 turn start whatever T6 did).
Run from /tmp/claude-0/pm/bot1:  M64P_DBG=1 PYTHONPATH=. python3 t6dn_log.py build OUT SEEDHEX
                                 M64P_DBG=1 PYTHONPATH=. python3 t6dn_log.py t6 OUT SEEDHEX OUT.json"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from route import *
from route_build import TURNS


def items(e): return [e.s16(PLAYER_DATA + 0x1B4 + 2 * i) for i in range(10) if e.s16(PLAYER_DATA + 0x1B4 + 2 * i) > 0]


def pitems(pa):
    if pa == 'cloud_nine': return [(A, 0, 20), (0, DOWN, 10), (0, DOWN, 10), (A, 0, 15)]
    return [(0, UP, 10), (A, 0, 20), (0, DOWN, 10)]


def bowser_turn(r, pa, guard, rec, cap=5000):
    e = r.e; k = 0
    def st(b):
        if rec: r.step(b, 0)
        else: e.step(b, 0, 0, 2); e.dbg_events()
    st(A)
    while True:
        k += 1
        b = A if (pa == 'cloud_nine' and k in (132, 152, 172)) else 0
        if guard and k == 87: b = A
        if k > 260 and bstate(e) == 13: break
        if k > cap: break
        # text boxes (the Peach Beam / remarks): A every 25 frames outside menus, never in the guard's turn
        if not guard and pa != 'cloud_nine' and k % 25 == 24 and k > 300 and bstate(e) not in (13, 14, 17): b = A
        st(b)
    return k


def build(out, seed):
    os.makedirs(out, exist_ok=True)
    r = Run('t6b', log=False); e = r.e
    r.load('/dev/shm/fb2r/t1menu.st')
    e.w8(PLAYER_DATA + 2, 10)                     # DIAGNOSTIC: Mario HP 10 (the runner's T1-T4)
    r.set_bowser_hp(80)                           # DIAGNOSTIC: Bowser HP
    r.seed(seed)                                  # DIAGNOSTIC: gRandSeed at the T1 menu
    tmp = '/dev/shm/pmbot/t6b%d_x.st' % os.getpid(); hp0 = 10
    for t in range(1, 6):
        ma, mv, pa = TURNS[t - 1]
        r.idle(30); getattr(r, ma)(0, **mv)
        n = 0
        while bstate(e) != 14 and n < 900: r.step(A if (ma != 'charge' and n % 25 == 24) else 0); n += 1
        r.idle(20)
        for b, y, k in pitems(pa): r.step(b, y); r.idle(k - 1)
        e.save(tmp); pick = None
        for w in range(1, 61):
            e.load(tmp)
            for i in range(w): e.step(0, 0, 0, 2)
            bowser_turn(r, pa, t == 4, False)
            a4 = e.u32(BSTATUS + 0xE0); wave = bool(a4) and e.s32(a4 + 0x88 + 8) == 0
            pa_ = e.u32(BSTATUS + 0xD8)
            # T5: the Peach Beam turn ends at Danger (the runner's "Peach Beam - Danger"), not poisoned (debuff 9: a
            # poisoned Mario at 1 HP dies at the T7 turn start whatever T6 did)
            ok = (e.s8(PLAYER_DATA + 2) == hp0 and 149 in items(e) and (t != 4 or wave)) if t < 5 else \
                (bstate(e) == 13 and 0 < e.s8(PLAYER_DATA + 2) <= 5 and e.s8(pa_ + 0x210) == 0)
            if ok: pick = w; break
        e.load(tmp)
        for i in range(pick or 1): e.step(0, 0, 0, 2)
        bowser_turn(r, pa, t == 4, False); r.idle(20)
        print(json.dumps(dict(turn=t, wait=pick, hp=e.s8(PLAYER_DATA + 2), debuff=e.s8(e.u32(BSTATUS + 0xD8) + 0x210), ko=r.partner_ko(), charges=e.s8(BSTATUS + 0x97),
                              bs=bstate(e))), flush=True)
        if pick is None: print('T%d: no miss' % t); return
    if os.environ.get('MARIO_T6HP'): e.w8(PLAYER_DATA + 2, int(os.environ['MARIO_T6HP']))   # DIAGNOSTIC: Mario HP at T6
    e.save(out + '/t6_menu.st'); print('saved', out + '/t6_menu.st', 'hp', e.s8(PLAYER_DATA + 2), 'ko', r.partner_ko())


def t6(out, seed, js):
    """t6_collect.py's output format (t6_check.py reads it), with P (the Do Nothing confirm, confirm-relative) per run.
    SEEDS (env, hex list): gRandSeed written at the T6 menu (DIAGNOSTIC, setup only); none: the build's own."""
    r = Run('t6l', log=True); e = r.e
    KS = [None if x == 'n' else int(x) for x in os.environ.get('KS', '77,n').split(',')]
    PS = [int(x) for x in os.environ.get('PS', '').split(',') if x] or [None]
    DS = [int(x) for x in os.environ.get('DS', '').split(',') if x]
    SEEDS = [int(x, 16) for x in os.environ.get('SEEDS', '').split(',') if x] or [None]
    runs = []
    for sd in SEEDS:
        for K in KS:
            for P in PS:
                r.load(out + '/t6_menu.st')
                if sd is not None: r.seed(sd)                      # DIAGNOSTIC: gRandSeed at the T6 menu (setup only)
                hp6 = e.s8(PLAYER_DATA + 2)
                if os.environ.get('CURE') == '1':                  # DIAGNOSTIC: Mario's poison (debuff) cleared at the T6 menu
                    pa_ = e.u32(BSTATUS + 0xD8); e.w8(pa_ + 0x210, 0); e.w8(pa_ + 0x211, 0)
                getattr(r, TURNS[5][0])(0, **TURNS[5][1]); M = r.marks['charge']
                n = 0
                while bstate(e) != 14 and n < 900: r.step(A if (K is not None and r.f - M == K) else 0); n += 1
                menu14 = r.f - M
                r.idle(20)
                for b, y, k in pitems('do_nothing'): r.step(b, y); r.idle(k - 1)
                ready = r.f - M
                P1 = ready + 1 if P is None else P
                if ready >= P1: runs.append(dict(K=K, P=P1, skip=True, ready=ready)); continue
                r.idle(M + P1 - r.f)
                # Bowser's turn to the T7 menu: no A presses (no text boxes on a Close Call; a hit ends the run)
                r.step(A); k = 0
                while not (k > 100 and bstate(e) == 13) and k < 1500: r.step(0); k += 1
                menu = r.f; hp = e.s8(PLAYER_DATA + 2)
                r.idle(20)
                tmp = '/dev/shm/pmbot/t6l_%d.st' % os.getpid(); e.save(tmp)
                base = [dict(f=x['f'] - M, s0=x['s0'], d=x['d'], bs=x['bs']) for x in r.rows[M:]]
                pbs = []
                for D in (DS if hp == hp6 else []):
                    r.load(tmp); r.power_bounce(D, **TURNS[6][1]); dc = r.marks['pb']
                    for i in range(27 * 14 + 100):
                        kk = r.f - dc; r.step(A if kk >= 44 and (kk - 44) % 27 == 0 else 0)
                    pbs.append(dict(D=D, dconf=dc, rows=[dict(f=x['f'], s0=x['s0'], d=x['d']) for x in r.rows], bowser=r.bowser_hp()))
                runs.append(dict(seed='%08x' % (sd if sd is not None else seed), K=K if K is not None else -1, P=P1, popup_menu=menu14,
                                 ready=ready, c0=M, menu=menu - M, pbbase=menu - M + 20, hp=hp, ko=r.partner_ko(), rows=base, pb=pbs))
                ai = [x['f'] - M for x in r.rows[M:] for nm, mx in x['d'] if nm == 'evt'][:1]
                print('%s K %s P %d (strategies ready %d, menu14 %d) AI %s T7menu +%d hp %d pb %s' % (runs[-1]['seed'], K, P1, ready, menu14,
                      ai, menu - M, hp, [len([1 for x in p['rows'] for nm, mx in x['d'] if nm == 'pbroll']) for p in pbs]), flush=True)
    json.dump(runs, open(js, 'w'))


if __name__ == '__main__':
    mode, out, seed = sys.argv[1], sys.argv[2], int(sys.argv[3], 16)
    if mode == 'build': build(out, seed)
    else: t6(out, seed, sys.argv[4])
