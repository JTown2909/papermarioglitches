"""v112: the Ultra Boots Partnerless Jr. Troopa route (Bombette out, she only does nothing) in the emulator (JP, debug core),
every rand_int logged per frame, for the T6 Whacka + Do Nothing at 10 HP draws.
Route: T1 Charge; DN - T2 Charge; DN (CC) - T3 Maple; DN (CC) - T4 Charge; DN (CC) - T5 Charge; DN (CC) - T6 Whacka; DN - T7 PB.
DIAGNOSTIC RAM writes: gRandSeed (both copies) = SEEDHEX right after the state load. The Close Call dodges are found by trying the
Do Nothing confirm's wait from a saved state (no RAM write).
Run from /tmp/claude-0/pm/bot1 with M64P_DBG=1:  python3 pl_route_log.py SEEDHEX DSEED OUT.json"""
import sys, os, json, random
sys.path.insert(0, '/tmp/claude-0/pm/bot1')
from emu import *
from pm import *
from btl import *
from rngsim import SEED, SEED2, RAND_INT, rand_int
seed, dseed, OUT = int(sys.argv[1], 16), int(sys.argv[2]), sys.argv[3]
rnd = random.Random(dseed)
e = Emu('pm-jp.z64', '/dev/shm/pmbot/plr%d' % os.getpid()); TMP = '/dev/shm/pmbot/plr%d_trial.st' % os.getpid()
e.load(os.environ.get('ST', 'states/boss_0207_plb_menu.st')); e.step(0, 0, 0, 2)
e.w32(SEED, seed); e.w32(SEED2, seed)                      # DIAGNOSTIC: chosen seed
e.bp_add(RAND_INT); e.dbg_log(1); e.dbg_events()
log = []; ev = []
jrhp = lambda: e.s8(e.u32(BSTATUS + 0xE0) + 0x1B8)
def step(b=0, x=0, y=0):
    s0 = e.u32(SEED); e.step(b, x, y, 2); calls = []
    for v in e.dbg_events():
        mx = v['a0'] if v['a0'] < 0x80000000 else v['a0'] - (1 << 32)
        if v['ra'] == 0x800269AC: continue
        calls.append(['%08x' % v['ra'], mx])
    log.append({'s0': '%08x' % s0, 'c': calls, 'bs': bstate(e), 'hp': e.s8(PLAYER_DATA + 2), 'jr': jrhp()})
def w(n, b=0, x=0, y=0):
    for i in range(n): step(b if i == 0 else 0, x if i == 0 else 0, y if i == 0 else 0)
def until(states, cap=4000):
    for f in range(cap):
        if bstate(e) in states: return f
        step()
    raise RuntimeError('state %d' % bstate(e))
def mark(name, **kw): d = dict(f=len(log), name=name); d.update(kw); ev.append(d)
def cc_roll(cap=200):
    for f in range(cap):
        n = len(log); step(); s = int(log[n]['s0'], 16)
        for ra, mx in log[n]['c']:
            s, v = rand_int(s, mx)
            if ra == '80277518': return v
    return None
WHEEL = ['jump']
def charge(tn):
    until([13]); w(20)
    if WHEEL[0] == 'items': w(12, 0, 0, -70)                 # the wheel remembers Items after an item
    w(22, A); w(15, 0, 0, -70); w(15, 0, 0, -70); w(20, A); until([17], cap=60)
    w(rnd.randint(2, 40)); mark(tn + ' Charge'); step(A); until([14]); WHEEL[0] = 'jump'
def item(tn, name, down):
    until([13]); w(20)
    if WHEEL[0] != 'items': w(15, 0, 0, 70)
    w(25, A)
    for i in range(down): w(10, 0, 0, -70)
    w(25, A); until([17], cap=60); w(rnd.randint(2, 40)); mark(tn + ' ' + name); step(A); until([14]); WHEEL[0] = 'items'
def nothing(tn, cc):
    w(10); w(15, 0, 0, 70); w(25, A); w(12, 0, 0, -70)
    ds = list(range(2, 60)); rnd.shuffle(ds); d = ds[0]
    if cc:
        n0 = len(log); e.save(TMP)
        for dd in ds:
            w(dd); step(A); v = cc_roll(); e.load(TMP); del log[n0:]; e.dbg_events()
            if v is not None and v < 30: d = dd; break
    w(d); mark(tn + ' Do Nothing', hp=e.s8(PLAYER_DATA + 2)); step(A)
    for f in range(3000):
        if bstate(e) == 13 or e.s8(PLAYER_DATA + 2) <= 0: break
        step()
    mark(tn + ' end', hp=e.s8(PLAYER_DATA + 2), jr=jrhp())
def pb(tn):
    until([13]); w(20)
    if WHEEL[0] == 'items': w(12, 0, 0, -70)
    w(22, A); w(10, 0, 0, -70); w(25, A); until([17], cap=60)
    w(rnd.randint(2, 40)); mark(tn + ' Power Bounce'); step(A)
    for f in range(1, 400):
        q = e.s8(BSTATUS + 0x81); step(A if q == -1 and f % 2 == 0 else 0)
out = dict(seed='%08x' % seed, dseed=dseed)
try:
    charge('T1'); nothing('T1', False)
    charge('T2'); nothing('T2', True)
    item('T3', 'Maple Syrup', 1); nothing('T3', True)
    charge('T4'); nothing('T4', True)
    charge('T5'); nothing('T5', True)
    e.save('/dev/shm/pmbot/pl_t6menu_%08x.st' % seed)
    item('T6', 'Whacka', 0); nothing('T6', False)
    pb('T7')
except Exception as ex: out['error'] = str(ex)
out.update(ev=ev, log=log)
json.dump(out, open(OUT, 'w'))
print('%08x d%d: %d frames, err %s, %s' % (seed, dseed, len(log), out.get('error'), [(x['name'], x['f'], x.get('hp')) for x in ev]), flush=True)
