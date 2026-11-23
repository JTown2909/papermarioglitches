"""Numbers-only fixture for test_v132.js / test_v133.js (v133: battle 2303 logs, states/boss_2303_p1r_menu.st) from p1g_log.py logs (the Power Bounce runs and the menu-only runs): per log the seed at
the start of Bowser's AI frame, the AI frame, the first coin frame from it, the aura counts by f mod 20, the bolt phases,
whether a Body Slam was guarded, the target-A frame, the seeds every 10 frames, and the bounce rolls' frames.
usage: python3 -I p1_fixture.py OUT.json LOG.json [...]"""
import sys, json
P130 = (78, 83, 113, 118); P220 = (18, 78, 88, 178)
out = []
for fn in sys.argv[2:]:
    d = json.load(open(fn)); R = d['rows']; ai = d['marks']['ai']; m2 = d['marks']['menu2']; dc = d['marks']['pb']
    hit = d['hpf'][0] - ai
    g = d['marks']['guardA']; gd = g is not None and 0 < hit - (g - ai) <= 3      # v133: the guard counts for every attack (battle 2303)
    au = [sum(1 for n, _ in r['d'] if n == 'aura') for r in R]
    bo = [sum(1 for n, _ in r['d'] if n == 'bolt') for r in R]
    c = [au[f] for f in range(ai, ai + 20)]                      # by (f - ai) mod 20; checked on clean stretches below
    c = [c[(k - ai) % 20] for k in range(20)]                    # by f mod 20
    ph = [(p1, p2) for p2 in range(220) for p1 in range(130) if all(((f + p1) % 130 in P130) + ((f + p2) % 220 in P220) == bo[f] for f in range(len(bo)))]
    nc = next(r['f'] for r in R[ai:] if any(x == 'coin' for x, _ in r['d']))
    pbok = bool(d['rolls'])
    end = (dc + 71 + 27 * len(d['rolls']) + 5) if pbok else m2 + 40
    out.append(dict(name=fn.split('/')[-1][:-5], s=R[ai]['s0'], ai=ai, nc=nc, c=c, ph=list(ph[0]), gd=gd, hit=hit, menu=m2,
                    d=dc if pbok else None, rolls=[f for f, _ in d['rolls']],
                    seeds=[[f, R[f]['s0']] for f in range(ai, min(end, len(R) - 1), 10)]))
json.dump(out, open(sys.argv[1], 'w'), separators=(',', ':'))
print(len(out), [(o['name'], o['hit'], o['gd'], o['d']) for o in out])
