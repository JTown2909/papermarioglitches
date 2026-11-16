"""v114: Final Bowser phase 2, the runner's backup ending after a failed T6 Close Call (JP, debug core):
  T6: Charge; Do Nothing - Close Call failed, Life Shroom
  T7: Charge; Do Nothing - No Wave, Danger
  T8: Bounce x5
From fb2_route/t6dn_log.py's T6 menu (OUT/t6_menu.st: Mario at Danger, Lakilester up). Per run: the T6 Charge (popup left
alone), Lakilester's Do Nothing on confirm + P (the first P from P0 whose Close Call fails), Bowser's hit, Mario's death and
the Life Shroom revive to the T7 menu (no input), then the T7 Charge (confirm on T7 menu + 30 + D7), Do Nothing on T7 Charge
confirm + P7, Bowser's T7 turn to the T8 menu (no input), then the T8 Power Bounce (target A on D8 after the menu settles,
an A on every bounce's action command). Every rand_int is logged per frame (route.Run rows).
DIAGNOSTIC writes: gRandSeed at the T6 menu (SEEDHEX); with CURE (default) Mario's debuff after the death (to_menu).
The T6 menu state: OUT/t6_menu.st from a t6dn_log.py-style build whose T5 ended on Fire Breath's 9 (1 HP, as the console's
fb1810), its debuff cleared at the T6 menu (DIAGNOSTIC; t6dn_log.py's own pick, the 2-HP outcome, leaves Jump unselectable).
Run from /tmp/claude-0/pm/bot1:  M64P_DBG=1 PYTHONPATH=. python3 t6hit_log.py OUT SEEDHEX OUT.json
env: P0 (default 150), P7S (list, confirm-relative, default 170), D7 (default 0), D8S (list, default 0), ADV=1 (A every
25 frames outside menus in Bowser's turns: off by default)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from route import *
from route_build import TURNS

ADV = os.environ.get('ADV') == '1'


def pitems():
    return [(0, UP, 10), (A, 0, 20), (0, DOWN, 10)]


CURE = os.environ.get('CURE', '1') == '1'
DEB = []


def to_menu(r, cap=3000, want=(13,)):
    """no input (A every 25 outside menus with ADV) until Mario's menu; returns (frames, min Mario HP seen).
    CURE (default on): Mario's debuff (actor + 0x210 / 0x211) cleared on every frame after a death, as the console shows him
    acting on T7 after the Life Shroom (the emulator's Fire Breath leaves debuff 9, which outlives the revive here and skips
    his T7 turn; t6dn_log.py CURE=1 likewise at the T6 menu)."""
    e = r.e; k = 0; hmin = 99
    r.step(A)
    while not (k > 100 and bstate(e) in want) and k < cap:
        b = A if (ADV and k % 25 == 24 and bstate(e) not in (13, 14, 17)) else 0
        r.step(b); k += 1; hmin = min(hmin, e.s8(PLAYER_DATA + 2))
        pa = e.u32(BSTATUS + 0xD8)
        if pa and e.s8(pa + 0x210): DEB.append((r.f, e.s8(pa + 0x210), e.s8(pa + 0x211)))
        if CURE and hmin <= 0 and pa and e.s8(pa + 0x210):
            e.w8(pa + 0x210, 0); e.w8(pa + 0x211, 0)                # DIAGNOSTIC: Mario's debuff cleared after the death
    return k, hmin


def charges(e): return e.s8(BSTATUS + 0x97)


def items(e): return [e.s16(PLAYER_DATA + 0x1B4 + 2 * i) for i in range(10) if e.s16(PLAYER_DATA + 0x1B4 + 2 * i) > 0]


def turn(r, wheel, P, mark):
    """Mario's Charge (no popup press), then Lakilester's Do Nothing on Charge confirm + P; returns (confirm frame, P used)"""
    e = r.e
    r.charge(0, wheel=wheel, sub=2); M = r.marks['charge']
    n = 0
    while bstate(e) != 14 and n < 900: r.step(0); n += 1
    r.idle(20)
    for b, y, k in pitems(): r.step(b, y); r.idle(k - 1)
    ready = r.f - M
    P1 = max(P, ready + 1)
    r.idle(M + P1 - r.f)
    r.marks[mark] = r.f
    return M, P1


def run(out, seed, js):
    r = Run('t6h', log=True); e = r.e
    P0 = int(os.environ.get('P0', '150')); P7S = [int(x) for x in os.environ.get('P7S', '170').split(',')]
    D7 = int(os.environ.get('D7', '0')); D8S = [int(x) for x in os.environ.get('D8S', '0').split(',')]
    tmp = '/dev/shm/pmbot/t6h_%d' % os.getpid()
    res = []
    # T6: find the first P >= P0 whose Close Call fails (Mario dies, the Life Shroom revives him)
    for P in range(P0, P0 + 60):
        r.load(out + '/t6_menu.st'); r.seed(seed)                   # DIAGNOSTIC: gRandSeed at the T6 menu (setup only)
        hp6 = e.s8(PLAYER_DATA + 2); ch6 = charges(e); it6 = items(e)
        M6, P6 = turn(r, TURNS[5][1]['wheel'], P, 'nothing6')
        k, hmin = to_menu(r)
        hp7 = e.s8(PLAYER_DATA + 2)
        if hmin <= 0: break
        print('P %d: dodged (hp %d)' % (P6, hp7), flush=True)
    else:
        print('no hit'); return
    t7m = r.f
    print('debuff seen', DEB[:3], DEB[-1:] if DEB else None); print('T6 hit: P %d, T7 menu at +%d (Bowser turn %d frames), hp6 %d -> min %d -> %d, charges %d -> %d, items %s -> %s' % (
        P6, t7m - M6, k, hp6, hmin, hp7, ch6, charges(e), it6, items(e)), flush=True)
    r.idle(30); e.save(tmp + '_t7.st')
    if os.environ.get('SAVE7') == '1': e.save(out + '/t7_menu.st')
    rows6 = [dict(f=x['f'] - M6, s0=x['s0'], d=x['d'], bs=x['bs']) for x in r.rows[M6:]]
    base = dict(seed='%08x' % seed, P6=P6, t7menu=t7m - M6, hp6=hp6, hp7=hp7, rows6=rows6, t7=[])
    for P7 in P7S:
        r.load(tmp + '_t7.st'); r.f = 0
        r.idle(D7)
        M7, P7u = turn(r, 0, P7, 'nothing7')
        ch7 = charges(e); a7 = e.u32(BSTATUS + 0xE0)
        k7, hmin7 = to_menu(r)
        hp8 = e.s8(PLAYER_DATA + 2); ch8 = charges(e); bhp = r.bowser_hp(); t8m = r.f
        r.idle(30); e.save(tmp + '_t8.st')
        rows7 = [dict(f=x['f'] - M7, s0=x['s0'], d=x['d'], bs=x['bs']) for x in r.rows[M7:]]
        evts = [(x['f'] - M7, nm, mx) for x in r.rows[M7:] for nm, mx in x['d'] if nm not in ('step', 'coin', 'bolt', 'aura')]
        print('  T7 P7 %d: charges %d -> %d at T8, hp %d -> %d (min %d), Bowser %s, T8 menu +%d; non-idle draws %s' % (
            P7u, ch7, ch8, hp7, hp8, hmin7, bhp, t8m - M7, evts[:40]), flush=True)
        pbs = []
        for D8 in D8S:
            r.load(tmp + '_t8.st'); r.f = 0
            r.power_bounce(D8, wheel=0, sub=1); dc = r.marks['pb']
            for i in range(27 * 14 + 100):
                kk = r.f - dc; r.step(A if kk >= 44 and (kk - 44) % 27 == 0 else 0)
            nb = len([1 for x in r.rows for nm, mx in x['d'] if nm == 'pbroll'])
            pbs.append(dict(D=D8, dconf=dc, rows=[dict(f=x['f'], s0=x['s0'], d=x['d']) for x in r.rows], bowser=r.bowser_hp()))
            print('    T8 D %d: pbrolls %d, Bowser %s' % (D8, nb, r.bowser_hp()), flush=True)
        base['t7'].append(dict(P7=P7u, D7=D7, c7=M7, t8menu=t8m - M7, hp8=hp8, ch8=ch8, bowser=bhp, rows7=rows7, pb=pbs))
    json.dump(base, open(js, 'w'))




def sweep7(out, seed, js):
    """T7 of the backup ending, every Do Nothing frame: from OUT/t7_menu.st (the T7 menu after the Life Shroom, saved by
    run() with SAVE7=1), the T7 Charge on the first frame (popup left alone), Lakilester's Do Nothing on confirm + P7 for P7 in
    the first W7 (default 40) frames it can be confirmed, Bowser's turn to the T8 menu: per run the draws by frame (rows from
    the T7 Charge confirm), Bowser's attack (the AI's evt draws), Mario's HP and charges at the T8 menu.
    DIAGNOSTIC: SEEDS7 (hex list) = gRandSeed written at the T7 menu (none: the state's own)."""
    r = Run('t7s', log=True); e = r.e; W7 = int(os.environ.get('W7', '40'))
    SEEDS = [int(x, 16) for x in os.environ.get('SEEDS7', '').split(',') if x] or [None]
    runs = []
    for sd in SEEDS:
        P7 = None; w = 0
        while w < W7:
            r.load(out + '/t7_menu.st')
            if sd is not None: r.seed(sd)                       # DIAGNOSTIC: gRandSeed at the T7 menu (setup only)
            hp7 = e.s8(PLAYER_DATA + 2)
            M7, P = turn(r, 0, 0 if P7 is None else P7 + w, 'n7')
            if P7 is None: P7 = P
            k, hmin = to_menu(r, want=(13,))
            pa = e.u32(BSTATUS + 0xD8)
            rows = [dict(f=x['f'] - M7, s0=x['s0'], d=x['d']) for x in r.rows[M7:]]
            ev = [(x['f'] - M7, nm, mx) for x in r.rows[M7:] for nm, mx in x['d'] if nm in ('evt', 'testtgt', 'r266de4') or nm.startswith('80')]
            runs.append(dict(seed='%08x' % (sd if sd is not None else 0), P=P, hp7=hp7, hp8=e.s8(PLAYER_DATA + 2), hmin=hmin, ch8=charges(e), menu8=r.f - M7, bs=bstate(e), rows=rows))
            print('%s P %d: hp %d -> %d (min %d), charges %d, T8 menu +%d bs %d; %s' % (runs[-1]['seed'], P, hp7, runs[-1]['hp8'], hmin, charges(e), r.f - M7, bstate(e), [x for x in ev if x[0] >= P][:14]), flush=True)
            w += 1
    json.dump(runs, open(js, 'w'))


def t8(out, seed, js):
    """T8 of the backup ending: from OUT/t7_menu.st, the T7 Charge, Do Nothing on confirm + P7 (env P7, a frame whose attack
    leaves Mario in Danger with the charges kept), Bowser's turn to the T8 menu, 20 idle frames, then for each D in D8S the
    Power Bounce (target A after D more idle frames, an A on every bounce's action command): every draw logged, the bounces
    and Bowser's HP (80: the DIAGNOSTIC value of the route builds)."""
    r = Run('t8', log=True); e = r.e; P7 = int(os.environ['P7']); D8S = [int(x) for x in os.environ.get('D8S', '0').split(',')]
    r.load(out + '/t7_menu.st'); M7, P = turn(r, 0, P7, 'n7'); k, hmin = to_menu(r); hp8 = e.s8(PLAYER_DATA + 2); ch8 = charges(e)
    r.idle(20); tmp = '/dev/shm/pmbot/t8_%d.st' % os.getpid(); e.save(tmp); print('T8 menu: P7 %d hp %d charges %d' % (P, hp8, ch8), flush=True)
    res = []
    for D in D8S:
        r.load(tmp); r.f = 0; r.power_bounce(D, wheel=0, sub=1); dc = r.marks['pb']
        for i in range(27 * 14 + 100):
            kk = r.f - dc; r.step(A if kk >= 44 and (kk - 44) % 27 == 0 else 0)
        rolls = [(x['f'] - dc, mx) for x in r.rows for nm, mx in x['d'] if nm == 'pbroll']
        res.append(dict(D=D, dconf=dc, hp8=hp8, ch8=ch8, rows=[dict(f=x['f'], s0=x['s0'], d=x['d']) for x in r.rows], bowser=r.bowser_hp()))
        print('  D %d: confirm at %d, rolls %d, Bowser %s' % (D, dc, len(rolls), r.bowser_hp()), flush=True)
    json.dump(res, open(js, 'w'))


if __name__ == '__main__':
    if os.environ.get('MODE') == 't8': t8(sys.argv[1], int(sys.argv[2], 16), sys.argv[3]); sys.exit()
    (sweep7 if os.environ.get('MODE') == 'sweep7' else run)(sys.argv[1], int(sys.argv[2], 16), sys.argv[3])
