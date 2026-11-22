"""Final Bowser PHASE 1 (Ultra Boots Laki route) RNG model, T1 Bowser's AI -> T2 Power Bounce rolls (JP, emulator-checked
with p1g_log.py; usage: p1model.py check LOG.json [...] / tables LOG.json [...]).

Facts (p1g_log.py, states/boss_2304_p1_menu.st = the fight's first menu, TurnCount 0, Bowser at 99 HP):
- Bowser is Star Rod enchanted from the start of Phase 1: his attacks are boosted (Body Slam / Claw 16, Fire Breath 20; a
  guard takes 1) and Mario (10 max HP) dies to any of them; the Life Shroom revives him. Power Bounce hits do no damage
  (no stars), but its continue rolls run as in Phase 2: roll k on D + 71 + 27k (D = the target-screen A).
- Bowser's T1 AI is on P + 13 (P = Lakilester's Do Nothing confirm): RandInt(80) < 20 -> Body Slam, else RandInt(60)
  < 20 -> Claw, else Fire Breath (no recover / Star Rod draws on T1).
- From the AI frame every draw but the bolts, coin, aura and step is fixed per attack (EXTRA below; same in every seed);
  only a guarded Body Slam changes them (the rand_int(2) pair on hit + 5 and three star bursts go). The hit is on AI + HIT,
  the T2 menu opens on AI + HIT + 404.
Per frame f: bolts (rand_int(359) per bolt, phases p130 / p220), script draws (EXTRA 'pre', the Power Bounce roll), the
status-bar coin rand_int(100), the aura c[f mod 20] x rand_int(359), the revive sparkles (EXTRA 'post'), the step."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'powerbounce'))
from fb2model import adv, internal, TH

HIT = {'slam': 69, 'claw': 64, 'fire': 57}
MENU_AFTER_HIT = 404
POST = {'e00e4478', 'e00e44cc', 'e00e4688', 'e00e46b4', 'e00e46f0', 'e00e4708'}
TABLES = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'p1_extra.json')


def rand_int(s, mx):
    if mx == 1: s, v = internal(s, 1000); return s, int(v >= 501)
    if mx == 100: s, v = internal(s, 1009); return s, v // 10
    return internal(s, mx)


def attack(s):
    """Bowser's T1 pick from the seed at his AI draw (after the frame's bolts): (attack, seed after)"""
    s, v = rand_int(s, 80)
    if v < 20: return 'slam', s
    s, v = rand_int(s, 60)
    return ('claw' if v < 20 else 'fire'), s


def load_tables():
    return json.load(open(TABLES))


def run(s, ai, nc, aura, bolts, key, extra, f_end, d=None, out=None):
    """from seed s at the start of frame ai (Bowser's AI frame) to the start of f_end. aura(f) / bolts(f): counts; key:
    'slam' / 'slam_g' / 'claw' / 'fire' (None: pick from the seed); extra: tables; d: the Power Bounce target A frame.
    Returns (s, nc, info)."""
    info = {'rolls': []}
    k = 0
    for f in range(ai, f_end):
        if out is not None: out.append((f, s))
        for i in range(bolts(f)): s, _ = rand_int(s, 359)
        if f == ai:
            atk, s = attack(s)
            if key is None: key = atk
            info['atk'] = atk; info['key'] = key
            if key.split('_')[0] != atk: info['mismatch'] = True
        for nm, mx in extra[key].get(str(f - ai), {}).get('pre', []): s, _ = rand_int(s, mx)
        if d is not None and f == d + 71 + 27 * k and k >= 0:
            s, v = rand_int(s, 100); info['rolls'].append((f - d, v))
            k = k + 1 if v <= TH[k] else -99
        if f == nc:
            s, v = rand_int(s, 100); nc += 48 if v >= 70 else 24
        for i in range(aura(f)): s, _ = rand_int(s, 359)
        for nm, mx in extra[key].get(str(f - ai), {}).get('post', []): s, _ = rand_int(s, mx)
        s = adv(s)
    info['menu'] = ai + HIT[key.split('_')[0]] + MENU_AFTER_HIT
    info['bounces'] = len([1 for r in info['rolls']]) + (1 if info['rolls'] else 0)
    return s, nc, info


def _log(fn):
    d = json.load(open(fn)); R = d['rows']
    return d, R


def tables(fns):
    """build EXTRA from logs: per key, per frame offset from the AI, the 'pre' / 'post' draws (the AI's own RandInt(80/60)
    are left out: attack() draws them)"""
    T = {}
    for fn in fns:
        d, R = _log(fn); ai = d['marks']['ai']; m2 = d['marks']['menu2']
        if not d['hpf']: continue
        hit = d['hpf'][0] - ai; atk = {v: k for k, v in HIT.items()}[hit]
        g = d['marks']['guardA']; key = atk + ('_g' if atk == 'slam' and g is not None and 0 < HIT['slam'] - (g - ai) <= 3 else '')
        tb = {}
        for r in R[ai:m2 + 1]:
            pre = [(nm, mx) for nm, mx in r['d'] if nm not in ('step', 'aura', 'bolt', 'coin', 'evt', 'pbroll') and nm not in POST]
            post = [(nm, mx) for nm, mx in r['d'] if nm in POST]
            if pre or post: tb[str(r['f'] - ai)] = {'pre': pre, 'post': post}
        if key in T and T[key] != tb: raise SystemExit('table mismatch for %s in %s' % (key, fn))
        T[key] = tb
    return T


def check(fn, extra):
    d, R = _log(fn); ai = d['marks']['ai']; dc = d['marks']['pb']
    cnt = lambda f, nm: sum(1 for x, _ in R[f]['d'] if x == nm) if f < len(R) else 0
    nc = next(r['f'] for r in R[ai:] if any(x == 'coin' for x, _ in r['d']))
    s = int(R[ai]['s0'], 16)
    g = d['marks']['guardA']
    key = None
    hit = d['hpf'][0] - ai; atk = {v: k for k, v in HIT.items()}[hit]
    if atk == 'slam' and g is not None and 0 < HIT['slam'] - (g - ai) <= 3: key = 'slam_g'
    out = []
    s1, nc1, info = run(s, ai, nc, lambda f: cnt(f, 'aura'), lambda f: cnt(f, 'bolt'), key, extra, len(R) - 1, d=dc, out=out)
    bad = next(((f, '%08x' % x) for f, x in out if R[f]['s0'] != '%08x' % x), None)
    ok = bad is None and info['menu'] == d['marks']['menu2'] and [tuple(x) for x in d['rolls']] == [(f, 100) for f, _ in info['rolls']]
    vals = info['rolls']
    return ok, dict(atk=info['atk'], key=info.get('key'), menu=(info['menu'], d['marks']['menu2']), first_bad=bad, rolls=vals, logged=d['rolls'])


if __name__ == '__main__':
    if sys.argv[1] == 'tables':
        T = tables(sys.argv[2:]); json.dump(T, open(TABLES, 'w'), separators=(',', ':')); print({k: len(v) for k, v in T.items()})
    else:
        ex = load_tables(); n = 0
        for fn in sys.argv[2:]:
            ok, inf = check(fn, ex); n += ok; print('ok ' if ok else 'BAD', os.path.basename(fn), inf)
        print('%d / %d' % (n, len(sys.argv) - 2))
