# Ultra Boots Hallway Bowser in Danger: Close Call routes (A, B, C)

Question (Nov 15): skip the Ultra Shroom before Hallway Bowser by staying in Danger and manipulating Close Call with the
seed the page locks from Mario's T1 Charge rays. Routes:
- **A**: the current route at Danger: T1 Charge; Spiny Flip (Close Call on Bowser's T1 attack), T2 Time Out; Spiny Flip, T3-T5 as now.
- **B**: Bombette: T1 Charge; Do Nothing - Close Call / T2 Time Out; Do Nothing / T3 Charge; Do Nothing / T4 Maple; Do Nothing /
  T5 Bounce x8; Bomb if 6 capped.
- **C**: Lakilester: T1 Charge; Spiny Flip / T2 Lullaby; Spiny Flip / T3 Bounce x6; Spiny Flip / T4 Bounce x5; Spiny Flip.

JP emulator (mupen64plus harness, debug core for the rand_int log), work dir `/tmp/claude-0/pm/hwub` (symlinks to
`../*.py`, `hw_ub_cc/*.py`, `harness.so`, the ROM, and the `boss_2302_*` states). New states (DIAGNOSTIC setups, same as
make_states.sh's, not committed):
- `boss_2302_bomb_menu.st`: `AC=1 PARTNER=3 BRANK=1 BADGES=10c,e4,112,11f BOOTS=2 HP=10 FP=10 ITEMS=8e,a3,95 NOFS=1 STARBEAM=0 SUF=_bomb boss_battle_start_setup.py 2302`
- `boss_2302_laki7_menu.st`: `AC=1 PARTNER=8 BRANK=1 BADGES=10c,e4,112 BOOTS=2 HP=10 FP=15 ITEMS=8e,a3,95 NOFS=1 STARBEAM=0 SUF=_laki7 ...`
  (`STARBEAM=0` gives the 7 spirits and a full star bar; the older `boss_2302_route_menu.st` has no spirits.)
Every script writes Mario's HP / gRandSeed at the menu (DIAGNOSTIC, labelled in the script).

## Measured
- **Bowser**: 50 HP, defence 1; the battle ends only at 0 HP (`end_test.py`: 2 / 5 / 20 / 26 HP, 3-damage Spiny Flip).
  T1 attacks on Mario at 10 HP, unguarded: Body Slam 6, Claw Swipe 7, Fire Breath 8 (`b_t1_log.py`). In Danger (2-5 HP)
  every T1 attack is lethal (guard -1 still >= 5). None of the T1 attacks targeted Bombette.
- **B T1 model** (`b_t1_sweep.py`, `hw_sim.js check`): from Bombette's Do Nothing confirm c, Bowser's AI on c+13
  (RandInt 80 < 20 Body Slam, else RandInt 60 < 20 Claw Swipe, else Fire Breath), Close Call rand_int(100) < 30
  (0x80277518) on AI+54 / +70 / +55; no draws between the end of the Charge's sparkles (charge +61) and c except the coin.
  = the page's `bowserT1(..., danger)` with `aiAt: 13`. **60 / 60 confirm frames** of one seed matched (26 lucky,
  runs up to 4). Map shape: independent ~30% frames, runs of 1-4.
- **Time Out** (`star_probe.py`, 3 seeds): roll at +386 (as `timeout`), STOP for 3 (debuff 8, duration 3), counting
  down after T2, T3, T4's enemy phases: Bowser skips T2, T3, T4 - and also took **no action in T5's enemy phase** in
  all three runs (no AI draw, Mario's HP unchanged); his next attack was T6. Duration does not depend on the frame.
- **Lullaby** (`lullaby_log.py`, `star_menu.py`; Star Spirits submenu: Focus, Refresh, Lullaby, Star Storm, ...,
  Time Out 2nd from the bottom): one status roll rand_int(100) on confirm +248 (0x80266DE4, the Time Out roll's caller);
  passes seen at 17/24/26, failures at 41+ (consistent with Time Out's <= 30). SLEEP (debuff 6) for 2: covers T2 and T3's
  enemy phases. Before the roll Lullaby's effect draws hundreds of numbers with RNG-dependent ranges (deterministic in
  the confirm frame, but there is no page model of it yet). Costs 1 star bar (Time Out 2).
- **Power Bounce vs Hallway Bowser, Ultra Boots** (`b_route.py`): cap rolls every 27 frames from confirm +74 (hits on
  +48, +75, ...), pass if v <= 130, 84, 54, 35, 23, 15, 9; hits = 2 + passes. Damage 3 + charge - 1, one less per bounce,
  minimum 1: charge 6 (two Charges): 8,7,6,5,4,3,2,1 (8 hits = 36, 7 = 35, 6 = 33); charge 3: 5,4,3,2,1,1,1.
  Against the **sleeping** Bowser (`STAR=lullaby b_route.py`, 14 runs) the thresholds are the same and the damage is the same;
  the hits do not wake him (debuff 6 kept through the bounces; it ends on his T3 phase countdown, and that phase had no attack).
  So Lullaby covers T2 + T3, and C must kill on T4 (awake for T4's enemy phase). Charge = 4 FP here.
- Partners cannot use items in this game (TTYD added that); no partner menu position opened an item list (`partner_item.py`).

## Chances (`hw_sim.js odds` / `pb`; best frame with a normal press spread sd 1.3 over -4..+4, 1000 seeds)
| | 1 s wait | 2 s | 6 s | 10 s | blind |
|---|---|---|---|---|---|
| B T1 Close Call (Do Nothing on the beep) | 69.6% | 78.1% | 88.0% | 91.4% | 30% |
| A T1 Close Call (Spiny Flip throw, fixed window confirm +55..+114) | | 77.5% | | | 30% |
| Time Out | | 78.2% | 87.3% | 90.5% | 31% |
| Power Bounce 6+ (iid approximation) | | 58.5% | 69.6% | 74.3% | 16.3% |
| Power Bounce 5+ | | 90.8% | 96.5% | 98.0% | 45.8% |
| Power Bounce 8+ | | 9.6% | 20.6% | 26.6% | 0.6% |

Overall (6 s windows; a failed Time Out means Close Calls on T2-T4):
- current (Ultra Shroom, T1 hit taken): TO + (1-TO) CC^3 = 93%.
- A: 77.5% x 93% = **72%**.
- B: 88% x (87.3% + 12.7% x 88%^3) x P(6+) = 84.5% x 69.6% = **59%** with no hit by T5 (a 3-5 cap leaves Bowser alive into T6,
  where he attacks again; Time Out's quiet T5 means no attack before T6).
- C in Danger: 77.5% x (L + (1-L) CC^2) x 69.6% x 96.5%: with a Lullaby model (L ~ 87%, as Time Out) **49%**; with a blind
  Lullaby (31%, no model exists) 38%.
- C at 10 HP (T1 hit taken, Danger from T2): 64% with a Lullaby model, 49% blind.

## Caveat: damage
With this loadout (S.Jump Charge, Power Bounce, Close Call, Ultra Boots, Lakilester Super) none of the routes reaches
50: current 35 (Spiny Flip 3 x5, PB3 after a Charge 12, PB3 4, Jump x2 about 4), B 36 (8 hits) or 33 + Bomb, C 34. The
runner's file must hit harder (more attack badges or partner ranks). Per extra +1 per Mario hit: current +8, B +8 (6 + Bomb: +6),
C +11. The badge list (or a clip of the Hallway with Bowser's damage numbers) settles which routes kill on their last turn.

## Time (rough, game frames at 30 fps; from the emulator turn lengths, not console)
- Ultra Shroom from the pause menu before the Hallway: about 150-200 frames (5-7 s) saved by A, B and C in Danger.
- A = current otherwise (same turns): saves only the Ultra Shroom.
- B: no Spiny Flip (about 180 frames each from the partner confirm to Bowser's AI, vs 13 for Do Nothing) on 5 turns, no
  switch to Lakilester after Jr. Troopa; costs the T3 Charge / T4 Maple / long T5 Power Bounce instead of PB3 / PB3 / Jump:
  about 500 frames (17 s) faster than current with 6 + Bomb, about 700 (23 s) with 8 bounces.
- C: one turn fewer (T5 Jump + Spiny Flip, about 370) and Lullaby rolls 138 frames sooner than Time Out, minus 5 more bounces
  (135): about 375 frames (12 s) faster than current.
Console footage of one attempt of each turn type would replace these estimates.

## Fallback
The partner cannot heal Mario, and Mario's T1 action (the Charge that locks the seed) is spent before the Close Call
press. In B the Do Nothing is a wait lever: with no lock or a poor window, keep the hand on Do Nothing until the page
locks / beeps (6 s of waiting gives 88%, 10 s 91%). The only real fallback is decided at the T1 menu: Mario eats the Ultra
Shroom in battle instead of the Charge (no lock from rays, so the shine lock in the T1/T2 menus is needed for Time Out;
-3 damage for the whole fight and about one Ultra Shroom's time, which is what the route spends now).

## Files
`hwlib.py` (state names, actor reads), `b_t1_log.py`, `b_t1_sweep.py` (B T1), `star_menu.py`, `star_probe.py` (Time Out
and Lullaby turns), `lullaby_log.py`, `b_route.py` (B end to end, `STAR=lullaby` for C's T3), `laki_route.py`,
`end_test.py`, `partner_item.py`, `hw_sim.js` (models on top of `../rngtool/pmrng_core.js`, not modified).
Data (numbers only): `data/b_t1_sweep_12345678.json`, `data/b_pb_t5_2468ace0.txt` (20 Power Bounces at charge 6),
`data/lullaby_rolls_2468ace0.txt` (later lines of the first long run were dropped: their replayed values were misaligned;
the two re-runs are exact), `data/timeout_turns.jsonl` (the first line's T3+ menus were wrong; its debuff timeline is right).

## Update: the runner's loadout (Power Bounce, Charge, Power Rush, Close Call; Ultra Boots; Lakilester Super)
Measured (`dmg_check.py`, `tr`-style probes; states built with `BADGES=e4,10a,...` DIAGNOSTIC setups):
- **Badge 0x10A = Jump Charge: +2 per use** (gBattleStatus+0x97 = 2 after one use; 0x10C S.Jump Charge = 3), 1 FP.
  0x10B / 0x10D are the hammer charges (no Jump menu entry): the old "10d = Power Rush" note in the Final Bowser setup
  is wrong. Power Rush's id was **not found** (0x100-0x128 scanned with a T1 jump at 2 vs 10 HP: no Danger bonus), so
  Power Rush is taken from the game's description: **+2 to every Mario hit at 5 HP or less** (not to partner hits).
- Power Bounce hit k = max(1, 3 + charge + 2 - 1 - (k-1)); the Ultra jump's second hit is one less than its first
  (measured 2, 1 at no charge). Spiny Flip 3. Bowser 50 HP, def 1.

| Route (all Mario attacks in Danger) | damage | needs to kill on its last turn |
|---|---|---|
| current / A (identical attacks): Spiny Flip x5 = 15, T3 PB (charge 2) 6,5,4,3,2,1, T4 PB 4,3,2,1,1, T5 Jump 4+3 | 3/3 caps: 46 | PB total 28: T3 4+ and T4 4+, or T3 5+ and T4 3+ |
| B: T5 PB at charge 4: 8,7,6,5,4,3,2,1,1.. + Bomb (2 / 3 / 4 at Normal / Super / Ultra rank, assumed Bomb 3/4/5 - def) | 8 hits: 36 + Bomb <= 40 | cannot reach 46 (or 50) on T5 at any cap or rank |
| C: Spiny x4 = 12, T3 PB (charge 2) 6,5,4,3,2,1,1, T4 PB 4,3,2,1,1,1 | 6/5 caps: 44 | to match current's 46: (T3 7+, T4 6+) or (T3 8+, T4 5+); to 50: impossible |

These totals still give the current route 46 < 50 at its 3/3 caps, so some damage is still missing from the model
(most likely the Power Rush assumption); the ranking does not depend on it: A deals exactly what current deals; B is
10+ short of current; C is 2 short at its planned caps.
Chances (6 s windows): current/A unplanned 3/3-route kill condition 78% (T3 5+ 45.8%, or T3 = 4 and T4 4+), planned
(T3 5+ 96.5%) ~99%; C's (7+, 6+) 39% x 70% = 27%, or (8+, 5+) 21% x 96.5% = 20%: about 35-40% together.
Overall no hit and kill: current ~93% x ~99% (planned PBs); **A ~72%** (77.5% T1 Close Call x 93%); **B: no kill on T5**;
**C ~27% in Danger** (77.5% x 95% with a Lullaby model x ~37%; 21% with a blind Lullaby).
Clip that settles the gap: one current-route Hallway on console showing every damage number (T3/T4 Power Bounce, T5 Jump).
