"""v97: the T6 Do Nothing runs of t6dn_log.py as numbers for the page tests (../fixtures/fb2_t6dn.json): per run the seed
after the rays (frame 61), the next coin frame, the lightning phases, the Do Nothing confirm P, the popup K, Bowser's AI
frame, the attack, the Close Call test frame and value, the T7 menu frame; and per seed the gRandSeed at P for every K
(the popup plays no part).  usage: python3 t6dn_fixture.py OUT.json RUNS.json [...]"""
import sys, os, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bolt_phase import phases
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'powerbounce'))
from fb2model import rand_int


def replay(row):
    s = row['s0']; out = []
    for nm, mx in row['d']:
        if nm == 'step': continue
        s, v = rand_int(s, mx)
        out.append((nm, mx, v))
    return out


def one(run):
    rows = run['rows']; byf = {x['f']: x for x in rows}
    ph = phases([dict(f=x['f'], d=x['d']) for x in rows if 13 <= x['f'] < run['P'] + 200])
    nc = next(x['f'] for x in rows if x['f'] >= 61 and any(nm == 'coin' for nm, mx in x['d']))
    ev = {}
    for x in rows:
        for nm, mx, v in replay(x):
            if nm == 'evt': ev.setdefault('E', x['f']); ev.setdefault('evt', []).append([mx, v])
            if nm.startswith('8027') and 'T' not in ev: ev['T'] = x['f']; ev['cc'] = v
    vals = dict(ev.get('evt', []))
    atk = 'slam' if (vals.get(80, 99) < 20 and 60 not in vals) else ('claw' if vals.get(60, 99) < 20 else 'fire')
    return dict(seed=run['seed'], K=run['K'], P=run['P'], s61='%08x' % byf[61]['s0'], nc61=nc, phases=ph[:4], E=ev.get('E'),
                attack=atk, T=ev.get('T'), cc=ev.get('cc'), lucky=ev.get('cc', 99) < 30, hp=run['hp'],
                menu=run['menu'] if ev.get('cc', 99) < 30 else None, sP='%08x' % byf[run['P']]['s0'])


if __name__ == '__main__':
    out = []
    for fn in sys.argv[2:]:
        for run in json.load(open(fn)):
            if not run.get('skip'): out.append(one(run))
    json.dump(dict(note='v97 fb2_route/t6dn_log.py: Final Bowser T6 with Lakilester up (T4 wave blocked), Do Nothing on P; '
                        'emulator, JP, debug core. Numbers only.', runs=out), open(sys.argv[1], 'w'), indent=0)
    print(len(out), 'runs;', collections.Counter((r['attack'], r['E'] - r['P'], r['T'] - r['E'], (r['menu'] - r['T']) if r['menu'] else None) for r in out))
