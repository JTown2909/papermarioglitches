# Time Out Timer v105: each aura split of a lock gets its own seed after the rays; why the truth was missing from the locks (Nov 14)

Goal: honest Final Bowser plans as high as possible; first, why v104 found locks with no state that follows the game. Numbers
only in `fixtures/e2e_v105.json`; no clip, frame or picture committed.

## 1. The model is right: the draws per frame (emulator, full RAM truth)
- The truth trace of each e2e run (gRandSeed per step) gives the draws per frame. The page's own model (`fbStep`, run in node
  from the Mario confirm with the aura split, lightning phases and coin fitted from the menu frames before it) meets the game's
  seed on **every frame** from the confirm through Cloud Nine, the skip, Bowser's AI and dodge test and on into T2 (2b7e1516:
  frames 0-1343, to T2's hit; 1234abcd: 0 to the end of the trace). `t14model.py check` on a new debug-core log (b13, 2b7e1516
  T1): exact to the test. No draw source missing, no varying count, no lag or clock drift within a turn, the 30 fps clock right.
- After Bowser's hit the menu's draws are the same aura / lightning / coin pattern on T1's frame numbers (1234abcd T2 menu): the
  fight's pattern survives the hit and the Life Shroom; only the hit itself (about 12 frames) is not modelled (as before).
- The aura pattern of the v104 b13 build had a residue with 4 draws (all three seeds: the build's pattern), prior 0.0061 against
  0.371 for a 1 (`FB14_BIN`): its true states ranked low. The rebuilt b13 (this run's) has no 4.

## 2. Root cause 1 (fixed): every split of a fit got the best split's seed
- The kernel lists every aura split of a fit within the tolerance (`fb1alts`) but computes the seed and next coin after the rays
  (`s48`, `nc48`, `fb1end`) for the fit's **best** split only; `fb14Lock` built every split with those. A split that moves a count
  between a residue seen three times in the window (rays frames 0-7 mod 20) and one seen twice, or across a coin, draws a
  different number of times by frame 61: those states were **not self-consistent** (their seed is not what their own aura makes).
- e2e 1234abcd T1 (`fb14TruthLock`, diagnostic): the true fit 105/17/1 and the true split were both listed (the true split's
  score tied the fit's best, -4.7 of 6485), but built with seed e9db28e1 instead of the game's 1f58a760: **no state could follow
  the game** (0 of 12000; v104's 0 of 12000 on 2b7e1516's old build likewise).
- Fix: `fbEnd48` runs each split's window on the model (from the seed before frame M + 13, the chosen split, the pattern's bolts,
  the fit's first coin) for its own seed, next coin and the window's shines (now in the state's shines). The kernel's `esc` check
  (the fit's second coin not the one the seed draws) is now per split: a split whose first coin shines when the fit says a second
  coin follows (or the other way) is not built (`fb14SplitCoinOut`). The joint path takes its fits after that check.
- Before / after on the same rebuilt b13 (T1 locks holding the truth by the 90-frame check): 2 of 5 -> 3 of 5 (0badf00d's T1
  now holds it; 1234abcd and deadbeef do not, section 3).

## 3. Root cause 2 (not fixed): a one-Charge lock has more plausible states than it keeps
- 1234abcd T1: the true split is the 46th of its fit's 540 splits by the binomial prior; over all fits it is combination 4183 of
  753252 by weight (prior x score), past `FB14_COMBOS` 1200 / `FB14_AV` 48. With `FB14_AV` 600 and `FB14_COMBOS` 4800 it is among the
  72066 fits (rank 7951, weight 0.39 of the best), and the 12000-state cap after the menu coin cuts it. Each kept split also
  carries every lightning phase pair of its pattern (18 here) and both lags. A larger cap costs ~0.7 us per state per frame on the
  page (12000 states: 8 ms a frame); not taken. The budgets stay 48 / 1200 / 12000.
- deadbeef: no lock held the truth before or after (not analysed further).
- Post-hit fresh lock (9e3779b9 after run): the truth was among the fits (combination 98, weight 1.0 of the best) and the menu
  coin before the Charge, whose 15 s window took in Bowser's hit and the revive, left 48 states and dropped it; the lock then lost
  every state on the next shine (`fb14AllOut`) and T2-T4 went unplanned. v92's fallback only triggers when no state survives.
- 2b7e1516's carried T2 (v104: no truth) now keeps it (strict 7, T2 plans with the truth): on the rebuilt b13 the T1 truth ranks
  high and survives the skip's shift copies; on the old build its prior (the 4) made it the first cut there.

## 4. Measured (`fb14_e2e.py` SKIP=1 RUNNER=patient GUARD=1 TRUTH=1 VCLOCK=1 PLANCHECK=1, T1-T4, 5 seeds, rebuilt b13)
| run | plans | >= 95% | >= 95% with Bowser hitting | locks holding the truth | T1 locks holding it |
|---|---|---|---|---|---|
| before (v104 page) | 61 | 14 | **0** | 8 of 15 | 2 of 5 |
| after (v105, before the joint-path fix) | 43 | 6 | **0** | 7 of 11 | 3 of 5 |
- The two runs of a seed diverge from T1 on (other skip frames: in the after run 1234abcd's and 9e3779b9's T1 skips were hit,
  claimed 0.499 and 0.540), so the counts are not a paired comparison; the after run planned fewer turns (two post-hit T2s gave
  no plan, section 3).
- Calibration (plans, Bowser missed / claimed): after 0.5-0.7: 10 of 11 (claimed 0.60), 0.7-0.8: 7 of 8 (0.76), 0.8-0.9: 10 of 10
  (0.84), 0.9-0.95: 7 of 7 (0.93), >= 0.95: 6 of 6 (0.97). Before: 15 / 15, 7 / 10, 10 / 10, 7 / 7, 14 / 14. Claims under 0.9
  run low (actual ~0.9 against claimed 0.6-0.8): the broad claim and the T3 floor; nothing claimed >= 0.9 failed in either run.
- No `FORCE_HIT` run this time: the after run's two natural T1 hits are the post-hit case (section 3).

## 5. v104's conservative rules: kept
The truth is still missing from 4 of 11 locks (1234abcd T1, deadbeef T1 / T2 / T4); `fb14Broad` is what keeps those locks' claims
honest (v104's confident wrong claims all came from such locks), so its tolerance and the fresh-lock cap are not relaxed: the data
does not support it. With the truth in the set (2b7e1516, 0badf00d) the broad claim costs 0.02-0.25 (T3 0.81 -> 0.59, T4 0.99 ->
0.90) on plans that were all right.

## 6. T6 / T7, console logs
- `fb2_live.js` (T6 / T7) has no aura (gone after the Peach Beam): its fits (`hyps` pairs) have one seed each; not affected. It
  gains only through the carried T4 states.
- Console: the logs have no truth; the `test_console_*` replays (logs1109 / 1110 / 1112 in the suite) lock as before (the seed
  search is unchanged; only the states built from a lock changed). logs1113 (fb0443 / fb0447 / fb0449) have no Charge-capture
  replay test (they are used for the skip box and T6 numbers in `test_fb14_v102`); not added.

## Tests
New `test_fb14_v105.js` (in `run_suite.sh`): `fbEnd48` on the e2e's true 1234abcd T1 state (the game's seed and coin, not the
kernel's), a split moving a count between a twice- and a thrice-seen residue ends elsewhere, `fb14Lock` (node, stubbed page) builds
each split with its own seed and coin and drops a split whose coins contradict its fit, the window's shine in the states, the e2e
fixture (no >= 95% plan with Bowser hitting, before or after; T1 truth 3 of 5 against 2; every plan claimed >= 0.9 right). Version
checks and the page tests' default build moved to v105. Diagnostics (e2e only, `window.__fb14seeds`): `fb14TruthLock`, the truth
count after each input and before T2 / T4's held check, the carried check's end-seed misses; `V105T` (test_fb14_page.js env: a
known true aura scored by the kernel, `fb14V105Score`). Route texts unchanged.

## Not done
- Root cause 2: the one-Charge lock's budget (the true split past `FB14_COMBOS` / the 12000 cap on 1234abcd T1): needs a cheaper
  state (phase pairs or splits merged until they diverge) or evidence that ranks splits (Cloud Nine's puffs, the bolts).
- The menu coin across Bowser's hit for a post-hit fresh lock (drop the window's part before the revive, or fall back when it
  leaves few states, not only none).
- deadbeef's locks; relaxing `fb14Broad` (only once the truth is reliably in the set).

# Time Out Timer v104: a plan claims no more than every state still possible supports; v103's truth check took aliases (Nov 13)

Goal (the user's top rule: never beep a confident wrong answer): v103's e2e found 3 of 25 plans at >= 95% whose kept states held
no true state (2b7e1516 T2 1242; 9e3779b9 T2 after the hit 497 and 564). Numbers only in `fixtures/e2e_v104.json`.

## 1. Artifact or real: both
- **The truth check was weak (artifact).** `fb14IsTrue` compares a state's seed with the true seed on one frame. The seed only counts
  the draws, so states with another coin timer or lightning phase share it on most frames: 1095 of 2b7e1516's carried states at once,
  and the count of "true" kept states jumped 19 -> 3 -> 39 -> 0 -> 57 between re-plans of one turn. The new per-frame check
  (`fb14IsTrueS`: the true seed on every frame of the next 90; `fb14TruthScore`, `fb14TruthWhy`, `fb14TruthDiv`, diagnostic, the
  e2e only) finds **no state that follows the truth** in 2b7e1516's T1 lock (12000 states, best 66% of frames, off after 0-6
  frames, at any clock shift -3 .. +3), its carried T2, or 9e3779b9's post-hit T2 lock (22 states, best 94% then <= 78%); only
  9e3779b9's and 1234abcd's T1 / later locks held it (1-60 states). Of v103-logic's 19 plans >= 95% (before run below) the
  one-frame check put the truth in 16, the per-frame one in 10. So "truth in / not in the kept states" said little either way.
- **The confident wrong claims are real.** A new e2e mode (`fb14_e2e.py PLANCHECK=1`, diagnostic) presses *every* plan on its own
  frame in the emulator from the turn's lever-screen state: what Bowser does there is the truth a claim is about. Before (v103
  claims, `NOBROAD=1`): 40 plans, 19 >= 95%, 16 checkable, **2 had Bowser hit** (2b7e1516 T2 1034 at 0.995, carried, pressed by the
  runner: hit; 9e3779b9 T2 564 at 1.0, the post-hit fresh lock).

## 2. Root cause
- The lock's states often do not contain the truth (above). The coin's soft weighting (a shine matched x15 against the background,
  one read outside a state's -2 .. +4.5 window x0.02) then picks among states a frame or a coin check apart, and near-variant
  wrong states match the coin's 24 / 48-frame cadence as well as the truth would. The kept set narrows (2b7e1516 T2: 1405 states
  with <= 3 errors, 54 kept; 117 -> 48 -> 18 and back to 151 in v103's run) and the claim rises to 99-100% on whichever wrong
  states the last shines favoured.
- The doubt only counts "off the model" (the background, decaying with every quiet coin frame); states the coin merely
  out-weighed (under `ZW_CUT` of the best) leave both the claim and the doubt, so a narrowed set reads doubt 0. Not the 300-state
  sample (these sets were under 300), not a stale subset (each re-plan weighs `FB14.states` afresh), not the bolts (inert).
- A fresh lock (one Charge read) lifted v102's cap on its first coin shine; 9e3779b9's post-hit lock (no true state) was
  "confirmed" so and planned at 100% on frames Bowser hit (564; 469 in an after run without the next fix).

## 3. Fix
- `fb14Broad`: every plan's claim is also scored on all states the coin has not ruled out (`ZW_MAXERR` errors or fewer, by their
  prior weight, the soft factors left out; the same doubt), and the plan claims the lower of the two (`broad` and `ppKept` are
  logged in each plan). Narrowing never raises a claim above what every still-possible state supports; the frame is still the
  kept states' (and the anchor's). A capped claim under the edge is no plan ("broad").
- A fresh lock after T1 keeps `FB14_FRESH_D` until a later Charge locks carried (two reads on one stream); `FB14_FRESH_D` 0.12
  (was 0.1: T2's cap 0.9495 showed as "95%"; now 0.939, T4 0.927). T1 as before (capped until its coin, under 95% anyway).

## 4. Measured (`fb14_e2e.py` SKIP=1 RUNNER=patient GUARD=1 TRUTH=1 VCLOCK=1 PLANCHECK=1, T1-T4; miss = Bowser missed on the plan's frame)
| run | plans | >= 95% | >= 95% with Bowser hitting | pressed >= 95% that failed | truth (per-frame) in >= 95% |
|---|---|---|---|---|---|
| before, first b13 (v103 claims, 3 seeds) | 40 | 19 | **2** (2b7e1516 T2 1034 0.995; 9e3779b9 T2 564 1.0) | **1** (2b7e1516 T2 1034) | 10 of 19 (v103's check: 16) |
| after (broad only, first b13, run lost to a restart) | 41 | 8 | 1 (9e3779b9 T2 469, post-hit fresh lock: why the fresh floor) | 0 | - |
| before, rebuilt b13 (v103 claims) | 14 | 4 | **2** (1234abcd T2 939 0.98, 1246 0.967) | **1** (1234abcd T2 939) | 0 of 4 |
| after, rebuilt b13 (v104) + FORCE_HIT=1.1 (2b7e1516, first b13) | 11 | 1 (1234abcd T2 1310, past the render) | **0** | 0 | 0 of 1 |
- After, the kept states alone claimed >= 95% on 1234abcd T2 993 (0.975 and 1.0) and 1246 (0.964); Bowser hit on all three; the
  broad claim made them 0.55 / 0.48 / 0.52. The first-build after run (numbers in this README only): 2b7e1516's T2 1034 (0.995,
  hit) became 0.51, 1262 (kept 1.0, hit) 0.86.
- Legit >= 95% claims lost: before (first b13) 14 of the 16 checked >= 95% plans were right; their broad claims keep 5 of them
  at >= 95% (2b7e1516 T2 1242 0.977, 1234abcd T4 1428 / 1496 / 1562 / 1634), the post-hit 9e3779b9 T2 ones (298-427, right by
  luck: no true state) go under 95% with the fresh floor. A real drop, taken for the rule; see Not done.
- The rebuilt b13 (the container restart lost the first) locks differently: 9e3779b9's T1 reads "No edge" (doubt 0.73) and its
  post-hit T2 lock is dropped (no plans either way); 2b7e1516's T2 carry plans once (0.81, hit) in both runs.
- FORCE_HIT=1.1 (2b7e1516, T1's skip moved to a hit): the post-hit fresh T2 lock planned 0.83 (prior doubt 0.34), pressed: Bowser missed.
- T1 claims drop with the broad claim (2b7e1516 0.86 -> 0.60-0.66, the lock held no true state; 9e3779b9 0.67 -> 0.54).

## Tests
New `test_fb14_v104.js` (in `run_suite.sh`): the per-frame truth check against an alias; `fb14Broad` (falls to every possible
state's share, with the doubt, left alone with nothing dropped, errors over `ZW_MAXERR` out, NOBROAD logs only, under the edge no
plan); the e2e fixture (before / after, no after plan >= 95% with Bowser hitting, claims at most broad, no pressed >= 95% failed).
`test_fb14_v103.js`: its e2e line now says the one-frame check takes aliases. Version checks and page tests' default build moved
to v104. `test_fb14_page.js` takes `noBroad` from the manifest. Route texts unchanged.
Full `run_suite.sh`: all pass but the known torch_core, hw_v77, route_replay, session_plans, capture_replay; test_maze_dup_page
TORCH=1 hit its timeout (the known hang).

## Not done
- Why the locks so often hold no state that follows the truth frame by frame (2b7e1516's T1: 0 of 12000; the `FB14_MAXH` cap at
  14892 fits, the lag / phase grid or the clock?): the per-frame check (`fb14TruthScore`) is there to look with.
- The broad claim also drops correct claims (before: 1234abcd T4 1363 0.997 -> broad 0.859, 9e3779b9 T4 524 1.0 -> 0.822):
  the coin's weighting was right there (true states kept). Separating the two needs more checked plans than three seeds give.
- Plans under 95% still beep (the edge is the user's setting): after the fix 2b7e1516 T2 1071 (0.81) and 1234abcd T2 993
  (0.55) were pressed and Bowser hit.

# Time Out Timer v103: the stage lightning decided (no random number moves a bolt); the bolt delay not pinned, so the bolts stay logged only (Nov 13)

Goal: stronger T1 (Cloud Nine skip) plans from what shows between the T1 lock and the skip. Numbers only in
`fixtures/bolt_v103.json` and `fixtures/e2e_v103.json`; no clip, frame or picture committed.

## 1. What decides a bolt (pmdecomp `battle/common/stage/area_kkj/kkj_02.inc.c`, `effects/lightning_bolt.c`)
- The arena runs two looping scripts: `EVS_CirculatingBolts` (waits 5 / 30 / 5 / 90: the 130 loop, `fbBolts` slots 78, 83, 113,
  118) and `EVS_RandomBolts` (60 / 10 / 90 / 60: the 220 loop, slots 18, 78, 88, 178). Each slot is a bolt at a **fixed place**
  (the "random" ones fall from y 190 behind the arena, the circulating ones run across at y ~0-40, back and front).
- The one draw per bolt (caller 0xE00BC194, `rand_int(359)` into `unk_110`) only sets the zigzag's phase. **No random number
  decides when or where a bolt shows**; an onset tells the states' phases and their lag after the rays (`S.l`), not the seed.
- Emulator (`fb2_route/bolt_render.py`, debug core, Glide64, b13): 78 bolt draws over 1581 steps (T1 menu, Charge, Cloud Nine,
  its message, Bowser's turn, T2's menu) fit one phase pair, the same frames on 2b7e1516 and 9e3779b9.

## 2. The delay (`FB14_BOLT_D`): not pinned, so not enabled
- Raw renders, a port of `fbBoltFrame` on the screenshots: 10 clean onsets, every one **3 shots after its draw** (menus, P + 27,
  P + 127). Cloud Nine's own camera (from P + 133) gives false onsets (P + 203, 26 points: the camera pans over the arena's
  violet frame; the action-command icons are blue) and its bolts mostly show above the sky box.
- Through the capture simulation and the page (e2e T1 runs, onset picture -> capture json -> shot): 8 onsets **3-15 shots after
  the latest draw** (5, 9, 8, 3, 8, 15, 5, 3; the S-Video blur hides a bolt's thin first frames), and the page clock itself sits
  -1.9 .. +0.3 frames off the game between runs. Page D (onset frame - true draw frame): 1.3 .. 13.4.
- What the T1 plans need is the lag after the rays: the true states split by lag 0 / 1 on the planned frame (9e3779b9 v102:
  1.0 vs 0; 2b7e1516: 1.0 / 0.61 vs 0.83 / 0.55), a 1-frame question, against a reading spread of several frames, and 1-2
  onsets per T1 between the rays and the skip. **The bolt evidence stays off** (`FB14_BOLT_D` null).
- Console (fb0443 / fb0447 / fb0449, one session's growing log): 6 onsets, 2 with a clock frame (T6, 1170.5 / 1188.4), no truth:
  nothing to measure the delay with.
- Written for when it is pinned (inert now): T1 in skip mode reads bolts on from Cloud Nine's confirm to P + 120 (the battle
  camera; `FB14_BOLT.c9`), onsets of 6+ points kept for evidence (`FB14_BOLT.ev`), and a **soft** factor per onset instead of
  v100's cut (`fb14BoltLik`: floor 0.15 + 0.85 x a Gaussian of the distance to the state's nearest draw, sigma 0.4 frame; the
  background doubt x (0.15 + 0.85 x 0.05) per onset): a picture that was not a bolt can never cut a state below the floor.

## 3. The fresh-lock cap (v102 `FB14_FRESH_D`) is kept
Bolts do not test the seed (section 1), and their reading is not pinned: they cannot confirm a fresh lock as a coin shine does.

## 4. Other evidence between the T1 lock and the skip
- Cloud Nine's puffs (pmdecomp `battle/partner/lakilester.c`): 10 `EFFECT_FLOATING_CLOUD_PUFF`, one a frame on P + 200 .. 209,
  each at Mario + (RandInt(40) - 20, RandInt(30) - 15) world units: **their places depend on the seed** (a real seed check), but
  reading them needs Cloud Nine's camera projection and a puff finder on the capture (white puffs on Lakilester's cloud): not
  built, not used.
- The message box and the HUD are not random.

## 5. End to end (`fb14_e2e.py` SKIP=1 RUNNER=patient GUARD=1 TRUTH=1 VCLOCK=1, b13, T1-T4, page v103: bolts logged only)
| seed | T1 skip plans (pp; true share on the frame) | T1 | T2 | T3 | T4 |
|---|---|---|---|---|---|
| 2b7e1516 | 0.859-0.864 (0.62-0.98) | 0.86 missed | carried 0.804 (re-planned after passed frames) hit | blind hit | blind hit |
| 9e3779b9 | 0.663-0.671 (0.24-0.99) | 0.666 hit | after the hit 1.0 missed | 0.734 missed | 1.0 missed |
| 1234abcd | lock with the truth (1578 / 12000) but doubt 0.947: "No edge", blind skip | hit | after the hit 0.983 missed | 0.786 missed | carried 1.0 missed |
T1 before (v102, same build): 0.602-0.711; v103 0.663-0.864 (no evidence change: run-to-run lock and skip-read spread).
Truth in every T1 plan; no T1 plan >= 95% (fresh cap). **No pressed plan >= 95% failed** (4 pressed: all missed).
**Found, not fixed:** 3 of the 25 plans >= 95% (58 plans in all) had no true state in their kept states (2b7e1516 T2 carried 1242: 1.0; 9e3779b9
post-hit T2 497: 0.964, 564: 1.0, pressed, Bowser missed). All are re-plans after a passed frame (`fb14ReplanNear`): the kept
set narrowed (2b7e1516: 117 -> 48 -> 18 states) and the next re-plan had the truth again (57 states): the true states fall
under `ZW_CUT` for a while (coin / visibility windows) while the carried lock's doubt is 0. Not a bolt effect (the bolts are
inert); a v102-era behaviour of the re-plan loop to look at next.
- 1234abcd's T1: the rebuilt b13 locks with the truth in the states, but the prior doubt 0.296 (ratio 2.68) and the weigh leave
  doubt 0.947 over 0.5, so "No edge" (no beep: safe). Not a page bug found; why the weigh drops most weight was not isolated.

## Tests
New `test_fb14_v103.js` (in `run_suite.sh`): the schedule (waits = `fbBolts` slots), the emulator fit, the delay spread (not
pinned; `FB14_BOLT_D` null), the T1 lag split, the soft factor (1 on a draw, floor per onset), T1's Cloud Nine read window
(skip mode only, to P + 120), the e2e fixture (the >= 95% plans without the truth listed, no pressed >= 95% plan failed, T1
under the cap). Version checks moved to v103 (test_fb14_v102 accepts v102+). Route texts unchanged (`test_route_texts.js`).

## Not done
- `FB14_BOLT_D` (needs a reader that sees a bolt's first frame through S-Video, or many onsets with the console truth).
- The puffs as a seed check; the >= 95% re-plans without the truth (section 5); 1234abcd's T1 doubt.

# Time Out Timer v102: post-hit fresh locks do hold the truth (the trace was wrong); fresh locks capped until the coin confirms; T6's countdown; the skip box read as the panel (Nov 13)

The user's top rule: "never beep a confident wrong answer". v101's e2e showed the fresh locks after a hit (1234abcd T1 hit, T2-T4)
with no true state in the truth trace while they planned up to 1.0. Numbers only in `fixtures/e2e_v102.json` and
`fixtures/console_v102.json`; no clip, frame or picture committed.

## 1. Root cause: the truth trace, not the lock
- `fb14IsTrue` (diagnostic) checks a state's seed against the game's at global step `S.f + S.l - off`, with `off` = -(T1's Mario
  confirm step) for the whole run. After a hit the carry is dropped (`fb14CarryGone`: `t0` null) and the next lock is `first`:
  **its clock restarts at frame 0 = its own turn's Mario confirm** (`fb14Lock` M 0). The trace kept T1's offset, so every post-hit
  state was compared with the game's seed ~1000 frames away: "no true state" whatever the lock held. The harness's press side
  already followed the new origin (`runner_press` GMS); the truth seeds did not.
- **Fix (diagnostic only):** the harness passes each turn's Mario confirm (capture index, global step: `truthSeeds.zeros`), the
  page test puts them on the page's time (`zt`) and a `first` lock takes the nearest (`fb14TruthZero`, logged). Measured on the
  same kind of run: post-hit T2 locks hold 1590 / 3591 (1234abcd, full search) and 51 / 173 (2b7e1516, stream lock 2649 steps)
  true states at the lock, and every post-hit plan had true states in its states (table).
- The other suspects checked: the stream window starts at the last lock's seed + 500 (the hit / death / revive draws come after
  that, inside the 500..9000+ window: the 2b7e1516 lock sat 2649 steps on); the ±1 shift re-reads and the "too few
  observations" ideas are moot once the truth is in the set; a "none of these" mass already exists (the background doubt
  `FB14.bg`: a full-search lock starts at its ratio-based prior, 0.38-0.42 here, a stream lock at ZW_BG0 0.05, both decaying only
  with coin evidence).
- Console (log fb0443, page v101): after T1's hit the T2 stream lock (d3adfb09, 2370 steps, doubt 0.05) planned 0.742 and Bowser
  missed; **T4's Charge then matched 7910 of 8824 states carried from that lock**: the post-hit stream lock held the truth.

## 2. A fresh lock's claim stays under 95% until the coin confirms it (`FB14_FRESH_D`, `fb14FreshOpen`)
A fresh lock (no carried state drew its rays: T1, a lock after a hit, a dropped carry) rests on one Charge read. Until a coin
shine after its rays (frame > M + 61) is seen, the plan's doubt is at least 0.1 (`fb14DoubtFloor`), so its claim is at most
1 - 0.1 (1 - blind) = 0.9495 (T1 / T2), 0.939 (T4). Once a shine comes (`fb14FreshConfirmed`) the floor is lifted and a capped
plan is made again by the tick (`fb14Refine`, `P.freshCap`). Carried locks are not touched (two reads on one stream). The
console fb0443 T2 plan (made 0.3 s after its lock, before any coin) would have claimed 0.663 instead of 0.742. T1 skip plans
(the HUD hidden through Cloud Nine: no coin before the message) claim ~0.03 less (2b7e1516: 0.656 at floor 0.1, doubt 0.036).

## 3. Measured (`fb14_e2e.py` SKIP=1 RUNNER=patient GUARD=1 TRUTH=1 VCLOCK=1 FORCE_HIT=1.1, b13 rebuilt, page v102)
FORCE_HIT now also moves T1's skip to the nearest skip frame where Bowser hits (`find_hit_skip`). Every plan of every page run
(each turn's page run replays the attempt from the start, so a turn's plans are made again in the later runs):
| plans | n | truth in the states | claimed pp | >= 95% | true states' share on the planned frame (mean, vs mean claim) |
|---|---|---|---|---|---|
| post-hit T2 fresh locks (1234abcd full search; 2b7e1516, 9e3779b9 stream locks) | 14 | **14 / 14** | 0.754-0.991 | 6 (all with truth) | 0.927 vs 0.878 (11 scored) |
| T1 fresh locks (skip plans) | 9 | 9 / 9 | 0.602-0.711 | 0 | 0.803 vs 0.657 |
| all plans >= 95% | 6 | **6 / 6** | 0.955-0.991 | 6 | 0.992 vs 0.972 (4 scored) |

Turns pressed (T1 forced to a hit on all three seeds): post-hit T2 planned and pressed on 1234abcd (0.848, frame 360) and
9e3779b9 (0.78, frame 203): **Bowser missed both**; 2b7e1516's T2 plan came 15 s after the hide (the patient runner had pressed
blind at 12 s: missed). T3 / T4: the page runs that replay the attempt for T3 / T4 often did not re-lock T2 under load (the
reads differ run to run), so T3 was blind (2 missed, 1 hit) and T4 unplanned (Mario down after the second hit). No pressed plan
>= 95% failed; no plan >= 95% without the truth in its states. Calibration is conservative (true share above the claim): the
claims hold the background doubt and the press spread.
v101 (old trace): the same post-hit locks read "0 true states" on every plan.

## 4. T6's countdown (console log fb0449, "the beeps seemed to glitch by speeding up on turn 6, then there was no display")
- `fb2PlanP` beeped its own 3 beeps 300 ms apart and took the first frame ~0.8 s ahead: planned at 489.33 s for 490.94 s, the
  countdown squeezed against the runner's 500 ms / lead 1.5 s. Now it uses the runner's countdown (`playBeeps`, the first frame
  whose press leaves `earliestPress` ahead), as T1-T4 (fb14Plan) and T7 (fb2PlanT7) already did.
- The frame passed with no Do Nothing read (he confirmed 8.6 s later, c 391.8): nothing was planned or shown again. Now a T6 plan
  0.6 s past its press time with no confirm is made again (`fb2Replan` 'target passed': beeps on a later frame or "No edge").
- fb0449's turns (numbers only): T1 skip pp 0.57, err +1.04, Bowser missed; T2 carried 0.99 missed; T3 0.82, err +2.06, hit;
  T4 fresh lock after the hit pp 0.94, err -1.2, missed. (The popup lever `fb2PlanK`, off the route since v97, keeps its own beeps.)

## 5. The skip box read as the panel (console skip clips fb0443 / fb0447 / fb0449)
- The page sees the message box and the Strategies panel with the same delay (to 1 ms), and on console the box goes 2 game frames
  after the in-game A icon, the panel 1 (VAN.K 3 - VAN.S 2): the emulator's "box 2.0 early against the panel's 0.72" does not carry
  over. **`FB14_READX.K` 3.4** (v101 4.7), VAN.K 3 / Kon 0 kept. The skips' errors become +2.3 / +1.3 / -0.3 (the third inside its
  420-422 window: Bowser missed, as planned); the page's k values were right. Box onset - bar hide 251-252.5 game frames (model 253).
- A box onset read after dropped pictures (fb0449: ~1.5 frames late) brings the skip window's top end in by the frames of the gap
  (`FB14.box.gap`, `fb14SkipWin`).
- Not changed: on console the HUD bar hides ~7-8 game frames after the Cloud Nine menu A (the model's 2); the skip re-anchors on
  the box, but it may matter for "Confirm Cloud Nine on the beep" (P + 332).

## 6. The Press check row (the runner: "last frame seems to be stuck on 1.1")
The Final Bowser confirms (T1-T4, the T1 skip, T6) never reached the Press check row, which kept an older fight's generic press.
Each one on the beeps now shows there (`leverPressNote`: "Last press (Final Bowser T2, Do Nothing): 0.8 frames late", with that
lever's own correction), and is not added to the generic presses (Calibrate / Beep offset).

## Tests
New `test_fb14_v102.js` (in `run_suite.sh`): the truth offset (`fb14TruthZero`), the fresh floor and its lifting, T3's floor kept,
the harness / page hooks, K 3.4 and the onset gap, the e2e fixture (no >= 95% plan without true states; post-hit plans with the
truth; calibration; no pressed >= 95% plan failed), the Press check row on the page, fb0449's T6 countdown and the replan after a
passed frame. Version checks to v102 (test_fb14_v101 accepts v101+).
Suite on this build (page built to both the default folder and `timeout_timer_v102`): all pass but the tests whose inputs are
not in this container (test_torch_core, test_route_replay, test_session_plans, test_capture_replay) and test_hw_v77 (its pinned
old builds), as before.

## Not done
- The b13 build rebuilt after the restarts does not lock 1234abcd's T1 (best 2604 / 1.0; v99-v101 locked it on the earlier b13):
  not analysed. Page runs re-lock differently under load (1234abcd's T2 lock in its T2 run, none in its T3 run), so the T3 / T4
  post-hit plans were rarely reached; FORCE_HIT=1.2 (a T4 fresh lock after a T2 hit) was started and lost to a container restart.
- The cap's 0.1 is a policy floor, not fitted: with the truth in every measured fresh lock the data cannot fit a false-lock rate.
- Not on console: K 3.4, the T6 countdown / replan, the fresh cap.

# Time Out Timer v101: Final Bowser T1's lever is the A that skips Cloud Nine's message (Nov 13)

The runner: skip Cloud Nine's message with A (faster) and make that A the T1 lever, beeped. Route texts unchanged (T1 stays
"Charge; Cloud Nine"). Numbers only in `fixtures/cn_skip_v101.json` and `fixtures/e2e_v101.json`; no clip, frame or picture
committed.

## 1. The skip is a lever (emulator, `fb2_route/cn_skip.py`, debug core, b13 T1)
- Cloud Nine's message ("てきのこうげきが はずれやすくなったぞ!", an opaque beige box 200,191,164 across the top, 320-space
  x 47..272, y 82..105) shows from the Cloud Nine confirm P + 255 (the first render with it) and closes itself on P + 315
  (last render + 317). It prints whole: no speech blip.
- **One A on P + k, k = 255 .. 314, closes it and Bowser's AI draws on the A's frame + 17** (else on P + 332). Nothing else
  draws between (aura, bolts, coin, step only); the one A adds no blip draw. An A on + 254 or earlier, or + 315 or later,
  changes nothing. The box is gone from the render A + 3.
- Same window on 9e3779b9 with Cloud Nine 30 frames later (W 60), without the three-chances presses, and with them moved
  (120 / 140 / 160): the window is the confirm's.
- Every skip frame gives another AI seed (LCG steps confirm -> AI 531 .. 639, about 1.8 a frame): the dodge test
  value over the 60 frames: 1234abcd 43 values, misses on 30 / 60 frames; 9e3779b9 41 values, 35 / 60; miss / hit edges every
  2-3 frames (no skip: claw 56 / fire 67). **A usable lever, window 60 frames (2.0 s), edges per frame.**
- Draws between the skip and the AI: the frames' own (aura 16 per 20 frames, coin, bolts, step): 17 frames.

## 2. The page (`fb14_live.js`)
- **Settings > "Final Bowser T1: Confirm Cloud Nine on the beep"** (`s-fbc9`): "no" (default) = the skip is T1's lever; "yes"
  = v100 exactly (Cloud Nine's press on the beep, read from the bar / screen, its message plays out). Kept with the settings.
- **The model:** Cloud Nine's input keeps its puffs on P + 200 .. 209 and the AI on P + 332, and now records P (`S.p1`). A skip
  input on F moves the turn's AI event to F + 17 when F is inside the message (`fbSkipEv`: P + 255 .. P + 314, P the box's own
  onset once read, else the state's P); outside it nothing moves. `fb14Share(…, 'skip')` scores each skip frame from a state
  stepped to F + 16; the plan's share averages the reading's -1 / 0 / +1 (0.2 / 0.6 / 0.2, `FB14_SKUNC`, as Cloud Nine's).
- **The flow:** on T1's lever step in skip mode the page says "Cloud Nine now, no beep for it ... the beep says when to press A
  to skip its message" and beeps nothing. Once Cloud Nine's confirm is in the states (read live, or applied when the lock lands
  after it) the T1 plan is the skip (`fb14SkipTick`, whatever step the route shows: the screen's close moves it to T2's
  Charge), over the message's frames P + 258 .. P + 311 (`FB14_SKIP_M` 3 in from each end; before the box shows the top end
  another 6 in, `FB14_SKIP_LATE`). Everything else is the Do Nothing plan's: the edge rule (zwChoose, Best chance), the
  hysteresis (`FB14_EDGE_ON / OFF`), the anchor (`fb14Anchor`), the tick's re-score / refine / stop, the beep times
  (`fbPressT`). The skip plan is exempt from the step-screen-lost cancel (`planScreenLost`: its screen is the message).
- **The press correction per lever:** the skip has its own store (`LEVER_STORE.fb14sk` = `tot-fb14skip-v101`, learned like the
  Do Nothing lever: 4 presses, shrunk n / (n + 4), at most 1.5 frames); a skip plan's beeps use it (`fb14Bias('fb14sk')`), the
  Do Nothing levers keep `tot-fb14press-v93`. The status shows both.
- **Reading the message** (`fb14BoxFrame`): a 22 x 4 grid inside the box (320-space x 50..270, y 84..103); up when 55% of the
  cells are its beige (R > 140, G > 128, B > 95, R - B 8..85, |R - G| < 35: a cell with ~30% text still counts). Watched only
  in T1's skip phase, P + 200 .. P + 400. Two pictures up = the onset (`fb14BoxOn`, its P: the box's first picture is P + 255);
  then two pictures gone = the skip (`fb14SkipConfirm`: `fb14Confirm` lever 'skip', err against the plan, the press into the
  skip store, the skip into the states on the panel's -3 .. +3; a box that closed on its own reads + 315: nothing skipped).
- **The reading offset** (`FB14_VAN.K` 3 / `Kon` 0, `FB14_READX.K` 4.7): through the e2e renders, the capture simulation and the
  page, the box's onset / gone read 1.44 / 1.46 / 2.0 frames before the truth raw (three readings, two seeds) where the panel's
  read 0.72 before; the console's panel needs +3.4 (v94 / v96), so the box gets 3.4 + 2.0 - 0.72 = 4.7, the transfer v96 made
  for the bar (one press chain, one clock). Not borne out on console; the 3-frame window margin covers a transfer off by ~2.7.
  In the emulator the skip therefore reads ~+2.7 late, as the e2e's Do Nothing does (+2.6 .. +2.7).
- **Cloud Nine's own reading under load:** the runner now confirms Cloud Nine during the T1 search; the e2e read it 3-7 frames
  late on two runs (pictures dropped by the busy page), -1 on the others. A screen-read Cloud Nine seen after a gap between
  pictures spreads its shifts over the gap (`fb14GapShifts`, as the bar's hide); the box onset gives P again for the window.
  P matters to the AI seed only through a coin draw near the puffs (the draw count is the same), so the true-seed states kept
  their predictions with P off by 6 (9e3779b9: 0.99 at the planned frame, Bowser missed).

## 3. End to end (`fb14_e2e.py` SKIP=1 RUNNER=patient GUARD=1 TRUTH=1 VCLOCK=1, b13, T1-T4, page v101)
The harness's runner confirms Cloud Nine 15-45 frames after its target shows (no beep), then skips the message on the page's
skip plan (or blind on + 267); T2-T4 as before (the patient runner). Bowser missed = "miss".
| seed | T1 (skip) | T2 | T3 | T4 |
|---|---|---|---|---|
| 1234abcd | 0.772, skip + 270: **hit** (+269 / +271 miss) | fresh stream lock after the hit: 0.913 miss | 0.823 miss | 1.0, the wave missed |
| 2b7e1516 | 0.722, + 306 (planned again on the box onset): miss | 0.977 (carried) miss | 0.817 miss | 1.0, the wave missed |
| 9e3779b9 | lock doubt 0.83: "No edge", blind skip + 267: hit | 0.866 miss | blind: miss | 0.962, the wave missed |
Earlier v101 builds on the same seeds (T1 only): 1234abcd 0.784 + 270 hit, 0.812 + 291 miss; 9e3779b9 0.818 + 304 miss,
0.768 + 271 miss (its true-seed states read 1.0 on the planned frame both times). **v100** (bar lever): T1 0.815 / 0.894 /
0.949, all missed; T2-T4 as in the v100 table.
- **Safety:** 4 plans claimed >= 95% (2b7e1516 T2, T4; 1234abcd T4; 9e3779b9 T4): Bowser missed on all; no beep without an
  edge (9e3779b9 T1's weak lock said "No edge"). Over all v101 runs the T1 skip plans pressed claimed 0.72-0.82 and Bowser missed on
  4 of 6 (expected ~4.7).
- **T1's claims are lower than v100's** (0.72-0.82 against 0.82-0.95): the skip is planned right at the lock (the runner
  confirms Cloud Nine during the search; the HUD and its coin are hidden through Cloud Nine's animation, so no evidence comes
  in before the message), on the fresh lock's doubt (0.005-0.27), averaged over the reading's -1 .. +1. The window is a 60-frame
  message, so the plan usually has a run of 1-2 frames; it is honest (true-seed share at the planned frame 0.68-1.0).
- **Found by the e2e and fixed in v101:** zwChoose's "later" reach picked + 315 (past the message, a skip that does nothing:
  now `lim` holds a skip plan inside the window); Cloud Nine read 3-7 frames late under the search (gap shifts); a T2 carried
  lock in 3.5 s planned Do Nothing 3 frames before the runner could be on it (M + 166; Bowser hit): **a Charge turn's Do Nothing
  is not planned before M + 176** (`FB14_DNMIN`; the e2e's earliest confirms M + 157 .. + 174, console 5.2-5.9 s after the hide).
- In the emulator the box readings come ~+3 late (the console transfer above), so the box onset moves the window 3 frames late
  and a plan near its low end is made again (2b7e1516: 475 -> 522); on console that is the intended correction.

## Tests
New `test_fb14_v101.js` (in `run_suite.sh`): the emulator scan (the window, AI = skip + 17, the values and edges per frame,
the invariance), the model (the AI event moved, a skip outside the window ignored, the share flat outside and moving inside,
equal to each state's own skipped outcome, the -1 .. +1 average), the lever ids and per-lever beep correction, the setting
restoring v100, the box cells and the onset / gone reading into the states, the page's setting / store / screen-lost exemption /
route text / version, the e2e fixture (no >= 95% plan failed, every skip inside the window). Version checks to v101.
`test_console_1110b.js` 7 runs with "Confirm Cloud Nine on the beep" (its log's lever; in skip mode a plan after Cloud Nine
is the skip, by design); `test_jr_restart.js`'s version check accepts v1xx. Suite on this build: all pass but the tests whose
inputs are not in this container (test_torch_core: bot1/data; test_route_replay / test_session_plans / test_capture_replay:
uploads) and test_hw_v77 (its pinned v77 / v90 builds).

## Not done
- **Not on console:** the skip's reading offset (`FB14_READX.K` 4.7) is transferred from the panel through the emulator; the
  first console session should compare the skip's `fb14Confirm` err with the plans (the skip store learns the runner's own lag)
  and check the box colour rule on the capture (`fb14BoxOn` frac). The message box's text / colour may differ on console
  capture (only Glide64 renders were measured).
- The T1 lock's quality (9e3779b9: doubt 0.83 on one run, 0.27 on another, 0.15 on the first) and T1's claim at the lock are
  unchanged; waiting for coin evidence is not possible (the HUD is hidden through Cloud Nine).
- After a hit (1234abcd T1) the T2-T4 fresh stream locks held no true state (truth trace) and still planned up to 1.0 (the
  outcomes were misses): a v100 behaviour, not changed here.

# Time Out Timer v100: Final Bowser reads Bowser's attack each turn; the lightning onsets logged; the plan refined as states narrow (Nov 13)

The runner: "observe the coin after the charge to further lock the seed, or use Bowser's previous attack to help pinpoint
it". Numbers only in `fixtures/console_v100.json`; no clip, frame or picture committed.

## 1. Bowser's attack, every turn (`fbAtkFrame`, `fbAtkDecide`, `fb14V100`)
- **Fire breath:** the share of saturated orange (R > 190, R-G > 90, B < 90) on the page's 32x24 game box. On the Nov 12
  console clips (23 Bowser turns, windows from each lever confirm to the next turn) every fire turn reads 0.34-0.69 for
  2-3 s, every other turn at most 0.016; the emulator's T1 fire 0.335. Rule: 20 pictures at >= 0.08 = fire; >= 240
  pictures watched under 0.05 = not fire; else unread. **24 / 24 right.**
- **Claw or body slam** (a turn with no fire and no hit): the min of an 8-picture mean x-centroid of Bowser's warm colours.
  The slam lands on Mario (17-47 T2 0.20, 17-33 T1 0.21), the claw stays a step off (15-33 T2 0.33, 17-33 T2 0.34, 04-35 T2
  0.32); slam <= 0.24, claw >= 0.30, between unread. Not read on a hit turn (the death and the revive move the camera).
  5 / 5 on console by eye; the emulator runs read 2 claws (2b7e1516 T1, 1234abcd T3) whose next plans held at 1.0 and missed.
- **The wave / Lightning Blast / Star Rod / Recover** are not told apart from each other: at T4 "not fire" is what is read
  (the 4 console T4 waves: 0.005-0.010).
- **The cut:** in `fb14Weigh` a state whose AI picked another attack that turn keeps `FB14_ATKW` 0.003 (fire / not) or
  `FB14_CLSW` 0.15 (claw / slam); off the model the attack is as likely as Bowser's odds (the background doubt x 0.5 each).
  It applies to every carried state with that turn's attack (T1-T4; T4's is decided at the Peach Beam's hide, before the T6
  bases are taken). After a hit the carry is dropped as before and the next lock is fresh (its states start after that
  attack), so a hit turn's attack has nothing to cut; T5 / T6 attacks are not modelled.
- **Logging:** `fb14Attack` per turn (fire, cls, pictures, fire run, minC); per plan `fb14Evidence`: the states each
  evidence cut, the states kept and the doubt without / with the evidence, and the plan's chance without (`pp0`) / with it.

## 2. The lightning: onsets read, not used
`fbBoltFrame` reads violet points on the sky under the bar in the menus (no Bowser stretch, no Charge burst) and logs an onset
(`fb14Bolt`) after 6 quiet pictures. The evidence (`fb14V100`: a state with no draw of its phases within 2 frames of a bolt
keeps 0.05) is written and tested but **off**: `FB14_BOLT_D` (the onset's delay after the draw) is not calibrated. The e2e's
truth trace (`fb14TruthPh`, diagnostic) shows the true seed carried by several phase pairs at the lock (9e3779b9: 8+), and the
menus showed only 1-4 onsets per turn (Mario's menu camera shows little sky; on console the bolts land anywhere along a 359
draw, many off screen). Calibrating needs the phases at a later truth point and more onsets; until then a wrong delay could
only cut true states, so it stays logged only. **"Lightning phases from the picture: still not used."**

## 3. The plan refined as the states narrow (`fb14Tick`, `fb14Refine`)
A running plan under `FB14_UP` 0.95 whose states narrowed (10% fewer, or the doubt 0.02 lower) is made again before its first
beep (at most every 0.7 s): `fb14Anchor` keeps the anchored frame unless a frame `FB14_ANCHOR_TOL` better is in reach, so
the beeps do not jump. The bounded "wait for more evidence" option was not built.

## 4. Other observables
The popup close, Lakilester's menu timing, Mario's HP and the Peach Beam are already inputs (v86-v99); nothing new was added
for them.

## 5. The effect
**Console replays** (`test_console_v100.js`: the Nov 12 logs' fb1 captures at their own page times, the log's coin and
inputs, each turn's first plan made again without / with the clips' attacks): 22 plans, 12 with a frame. pp >= 0.95: 7 / 12
before, 7 / 12 after (median 0.984 -> 0.985). The attacks cut many states (7483f3b1 T3 57 -> 27, 1509e942 T3 34 -> 19, T4 8
-> 6, 7483f3b1 T2 114 -> 89) but those plans were already ~1.0 (T2 / T4 carried) or under the T3 floor; 7483f3b1 T2 0.94 ->
0.935. Stream locks (T2 / T4 fresh) are not re-made by the replay (they show "edge" at frame 0).
**Emulator** (`fb14_e2e.py` RUNNER=patient GUARD=1 TRUTH=1 VCLOCK=1, b13, T1-T4, three seeds, page v100):
| seed | T1 | T2 (pp0 -> pp, states) | T3 | T4 |
|---|---|---|---|---|
| 9e3779b9 | 0.949 miss | 1.0 (0.978 -> 0.978, 73 -> 63; T1 fire) miss | 0.823 (339 -> 281) miss | 1.0 (368 -> 194) wave missed |
| 2b7e1516 | 0.894 miss | 1.0 (0.97 -> 0.986, 312 -> 300; T1 claw) miss | 0.823 (1656 -> 1442) miss | fresh lock 0.641 (no cut) miss |
| 1234abcd | 0.815 miss | 1.0 (0.976, 72 -> 64) miss | 0.823 (200 -> 84) miss | 1.0 (68 -> 30) wave missed |
v99 on the same build: T1 0.74 / 1.0 / 0.93 (planned after the patient runner's 12 s: blind), T2 0.997 / 1.0 / 0.957, T3 0.823 x 3,
T4 1.0 x 3. Turns >= 95%: v99 T2 3/3, T4 3/3; v100 T1 0/3 (0.949), T2 3/3, T3 0/3 (the floor), T4 2/3. T1 has no earlier attack
to use; its plans came in time on these runs (not a v100 change: the machine load differed).
**Safety:** all 12 e2e turns were pressed on the planned frame and Bowser missed every one (5 claims >= 95%); in the console
replays no claim >= 95% falls on a frame Bowser hit. **T3 keeps `FB14_T3_FLOOR`** (the console T3 coin offset is still
unexplained; nothing here makes T3 exact).

## Tests
New `test_fb14_v100.js` (the classifier on synthetic grids, the console calibration from the fixture, the cut counted per
evidence with the doubt before / after, a fully contradicted carry over the edge, the bolt onsets and the bolt factor, the
e2e fixture) and `test_console_v100.js` (the replays above), both in `run_suite.sh`. Version checks to v100.

## Not done
- The lightning evidence (calibration of `FB14_BOLT_D`); the wave / Lightning Blast told apart at T4; T5's attack for T6.
- The bounded wait before the first beep; T6 end to end.

# Time Out Timer v99: Final Bowser T6's beeps kept, T6's Charge armed without a carry, the emulator check through T4, T3's lag measured (Nov 13)

Console attempts 441170cf (page v98, clip 18-41-14: "almost had it, but it lost the seed on turn 6"; T1-T4 worked, T2 / T4
carried at 100%, T3 82%) and 7483f3b1 (page v97). Numbers only in `fixtures/console_v99.json`; no picture committed.

## 1. T6: the beeps cancelled 0.02 s after the plan (441170cf)
- The T6 Charge locked on the 882 carried candidates (171.18 s, 3 states); `fb2PlanP` 171.20 s: Do Nothing on k 132, pp 0.60
  (over Best chance 0.4: the edge rule passed), window 1, tPress 172.54; `beepsCancelled` (3) at 171.22; no plan or "No edge"
  after it; Do Nothing confirmed 53 s later, unplanned.
- **Cause: the page's screen-lost rule** (the step's target screen off for over 1 s with a plan whose press is ahead:
  `cancelPlan`, silent). T6's step screen is Lakilester's Strategies screen; its plan is made on the Charge's lock, before
  that screen opens, and the screen had been "lost" since the Charge: the next picture cancelled it. v82 exempts an early plan
  (made before its screen showed) until the screen has been seen and gone; the fb2 plan was not marked early. Not the fb14
  tick (it only touches fb14 plans), not v98's sample rescoring, not the edge rule, not the popup watch.
- Then nothing replanned: `autoPlan` never reached `makePlan` on the T6 step, and `fb2PlanP`'s own "No edge" text was left to
  `makePlan`.
- **Fix:** the T6 plan is early (`st.plan.early`); the rule is `planScreenLost` and logs `planScreenLost`; a T6 plan lost all the
  same is made again (`fb2Replan`: beeps, or "No edge" with its reason); `fb2PlanP` under the edge shows "No edge: …" at once;
  `autoPlan` runs the T6 step (twice a second, as the other steps).
- **The timing:** the popup closed on k 76, Lakilester's menu opens 17 frames later (k 93); k 132 is 56 frames (1.87 s) after the
  popup and 39 after the menu. Its earliest frame 130 is `FB2_PMIN` (not the beep lead), so all three beeps (from k ~105) fall with
  the Strategies screen up: consistent.

## 2. T6's Charge not triggered (7483f3b1)
T4's carry was gone (196.9 s, `fb14CarryGone`); T4 confirmed 201.3 s (before a lock, `FB14.p4t` set). The Peach Beam's hide
(207.65 s) set **no T5 mark**: `fb14HideWatch` returned without a carry (`FB14.t0` null), and on T6's step with no carry
`fb14Frame` returned before it. So `fb14ArmOk` held the FB2 reader to T4's confirm + 45 s (246.3 s) and the T6 Charge's hide at
229.29 s (28 s after T4) armed nothing. **Fix:** the Peach Beam's hide marks T5 with or without a carry (`fb14Peach` logs
`F: null, why: 'no carry'`); the T6 hide 21.6 s after it arms. (The clip was not decoded: the log's hides and the code path
explain it.)

## 3. The emulator harness: T1 locks; T1-T4 on three seeds
- After the container restart the states were rebuilt (`make_states.sh`, BUILD=0) and a new T1 build (`b13`: Mario 10 HP,
  Bowser 80, written as route_build does). On it **v98 and v99 both lock 1234abcd's T1** (ratio 2.64; v98's runs on `b12` read
  best 1.02-1.08). The page did not regress; the `b12` build (gone with /dev/shm) cannot be compared. Mario stands 16.6 px /
  5.8 units off the camera table on both builds (the page's centring handles it).
- T1's plan still came just after the patient runner's 12 s: the search takes 6 s on this 4-core machine and the fresh lock's
  placement check (-1 / +1 re-reads) ran its two workers one after the other (2.7-4.3 s). They run in parallel now (1.6 s).
- `fb14_e2e.py` (RUNNER=patient GUARD=1 TRUTH=1, T1-T4), `fb14_t3check.py`: **PASS** on all three.
| seed | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| 1234abcd | locked, plan after 12 s, blind: miss | 1204 (0.997): miss | 1771 (0.823): miss | 2327 (1.0): wave missed |
| 9e3779b9 | locked, plan after 12 s, blind: miss | 1257 (1.0): miss | 1818 (0.823): miss | 2346 (1.0): wave missed |
| 2b7e1516 | locked, plan after 12 s, blind: hit | fresh lock, 0.957: miss | 0.823: miss | 1.0: wave missed |
  T3 was planned on carried states every time (no drop, no re-lock needed). T6 was not run.

## 4. T3: console lag across the Jelly? Not found
- Console: the bar hidden across the Jelly, as the page read the clips live (barHide -> coinBack): 4667 / 4633 / 4650 ms
  (c6469b35 / 7483f3b1 / 441170cf) = 139.6 / 138.6 / 139.1 frames.
- Emulator (`fb2_route/jelly_hud.py` on b13, the top HUD strip per game frame from the Jelly confirm): changes on +4, gone +8, back +144
  (Lakilester's menu, battle state 14, on +154): hidden 136-140 frames.
- So lag frames during the Jelly animation are at most ~3.6 and at least ~-1.4 frames, the same on all three attempts within a
  frame: they cannot give v98's 3.4-6.5 frames, which also varied (and c6469b35's T1 shines were already 3.4-5.1 late before any
  Jelly). The difference is not lag in the Jelly; not modelled. **The T3 floor stays** (`FB14_T3_FLOOR` 0.35).
- 441170cf T3: planned 1463 (window 1462-1464, 82%), pressed 1461.09, Bowser missed (and T4's carried lock matched): one more
  outcome outside the planned window that the floor's honesty covers.
- Seen on the way: the emulator's HUD leaves on +4..+8 while `FB14_HIDE.jelly` is 2; not changed (the e2e T3 plans read the Jelly
  from the same hide and missed every time).

## Tests
New `test_console_v99.js` (in `run_suite.sh`): 441170cf's T6 replayed on the page (the plan kept on the picture 23 ms after it;
a lost T6 plan logged and made again; after its screen was seen and gone the rule acts; a lost plan under the edge says "No
edge"); 7483f3b1's T5 mark and the T6 arming; the e2e numbers and the parallel placement; the Jelly HUD numbers and the floor.
Version checks to v99; the page tests' default page paths to `timeout_timer_v99`.

## Not done
- T6 end to end in the emulator; the T6 read with no carry (a full FB2 search) on 7483f3b1's clip.
- The clips were not decoded frame by frame for item 4 (the page's live bar readings were used); the page's coin-box detector on
  the emulator's Jelly was not run (the HUD strip stands in for it).
# Time Out Timer v98: Final Bowser T4's beeps hold, T3 never claims 100% and re-locks on the stream (Nov 12)

Console attempts c6469b35 (page v96, clip 17-33-59: "turn 3 and 4 fail") and 7483f3b1 (page v97, clip 17-47-17: "mostly
fails"). Numbers only in `fixtures/console_v98.json`; no picture committed.

## 1. T4: the moving beep (both logs) — the sample, not the coin
- c6469b35 T4: fresh stream lock 2.39, plan 207 (pp 0.81, doubt 0.003); 1.2 s later `beepsStopped` at 0.46, doubt 0.002; the
  next plan 273, 66 frames later (the anchor could not hold 207: it was already behind the earliest beepable frame).
- 7483f3b1 T4: lock 1.91, then 212, 318, 385, 394, 466, 537, 616, 687 in 16 s (three stopped by the tick at p 0.56 / 0.44 /
  0.14 with doubt 0.01-0.04, the rest replaced before they played): no beep ever played, confirmed unplanned.
- **Cause.** The plan and the tick scored on a 150-state sample taken as every k-th state by list position, unweighted, with
  k from the list's length. One state cut by the coin moved k and swapped the whole sample; the plan's best-of-the-next-second
  frame (picked on one sample's noise) then read 0.15-0.5 lower on the tick's sample. Replayed (7483f3b1's T4 capture through
  the page): frame 212 reads 0.42-0.71 on such samples of one list, 0.50 on all 24000 states. Not the PlanHeld bar rule, not
  the edge: the doubt never moved.
- **Fix** (`fb14Sample`, `fb14Resample`): each state is in the sample by its own fixed draw (hashed once from its content)
  with a chance proportional to its weight, and stands for weight / chance (Horvitz-Thompson): the heavy states are always in,
  the sample is nested as states are cut, 300 states. The plan keeps its sample; the tick re-scores that sample with the
  states' weights now (the ones the coin cut drop out), so only the coin can stop the beeps. On the replay frame 212 reads 0.495
  on the plan's sample and 0.495 after 10% of the states are cut (v97's samples: 0.526 -> 0.487).

## 2. T3
- **c6469b35:** T1 planned 63%, pressed +1.69, missed; T2 carried, 96% (window 6), pressed +2.46, missed. After the Jelly the
  first T3 weigh found no state (`fb14AllOut`, `fb14CarryGone`): the shines after T2's confirm (978.8, 1072.0, 1120.8 on the
  clock) against the states' 1019 / 1091 / 1139. A replay of T1's capture carried onto T2's seed (118469 combinations of T1's
  confirm, T2's Charge frame and the nuisance) has no state within the coin window for all three: the T1 shines already sit
  3.4-5.1 frames after the states' (the window allows 4.5), 978.8 is 6.5 after the nearest.
- **7483f3b1:** T1 64% (+0.32), T2 carried 94% (-0.55), both missed. T3 planned **1434 at 100%** (window 4, doubt 0) after
  the Jelly; pressed -0.37 inside the window; **Bowser hit**.
- **The emulator.** The page's model is exact from T2's confirm to T3's lever on every chain log (7 in the fixture), and on a
  new one with the Jelly at the first Mario menu as on console (1234abcd, `chain_log.py` with the turn ended at the menu: T2's
  Do Nothing -> Mario's menu 166 frames, the Jelly 275; exact over 2567 frames, tests 4 / 4). (A first try with 3-8 menu
  frames had the game eat the menu inputs: Mario used another item on T2, not a model error.) On console the menu came ~140
  frames after T2's Do Nothing and the Jelly 186-197. So the console difference between T2's confirm and T3's lever is **not
  found**: the model replays the emulator, and the console shines sit later than the states by more than the window.
- **What v98 does instead:** T3 is not trusted until that is pinned.
  - `FB14_T3_FLOOR` 0.35: T3's plan and tick keep at least that share of the blind chance, so a T3 claim is at most ~82%
    (never 100%; `test_fb14_plan.js` T3 claimed 0.816 against the model's 1.0).
  - `fb14Relock3`: when the carry is gone or contradicted (doubt over the edge) on T3, the states of T2's lock (`FB14.snap2`,
    the 1500 heaviest, on the stream from that lock) are taken again with T2's Do Nothing confirm at -4 .. +4 and the Jelly at
    -2 .. +2, and the coin matched in a wider window (-3 .. +7 frames, `FB14_WIDE`): a coin-based re-lock on the stream,
    planned under `FB14_T3_RELOCK` 0.45 (at most ~77%), logged `fb14Relock` / `fb14RelockNone`. Once per T2 lock; without it
    the carry is dropped as before (the blind text, never silence).

## 3. T6 (7483f3b1)
The route went to T6's step at T4's unplanned confirm (201.3 s, `fb2WaitShown`). The Peach Beam's hide (207.65 s) set the
T5 mark; the T6 Charge's bar hide at 229.29 s (21.6 s later, past the 20 s arming gate) logged **no trigger**, and the Do
Nothing confirm at 239.6 s came with none (`fb2ConfirmNoTrig`): the T6 lever logic never ran. Why the reader did not trigger
is not found in this version (the clip was not decoded; the carry had been dropped at T4, so the T6 read would have been a
full search).

## 4. The emulator check through T3 (`fb2_route/fb14_t3check.py`): not passed
`fb14_t3check.py` reads `fb14_e2e.py` reports (RUNNER=patient GUARD=1 TRUTH=1, 3 turns) and passes when T3 is planned on
carried or re-locked states with no claim over 0.83. Run on 1234abcd (build: the T1 menu at 10 HP, Bowser 80, written as
route_build does):
- v97 page: T1 did not lock (a no-lock read), T2 locked fresh 8.8 s after the hide, T3 planned at 1.0 on states the truth
  trace does not contain, and replanned every ~2.4 s (the v97 sample loop of section 1); Bowser missed: **FAIL** (claim 1.0).
- v98 page: T1 again no lock, T2's fresh lock came 8.2 s after the hide, its plan 12.2 s (after the patient runner's 12 s),
  the unplanned press hit: the carry was off before T3: **FAIL** (T3 not reached with a carry).
The T1 read failing on both runs is new on this machine's harness and is not analysed; 9e3779b9 / 2b7e1516 were not run.
So the T1-T4 carry through T3 on three seeds is **not shown**.

## Tests
New `test_console_v98.js` (in `run_suite.sh`): the two logs' T3 / T4 numbers; the sample (weighted, the heavy states always
in, nested, the weights' sum, the tick's re-score); the T3 floor and the re-lock on a synthetic carry whose shines come 5.5
frames late; with the page and the log, 7483f3b1's T4 replayed (the plan's sample before and after the coin cuts states).
Changed: `test_fb14_plan.js` (T3 claimed under 0.83), version checks to v98.

# Time Out Timer v97: the runner's route texts, pinned; Final Bowser T6's lever is Lakilester's Do Nothing (Nov 12)

The runner: "stop changing what the route says … all turns should resemble what I put there", and on T6 he "didn't identify
the right turn": the page told him to hold the +3 popup, while his lever is Lakilester's Do Nothing.

## Rule: the route texts are the runner's
Every turn text is pinned by `test_route_texts.js` (in `run_suite.sh`). A turn text never carries an instruction, a note or
parentheses of the page's own: those go in the step label or the status / headline. A change to a pinned line needs the
runner's new wording, quoted here.

## 1. The route texts
- **Final Bowser (Ultra Boots)**, now: T1 `Charge; Cloud Nine`, T2 `Charge; Do Nothing`, T3 `Jammin' Jelly; Do Nothing`,
  T4 `Charge; Do Nothing - Block Wave`, T5 `Peach Beam - Danger`, T6 `Charge; Do Nothing - Close Call`, T7 `Bounce x7`.
  T3-T6 are the runner's verbatim; T1, T2 and T7 follow the same style (to be confirmed with him). Removed from the turn texts:
  "(equip Close Call before the fight: T6 needs it)" (now in T1's Charge step label), "(Close Call equipped)", the popup
  wording and v96's "HOLD the +3 popup — WAIT for the beep".
- **The other fights**, checked against git history since the specs: Duplighosts, Jr. Troopa (RTA and ENDGAME_JR) and the
  Hallway are as the runner wrote them, with v87's removals on his request (Life Shroom, the Spiny Flip numbers) kept;
  nothing else had been reworded. The Normal Boots route is v84's spec text (the spec file named in the task was not on disk;
  the v84 commit is the record), with Final Bowser's phase 2 as v85 rerouted it on his "we can route around it, we just need
  a high cap" (a route change, not a rewording: kept).

## 2. T6: the measurement (`fb2_route/t6dn_log.py`, emulator, JP, debug core)
Build: T1-T4 each on the first lever frame that makes Bowser miss, T4 guarded (A on P + 87: Lakilester blocks the wave and
is not KO'd), T5 Peach Beam + Do Nothing, T6 menu at Danger. DIAGNOSTIC writes (setup only, labelled in the script): Mario
HP 10 / Bowser HP 80 / gRandSeed at T1, gRandSeed at the T6 menu per seed, and (CURE=1) Mario's poison cleared at the T6 menu
(build 1234abcd's T5 left Mario at 1 HP and poisoned, so a dodge died at the T7 turn start whatever T6 did).
- **The popup plays no part.** The popup A (confirm + K) opens Lakilester's menu on K + 17; between the end of the rays (61)
  and the Do Nothing confirm P the only draws are the bolts, the coin and the step, and the seed at a fixed P is the same for
  K = 77, 100, 130 and no press (P 220: e260fa51, P 240: cd60d8f8). The Strategies inputs draw nothing.
- **Bowser's AI on P + 13** on all 51 runs (as T2-T4): RandInt 100, 80, maybe 60 (the T6 attack choice as before).
- **The Close Call test** (rand_int(100) < 30) 52 frames after the AI for Body Slam, **55 for Claw** (62 with Lakilester KO'd)
  and 55 for Fire Breath; after a Close Call the T7 menu 101 (Body Slam) / 134 (Claw, Fire Breath) after the test, with only
  bolts and the coin between (9 runs), so the T7 Power Bounce model (`fb2PB`) runs from the test as before.
- `t6model.py` with the AI frame given (`E=`, `DNDELTA` / `DNMENU`) is exact on all runs (attack and roll, `t6_check.py`).
  Numbers in `fixtures/fb2_t6dn.json`.

## 3. T6 on the page (`fb2_live.js`)
- The T6 Charge still locks (the fb2 profile, the stream prior / the carried candidates from T4 as before).
- **`fb2PlanP`**: for every kept state, the Close Call on each Do Nothing frame P (AI on P + 13), over the next
  max(1, Settings window) s from the earliest beepable frame (and not before confirm + 130); the perfect-press pick
  (`ppPick`, safe3) with the console lag 0 / 1 and the press spread as the popup plan had; **the edge rule** (zwedge): under it
  no beep ("No edge: … Do Nothing whenever you like"). The beeps are fb2's press time **plus T2-T4's learned per-lever
  correction** (`fb14Bias`, the same store `tot-fb14press-v93`).
- **`fb2Confirm`** (the Strategies box closing on T6's step, `checkPress`): read as T2-T4's Do Nothing, `fb14Van('S')`
  (vanish 2 minus v94's +3.4); the press goes into the learned store; the frame into the states on `FB14_SHIFTS_S`
  (`fb2SetP`); the route moves to T7. A lock that lands after the confirm applies it then.
- **T7** is planned from the post-T6 states by `fb2PlanT7` as before: the edge rule, and Close Call assumed equipped (v95:
  the hit share 1 - pLucky is background until the coin shows the dodge branch).
- **Demoted:** the popup plan (`fb2PlanK` / `fb2SetK`) is not called live (kept for the old tests); the popup closing is
  logged (`fb2Seen`) and starts the coin watch, and no longer moves the route. The HOLD headline and its texts are gone.
- **The T6 step**: Lakilester's Strategies screen (cat S) with the T6 Charge as its pre; label "Super Charge (its rays lock
  the seed; close its +3 popup whenever you like), then Lakilester: Do Nothing on the beep → Close Call". From the step
  arming the headline is WAIT: "WAIT on Lakilester's Strategies screen (Do Nothing) for the beep …" (`fb2WaitArm`).

## 4. The emulator check
The page planned the Do Nothing from frame 157 on each seed's true state (seed after the rays, the next coin, the lightning
phases from the log); the emulator then pressed Do Nothing on that frame:
| seed | planned | Bowser | roll | |
|---|---|---|---|---|
| 0badc0de | +159 | Body Slam | 22 | Close Call |
| 13579bdf | +163 | Fire Breath | 13 | Close Call |
| deadbeef | +179 | Claw | 0 | Close Call |
| 5eed0fb2 | +173 | Fire Breath | 19 | Close Call |
(deadbeef and 5eed0fb2: their truth from a run on P 156, where Bowser hit.) The windows were one frame each on these seeds
(the frame either side failed on 0badc0de's 160), so the shown "with your press spread" chance is the honest one.

## Tests
New `test_fb2_v97.js` (the model on the 51 runs, the popup independence, the plans, the learned correction, the reading,
the edge rule, the confirm into the store / states / T7, the step and headline, no HOLD left, the four emulator checks) and
`test_route_texts.js`. Changed: `test_console_1112.js` 5 (the WAIT message; the popup keeps T6), `test_console_v96.js` 5
(the WAIT headline), `test_console_v95.js` 2/3 (the route text), the page paths of v94-v96 to `timeout_timer_v97`, version
checks to v97.

## Not done
- The T7 Power Bounce was not re-run in the emulator with Lakilester up (the harness's menu inputs did not reach the move
  after this T6); its model is v74's (48/48) from the test on, and the stretch test -> T7 menu was checked (bolts and coin only).
- Not on console. The Do Nothing reading and offset are T2-T4's; whether the fb2 clock reads the T6 Do Nothing as fb1's
  clock reads T2-T4's is not measured.
- If the T4 wave is not blocked, Lakilester is KO'd on T6 and the popup is the lever again; v97 does not beep that case.
# Time Out Timer v96: the Final Bowser lever timing pinned (Cloud Nine +2.5, Do Nothing +3.4), the runner late, no chasing replans, T6's HOLD (Nov 12)

Every console Final Bowser attempt so far: 00700c7e / a87486a0 (v92), 906bfb29 / 1509e942 (v94), the new 0dfd444d (v95, clip
16-05-14, "complete fail"), plus the 11-09 / 11-10 logs. Numbers only in `fixtures/console_v96.json`; the clips were decoded
for the overlay A and the HUD bar only (no picture committed). The emulator was not run.

## 1. The carry and stream method does not pin a lever
`tools/fb14_carry_pin.js` replays a lock's capture through the page, puts each candidate lever frame into the states and keeps
those that reach a later lock's seed (and, with that Charge replayed fresh, its rays' end seed).
- **Cloud Nine, 906bfb29 T1** (the only Cloud Nine Bowser missed with a carried T2 lock; 54c12cf2 / 1de38253 are on v89 / v90
  with no Cloud Nine read): T1's lock 7173067f -> T2's narrowed lock 8f17f0b0, 1677 steps. **All 21 frames 260-280** (Bowser
  missing) reach both seeds from some T1 fit (86 states; T2's Charge at M +0 .. +2); 2 coin shines between T1 and T2 tell
  nothing apart.
- **Do Nothing, 906bfb29 T2 / T3 -> T4's lock 1576edf0:** T2 on 19 of 19 frames, T3 on 18 of 19, every Jelly frame.
- **Why:** a Charge seed fixes only how many draws came before it. Cloud Nine's puffs and Bowser's AI / test draw the same number
  of times on any frame (the frame changes their values, not their count), so a lever frame changes the T2 seed only where it
  moves a draw across a coin draw or flips a branch, and some fit covers that. The other attempts had Bowser hit (not modelled)
  or a fresh lock between (00700c7e T2 / T3 -> T4: the same count argument). So the carry gives no offset; the offsets below come
  from the clips and the outcomes.

## 2. The overlay A against the beeps (every Nov 12 clip)
Each clip synced to its log by every bar hide (00700c7e 57013.0, a87486a0 250295.7, 906bfb29 117542.8, 1509e942 412891.7,
0dfd444d 293297.3 ms). For each planned press: the overlay A's rise after the plan's tPress (vblanks) and the page's reading of
the same press (v92 reading - target). The reading minus the lag (K, frames) does not depend on the clock (beep and reading use
the same t0):
| lever | presses | K (v92 reading err - lag / 2) |
|---|---|---|
| Do Nothing | 11 (00700c7e T2 / T3, a87486a0 T2 / T4, 906bfb29 T2-T4, 1509e942 T2 / T4, 0dfd444d T2 / T4) | -4.71 .. -5.74 on 10, -6.71 on one; mean -5.22 |
| Cloud Nine (bar) | 3 with full beeps (00700c7e, 1509e942, 0dfd444d T1; 906bfb29's beeps were stopped 1 s before) | -4.70, -4.21, -4.21; mean -4.37 |

The reading follows the press within a game frame (the panel closes on a game frame, the A is seen on a 60 Hz vblank). After
the same press Cloud Nine's bar reads **0.85 frame later** than the panel. Both levers go through the same press chain (the same
beep formula), so **x(Cloud Nine) = 3.4 - 0.85 = 2.55**.

## 3. The pinned offsets
- **Do Nothing +3.4 stays.** The 10 outcomes (8 of v95, then 0dfd444d T2 hit at +1.79 on a one-frame 227, and T4 at +1.37 on 198,
  where the Peach Beam followed: the wave missed) give best 2.2-2.5, with 3.4 within 0.16 and nothing above 3.5 within 0.7.
- **Cloud Nine by the bar: +2.5** (`FB14_READX.bar`; v94 +1.15). The six Cloud Nine outcomes (0dfd444d T1 added: 259.29, window
  260-261, hit) leave nothing in -1.2 .. +2.15 and are best from +2.25 (v94's +1.15 is 100:1 against). With the Do Nothing offset
  at most 3.55 the transfer above gives at most 2.7; Cloud Nine's floor 2.25 needs the Do Nothing offset 3.12 or more. So
  **2.25 .. 2.65**, 2.5 inside. At +2.5 every planned Cloud Nine so far was pressed after its window (Bowser 5 hits, 1 miss: as
  blind), which is the runner pressing late (below).
- **T1 plans:** the share is averaged over -1 .. +1 (0.2 / 0.6 / 0.2; v95 -2 .. +3 even), so a 2-3 frame window plans with
  confidence again; the confirm goes into the carry on -3 .. +3. The edge rule (zwedge) is unchanged: no beep under it.

## 4. Is the runner late? Yes
- His Do Nothing errors on the v94 / v95 readings: +1.94, +0.73, +1.48, +2.41, +1.79, +1.37 (mean +1.62). The overlay A came
  6.7 vblanks (3.35 frames) after the beep on these attempts against 5.15 (2.58) on 00700c7e, the attempt that won: ~0.8 frame
  later at the controller. The rest is the reading's one-frame grain (K).
- If the offset were short instead (a runner on the beep: 3.4 - 1.6 = 1.8), 0dfd444d T2 (+1.79) would have been in its window
  at 96%; the 10 outcomes put 1.8 at **14:1 against** 3.4's neighbourhood.
- **The learned correction is on again** (`LEVER_LEARN.fb14`, the v93 store `tot-fb14press-v93`, which holds exactly these six
  presses): shrunk n / (n + 4), at most 1.5 frames: **the beeps come 0.97 frame earlier** on his browser. If the true offset is
  at the low end (2.3) that leaves him ~0.4 early, at 3.4 ~0.65 late; either is inside a frame.

## 5. The T2 replans of 0dfd444d (205 -> 214 -> 227 in 0.7 s)
The stream lock (2.7) planned 205 (pp 0.805). The coin then moved the weights: the tick re-scored 205 at 0.487 and replanned;
a replan takes zwChoose's best of the next second from the earliest beepable frame, which had moved later (198), so 214
(0.989). The next tick read 214 at 0.775, under the plan's pp - 0.15, and replanned again: 227 (0.964). The runner pressed 229.
Fixes (`fb14_live.js`):
- **The anchor** (`fb14Anchor`, `FB14.anchor`): the first plan after a lock sets the turn's frame. A replan keeps it while it works
  (perfect press at the edge and within 0.1 of the best in reach); otherwise it takes the workable frame nearest to it (ties: the
  earlier), not the best of the next second; with none near, it moves (`fb14ReplanMoved`). Logged `fb14ReplanNear`. A new lock
  clears it.
- **The tick** replans at a drop of 0.25 (`FB14_TICK_DROP`; was 0.15) or under the edge / doubt as before.
On 0dfd444d's numbers the second replan does not happen (0.775 >= 0.989 - 0.25); the first one would take the workable frame
nearest 205 (the live states were not replayed; the test checks the rule on that shape).

## 6. T6
- 0dfd444d: the T6 step armed at T4's confirm (380.7 s); trigger 409.53; candidates 411.30; the popup closed on **k 77** (its
  earliest) at 411.62; the narrow (886 candidates) 580 ms, `fb2Lock` 411.88 (k ~87). The same as 906bfb29.
- **The HOLD is the headline from the step arming** (`fb2HoldArm` on the step change, before the Charge): "HOLD THE +3 POPUP — WAIT
  FOR THE BEEP", red, 1.9em, blinking (`.hold-blink`); the detail "do NOT press A until the beep …"; logged `fb2HoldShown`. The plan
  loop keeps it until the popup beep is planned or the page says to close the popup.
- **Faster lock: not done.** Of the narrow's 580 ms, stage 2 is 269, the joint 2, the hyps 11: ~300 ms are the workers starting
  (WASM instantiate and the maps per worker). A pool started at the trigger would land the lock ~0.3 s sooner (k ~76-80): still
  not before an A on k 77, so the runner holding the popup is what matters.

## Tests
New `test_console_v96.js` (in `run_suite.sh`): the carry counts, K per lever and the transfer (2.55), the Cloud Nine and the 10 Do
Nothing likelihoods, the band 2.25 .. 2.7 with the page's 2.5, the runner (stored presses, overlay lag), the page's READX / C9UNC /
C9SHIFTS, the learned correction on the six presses (-0.97), the replan anchor (212 not 227; kept while it works; moves when
nothing is near), the tick's 0.25, the T6 HOLD headline at the step arming, the T6 timing. Changed: `test_console_v94.js` 3 (bar
+2.5), `test_console_v95.js` 1 (C9UNC / C9SHIFTS), `test_console_1112.js` 2, `test_press_lever.js` 3, `test_fb14_v86.js` 5 (the
lever learns again), version checks to v96.

## Not done
- The Cloud Nine pin rests on 3 overlay presses with full beeps and the shared press chain; a session on v96 checks it (Cloud Nine
  `fb14Confirm` err should sit with the Do Nothing ones after the correction).
- The T6 worker pool (above); the emulator was not run on a console-like capture.
# Time Out Timer v95: Cloud Nine's offset is not borne out (1509e942 T1), the edge rule on every plan, Close Call at T6 (Nov 12)

Console logs of 2026-11-12 afternoon on v94: 906bfb29 (T1-T4 all missed, T6 / T7; clip 15-33-14) and 1509e942 (the next
attempt, "total fail"; clip 15-38-09). Numbers only in `fixtures/console_v95.json` (the T1 capture is read from the log at
test time). The clips show no in-game input display (overlay only); the emulator was not run.

## 1509e942 T1: a 97.6% plan, pressed inside, Bowser hit
- **Not a wrong seed.** T1's fresh lock (436c26d0, ratio 1.94) lies **21792 LCG steps** on the stream of 906bfb29's T4 lock
  (1576edf0, 240 s before: 91 steps/s, the console rate); a wrong seed lands within 30000 by chance ~1e-5. T2's stream lock
  (7323ca31, 3.38) is 2657 after it, T4's 3014 after that.
- **The doubt 0.041 was the stream prior**, not 0.42: `fb14Prior` finds the seed on the kept stream (`fbStreamSteps`, up to
  30048 steps, no age limit) and starts at 0.05. Justified here (above). The replay of the capture gives the same seed and prior.
- **The clock:** the capture's burst fits +0.2 (frame 3, no shift). But **v94's anchor never ran live**: `fb14TrigPhase`
  read `CHG.frames`, which is emptied after the maps (and `CHG.F0` dropped before the lock): n 0 on every lock of both logs.
  906bfb29 T4's capture fits -1.0 (its clock stayed a frame off; Bowser missed anyway). Fixed: the levels are kept (`CHG.Fm`).
- **So it is the Cloud Nine offset.** Of the 5 planned Cloud Nines on console 4 were hit, where the plans (pp 0.73-0.98)
  expected 0.93. On their windows the outcomes leave Cloud Nine's offset (true = v92 reading + x) anywhere **outside
  -0.85 .. +2.15**; v94's +1.15 (= 3.4 - 2.25, from the display, not from Cloud Nine outcomes) is inside, ~20:1 against on
  1509e942 T1 alone. x >= 2.15 fits all five as outside-window presses (4 hits, 1 miss at ~50% each); x < -1.2 too. Not
  pinnable from these outcomes; it needs the T1 -> T2 carry on a Bowser-missed T1 (906bfb29: which Cloud Nine frame gives
  T2's narrowed lock 8f17f0b0, 1677 steps on) - not done.
- **v95 is conservative on T1** (`FB14_C9UNC`, `fb14ShareU`): the Cloud Nine share a plan sees is the mean over the reading's
  -2 .. +3 frames (in the plan and in its re-score), so a plan needs a long run of frames to claim much; on the replayed lock
  the best T1 plan reads 60% (window 6), not 97.6%. The Cloud Nine confirm goes into the carried states on -3 .. +4.
- **T2:** 82%, window 188, read +2.41 late (190.41), Bowser hit: an outside-window press, consistent with 3.4.
- **T4:** after two hits (Life Shroom), stream lock 2.47 at doubt 0.05: plan 249 (95.7%), the coin moved it (replan at 0.70) to
  251, stopped at 0.28; a new plan 339 (91%, doubt 0.14), stopped as the doubt reached 0.68 (`carryDied`), the runner pressed
  341. The replan / stop rules behaved as designed; the stream lock itself was probably off the hit path.

## The Do Nothing offset (v94 +3.4) with 906bfb29's outcomes
906bfb29 T2 / T3 / T4 missed with v94 readings +1.94 / +0.73 / +1.48 (v92 readings 992.54 / 1417.33 / 1816.08 on windows
993-994 / 1420 / 1817-1820, pp 0.99+), 1509e942 T2 was hit (187.01, window 188). At +3.4 T2 and T3 fall outside their windows
(misses at ~50% each: possible); T4 (phase -1) inside. Likelihood over all 8 Do Nothing outcomes (in the window the plan's
share, outside the blind one): best 3.05 .. 3.55 (3.4 within 0.04 of the best); no refinement is supported (a band 1.55-2.2
is ~0.6 lower). Kept at 3.4.

## The edge rule on every plan (906bfb29 T7: p7 0, win 0, doubt 0.44, and the countdown played; the runner got 3)
- `fb2PlanT7`: beeps only when the perfect-press 7 share (background as no 7) reaches Settings > Best chance (zwedge);
  else "No edge, press normally", no countdown, a running fb2 plan dropped.
- `fb2PlanK` (the T6 popup): the same on the Close Call share; else no popup beep ("close the +3 popup now").
- `zwChoose` (Time Out, Duplighosts, Jr. Troopa, Hallway, Final Bowser T1-T4): the rule on a chosen window kind too
  (it was on "best" only). fb14 / dup / jr / hw go through `zwChoose`; `hwHpCheck` and `mixPlan` already had it; the
  single-seed coin plan is a known seed (no shares).

## Close Call at T6 (the runner: not equipped on 906bfb29)
- `1A5830.c:192`: `player_team_is_ability_active(target, ABILITY_CLOSE_CALL) && curHP < 6` is tested before
  `rand_int(100) < 30`, so **without the badge there is no draw** (and no dodge).
- The outcomes cannot tell "no badge" from "badge, roll 30+": both are a hit, and the hit branch after the test (animation,
  T7 menu frames) is not modelled; the page reads only the HP tens digit (blank at Danger). So: the T7 states stay the dodge
  branch, and **the other 1 - pLucky is background** in `fb2Prune` (906bfb29: 87%): the coin must show the dodge branch
  before a T7 beep. And the route says it: T1 "(equip Close Call before the fight: T6 needs it)", T6 "(Close Call equipped)".

## T6 timing (906bfb29)
Trigger 209.123 s (confirm + 16); the rays end at +60 (210.594); maps 210.907 (313 ms); `fb14T6Cands` 882; the popup closed
on k 77 (211.211, the earliest); the narrow took 608 ms (211.513), `fb2Lock` 211.526 = **k ~88**. The popup window is
k 77-136 (to 213.13 s); with the 3 beeps (0.6 s) and lead the first beepable k is ~112: **24 frames of window left** when the
runner holds the popup. The step now says "HOLD the +3 popup — WAIT for the beep". The narrow was not made faster.

## Tests
New `test_console_v95.js` (in `run_suite.sh`): the streams, the Cloud Nine outcomes and the excluded band, the Do Nothing
likelihood, the T1 replay (seed, stream prior, the v95 plan not 97.6%, the anchor read after the maps), the T7 / popup edge
rule (live: "No edge, press normally", no plan), the dodge-branch background, the route texts, zwChoose. Version checks to v95.

## Not done
- Cloud Nine's offset not pinned (above); the T1 plans stay conservative until it is.
- The T6 narrow (608 ms on 882 candidates) not sped up; the hit branch of T6 -> T7 not modelled.
# Time Out Timer v94: the true press timing from the in-game input display, the Final Bowser lever readings, the fb1 clock anchor (Nov 12)

Method: every clip of 11-09, 11-10 and 11-12 decoded frame by frame (60 fps): the overlay's A (top left), the practice ROM's
own A (bottom, drawn by the game), the HUD bar and the Strategies panel, synced to the logs by the bar hides (every hide at
one offset: b75b56e2 page = clip(19-28-16) + 1688355.5 ms, 4bc65351 = clip(20-17-50) + 1831550.3, 4080354f = clip(19-57-21)
+ 601938.3, the v90 / v93 offsets for the rest). No picture is committed (`fixtures/console_v94.json` holds numbers only).
The emulator was not run.

## 1. Which clips show both displays
| clips | displays |
|---|---|
| 11-09 19-14-36, 19-17-03, 19-25-22, 19-28-16, 19-50-01, 19-57-21, 19-59-56, 20-11-18, 20-17-50 | **both** (practice ROM) |
| 11-10 15-40-48 (8cc2055f) | in-game only (practice ROM) |
| 11-12 04-35-03, 04-38-17 | overlay only |
| the other 16 | neither |

**The display offset:** the in-game A shows **8 vblanks after the overlay's** (67 isolated presses: median 8, mean 8.1, sd
1.6, range 5-13); the release the same. The overlay is the earlier one (USB adapter straight to the capture; the game's
picture goes through the N64's frame pipeline). The in-game A moves in whole game frames (even vblank steps).

## 2. The true press against each reading (in-game display, vblanks)
| from the in-game A to | vblanks | n |
|---|---|---|
| the Strategies panel close (the page's grey read), Final Bowser T2 / T3 / T4, Duplighosts, Jr. Troopa T5 | **2** | 8 of 8 |
| a Charge's bar hide (every fight) | 4 | 29 |
| Cloud Nine's bar hide | 6, 7, 6 | 3 |
| Jr. Troopa's target-screen closes (Bomb / Syrup) | 8 | 5 |
So the panel read is the same game frame on Final Bowser as on Jr. Troopa / Duplighosts, where v90's STRAT_VAN 2.2 fits the
outcomes; Cloud Nine's bar comes **2.25 frames later** after the same press than the panel does (the page took both as
"confirm + 2"). The Jr. Troopa / Bomb / Syrup / Hallway readings are not touched.
**The practice ROM:** the 11-09 clips are on it (its display), 11-10 15-40-48 too; the Nov 12 clips show no in-game display.
Overlay -> event on Nov 12 against the 11-09 Final Bowser clips: Charge hide 12.6 vs 13.4, panel close 9.8 vs 9.0, Cloud
Nine hide 13 vs 14 vblanks (within the overlay's own spread); the frame time from the coin shines on 11-09 33.4286 ms against
the page's 33.427. No extra lag measured from the ROM.

## 3. Clock vs reading (Nov 12, both attempts)
The page's frame 0 against the burst in the clip (the first vblank at the burst's 61 level): 17.0 frames on 00700c7e T2,
a87486a0 T1 and T2, **18.0 on a87486a0 T4**. The page's own capture says the same: T4's trigger picture reads +6.2 above the
base where frame 3 reads +9.8 (median of 26 console fb1 captures), and its level curve is the others' one picture later.
**T4's clock was a frame early** (its trigger picture was the burst's frame 2, taken as frame 3; `trigN` only catches late
ones). Fitted on all 31 console fb1 captures (the new pictures -1.5 .. +3.5 frames around the trigger, against that median
curve): a87486a0 T4 -0.65 and 1de38253 T2 -0.9; the other 29 within -0.45 .. +0.45.
With T4's frame moved, **one offset fits all four Do Nothing outcomes**: true = v92 reading + **3.26 .. 3.51** (00700c7e T2
3.04-4.03, T3 3.26-4.25, a87486a0 T2 not 0.53-1.53, T4 now 1.52-3.51). On the trigger picture's clock nothing fits (v93).
Which part is clock and which reading the outcomes cannot split (the in-game display says the panel is read on the same
frame as Jr. Troopa's, so the Final Bowser constant is the clock / model side of the fb1 anchor), but the beeps settle what
matters: the runner's overlay A came 2.2 / 2.9 / 3.7 / 3.7 frames after the beep's press time on 00700c7e T2 / T3 and
a87486a0 T2 / T4, and on the beep he landed on the planned frame (attempt 1, both won); attempt 2 he pressed ~1 frame later
(T2 read +2.4 on the new reading: Bowser hit; T4 +1.4 in a 2-frame window: Bowser missed). **The beeps are right; the
reading was 3.4 frames short.** Cloud Nine: 3.4 - 2.25 = +1.15 (00700c7e T1 then reads 344.70 on a 345 window, an 80% plan
that Bowser hit; a87486a0 T1 210.09 outside 207-208). 54c12cf2 T2 (897.86, window 896, hit) fits too.

## Fixes
1. **The Final Bowser lever readings** (`fb14_live.js` `FB14_READX`): a Do Nothing confirm reads 3.4 frames later, Cloud Nine
   by its bar 1.15 (a Mario target screen as before), in the confirm, the late (pending) confirm and the replay onto a later
   lock (`fb14Van`). The Do Nothing shifts are recentred, -3 .. +3 peaking at 0 (v93: -2 .. +5 peaking at +3 / +4).
2. **The fb1 clock on the burst's frame 3** (`fb14TrigPhase`, `fb14TrigT`; `fb14Refine1` and the narrowed read): the capture's
   new pictures are fitted against the console curve; at -0.5 or below the anchor moves a frame later (+0.5 and up: earlier).
   Logged as `fb14TrigPhase`. The Charge read's own placement is not changed.
3. The beeps (`fbPressT`), STRAT_VAN 2.2 (Jr. Troopa / Duplighosts), the Hallway and the fb2 (T6) clock are unchanged.

## Tests
New `test_console_v94.js` (in `run_suite.sh`): the display offset, the in-game delays, the practice-ROM comparison, the outcome
table with and without T4's frame (3.26 .. 3.51, none on v93's clock), the four Do Nothing and two Cloud Nine readings on the
page, the beeps unmoved, the phase fit on all 31 fb1 captures and the live anchor on a87486a0 T4's, Jr. Troopa / Duplighosts
vanish 2.2. Changed: `test_console_1112.js` 3 (7 shifts), version checks to v94. Run on v94: test_console_v94, _1107, _1108,
_1108b, _1109_fb, _1110, _1110b, _1112, test_fb14_model / _ai / _v86 / _chain / _v87 / _v92 / _plan, test_press_lever,
test_jr_v87 / _plan / _restart, test_dup_plan, test_hw_hp, test_lock_badge, test_nb_route, test_nb_cc_page: all pass.

## Not done
- The offset is fitted on four Final Bowser outcomes (2 wins, 1 hit, 1 guard) and the fit is 0.25 frame wide; a session on
  v94 checks it (the `fb14Confirm` err against the beeps should now sit near the runner's own -0.6 .. +1).
- Why the fb1 clock is 3.4 frames off the model while Jr. Troopa's is not (the same Charge, the same trigger frame) is not
  found: the emulator was not run on a console-like capture. The T6 popup seen at k 75 (emulator's earliest 77) points the
  same way on the fb2 clock, which v94 does not touch.
- The 11-10 evening clips (no display) were not read; their logs' plans were replans (err -43 .. -91), no constraint.
# Time Out Timer v93: the Final Bowser Do Nothing reading on console, the T4 carry, T6's own step (Nov 12)

Console logs of 2026-11-12 (page v92): 00700c7e (attempt 1, clip 04-35-03, page = clip + 57.013 s) and a87486a0 (holds it, then
attempt 2 with T6; clip 04-38-17, page = clip + 250.296 s), synced by every HUD bar showing. No picture is committed
(`fixtures/console_1112.json` holds numbers only). The emulator was not run for this version (see "Not done").

## What happened
| attempt / turn | plan | read (err) | outcome |
|---|---|---|---|
| 1 T1 Cloud Nine | 345, 1 frame, pp 0.805, doubt 0.29 | 343.55 (-1.45), bar | hit |
| 1 T2 Do Nothing | 206, 1 frame, pp 0.90 (stream lock 2.5) | 202.46 (-3.54) | **missed** |
| 1 T3 Do Nothing | 632, 1 frame, pp 0.96 (carried) | 628.24 (-3.76) | **missed** |
| 1 T4 | none: carried check 16 of 1388, all 16 ruled out by the coin (`fb14AllOut` h 930), `fb14CarryGone` | - | runner confirmed blind |
| 2 T1 Cloud Nine | 207-208, pp 0.77, doubt 0.05 (stream lock 2.27) | 208.94 (+0.94), bar: outside the window | hit |
| 2 T2 Do Nothing | 200, 1 frame, pp 0.95 (stream lock 2.6) | 198.97 (-1.03) | hit |
| 2 T4 Do Nothing | 197-198, pp 0.92 (stream lock 3.04) | 195.98 (-1.02) | the wave came, Mario guarded ("Nice"), HP 10/10: missed |
| 2 T6 | the T6 Charge locked on the carried candidates (1768, ratio 4.15) 2.17 s after the trigger | popup closed on k 75, 0.14 s **before** the lock | no popup beep |

- **The locks are true.** 755a3f96 (1 T1, fresh 2.46) -> cf2a8425 (1 T2) 2747 steps -> b3d77d29 (1 T4, narrowed) 1772 ->
  8c117f00 (2 T1) 12807; every later lock of attempt 2 on the stream. So **T1's hit (attempt 1) was not a wrong seed**: an 80%
  plan on a one-frame window, the press read 1.45 early (and see below: the console reading is not in step with the model).
- **The Do Nothing readings.** The clip: the A on the input display -> the Strategies panel faint 7, grey 9, gone 11 vblanks
  later on both T2 and T3 (Jr. Troopa's clips: the same 7 / 9 / 11), and the page closes the panel on the grey picture as in
  Jr. Troopa, where STRAT_VAN 2.2 fits the outcomes. Cloud Nine's bar hides 11 vblanks after its A. In the emulator (v87 e2e
  9e3779b9) the page read the harness's confirms 0.03 / 0.25 / 0.2 frame late. So the panel reading itself is the same as
  Jr. Troopa's; what is off is the reading against the frames the model planned (the console Charge clock, or the model).
  The offsets x (true = reading + x) each outcome allows on the plans' windows: 1 T2 3.04..4.03, 1 T3 3.26..4.25, 2 T2 not
  0.53..1.53, 2 T4 0.52..2.51. **No constant x fits all four** (attempt 1 says ~3.6, attempt 2 says 0.5-2.5), so the offset is
  not pinned and v93 does not move the reading or the beeps. The runner's errors against the beeps (-3.5, -3.8, -1.0, -1.0) do
  not tell which side is off either (on Jr. Troopa he is -0.6). Also the T6 popup was seen on k 75 where the emulator's
  earliest is 77: the console Charge clocks may run ~2 frames late, the same sign as attempt 1's x.
- **The learned lever correction was live:** the runner's browser held the four presses -3.54, -3.76, -1.03, -1.02 (v90 store),
  n = 4, so from 2 T4's press on the beeps came **1.17 frames later**, away from the presses that won.
- **T4 (attempt 1): why the carry died (most likely; not replayed).** The T2 and T3 Do Nothings went into the states on -2..+2 of the readings; the frames
  the outcomes need (+3..+4) were not there, so the true state carried only the 1% "missed while the model says hit" weight
  twice and was cut by the cap (12000). The T4 rays then matched 16 wrong states, the coin ruled them all out at once, and
  `fb14CarryGone` ended it with no fresh lock: the narrowed read had locked (the T4 seed is on the T2 lock's stream, 1772 steps).
- **Attempt 2 T1's second plan** (target 273 at 259.67 s): the plan's beeps had played; the page's plan loop asked again 0.34 s
  after the bar hid on Cloud Nine's confirm and 0.03 s before that hide was taken as the confirm.
- **T6: no beep.** v92's route went from T4's Do Nothing to the T7 Power Bounce step, whose pre held the T6 Charge; nothing
  told the runner to hold the +3 popup, and he closed it at once (k 75). The read itself worked (the carried T6 candidates).

## Fixes
1. **No learned Final Bowser correction** (`page_template.html` `LEVER_LEARN`): the presses are kept in a new store
   (`tot-fb14press-v93`; the v90 store with its +1.17 is not read) and the correction is 0 until the readings are verified
   against outcomes. The beeps are on v85's frame again.
2. **The Do Nothing confirm goes into the carried states on -2 .. +5** of the reading (`FB14_SHIFTS_S`, weights peaking at
   +3 / +4; Cloud Nine and the Charges as before), so the true state stays in the carry whichever offset holds; the coin and
   the outcome (`fb14Missed`) pick it.
3. **A carry the coin already rules out is no carry** (`fb14CarryWeak`): the lock goes on as a fresh one on the same rays (the
   narrowed read's refine fetches the whole fit list on the last lock's stream; the menu coin dropped if no fit survives it,
   v92), with the turn's inputs replayed. T4 always ends in a plan or a logged "No edge" (the v91 watchdog).
4. **No plan while the bar is gone on a lever step** (`fb14PlanHeld`, 1.2 s): a confirm being read.
5. **T6 has its own route step** (`turn: 'fb2_k'`, the T6 Charge as its pre, read with the fb2 profile): after T4's Do Nothing
   the route is on "Super Charge, then HOLD its +3 popup: close it on the beep"; the popup closing moves it to T7's Power Bounce
   (`fb2StepByPopup`). The new-attempt and arena rules take the T6 step like the T7 one.

## Tests
New `test_console_1112.js` (in `run_suite.sh`): the outcome table (no constant offset; every outcome inside -2..+5; v92's
-2..+2 left out attempt 1's wins), the streams, the v90 store not read and new presses moving nothing, the 8 Do Nothing shifts
(Cloud Nine still 5), the plan held after the hide, T6's step (order, fb2 profile, the hold message, the popup -> T7).
Changed: `test_press_lever.js` 3 and `test_fb14_v86.js` 5 (the Final Bowser lever learns nothing), version checks to v93.

## Not done
- **The offset is not pinned.** It needs the model's per-frame shares around each press (replaying the T2 / T3 / T4 locks
  into states) and an emulator run that reads a console-like capture (fb14_e2e.py with the runner pressing off the planned
  frame by known amounts). Until then the beeps are where v92 put them without the learned correction.
- The FB2 read fixes asked for (v88 / v89's vblank placement, centre, +-1 whole-shift re-reads and the stream prior on the fb2
  profile) are not made: the T6 read of a87486a0 locked on the carried candidates (ratio 4.15); the noise reads of a53781d5 /
  4bc65351 were not replayed. The stream window after the T4 lock would need ~10000+ steps for T5 alone (FB14_T5).
- The T6 -> T7 flow was not run end to end in the emulator; whether the lock comes early enough for a beep inside the popup
  window (k 77-136) when the runner holds the popup is untested on console (a87486a0: lock at about k 83).
# Time Out Timer v92: Final Bowser end to end with the runner's timing, retries, the carried read made fast (Nov 11)

The page tested end to end in the emulator (JP, Ultra Final Bowser phase 2 T1-T4, Mario at 10 HP with the Jelly and a Life
Shroom, GUARD=1, VCLOCK=1, one job at a time on an idle machine) as a stand-in for the runner. `fb2_route/fb14_e2e.py`
gained the runner's timing, retries and forced hits; every bug found is fixed with a test (`test_fb14_v92.js`, in
`run_suite.sh`). No picture is committed.

## The harness (`fb2_route/fb14_e2e.py`)
- **RUNNER=runner**: the confirm on the beeps when the plan is up within DL = 5.5 s of the Charge's bar hide (or before
  the partner's screen is up at all: T3's Jelly), else at 5.5 s unplanned (the console clips: 5.2-5.9 s with no beep).
  **RUNNER=patient**: up to 12 s for the beeps, or 0.5 s after a "No edge". A plan made before the turn's Charge, or
  cancelled by a "No edge" before its target, is not followed. FAST=1: the "+3" popup closed at 78-86 so the partner's
  screen is up ~5.5 s after the hide (faster menu inputs were eaten by the game: the hand stayed on the first move).
- **ATTEMPTS / ATT_TURNS / GAP**: an attempt abandoned after its turns, a gap of 40-80 s with no HUD bar on the screen
  while the game runs on in the battle, then the phase-2 start state with the seed the game had at the gap's end
  (DIAGNOSTIC write). **FORCE_HIT=a.t**: that turn's confirm on the nearest frame where Bowser hits. **FINAL=1**: one
  more page run over everything (the last turn's Bowser turn). Per-attempt render names.
- Screens grabbed in-process (PIL, 0.02 s a picture, the same pixels as ImageMagick's 0.23 s `import`).

## What the console retry is
The clips (fb1844, fb1851, fb1856, fb1905, fb1907) each start at the phase-2 T1 menu (HP 10/10, FP 15/15, the Life
Shroom and Jelly back) and end inside the fight; the retry itself is never on a clip. The logs show what happens between:
Mario's death (B: after T3's Jelly, no Life Shroom left), then 44-76 s with no HUD bar and no coin shine at all, then the
phase-2 menu again. A savestate would put the RNG back; the stream runs on across every retry at 75-89 LCG steps a second
(v91), the in-battle rate. So the battle is restarted in game (the runner's practice setup), not loaded: the harness keeps
the emulator running through the gap and writes the seed it reached into the reloaded phase-2 state.

## Bugs found and fixed (each with a check in `test_fb14_v92.js` unless named)
1. **T1 mis-tracked by the action wheel** (5eed0fb2): the saved Mario screen matched Mario's and Lakilester's action wheels
   (score 0.915 against 0.92 with the hysteresis), its "close" (a submenu opening) moved the route to Cloud Nine before the
   Charge; the Charge's own screen then closed 0.06 s after the burst and was taken as Cloud Nine's confirm; the route went
   to T2 and T1's lock was read as T2's (the v91 "the runner moved the route" rule took the page's own move). Now a cat M
   Final Bowser close counts only with the status bar hiding (`fb14CloseNoHide`; Do Nothing leaves the bar up, so cat S
   is exempt: a first version dropped T2's Do Nothing confirm), a lever close within 2.5 s of its turn's burst is the
   Charge's own (`fb14OwnClose`), and a lock takes the route's turn only after the runner's own click (`userStep`).
2. **No T2 plan after T1's hit** (5eed0fb2): the stream lock's fresh fits took the Life Shroom revive's shines into the
   menu-coin window (the bar up 18 s) and all died (`fb14AllOut`). Rebuilt without the menu coin (`fb14MenuCoinDropped`).
3. **Beeps before the turn's Charge** (5eed0fb2: T2's Do Nothing at 95% during Bowser's T1 attack; T3 before its Jelly):
   no plan until the turn's Charge / Jelly is seen (`fb14WaitCharge`), the watchdog counts that wait as a decision (it
   logged false `fb14NoDecision` on T3).
4. **T4's wave hit never read** (5eed0fb2 attempt 2): the T4 lock landed after T4's confirm and cleared T3's hit with a new
   HP watch that never saw the 10 HP before an open turn: no "Route off", the Peach Beam taken. The watch keeps what it saw.
5. Harness: renders of a retry overwrote the earlier attempt's (the page could not decode its reference screen); stdin of
   the queue eaten by the jobs; the runner's press frame (see "Not done").

## Speed (the carried T2 / T4 read)
v91 (log D T2, console): trigger -> maps 1.76 s, carried candidates 0.37 s, narrowed read 3.0 s (replayed here 4.3-4.8 s,
the structured fits 4.0-4.7 s of it), `fb14Held` + `fb14Check` 1.6 s, plan 0.1 s: 6.6 s. v92:
- the narrowed read sends only the fits' end seeds (fb1h `light`; the full list is fetched by the refine when no carried
  state matches): D T2 replayed 1.1-1.2 s (fits 0.6-0.8 s), adce13ad as before;
- the carried candidates are built in slices during the burst (`fb14PreCands`), the held states are only those whose
  stream drew the locked rays (D-like T2: 4594 of 52950; `fb14HeldVerify` found the same matches as on all of them);
- a stream lock skips the +-1 placement re-read (T2 after a hit, replay: trigger -> plan 9.1 s -> 6.1 s).
In the emulator runs (loaded page, the feed running): carried T2 / T4 trigger -> candidates 1.8-2.4 s, -> lock 3.9-4.7 s,
-> plan 4.2-5.1 s, i.e. 4.7-5.6 s after the bar hide (the narrowed read 2.8 s there, its worker start 0.9 s of it). Not yet
the 3-4 s asked; the stream path (T1 of a retry, T2 after a hit) plans 6-7 s after the hide, after the runner's 5.5 s.

## End to end (RUNNER=runner, DL 5.5 s; GUARD=1, MARIO_HP=10)
Lock / plan times from the bar hide. "miss" = Bowser missed (T4: the wave came and missed) with the confirm one frame
early / on the press / one late.
| run | seed | turn | lock s | plan s | planned | beep < 5.5 s | press s | miss -1 / 0 / +1 |
|---|---|---|---|---|---|---|---|---|
| r_9e | 9e3779b9 | a1 T1 | 10.13 | 13.61 | no | no | 5.87 | n / n / Y |
| r_9e | 9e3779b9 | a1 T2 | 7.58 | 7.73 | no | no | 5.51 | Y / Y / n |
| r_9e | 9e3779b9 | a1 T3 | None | - | yes | no | 8.31 | n / Y / Y |
| r_9e | 9e3779b9 | a1 T4 | 5.21 | 5.63 | no | no | 5.51 | n / n / n |
| r_12 | 1234abcd | a1 T1 | 6.98 | 9.86 | no | no | 5.74 | n / n / Y |
| r_12 | 1234abcd | a1 T2 | 7.16 | 7.55 | no | no | 5.51 | Y / n / n |
| r_12 | 1234abcd | a1 T3 | None | - | no | no | 22.02 | n / n / n |
| r_2b | 2b7e1516 | a1 T1 | 10.56 | 14.63 | no | no | 5.84 | Y / Y / n |
| r_2b | 2b7e1516 | a1 T2 | 5.66 | 10.81 | no | no | 5.51 | n / n / n |
| r_2b | 2b7e1516 | a1 T3 | None | - | no | no | 7.14 | Y / Y / n |
| r_2b | 2b7e1516 | a1 T4 | None | - | no | no | 5.51 | n / Y / Y |
| r_0b | 0badc0de | a1 T1 | 8.1 | 11.13 | no | no | 5.94 | n / n / n |
| r_0b | 0badc0de | a1 T2 | None | - | no | no | 22.02 | Y / Y / Y |
| r_0b | 0badc0de | a1 T3 | None | - | no | no | 5.97 | Y / Y / n |
| r_0b | 0badc0de | a1 T4 | None | - | no | no | 22.02 | n / n / n |
| retry2 | 5eed0fb2 | a1 T1 (forced hit) | 8.91 | 12.3 | no | no | 5.67 | Y / n / Y |
| retry2 | 5eed0fb2 | a1 T2 | 7.58 | 7.65 | no | no | 5.51 | Y / n / n |
| retry2 | 5eed0fb2 | a2 T1 | 6.18 | 6.53 | no | no | 5.77 | Y / Y / n |
| retry2 | 5eed0fb2 | a2 T2 | 5.18 | 5.26 | yes | no | 6.84 | n / n / Y |
| retry2 | 5eed0fb2 | a2 T3 | None | - | no | no | 7.14 | Y / Y / Y |
| retry2 | 5eed0fb2 | a2 T4 (forced hit) | 7.65 | - | no | no | 5.51 | n / n / n |

Patient runner (12 s), 1234abcd (run alongside another job, timing loaded): T1 lock 6.7 s, plan 9.4 s, planned, missed (+-1
hit); T2 carried, plan 5.6 s, planned, missed +-1; T3 / T4 had no plan (the part-2 rule dropped T2's Do Nothing confirm,
since fixed).

Retries (5eed0fb2, attempt 1 T1 forced hit, gap 75 s, attempt 2): the new attempt was found ("bar gone"), the route went to
T1, attempt 2's T1 locked on the stream window after attempt 1's T2 lock, T2 locked carried and planned at 5.3 s.

## Not done
- **13579bdf and the patient runs were not completed** (time); the patient model ran once, before the Do Nothing fix.
- The press frame of the runner runs: r_9e, r_12, r_2b, r_0b and retry2 pressed planned beeps on the beep's time
  (`tPress`), which is ~2 frames ahead of the frame the page plans (retry2 a2 T2: planned 99.9%, pressed 2 frames
  early, hit; +1 missed). The harness now presses on the planned frame from the right clock origin; those rows' planned
  outcomes are not the page's. Unplanned rows are unaffected.
- 2b7e1516 T2 (carried lock 5.7 s, plan 10.8 s) and T3 / T4 (no lock), 0badc0de T2 / T4 (no lock after T1's hit) are not
  analysed. The carried read at 3-4 s from the hide is not reached in the emulator.
# Time Out Timer v91: Final Bowser retries, the silent "hit", the stream across attempts, the replan race (Nov 10 evening)

Console logs of 2026-11-10 evening (page v90): A 032af46e (clip 18-42-33), B a53781d5 (18-44-28; holds A), C 28b4ae32
(18-51-42), D 8576a774 (18-56-41), E fbf04824 (19-05-11), F 1de38253 (19-07-52). Each log holds the ones before it. Clips
synced by the HUD bar's showings (A page = clip + 141.94 s, B + 257.009, C + 690.77, every showing within 10 ms). No picture
is committed (`fixtures/console_1110b.json` holds numbers only). The emulator was not run for this version.

## What happened (the clips)
- **The runner retried phase 2 again and again, and the page never saw a new attempt.** FP tells the turns apart on the
  HUD (Super Charge and Cloud Nine 4 FP each: 15 -> 11 -> 7 -> 3). A: attempt 1 (T1 Charge 70.3 s, Cloud Nine 77.6, hit) ended
  with the bar gone 45 s; attempt 2's T1 Charge (144.6 s, FP 15) was taken as T2 (the route was on T1's Cloud Nine; v90's
  new-attempt rule needs 120 s between Charges), the runner clicked T1 (153.4 s), Cloud Nine 150.0, Bowser's claw for 15:
  Mario died, Life Shroom. T2: Charge 176.1 s (taken as **T4**: the burst rule jumped from T2's step), Do Nothing 184.2,
  fire breath, Mario at 0 again; T3 Jelly 214.1. B: attempt 3 starts at 258.1 s (FP 15/15, bar gone 44 s): T1 Charge 259.8,
  Cloud Nine 265.06 (clip 8.05 s; the page saw the hide at 266.13), hit, Life Shroom; T2 Charge 291.4, Do Nothing 298.9; T3
  Jelly; T4 Charge ~320, Do Nothing 326.3, **the wave hit Mario (HP 6)**, then a second Charge (332.1, taken as the Peach
  Beam), death, Life Shroom, the Peach Beam: "got hit by wave and continued anyways". C: T1 Charge at 693.0 read with the T6
  profile (the route was still on T7 from the last attempt; bar gone 75.7 s before), Cloud Nine 698.2, claw, death; the
  runner clicked T1 (701.0); the T2 Charge (724.6, FP 7 -> 3) was taken as T1, the runner clicked T2 after the lock (729.4).
  D: the runner confirms Cloud Nine 5.2-5.9 s after the Charge's bar hide in every clip (A 5.9, B 5.7, C 5.7, D 5.25).
- **The locks are true.** One RNG stream: d381a138 -> 3452fd2f 2443 steps (A, T1 -> T2), -> 7a74319c 7409 (across the retry
  to attempt 3), -> d51d0cda 2442; 53fdf26f -> 80dbfc2c 3745 (C), -> ac4bf7b0 15516 (across the retry to D), -> adce13ad 1365,
  -> c1e8c368 3315. The game's RNG runs on across a retry at 75-89 steps a second. **5aad8f13 -> d381a138 is not on one stream**
  (2.1e9 steps); 5aad8f13 (A attempt 1, 6782 / 2.37 at the -1 shift, placement 6782 against 4216 / 4834) has no second read
  in its attempt to confirm it, so which side broke (a wrong lock, or a stream reset between attempts 1 and 2) is not
  decided; d381a138 is confirmed by four later locks.

## Root causes and fixes (`charge_live/fb14_live.js` unless named)
1. **No plan after a lock (B T2, E T2, F T2 / T3 / T4, D T4): an earlier hit, never cleared.** `fb14HpWatch` sets FB14.hit on
   a hit, and every later fb14Plan returned "hit" without a log line; only `fb14Reset` cleared it, and no attempt reset ran
   (cause 2). Stream and carried locks were hit alike (the common gate). Now any lock clears a T1-T3 hit (`fb14HitCleared`:
   a lock after the Life Shroom revive is this fight's seed), the "hit" no-edge is logged once, and a watchdog logs
   `fb14NoDecision` and plans when a lock has neither a plan nor a logged no-edge 0.5 s after the partner's menu can be up.
2. **Attempts.** The bar comes back after FB14_GAPNEW 35 s gone on a Final Bowser step (between attempts 44-76 s; in a fight
   at most 9.4 s in these clips, ~25 s with a revive) = a new attempt (`fb14NewAttempt` why "bar gone"): the route to T1's
   Charge (the reader arms with the T1 profile, C's 693 s read), the attempt's confirms, hit and clock dropped. The runner
   setting T1's Charge from a later turn is a new attempt too (B 249.3 s); a read in flight then is T1's (A 153.4 s), and a T1
   lock on the Charge step moves to Cloud Nine's step. The RNG stream is kept across attempts (only a boots change drops it).
3. **Turn tracking.** A Charge on T2's step with no T2 confirm and no Jelly since T2's burst stays T2 (`fb14BurstSameTurn`;
   A 176.1 s went to T4). The lock takes the turn the runner set while the rays were read. After T4: the HP watch covers T4;
   a hit there puts the route off ("Route off: T4's wave hit Mario ... no Final Bowser lever from this attempt"), no Peach
   Beam is taken from a later bar hide and no T1-T4 lever is planned. The turns are not tracked further (the route is off);
   the next attempt's T1 Charge starts again.
4. **The Cloud Nine confirm lost to the lock (B 266.1 s).** The stale pT[1] of the old attempt blocked `fb14CloudNineByBar`
   (cause 2). And the lock's work held the thread 1.5 s, so the hide was seen 1.07 s late: a hide seen after a gap between
   pictures now spreads its confirm shifts back over the gap (`fb14GapShifts`, at most 40 frames). Confirms seen before the
   lock were already queued (`fb14ConfirmBeforeLock`, applied by `fb14Lock`).
5. **The stream window scales** (`fbStreamHi`): 1.3 x 100 steps a second since the kept lock + 2500, at least 9000, at most
   30000 (beyond, ~3.5 min: the full search). It reaches every pair above (C -> D 15516 in 207.8 s: window 29776; v90's 9000
   missed it and the runner's click had dropped the stream, so D's T1 waited 8.1 s on the full search; on the window it locks
   in 3.2 s). The window tries as placed and -1 only (none of 14 console fb1 reads was +1): 2 s less when it misses.
   **False locks on the widest window:** 14 wrong windows of 30000 seeds over the session's 7 fb1 reads (each as placed and
   -1): 0 locks, best ratio 1.16 (the lock needs 1.5). A's attempt-2 T1 on the window after 5aad8f13: no lock (1.04).
6. **Hysteresis (C T2: 13 s at doubt 0.47-0.78, three plans and three cancels).** After "No edge" a plan needs the doubt
   under 0.40; a running plan holds to 0.55; one steady "No edge yet" message (no percentage), logged on change.
   C's lock was true (80dbfc2c on its stream 3745 steps later), so the doubt came from the weighting, not a wrong seed:
   the fresh T2 states (the runner's click came after the lock, which built them as T1's) carry no T1 attack history
   (`fbVars`: Bowser's claw on T1 unknown), and T1's real Cloud Nine and death are not in them. Not fixed (below).
7. **The replan race (E 1510.8 s, F 1671.8 s).** A press is measured against the plan that was up at the press
   (`FB14.plans`; F's Cloud Nine landed on the first plan's 237, logged -63 against the 300 replan); no replan or cancel while
   the bar has been gone under 0.6 s (a confirm being read); no plan once the turn's confirm is in (`fb14PlanAfterConfirm`).
8. **The wait.** The Final Bowser "WAIT, searching…" was headed "Check your taps": now the headline reads "WAIT: reading the
   seed, no beeps yet" on red. The stream lock's status says "locked on the RNG stream, n steps after the last lock".
9. **Speed (D T2, carried: trigger -> plan 6.6 s).** Measured: maps 1.76 s after the trigger, carried candidates 0.37 s, the
   narrowed read 3.0 s (20 candidates; replayed here 4.5-4.8 s), `fb14Held` + `fb14Check` 1.6 s, plan 0.1 s. v91 stops cloning
   the 60000 held states a second time in the check and logs the lock's own ms (`fb14Lock` ms.check / ms.build). The
   narrowed read itself is not faster (below).

## Tests
New `test_console_1110b.js` (in `run_suite.sh`): the streams and the window; the gap shifts; attempts by the bar gap
(three retries, the T7 step) and not by in-fight gaps; the clicks; A's T2 burst; the hit logged, route off after T4, the
hysteresis, the WAIT headline; E / F's press against the plan up at the press, no plan after the confirm, the watchdog;
with the logs, the stream replays (B attempt 3 T1, D T1 across the retry, D T2), A's wrong window, 14 wrong 30000-seed
windows, D T2's narrowed read. Version checks to v91.

## Not done
- C's T2 doubt: the fresh states of a turn after an unread one lack its attack history and inputs; a fresh lock on T2-T4
  should marginalise over Bowser's earlier attacks. Not built: the hysteresis only keeps the message steady.
- The narrowed carried read (3 s for 20 candidates) and `fb14Check` (1.6 s) are not restructured: building the candidates
  during the burst and a lighter check would bring D's T2 under 3 s; only the double clone is gone.
- E T1's beep timing (the press 1-3 frames after a 243-245 window) was not checked on the clip's audio.
- Whether 5aad8f13 or the stream broke between A's attempts 1 and 2.

# Time Out Timer v90: the console session of Nov 10 (Jr. Troopa T3 / T5, the Strategies reading, Final Bowser's lever and T2 Charge, the arena back-move)

Console logs of 2026-11-10 (page v89): 86e76da9 (Duplighosts, clip 15-20-24), 1c4d37ef and f485687d (Ultra Jr. Troopa, clips
15-21-42, 15-24-19), 6f44cbbd (Hallway win), 54c12cf2 and 8cc2055f (Final Bowser, clips 15-28-30, 15-40-48). Method: the clips
frame by frame (60 fps), synced to the logs by the HUD bar's hides (every hide of a clip at one offset to the millisecond:
1c4d37ef page = clip + 1570188.5 ms, 86e76da9 + 1492455, 8cc2055f + 51380, 11-09's 4080354f + 757222); every Jr. Troopa /
Duplighost / Hallway Charge read of 11-09 and 11-10 (27) replayed through the v86.1, v87, v88 and v89 pages; the console
Strategies presses with known outcomes against the page's own model. No picture is committed (`fixtures/console_1110.json`
holds numbers only). The emulator was not run for this version (see "Not done").

## What happened (the clips)
- **1c4d37ef T3** (Bomb Close Call, plan pp 0.999, window 2): Mario died (0/10, the Life Shroom, 10/10; clip 52-60 s). The
  press read -1.55 from the bar hide, outside the window. **The runner pressed early**: the reading and the model agree
  with the death. f485687d's T3 is the same (-1.33 on a one-frame window, death). v86's two T3 Bombs read -0.25 / -0.3 and
  dodged: the same reading, the same model, a later press.
- **1c4d37ef T5** (Do Nothing, plan pp 0.965, **one-frame window 213**): Mario at 3/10 on the Strategies screen, hit for 7, the
  second Life Shroom (clip 87-96 s): a real death (the HP read was right; T4's Syrup at 10 HP had no roll, as the tracker
  assumed, and the T5 Charge locked afresh at 4.37, so neither the death nor the carry is in the T5 states). The page read
  the press at 212.6: "works" by 0.1 frame. The clip: the Strategies panel changes faintly at 85.483 s and is gone at
  85.517 s (no grey picture in between); the page closed it at 85.517. 11-09's T5 (clip 19-59-56): faint change 69.667,
  grey 69.700, gone 69.733, page close 69.699. **The page reads the same game frame on both** (2 vblanks after the faint
  change), so v87's vanish 2 is right in its frame; what is off is the fraction (below).
- **f485687d T5** (window 183-184): read 182.13, outside; death. Consistent.
- **T6** (1c4d37ef): the Power Bounce plan (pp 0.991) came 1.5 s after the T5 press, on states that had Mario dodge; its
  beeps (1660.4-1661.4 s) went out before the hit showed, and the coin went inconsistent 0.6 s after the last one (doubt
  0.61, then 1). It followed from the T5 reading (fix 1): on v90 the same press reads outside the window, on the edge.
- **The clock-shift hypothesis (v88 / v89 moving the Jr. Troopa clock) is ruled out**: all 14 Jr. Troopa reads of 11-09 /
  11-10 place the trigger picture as frame 3 (n0 3, no shift) and lock the same seed on v86.1, v87, v88 and v89 (ratios equal
  or up by 0.02-0.25 on v88); the whole-Charge shift re-reads are Final Bowser's only (fb1 `shiftWide`). The Duplighost and
  Hallway reads the same (Hallway 6f44cbbd's Time Out: +0.28 in its 5-frame window, a win).

## Root causes and fixes
1. **The Strategies-screen reading is 0.1-0.3 frame late** (`pmrng_core.js` `STRAT_VAN` 2.2 for dup3 / dup4 /
   jrcc_nothing; v87-v89: 2). Every console Do Nothing with a known outcome, against the model's window, as a function of a
   constant x added to the v89 reading:

   | press | read (v89 reading) | window | outcome | x that fits |
   |---|---|---|---|---|
   | 4080354f T5 (11-09) | 1117.77 | 1118-1119 | dodged | -0.27 .. +1.73 |
   | 1c4d37ef T5 (11-10) | 212.60 | 213 | died | below -0.10 (or +0.90 and up) |
   | f485687d T5 (11-10) | 182.13 | 183-184 | died | below +0.37 |
   | 9 Duplighost Do Nothings (11-07 / 11-09, copies counted) | | | | likelihood 4.9e-3 at -0.55..-0.15, 2.2e-3 at -0.1..+0.2, 0 below -0.6 or above +0.85 |

   Only **x = -0.27 .. -0.15** fits all of them: the reading moves 0.2 frame earlier (the grey picture shows on the vblank
   after its game frame starts). v89's reading fits all but 1c4d37ef's T5, which is exactly the press it called "works".
   The bar-read levers (Bomb, Syrup, Power Bounce, Time Out) are unchanged: their known outcomes fit as read.
2. **"works" on a fraction of a frame.** A press read within `PRESS_EDGE` (0.3 frame) of a window edge is logged and shown
   as `edge` ("on the edge of the window: the video cannot tell"), not ✓ / ✗ (`jrPress`, `measurePress`).
3. **Final Bowser's lever correction double-counted** (54c12cf2 T2: target 896, one-frame window, the beep +2.37 frames
   late from v86's two seed presses; the runner pressed 0.51 before the beep, read +1.86, Bowser hit). The seed presses
   (-2.54, -2.2) were never matched by an outcome, and the runner's presses on the same Strategies screen in Jr. Troopa /
   Duplighosts are about -0.6 against the beeps. The correction now starts at 0 in a new store (`tot-fb14press-v90`: the
   browsers holding the old presses start over), needs 4 presses on the beeps, is shrunk to n / (n + 4) of the mean and
   moves the beeps at most 1.5 frames (`leverBias`). Final Bowser's own panel reading (FB14_VAN S 2) is left as it is
   (no Final Bowser outcome yet pins its fraction).
4. **Final Bowser T2 Charge never read** (8cc2055f; the clip: a Super Charge burst at T1 33.6 s, none at T3 (the Jelly),
   one at T4). T1's read gave no lock (4984 / 1.78; the -1 / +1 wide re-reads 2506 / 2511, noise), the Cloud Nine was read
   from the bar before any lock (pending), and the reader stayed 'nolock' on the Cloud Nine step: only a lock re-armed it
   (`fb14AfterLock`). T2's Charge hide (84.7 s, bar up 17 s) found nothing armed and the route stayed on T1 until the
   runner clicked (86.4 s and 126.3 s are clicks: no event before them). Now once a read has given up (no re-read pending)
   the reader arms again on a Final Bowser step (`fb14Frame`, `fb14ReaderRearmed` why "after a no-lock"); the burst then
   moves the route (`fb14StepByBurst`). The two `rejected` events (100.3 / 103.5 s, -4.2 / -5.3) are coin shines off the
   48 + 24k grid (Bowser's attack flashes): the shine filter working, nothing to fix. T4 locked fresh (6862 / 2.39) with
   no stream prior: there was no earlier lock to search after. **Not fixed:** why T1 read 1.78 (Mario +0.3 px, 47 frames).
5. **Duplighost back-move after a won fight** (1c4d37ef: a bar hide in the Duplighost room 15 s after their Do Nothing,
   route on Jr. Troopa T1, moved it back to Duplighosts T1; no Charge followed, the runner clicked forward). A move back
   to the Duplighosts from a later fight now waits for a whole Charge burst captured in that arena (`CHG.backTo`,
   `chgBackResolve` at the end of the capture); no burst (`chargeNotSeen`), the route stays. A click always goes.

## Not a page bug
- T3 (both logs): the runner's presses, -1.55 and -1.33 against the beeps, outside 2- and 1-frame windows. v87's "wider
  window up to 1.5 s later" made both plans (`later`), with the beeps on the chosen frame as usual.
- T5 of 1c4d37ef was a 62% plan (p 0.62 with the runner's spread; pp 0.965 is the perfect press) on a one-frame window.

## Tests
New `test_console_1110.js` (in `run_suite.sh`): the T5 outcome table on the v90 reading (and that v89's does not fit
1c4d37ef), the page reading 1c4d37ef's T5 press as 212.4 outside and on the edge, the edge rule, the held Duplighost
back-move (no burst: stays; a burst: goes), the Final Bowser correction from 0 with the old store ignored, the reader
re-armed after a no-lock (not while a re-read is pending). Changed: `test_press_lever.js` (vanish 2.2; the correction
rules), `test_fb14_v86.js` 5 (no seeded correction), `test_console_1107.js` (the back-move waits for the burst); version
checks to v90.

## Not done
- No emulator run: the post-death model was checked from the logs (the T5 lock is fresh, T4 at 10 HP has no roll), and the
  Strategies offset from the console outcomes only (3 Jr. Troopa presses and 9 Duplighost attempts; the window of fits is
  -0.27 .. -0.15).
- Final Bowser T1's 1.78 read (8cc2055f) is not analysed.
- f485687d's clip was not read frame by frame (its T3 and T5 follow from the log).

# Time Out Timer v89: the two Final Bowser noise reads, the stream prior, missing pictures (Nov 10)

Console logs of 2026-11-09 (b75b56e2, c565d268, 4bc65351), the reads v88 left as noise: b75b56e2 T1 (2829 / 1.01) and
c565d268's T2 (in log 4bc65351, 2427 / 1.02). Method: the page's own maps of each read dumped and scored natively with
`kernel.c` (the true T2 seed 8b09dfe1 from v88's stream check; per frame, per effect, per placement shift; stage 1's K-th
best), then the fixes replayed through the page. No picture is committed.

## Root cause: the whole Charge one game frame off, and stage 1 too narrow to survive it
Both reads are placed one game frame early from the trigger picture on (the picture placed on frame n is game frame
n + 1): c565d268 T2's true seed scores 4509 as placed and 5273 with every picture moved one frame (frame n gets the picture
placed on n - 1); its initial rays alone 775 -> 883. The three console locks score best as placed (2bcf1649 5161 vs 4840,
bda9033b 6235 vs 5940, d836ca08 5882 vs 5624). The pictures themselves are clean: side by side with c565d268 T1 (same
Mario offset, locks) there is no occlusion, flash or blend that differs; what both noise reads share is a capture frame
missing right after the trigger picture (none at +33 ms; 4bc65351 T1 has one at +17 / +33 too and reads on time, so it is
not a sure sign), and the trigger's level does not tell frame 3 from 4 (d0 8.7 / 9.1 against the locks' 8.7-9.3).
v88 did retry the read one frame off, but stage 1 keeps a seed only if its *initial* rays (frames 0-21, faint under the
alpha ramp) rank in the top 16384 of 2^32 for one of the two effects, and the true seed's did not even at the right shift
(A 396 against the K-th 403, B 487 against 589). At K 65536 (K-th 376 / 558) it passes and ranks within the first 700 of
the joint list; stage 2 then scores it 5273 against 2668 off its stream.
**Fix** (fb1 profile `shiftWide`, `CHG_K_WIDE` / `CHG_M2_WIDE`): Final Bowser's re-reads try the whole-Charge shifts
first, -1 before +1 (both off reads were -1), each with stage 1 four times wider (K 65536) and 1000 candidates to stage 2,
then v88's centre alternatives and the placement re-reads. A wide re-read takes 6-7 s; the lock comes 9-11 s after the
replay starts (the fb1 re-reads may run to 13.5 s after the rays).

## The stream prior (`fb14_live.js` fbStream*, `chgSolve`)
Every Final Bowser Charge lock of an attempt is kept (`FB14.stream`: the seed its rays start from); `fb14CarryGone` keeps
it, a new attempt / boots change resets it, and it expires after 8 minutes. A later Charge's seed must lie on the RNG
stream after it: the page searches the window FBS_LO..FBS_HI = 500..9000 LCG steps after the kept seed first (whenever
there is no carried stream, or the carried search did not lock, i.e. Bowser hit and the carry is off), as placed and then
one frame either side, its candidates ranked by their initial rays (in c565d268's T2 window the true seed ranks 1st of
8500) and the best 300 scored over the whole Charge (stage 2: every part's rays, respawns and the aura draws on every
frame 3-47). A window lock needs score >= FBS_MIN 3000 and FBS_RATIO 1.5 x the best seed off its own stream (+-48 steps).
The window: T1 -> T2 was 2369 and 2376 steps in the two locked fights; a turn of the model draws ~1100-1250 per 100 frames,
and FBS_HI leaves room for T1 -> T4 when T2 / T3 were not read; Bowser's hit path (not modelled) is inside it on both fights.
A stream lock (or a full-search lock found on the window) starts at the background doubt (ZW_BG0) instead of v82's
ratio-based prior doubt: it is confirmed by an independent read. Without a kept lock nothing changes (full search, v88
thresholds). If the window does not lock, the full search runs as before.

**Trajectories.** The scorer already uses every picture and the motion between them: stage 2 scores a seed's predicted
rays on every placed picture (positions moving with each part's speed, its respawns at new angles, the aura's draws per
frame by dynamic programming), and stage 1 / the window's ranking scores each part's initial ray over the frames it flies
(v..v+8). What v89 adds is the whole-trajectory shift (a read one frame off) and the earlier lock's stream.

**The learned capture model.** From the console locks: the whole-Charge offset (2 of 5 console fb1 reads one frame
late, none early: tried first), the window (the two locked T1 -> T2 pairs) and the thresholds (wrong windows, below). The
brightness / blur model is not refitted: v88 found the console Final Bowser levels and pictures match the emulator through
the S-Video path, and the Jr. Troopa / Duplighost / Hallway locks use other profiles.

## Numbers (replays; maxAlts 3)
| read | v88 | v89 full search | v89 on the stream window |
|---|---|---|---|
| c565d268 T1 (Mario +17.1 px) | 5161 / 2.14 2bcf1649 | 5161 / 2.14 2bcf1649 (first read) | (first Charge: no window) |
| 4bc65351 T1 (2nd fight) | 6235 / 2.48 bda9033b | 6235 / 2.48 (first read) | (no window) |
| 4bc65351 T2 (2nd fight) | 5882 / 2.40 d836ca08 | 5882 / 2.40 (first read) | 5882 / 2.98, 2369 steps after bda9033b |
| 4bc65351 T2 (c565d268's fight) | 2427 / 1.02 noise | **5293 / 2.00 8b09dfe1** (re-read 1: -1, wide; 10.6 s) | **4509 / 2.13 8b09dfe1**, 2376 steps after 2bcf1649 (2.5 s) |
| b75b56e2 T1 (Mario +17.2 px) | 2829 / 1.01 noise | **6928 / 2.21 44a7ee8c** (re-read 1: -1, wide; 9.1 s) | (first Charge: no window) |
b75b56e2 T1's 44a7ee8c is not confirmed by a second read (the fight has none, and the clip ends before T2); it scores 2.3x
the best noise any other Final Bowser read reaches, at the same one-frame shift as the confirmed 8b09dfe1.
The 19 other reads of these logs (5 Duplighosts, 12 Jr. Troopa, 2 Hallway; 4bc65351 repeats c565d268's) replay to the same
seed, score and ratio on v88 and v89, attempt for attempt.

## False locks
- Stream prior, wrong windows: 125 random windows over the 5 console fb1 reads, each as placed and one frame either side
  (375 window searches): **0 locks**; best score 2851, best ratio 1.39 (never both 3000 and 1.5). The true windows: 4509 /
  2.13 and 5882 / 2.98. A window after another fight's lock (4 cases, in the test): no lock.
- Full search with the wide re-reads, negatives (each fb1 read with its pictures shuffled / reversed: the same pictures,
  levels and clock, no seed's motion): 10 searched (5 not seen: Mario not found), **0 locks** (best 948-1554 / 1.01-1.10).
- Missing data (below): 0 wrong locks in 102.
- Emulator negatives were not rerun (v88's renders were gone with the container).

## Missing pictures (the runner: "even with missing data")
Missing pictures were already unknown, not mismatches (a game frame with no picture adds nothing to any seed's score;
a covered region has no ridge). v89 fixes the placement across a gap: a run of dropped capture frames (100 ms and more)
was placed as at most 3 game frames plus frames that "ran long" (capped cost), so every picture after it sat 3+ frames
early; the placement now steps as many game frames as the vblanks say (up to 16). Measured on the console locks (4 full
search reads, 2 stream reads; random drops, contiguous gaps, an early stop; a dropped picture takes its repeats with it;
a box 200 x 150 at level 250 (flash, aura) or 60 (a shadow) on 30% of the pictures):
| missing | full search (4 reads) | stream window (2 reads) | wrong locks |
|---|---|---|---|
| 10% of the pictures, random | 12 / 12 | 6 / 6 | 0 |
| 25%, random | 8 / 12 | 6 / 6 | 0 |
| 50%, random | 9 / 12 (v88 placement: 3) | 1 / 6 | 0 |
| a gap of 6 pictures (100 ms) | 7 / 8 (v88 placement: 3) | 4 / 4 | 0 |
| a gap of 12 pictures (200 ms) | 2 / 8 (1) | 4 / 4 (2) | 0 |
| the last 25% / 40% missing | 4 / 4, 4 / 4 | 2 / 2, 2 / 2 | 0 |
| 30% of the pictures half covered (level 250 / 60) | 4 / 4, 4 / 4 | 2 / 2, 2 / 2 | 0 |
Never a wrong lock: with too little left, no lock.

## The clock anchor (not changed)
v88 noted that a late trigger picture leaves the page's frame clock half a frame late. Not changed: the Final Bowser lever
correction (v86, kept per lever) was learned from two presses (logs C, F: -2.54, -2.2) whose reads are not in these logs,
so it cannot be re-derived on a new anchor; moving the anchor alone would shift every Final Bowser press reading by up to
half a frame against it. The whole-frame part is fixed: a shift re-read or a shifted window lock moves the trigger's
frame and the clock with it (`trig.n`, `trig.t`), as the carried-stream shifts did.

## End to end (emulator, VCLOCK=1, GUARD=1, MARIO_HP=10; `fb14_e2e.py`, idle machine)
Planned frame, the claim, and whether Bowser missed with the confirm on the planned frame / one early / one late (T4: the
wave came). The build is the T1 menu at 10 HP rebuilt after the restart (`/dev/shm/fb2r/b10_test`, Bowser HP 80).
| seed | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| 9e3779b9 | 481, 0.78: yes / yes / yes | 1396, 0.97: yes / yes / yes | 1939, 0.75: yes / yes / yes | 2523, 0.98: yes / yes / yes (the wave missed) |
| 1234abcd | 445, 0.65: yes / yes / yes | 1299, 0.75: yes / yes / yes | no plan | no plan (+1: hit) |
Every Charge locked (T2 / T4 on the carried stream). 1234abcd: right after T2's plan the coin put the carried states at
doubt 0.97 ("No edge", the carry dropped: `fb14NoEdge`, `fb14CarryGone`), so T3 had none; T4's Charge locked fresh but its
fits held no true state (`fb14Truth` 0). That is the carry's coin weighting, which v89 does not touch (the stream window
is only searched when the carried search does not lock); not compared with v88 on this rebuilt build. The harness logs
`chargeStream` / `fbStreamNote` now (`test_fb14_page.js`). Xvfb must be 800x600 (a 1280x1024 screen put the game in a
corner of every grabbed picture and the page never saw a Charge).

## Tests
`test_console_1109_fb.js`: v88's checks, plus the two former noise reads lock (44a7ee8c, 8b09dfe1), the T2 reads lock on
the window after their fight's T1 lock at 2376 / 2369 steps, four windows after another fight's lock do not, and a quarter
of c565d268 T1's pictures dropped never locks another seed. Version checks moved to v89. Run: the Final Bowser tests
(test_fb14_model / _ai / _v86 / _chain / _v87 / _plan, test_fbnb_turn / _ai), test_console_1107 / 1108 / 1108b / 1109_fb, the
charge tests (test_fix_proposal, test_zw_tolerant), test_arena_gate, test_press_lever, test_lock_badge, test_carry_page and the
version-checked tests: all pass; charge_live/test_capture_replay fails as before (a clip file it needs is not here).

## Not done
- b75b56e2 T1's lock 44a7ee8c has no second read to confirm it (its fight has no other Charge read; the clip ends before T2).
- The emulator negatives for the wide re-reads and the stream window (v88's renders are gone): the false-lock numbers are
  from the console reads (wrong windows, shuffled pictures).
- The clock anchor's half frame (above).
- A gap of 200 ms in the full search still mostly fails (2 / 8, never wrong): the initial rays are needed by stage 1.

# Time Out Timer v88: the Final Bowser Charge read on console (Nov 10)

Console logs of 2026-11-09 (b75b56e2, c565d268, 4bc65351; clips 19-28-16, 20-11-18, "fbfull/20-17-50"), five Final Bowser
fb1 reads (4bc65351 repeats c565d268's T1). Method: emulator renders of the same Charge (Final Bowser phase-2 T1 state, Mario
at 10 HP, Lakilester out, the aura, the stage lightning; `fb2_route/t14_log.py` SHOTS, seed 1234abcd) turned into page
captures with the S-Video path and fed through `chgReplay`, alone and with each console read's capture times; then the
console reads swept over the read's settings. No picture is committed (`fixtures/console_1109_fb.json` holds capture times,
levels and new-picture flags only).

## Root cause
Not the arena's levels, the aura, Lakilester, the scaling or the ray template: on console the Final Bowser pictures look
like the emulator's through the S-Video path, the burst levels match (base 83 / plateau +56 against 77 / +49), and the console
Jr. Troopa rays look the same as Final Bowser's. Two things in the read itself, both made worse by Final Bowser's looser
profile:
1. **The placement misread the console's picture clock.** In a busy scene the N64 shows a game frame one vblank late and the
   next one on time (new pictures 3 then 1 vblanks apart), and now and then a game frame runs 3 vblanks. Every console read
   of these sessions has it (Jr. Troopa's too: 17 odd gaps in 40), but Jr. Troopa's tight brightness curve (tol 1.5) holds the
   placement, while Final Bowser's (tol 4 + 0.3 x level, flat at 50-55 over frames 12-20) let the time cost take a
   late-then-on-time pair for a skipped frame: 4bc65351 T2 was placed one frame off from frame 13 on (picture 350 ms as frame
   14, 367 ms as 15; frame 13 is due at 334 ms, so 350 ms is frame 13 one vblank late). Shown with the emulator: its own
   pictures on 4bc65351 T2's capture clock (each picture the game frame due by then) read noise (2425 / 1.04 against
   6582 / 2.43 on an even clock), on c565d268 T1's 5031 / 1.97.
   **Fix** (`chgGameFrames`, `chgVbGrid`): on a clean 16.7 ms grid the placement counts vblanks, each picture on time or one
   late (a state of the DP), 2 vblanks a game frame plus one for a frame that ran long (cost 2.5), never fewer. Off the grid
   (a jittery browser) the old time cost. The emulator on 4bc65351 T2's clock then locks (5233 / 2.19).
2. **The read only finds the seed within ~0.5 world units of the rays' centre**, and the centre came from Mario's patch
   with 0.37 world units per raster px of his shift. Swept on the console reads: 4bc65351 T1 locks at dx 0 (6235 / 2.48) and
   -0.5 (4162 / 2.16), noise at +0.5; c565d268 T1 (Mario 17.1 px right) locks only at dx 6 (5162 / 2.14; 5 and 7 noise, dy +-2
   noise). The emulator shifted 17 px reads noise at the page's 6.22 and locks at 5.5-6. It is stage 1 that drops the seed:
   4bc65351 T1's true seed still scores 5255 at +0.5 when searched on its own. The projection says 17 raster px = 5.7 units.
   **Fix** (fb1 profile): `dxK: 0.35` and `cenAlts`: the re-reads try the centre 0.5 units to either side before the frame
   shifts.

## Numbers (replays of the kept reads; maxAlts 3)
| read | live (v86 / v86.1) | v87 replay | v88 |
|---|---|---|---|
| c565d268 T1 (Mario +17.1 px) | 4901 / 1.98 2bcf1649 | 4800 / 1.90 | **5161 / 2.14** 2bcf1649 |
| 4bc65351 T1 (2nd fight) | 5825 / 1.98 bda9033b | 5616 / 1.97 | **6235 / 2.48** bda9033b |
| 4bc65351 T2 (2nd fight) | 6201 / 2.45 d836ca08 | 6128 / 2.51 | 5882 / 2.40 d836ca08 |
| 4bc65351 T2 (c565d268's fight) | 2738 / 1.03 noise | 2530 / 1.03 | 2427 / 1.02 noise (see below) |
| b75b56e2 T1 (Mario +17.2 px) | 3094 / 1.05 noise | 3133 / 1.03 | 2829 / 1.01 noise |
Emulator T1 render (1234abcd): 6582 / 2.43 (an fb1 lock's ratio is 2-3: the aura's relaxed path score lifts the runner-up).
The control reads of the same logs (4 Duplighosts, 7 Jr. Troopa, 2 Hallway) replay to their live seeds at 3.5-5.8 (one Jr.
read at 1.93 as live); the placement keeps every frame they locked with (the Hallway read: 31 of 33, same lock).

**The locks are true.** 4bc65351's T1 lock bda9033b and T2 lock d836ca08 are 2369 LCG steps apart (one stream; a chance
match ~1e-6). c565d268's T2 read, searched only on the 7500 seeds after its fight's T1 lock 2bcf1649, finds 8b09dfe1 at 2376
steps (4509, 2.08 x the next; with 1500-4000 steps the same stream 19 steps earlier): 2bcf1649 is true too. The clips: on
both fights the runner confirmed Cloud Nine with no beep (F 138 / 128) and Bowser hit Mario; the locks' states give 0.50 /
0.59 miss at those frames, no prediction either way (the T1 fits keep the coin and the aura pattern open), so the outcome
neither confirms nor contradicts them. The stream check does.

## Not done
- **b75b56e2 T1 and c565d268's T2 still read noise** in the full search, at every centre (dx 4.5-7.5 / -2..2, dy -2..2), with
  the frames +-1..3, with stage 1 kept 4x wider (K 65536, 3000 to stage 2) and with the aura search relaxed (offsets to 64,
  per-frame draws to 10). The T2 seed is right there on the stream, so its initial rays rank too low for stage 1; b75b56e2's
  fight has no other Charge read to check against. Suggested next step (not built): when the carry is gone (Bowser's T1 hit
  is not modelled), search T2 on the stream 1500-4000 steps after the T1 lock first (the two fights: 2369, 2376).
- The clock anchor still takes the trigger picture as on time; on the new placement a late trigger picture puts frame 3
  half a frame late on the page's clock (not changed: the lever corrections were learned on this anchor).

## Tests
New `test_console_1109_fb.js` (in `run_suite.sh`): the placement on the five console fb1 reads and five control reads
(fixture only), the stream steps, and with the logs present the replays above. Version checks moved to v88.

# Time Out Timer v87: the Final Bowser carry rebuilt, the Strategies-screen press reading, the arena gate, Jr. Troopa's replan (Nov 10)

v87 was first written on 2026-11-09 and lost uncommitted when the cloud container restarted (`V87_RECOVERY.md` keeps that
report). This version re-applies it from those notes and re-tests it on a rebuilt emulator, plus the console sessions of
2026-11-09 (logs 1794269090764 .. 1794273591960, clips not committed). Repository: JTown2909/papermarioglitches.

## 0. The emulator after a restart
`make_states.sh` (one command) builds the normal and the debug (RNG-trace) core, harness.so, the harness dir
`/tmp/claude-0/pm/bot1` and every battle state the v84-v87 scripts use (Final Bowser phase 2 Ultra / Normal Boots, Jr.
Troopa Ultra / Normal Boots, Hallway Ultra / Normal Boots, Duplighosts), each from `../boss_battle_start_setup.py` with its
DIAGNOSTIC setup written in the script (BOOTS / FP / ITEMS / STARBEAM restored). Check: 4 new T1-T4 debug-core logs on a
rebuilt MARIO_HP=10 route build are exact against `fb14_live.js` and `t14model.py`; test_fb14_model / _ai / test_fbnb_turn pass.

## 1. Final Bowser T1 -> T4: the carry (Task A, `fb14_live.js`, `charge_live.js`)
The model was right (continuous T1 -> T4 logs: `fb2_route/chain_log.py`, 7 logs, 2 guarded, `test_fb14_chain.js`: 18643
frames checked, 28 / 28 dodge tests). The page lost the game's state:
| # | what broke | fix |
|---|---|---|
| 1 | a T2 lock landing after the Do Nothing confirm skipped every carried state ("matched 0 of 8000") | each state keeps its seed after the rays (`ca`); a late lock checks that |
| 2 | the end check also asked for the coin's phase (the true fit had it 11 frames off: the first v87 build planned T2 at 99.85% on a frame Bowser hit) | the seed only |
| 3 | the cap cut the true state (ranked 3000-7000 by prior) | cap by w x lw, 12000 |
| 4 | the T2 / T4 full search took 4-9 s | searched on the carried stream (Charge frame -2..+2, 14-24 candidates), its input held until that lock, the lock applied directly (no placement / joint, 5-7 s) |
| 5 | the T2 Charge read 2 frames off | shifts -2..+2; matched states keep their coin history; the clock follows the matched states' vote only at 60%+ |
| 6 | T4's wave particles in another order (1 of 13 waves, lost log) | a second hypothesis (8%) from T4's Charge |
| 7 | harness | `fb14_e2e.py`: capture indices by the real 60 / 29.97 cadence, a miss keeps the Life Shroom (at 10 HP a hit kills and the Shroom revives to 10: v86's 1234abcd "misses" were hits), T4 needs the wave, GUARD=1; `test_fb14_page.js` VCLOCK=1 |
New in the rebuilt logs: 1 of 7 T4 waves (5eed0fb2) ran its particles in a third order after T4's test; the stream is the
model's again after the wave, so the T4 beep and the carry are unaffected. A guarded T4 (A on P + 87) makes Lakilester
block the wave (not KO'd): checked to its test only. `test_fb14_v87.js`: fixes 1-4 and 6 on the page.

## 2. The Strategies-screen press reading (console 2026-11-09)
The runner's presses on the Strategies screen read about 2 frames early (Duplighosts -2.36, -1.34, -3.33, -1.82, -2.99; Jr.
Troopa T5 -1.23 while it dodged). Two clips have the input display (19-50-01 Duplighosts, 19-59-56 Jr. Troopa): the
Strategies box greys 10-11 capture frames after the A shows and is gone 12-13 after it, while a Mario action's bar hides
11-14 after its A (HUD_HIDE 3): grey = confirm + 2, gone = confirm + 3, as the emulator. The page closes the screen on the
grey frame (all 5 Duplighost clips of the session), and dup3 / dup4 / jrcc_nothing assumed the gone frame: **vanish 3 -> 2**.
On the clip with the input display the Do Nothing A is 256.2 game frames after the Charge's A where the page read 254.0:
the other ~1.2 frames are the Charge clock's own placement. The copies of 9 Duplighost clips fit only the v87 reading
(likelihood 0 at the v86 reading and at a 2-frame misread; `test_press_lever.js`). bf4fbf04 (logged -2.99, "works false",
3 copies): the press was at 243 on the model's clock, inside the 5-frame window; the lock and the model were right.
| lever (screen) | presses as logged | as v87 reads them | |
|---|---|---|---|
| Duplighosts Do Nothing (Strategies) | -2.36, -1.34, -3.33, -1.82, -2.99 (11-09); -2.34, -1.77, -1.31, -0.81 (11-07) | +1 each: mean -1.0 | the clock's placement is part of it (input display: -0.76 on bf4fbf04) |
| Jr. Troopa T5 Do Nothing (Strategies) | -1.23 (dodged) | -0.23 | |
| Jr. Troopa T3 Bomb (target on him) | -0.25, -0.3 | unchanged | |
| Jr. Troopa T4 Maple Syrup (target on Mario) | -2.26 (died), -1.92, +0.22 | unchanged | mixed: no correction |
| Jr. Troopa T6 Power Bounce | +0.26 | unchanged | |
| Final Bowser Do Nothing / Cloud Nine (logs C, F) | -2.54, -2.2 | unchanged (FB reads the grey frame already, VAN.S 2) | v86 correction kept |
So **no Duplighost correction** (it would have made the presses late). Final Bowser keeps v86's learned correction, now kept
per lever (`leverBias`) and stored against the beep, so it no longer decays to 0 as the presses come in on time.

## 3. Arena moves gated (log bf4fbf04)
A near-white picture on the Duplighosts' step (L 245) read as Final Bowser's arena and moved the route there. Now an arena is
L < 170, and an automatic move goes forward one fight at a time, only after that fight's minimum time since the fight before
it was last active (Duplighosts -> Jr. Troopa 90 s, -> Hallway 60 s, -> Final Bowser 80 s and 5 min after the Duplighosts;
the session's gaps were 190-440, ~140, 173 s); a skipped fight is never automatic; a move back (a retry) and a manual step
always go. Refused moves log `arenaRejected`. `test_arena_gate.js`.

## 4. Jr. Troopa: the 30-second beep (log 2f22d4dc) and the window choice
- After the T3 Charge's own lock (a new clock) v86.1 left the Ultra Boots Charge confirm in the old clock: the Bomb's earliest
  frame came out ~1050 and the replan beeped 30 s later. The Charge is frame -13 of its own clock on both boots; a plan whose
  early floor puts the press more than 10 s past the frames the page is at is no edge (`zwTooFar`). `test_jr_v87.js`.
- A frame up to "Wider window up to" s (Settings, default 1.5) past the lead is beeped when its chance with the runner's press
  spread is 3 points higher; the plan text shows the next wider window. Levers with one outcome. `test_pp_later.js`.

## 5. Final Bowser on console: the Charge read is weak (open)
Six console fb1 reads (logs b75b56e2, c565d268, 4bc65351): 4901 / 1.98, 5825 / 1.98, 6201 / 2.45 (weak: the prior doubt keeps
them off the beeps) and three noise reads (best ~2700-3100 at 1.03-1.07); every Jr. Troopa / Duplighost / Hallway read of the
same sessions scores 6200-8700 at 3.5-5.5, and the emulator renders lock at 6736-7364 / 2.7-2.8. Replayed through v86 and v87:
the same. Ruled out: Mario's position (17 px right on half of them; the Hallway shows the same and locks; any shift tried
reads noise on b75b56e2), the trigger frame (the brightness curve matches CHG_BRIGHT_FB1 frame 3; the ±1 retries ran), the
profile (fb2 reads noise too). Not found yet. The page now says "WAIT, searching…" on the Cloud Nine step while a read runs
(the runner confirms Cloud Nine about 4 s after the Charge).

## 6. End to end (emulator, VCLOCK=1, GUARD=1, MARIO_HP=10)
Both seeds on the v87 Task A code (the two runs overlapped with each other and the tests: VCLOCK keeps the page's clock on
the pictures, nothing was dropped). Planned frame and the perfect-press claim; whether Bowser missed (T4: the wave came and
missed Mario) with the confirm on the planned frame / one early / one late.
| seed | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| 1234abcd | 367, 0.956: yes / yes / no | 1279, 0.999: yes / yes / yes | 1796, 0.996: yes / yes / yes | 2315, 1.0: yes / yes / yes (guarded: Lakilester blocked the wave) |
| 9e3779b9 | 381, 0.935: yes / yes / no | 1259, 1.0: yes / yes / yes | **no plan** (blind; hit) | no plan (blind; the wave, hit) |
9e3779b9 T3: the page read the T2 Do Nothing 3 frames early (1256 for the pressed 1259; 1234abcd read its T2 confirm exact),
outside the -2..+2 shifts, and made no T3 plan or "No edge" at all after the Jelly: a bug left open (section "Not done").
Only 2 of the 8 seeds asked for were run: the session went to the console logs of 2026-11-09 (sections 2-5).

## Tests
New: `test_fb14_chain.js`, `test_fb14_v87.js`, `test_press_lever.js`, `test_arena_gate.js`, `test_jr_v87.js`, `test_pp_later.js`
(all in `run_suite.sh`); fixtures `fb14_chain_logs.json`, `console_1109_press.json`. Version checks moved to v87. Full
`run_suite.sh` on this code: every test rc 0 except the four that read files the restart removed (the uploaded logs and
clips of earlier sessions, `/tmp/claude-0/pm/bot1/data`): test_torch_core, charge_live/test_route_replay, test_session_plans,
test_capture_replay, and the two log replays.

## Not done
Task B (the Do Nothing Ultra Jr. Troopa route, ub2) and Task C; the e2e seeds beyond those above; the Final Bowser console
read (section 5); the e2e T2 confirm misread on 9e3779b9 (section 6).

# Time Out Timer v86.1: Jr. Troopa after a restart (hotfix, Nov 10)

Console 2026-11-09 (page v86; logs 1794269702752 and 1794269850246, the second holds the first; clips 19-14-36 and
19-17-03). Fight 1 died on T4 (Maple Syrup Close Call); after its T5 Charge the runner **reset, walked back in and started
over from T1** (the clips: Jr. Troopa's speech, 10/10 HP, Super Charge, Bomb, his hit to 3 HP, T2 Bomb), clicked T1 on the
route, and did the same again at ~1015 s after a 104 s idle. The page jumped to T3/T4 while the fight was on T1/T2:
| # | Bug | Fix | Test |
|---|---|---|---|
| 1 | **The restart started a fight from the previous Charge.** `jrReset` cleared the Charge already seen, so the next frame's `jrTick` took the old burst as T1 (jrFight at the old Charge's time, k0 used up) | `jrReset` keeps the burst it has seen; a step back by hand also re-arms the Charge watcher; a lock that lands after a restart is ignored | `test_jr_restart.js` |
| 2 | **The battle entry counted as the T1 Bomb.** On entry the bar shows 380-400 ms before Jr. Troopa's speech hides it; v86 counted hides after 300 ms of bar up | a confirm needs 600+ ms of bar up (as hudWatch's barHide and the Charge's arming; the fastest console confirm in every log: 1133 ms); a bar flash under 600 ms after the bar was gone 12 s+ is the **battle entry**: back to T1, waiting for its Charge | `test_jr_restart.js` |
| 3 | **A hide after a long idle counted** (104883 ms of bar up, then a reset) | a hide after 30 s+ of bar up counts once the bar is back within 12 s; gone longer (a reset) it never counts. A Charge's own held hide counts at its burst (fight 1's T5 Charge after 84 s) | `test_jr_restart.js` |
| 4 | **The resync only went forward** (the real T1 Charge read as T3: "jrResync from 4 to 4"; the T1 Bomb then planned and read as T3's Close Call, a full bar's "10" read as a death) | `jrResyncK`: from the last Charge burst (k, t) and the n confirms counted since, the later Charge c with the fewest off (abs(c - k - 1 - n)); T1 (a new fight) when the bar was gone 12 s+ since, off by the confirms after that gap; no later Charge on the route: T1 | `test_jr_restart.js` (also with no clicks and no entry flashes) |

`test_jr_restart.js` replays the log's bar (each bar-up from its hide and upMs), the runner's clicks and the Charge bursts
through the page (`fixtures/console_1109.json`: the events from t=680000, no pictures): through both restarted fights the
page is on the clips' turn, with no Close Call outcome; v86 fails 23 of its checks.

# Time Out Timer v86: Ultra Boots Final Bowser T1-T4 end to end, the Lightning Blast, the Normal Boots phase-2 turn measured (Nov 9)

The runner has never reached Ultra Boots phase-2 T4 on console. Logs C (1794169517521, clip 15-24-14) and F
(1794170840652, clip 15-46-32; F holds C's fight too) were replayed through the v85/v86 page code, the clips were fed frame
by frame to the page's live readers (`test_fb14_page.js`, the clips' 60 fps pictures), and the route was played end to end
in the emulator with the page's beeps (`fb2_route/fb14_e2e.py`). No video, frames or states committed.

## 1. What stopped the Ultra Boots runs (each fixed, with a test)
| # | Bug | Seen in | Fix | Test |
|---|---|---|---|---|
| 1 | **The hit watch watched the wrong turn.** The route moves to the next turn's step at the lever confirm, and v82's HP watch followed the step, so a hit on the turn just played (read 2-25 s after the confirm) was never seen | code read, then simulated | the watch follows the last lever confirmed (T1-T3), not the step | `test_fb14_v86.js` 1 |
| 2 | **Bowser's misses were not used.** Only a hit was read; a miss (10 HP steady on the bar through his turn) told the tracker nothing. On log C's T1 (his fire breath missed) only 37% of the lock's weight had him miss; with the miss read 99%, and T2's per-frame shares go from 18% to 68% of frames decided (90%+ either way) | log C fight 1 | `fb14TurnOver`: at the next turn's own action (its Charge burst, the Jelly) a turn with 10 HP steady and no hit is a miss; states that had him hit are weighed by 0.01, the doubt's background by the blind miss chance | `test_fb14_v86.js` 2, 3 |
| 3 | **T1 killed by Mario's own Charge.** With Mario's target screen saved (cat M: Cloud Nine's is the same screen) the T1 Super Charge's confirm closes it and moves the route to the Cloud Nine step before the Charge's bar hide; v82's "Cloud Nine from the bar hide" then took the Charge's hide as Cloud Nine (frame 0, before the rays): every state dropped, "No edge" for all of T1 | end-to-end run 1234abcd | Cloud Nine's bar hide only after the T1 Charge's burst (+2.5 s) | `test_fb14_v86.js` 6, `test_console_1108b.js` 4 |
| 4 | **Wrong turn after early screen matches.** Fed clip 15-24-14, the saved screens matched twice in T1's menus before the Charge: the route ran to T2's step, the T1 lock was taken as T2's and T2's Charge as T4's (the wave rule on T2) | clip C through the live readers | the first Charge burst of an attempt with no lock is T1's: back to Cloud Nine's step, confirms read before it dropped | `test_fb14_v86.js` 7 |
| 5 | **The lever beeps came early for the runner.** Both console lever presses (T2 Do Nothing, logs C and F) read 2.54 and 2.2 frames before the beeped frame; the T2 states (with T1's miss) are single-frame on/off there (log C: 895 miss 93%, 896 4%, 897 99%, 898 2%), so a 2-frame early press is a coin flip | logs C, F | the lever beeps move by minus the mean of the last 8 Final Bowser lever presses (starting from these two: +2.37 frames), kept in this browser; shown in the FB panel | `test_fb14_v86.js` 5 |
| 6 | **T4's Lightning Blast** (RandInt(110) 20-29, known since v84) taken as a normal attack; no Recover check | decomp | section 2 | `test_fb14_ai.js` |
| 7 | **A plan before the Charge was in.** The T2 Charge's input waits for its rays' capture; a plan made meanwhile ran the states past the Charge's frame, which then found none ("No edge" for T2) | e2e 1234abcd T2 | no state runs past a pending Charge, no plan until it is in ("reading") | `test_fb14_v86.js` 8 |
**The read itself is right** (checked on the clips' input display): the A shows on the input display 9-11 video frames
before the picture of its frame (the capture's delay); after it the Super Charge's bar goes 13 video frames later, Cloud
Nine's ability list 10-11, the Strategies panel 11 (C and F alike): the same game frame offsets as the emulator's (bar
A + 2, list / panel P + 2). So the Strategies-panel read (VAN 2) and the Cloud Nine bar read (A + 2) are not off on console.
**Not a bug, measured:** Mario is at 10 HP on T1-T4 on console (the v74 model was built at 5 HP). 16 new emulator logs at
10 HP (`fixtures/fb14_logs_hp10.json`) are exact to every test and through the next menu after every miss. Bowser's HP
matters at 10 HP: at 74 or less (Mario's 100% more than 25 over Bowser's) he rolls for Recover first each turn; log C's
coin and outcomes favour no Recover roll about 146:1 (both hypotheses carried: T2's observed hit has 0.4% of the weight
with it against 49% without), so the default is "75 or more" (Settings: Bowser's HP entering phase 2; "not sure" carries
both).

## 2. The T1-T4 AI against the decomp
`fb14_live.js fbStep 'ai'` is now the whole `EVS_TakeTurn_Inner` (as `pmrng_core.js fbnbAi`, emulator-checked v84):
counters from the state's own attack history (`fbVars`), the Recover check (Settings), the Star Rod (skipped while the aura
is up: T1-T4), the wave / Lightning Blast branches (T4: RandInt(100) < 75 with a charge = the wave, else RandInt(110) < 20
the wave, < 30 **the Lightning Blast**, else the normal attacks), Body Slam / Claw by TurnsSince >= 2. `test_fb14_ai.js`:
20000 random histories x Recover on / off: the tracker's AI draws exactly what fbnbAi draws and picks the same attack.
**The Lightning Blast, measured** (`fb2_route/lb_log.py`, `lb_model.py`; T4 from the MARIO_HP=10 build, seeds screened
on the plain core for RandInt(100) >= 75 and RandInt(110) 20-29, logged on the debug core; `fixtures/fb14_lb_logs.json`):
AI + 19 its energy effect (1 x rand_int(360), 10 x (10, 20); each part respawns on + 19 + p, then every 20 frames while
under + 50), AI + 69 rand_int(7), **AI + 99 the dodge test** (Cloud Nine < 50), right after it 3 x rand_int(359) (its bolt),
then nothing but the arena to the next menu (miss: test + 132). 32 / 32 runs exact frame by frame (11 misses to the next
menu + 30, 21 hits to the test). A Lightning Blast that misses is not T4's goal (the wave must come on T4): `ok` false; the
carry goes on right.

## 3. Normal Boots, Final Bowser phase 2: measured, still not beeped
New states (setup only): `boss_2304_nbg_menu.st` (`AC=1 PARTNER=1 BRANK=1 BADGES=10c,e4,112,11f BOOTS=0 FP=10 HP=10
ITEMS=93,95,95,a3 NOFS=1 STARBEAM=2 SUF=_nbg boss_battle_start_setup.py 2304`), `boss_2304_nbg_t2menu.st`
(`fb2_route/nb_p2_state.py`: T1 Peach Beam + Goombario Charge, Bowser 89 HP, a T1 that was not the Claw Swipe: it
poisons Mario, 1 HP a turn, and kills him at 1 HP on the turn end), `boss_2304_nbg_pbtarget.st`. Measured
(`nb_cc/gch_log.py` x 20 at Mario 1 HP, `pb_nb_log.py` x 8; `fixtures/fbnb_p2_logs.json`, `test_fbnb_turn.js`):
- Goombario's Charge: his energy_in_out creations on G + 14 / G + 17 (as at Jr. Troopa);
- **Bowser's AI on P + 16** (P = his box A, or G + 133 with the box left to run out); its RandInt calls = fbnbAi with the T2
  vars in 20 / 20; the Close Call roll on AI + 52 / 55 / 62 (Body Slam / Fire Breath / Claw), < 30 = Mario lives (20 / 20);
  after a Close Call nothing but the arena to the next menu, on roll + 101 / 134 / 83 (9 / 9): Ultra Boots' T6 -> T7
  structure (`fb2_live.js`) with Goombario's box in place of the "+3" popup;
- **Power Bounce (Normal Boots) on Final Bowser:** first hit on d + 45, cap rolls on d + 70 + 26 k, each passing roll's hit
  one frame after it, chance 60 (8 / 8).
- With a lock and a perfect press, the best target-A frame in a window (model, 1500 random states; the hits' draws as at
  charge 6): 1 frame (blind) 4+ 73%, 5+ 33%, 6+ 8.3%, 7+ 0.9%; **1 s window 6+ 92%, 7+ 32%, 8+ 3.0%**; 2 s 6+ 99%, 7+ 53%,
  8+ 7.6%.
**Why still not beeped:** the lock would be the Super Charge read in this arena (the FB2 profile; with Goombario out it has
not been run on renders), carried through Goombario's turn and Bowser's, whose choice from T3 / T4 on adds the Star Rod
(75% at 4 turns after the Peach Beam; it re-enchants him) and the wave / Lightning Blast branches, which the page would have
to carry without knowing the turn number; and the hits' draw counts follow the jump charge (unmeasured for the route's
charge). Each part is a model the page already has for Ultra Boots (fb2_live.js, fbnbAi); joining them and checking the read
on renders is the next step. The page's step says this with the measured numbers and the locked odds; blind odds as v85.

## 4. End to end in the emulator (Ultra Boots T1-T4)
`fb14_e2e.py` (Glide64 renders -> `t6_capsim.py` -> the built page fed in real time, `test_fb14_page.js`; the page's first
plan of each turn pressed on its frame in the emulator, and one frame either side from the same state) on a new route build
at **Mario 10 HP, Bowser 84 HP** (`route_build.py`, `MARIO_HP=10`; `fb14_e2e.py` takes MARIO_HP too). The machine was
shared with the suite and a second run, so the page dropped hundreds of late pictures (LATEMS 2000) and the locks took
10-20 s; WAIT raised to 900 frames on the lever screens so that a slow lock still plans.
| run | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| 1234abcd | blind (bug 3: every state dropped); missed | planned (perfect press 99.9%): **missed**, -1 / +1 missed too | carry gone (T2's read matched none of the carried states; the fresh T2 lock died on T3's coin): blind, missed | not reached in time |
| 9e3779b9 | planned (100%): **missed**, -1 / +1 too | planned (88%): **missed**, -1 / +1 too | (see below) | |
| 2b7e1516 | the T1 lock came 20 s after the rays (load): blind, missed | stopped (load) | | |
**Every planned turn missed (4 / 4, and every neighbour frame).** What breaks is the carry from T1 into T3, as v75 found:
the T1 lock is the true seed (1234abcd: adv(true rays seed) = the lock's 12b5870c) but the carried states do not draw T2's
rays (`fb14Check` matched 0 of 8000), and in 9e3779b9 the T2 Charge read failed under the load ("no Mario": its burst
pictures dropped) and the carried states died on T2's coin (`fb14AllOut`). So **T1-T4 end to end is not reached in the
emulator either; T1 and T2 are**. The end-to-end success rate measured here: T1 2 / 2 planned, T2 2 / 2, T3 0 / 1 planned
(the carry), T4 not reached. Bugs 3 and 7 were found by these runs, bug 4 by the clip feed; all fixed.
**The clips through the live readers** (`test_fb14_page.js` on clip 15-24-14's 3886 pictures, under the same load): the T1
lock is log C's (31fe2969, as live), the early-screen bug (4) showed there; the run was too loaded (951 late pictures) to say
more. Not repeated on an idle machine.

## Tests
New: `test_fb14_ai.js` (the AI = fbnbAi in 20000 cases; the Lightning Blast against 32 emulator runs frame by frame),
`test_fb14_v86.js` (bugs 1-5, 7 and the early-screen / bar-hide cases on the page; log C fight 1 replayed),
`test_fbnb_turn.js` (Normal Boots Final Bowser: Goombario's Charge, Bowser's turn, the Power Bounce, 20 + 8 emulator runs).
`test_fb14_model.js` + 16 logs at 10 HP (48 / 48 exact). `test_console_1108b.js`: the Cloud Nine bar-hide case after the
burst. `test_nb_route.js`: the v86 step text. All in `run_suite.sh`. Version checks moved to v86.
New scripts: `fb2_route/lb_log.py`, `lb_model.py` (Lightning Blast), `nb_p2_state.py`, `nb_p2_fixture.py` (Normal Boots
phase 2); `route_build.py` / `fb14_e2e.py` take MARIO_HP. States (not committed): `boss_2304_nbg_{start,menu,t2menu,pbtarget}.st`.

Full `run_suite.sh` on this code (run beside the end-to-end emulator runs): every test rc 0 and both log replays lock as
before (1379.7 s on 83ebd9e1, 655.7 s on 52467bd0), except `test_dup_plan.js` (its version check, moved to v86 during the
run) and `charge_live/test_capture_replay.js` C (a re-read's timing under that load); both pass rerun on the idle machine,
with test_nb_route, test_fb14_v86 and test_console_1108b on the final build.

## Not done
The runner's second Ultra Boots Jr. Troopa route (T1 Charge / Do Nothing ... T7 Power Bounce x6, Bombette's Do Nothing
beeped on T2, T4, T5, T6) is not in v86: none of its turns were measured. On paper it holds (decomp
`final_jr_troopa.c`: his attacks do 8, 60 HP): T1 at 10 HP is hit to 2 (no Close Call roll above 5 HP), T2 at 2 rolls,
T3's Whacka's Bump heals to 10 and his hit leaves 2 (no roll, as written), T4-T6 at 2 roll (Maple Syrup is FP only).

## Not verified
On console: everything since v85 (the miss read on the bar at 10 HP is the Hallway's HP read; the lever bias from two
presses). In the emulator: the T1 -> T3 carry (open, above), T4's wave beep end to end, the Normal Boots phase-2 Super
Charge read with Goombario, Bowser's Recover branch on console (the default assumes 75+ HP).

# Time Out Timer v85: the Normal Boots Close Calls beep (Nov 9)

v84's Normal Boots route did not beep Jr. Troopa T2-T5 or Hallway T1: Goombario's Charge (T5: his Headbonk) and the enemy
turn after it were not measured. They are now (emulator + decomp), and every one of those Close Calls is beeped from the
turn's own Super Charge lock (T3: the T2 lock carried). Final Bowser is routed around (section 5).

## 1. Measurements (emulator, JP, debug core; `nb_cc/gch_log.py`, `nb_cc/jr_route_log.py`; `fixtures/nb_cc_logs.json`)
New state (setup only, never committed): `boss_0207_nbg_menu.st` = `AC=1 PARTNER=1 BRANK=1 BADGES=10c,e4,112,11f BOOTS=0
FP=10 ITEMS=93,95,95,a3 NOFS=1 SUF=_nbg boss_battle_start_setup.py 0207` (Goombario Super, Normal Boots); the Hallway's
`boss_2302_goomba_menu.st` (v84). Goombario's Charge has a target screen (hand on Goombario): its A is the confirm, G.
- **His Charge** (`goombario.c` EVS_Move_Charge): energy_in_out on G+14 and G+17 (Mario's Charge: +13 / +16), each part
  redrawing rand(359) until +59 / +62; nothing else is drawn. Then `ShowMessageBox(attack up, 60)`: in
  `popup_messages.c` A or B sets the box's duration to 0 on any frame of its delay state.
- **The cancel window:** A on **G+73 .. G+132** ends his turn on A+5 (gBattleState 23, the status bar back the same frame);
  A before +73 does nothing; no A = the box runs out = A on +133 (turn over on +138). 47 runs (K scan, every 2nd K and both
  edges). The status bar goes off on G+3 (Mario's Super Charge: A+2, the picture one later: the page's hide 3), so the
  Charge confirm reads as **hide 4** (as Bombette's Bomb), and the box A as the bar's **return on P+5** (picture P+6).
- **Jr. Troopa's attack** (no AI draw, as Ultra): the **Close Call rand_int(100) on P+29** (caller 0x80277518, Mario under
  6 HP); a dodge draws nothing more to the next menu (P+97); a hit: 10 x rand(359) on P+56 (10 HP: no roll, the hit on
  P+56). 16 + 20 runs.
- **Hallway Bowser:** his AI (RandInt 80, maybe 60) on P+16, then the Close Call as v78's model (AI+54 / 70 / 55). 20 runs.
- **Headbonk x2** (T5, glow 8 after four Charges, 8 damage a hit): the hits' 10 x rand(359) on H+54 and H+80, the Close
  Call on H+143 (menu +210). The action command pressed 0-2 frames into each window: the same frames (4 runs); 3 frames
  late it fails, only one bonk, and the model breaks right after +80 (2 runs: the route needs both bonks).
- **Maple Syrup** at 2 HP (FP 0): 10 sparkles on +118 (as Ultra's). **Whacka's Bump**: 22 sparkles on +118; Goombario's
  Do Nothing at 10 HP: Jr. Troopa's hit on +53 (Ultra's jr_nothing_hit). **T7 Power Bounce**: v84's jrpb5n frames.
- **Check** (`test_nb_cc_model.js`): from each Super Charge's seed and first coin frame (what a lock gives) and the logged
  frames alone, **92 segments, 122,164 frames, every 8th frame's gRandSeed equal**; Close Calls 128/128 (24 Hallway), the
  wait mode 8/8, Headbonk 40/40, T7 5+ 40/40. 10 whole fights T1-T7 (plan mode: each deciding press tried from a saved
  state until it dodged) + 36 single turns + 8 wait-mode turns.
Model (`pmrng_core.js`): TURNS `nb_gch`, `nb_jrcc`, `nb_jrhit`, `nb_hwcc` (`aiAt`: Bowser's AI with the 3-HP roll),
`nb_syrup`, `nb_hb`, `nb_hb_hit`, `nb_whacka`; profiles `jrcc_gch` / `hwcc_gch` (the box A), `jrcc_gchw` / `hwcc_gchw`
(the Charge confirm, box left to run out), `jrcc_hb`; `NB_K`.

## 2. What beeps now (Normal Boots)
| Turn | Beep | Seed |
|---|---|---|
| Jr. T2, T4 | Goombario's Charge confirm (wait it out, default) or his box A (Settings) → Close Call | that turn's Super Charge lock |
| Jr. T3 | the same | the T2 lock carried (Maple Syrup, the dodge, the coin) |
| Jr. T5 | Headbonk target A → Close Call | the T5 lock |
| Jr. T7 | Power Bounce 5+ (6 ideal) | the carry (T6 Whacka, Do Nothing); else v84's shine lock |
| Hallway T1 | as Jr. T2 (Bowser's attack choice in the model) | its Super Charge lock (`CHG_PROF.nbhw`) |
| Hallway T2 | Time Out | the T1 carry; else v84's shine lock |
| Hallway T5, Duplighosts | as v84 | |
**The tracker** is Jr. Troopa's (`jr_live.js`, now one machine for three sequences: `JR_SEQ` Ultra, `JR_SEQ_NB`,
`HW_SEQ_NB`, `JRS()`): the bar hides count the confirms, each Super Charge locks or checks the carry (`jrLock`), the
outcome watch (HP tens: a Life Shroom revive) drops the states that would have died, a death makes the next turn "no
roll" (10 HP), the doubt / no-edge / reconstruction rules are v82's. **Press A mode** (`nbCancelPlan`): the plan is made as
soon as the Charge confirm is read (bar hide), over the states stepped to the box, in the box window (never earlier than
the beep lead allows), with v83's perfect-press rule; "Locked: confirm Goombario's Charge whenever you like ..." before it.
The box A is read from the bar's return (`nbCancelSeen`, -2..+1), or taken as the beeped frame with the press spread, or as
+133 when nothing was planned. **Wait mode** (default): the Charge confirm is planned from the tracker (`jrEarlyPlan`, floor
150 frames after Mario's confirm) and both inputs go in at the confirm. The Goombario Charge steps use cat 'S' so that
Mario's target screens never start a plan.

## 3. Which default, and the odds (`test_nb_cc_page.js`, the built page, model games, 40 per row)
| | perfect press: lands / claimed | ±1-frame presses 25/50/25: actual / claimed | window |
|---|---|---|---|
| Jr. T2 box A | 97.5% / 88.8% | 78.1% / 75.7% | 1.5 |
| Jr. T3 box A (carry) | 100% / 93.1% | 76.9% / 76.2% | 1.4 |
| Jr. T4 box A | 97.4% / 81.7% | 76.9% / 70.6% | 1.1 |
| Jr. T5 Headbonk | 100% / 84.9% | 76.4% / 71.6% | 1.4 |
| Hallway T1 box A | 100% / 90.9% | 75.6% / 76.4% | 1.4 |
| Jr. T2 / T3 / T4 wait | 100 / 100 / 97.5% ; 92.5 / 97.1 / 90.7% | 82.5 / 85.6 / 81.3% ; 78.0 / 84.4 / 75.4% | 1.9 / 2.3 / 1.6 |
**Wait it out is the default**: it gives the higher perfect-press chance. In wait mode the beeped press is the Charge confirm
itself; with the box A the page must plan around the confirm as read from the status bar (-2..+1 frames, a dropped picture
reads it late), which splits the states before the plan (6 groups with the lag), so fewer frames work for all of them.
Press A is the better choice when the lock lands late (it can plan until the box closes, ~4.4 s after the Charge confirm).
Every planned press landed on the model or the miss was claimed under 95% (no confident wrong beep), T7 5+ from the carry
37/37, Hallway T2 Time Out from the carry 40/40. Whole Jr. Troopa fight (four Close Calls): about 45-55% with ±1-frame
presses, 70-80% with perfect ones (model); blind 0.8%.

## 4. Not verified on console
Everything above is emulator + model: Goombario's Charge picture (the bar hide 4 and the return P+6 on the capture), the
Super Charge reads with Goombario out (Jr. Troopa's arena and the Hallway), Headbonk's damage on the runner's file (its
draws follow the damage: 8 a hit here, four Charges, Goombario Super), the runner's Life Shrooms, Jr. Troopa staying
above 39 HP (no transformation) after the Headbonk.

## 5. Final Bowser (Normal Boots): routed around
The runner: "if that Final Bowser fight is not realistic, we can route around it, we just need a high cap". The phase-2
every-turn Close Call / no Star Shield / no wave route is gone; the route has one Final Bowser step, the phase-2 Power
Bounce on whichever turn. **It is not beeped**, and the step says why: a lock for it needs (1) the preceding Super Charge
read in this arena with Goombario out (the FB2 reader handles the lightning on Ultra Boots with Lakilester), (2)
Goombario's turn with the lightning, (3) every draw of Bowser's turn up to the next menu for each attack he can pick (only
his choice is modelled: `fbnbAi`, v84), (4) Normal Boots Power Bounce's frames against him. None is measured, so beeping
would be a guess. Shown: the blind cap odds (chance 60, the first two bounces free): 4+ 72%, 5+ 31%, 6+ 8.1%, 7+ 1.3%.

## Tests
`test_nb_cc_model.js` (new: the emulator ground truth above), `test_nb_cc_page.js` (new: the page's plans, beeps, texts,
both modes, both fights, the carries to T7 and Hallway T2), `test_nb_route.js` (v85 route: the Charge readers, the beeped
steps, Final Bowser's one step and its cap odds; Jr. T7's shine lock still plans). Version checks moved to v85. Ultra Boots:
the Jr. Troopa machine runs its v84 sequence (`JR_SEQ` flags `rearm` / `revive` replace the hard-coded indices).
Full `run_suite.sh` (final pass, the committed code): every test rc 0 and both log replays lock as before (1379.7 s on 83ebd9e1,
655.7 s on 52467bd0), except `test_strip_geometry.js` once (the displayed now 0.126 frames off between two animation frames:
the timing flake of v72 / v77, same message in an older suite run); it passed 10 of 12 further runs on v85 (one of the two failures with the suite running beside it) and 10 of 10 on v84.

# Time Out Timer v84: the Normal Boots route (Nov 8)

The runner's second route (spec of 2026-11-08): Normal Boots, Goombario instead of Kooper (every partner "Charge" is
Goombario's), Mario at 3 HP through Jr. Troopa and the Hallway and at 1 HP in Final Bowser's phase 2.

## 1. The setting
**Boots: Ultra Boots / Normal Boots** in the route panel's top row (beside Restart route), saved with the other settings
(`tot-settings`, try/catch). Switching it switches all four fights' route tables, beeps and odds, keeps the fight the
route is on, and drops the trackers of the other route. Ultra Boots is v83 exactly (`test_nb_route.js`: the step list
round-trips unchanged). **Odds per fight** (the last line in the route panel's Details, so the v81 order stays: buttons,
the four fights, Details) lists each fight's overall odds on both routes, the current one in bold.

## 2. What Normal Boots beeps, and what it does not (never a guessed beep)
| Fight / turn | Beep | How |
|---|---|---|
| Duplighosts T1 Do Nothing | yes | the same Charge lock and model as Ultra Boots; the Duplighosts goal **Auto** (new default) = "4 first" on Normal Boots (3 copies cost 2 damage here), "4 when it's free" on Ultra |
| Jr. Troopa T2-T5 Close Call | no | the last confirm before the attack is Goombario's Charge (T5: his Headbonk): its effects' random draws and Jr. Troopa's turn after it are not measured; "No beeps this turn (Normal Boots): ... Play it blind: Close Call about 30%" |
| Jr. Troopa T7 Power Bounce 5+ (6 ideal) | yes, from a shine lock in its menu | profile `jrpb5n` / `jrpb6n` (below) |
| Hallway T1 Close Call | no | as Jr. Troopa (Goombario's Charge is the lever; no Spiny Flip on this route) |
| Hallway T2 Time Out | yes, from a shine lock in its menu | the Time Out profile (no Charge carry: T1's Goombario Charge and Bowser's attack are not modelled) |
| Hallway T5 Power Bounce 6+ | yes, from a shine lock in its menu | profile `hwpb6n` |
| Final Bowser phase 1 | not tracked | |
| Final Bowser T2-T8 (Close Call, no Star Shield, no wave) | no | Bowser's attack choice is modelled (section 3), but Goombario's Charge, the Super Charge rays at this arena on Normal Boots and the frames from the confirm to Bowser's AI are not measured; the odds use the model |
| Final Bowser T8 Power Bounce 5+ | no | not measured; the arena's lightning breaks a plain shine lock |

A Normal Boots step reads no Charge but the Duplighosts' (`chgProfNow`, `chgStartTracker`: `nbNoTracker`), so none of the
Ultra Boots trackers (Jr. Troopa's bar count, the Hallway Spiny Flip carry, Final Bowser T1-T4) can start on it. After the
Hallway the route goes into Final Bowser by ▶ or a click (the arena read that moves it on Ultra Boots is a Charge read).

## 3. Bowser's phase-2 attack choice (decomp, emulator-checked)
`pmrng_core.js fbnbAi` ports `final_bowser_2.c` EVS_TakeTurn_Inner: the counters (TurnCount, TurnsSince Shockwave /
StarBeam / ClawSwipe / BodySlam / Recover) go up by one; Recover (`RandInt(100) < 75` when Mario's HP % is more than 25
over Bowser's and recovers are left); the **Star Rod** (TurnCount > 1, not enchanted: `RandInt(100)` under 0 / 0 / 15 / 75
for TurnsSinceStarBeam 1 / 2 / 3 / 4+); then a normal attack while TurnsSinceShockwave < 3 or TurnCount <= 3; else
TurnsSinceShockwave >= 6: `RandInt(30) < 20` the **Draining Shockwave** (the wave), else Lightning Blast; else
`RandInt(100) < 75` with a jump or hammer charge: the wave; else `RandInt(110)`: < 20 the wave, < 30 Lightning Blast;
else the normal attacks (`RandInt(80) < 20` Body Slam if 2+ turns since, `RandInt(60) < 20` Claw Swipe likewise, else
Fire Breath). Only the wave resets TurnsSinceShockwave (Lightning Blast does not).
On the route (Peach Beam on T1 resets TurnsSinceStarBeam, Super Charges from T2), with Close Call (`rand_int(100) < 30`,
1A5830.c, Mario under 6 HP) and the Lightning Blast allowed (it tests Mario like the normal attacks), the blind chance per
Bowser turn is T2 29.7%, T3 25.3%, T4 / T5 1.6% (the Star Rod at 75%, the wave at 75% with a charge, then 20/111), T6-T8
2.7% (TurnsSinceShockwave 6+: the wave 20 in 31, and the Star Rod): **3.9e-10 for T2-T8** blind. If every turn could be
beeped with a 1 s window (30 frames, each an independent try: an estimate) about 2.6%; 2 s about 20%.
**Emulator** (`fb2_route/p2ai_log.py`, `fixtures/p2ai_logs.json`, `test_fbnb_ai.js`): from `boss_2304_peach_start.st`,
random vars / Star Rod flag / charges / HP written at Lakilester's menu (DIAGNOSTIC, setup only), Bowser's turn logged:
60 cases (seeds from 2402), **every RandInt of Bowser's AI equal to the model's (max and value) in
60 / 60**, the attack the game used equal to the model's in 54 / 54 that can be read (15 Star Rod, 8 wave, 6 Recover, 6 Body
Slam, 7 Claw Swipe, 10 Fire Breath, 2 Lightning Blast; 6 Fire Breath / Lightning Blast at full HP have no Close Call roll
to tell them apart), the vars after the turn 60 / 60. The Close Call roll comes at AI + 55 after Fire Breath (as FB2) and
AI + 99 after Lightning Blast.
Found on the way: the Ultra Boots T4 model (`fb14_live.js fbStep`, `e.t4`) treats `RandInt(110)` 20-29 as a normal
attack; the game uses Lightning Blast there (no `RandInt(80)` follows). It only matters on the T4 wave miss path the route
does not want (the T4 goal is the wave); not changed in v84 (Ultra Boots stays as it was), noted for a later fix.

## 4. Normal Boots jump timing (decomp, emulator-checked)
`power_bounce.c`: the menu stores the boots level as the move's argument; level 0 runs `EVS_UseMove_Basic`, whose bounces
after the first are `PlayerBasicJumpToGoal 24` (Ultra: `PlayerUltraJumpToGoal 25`), and the cap check is `IfGe(LVarF,
LVar0)` (Ultra `IfGt`: the same outcome, the first roll's chance is 130-140). The emulator (`pb_nb_log.py`, the menu's
boots level written to 0, action commands pressed on each window's first frame; `fixtures/pb_nb_logs.json`,
`test_pb_nb.js`): **cap rolls every 26 frames** (Ultra 27): Jr. Troopa +77, +103, +129, +155 (Ultra +78, +105, +132,
+159), Hallway Bowser +73, +99, +125, +151; each hit's 359-draws one frame after its roll, their count by the damage.
10 / 10 Jr. Troopa runs and 10 / 10 Hallway runs match roll for roll and draw for draw; the Ultra control (4 runs) keeps
the 27-frame period. The draw counts assume the route's jump charge (Jr. T7: 12 = four Super Charges; Hallway T5: 6 = two):
another charge changes them (unverified on console). The plain Jump and the Duplighosts' / phase 1's jumps are not beeped
(nothing is decided by their frame on this route).

## 5. Not verified on console
Everything on Normal Boots: the shine locks in the Jr. T7 / Hallway T2 / T5 menus with Goombario out, the jump charge on
T7 / T5, the Duplighosts goal "4 first" with the runner's presses (it costs 3+ robustness: with the runner's spread 3+
about 71% against 80% for "4 when it's free").

## Tests
`test_nb_route.js` (the setting, both route tables, every Normal Boots step's beep or "No beeps", the shine-lock plans on
Jr. T7 and Hallway T5, the odds, persistence), `test_fbnb_ai.js` (the attack choice against the emulator, the blind chance
against a Monte Carlo), `test_pb_nb.js` (Normal Boots Power Bounce timing against the emulator); all in `run_suite.sh`.
`test_dup_plan.js`: the goal setting has 5 options, default Auto (Ultra Boots: "4 when it's free"). Version checks moved to
v84.

# Time Out Timer v83: the perfect press (Nov 8)

Asked by the runner: Close Call, the Duplighosts' copies, Time Out and Power Bounce are decided by the seed and the exact
confirm frame, so the page now plans for a **perfect press**. v82 scored each frame by the press spread (25/50/25, or the
runner's measured spread) and could aim at a failing frame between working ones (Jr. T4 with working frames at -2, -1, +2
around a failing 0).

**The rule** (`ppPick`, used by `zwChoose`, so the Duplighosts, Jr. Troopa, the Hallway's Time Out on the tracker and
Final Bowser T1-T4; also `mixPlan`, `fb2PlanK` and `fb2PlanT7`):
- a frame **works** when the states that agree on it carry at least half the weight and at least the best share in reach
  minus `PP_TOL` (0.05);
- the beep is always a working frame: the centre of the **widest run** of working frames (the most centred reachable frame
  when the run starts before the earliest beepable frame), then the spread-weighted score, then the earliest;
- with an all-4-like top outcome (Duplighosts 4 copies, Jr. 6+ bounces) the goal picks:
  - `safe3`: the widest 3+ window, its centre (all 4 only where it costs no 3+ margin);
  - `free` (Duplighosts default, and Jr. Power Bounce: "6, 5+ either side"): in the widest 3+ window, an all-4 frame with a
    3+ frame either side (`PP_FREE_M` 1), else the centre;
  - `run2`: the centre of the widest all-4 window if it is 2+ frames, else `free`;
  - `four` (new option "4 first (widest all-4 window)"): the centre of the widest all-4 window, else `free`.
- **No edge** is decided on the perfect press's chance: (1 - doubt) x the working share + doubt x blind, below "beep only
  from" (0.4). The doubt rules (50%+: no beeps), the HP fallback, the re-score on the coin (`zwTick`, `fb14Tick`: now on the
  planned frame itself) and the blind texts are unchanged. Nothing is beeped for outcomes not decided by the press.
- **Shown:** "Perfect press: works · window N frames · seed confidence NN%" (the strip's headline, the Charge / Jr. / FB
  panels); "works for NN% of the states" when they disagree on the frame. The spread-weighted chance is kept in the detail
  line ("Counting your press spread: NN%"), the panels' "with your press spread" and the log (`mix.p`; `mix.pp`, `mix.win`).

**Measured** (`test_dup_plan.js`, 300 random Charge-locked seeds, lag-0 truth; perfect press | 25/50/25 | runner rms 1.77, 3+ /
all 4): 3+ safe 100 / 37 | 96.3 / 28.9 | 79.5 / 21.6; 4 when it's free 100 / 43 | 96.3 / 31.4 | 79.2 / 22.1; 4 if 2+
100 / 46 | 96.3 / 33.9 | 78.5 / 23.5; 4 first 100 / 83 | 89.9 / 52.6 | 71.4 / 31.5. Jr. Troopa (`test_jr_plan.js`): Close
Call 72-87% actual with 25/50/25 presses (as v82), T6 5+ 97.5-100%, 6+ 51-62%. Hallway (`test_hw_v77.js`): the tracker is
v77's; 2 of 12 plans moved to the perfect-press frame.

**Tests:** `test_pp_plan.js` (new: the Jr. T4 case, widest run, clamp, tolerance, no edge, the four goals, the texts);
`test_dup_plan.js` section 6 rewritten for the perfect press (every goal's frame gives 3+ for most states, "4 when it's
free" keeps the widest 3+ window and never less all 4, "4 first" the widest all-4 window); `test_hw_v77.js`: the tracker
must be v77's and every v77 plan a plan on a working frame. Version checks moved to v83.

# Time Out Timer v82: the console logs of Nov 8 evening (Jr. Troopa, Hallway, Final Bowser), the status card (Nov 8)

Logs (v81, N64 -> S-Video -> GV-USB2 -> OBS 1280x720 60 fps): A 1794169121337 (three Jr. Troopa fights, a Hallway lock),
B 1794168471055 (A's first fight), C 1794169517521, D 1794170011547, E 1794170254406, F 1794170840652 (each a superset of
the one before: Hallway + Final Bowser, another Jr. Troopa fight, another Hallway, another Final Bowser); clips 15-24-14
and 15-46-32 (the two Final Bowser fights). Numbers in `../fixtures/console_1108b.json`; checks in `../test_console_1108b.js`
(the Charge reads are pictures: read from the uploads at run time, skipped when absent). No video or frames committed.

## 1. Jr. Troopa: the first Charge read failed on 5 of 12 Charges (the re-read cost 1.3-1.9 s)
Live: A's middle T3 (c36a7fac), A's third fight T1 / T3 / T5 (11b14e27, 395bbf95, 7030ac47), D's T5 (cb46fac3): best
1.0-1.2x on the first placement, a lock on the re-read (2.8-3.5 s after the rays). Replayed through the page
(`chgReplay`) they fail the same way. **Cause: the brightness curve.** `CHG_BRIGHT_JR` was the emulator's (Hallway curve +
the emulator's Jr. - Hallway difference, "unverified on a capture"); the console reads 2-4 levels brighter on frames 7-26
(plateau 64 vs 60). The placement (dynamic programming over brightness and picture times) then preferred a skipped frame
in the rise (frame 8) and a doubled one at ~21: 13 frames one off. The pictures themselves show one picture per game frame
(the same 30 values as a first-read lock, picture for picture), and the re-read's lock was a placement 8 frames off that
still scored. **Fix:** the curve measured on the console (A's 9 Jr. Charges, one picture per game frame from the trigger,
the median; the two Charges with a real frame of no picture cut there). Replayed: all 12 Jr. reads of A and D (and the
two of 1794154120837, out of sample) lock on the first placement on the live seed; 4 of those 12 had needed a re-read live.

## 2. Jr. Troopa T3 (A, middle fight): no beeps
The tracker carried the T1 seed (the T3 lock later agreed: jrCrossCheck). v81 planned only once the target screen had
matched for 0.3 s; the runner confirmed the Bomb 0.4 s after the menu opened, and the plan came 175 ms after that bar hide
(after the press: no beeps; the Close Call missed). In the perfect third fight the runner waited 3.5 s on the menu.
**Now** (`jrEarlyPlan`): on a Jr. Troopa roll step the plan is made from the tracker as soon as its states settle (the
Charge's rays end +61), without the target screen; its frame is never earlier than a plan made on the screen: previous
confirm + frames to the menu (bar back: Charge 110, the T4 Bomb 160 on every fight of A; after a Close Call the menu after a
dodge, `JR_SEQ.next`) + the lead + 10. Logged `plan ... early: true`. An early plan is not cancelled by "target screen
lost" until its screen has been seen. The doubt / edge rules are zwPlan's; a later lock re-scores it ("Seed changed").
On the middle fight that gives a plan ~1 s before the menu opened.
- The double jrInput k5 (c 990, then c 111): the first in the T1 tracker's clock, the second the same confirm re-applied
  in the T3 lock's clock (`jrStartFrom`, "since [5]"). Checked: Charge confirm -> Bomb confirm is 124 frames in the old clock
  and 125 in the new (the third fight: 215 / 215): the right frame. Now logged with `re: true`.
- zwInconsistent at 696951: the Bomb at c 111 was a hit (all states said so); Mario died at ~+420 frames and the Life
  Shroom's draws broke the coin before the "10 HP" read confirmed the death at +595 (jrCarryEnds). Harmless.

## 3. Presses (issues 2 and 3)
v81 measured a Jr. Troopa press only when a target screen closed, and before the route moved: none for the T3 Bomb (its
screen not watched) or T5 Do Nothing (the step had moved). **Now** every beeped Jr. confirm is measured at the confirm the
tracker reads (`jrPress`: the bar hide, or the Strategies screen closing), against the plan's frame in the tracker's clock.
The screen read ran ~3 frames late on those screens: A T4 +2.03 vs the tracker's -1, T6 +2.04 vs -1; D T4 +5.03 (counted
"off the beeps") vs +2 (the Close Call happened), T6 +2.63 vs 0. A press more than 5 frames off (A t=872115: -44, the
runner pressed 1.3 s after the first plan's last beep) or after the beeps stopped is logged but kept out of the press
spread, and an off-beep press on a tracker plan no longer goes into the shine-lock carry. (Presses already in a browser's
list from v81 Jr. screens carry that +3.)

## 4. Hallway: the step back after Time Out (C t=1152710, E t=2011596)
After Time Out (hallwayDone) the battle goes on: the coin hid 13.6 s, `hwRetry` stepped back to T1 and every later bar
hide was read as a Hallway Charge. A new attempt always starts with T1's Charge, whose burst sets T1: so after Time Out
the long hide is held (`stepBackHeld`) while the Charge reader is on.

## 5. Final Bowser (C and F; both fights failed)
- **T1's Cloud Nine confirm was never read** (no target screen matched on T1 in either log; the runner confirmed ~1 s before
  the T1 lock). The carry had no Cloud Nine (its puffs, Bowser's AI). C's T1 lock replayed with C's coin: T2's doubt 63%
  without it (as logged), 1.5% with it at the bar hide (17% with the new prior below). **Now** the bar hiding on T1's lever
  step is the Cloud Nine confirm when no screen was read (`fb14CloudNineByBar`; bar = A + 2 as Lakilester's Spiny Flip,
  -2..+2 carried: not measured for Cloud Nine).
- **Bowser hit Mario** (clips): C on T2 (fire, HP 10 -> 0, Life Shroom), F on T1. Neither is modelled; C's carry then died
  at T3 (fb14AllOut: correct), F's T2 Charge matched none of the carried states and v81 planned T2 from the fresh T2 lock at
  doubt 0.7% (70%, a 10-frame window): Bowser hit again. With Cloud Nine, C's T2 states agree no frame near 897 makes Bowser
  miss (best 1-12%): T2 would have said no edge. **Now:** Mario's HP tens place (the Hallway's console-checked read): "1" on
  the steady bar before the lever, blank for 10 frames after it (T1-T3) = a hit: no edge for the rest of the attempt, red
  badge "Mario hit". A lock's prior doubt (`fb14Prior`): ratio under 3.5 (these locks: 2.3-2.6; Jr. / Hallway 3-5) up to
  42%, a placement one frame off within 10% +10%, a fresh lock that contradicts the carry (none of its states drew the rays)
  50%: no beeps until the coin confirms it. F's T2: doubt 50%, no plan.
- **T2 Charge not read in C** (chargeFalseTrigger): the burst peaked at +58, over the emulator `CHG_BRIGHT_FB1` + 10 (56.6) on
  4 pictures. The console reads the same shape ~1.2x as bright: the curve is now C's T1 read (as placed by its lock); the
  shape bound gets +20% upward room for this profile (lightning), trigger cuts 12.5 / 20.0, trigHi 27. Not verified end to
  end: the T2 pictures were not kept.
- **T1: nothing for 21 s** (F): no plan, no message (the plan waited for the target screen). **Now** `fb14EarlyPlan`: on a
  lever step the plan is made as soon as the turn's lock is in (and the partner's menu can be up), else "No beeps yet: the
  rays are being read ... wait on Cloud Nine's target", "No edge ...", or "Cloud Nine was confirmed before the seed was read".
- `fb14Input chg` (613 / 883): the T2 Charge from its trigger (M = trigger - 16, -1..+1): with Cloud Nine, C's carried states
  stay consistent with the coin through T2: right.
- Lock badge on Final Bowser: green only below 50% doubt, the read not weak-and-unconfirmed (prior raised and doubt still
  20%+), and the set not at the state cap; FB14.doubt is the prior until the coin weighs it.

## 6. The page
- The badge's second line and the Charge / FB status lines say **seed confidence NN%** = 100 x (1 - the tracker's doubt), the
  number that decides the beeps (50%+); the raw score / ratio stays in Details and the log.
- The status card: Download session log and Reset sit above the chips, headline and detail (they never move);
  tabular figures in the detail line. `test_status_btns.js`: 8 texts x phone / desktop, identical button boxes.
- The name: "Paper Mario Any% (No ACE) (RNG Manipulation)" (title and header). `<meta charset="utf-8">` added.
- "Partner’s Strategies" for the S screens (Lakilester's Strategies at Final Bowser matched the saved template in C and F:
  T2's plan and confirm came from it).

## Judged harmless
Duplighost lock 3.0 s (search 2.9 s, alt 0; replays the same; in time: re-reads until 7.5 s). The Hallway locks
(1.5-1.7 s). A's / B's first fight, T5 (the miss the runner reported): planned frame 181 at 58.5% (doubt 5%), confirmed on
180 (one frame early by the tracker's read): a 41% miss the plan stated, not a wrong seed (the T5 lock agreed with the
carry).

## Tests
`test_console_1108b.js` (new), `test_status_btns.js` (new), both in `run_suite.sh`. Version checks moved to v82
(test_dup_plan, test_jr_plan, test_console_1107 (+ the new name), test_hw_hp, test_hw_v77, test_lock_badge).

# Time Out Timer v81: the Jr. Troopa fixes merged, the lock badge, the route panel reordered (Nov 8)

Three things: branch `wt-jr` (the Jr. Troopa fixes from the console session of Nov 8, built on v79) merged into v80 (A);
the lock badge beside the strip (B); the route panel reordered (C). Both B and C were asked for by the runner.

## A. Jr. Troopa: the T3 Close Call that killed the seed, the T5 Charge "no Mario", the seed from the coin

(Built on v79 in branch `wt-jr` and merged into v80; the page code's own comments say "v80" for the test hooks.)

Console session 2026-11-08 (logs 1794153816860 and 1794154120837, clips 11-02-38 and 11-08-04; no video committed;
numbers in `../fixtures/console_1108.json`, checks in `../test_console_1108.js`, in `run_suite.sh`).

### 1. T3: "close call into turn 4, seed lost"
T3's Charge locked 5cde8fa6 q32 (the T1 carry agreed), the plan aimed at 189 (71%), the bar hide read the Bomb confirm
at 188, the runner got the Close Call, and at the next confirm the page dropped every state ("dropped 18.19, left 0").
- **Not the confirm frame**: on the clip the name box goes 2 game frames before the bar (confirm +2 / +4, as modelled),
  and the Bomb confirm is 200 +-1 game frames after the T3 Charge confirm (clock ~187): inside the -2..+1 read.
- **Not the HP read**: HP 3/10 before and after Jr. Troopa's attack (a dodge; Mario at 3 HP, not 2: the roll is the same).
- **Not the model**: from the lock, the Bomb confirms that dodge are 180-182, 187-189, 191, 192, 194, 202, ... (lag 0) and
  181-183, 188-190, ... (lag 1): 188 dodges in both, and 6 of the 8 states the page made (shifts -2..+1 x lag) dodge.
- **The cause: the state merge.** `zwUpdate` merges states with the same RNG state. The shifts -2..+1 meet in one RNG
  state after the roll (the roll and a coin draw swap places, the count of steps is the same) although their rolls differ;
  merged, each kept the first shift's outcome (-2: 186, a hit), so every state said hit. The outcome (`p.cc`) is now part
  of the merge key. (test_jr_plan never stepped the tracker between a Close Call confirm and its outcome, so it missed it.)
- **Recovery** (`jrRecover`): if a dodge still fits no state, the confirm is read again -4..+4 from the states before it
  (kept at the confirm) and the ones that dodge are kept, with the confirms since. Those are a reconstruction: half the
  weight goes to the background and no beep goes out until the heaviest state has matched 2 shines with none missed
  (`jrReconOk`; the page says "No edge yet"). Nothing dodges: no edge for the rest of the fight until a Charge locks.

### 2. T5: the Charge read said "no Mario" (NCC 0.47), never searched, was not kept
- Fed to the page from the clip (VP9, real time, the T5 step): 4 of 4 runs "no Mario" on v79 (NCC 0.40-0.48). The Mario
  check matches the reference (Mario standing, frame -1 of a Hallway clip) on frames -2..1 placed by time from the
  trigger picture. On this Charge Mario stood (0.93) until 183 ms before the trigger picture and was in the Charge pose
  (0.40-0.48) from 167 ms, i.e. on frames -2 and -1 as placed (T1 / T3 of the same fight: frame -1 standing, 0.94).
  The burst rises a frame or so later relative to Mario's pose here than the placement assumes; the rays still read.
- Now: when frames -2..1 miss him, every new picture from 9 frames before the trigger picture to 1 after it is tried
  (`chgMarioWide`); a faint Mario (0.3..0.5) after a burst that kept the Charge's shape is searched anyway (logged
  `chargeMarioWeak`; same score and ratio thresholds). Clip-fed with this: 2 of 3 runs locked **89f7812e** (q 9 / 10),
  1 placement no-lock whose retry this loaded machine had no time for (search 5 s here, 1.5 s live). The T3 carry (with
  both dodges) agrees with 89f7812e at the T5 Charge confirm (8816..8821, the log's 8819).
- A "no Mario" read is now kept like any other (session log and browser store, with its pictures, outcome `notseen`;
  the pictures the wider check reads are kept too) and replays as it ran. "No burst" (no Charge seen at all within 1 s
  of the bar hiding) still keeps nothing: there is no Charge to rewatch, only the last 16 pictures.

### 3. The seed found again from the coin (`jrShineSearch`)
With the tracker dead and a good Charge lock earlier in the fight, every RNG position since that lock (bounded: frames
since its frame 0, a coin draw every 24-48 frames, 1.5 x the modelled inputs' draws, +300) x the first shine's coin frame
x the confirm shifts in the stretch is simulated over the shines seen since (with the inputs' events); a position must
explain every shine and show none where the coin was watched. Positions a few steps apart explain the same shines: one
cluster of them (at most 12 states) restarts the tracker, when the expected number of wrong clusters (positions tried x
0.18^shines, the rate measured on this log) is under 0.5; that share is the tracker's doubt (at least 10%), and zwPlan's
doubt and edge rules decide the beeps. Otherwise no edge. On this log (the tracker killed as v79 did):
- T4's menu (252 s, 78 shines): found on its 5th shine (1566144, 11 s into the menu); the carry from there agrees with
  the clip-fed T5 lock 89f7812e. T4's Syrup would have been planned.
- T5 / T6 menus only: two clusters at 5 shines (no edge), one from the 6th, restarted on the 7th (1848542; 5 states,
  doubt 15%); the true states (carried with every shine: c5a92300 / d6573893 at frame 9467) are among them; T6 Power
  Bounce plans frame 9500 (5+ 74%, 6+ 47%) against the runner's press at 9520: in time if the runner waits for the beep.
- A lock from another seed finds nothing.

### Tests
`test_console_1108.js` (new, in `run_suite.sh`): the dodge frames, the merge, the recovery and its gate, no edge, the
coin search (both stretches, the wrong seed), the wider / faint Mario check and the kept "not seen" read on pictures made
in the test. `test_jr_plan.js`, `test_console_1107.js`: unchanged results. `test_jr_page.js` needs emulator renders: not run.

## B. The lock badge (the runner: "an obvious indication if the seed is locked or not ... near the input timing window")
`#lock-badge` sits in the strip's header row, between the countdown and Zoom. It is always present, with a fixed
184 x 54 px box (`.lockb`). A state change only recolours it and changes its text, so the strip never moves
(`test_strip_steady`, `test_strip_geometry`). The countdown's reserved width went from 5em to 4.6em so that the header row
still fits on one line at the main column's 880 px ("12.3 s" still fits). It has a large display font and solid colours
with light text (amber has dark text), using its own tokens (`--lock-ok/no/doubt`), which are brighter in dark mode. A
second line under the word says why. `lockBadgeState()` reads the existing state, in this order:
- **Final Bowser T1-T4 step** (FB14): green **LOCKED** while FB14 carries states; amber **DOUBTFUL** at `FB14.doubt` >= 50%;
  red **NOT LOCKED** without a lock.
- **Final Bowser T7 step** (FB2, the T6 Charge): green while FB2 holds hypotheses, else red.
- **The Charge-lock / walk tracker** (`zw`, on): red if dead (no state left: "seed lost"); amber when `zwDoubt()` >= 50%
  (the same doubt at which zwPlan stops beeping), or on Jr. Troopa when the states were rebuilt by the -4..+4 re-read and
  are not yet confirmed (`JRT.recon` and not `jrReconOk()`), or were found again from the coin and the heaviest has not yet
  matched 2 shines since the restart (`jrShineRecOk()`, new, badge only: the beeps keep zwPlan's rules); else green.
- **Jr. Troopa carry broken** (the Life Shroom revive) on a Jr. Troopa step: red.
- **The shine lock** (`st.lock` with a clock): green; a lost shine lock that is resyncing: red.
- Otherwise red ("no seed", "no Charge lock", "Charge not seen").
`JRT.shineRec` is now cleared when a new Charge locks. Nothing is logged for the badge.

## C. The route panel (the runner: "reset route at the top, directly below it the four fights, then everything else")
The right-hand panel now runs, from the top:
1. the heading;
2. ◀ ▶ **Restart route**;
3. the route list (one "Tn:" line per turn, the current step highlighted);
4. a **Details** `<details>` holding the Zero-wait route instructions, `chg-status`, `fb14-status`, `fb2-status`,
   `walk-counter`, `walk-last` and `carry-note`, in that order. It is closed by default and its open / closed state is
   remembered in localStorage (`tot-route-details`, try/catch).
The step hint line and the Duplighosts / Jr. Troopa route choices come after it. Everything was moved, nothing removed;
ids, texts and logging are unchanged.

## Tests
- `test_lock_badge.js` (new, in `run_suite.sh`) checks, 35 checks in all:
  - every badge state: fresh, shine lock, Charge lock, doubt 55%, dead, Jr. rebuilt, Jr. found again, tracker off, FB14
    without a lock / locked / doubt, FB2 without a lock / locked;
  - that neither the badge's box nor the strip's moves across them;
  - size, colours, and contrast of 4.5 or more;
  - the panel's order, Details' contents, and the open / closed state across reloads.
- `test_dup_plan` and `test_jr_plan` read `chg-status` by `textContent` (it is inside the closed Details now).
- Version checks moved to v81: test_dup_plan, test_jr_plan, test_console_1107, test_hw_hp, test_hw_v77.

# Time Out Timer v80: the Duplighosts goal, 3+ safe or all 4 (Nov 8)

**Console (log v79, 3427d390):** Charge lock 90cc08aa, q8, ~2.9 s after the rays; plan `dup3` (best) 3+ 0.88, all 4 0.21;
the press 0.38 frames early, inside the window: **3 of 4 copies**. The runner's press errors in Settings: -2.34, -2.98,
-1.77, -1.31, -0.81, +1.94, +0.40, -1.07 (rms 1.77, mean -0.99). The runner: *"If there is ever a 2 frame window for 4
transform it should probably try to lock onto that. But the 3 transform safety window is tempting as well."*

**Measured** (`scratchpad/v80/gen.js` + `an.js`, not committed: 2000 random Charge-locked seeds, q 0..47, the tracker's two
states lag 0 / 1 at 0.75 / 0.25 exactly as `test_dup_plan` starts them, Strategies on clock 150, lead 1.5 s, max extra
wait 1 s = 30 frames; truth "mix" = lag 0 75% / lag 1 25%, "lag 0" = test_dup_plan's truth; the plan uses the spread it
is scored with; "runner" = the page's `pressDist()` for rms 1.77, a normal over -4..+4):
- a **2+ frame all-4 window** is in reach on **36.0%** of seeds (lag-0 truth). Of those only **15.9%** have 3+ on both
  frames either side of the run (3.5% two frames either side): all-4 runs mostly sit in 2-copy surroundings, so aiming at
  one costs the 3+ safety around it.

| P(3+) / P(4), truth mix | 25/50/25 | runner rms 1.77 | runner's 8 presses as measured (bias -1) |
|---|---|---|---|
| 3+ first (v79 = lexicographic, tol 0.02) | 95.6 / 34.9 | 78.7 / 22.1 | 75.8 / 20.3 |
| lexicographic tol 0 | 95.6 / 34.9 | 79.0 / 20.1 | 75.6 / 18.8 |
| lexicographic tol 0.03 | 95.6 / 34.9 | 78.5 / 22.9 | 75.4 / 20.8 |
| lexicographic tol 0.05 | 95.6 / 34.9 | 77.6 / 24.7 | 74.3 / 21.7 |
| lexicographic tol 0.08 | 93.8 / 43.0 | 76.3 / 26.6 | 72.8 / 23.0 |
| lexicographic tol 0.15 | 92.8 / 44.5 | 73.1 / 30.2 | 69.2 / 25.5 |
| 4 if 2+ frame window (the runner's rule) | 91.4 / 44.8 | 73.5 / 29.1 | 70.0 / 25.6 |
| 4 first | 81.1 / 57.4 | 62.7 / 37.1 | 59.7 / 31.9 |

(Lag-0 truth: 97.1 / 36.1, 79.2 / 22.3 for 3+ first; 92.7 / 45.9, 74.0 / 29.4 for the 2+ rule; 82.7 / 60.5, 63.0 / 37.6
for 4 first. With 25/50/25 the claimed 3+ moves in steps of 0.0625, so every tolerance under that is the same plan; the
0.08 step "costs nothing" on lag-0 truth only because it gives up the lag-1 state.) The 2+ rule moves the target on 26% /
31% of plans; on those it gives 3+ 82.7 / 66.8% and all 4 76.0 / 48.5% against 98.7 / 83.6% and 37.8 / 26.0% for 3+ first
(25/50/25 / runner).

**Choice.** v79's rule already was lexicographic (the best 3+ frame, all 4 within 2 points). With the runner's spread each
step of tolerance trades 3+ for all 4 at about 1 : 4 up to 0.03 (vs v79), 1 : 2 to 0.05, 1 : 1.5 to 0.08; with the runner's real
presses (bias -1) beyond 0.03 it loses more 3+ than it gains all 4. 3 and 4 copies both end the fight on T2, so **the
default tolerance is 0.03** (at most 3 points of claimed 3+ per plan; on average -0.2 / +0.8 points).

**Settings → Advanced → Duplighosts goal** (`s-dupgoal`, `dupGoal()`, `DUP_TOL` in `zwChoose`; Duplighosts only, the
Jr. Troopa Power Bounce 5+ / 6+ keeps 0.02):
- **4 when it's free** (default): the lexicographic rule, tolerance 0.03.
- **3+ safe**: v79 (tolerance 0.02).
- **4 if 2+ frame window**: the best frame of a 2+ frame all-4 run that most states agree on, if one is in reach and its
  3+ chance clears "beep only from"; else 3+ safe.
The strip, the headline and the Charge panel show the beeped frame's 3+ and all-4 chances as before (no new line); the
plan log's `mix.goal` says which goal chose it. Doubt, no edge (on the target's 3+), the HP fallback, the re-score
("Seed changed") and the blind texts are unchanged.

**Tests.** `test_dup_plan.js` section 6: the setting (default, three options, the plan follows it); on the 40 fixture
cases and 300 random seeds with 25/50/25 and the runner's spread: "4 when it's free" never gives up more than 3 claimed
points of 3+ nor any all 4 against 3+ safe; "4 if 2+" moves only onto a 2+ run; on the random seeds 3+ safe >= free
(within 1 point) >= 2+ for 3+, and 2+ > free >= safe for all 4 (300 seeds: 81.1 / 22.6, 80.8 / 23.3, 75.2 / 29.9 with the
runner's spread). Version checks moved to v80 (test_dup_plan, test_jr_plan, test_console_1107, test_hw_hp, test_hw_v77).
Not verified on console: whether the runner's presses tighten when aimed at a 2-frame window.

# Time Out Timer v79: the Close Call lever removed; Mario's HP kept in the Hallway model (Nov 8)

**Removed at the runner's request.** v78's beeped Lakilester Spiny Flip throw on Hallway Bowser T1 (to make Bowser's Close
Call land at 3 HP) is gone: the Close Call must be 100% or nothing, and one timed throw cannot promise that (v78's model gave
72%). Removed: the throw beep and its plan, the aim popup as target screen "A", the optional throw route step, the throw's
status line and strip text, `TURNS.hw_throw`, the `hwcc` profile, `hw3_popupcap.py`, `test_hw_cc_plan.js`,
`test_hw_cc_page.js`. The Hallway T1 route step is v77's again: one "T1:" line, Spiny Flip impact frames 138..170 open.
The runner has since confirmed that Mario is **above 5 HP** on Hallway T1 on the route, so normally there is no roll.

**Kept: the HP-aware model** (`pmrng_core.js` `bowserT1(..., danger)`, `test_hw_cc_model.js` 7/7 against the emulator; the
impact is now given as `hw_spiny imp`). At 5 HP or less every Bowser T1 attack rolls Close Call (rand_int(100) at
0x80277518) at AI + 54 / 70 / 55; a miss draws nothing more to T2's menu; a hit kills Mario. `charge_live/hwcc_live.js` is
now only this model's page side:
- **The route's states are v77's.** The tracker's states (`zw.parts`) are split exactly as v77 split them, and Time Out on T2
  is planned from them exactly as v77 did (`test_hw_v77.js`: v77 built from git with test hooks only, the same games through
  both pages, every plan identical at 10 HP).
- **The roll is a fallback**, carried beside them (`zw.shadow`: same lock, impact frames, confirm shifts; guard irrelevant;
  the states whose roll hits are dropped, since Mario alive on T2 means the miss). It is weighed by the same coin but never
  enters the strip, the doubt or the merges.
- **Mario's HP** (status bar tens place in T1, `jrTens`; the units are not read, so 5 HP or less is never known for sure):
  - a "1" = 10 HP: no fallback at all.
  - not read, or mixed reads: the route's HP (above 5) is assumed; the roll states at prior odds 0.1.
  - blank = 1-9 HP: the route's 6-9 (no roll) or 5 or less off the route (roll): prior odds 0.3.
  - a "1" on a steady bar in Bowser's turn (before a revive could show) drops the fallback.
- **No confident beep on a guessed HP.** While the roll states hold under 5% of the weight the v77 plan stands. From 5% the
  beeped frame must work under both (`zwedge`), else "no edge"; from 50% (the coin fits the roll better than the route) it is
  no edge whatever the frame.
- **Life Shroom**: a "1" on the bar after the last possible roll or hit (confirm + 360) = Mario died and was revived; the
  tracker stops and Time Out says no edge (as v78).

Tests: `test_hw_hp.js` (the read, both hypotheses carried, no hit kept, no beep that fails under one hypothesis while both
carry weight, "no edge" on disagreement, the late 10 HP read, the revive), `test_hw_v77.js` (v79 = v77 at 10 HP; HP not read:
v77's plan or, rarely, no edge for the HP), `test_hw_carry.js` now fails when a case does not plan. Step / route tests are
v77's again; version checks moved to v79. Not verified on console: the tens read in the Hallway.

# Time Out Timer v78: Hallway T1 at 3 HP, the Spiny Flip throw beeped for Close Call (Nov 8)

The runner comes into the Hallway at **3 HP**. Every attack of Bowser's first turn then rolls Close Call first
(`rand_int(100) < 30`, caller 0x80277518, `1A5830.c`: only under 6 HP), and a hit kills Mario (Bowser does 5+ damage).
So the attempt goes on only on a Close Call. v78 adds a beep that makes the Close Call happen, using the T1 Charge lock.

## 1. The model at 3 HP (emulator, `bot1/_hw3log.py`; `fixtures/hw3_logs.json`; `test_hw_cc_model.js`)
- 17 runs from `boss_2302_route_menu.st`, with Mario's HP written to 3 and chosen seeds (both DIAGNOSTIC RAM writes),
  random menu delays, and the Spiny Flip thrown with A on a chosen frame. In 7 runs the Spiny hit Bowser (the route). In the
  other 10 the reticle was off Bowser: there is no impact, and Bowser's AI comes at throw + 72. Those runs are off the
  route and are only listed.
- **Nothing else changes at 3 HP.** From the Charge confirm to the roll, every frame matches the 10-HP model: the Charge,
  the aim sparkle, and the impact's 8 x rand(359). There are no Danger idle draws.
- **The throw is the impact.** `lakilester.c` SpinyFlipActionCommand: A ends the aim; otherwise the 80-frame timer does.
  The impact comes at throw + 24 (Wait 3 + JumpPartTo 20), and Bowser's AI (RandInt 80 / 60) at throw + 68.
- **The roll** comes at AI + 54 (Body Slam), + 70 (Claw Swipe) or + 55 (Fire Breath). The guard comes after the roll and
  changes nothing.
  - Lucky: the attack misses, and nothing more is drawn up to T2's menu. Measured on Claw Swipe x1 and Fire Breath x2.
    Body Slam's miss branch has no random call in the script.
  - Hit: Mario dies (Game Over in this state, or a Life Shroom revive). The revive is not modelled.
- Core (`pmrng_core.js`): `bowserT1(..., danger)` schedules the roll (`S.ccAt`, then `S.cc = {f, v, lucky}`; on a hit,
  `S.ccHit` and `S.unknown`). New turn `hw_throw` (impact + 24, AI + 44 after it). `hw_spiny` without `imp` is now the aim
  sparkle alone. `test_hw_cc_model.js`: **7 / 7 route runs match on every frame.** That covers 3 Lucky runs (to T2's menu)
  and 4 hits (to the roll), with each roll value equal to the game's. From one state, throws at +55..+114 give 15 / 60
  Lucky in scattered runs of 1-3 frames, so the throw frame decides the roll.

## 2. Q1, the lever: the throw (A), not the Spiny Flip menu confirm
- With the throw unknown, the roll moves with the impact frame: 33 frames held, 136 thrown with A. Any confirm frame
  would then give about the blind 30%.
- The runner presses the throw, and the page can read it: Lakilester's aim popup ("stick で … をねらおう!") vanishes on
  the throw's own frame. On Glide64 it vanishes 2 frames before the target menus' name box does after their confirm
  (`HWCC_VAN` 0). It is a static banner from confirm + ~4 until the throw: target screen **A**, its box on the right half
  of the text (the stick icon at its left is animated).
- A new route step after the Spiny Flip: "Throw (A) on the beep → Close Call" (cat A, prof `hwcc`, turn `hw_throw`,
  optional). It shares the one "T1:" route line with the Spiny Flip step, like Final Bowser T1.

**The page** (`charge_live/hwcc_live.js`):
- **At the Spiny Flip confirm** the tracker's particles take the aim sparkle and wait (`hold`) before the earliest A-throw
  impact (confirm + 58).
- **On the aim popup**, `hwccPlan` simulates the roll of the 64 heaviest states for every throw frame. It uses the
  window confirm + 55..+114, the lead and the max extra wait. +55: the reticle needs ~12-15 frames to reach Bowser from the
  aim's start, which is confirm + 39 at the earliest. +114: the timer ends at + 119 at the earliest. It then picks with
  `zwChoose` (press spread, doubt, blind 30 / 101) and beeps.
- **The popup closing is the throw**, read to +-2 frames (`HWCC_SHIFTS`). The impact and Bowser's turn go in at that
  frame. The guard is not split at 3 HP.
- **When nothing is beeped**, the page says no edge or play it blind ("throw whenever you like, Close Call about 30%").
  This covers no lock, doubt of 50% or more, a lock too late for the window, and a plan under `zwedge`.
  - **10 HP:** the status bar's tens place shows a "1" (`jrTens`, read on the T1 menu). There is no roll, so the 10-HP
    model is used and nothing is beeped. A blank tens place, or no HP read, means Danger (the route's 3 HP).
  - **A throw seen before the lock** goes in when the lock lands (`hwccAfterLock`).
  - **No throw read** (the popup not saved, or missed): the step is left when the status bar comes back in Bowser's turn,
    or on Time Out's screen. The impact frames stay open (`CHG_IMPS` from + 60), as before.

## 3. Q2, the odds
**Model with the exact lock** (`test_hw_cc_plan.js`, built page, 60 games). The games use console lag 0 / 1, the confirm
read with `CHG_SHIFTS` and the throw read +-2. The plan uses lead 1.5 s, max extra wait 1 s and presses 25/50/25 over
-1/0/+1, as in the Jr. Troopa and Final Bowser plans.

| Measure | Close Call |
|---|---|
| Blind | 30.1% |
| Beeped, claimed by the page | 76.3% |
| Beeped, actual (model) | **72.1%** |

- 43 of 45 Danger games beeped. The other 2 showed no edge.
- Offline (`pmrng_core` only, the true state x confirm shifts), a 31-frame window: 79% with 25/50/25 presses, 55% with the
  runner's measured spread (rms 2.3 frames, `pressDist`).
- A 60-frame window: 87% / 61%.

## 4. Q3, timing
- On the 14 console clips, the Spiny Flip confirm comes 3.30-3.52 s after the rays.
- The throw window then runs from confirm + 55 (≈ 5.2 s after the rays) to + 114 (≈ 7.2 s).
- With the 1.5 s lead:
  - a lock up to ≈ 4.75 s after the rays keeps the whole 1 s window;
  - a lock up to ≈ 6.2 s still leaves part of it;
  - a later lock gets "too late for the beeps".
- Measured locks: Hallway locks in v77 come about 3-4 s after the rays, and the v72-era clip runs locked 4.2-6.3 s after.
  So most attempts fit.
- If the lock is late, the runner can wait on Lakilester's menu until "Locked". A throw on the beep costs at most the max
  extra wait plus ~0.3 s over the runner's own throw (on the clip, ~confirm + 45-50).

## 5. Q4, Time Out on T2
- A Close Call changes the draws (the roll itself, then nothing more drawn), so the tracker models the miss branch:
  - The states whose roll hits are dropped as they roll (`zwStep` returns 'hit').
  - Once all have rolled, the background is weighed once by a blind Close Call (`zw.ccPend`), so the survivors do not
    look doubtful.
  - The throw read also removes the impact frames that v77 kept open.
- **Death watch.** After the throw, a "1" in the tens place on a steady bar for 6 frames means a Life Shroom revive at
  10 HP. The tracker stops, and Time Out says no edge.
- `test_hw_cc_plan.js`. The T2 menu's coin is watched for 1.5 s from roll + 135 (its shines tapped), then Time Out's
  screen. Each case runs the same game through the v77 tracker as well (the route switched off at the confirm: the old
  impact split, no Close Call draw in the model):

| Case | v78 | v77 tracker |
|---|---|---|
| Miss path, 3 HP, 30 games | **80.0% actual (81.2% claimed)**, planned every time | 60.0% (its model lacks the roll's draw) |
| 10 HP, 15 games | 58.3% actual (68.4% claimed) | 53.3% |

Blind Time Out is 31%. So Time Out reliability does not drop: at 3 HP v77 was planning on the wrong draw count.

## 6. Q5, other effects of 3 HP
None before the roll: the 7 runs match from the Charge on, including the Danger animation. The guard does not matter on
either branch at 3 HP.

## Tests
- `test_hw_cc_model.js` (emulator logs, 7 / 7).
- `test_hw_cc_plan.js` (the odds and the Time Out tables above, including Time Out on the Close Call miss path).
- `test_hw_cc_page.js` (route glue):
  - the one T1 line, the throw step, the plan inside the window, and the popup closing read as the throw;
  - only Close Call states after the roll;
  - the Life Shroom death watch, the popup-never-seen fallback, 10 HP, and no lock.
- Updated for the throw step: `test_hw_steps.js`, `test_turn_backout.js`, `charge_live/test_route_replay.js` (Time Out's
  step by `prof === 'timeout'`).
- Version checks moved to v78: `test_dup_plan`, `test_jr_plan`, `test_console_1107`.

## Not verified on console
- The aim popup's vanish delay on the capture chain (emulator 0 frames; the read is carried +-2).
- The popup as a target screen, while the stick icon animates beside the box.
- The runner reaching Bowser by confirm + 55, and holding the reticle on him until the beep. A throw with the reticle off
  Bowser is not the route: no impact, and the AI at + 72.
- The HP tens read in the Hallway at 3 HP and after a revive.
- A Body Slam Close Call: no draws in the script, but not observed.
- Whether the runner carries a Life Shroom here. Without one, a hit is Game Over.

# Time Out Timer v77: every Charge read kept, compact; the re-read goes on while there is time (Nov 8)

## 1. Every read kept (`charge_reads.js`)
v76 kept a Charge's pictures only on a no-lock (the last 2, 640x480 JPEG q0.92 of the placed frames, ~2.9 MB in the log
each: log 54e25740) and the re-reads were not kept at all. v77 keeps **every read the page searched** (lock, no-lock,
and every re-read of the same pictures), one record per read, made when the read ends:
- the capture pictures from the ring before the trigger to the end of the rays: each picture's time (from the trigger
  picture), brightness and new-game-frame flag; the trigger (picture, frame, level, menu level, the frame cuts), the
  bar hide, the menu coin stretch, the arena reading and the profile, the route step;
- every placement tried: its game frame -> picture table, shift / bans / forced skip, time after the rays, the search
  time, best seed / q / score / ratio and the stage-1 bests; the result (lock or not, seed, q kept) and `info` as logged;
- the FB2 T6 narrowed search's candidate seeds when it ran (base64 uint32).

**Compact.** Stored pictures: only those a placement can use (the new game frames from the trigger on, and those that
can be frames -2..2 by time for any trigger frame 3-5), each the 640x480 game raster cropped to the battle viewport plus
the ridge filter's reach (raster x 22..617, y 38..441: every ray sample of `chgMaps` and Mario's patch), greyscale WebP
quality 0.1 (JPEG 0.85 where the browser cannot write WebP). The new-frame flags are stored, so the placement replays as
it ran whatever the compression did. Measured on the frame-fed 15-15-06 Hallway read, all from one lossless copy:

| form | KB per read | replayed lock (seed q, score, ratio) |
|---|---|---|
| lossless PNG 640x480 | 13062 | cf5894f0 q19, 5843, 3.81x (= live) |
| WebP q 0.8 / 0.6 / 0.4 (crop) | 972 / 711 / 584 | 5815 / 5858 / 5802 |
| **WebP q 0.1 (crop): v77** | **370** | **cf5894f0 q19, 5621, 3.90x** |
| WebP q 0.05 / 0 | 328 / 207 | 5526 / 4673 |
| 320x240 (2x2 mean) WebP q 0.95 / 0.5 | 916 / 316 | 4854 / 4786 (-17% at any quality) |
| VP9 video (WebCodecs) q 40 / 30 | 270 / 469 | 5660 / 5769 |

Half resolution costs a sixth of the score at any quality; video coding gains little (the capture noise, not the
static background, is what costs). The 54e25740 capture: 2862 KB -> 345 KB (45 pictures); its no-lock replays to the
same outcome (best 2a508e80 1602 1.11x as logged live 1590; compact 2a508e80 1454 1.06x). A no-lock's best is at the
noise level: any change to the pictures can move it (WebP q 0.6 moved it to another seed), so the outcome is what is
compared there.

**Where.** This session's last 20 reads in memory, in Download session log (`chargeCaptures`; the button's tooltip says
how many and the size, ~0.35 MB each, ~7 MB at 20). Every read also goes to IndexedDB (database `tot-charge-reads`,
stores `reads` + `meta`; all calls in try/catch), rolling: the last 50 reads, at most 100 MB, so a refresh or a crash
keeps them. Settings > Advanced: **Download saved Charge reads** (one JSON, `chargeCaptures` as in a session log) and
**Clear saved Charge reads** (two clicks; clears the store and the session's list), with the count and size shown.
Nothing is sent anywhere. The encoding runs after the read ends (a picture per task) so it never delays the lock.

**Replay.** `chgReplay(cap, opts)` (page, `window.__tot.chgReplay`) decodes the pictures, rebuilds the capture and runs
the page's own placement, search and re-reads (no clock unless `opts.clock`); v76 captures replay with their placed
frames fixed (`chgCapFromV1` converts one). `tools/capture_u8.py` reads both forms (v2: the placement of a chosen
attempt) for the offline harnesses.

## 2. The re-read: until a lock or until the beep lead would be missed
v76 gave up after 2-4 re-reads / 6-9 s (`CHG_ALTS`, `altMs`). v77 has no count (40 at most): another placement is
searched while it would end (as long as the last search took) before `chgLockBy` = `CHG_PRESS` - the beep lead
(`earliestPress`: lead, or the beeps' span + margin). `CHG_PRESS`, ms after the rays, the latest press the lock serves:
Hallway 11800 + lead + max extra wait (Time Out's target screen shows 11.8-12.6 s after the rays on every clip), so a
lock up to 12.8 s after the rays at the defaults (v76 stopped starting re-reads at 9 s); Duplighosts 9000, Jr. Troopa
12000, Final Bowser T1-T4 15000 (the v76 limits plus a search and the default lead): 7.5 / 10.5 / 13.5 s. The
placements, each new (one already searched is skipped at no cost): the profile's shift alternatives (Final Bowser
T1-T4), the last placement's skips banned, a skip forced at frames 13, 9, 17, 21, 11, 15, 7, 19, 23, 25, 5, 27-35, then
every picture one frame earlier / later. Each runs in a task of its own (the search in workers as before). Logged:
`chargeRetry` (alt, shift / bans / forced, at ms after the rays, lockByMs), `chargeNoLock` per attempt,
`chargeRetryStop` (why: time or no other placement), `chargeReadKept` (kb, pictures, attempts). FB2 T6 (the full
search) still has no re-read.

## Tests
`test_capture_replay.js` (in `run_suite.sh`): A. the 54e25740 capture replays as logged, and compact (345 KB) to the same
outcome; B. the 15-15-06 clip fed frame by frame locks cf5894f0 live, the read is kept (compact 370 KB, lossless 13 MB),
both replay to the same lock and q, it is in IndexedDB and still there after a reload (and replays from there), the
log button's tooltip says it; C. the read replayed with its first placement forced wrong no-locks, the re-read locks
cf5894f0; with beeps no lock could meet, it stops after the first ("time"); Clear empties the store.

# Time Out Timer v76: the first console session of the Charge-lock routes, analysed (Nov 7)

Data: the runner's v73 OBS file, 2026-11-07, S-Video -> GV-USB2 -> OBS 1280x720 60 fps; 4 Duplighost clips, 2 Jr. Troopa
clips (one fight), 2 Hallway clips, 1 Final Bowser clip, and the session logs. Frames were read off the clips in /dev/shm
(no video committed); the numbers are in `../fixtures/console_1107.json`, the checks in `../test_console_1107.js`
(in `run_suite.sh`). **The recordings have no input display** (the OBS recording does not carry it), so no A press is
seen directly; confirm frames come from the picture and from the copies / outcomes run through the emulator-checked models.

## 1. Duplighosts: the locks were right, the presses really were early
| clip | lock (q) | aimed (clock) | press read | copies seen | model at the frame read (q) |
|---|---|---|---|---|---|
| 11-24-29 | 55ee0a3f (5, 6) | 197 | -2.34 | F F C C (2) | F F C C at the frame read (q 5): **failed, 2 frames early** |
| 11-29-59 | b72e7914 (8-10) | 178 | -1.77 | C C C F (3) | C C C F at the frame read (q 8) or +1 (q 9) |
| 11-30-55 | 46f90976 (1, 2) | 193 | -1.31 | C C C C (4) | C C C C at the frame read (q 1) or +1 (q 2) |
| 11-31-51 | f0045c35 (18) | 192 | -0.81 | C C C F (3) | C C C F one frame after the frame read |
Every outcome is the model's within one frame of the frame the page read: the locks (seed and first coin) were right.
3 of 4 attempts succeeded (3+ copies); the page said "works: false" for two of them (one frame off its read).
**The Strategies box offset is 3 frames on console too**: every clip shows one highlighted frame (the box redrawn, the
help text gone), then the box gone on the next game frame, as the emulator does on confirm + 2 / + 3 (glide64 run here);
the page's screenClosed is that frame in all four. The residual (true frame minus the frame read) is +0.3, -0.2 / +0.8,
+0.3 / +1.3 and +0.8: the Charge clock's own placement (the burst places it to about a frame; the Jr. Troopa T5 lock in
the same session is off the other way, -0.9, on two independent presses). No change to VAN.S / dup3 vanish: shifting it
would mis-read Jr. Troopa's T5 Do Nothing (same screen). The presses on Bombette's screen averaged about -1.5 frames
(Hallway about 0): the runner's, on this screen.

## 2. Route and plan fixes
- A Duplighost Charge on a Jr. Troopa step (a retry after Do Nothing moved the route on) now moves the route back to the
  Duplighosts (`chgArenaProf`); Jr. Troopa's arena on console reads B - R -1.5 .. -2.8 low, never the Duplighost rule (> +2).
- On the Charge-lock route the Duplighosts are planned only from their Charge tracker: a walk coin lock (t=579423, three
  plans and a beeped press) no longer plans Do Nothing.
- No new plan once the runner may have pressed: an expired plan is not replaced while the bar is hidden since it was made
  (Jr. Troopa T3: a jrcc_bomb plan with new beeps went out 272 ms after the confirm's bar hide, before the hide was counted).
- Final Bowser T1-T4: a Charge burst moves the route (T1's Charge step -> Cloud Nine; a later burst on a lever step, 8 s+
  after that turn's, -> the next Charge's turn; a burst on T3 -> T4), and the reader arms again after each lock. The clip:
  the route sat on T1's Charge step for the whole fight (the Mario target screen was never saved), the T1 lock came
  5.4 s after the rays (after Cloud Nine), and T2's Charge was never read (reader still 'locked'): no plan at all.
- The fb1 shift retries start on the side of the frame cut the trigger level is near (+15.8 under the 4/5 cut 16.5 is
  tried as frame 5 first: the console lock was the -1 shift, on the 2nd retry).
- The page's version string was stale (v74 / v75 logs said "v73"): one VERSION, shown in the header.
- Layout: the status panel is below the strip and the countdown always takes its space, so nothing above the strip changes
  height (desktop and 390 px checked); the route list shows one "N. Tn: actions" line per turn (labels in the tooltip).

## 3. Jr. Troopa (clips 11-33-12 + 11-34-33, log t=881-978 s)
T1 Charge (retry 1), T2 Bomb + Whacka (the route's T2; Whacka's Bump healed 25), T3 Charge + Bomb: Jr. Troopa hit, death,
Life Shroom (as logged). T4 is between the clips. T5 Do Nothing: Lucky. T6 Power Bounce: 6 bounces (fight over).
- T3: the plan (from the T1 carry, 50%) aimed at about frame 214 from the T3 Charge; the bar hide puts the press 0.7
  frames before the aimed one. The T3 lock (fefafd47, 1.8 s before the beep) gives no Close Call at 214 / 215 and Lucky at
  213: the press landed on 214 (death), as planned. The late plan (918758) came after the press and changed nothing; it
  is now held (section 2).
- T5 / T6 from the T5 lock: Lucky needs 302 or 304 (read 302.9), 6 bounces needs 486 or 488 (read 486.9): both agree on
  a clock about 1 frame off, the outcomes fit.
- The route list steps (2->3 Whacka, 3->4 T3 Bomb, 4->5 T4 Syrup, 5->6 Do Nothing, 6->7 Power Bounce) match the turns.

## 5. Final Bowser logs 1794070564756 and 1794071163309 (v74/v75 builds; their "page" said v73: fixed)
- 11:55 clip: T1 Charge read on the 2nd retry (shift -1, 5.4 s after the rays, after Cloud Nine); Cloud Nine pressed
  with no plan; Bowser's fire breath hit (death, Life Shroom); T2 Charge burst never read (route stuck on T1's Charge step,
  reader 'locked'). Fixed by the burst-driven steps and the re-arm (section 2).
- 1794071163309 attempt A (t 2546-2620 s): **no lock in that attempt.** The runner was off-route (Life Shroom on T1, no
  block on T2, Life Shroom on T3) and no Charge was read: the reader was still 'locked' from the 11:55 attempt, whose T1
  states (5 minutes old) the page still carried, so the coin ruled out all of them at T2 (fb14AllOut) and the page said
  no edge, doubt 1, to the end. Now: the reader re-arms after each lock, a Charge 120 s+ after the last one starts a new
  attempt (fb14Reset), and when every state is ruled out the page says the carried seed is gone because the turn did not
  fit the route and drops the carry, so the next Charge locks afresh. The T6 Charge (fb2, chargeEarly) did not lock: not
  investigated.
- Attempt B (t 2801-2842 s): the replan storm. fb14Tick re-scored a plan over press offsets -1..+1 only while fb14Plan
  used the runner's pressDist() (-4..+4, sd ~1.5): every re-score read ~0.6 x the plan's chance and replanned the same frame
  every 250 ms (37 plans; the runner still confirmed at -0.5). Now the tick uses the plan's press spread and states sample,
  and a replan that lands on the same frame keeps the scheduled beeps. The Hallway / Jr. Troopa / Duplighost re-score
  (zwPlanChance) already used the full spread and the same state list. In attempt B the step was also one ahead of the
  fight (set by hand to the Cloud Nine step before the T1 Charge), so T2's plan was for Cloud Nine's press: the
  burst-driven steps make the hand setting unnecessary.
- The page is renamed "Paper Mario (Any% No ACE) (RNG Manipulation)" (title, header, tag line; the OBS file saves as
  pm-rng-manipulation.html, the log as pm-rng-log-*.json; build paths unchanged).

## 4. Not settled
- Charge read retries: Duplighosts 4/6 first try, Jr. Troopa 0/3, Hallway 1/2, Final Bowser 0/1. No link to the raw
  picture count (73-100) or the trigger level (all within the frame-3 band but Final Bowser); the retries are skip-ban
  placements (dup / jr) and the shift (fb1). Needs the session's chargeCaptures (the log keeps none) to replay.
- An input display in the recording would measure the A-to-screen delays directly.

# Time Out Timer v75: Final Bowser T1-T4 carry and the T6 narrowed lock, fixed and run end to end (Nov 7)

The two known problems of v74, reproduced first on the end-to-end renders (`fb2_route/fb14_e2e.py`, seed 1234abcd from
T1 and 5eed0fb2 from T4; Glide64 -> `t6_capsim.py` -> the page, **fed in real time: a picture more than 25 ms late is
dropped**, 3 workers on this 4-core machine), then fixed and run again.

## 1. The T1 -> T2 carry
**Reproduced.** The T1 lock found the true seed and first coin, but none of the states held the true aura pattern. Three
causes, measured with the emulator's own seed on every frame (`truth.json` of the run):
- **The burst's level puts the trigger picture a frame off.** Over this arena frame 2 read +6.5 above the menu (the curve
  says 3.4), so the trigger (6.1) was taken as frame 3: every picture a frame late. The seed still locked (7101 at
  2.7x) while the aura fit bent to absorb the frame, and the clock ran a frame off.
- **One Charge's rays do not pin the pattern.** With the frames right, the true pattern scores 7316 against the best
  fit's 7354 (0.5% below; one frame's respawn noise is ~200), outside v74's 0.2% and outside every split `fb1alts` gave.
- **The T2 Charge's confirm is placed to +-1 frame** (1155 for the true 1156), and the T2 Charge's pictures were dropped
  while thousands of states were tripled at its trigger (24 of 48 frames: no lock).
**Fixed:**
- the first retries of a no-lock place every picture one frame earlier / later (`shiftAlts`), and after a lock the
  placements one frame either side are scored with the locked seed (`fb14Refine`; the better one is kept with its trigger
  time). End-to-end T1: the shift retry locked the true seed at 7358 / 2.85x.
- the fits are kept within 0.8% and weighed by their score (exp((score - best) / 0.4% of best)) and by a binomial prior on
  the counts, the top 1200 fit x split combinations.
- **the pattern from several Charges** (`fb14Joint`, kernel `fb1cscore`): at T2 (and T4) every candidate pattern (the
  carried states', the new fits' splits at M - 1 / M / M + 1, and patterns one or two moved counts from those) is scored
  on the earlier Charge's rays and this one's together; the frame offset of this Charge that fits best fixes the clock.
  End-to-end T2 (replayed feed with the emulator's truth): **the true pattern is the joint best** (17 and 49 points below
  each Charge's own best fit), and the new states hold it with the true seed.
- inputs seen before a slow lock (T2's Do Nothing confirm, T3's Jelly) are replayed onto the fresh states; the Charge's
  creations are added to the carried states after the rays are captured, not at the trigger; at most 8000 states.
**After:** on the same T1 -> T3 feed T3 is now planned (Do Nothing +2237, 97%, doubt 1%) where v74 played it blind
(every state ruled out by the coin). **Still open:** T1 itself (one Charge) and the stretch to T2's lock run on the T1 fits
without the true pattern; in the full end-to-end run the T2 beep (claimed 62%) was a hit, which ends the route (Peach's
heal is not modelled), so T3-T6 of that run were not usable. T2's carry check (exact match of the carried states) still
finds no match; the joint pattern makes the fresh T2 states right instead.

## 2. T4 -> T6 -> T7 end to end
**Reproduced:** v74's T4 feed died (debug dumps of 20000 states per lock). Removed: the test now asks the page only for
the states that hold a given true seed. From T4 (`START=4`, seed 5eed0fb2): T4 locked (a077ab8e, 2.3x, 3.4 s after the
rays), its beep made the wave come and miss (and +-1 too); the Peach Beam was read; at T6 the narrowed search **had the
true seed among its 883 candidates but did not lock**, and the full search did not either.
**Causes and fixes:**
- the narrowed candidates were ranked by the stage-2 upper bound alone (any lightning, any insertion count): now by their
  initial rays first, as the full search ranks its stage-1 bests;
- the narrowed candidates are runs of consecutive seeds, so the runner-up was the true seed's neighbour (same B rays and
  respawns): the ratio is now taken against the best candidate off the best one's stream (+-48 steps);
- the FB2 profile reused a raster when two pictures had the same coarse brightness; two game frames in a row did, the
  second became a copy of the first and a skipped frame: now only right after a fresh grab;
- one-frame placement retries for the narrowed search (a second each).
**After** (the same T6 feed, real time): **the narrowed search locks the true seed (25a60913) 1.5-1.6 s after the rays**
(search 1.1 s, 3-6 states instead of hundreds), at 3, 4 and 5 workers alike. That is still past the popup window here:
the plan's first frame came out as +138 (the window closes at +136, with 3 beeps 0.3 s apart ahead of the press), so no
popup beep; K was read from the popup (137, closed by itself). **T7:** in the run with the popup pressed on K = 100 the
page read the popup as 137 ("to the end"), so the T7 states were wrong and the T7 plan said no edge (doubt 100%, no
beeps; pressed blind: 4 bounces). The popup reading at that point is not fixed.

## 3. Lock times (this 4-core machine, real-time feed, the page's own load ~2-3)
| workers | T1 (aura) lock after the rays | one search (stage 1) | T6 narrowed lock after the rays |
|---|---|---|---|
| 3 | 5.3 s no lock, 9.2 s on the shift retry | 3.7-5.0 s (2.2-3.6) | 1.58 s |
| 4 | 4.7 s | 4.2 s (2.9) | 1.47 s |
| 5 | 5.5 s | 5.0 s (3.3) | 1.47 s |
5 workers on 4 cores is oversubscribed here; on the runner's 6-core PC (5 workers if it has 6 logical cores, 11 with 12
logical) stage 1 should split further: ~4 CPU-s / workers, so ~1-1.5 s a search on free cores (projection). The T6
narrowed lock barely depends on the worker count (884 candidates).

## Tests
`test_fb14_model.js` (32 / 32 logs exact) and `test_fb14_plan.js` (exact-lock odds unchanged) in `run_suite.sh`; the
end-to-end runs as above.

# Time Out Timer v74: Final Bowser phase 2, T1 -> T4 manipulated from the T1 Charge (Nov 6)

The route (the runner's): T1 Super Charge, Cloud Nine; T2 Super Charge; T3 Jammin' Jelly; T4 Super Charge (block the
wave, Lakilester may take it); T5 Peach Beam at Danger; T6 Super Charge (Close Call); T7 Power Bounce x7. Lakilester
does nothing on T2-T4 (Strategies -> なにもしない). New: `fb14_live.js`, the Charge profile `fb1` (`charge_live.js`),
`kernel.c` (fb1score / fb1struct / fb1end), the route steps, `fb2_route/t14_log.py`, `t14model.py`, `t14_fixture.py`,
`t5_steps.py`, `fb14_e2e.py`; tests `test_fb14_model.js`, `test_fb14_plan.js` (both in `run_suite.sh`) and the
frame-fed `test_fb14_page.js` (emulator renders, not in the suite).

## 1. The model (emulator, `fb2_route/t14model.py`; the page's port `fb14_live.js` fbStep)
From a seed in Mario's menu every gRandSeed draw of a turn is fixed by the inputs (`t14_log.py`, 64 logs: T1-T4 x 16,
8 seeds, different menu waits, popup presses at 80 or none, partner confirm delays 0-36):
- per frame: bolts; script draws (the Charge rays' two creations on Mario's confirm M + 13 / + 16; the Jelly's sparkles
  10 x (359, 10, 10) on M + 118; Cloud Nine's puffs RandInt(40), RandInt(30) on P + 200 .. 209; Bowser's AI on P + 13
  after Do Nothing, P + 332 after Cloud Nine; the dodge test on AI + 52 / 62 / 55 by attack, + 72 for the wave); the
  coin; **Bowser's star aura** (c[f mod 20] rand_int(359): 16 per 20 frames, the pattern fixed for the fight); the rays'
  respawns (the aura's effect slot is before the rays': RAM gEffectInstances, T1 / T2 / T4); the wave's particles; the step;
- the popup A only moves the partner menu (K + 17); the AI's Body Slam / Claw are off after the same attack the turn
  before; T4: RandInt(100) < 75, else RandInt(110) < 20 -> the Draining Shockwave (15 of 16 logs);
- the dodge (Cloud Nine) is the test < 50; after a miss nothing else draws to the next menu, the wave included (its
  draws are a fixed schedule, the same in all 6 wave-miss logs). After a hit Mario's HP drops and Peach's wish heals him
  (other effects, not modelled: the route has failed there).
**Python model vs emulator: 64 / 64 logs exact on every frame to the test, and on every frame of the log after a miss.
Page model vs emulator (`test_fb14_model.js`, 32 of the logs in `fixtures/fb14_logs.json`): 32 / 32 exact over 18421
frames, every attack and test value equal.**

## 2. The lock: the Charge rays with the aura (`fb1` profile, `kernel.c`)
The aura's draws come between the rays' respawns on every frame, so the Hallway / T6 stage 2 does not fit (the old FB2
profile on the console clip 14-47-09 with the aura: no lock). Stage 1 is unchanged (each effect's creation draws are
contiguous), with both effects (A alone ranked the true seed below 65536 on the T1 render: Lakilester and the stars
cover part of its rays); the joint stage takes B's base draw 24..38 steps after A's (the aura's draws on frames 0-2).
Stage 2, `fb1score`: all draws are single LCG steps, so the score is a sum of g_v[n][k_n] over frames, k_n = the extra
draws before frame n's respawns; the best monotone path (0..6 extra draws a frame) over every v. A candidate a few
steps along the best one's stream shares B's rays and every respawn and scores all but A's initial rays: it is the same
seed, not the runner-up (T1 render: true 5853, one step off 4645).
Then `fb1struct` fits the structure of the best: per lightning pattern x first coin q x second coin, the aura pattern by
dynamic programming over the 20 residues (frames j, j+20, j+40 share c_j; P_19 = 16). Every fit within 0.2% of the best
is a hypothesis; each, with every lightning phase pair behind its pattern and console lag 0 / 1, is a tracker state.
| render (capture simulation) | lock | score, ratio | fits within 0.2% |
|---|---|---|---|
| T1, 1234abcd (r1, native, clean maps) | true | 7274 vs 2968, 2.45x | 35 |
| T1 (rt1, page, live) | true | 4605-5680, 2.25-2.41x | 73-343 |
| T2, 9e3779b9 (rt2, native) | true | 7908, 2.77x | 1605 |
| T2 (rt2, page, live) | true | 5877-5907, 2.29-2.86x | 261-1680 |
The rays do not tell the aura's split between neighbouring frames, the first coin's frame and the lightning apart where
no ray respawns (rt2: the true fit among 1605; at 0.2%, the true structured score 7907.9 against a best of 7908.0). So
the page also walks every fit back through Mario's menu before the Charge (`fbBackShines`: the coin's 24 / 48 rule with
the fit's aura and bolts, as chgQBack does on the Hallway) and weighs it with that menu's shines before keeping at most
16000 states: on rt2 the menu's one shine (frame -32) puts the true coin frame on top (16 of the top 400 states, all
the others one error behind).

## 3. The tracker and the levers (`fb14_live.js`)
The states are carried with the v72 weights (zwLR constants; match window -2 .. +4.5 frames; the background's share is
the doubt: 50%+ = no beeps). The clock: logic frame 0 = T1's Mario confirm, from the burst (re-anchored at every later
Charge). The inputs the page reads: Mario's Charge from the burst (T2 / T4: M - 1 / M / M + 1, the burst places it to
about a frame), the Jelly from the bar hiding (first picture without it = M + 2; +-1), the partner's confirm from its
screen closing (Cloud Nine's target, the マリオ name box: P + 1; Lakilester's Strategies panel: P + 2; read to +-2 frames,
weights 10/25/40/20/5%). The lever is the partner's confirm: the runner waits on that screen; the page plans the frame
with the shared machinery (zwChoose with the share of states for which a confirm there makes Bowser miss; window type,
beeps, beep / visual offsets, lead, max extra wait), re-scores it 4 times a second and stops the beeps when the coin
rules it out. T4's goal is the wave and the miss (the wave must come on T4: on T5/T6 there is no Cloud Nine).
Each later Charge (T2, T4) is locked again; the carried states that drew those very rays (same seed after A's base draw
and the same state at the rays' end) are kept, else the fresh fit replaces them; a fresh fit keeps only the aura
patterns the carried states still hold. With no lock: "play it blind" (Cloud Nine / Do Nothing whenever you like:
Bowser misses about 50% a turn, 39% on T4; all four about 5%).

**Odds the page shows**: 60-97% on the T1 plans of the renders (a mixture of hundreds to thousands of states), 75-99.8%
on T2's; no edge / play it blind when the coin rules the states out. **Odds the page claims and gets with an exact lock** (`test_fb14_plan.js`: the true state and its lag-1 twin, the
page's own plan, presses 25/50/25 over -1/0/+1, 60 random games): T1 94.8% claimed / 98.3% model, T2 96.3 / 98.3,
T3 95.6 / 96.6, T4 90.3 / 87.5; **all four 81.7%** (the study's 87% assumed 0.39 / frame on T4 with 1 s windows; blind ~5%).
With the real T1 fits (hundreds to thousands of states) the T1 plan is a mixture: the page showed 60-87% on the
renders before the partner menu's coin had pruned them (section 5).

## 4. T5 -> T6: the carried seed narrows the T6 Charge's search
The Peach Beam is not modelled, but from its confirm to the T6 Charge's rays frame 0 the game draws a nearly fixed
number of random numbers beyond the frames (`fb2_route/t5_steps.py`, 120 emulator runs, 40 seeds x 3 text policies):
Close Call 8654-8764, Bowser's hit 9116-9351 (+ 8776 with Mario at 3 HP in an end-to-end run). The page takes the
carried states at the Peach Beam confirm (the bar hiding after T4's confirm + 5 s), and at the T6 Charge searches only
the seeds frames + 8540 .. 9420 steps after them (bases on the same stream merged): about 900 candidates per base,
straight into the FB2 stage 2 (`chgSearch` opts.cands; no stage 1 over 2^32). If that does not lock, the full search
runs as before. The FB2 profile does not arm during T4's Bowser turn and the beam (they flash the arena).

## 5. End to end, and lock times
**Lock times** (`test_fb14_page.js` on the end-to-end T1 render, fed in real time; Settings > Charge CPUs; 4-core
machine shared with the page's own thread and another agent's tests, load 1.7-2.6, so pessimistic):
| workers | one search (stage 1 / joint / stage 2 / fit) | lock after the rays |
|---|---|---|
| 1 | 4.4-5.2 s (3.2-4.1 / 0.2 / 0.6 / 0.3-0.4) | 15.4 s (2 placement retries before the lock) |
| 2 | 3.4-3.8 s (2.5-2.9 / 0.3 / 0.3-0.4 / 0.3) | 11.3 s (2 retries) |
| 3 (the default here: hardwareConcurrency - 1) | 3.3 s (2.4 / 0.3 / 0.3 / 0.3) | 3.7 s |
| 4 | 3.6 s (2.6 / 0.3 / 0.3 / 0.4) | 3.9 s |
Stage 1 is ~4 CPU-s of WebAssembly and splits over the workers; on this machine it stops gaining after 2-3 (the cores
are shared). With 7+ free cores a search should take ~1-1.5 s. The T1 lever is the Cloud Nine confirm, which the runner
can hold: the cost of a slow lock is waiting on that screen, not a missed window. The worker count follows
navigator.hardwareConcurrency - 1 (1..16) unless Settings fixes it.
**T6, narrowed by the carry:** about 900 candidates per carried base go to the FB2 stage 2: 0.37 CPU-s for their upper
bounds and 0.03 s for the full scoring of the best few (native, one thread; the WebAssembly is ~1.5x that, split over the
workers), instead of the 2^32 stage 1 (~1.4 CPU-s) whose late start made the v68-v72 T6 lock land 1.6-2.6 s after the
rays on 3 workers. **Not measured end to end** (below).

**End to end** (`fb2_route/fb14_e2e.py`, seed 1234abcd, Glide64 -> `t6_capsim.py` -> the page, pictures delivered late
rather than dropped: LATEMS 2000; 3 workers; the beeped frames pressed in the emulator):
- T1: the lock is the true seed (c49d0092, 7101 at 2.7x), but only on the third placement (the burst over this arena
  varies run to run: lightning, the stars; the first placements put a skipped frame at 12-17). The plan came after the
  test's 400-frame wait, so T1 was pressed blind (Bowser missed; -1 and +1 would have been hit).
- **The carry from T1 is not right yet.** The fit of the T1 rays left the true seed and first coin among the states, but
  not the true aura pattern: '...1021010201310...' against the fits' '...0040 / 0131 / 0311...' on residues whose
  frames do have respawns, so a misplaced frame in the rays (above) bends the aura fit itself. The alternative splits
  (`fb1alts`) do not contain it either. With a wrong aura every carried state drifts on some frames: the T2 Charge's
  check against them found no match in the earlier runs, and in this one the T3 menu's coin ruled out every state
  ("fb14AllOut"; T3 pressed blind, Bowser missed).
- T2: the T1-carried plan beeped clock frame +1169, claiming 99.8%; pressed in the emulator: Bowser missed (-1 also,
  +1 hit). T2's own Charge was not read in that run (the T1 search was still running when the step changed; fixed since:
  the reader is armed again once it finishes, not re-run).
- T4 -> T6: the T4 feed's headless page died (the debug dumps of 20000 states per lock); T5 / T6 were not reached in any
  run of this session, so **the narrowed T6 lock has not run end to end**. Its window is from 120 emulator runs.
- Found and fixed on the way: the end-to-end harness dropped one frame at every savestate load (the page's clock then
  ran a frame early after each confirm); T2 / T4's Charge on the clock is +-1 (carried as -1 / 0 / +1); the coin from
  before a lock is kept (in page time); the FB2 reader is re-armed after T4 and after the Peach Beam; the joint stage no
  longer sorts ~260k items on the page's thread (it stalled the capture for ~1 s).

## Suite
`run_suite.sh` on the rebased v74 build (after Jr. Troopa's v73): every test rc 0, the torch maze rc 0, both log replays
lock as before (1379.7 s on 83ebd9e1, 655.7 s on 52467bd0). Run in two parts (the first runner was stopped by a
session time limit after test_route_replay; the rest rerun with ONLY=). Another agent's tests ran at the same time.

## Not verified on console
Everything here is emulator (Glide64) and the capture simulation: the aura profile's burst curve (one T1 render), the
screens' vanish frames (Glide64: the name box P + 1, the Strategies panel P + 2; the page's VAN from other fights' console
clips says 2 / 3), the bar hide after the Jelly / Peach Beam (M + 2), the coin flash delay with the aura up, console lag
frames during Cloud Nine / the wave / the beam (the tracker carries lag 0 / 1 after the rays only; a console lag frame
elsewhere moves its frames by one), the T5 step window on console, whether the runner's text presses in the beam turn
stay inside it, and the A presses during Cloud Nine's message (speech blips; the route says not to).

# Time Out Timer v73: the Jr. Troopa Charge-lock route (Nov 6)

The endgame route now plays Jr. Troopa with the page (route panel: *Jr. Troopa route*, Charge lock by default; the old
shine carry of v72 stays as the other choice, and the tests of that machinery select it). The study is
`../jr_charge/README.md`; the code is `jr_live.js`.

**The route.** T1: Mario's Super Charge first (its rays lock the seed), Bomb. T2: Bomb; Whacka. T3: Charge; **Bomb on the
beep** (Close Call). T4: Bomb; **Maple Syrup on the beep** (Close Call). T5: Charge; **Do Nothing on the beep** (Close
Call). T6: **Power Bounce on the beep** (6+ bounces; Bomb if 5). The run goes Duplighosts → Jr. Troopa → Hallway → Final
Bowser with no manual step: the page moves the route by itself.

**What the page does.**
- Profile **jr** (`CHG_PROF.jr`, steps with `chg: 'jr'`): the Hallway camera table (bit-identical in this arena), the
  Hallway capture Mario patch, the study's burst curve `CHG_BRIGHT_JR`, the Hallway trigger, placement, retries and q
  check. The first jr Charge whose capture shows Mario starts the fight (T1); its lock starts the zero-wait tracker
  (`jrLock` → `jrStartFrom`, fight `jr`).
- **Turn tracking** (`jrFrame`, `JR_SEQ`): every confirm on this route but Do Nothing hides the status bar 3 (Mario) or 4
  (Bomb) frames after the A; the page counts the hides after a menu (bar up 0.3 s+, gaps under 8 frames are flickers) in
  route order, each an input to the tracker with its frame -2..+1 (as the Spiny Flip's: a dropped picture only ever reads
  late; the coin settles them). Do Nothing is read from Bombette's Strategies screen closing (save that screen once: on
  this route the bar stays up through Do Nothing and Jr. Troopa's turn). The Charge bursts (T3, T5) anchor the count; a
  burst where the count does not expect one resyncs it and ends the carry.
- **The levers**: on each lever's target screen `zwPlan` plans and beeps with the Hallway's machinery (window types,
  beeps, offsets, the v72 weighting and doubt, the beeps stopped on a bad plan): T3 Bomb (`jrcc_bomb`), T4 Syrup
  (`jrcc_syrup`), T5 Do Nothing (`jrcc_nothing`), T6 Power Bounce (`jrpb5`: the best 5+ chance and, within 2 points of
  it, the best 6+, as the Duplighosts' 3+ / 4). The headline, the strip line and the Charge panel show Close Call or
  5+ / 6+, the shown chance mixed with blind by the doubt (`ZW_BLIND` has the Jr. levers; the top band's blind is the
  top profile's, not always the Duplighosts' all-4).
- **Deaths**: the status bar is up through Jr. Troopa's turn (emulator: back ~134 frames after the Bomb, up through the hit,
  the death and the revive), so the page reads Mario's HP: the tens place is blank at 2 HP and shows the "1" of 10 after
  a Life Shroom revive (`jrTens`). 10 HP after a Close Call = a hit: the carry ends (the revive's 933-939 RNG steps are not
  modelled), the next turn says "No roll this turn" (at 10 HP: `jr_syrup_hit` / `jr_nothing_hit` go in once the next
  Charge locks) and that Charge locks again. No 10 HP by the next confirm = a dodge: the states whose roll hit are dropped
  and the background is weighed by a blind dodge (0.30). (The next menu comes 246 / 230 / 93 frames after the Bomb /
  Syrup / Do Nothing confirm on a dodge, 359 later on a death, in every emulator run.)
- **Later Charges** (T3, T5): their locks are checked against the carry (the carried states simulated to the Charge's frame
  0, -2..+2; the seed is the evidence, the first coin frame the carry's, since the rays barely tell late coins apart).
  Agreed: the page goes on from the new lock (its frame 0 is exact; the carry's Charge confirm is only known to -2..+1)
  with the carry's first coin, and a running plan is moved onto the new clock. Not agreed: it starts again from the new
  lock and the confirms since its Charge. No carry (no T1 lock, or a death): the Charge's own lock starts it.
- **No lock**: "play it blind" with the blind odds (Close Call 30%; Power Bounce 5+ 67.5%, 6+ 32%) in the headline, the
  strip and the Charge panel.
- **Arena**: `chgArena` says `jr` for this arena (floor luma 55-75, top B - R 8..17, floor B - R -7..-0.8; tested after
  the other three). Over every 6th frame of the 28 console clips of the other fights and walks it never fires; on the two
  console clips of this arena it does. On a Jr. step a Hallway picture is the Hallway, a Final Bowser one at a real hide
  that fight. The Jr. arena does not move the route from another fight's step (the castle corridors walked after the
  fight are grey stone too); the page only logs it.
- On the Jr. steps the old shine search does not run (it only took CPU from the Charge search); the walk tracker does
  not start during the fight (a death's long text looked like the walk's gap).
- Core: `pmrng_core.js` TURNS `jr_bomb_t1` (the T1 Bomb with Jr. Troopa's hit at 10 HP), `jr_syrup_hit`, `jr_nothing_hit`.

## Checks
**The page's core against the emulator** (`../jr_charge/jc_check_core.js`, the dc_check.py way; 24 new `jc_turns.py` runs:
14 from T1, 4 from T3, 4 from T5 blind, 2 planned): from each Charge confirm's seed and first coin and the confirm frames
alone, **64 of 64 segments match every frame (68,343 frames)**, including the T1 Bomb with Jr. Troopa's hit (15), Whacka
(15), the 10-HP Syrup after a T3 death (9, from the T4 Bomb's seed) and Do Nothing at 10 HP after a T4 death (4); every
Close Call and Power Bounce outcome the page's profiles predict from the state at the confirm: **110 of 110** (81 Close
Calls, 29 Power Bounces).

**Model vs page** (`../test_jr_plan.js`, in `run_suite.sh`; 40 cases from `../jr_charge/jc_fixture.py`; the page's plan with
lead 1.5 s, 1 s max extra wait, best chance, scored with presses 25/50/25 over -1/0/+1). In every mode the true state is
among the page's states and its outcome equals the model's on every frame of each 190-frame window (7600 / 7600 per
lever). Real chance of the planned frame (the page's own claim in brackets):

| Mode | T3 Bomb: Close Call | T4 Syrup: Close Call | T5 Do Nothing: Close Call | T6 Power Bounce: 5+, 6+ |
|---|---|---|---|---|
| carry | 78.1% (65.5%) | 75.6% (67.1%) | 75.0% (63.7%) | 5+ 98.8%, 6+ 68.8% (93.3% / 60.3%) |
| coin | 77.5% (72.5%) | 83.1% (83.4%) | 79.4% (74.3%) | 5+ 98.1%, 6+ 82.5% (99.6% / 84.0%) |
| own | 85.0% (82.8%) | 83.1% (78.4%) | 86.9% (84.2%) | 5+ 98.1%, 6+ 76.3% (98.3% / 74.2%) |
| lock | 83.1% (81.7%) | 82.5% (77.8%) | 86.9% (84.0%) | 5+ 98.1%, 6+ 76.3% (98.3% / 73.2%) |

(carry: the T1 lock carried through every turn with no coin seen; coin: the same with the menus' coin; own: each later
Charge's own lock; lock: the carry with the T3 / T5 locks landing on it, 80 of 80 agreeing; blind: Close Call 30%, 5+
67.5%, 6+ 32.2%.) Also tested: a wrong T3 lock does not agree and the page starts again from it; the right seed with a
wrong kept q agrees and keeps the carry's q; a death stops the tracker and the next turn says no roll; after a T4 death
the T5 lock plans T6 through Do Nothing at 10 HP; no lock: play it blind with the blind odds; the arena on console clips.

**Frame-fed end to end** (`../test_jr_page.js` + `../jr_charge/jc_e2e_page.py`, seed 0badf00d): Glide64 renders of the
whole fight (`jc_render.py`) through the capture simulation (`jc_capsim.py`), fed to the page in real time; the page saves
the target screens, reads the Charges, counts the confirms and plans on each target screen by itself; its first beeped
frame is then pressed in the emulator, and the frames next to it. This machine was loaded (another agent's renders):
470-2500 of 3500-6800 pictures dropped per feed, more than a live session.

| Lever | run 2 (before the later-lock handover): plan, emulator -1 / 0 / +1 | run 3: tracker, plan, emulator -1 / 0 / +1 |
|---|---|---|
| T3 Bomb | T1 carry, 94.6%: dodge / **dodge** / dodge | T3 lock (agreed with the carry), 90.2%: dodge / **dodge** / dodge |
| T4 Syrup | T1 carry, 94.5%: dodge / **dodge** / dodge | T3 lock, 93.7%: dodge / **dodge** / dodge |
| T5 Do Nothing | T1 carry, 67.5%: dodge / **hit** / hit | T5 lock (the carry did not fit), 73.1%: hit / **dodge** / dodge |
| T6 Power Bounce | the page read 10 HP 466 frames after the T5 confirm: carry ended, no beeps (blind) | seed lost (doubt 96%): no beeps (blind) |

Every Charge lock in these runs was the true seed (T1 6e878514, T3 b582731b, T5 0cbf505c, checked against the emulator
log), every confirm was counted in order (bars and the Strategies screen), the dodges were read as dodges and the death
as a death. The misses: under the drops each confirm read 2 frames late (hence the -2..+1 shifts now) and the simulated
capture shows the coin flash ~3 frames late (v72 section 3), so in run 3 the carry lost its state before T5; the T5 lock
then kept q 31-42 when the true first coin was 44, so T6 had no right state and said so. The cross-check now takes the
seed alone and the carry's q: not re-run end to end (a run takes ~1 h here).

**Console**: two short clips of this arena exist (`8526dcdd` 2026-11-02 14:16:56, a T1 Super Charge with Bombette, 30 fps;
`c5537165` 14:24:35, with Goombario). Fed to the page on the Jr. T1 step (each picture twice, as a 60 fps capture): clip 1
locks d260c382 in both runs (5568 at 3.39x and 6079 at 3.76x, after one placement retry; Mario NCC 0.94), clip 2
df7d78b1 (6196, 3.69x, first try, 2.8 s after the rays; NCC 0.92). True locks on the Hallway clips score 2900-8300 at
2.1-5.4x, no-locks 750-1500 at 1.0-1.2x. Neither seed can be checked by later rolls: neither clip goes on with this route
(clip 2's next turn is Goombario's, which the page does not model; its one shine afterwards fit no state: DOUBTFUL, no
beeps). The HP tens place reads 0.47 at 10 HP on clip 1 (0 with the bar hidden; the death read needs 0.12).

## Suite
`run_suite.sh` (with `test_jr_plan.js` added): every test rc 0 and both log replays lock as before (1379.7 s on 83ebd9e1,
655.7 s on 52467bd0); the torch maze rc 0. In the first pass under load `test_strip_geometry` failed once (as in v72) and
`test_switch` needed the old Jr. route (fixed); both passed when rerun (a container restart cut the first pass short: the
tests from `test_beeps_window` on, the torch maze and the replays ran in a second pass). The old shine-carry tests
(`test_carry_page`, `test_hud_confirm`, `test_carry_guard`, `test_early_press`, `test_switch`) select the old Jr. route.
Not in the suite (they need renders or uploads): `test_jr_page.js`, `jr_charge/jc_check_core.js`.

## Not verified on console
The Close Calls and the bounces themselves (no console turn after T1 exists), the bar-hide delays in this fight (emulator
3 / 4 frames, as the HUD comment had them), Do Nothing read from the Strategies screen, the HP read at 2 HP and after a
revive, the coin-flash timing in this fight, the burst curve beyond these two clips, the whole fight's timing in a live
browser. Recordings that would: 4-6 attempts of the whole fight from the T1 menu (bar up), capture chain and input
display as for the Hallway clips, at least one with a Close Call hit (the Life Shroom) and one with every Close Call
dodged, ideally with the page's session log.

# Time Out Timer v72: reliability (Nov 6)

What changed, why, and the before/after numbers. Tests: `charge_live/test_zw_tolerant.js` (node, in `run_suite.sh`),
`test_beeps_stop.js` (in `run_suite.sh`), `test_zw_wait.js`, `test_dup_plan.js`, the frame-fed `test_charge_feed.js` on
the 14 Hallway clips and `test_dup_page.js` on three Duplighost renders (not in the suite: video / renders in /dev/shm).

## 1. The tracker weighs its states instead of dropping them on one missed or false shine
**Before (v71):** a state was dropped on any predicted shine the coin did not show while steady, and on any seen shine it
did not have. One missed shine (a busy browser, the v70 T2 run of 20-54-59) lost the true seed.

**Now** (`zwStep`, `zwUpdate`, `zwDoubt` in page_template.html): every state carries a weight = prior x the likelihood
ratio of what the coin did, against a background "the coin is unrelated to every tracked state" (a random coin):
a seen shine it has x(1 - pMiss) / (W (rho + lambda)) (~20; W = the match window, -1.5 .. +tapLate frames), a missed shine
x pMiss, a seen shine it does not have x lambda / (rho + lambda) (~0.02); the background is weighed by exp(-rho) per frame
of steady coin (rho = 0.3 / 31.2, a random coin's shine draws per frame). A state is dropped only when it is 10^4 times
less likely than the best one, or has more than 3 errors. The background keeps the prior mass that the lock or the model
is wrong (5% at the lock, 3% more at the Spiny Flip confirm); its posterior share is the **doubt**:
- the chance shown and used for the edge is (1 - doubt) x the states' chance + doubt x blind (Time Out 31%, Duplighosts 3+ 47% / 4 13%);
- doubt 50%+: no beeps; the sidebar says "Charge lock: DOUBTFUL", the strip "Lock doubtful";
- the sidebar shows the fit ("fit 98%", and how many shines the best state did not fit).

**The detector's rates**, measured (rule-of-three upper bounds used):
- the runner's logs: every shine-locked stretch with a clean coin model (seeds c4d16d21, 489 s; 9e314ac1, 66 s): 161
  predicted shines, **0 missed**; 556 s of steady coin, **0 false** (`tools/detector_rates.py`: the detections incl. rejected ones vs the
  seed's coin; two other locked stretches, 7f1e2578 and 52467bd0, leave the plain coin model after their lock (a carried turn / the walk) and are left out: the script's totals include them);
- the 14 clips, frame-fed (v72 T1 runs): the best state at Time Out matches all 31 shines seen after the lock (0 missed,
  0 false; 15-30-15 excluded, see 2); the v70 T2 run of 20-54-59: 1 missed of 5 (frames dropped);
- pMiss = 0.02 (3 / ~190 shines), lambda = 1.8e-4 per frame of steady coin (3 / 16,700 frames).

**Before / after** (`test_zw_tolerant.js`, the 14 clips' coin timelines as the page read them, `charge_live/clip_events.json`;
the lock 0.3 s after the rays and 1 s after the Spiny Flip confirm):

| | v71 | v72 |
|---|---|---|
| no error: states / Time Out share at the real confirm | e.g. 20-53-09 4 / 0.916, 15-20-15 2 / 0.737 | 4 / 0.916, 3 / 0.737 (every clip within 0.015 of v71) |
| one shine after the lock removed (33 shines x 2 lock times) | **seed lost in 34 of 66** | **0 of 66** (all the clean run's states kept, at least 28% of the weight; 15-30-15: doubtful, see 2) |
| one false shine in a quiet visible stretch (4 x 2) | lost in 2 of 8 | kept in 8 of 8; doubt 50%+ (no beep) in 2 (15-18-30) |
| 20-54-59 (the v70 miss): each of its 5 shines removed | lost in 5 of 5 | 0 of 5, share 0.98-1.0 |

**Honesty** (same test, simulated: 120 random games through the same tracker, the Spiny Flip impact / guard / confirm read
error / console lag drawn, the detector missing 2%, false shines at lambda, flashes read -1 .. +3 late; 1 game in 12 with a
wrong lock; 39 skipped where Bowser's attack was still drawing at the screen): v72 beeped 78 of 81, shown 69.4% against
72.1% in the game; mean outcome with a blind press when no beep: v71 69.4%, v72 70.6%. On the 7 wrong locks both versions
beep on states that fit the T2 coin by chance (v71 4, shown 69% / game 38%; v72 5, 75% / 55%): with ~10^4 hypotheses and
2-3 shines, chance fits are common; the background's 5% prior is what the shown chance assumes.
`test_zw_wait.js` (v69's seed loss while waiting) passes: the state survives 25 s of replans, 3 beeps each.

## 2. Clip 15-30-15: the seed dies 6 s after the turn-2 shines
Reproduced (v71, node and frame-fed): the states left after the two T2 shines (clock 304, 376) are **Claw Swipe** states
(Bowser's AI on clock 234); they predict a shine at 472/473, which the clip does not show, and die at 477-481.
**The clip shows a Body Slam** (Bowser jumps on Mario; HP 10 -> 5, "Nice"), with the Spiny Flip's hit picture at
5.76 s after the trigger, i.e. Bowser's AI on clock ~219-221. So the states that fit the two T2 shines were a chance
fit, and the true state had already been dropped. Under the model **no** state with a Body Slam with its AI on clock
205-235 fits the coin with fewer than 2 errors, for any q (0..47), the Spiny Flip confirm read anywhere from 8 frames
early to 3 late, guard or not, or extra draws (1-12) in the Body Slam. Ruled out in the emulator: the Spiny Flip's aim
sparkle ending at an early A throw (`_spk_throw.py`, throw at +56: the sparkle still redraws until +118, impact +80,
AI +124, as modelled). **Not found**: the true state leaves the model between the rays and Bowser's AI (an unmodelled
draw or a wrong q/seed); it needs an emulator replay of this clip's inputs, which the clip does not give exactly.
v72 on it: the states' chance at the real confirm is 5% (No edge) with doubt 12%; with one T2 shine missed doubt rises to 76% (no beeps).

## 3. Duplighosts 1234abcd: the true q not among the candidates
Reproduced with a new render (seed 1234abcd, Charge confirm 25 frames after the target screen opens: bfdda85d at the rays,
true q 42): v71 kept q 35-41 (0.5% / 6 at most; 42 not offered), the menu check fit none ("kept all").
**Now:** q within 2% of the best, up to 10 (v71: 0.5%, 6), and the menu check (`chgQBack`) is a likelihood with the
tracker's constants, not a filter, on the console frame time, with a -1.5 .. +4 frame window. v72 on the same render:
q 38-47 from the rays, the menu weights 39/42/45/46 0.25 each (true 42 kept), 6 states at Strategies, plan +264: 3+ 99.98%,
4 31%; emulator at +263/+264/+265: 4 / 3 / 3 copies (the page's top state: 4 3 3). The other two renders (D = 25):
9e3779b9 (fc590fa8, q 18): q 18, plan +252 3+ 75%, emulator 3/3/2 (page 3 3 2); 5eed0071 (2dfcc393, q 18): the rays
put q 17 best (15-18 within 2%), the menu gives 18 0.997: plan +279 3+ 100%, emulator 3/3/3.
**The 2.5-3 frame late flash**: measured on the raw Glide64 renders, the coin's main flash (white pixels in the coin
box) is on render frames draw +6 and +7, and the burst on render frame 3 reads +7.4 / 13.1 / 19.1 above the menu, the
console curve's 7.2 / 12.5 / 19.4: the burst sits where the console puts it, the coin flash ~2 frames later. On console
(20-54-59, its 5 shines) the flash is a single 2-frame burst with no early part, read at draw + 4.8 on the burst clock
(v70: offsets -0.3 .. +0.4). So the late flash is the emulator's rendering of the HUD coin (the same display list on the
console shows it earlier), a **simulation artifact**, not a model error; the page tolerates both: the menu check and the
Duplighost tracker take flashes up to 4 frames late (tapLate 4; the Hallway's stays 3.5).
`test_dup_page.js` now sets Settings > Console frame time to 33.367 (the renders' rate; `CRATE`), as does `test_fb2_page.js`.

## 4. Final Bowser on the console's frame time
`fb2_live.js` used 33.367 ms frames for the popup frame, the press times and the T7 plan: on a real N64 (33.427) the
picture 500 frames on read as frame 516.9 (true 516) and the press for +516 came 0.9 frame early. It now uses the measured
console frame time (`consoleRate`, default 33.427), fixed per fight at the trigger (`FB2.rate`): 516.00 and 0.00
(`test_zw_tolerant.js` section 4; with the setting at 33.367 the old numbers come back). The FB2 coin check is weighed as
in 1 (`fb2Prune`), and its T7 chance counts the background's share as no 7.

## 5. Silent wrong beeps
- **Beeps after the seed was lost.** v71 kept a running plan's beeps going after "Seed lost" (the strip said "showing old
  prediction" while it beeped) and after a late "Seed changed". Now, whenever the coin changes the states' weights, the
  planned frame is scored again (`zwPlanChance`): still good, keep; not good and the beeps can move, replan; else stop
  the beeps and say so ("Beeps stopped" / "Seed lost – beeps stopped"). `test_beeps_stop.js`: shines the tracked state
  does not have, read before the press: v71 kept beeping in 3 of 3, v72 stopped them 0.5-0.9 s before the press in 3 of
  3; a control with the state's own shines keeps its plan.
- The q filter (3) and the hard drop (1) could leave only wrong states that looked certain; both are weights now, and the
  doubt sends the shown chance back to blind when the coin fits badly.
- The plan log carries the states' chance, the doubt and the shown chance (`mix.pStates`, `mix.doubt`, `mix.p`).

## Frame-fed (v72, `test_charge_feed.js`, real time)
| Clip | Lock (seed, score, ratio) | q kept | States at Time Out | At confirm -1/0/+1 | v71 same day: q / states / at confirm |
|---|---|---|---|---|---|
| 15-14-09 | b400fca5 (6171, 3.54) | 3/4/5/6/7/8/9 | 22 | 0.22 / 0.32 / 0.16 | 3/4/5/6/7 / 31 / 0.22 / 0.31 / 0.15 |
| 15-15-06 | cf5894f0 (5374, 3.47) | 19 | 23 | 0 / 0 / 0 | 19 / 20 / 0 / 0 / 0 |
| 15-16-08 | 6d3b7b2b (5992, 4.48) | 30/31/32/33/34/41/42/43/44/45 | 238 | 0.34 / 0.33 / 0.1 | 40/41/42/44/45/46 / 39 / 0.3 / 0.12 / 0.51 |
| 15-17-02 | b3fb9c3b (5810, 2.4) | 18 | 39 | 0.89 / 0 / 0.86 | 18 / 14 / 0.23 / 0.63 / 0.85 |
| 15-18-30 | 2d5dd210 (6688, 4.02) | 34/36/37/41/42/43/44/45/46/47 | 282 | 0.23 / 0.06 / 0.05 | 40/41/42/45/46/47 / 36 / 0.1 / 0.02 / 0.04 |
| 15-19-21 | ea113ee3 (6338, 4.17) | 18/19 | 330 | 0.44 / 0.3 / 0.39 | 19 / 155 / 0.46 / 0.1 / 0.33 |
| 15-20-15 | 306686e9 (5893, 4.32) | 16 | 3 | 0.74 / 0.26 / 0 | 16 / 2 / 0.74 / 0.26 / 0 |
| 15-18-39 | dedb3e53 (7989, 3.89) | 5/6/7/8/9 | 1613 | 0.47 / 0.35 / 0.16 | 6/7/8 / 509 / 0.62 / 0.26 / 0.05 |
| 15-19-56 | 517b7c30 (5956, 2.77) | 4 | 3 | 0.7 / 1 / 0.3 | 4 / 2 / 0.8 / 1 / 0.2 |
| 15-22-53 | d066fdbd (5842, 3.07) | 4/6/8/9/10/11/12/13/14/15 | 7 | 0.02 / 0 / 0.02 | 4/6/11/12/14/15 / 3 / 0 / 0 / 0 |
| 15-25-30 | 180f546b (5715, 4) | 11 | 4 | 0 / 0 / 0 | 11 / 2 / 0 / 0 / 0 |
| 15-30-15 | ce0959dc (5917, 3.59) | 16 | 10 | 0.19 / 0.03 / 0 | 16 / 0 / dead at [480] |
| 20-53-09 | 7dc894b3 (5985, 3.65) | 12/13/14 | 6 | 0.89 / 0.65 / 0.59 | 13 / 4 / 1 / 0.85 / 0.83 |
| 20-54-59 | b59bef18 (6592, 4.07) | 15/16/17 | - | (no Time Out in the clip) | 15 / None / (no Time Out in the clip) |

All 14 lock their known seeds from T1 (one no-lock first on 15-18-39 and 15-19-21 in some runs, then the retry). From T2 the
runner's 7 clips lock the same seeds and set T1 (one T2 run of 15-25-30 said "Charge not seen: no Mario" (NCC 0.15) with 74
pictures dropped; two reruns locked it; the capture side is unchanged in v72). From the FB2 step both new clips take the
Hallway profile and lock; the FB2 clip itself stays no-lock (the aura). 20-54-59 with its target screen saved and a shine
search running (BUSY): 4 plans in the 8 s wait (96/88/69/100%), the seed kept. BAN0 (a forced wrong placement): the retry
locks b59bef18. The share at the real confirm moves between runs with the dropped pictures (as in v70/v71); the known
outcomes: 20-53-09 and 15-19-56 work (v72 T2: 0.92 and 1.0 at the confirm), 15-17-02 fails (0). More q kept means more
states (15-18-39: 1613 at Time Out, v71 509); the plan reads at most 64 of them.
Duplighost renders (`test_dup_page.js`, Settings console frame time 33.367 = the renders): 1234abcd q 35-45 from the rays,
menu weights 39/42/45 1/3 each, plan +264 (3+ 99.98%, 4 31%); 9e3779b9 +252 (75%); 5eed0071 q 17/18 (0.003/0.997), +279 (100%):
the same plans the emulator checked above.

## Route note
The route panel's note no longer asks for 60 s of coin on the walk after Jr. Troopa or for B held through the text: the
Hallway T1 Charge locks the seed by itself, and the T1/T2 menus' coin only confirms it. On the Charge-lock Duplighost
route: Charge first, then keep the C-up bar up in Bombette's menu (its shines decide between the possible first coin frames).

## Suite
`run_suite.sh` (with `charge_live/test_zw_tolerant.js` and `test_beeps_stop.js` added): every test rc 0 and both log replays
lock as before (1379.7 s on 83ebd9e1, 655.7 s on 52467bd0), except `test_strip_geometry.js` once in the second full run
(the now-line 0.075 frames off at the cue under load); it passed in the first full run (stopped at a 30 min limit after test_strip_geometry) and in 3 of 3 runs alone.
`charge_live/test_session_plans.js` reproduces the v68 log's plans, so it now uses the tracker as it was until v71
(git 2d69af1; `TRACKER=disk` for v72's).

**Still open:** 15-30-15's cause (2); the wrong-lock case (a chance fit of the T2 coin still beeps; only more shines
or a read of Bowser's attack from the picture would tell); pMiss and lambda are upper bounds from few events; the
Duplighost coin-flash timing on console (no console Duplighost Charge clip); test_fb2_page.js not rerun (its renders are gone).

# Time Out Timer v71: the Duplighost Charge-lock route (Nov 6)

The Duplighosts can now be played with the **Charge lock** as an alternative to the RTA turn (route panel: *Duplighosts
route*, RTA by default). The study is `../dup_charge/README.md` (14b2938).

**The route (Charge lock).** T1: Mario's Super Charge first (no Z), Bombette Do Nothing on the beep; aim 3+ copies, 4 ideal.
T2: Power Bomb, then Jump x2 on the one that did not transform (3 and 4 copies both end the fight with Ultra Boots).

**What the page does.**
- Profile **dup** (`CHG_PROF.dup`, step key `chg: 'dup'`): the Hallway's camera table (bit-identical in this room), the
  Hallway capture Mario patch (NCC 0.90 on this room's render), the study's suggested burst curve `CHG_BRIGHT_DUP`
  (unverified on console), the Hallway's trigger (a real bar hide, 250-1000 ms), placement, retries (up to 6 s after the
  rays) and q check. The lock starts the zero-wait tracker (seed x q x console lag 0/1), with no Spiny Flip events.
- **Arena**: the floor band's B - R (purple floor +5..+20 here, the Hallway's bushes -25..-50, Final Bowser's lit floor
  luma > 95), tested first. Over every 6th frame of 4 Hallway clips and the FB2 clip it never says Duplighosts (0 / 1610);
  on the console clip of the Duplighost fight (aad978a3, Surge route) it does on 167 / 252. A Hallway picture on the
  Duplighost step is a Hallway retry; the Duplighost room on a Hallway / Final Bowser step moves the route to the
  Duplighost step (Charge-lock route only).
- **Plan** on Bombette's Strategies screen (saved screen S): `zwChoose` with profile dup3 (3+ copies): on best chance the
  frame with the best 3+ chance and, within 2 points of it, the best all-4 chance; the window types (green / yellow / red),
  the beeps (default 3), beep and visual offsets are the Hallway's. The headline, the strip line and the Charge panel show
  **3+ and all-4 chances** for the planned frame; the strip's top band marks the all-4 frames.
- **No lock** (no clear seed, Charge not seen, seed lost, or no Charge on T1): "play it blind: Do Nothing whenever you
  like, 3+ about 47%, all 4 about 13%" (study blind 47.2% / 12.9%; the Surge route without a lock is the same draw).
- **Confirm / turns**: the Strategies screen closing is the Do Nothing confirm (press check against the plan); the route
  moves on and the tracker is turned off, so the Hallway's walk tracker can start later.

**Odds with the page's defaults** (1.5 s lead, 1 s max extra wait = 30 frames, presses 25/50/25 over -1/0/+1, the
console-lag-1 state at 25%): 3+ about 96%, all 4 about 35% (400 model cases; 2 s: 99% / 42%). The study's table header
says "1 s" for its 60-frame column; a 30-frame window there is 97.3% / 44.6% (no lag state).

**Tests.** `test_dup_plan.js` (in `run_suite.sh`): the route option; the page's predicted copies equal `dc_model.py` on
every frame (15200 / 15200: 40 cases x 2 lags x 190 frames; `dup_charge/plan_cases.json` from `dc_fixture.py`); 40 plans
scored by the model with +-1 presses: 3+ 96.3%, 4 30.6% (claimed 95.2% / 29.7%); no-lock texts; the tracker off after the
step; the arena on 12 console frames (Duplighost, 2 Hallway clips, FB2). `test_dup_page.js` (not in the suite: it needs
emulator renders in /dev/shm): renders of T1 (`jr_charge/jc_probe.py`, Glide64) through `fb2_route/t6_capsim.py`, fed to the
page at 60 fps, then `dup_charge/dc_e2e_press.py` plays the planned frame in the emulator:

| seed | lock (score, ratio, after the rays) | q (truth) | plan (Strategies on clock 203) | page: lag-0 copies -1/0/+1 | emulator -1/0/+1 |
|---|---|---|---|---|---|
| 1234abcd | bfdda85d right (5744, 4.06x, 2.8-3.7 s) | 45/46 kept (42): wrong | seed lost at clock 172, play blind | - | - |
| 9e3779b9 | 77f79aca right (5689, 3.56x, 2.5 s) | 12 (12) | +252: 3+ 75%, 4 0% | 3 3 2 | 3 3 2 |
| 5eed0071 | f7118e6f right (8270, 3.81x, 2.2 s) | 23 (23) | +259: 3+ 100%, 4 0% | 3 3 3 | 3 3 3 |

In the simulated capture the coin's flash reads about 2.5-3 frames later against the burst than the console calibration
(4.8 frames) assumes (menu shines read at -99.7 / -129.7 / -56.7 for true -102 / -132 / -60). With the true first coin
late in the rays (42), the rays left 41/43-47 and the menu check kept 45/46; the tracker then lost the seed. Whether that
offset is the simulation (Glide64 screenshot timing) or real is not known: no console Duplighost Charge clip exists yet.

**Not verified on console:** the burst curve in this room, the trigger and placement on a real capture, the arena rule at
a real Charge hide (only the Surge clip's hides), the coin-flash delay in this fight, the timing of the Do Nothing press
(the Strategies box vanishing 3 frames after the confirm, the dup3 profile's value), and the 2-hit Jump kill on the
runner's boots. Recordings that would: 4-6 attempts with the capture chain of the Hallway clips and the input display on,
from the T1 menu (bar up for 2 s+) through the Charge, Bombette's menu (bar up, the coin visible for a few seconds), the
Do Nothing confirm and all 4 copy rolls, at least one with the T2 Power Bomb + Jump; ideally with the page's session log
of the same attempt.

# Time Out Timer v70: the runner's feedback on v69 (Nov 6)

What the runner reported, what it was, and what changed. Tests: `test_strip_geometry.js`, `test_beeps_window.js`,
`test_calibrate.js`, `test_zw_wait.js`, `test_turn_backout.js` (all in `run_suite.sh`), and `test_charge_feed.js` on the 14
Hallway clips.

1. **"The white bar sits between frames."** In dark mode the white bar is the now-line (`--cursor`); the gold line is the
   aimed frame. Geometry is now explicit and tested: frame f is the cell [f, f+1); the now-line is at nowF + 1 - voff,
   i.e. inside cell f exactly while a press now (with the visual offset) lands on f; the aim marker is at target + 0.5 and
   meets the now-line at tLast + (target - 0.5 + voff) * rate (measured: within 0.012 frames, voff 0 / -6 / -4.5 / +2.3;
   the gold column on the canvas is within 0.5 px of the cell centre). What could put a marker between frames in v69:
   - the zero-wait plan drew the top state's frames but chose the frame by the mixture of all states, so the aimed frame
     could be a failing cell between two runs (two yellow 2-runs); the strip now shows the frames most states agree on, and
     "best chance" only aims at such a frame;
   - the run-length label "2" was drawn on the boundary between the two yellow cells; it is now in the middle of a cell;
   - the cells were drawn left-aligned (the gap after each cell), now centred on the boundaries;
   - v69 applied the shine-clock's display correction (up to 100 ms) to the tracker's plans too.
   With different beep and visual offsets, at the last beep the now-line is at target + 0.5 + (beep offset - visual offset):
   a half-frame difference puts it on a boundary at the beep, by design (the beeps and the strip are separate cues).
2. **"It stopped beeping after ~20 s of waiting."** Found and fixed:
   - **The cause:** `zwPlan` stepped every tracker state to "now" at each plan. A shine drawn in the last ~10 frames is read
     only ~6 + tapLate frames later, so the state was passed over that frame before the flash was seen, and the next
     update (the next plan, ~2 s later while waiting) dropped every state that had the shine: the true one with it, about
     a 25% chance per replan. `test_zw_wait.js` reproduces it: v69 loses the seed after 9-10 s of replans, v70 keeps it
     for 25 s. The tracker is now stepped only to the frames whose shines have had time to be read (`zwHorizon`), and the
     coin's watched stretch only to what was watched on a steady coin (`zwSeen`; v69 set it to now - 4 even with the coin
     hidden).
   - **The clock:** the Charge tracker ran on 33.367 ms frames; a real N64 runs 240p at 33.43 ms (the runner's logs:
     33.414-33.445 ms over 60+ shine runs). The clock fell a frame behind every ~18 s, shifting the beeps (~0.9 frame at
     the usual Time Out frame) and pushing the menu shines out of tolerance on long waits. The page now measures the
     console's frame time from every run of shines (`consoleRate`, kept in the browser; default 33.427; Settings >
     Advanced can fix it). The tracker's shine offsets on 20-53-09 went from a drift of +0.4..+1.2 frames to -0.3..+0.4,
     and the share of states for which Time Out works at the real confirm on the two clips that worked rose from
     0.67 to 0.85 (20-53-09) and 0.8 to 1.0 (15-19-56).
   - **Backing out:** B on Time Out's target screen counted as the Time Out confirm, so the attempt was marked done and
     nothing more was planned. A hand-on-Bowser screen closing with the status bar still up is now a back-out (a confirm
     hides the bar 2-3 frames later): not a press, the route stays, the beeps restart on return.
   - When the tracker is really contradicted, the sidebar says "Charge lock: LOST" with why, and the strip says "Seed lost".
3. **"It failed to capture the Charge once (31%)."** A no-lock leaves a blind press (31%). Hardened:
   - a dropped frame-3 picture made the trigger picture frame 4 (+12.5) or 5 (+19.4); v69 took it as frame 3 (every frame
     after it off by one, no lock) or, at +19.4, did not trigger at all. The trigger now accepts up to +25 and the
     placement chooses the trigger picture's frame (3, 4 or 5), and the clock anchor follows it;
   - the retry with other placements: up to 4 alternatives while there is time (9 s after the rays), and also when the
     first placement had no skip (a skip forced at frames 13, 9, 17, 21);
   - frame-fed (below): all 14 clips lock their known seeds from T1, the 7 runner clips from T2, both new clips from the
     FB2 step; the forced wrong placement (BAN0) is recovered by the first retry.
4. **Low-opacity frames** are now explained on the strip in words: "Seed lost – showing old prediction", "Waiting for
   lock", "Reading the Charge…", "Tracking N possible states", "Window passed – planning the next one", "Seed changed".
5. **The strip jumped.** The now-line stays at 25% of the width in every state (v69: 10% without a plan, 25% with one);
   clock changes are eased (50 ms/s, 200 ms/s during a plan so the aim still meets the line at the cue); between plans on
   the tracker the strip shows the tracker's own frames (v69 showed the example seed until the plan); a plan's window
   stays fixed in game frames, and when a shine rules its state out the page replans and says "Seed changed".
6. **Window type** (Settings): best chance (automatic), green 3+, yellow 2, red 1 (calibration). The first run of that
   kind that starts no earlier than the earliest frame and is aimed within the max extra wait; otherwise the page says
   there is none. The aim is the run's middle frame (for even runs, the middle frame more states agree on).
7. **3 or 4 beeps.** v69 planned from now + lead + 1 frame and ignored the beep offset: with -5 and 4 beeps 500 ms apart
   over a 1.5 s lead the first beep was ~150 ms in the past (and dropped) unless the chosen frame came 5+ frames later.
   Beeps is a dropdown (default 3, once moved from a saved 4); every plan takes the earliest frame for which the press
   and every beep are still ahead, so it always plays exactly that many (tested: beeps 1-5 x offsets -5/-3.5/0/+2).
8. **Manual controls** (Shine, Find seed, New segment, Plan press, Undo tap, the spin list, reaction / TV lag / shine
   beeps) are in a collapsed "Manual mode (tapping)" section; keyboard shortcuts still work. Download session log is
   next to Reset in the status panel.
9. **Calibrate from last press** is in a "Calibrate…" menu next to Press check: last press or the average of the last
   3 / 5, beep and/or visual offset, shows the change, applies on "Yes, change them", then clears the measured presses.
   The one-click Move beeps / Move visual buttons are gone.
10. **Settings:** Basic (window type, beeps, lead, beep and visual offsets, Charge area) always shown; Advanced (with a
   line each) collapsed.
11. **Turn identification:** Spiny Flip (T1) and Time Out (T2) share the hand-on-Bowser screen. A Bowser screen 9+ s
   after the Charge burst and after Bowser's attack (a 3 s+ bar hide) is Time Out (T1 -> T2); one 1-8 s after the burst
   with no attack is the Spiny Flip (T2 -> T1). With the back-out fix, B on either screen no longer moves the route.

Frame-fed on v70 (`test_charge_feed.js`, real time; "at confirm" = share of states for which Time Out works at the
real confirm, -1/0/+1). With the console's frame time the prediction at the real confirm agrees with every known outcome
(15-17-02 now 0.24, it failed; 15-20-15, 15-19-56 and 20-53-09 worked):

| Clip | Seed (score, ratio) | Spiny c | States | At confirm | Earlier builds (README; the clip's actual outcome) |
|---|---|---|---|---|---|
| 15-14-09 | b400fca5 (7075, 3.94) | 105 | 30 | 0.27 / 0.39 / 0.09 | 0.39 / 0.09 / 0.08 (fails) |
| 15-15-06 | cf5894f0 (5702, 3.74) | 105 | 20 | 0 / 0 / 0 | 0 / 0 / 0.02 |
| 15-16-08 | 6d3b7b2b (6572, 5.11) | 106 | 27 | 0.59 / 0.04 / 0.31 | 0.62 / 0.01 / 0.31 |
| 15-17-02 | b3fb9c3b (6197, 2.27) | 103 | 8 | 0.67 / 0.24 / 0.65 | 0.24 / 0.65 / 0.87 (actual: fails) |
| 15-18-30 | 2d5dd210 (7420, 4.37) | 102 | 36 | 0.11 / 0.02 / 0.01 | 0.18 / 0.04 / 0.17 |
| 15-19-21 | ea113ee3 (7772, 4.73) | 102 | 24 | 0.3 / 0 / 0.16 | 0 / 0 / 0.78 (fails) |
| 15-20-15 | 306686e9 (6894, 4.45) | 106 | 2 | 0 / 0.76 / 0.24 | 1.00 (works) |
| 15-18-39 | dedb3e53 (8366, 3.95) | 105 | 501 | 0.26 / 0.05 / 0.18 | 0.44 / 0.10 / 0.13 (fails) |
| 15-19-56 | 517b7c30 (7004, 3.59) | 104 | 2 | 0.8 / **1** / 0.2 | 0.2 / 0.8 / 0.2 (works) |
| 15-22-53 | d066fdbd (5967, 3.06) | 102 | 3 | 0 / 0 / 0 | 0 / 0 / 0 |
| 15-25-30 | 180f546b (5913, 4.10) | 103 | 2 | 0 / 0 / 0 | 0 / 0 / 0 |
| 15-30-15 | ce0959dc (6189, 3.75) | 103 | 0 | No edge (dies at 481, as before) | No edge |
| 20-53-09 | 7dc894b3 (7476, 4.54) | 107 | 4 | 1 / **0.85** / 0.83 | 0.75 / 0.67 / 0.27 (works) |
| 20-54-59 | b59bef18 (6671, 3.94) | 101 | alive | (not pressed) | |

From T2 the runner's 7 clips lock the same seeds and set T1; from the FB2 step both new clips take the Hallway profile
and lock; the FB2 clip from T2 moves the route to FB2. 20-54-59 with its target screen saved (REF=1300, a shine search
running): 4 plans in the 8 s wait, the seed kept through 5 shines (v69 also kept it in this clip: no shine fell in the
last 10 frames before a plan). BAN0 (a forced wrong placement): no lock (1714, 1.04x), the first retry locks b59bef18.
One T2 run of 20-54-59 lost the seed at frame 405 after the coin detector missed a shine (a busy frame feed); the tracker
still drops a state on a missed shine.

Not changed: the Final Bowser tracker still runs on 33.367 ms frames (its tests are emulator renders); the shine-lock
clock keeps its own fit.

# Final Bowser phase 2, T6: the Charge lock -> the popup A (Close Call) -> T7 Power Bounce (Nov 3)

**Bottom line.**
- The page now has per-fight Charge profiles (`CHG_PROF` in `charge_live.js`): **hw** (Hallway T1, unchanged in what it
  computes) and **fb2** (the Final Bowser route's T7 step, whose pre is the T6 Super Charge). The FB2 profile reads the
  T6 Charge rays with the stage lightning as nuisance, keeps every RNG state the rays cannot tell apart, beeps the A
  that closes the "+3" popup (the Close Call lever, `fb2_live.js`), reads the frame that A happened on from the popup
  closing, follows the coin through Bowser's turn and beeps the T7 Power Bounce target A.
- **Emulator renders through the capture simulation, fed to the page in headless Chromium:** 8 of 8 T6 Charges locked
  the true seed (none wrong); pressing the beeped popup frame in the emulator gave **Close Call in 5 of 8** (the page
  said 41-63% each; a press without a plan is about 30%).
- **Time budget: not met on this machine.** The lock lands **1.6-2.6 s after the rays end** here (4 cores, 3 search
  workers, the page and the frame feeder on the same cores), against ~1.0-1.3 s for the lock, the plan and a 0.6 s
  countdown to fit before the window closes (+136). The plans above are therefore made "as if in time" (from frame
  +100 on). What it costs and what fixes it: below.
- **T7:** the page read the popup frame right in one of two phase-2 runs (off by 2 in the other); the coin during
  Bowser's turn left 337 and 853 states, so the T7 plan is near blind (7+ bounces planned at 6-7%; the emulator gave 3
  and 4 bounces). T7 needs the lightning phases pinned (see "Not done").
- **Real FB2 footage (14-47-09, Mario's Super Charge with the aura up):** trigger, frames, Mario (17 px right, NCC 0.85)
  and maps work; **no lock** (best 1871 at 1.05x the next), as expected: the aura's 16 draws per 20 frames sit between
  the ray draws and the aura profile (T1/T2/T4) is not built.

## The FB2 profile
| | Hallway (hw) | Final Bowser T6 (fb2) |
|---|---|---|
| route step | `hw_spiny` (pre: the T1 Charge) | `fb2_pb` (pre: the T6 Super Charge) |
| camera table | `readouts/data/charge_cams_mario_route.json` | `readouts/data/charge_cams_mario_fb2.json` (`fb2_route/t6_cams.py`, same method from an emulator T6 run; it equals the Hallway table to 0.000: same battle camera presets, Mario at (-85, 18, 0)) |
| Mario patch | `mario_ref.json` (route clip 15-15-06) | `mario_ref_fb2.json` (`fb2_route/t6_marioref.py`: emulator frame -1 through the capture simulation) |
| burst curve, trigger | `CHG_BRIGHT`, 5 above the menu | `CHG_BRIGHT_FB2` (capture simulation; frames 0-2 read 1.6/3.5/6.0, so the trigger is 7.5 above the menu, wider DP tolerance); the real FB2 clip's curve has the same shape (5.2, 9.4, 15.8 on frames 2-4) |
| nuisance | none | the lightning: one rand_int(359) per bolt, **before everything else on its frame** (then the effect creation, the coin, the ray redraws, the step); `fb2_route/t6_raycheck.py`: 3 emulator runs, 48/48 frames exact each, including bolts on frames 0 and 3 |
| stage 1 | effects A and B, K = 16384 | effect A only, K = 65536, started on frames 0..22 while the rays go on |
| stage 2 | `qscores` over q | `fb2full`: every lightning window pattern (1281 patterns from the phase pairs with p130 = p220 mod 5) x q |
| after the lock | the zero-wait tracker | the FB2 tracker / planner (`fb2_live.js`) |

Kernel changes (`kernel.c`, both profiles):
- **`stage1g`**: stage 1 by strides. For the part with the largest bound, both of its draws move by small constants
  along s = lo + r + g t (g up to 2^18 chosen per part), so its (speed, phase) cell is constant over runs of ~40 seeds;
  each run is scored once for that part and skipped whole when it cannot beat the threshold. **Same heaps as `stage1`**
  (checked: identical top-16384 sets, both effects, on 15-15-06 and 15-20-15), 1.5-2x faster.
- **Static dealing**: each worker gets its share of the bases (round-robin in bound order) in one message and runs
  them with no round trips (a worker's heap is the exact top K of its bases, so the union's top K is exact). Before,
  each chunk waited for the main thread, which stalls when the page is busy.
- The joint stage does its LCG jumps in the workers (same numbers).
- **FB2 stage 2** (`fb2variant`, `fb2full`, `fb2ub`, `fb2end`): all draws are single LCG steps, so a lightning pattern
  only shifts the stream; the score is a sum over frames of g[n][k] (frame n's redrawn rays with k extra draws before
  them), so each (pattern, q) costs one prefix-sum lookup per insertion. Effect B's creation moves with the bolts on
  frames 1-3 and a coin on 0-2 (4 variants). With no bolts it equals `full()` to 0.001 (all q, Hallway clip).
  Candidates are scored in decreasing upper bound until the next bound is below 1/1.8 of the best.

Hallway after these changes (deterministic feed, `test_charge_feed.js`): 15-15-06 locks cf5894f0 q19 in 3.8 s (was
5.5 s), at the Time Out confirm 0/0/0.02, beep +66 (61%), as before; 15-20-15 locks 306686e9 q16 in 3.6 s (was 5.2 s),
beep +46 (75%). `run_suite.sh` (full, after these changes): all 24 tests and the torch maze rc 0, both log replays lock as before (1379.7 s, 655.7 s on 52467bd0).

## After the lock (fb2_live.js)
1. **States.** The rays pin the stream only where the bolt draws shifted it: insertions in the first ~9 frames (no
   redraws yet) and the last ~7 (faded rays) barely change the score, so several end states fit (in the emulator run
   r1 the true pattern scored 8216 against a best of 8218). The page keeps every (pattern, q) within 0.2% of the best,
   each with every phase pair behind that pattern (and console lag 0 / 1 frame after the rays, 0.75 / 0.25): 85-4000
   states in the runs below (an even sample of 4000 when more).
2. **Popup plan.** For every state and every K in the rest of the window, Bowser's AI on K + 40 and the Close Call
   roll (t6model.py, ported; Bowser's T5 attack from the new setting rules out Body Slam / Claw on T6). The beeped
   frame maximises P(Close Call) over the states with presses 25/50/25 over -1/0/+1; among frames within 3 points of
   the best, the one with the best P(Close Call and 7 bounces with the best T7 window) wins (sampled states). Three
   beeps 0.3 s apart, the last on the press, timed as Time Out's.
3. **K seen.** The popup (a bright box across the top middle) is up on frames 76..K+1; the first picture without it
   shows frame K + 2 (emulator: K = 100 -> 102, 120 -> 122; no press: K = 137). Dropped pictures around the closing
   widen it to a range of K, all carried. Fallback: the status bar comes back on K + 5.
4. **Coin.** The status bar is up through Bowser's turn and the T7 menu: every shine seen must be a predicted one
   (+-2, up to 3.5 late) and every predicted shine while the coin was steady must have been seen.
5. **T7.** On the Power Bounce target screen (the step's B screen): the target-A frame in the beep window with the best
   P(7 bounces) (the kill at 80 HP: 15 + 14 + ... + 9), 0.1 x P(6+) as tie-break; the page's usual lead, window, beeps.

## Results (emulator T6 renders -> `fb2_route/t6_capsim.py` -> the page, `test_fb2_page.js`)
Build b1 (`route_build.py 1234abcd`, T5 Fire Breath, so Body Slam and Claw allowed on T6), the page told "Fire Breath".
Plans made as if the lock had landed by +100 (`KAT=100`); the emulator then pressed the beeped frame and its
neighbours (`fb2_route/t6_press.py`).

| seed (PRE) | bolts in the rays | lock | after the rays | states | beep K, P(CC) shown | CC at K-1 / K / K+1 |
|---|---|---|---|---|---|---|
| 0badc0de (60) | - | true | 1.6 s | 2382 | 136, 53% | no / **yes** / no |
| a5a5f00d (60) | - | true | 2.3 s | 4000 | 104, 61% | yes / **yes** / no |
| 13579bdf (60) | - | true | 2.0 s | 1137 | 133, 58% | yes / **yes** / no |
| deadbeef (60) | - | true | 2.0 s | 1092 | 101, 56% | no / **yes** / no |
| 5eed0fb2 (60) | - | true | 2.5-2.9 s | 4000 | 135, 56-59% | no / no / no |
| 00000001 (60) | - | true (K = 65536; at 16384 its A score ranked below the cut: no lock) | 2.0 s | 1530 | 121, 63% | no / no / yes |
| c0ffee11 (90) | 18 | true | 2.3-2.6 s | 85-169 | 127, 41% | no / no / no (true state kept, outvoted) |
| feedf00d (100) | 8, 38, 43 | true | 2.0 s | 383 | 100, 58% | yes / **yes** / no |

Close Call at the beeped frame: 5/8; with the 25/50/25 press error 0.44 on average (the page said 0.56). Lock scores
5900-7800 at 3.4-5.1x the next (wrong ones ~1700); 8/8 right, 0 wrong.

T7 (phase-2 renders with the popup pressed on a Close Call frame, through Bowser's turn to the target screen):
| seed | K true / seen | states after the coin | beep d, P(7) / P(6+) shown | emulator d-1 / d / d+1 |
|---|---|---|---|---|
| a5a5f00d | 104 / 104 | 337 | 468, 7% / 25% | 4 / 3 / 3 bounces |
| 13579bdf | 133 / 135 | 853 | 441, 7% / 27% | 4 / 4 / 3 bounces |

**Time** (page in headless Chromium, 3 search workers, 4 cores shared with the page's own frame work and the feeder):
stage 1 (A only, K = 65536) 1.5-2.2 s of wall time, of which only 0.1-0.3 s ran before the rays ended (the main thread,
busy with the pictures, starts it late), the joint stage 0.1-0.4 s, stage 2 0.1-0.2 s, the plan 0.04-0.4 s. The search
alone is ~1.4 CPU-s of WebAssembly (`node`, one thread), so with 7+ free cores and the early start on time it would
end at about the rays' end and the lock would land ~0.4-0.6 s after them; on this machine it does not. The popup
window closes 2.5 s after the rays and the plan needs ~0.8 s of it for the beeps.

## Not done / not verified (FB2)
- **The time budget** (above). Ways to fix it, in order of payoff: more cores (the search parallelises); the lightning
  phases pinned before the Charge (the purple bolt onsets in the T6 menu: `fb_aura/clip_bolts.py` saw them on console)
  so stage 2 and the plan have 1-4 states instead of hundreds; the ray maps in a worker (the main thread computes them,
  ~0.2 s twice). Narrowing stage 1 with the T6 menu's coin does not work without the phases: the draws between the
  menu's coin and the Charge depend on them.
- **Lightning phases from the picture**: not read. That is also what limits the popup plan (5/8, the states outvote
  the true one) and T7 (hundreds of states left).
- The menu coin before the Charge (q, as chgQBack for Hallway): not used for FB2.
- `CHG_BRIGHT_FB2` and the popup box are from glide64 renders through the simulation, not console T6 footage.
- The beep timing for the popup and the T7 A is Time Out's relation (zwPlan), not measured on FB2.
- The aura profile (T1/T2/T4: aura + lightning) is not built.

# Charge lock: the seed from the Charge rays, live on the page (Nov 2)

On Hallway Bowser turn 1 the page reads gRandSeed from Mario's (Super) Charge rays while the run goes on, carries it
through Lakilester's Spiny Flip and Bowser's attack with the zero-wait tracker, and on turn 2 beeps the best Time Out
confirm frame (or says No edge). Nothing here makes the runner wait: the only added time is the beep window.

## The first live session on v68 (2026-11-03 evening) and what changed
Log timeout-timer-log-1793757328924 (the same session as -1793757228704, extended to 986 s), clips 2026-11-03_20-53-09
(the Charge at 856 s, Time Out worked) and 20-54-59 (the Charge at 966 s, "the thing doesn't load"). Clip times map to
the log by the bar's hides: 20-53-09 = log - 849.35 s, 20-54-59 = log - 959.63 s. Real N64, OBS 1280x720 60 fps.

| Charge (bar hide, s) | Lock | Seed, score, ratio | Time Out press err (frames) | Page: works | Actual |
|---|---|---|---|---|---|
| 218.9 | yes | f70bd8ab, 6948, 4.12x | +1.69 | no | ? |
| 282.6 | no | best 1766, 1.04x | (no plan) | - | ? |
| 348.1 | yes | de795e8e, 6776, 4.16x (Mario +16.5 px) | -3.27 | no | ? |
| 447.2 | no | best 1812, 1.07x | (no plan) | - | ? |
| 540.4 | yes | d815b1fa, 7518, 3.87x | -3.28 | no | ? |
| 612.1 | no | best 1499, 1.02x | (no plan) | - | ? |
| 659.3 | no | best 1988, 1.03x | (no plan) | - | ? |
| 749.5 | yes | 7424190f, 7355, 4.70x | -1.27 | yes | ? |
| 808.3 | no | best 1868, 1.13x | (no plan) | - | ? |
| 856.5 | yes | 7dc894b3, 7698, 4.44x | +0.71 | yes | **works** (clip 20-53-09) |
| 966.3 | yes | b59bef18, 7403, 4.13x | no beeps: target screen up 8 s | - | not pressed (clip 20-54-59) |

The runner reset after every Time Out, so only the clipped outcome is known. Frame-fed, both clips lock the live seeds
(7dc894b3 q 13, b59bef18 q 15); 20-53-09 gives 0.75 / 0.67 / 0.27 at the confirm (-1/0/+1).

- **No beeps on the last attempt (20-54-59): a shine search blocked the plan.** The page plans when the target screen has
  been seen for 300 ms (`autoPlan`), but `autoPlan` returned while any shine seed search ran. The turn-2 menu's coin
  (one stretch already in the chain since 966.1 s) started a chain search on its 2nd shine (980.2 s, reproduced by
  replaying the log's shines and coin returns through the page); the earlier one in this session took 11.5 s. The target
  screen came up at ~980.6 s and stayed until the log was saved at ~988.7 s: no plan, and no zwInconsistent (the tracker
  was never asked). Fed frame by frame with the target screen saved and a search running from the first turn-2 shine,
  v68 makes no plan; this build makes them (0.94 at 22.5 s). The zero-wait plan needs no search: `autoPlan` now only waits
  for a search when there is no tracker.
- **The route went into Final Bowser after every Time Out.** On Time Out's screen closing the route moved to the next
  step, which is now the Final Bowser step (FB2). A retry without a 10 s gap stayed there, and the next Charge was read
  with the FB2 profile: at 478-489 s and 704-708 s (Mario NCC 0.11 against the FB2 patch; the FB2 profile arms on any hide
  and triggered on the Time Out animation and later turns). The runner fixed the step by hand 7 times; replayed without
  those, v68 would have read 13 of the session's triggers with the FB2 profile (charge_live/test_route_replay.js). Now:
  - a target screen closing never moves the route from the Hallway into Final Bowser: after Time Out the route stays on
    Hallway T2 and plans nothing more there (`st.hwDone`, "Time Out is done for this attempt");
  - the arena is read at every arming of the Charge capture (`chgArena`): the band under the battle floor (320-space y
    165-190) and the top of the picture (y 40-100). Hallway: luma 45-67, blue excess B - R +27..+64 at all 43 bar hides
    of the 14 Hallway clips; Final Bowser: 114-116 and +4..+11 (clip 14-47-09). A black or faded picture is neither.
    Mario's patch cannot tell them apart at the hide (NCC 0.08 with either). On the FB2 step a Hallway picture arms the
    Hallway profile, and the burst sets the route to Hallway T1 (`chargeStepSet`). On a Hallway step a Final Bowser
    picture sets the route to the FB2 step and arms the FB2 profile, so FB2 is entered when its battle shows.
- **No lock on 5 of the 11 real Charges.** Mario 0.99 and 45-48 frames in all of them, and 612/659/808 had a clean
  capture (one 33 ms gap). The best seed was 1.5-2.0k at 1.0-1.1x: nothing fit at all, so it was not q (stage 2 covers
  q 0-47), Mario's position (dx 0) or the trigger (+7.4..+7.8 = frame 3 in all of them), and the move was the same (the
  Charge's rays are the same two energy_in_out effects for every Jump Charge level in the decomp; the FP used is 4 in
  both clips). What the clips show: the N64 sometimes runs a game frame with no picture of its own inside the rays (the
  capture shows 2 pictures per game frame throughout, but the burst and the rays are one frame ahead after it). On
  20-54-59 the brightness placement puts that skip at frame 17-18 and scores 7.2k; one picture per game frame scores 6.0k.
  Where the burst is flat (frames 9-17) the placement can put the skip a few frames early, and then everything after it
  is one frame off: a frame-fed run of 20-54-59 put it at frame 10 and gave "best 1684, 1.01x", the live no-lock's
  signature (an earlier session's T1 run on 15-18-39 did the same, 2094 at 1.01x). Not proven to be the live cause: the
  live pictures are not in the log. Two changes:
  - **retry**: a real Charge with no clear seed is searched again with the next-best placement (the assignments around
    each skip of the last one banned), at most twice (`chgRetry`, `CHG_ALTS`; 1.2-3.5 s per search live, Time Out's target
    screen comes ~12 s after the rays). With the first placement forced to the early skip, 20-54-59 gives the live
    signature (1713, 1.04x), and the retry locks b59bef18 (6987, 4.27x);
  - **the evidence**: a no-lock with Mario seen keeps its game frames (the last 2, greyscale JPEG, about 2 MB each) and
    Save log writes them (`chargeCaptures`); `tools/capture_u8.py` turns one into the rasters `tools/harness.c` reads. The
    no-lock log line also carries each effect's stage-1 best and K-th score (`s1`): one effect clear and the other at
    noise means its rays were read right and the draws between were not; both at noise means the pictures were placed
    wrong. Tried and dropped: weighting the placement by the capture's clock (2 pictures per game frame) put the skip
    late or nowhere and lowered every score (6.0-6.2k on 20-54-59).
- **"Charge not seen" (264, 390, 396, 595, 788, 794, 836, 841, 932, 940 s) are harmless.** None was followed by a Spiny
  Flip hide 3.8-4.0 s later, and each attempt's real Charge came 15-30 s after. Four (264, 595, 836, 932) are the battle
  intro after a long bar-up (14-44 s while walking): a trigger 980-1010 ms after the hide at +6..7, then +29 within
  0.3 s, which is the intro's brightening on both new clips (59 -> 88 in 0.3 s). Every real Charge of the session
  triggered 439-514 ms after its hide. The others had no burst at all. test_fix_proposal.js section 4 runs both clips'
  pictures after that prefix: the intro is rejected and the Charge still triggers 483 / 500 ms after its hide.
- **Press timing.** Every plan was one frame (`w: 1`); Time Out's working frames come in runs of 0-2 for all states
  left, so no window takes +-2-3 frames. The runner's presses on the beeps: +1.69, -3.27, -3.28, -1.27, +0.71 (mean -1.1,
  rms 2.3); the page's own calibration dropped the two -3.3 ones (it only took |err| <= 3; now 5). zwPlan scored frames
  with +-1 (25/50/25); it now uses the runner's own spread (a normal with the rms of the Press check presses, 0.7-3
  frames, once 3 are in: `pressDist`). Replaying the 5 planned attempts through the tracker (test_session_plans.js; every
  logged Spiny Flip frame and plan target reproduced), the chance Time Out works under the runner's spread goes from 0.50
  to 0.54 on average (0.34 -> 0.45 on the 348 s attempt). The pressed frames that worked by the page (749, 856) are
  the ones that worked in the replay; the three -3.3/+1.7 presses fell on failing frames.

Settings for the runner: **Beep offset -5 -> -4** (the presses averaged 1.1 frames early; 5 presses, so recheck after
10), Press check correction stays 0 (the one verified outcome, +0.71 at 856 s, read as working and worked).

Frame-fed on this build (`test_charge_feed.js`, real time; the full suite passes): all 14 Hallway clips lock their
known seeds from T1 (7 route clips b400fca5 ... 306686e9, the 5 earlier runner clips dedb3e53, 517b7c30, d066fdbd,
180f546b, ce0959dc, and 7dc894b3 / b59bef18 for the two new ones), with the same Time Out shares at the confirm as
before (e.g. 15-19-56 0.2 / 0.8 / 0.2, 20-53-09 0.75 / 0.67 / 0.27); the runner's 7 clips from T2 lock the same seeds
and set T1; 20-53-09 and 20-54-59 from the FB2 step take the Hallway profile, lock and set T1 (v68: FB2 profile, Mario
0.11-0.14, no lock); the FB2 clip from Hallway T2 moves the route to FB2 at its first bar hide and reads as from the
FB2 step.

Tests: `charge_live/test_route_replay.js` (log replay of the route: every trigger on a Hallway step, never the FB2 step;
v68 reproduces the FB2 reads), `charge_live/test_session_plans.js`, `charge_live/test_fix_proposal.js` section 4,
`test_charge_feed.js` with `STEP=fb2` (both new clips lock from the FB2 step and set Hallway T1; the FB2 clip from
Hallway T2 moves the route to FB2 and reads as from the FB2 step), `REF=1300 BUSY=1` (the plan with a search running)
and `BAN0` (a forced wrong first placement, for the retry).

## The runner's first live attempts (2026-11-03) and what changed
Logs timeout-timer-log-1793735643131 / -1793736599276 / -1793737154078 / -1793737237152 / -1793737413564 /
-1793737579773 and clips 2026-11-03_15-18-39, 15-19-56, 15-22-53, 15-25-30. Test: `node charge_live/test_fix_proposal.js`
(node only, against git afeaa5f as "before"); `test_charge_feed.js` on the clips; `test_hw_steps.js`.

- **Attempt 1: a correct lock and a dead carry.** The lock was ed937d1f q 21 (score 6835, 3.41x). It landed after the
  Spiny Flip confirm, so `chgStartTracker` rebuilt the menu's visible stretch from `CHG.pres` and ended it 4 frames
  before the bar hid. A shine drawn on frame f flashes at about f + 6 on this clock, and the true seed shines on frame
  117 (lag 0) / 118 (lag 1) with the bar hiding at ~122. So both particles died at 120 (reproduced exactly). The stretch
  now ends 6 frames before, as `zwInput` does (c - 4, c = hide - 2). With that, the seed survives all five turn-2 shines
  (about 6% of random seeds do too). `zwCoinBack` had the same 4-frame end, and it also ignored a `visTo` that a confirm
  had already set, so a coin box flickering after a confirm made hidden frames look visible. It now ends at
  min(visTo, hide - 6).
- **Attempts 2-6: the trigger fired on the wrong thing.** The cases were:
  - a hallway / battle-entry bar hide taken as the Charge confirm (bar up 2-67 s while walking);
  - a fade from black (base 2.4);
  - the battle intro's brightening while the bar was still hidden;
  - a coin-box flicker re-arming the capture 10 s later.

  In each case the page captured something that was not the Charge (Mario NCC 0.06-0.09) and searched it, while the
  real Charge went by. The real Charge's bar hide was then read as the Spiny Flip confirm, which shifted the route by
  one ("skips the Spiny Flip turn"). Now (hw profile; FB2 keeps its old rules):
  - arming needs a bar hide that ended a real bar-up of 600+ ms;
  - the trigger only counts 250-1000 ms after that hide (the burst's frame 3 comes 433-484 ms after it on all 11
    clips), and needs base >= 30;
  - every picture of game frames 5-27 must sit on `CHG_BRIGHT` (within +-1.5 frames and 10 levels, at most 3 misses);
  - a capture whose frame 0 has no Mario (NCC < 0.5) is not searched: "Charge not seen", and the page waits for the
    next real hide;
  - no burst in the window gives the same "Charge not seen".
- **The confirm is anchored on the burst.** The bar hide that would count as the hw_charge pre is held (`chgPend`) until
  the capture shows a real Charge. Otherwise it is dropped and the pre stays open, so a battle-entry hide never shifts
  the route.
- **Any Hallway step arms the Hallway Charge.** A Charge seen on T2 sets the route to T1 (`chargeStepSet`). A long gap
  (10 s+, a reload) on Hallway T2, or on the next step right after the route left the Hallway by itself (fewer than 3
  real bar hides since), sets the route back to T1 (`stepBackToHallway`).

Frame-fed (`test_charge_feed.js`; the patched build; real time, 60-170 pictures dropped per clip). "At confirm" is the
share of states for which Time Out works at the confirm (bar hide - 3 frames; -1 / 0 / +1):

| Clip | Lock (seed, score/ratio) | Spiny c | States | At confirm | Runner's result |
|---|---|---|---|---|---|
| 15-14-09 .. 15-20-15 (7 route clips) | all 7 lock their known seeds | 103-107 | 6-72 | as before (e.g. 15-17-02 0.24/0.65/0.87) | - |
| 15-18-39 (attempt 3) | dedb3e53 (7998, 3.98x); one T1 run said "no clear seed" (2094, 1.01x) | 105 | 595 | 0.44 / **0.10** / 0.13 | fails |
| 15-19-56 (worked) | 517b7c30 | 104 | 2-3 | 0.74 / **0.58** / 0.42; from T2: 0.2 / **0.8** / 0.2 | **works** |
| 15-22-53 (savestate fade) | d066fdbd | 102-103 | 3 | 0 / 0 / 0 (T2 was Focus) | - |
| 15-25-30 (battle intro) | 180f546b (5042, 3.86x) | 104 | 2 | 0 / 0 / 0 | - |
| 15-30-15 | ce0959dc (6169, 3.72x) | 103 | 0: No edge | - | - |

Started on Hallway T2 (STEP=t2), the 5 runner clips lock the same seeds and set the route to T1. In 15-30-15 the
tracker keeps 5 states through both turn-2 shines and loses them in the 6 s after, which show no flash. That is not
explained (a missed draw in T1 or Bowser's turn, or a coin that did not show).

## What the page does

1. **Arming.** On the route's Hallway T1 step, when the status bar hides (the Charge confirm hides it 3 frames after
   the confirm), the page starts keeping capture frames, each drawn into the 640x480 game raster (2 px per 320-space
   unit, the capture map fitted for this OBS setup: 1280x720, `CHG_MAP`) as luma.
2. **Trigger.** The burst (`radial_shimmer`) brightens the game area. The first frame 5 levels above the median of the
   frames before it is game frame 3 (frame 0 = Charge confirm + 13). Calibrated on all 7 route clips (the true frame 0
   from the seed's score). A trigger that does not keep rising (+15 by 0.35 s) is dropped.
3. **Game frames.** The browser drops pictures and its frame times jitter by +-17 ms, so each new picture is placed by
   dynamic programming on the burst's brightness curve (`CHG_BRIGHT`, the same in every Charge: sd < 0.7 levels over 7
   clips) and the time between pictures. Frames 0-2 and -2/-1 are taken by time.
4. **Mario's position.** In 2 of the 7 clips (15-14-09, 15-19-21) Mario stood 16.5 raster px (6.1 world units) to the
   right of the reference. That, not the burst, is why those two failed offline: the rays are centred on him. The page
   finds him by normalised cross-correlation of a high-passed patch (`mario_ref.json`, frame -1 of 15-15-06) on frames
   -2..1 and moves the ray centre by 0.37 units per px.
5. **Ray maps.** For each of the 48 frames, every integer angle and every 4-unit step from the centre: luma on the
   projected ray minus beside it (+-2 px in 320 space), through the per-frame camera table
   (`readouts/data/charge_cams_mario_route.json`). **The burst is removed per angle:** each angle's median over
   distance is subtracted (the burst's streaks run the whole radius, a ray is a 128-unit segment). No emulator render
   is needed. Tested against the old emulator-render subtraction on the 5 clips it handled: the same lock margins.
6. **Search** (`kernel.c`, WebAssembly in workers, all cores but one by default):
   - Stage 1, per effect (A: scale 1.2, frame 0; B: scale 0.8, frame 3, whose base draw is the 25th or 26th LCG step
     after the seed): an effect's 10 initial rays depend only on the state s1 after its base-angle draw, and s1 lies in
     that base's interval of 2^32/361 states. Each base has an upper bound (the best ray score at each part's angle).
     Bases are searched in decreasing bound with branch and bound against the running K-th best (K = 16384, parts in
     decreasing bound order, each part's two draws by LCG jump constants). A base whose bound is at or below the K-th
     best is skipped, so the top K of all 2^32 per effect is exact. 20-50 bases of 361 are searched.
   - Joint: each candidate's other effect's initial rays are scored exactly; the top 300 go to stage 2.
   - Stage 2: the full simulation of both effects over 48 frames for every first-coin frame q (0..47, then 24/48).
   - **Lock** if the best score is at least 3000 and 1.8 times the next (true seeds 3300-8300 at 2.3-5.4 times the
     runner-up on the route clips; wrong ones 750-1500 at 1.0-1.2).
7. **Tracker.** The lock starts the zero-wait tracker (`zw*` in page_template.html) at frame 0 with particles
   seed x q (every q within 0.5% of the best; late first coins barely move the rays) x console lag 0/1/2 frames after
   the rays (weights 0.7/0.2/0.1). The coin's shines and visible stretches seen while the search ran are added. The
   Spiny Flip confirm (read from the status bar hiding, `HUD_HIDE.hw_spiny = 2` frames, carried at -2..+1: a dropped
   picture only reads it late) splits each particle over impact +40..+175 (thrown with A) x guard. At most 6 q are
   kept (best first) and lag 0/1, so a split stays under the tracker's 40000. Shines may read up to 3.5 frames late. Particles merge once Bowser's AI has run and his attack's
   draws are done. The turn-2 menu's coin prunes them; Time Out's target screen beeps the best frame in the window
   (or No edge, as before).
8. **q from the turn-1 menu** (`chgQBack`): for each q the coins before frame 0 follow from the seed stepped back; the
   menu's seen shines must match. Not exercised by the route clips (they start ~1 s before the menu, so no menu stretch
   was long enough), so **unverified**.

Sidebar: "Charge lock: yes/no", time to lock after the rays end, the hypotheses left, the seed and q.

## Files
- `kernel.c`: the search (stage 1, joint, stage 2); `build_kernel.sh` compiles it to `kernel.wasm.b64` (clang wasm32),
  which `build_page.py` inlines.
- `charge_live.js`: the page side (capture, trigger, frames, Mario, maps, workers, lock, tracker start, sidebar).
- `mario_ref.json`: Mario's reference patch.
- `tools/gameframes.py` (clip -> game-frame rasters with the page's rule), `tools/jsmaps.js` (the page's own maps code
  in node), `tools/harness.c` (the kernel natively, single thread).
- `../test_charge_clips.js`: the 7 route clips through the page in headless Chromium in real time.
- `../test_charge_feed.js`: the same with the frames fed one by one at their real times (no video decoding).
- `fb2_live.js`, `mario_ref_fb2.json`, `tools/harness_fb2.c`, `../test_fb2_page.js`: the Final Bowser profile (top section).

## Results

### Offline, the page's maps code + kernel (tools/, native, 1 thread)
| Clip | Seed | q | Score | x runner-up | Stage 1 |
|---|---|---|---|---|---|
| 15-14-09 | b400fca5 | 7 | 7088 | 3.92 | 3.8 s |
| 15-15-06 | cf5894f0 | 19 | 5878 | 3.79 | 5.8 s |
| 15-16-08 | 6d3b7b2b | 41 | 7045 | 5.18 | 4.7 s |
| 15-17-02 | b3fb9c3b | 18 | 6397 | 2.30 | 7.7 s |
| 15-18-30 | 2d5dd210 | 42 | 7467 | 4.38 | 5.3 s |
| 15-19-21 | ea113ee3 | 19 | 8235 | 4.94 | 5.4 s |
| 15-20-15 | 306686e9 | 16 | 7400 | 4.65 | 5.7 s |

All 7 lock, including the two that failed before (Mario's position). The 5 earlier seeds are reproduced.

### Live, in headless Chromium (test_charge_clips.js)
Each clip played in real time by a `<video>` and handed to the page as its capture (VP9 re-encode, crf 8). The page
starts on the Hallway T1 step with no walk lock: the rays are the only seed source. "Lock" is after the rays end;
Time Out's bar hides 11.8-12.6 s after the rays end in every clip, so that is the deadline. "At confirm" is the share
of the tracker's states for which Time Out works at the real confirm (bar hiding - 3 frames; -1 / 0 / +1). "Beep" is
the frame the page would have beeped had the runner waited on the target screen (lead 1.5 s, window 1 s), relative to
the real confirm, with the chance it showed.

**This machine was shared with another session running 4 CPU-bound threads for most of the testing (load 5-9 on 4
cores)**, so the browser dropped pictures and the search ran on what was left. Final build, run with the lowest load
(load 1.8 rising to 6):

| Clip | Lock | Seed, q | Time to lock (search, 3 workers) | States at plan | At confirm (-1/0/+1) | Predicted | Actual | Beep (shown) |
|---|---|---|---|---|---|---|---|---|
| 15-14-09 | yes | b400fca5, 3-9 | 4.0 s (3.7) | 11 | 0.39 / **0.09** / 0.08 | fails | fails | +50 (61%) |
| 15-15-06 | yes | cf5894f0, 19 | 5.5 s (5.3) | 8 | 0 / **0** / 0.02 | fails | fails | +66 (61%) |
| 15-16-08 | yes | 6d3b7b2b, 41-47 | 4.2 s (4.0) | 8 | 0.62 / **0.01** / 0.31 | fails | fails | +71 (91%) |
| 15-17-02 | yes | b3fb9c3b, 18 | 6.0 s (5.7) | 9 | 0.23 / **0.63** / 0.85 | works (wrong) | fails | +49 (90%) |
| 15-18-30 | yes | 2d5dd210, 35-42 | 5.1 s (4.9) | 20 | 0.18 / **0.04** / 0.17 | fails | fails | No edge (34% < 40%) |
| 15-19-21 | yes | ea113ee3, 19 | 10.0 s (9.7), load 6-8 | 3 | 0 / **0** / 0.78 | fails | fails | +47 (73%) |
| 15-20-15 | yes | 306686e9, 16 | 13.5 s (13.2), load 6-8 | 0 | - | No edge | works | No edge |

An earlier build (before the q cap and the -2..+1 Spiny shifts, at load ~3) gave all 7 with the tracker alive:
15-20-15 locked 5.2 s after the rays, **1.00 at the confirm (works, actual works)**, beep +46 (75%); 15-17-02 0.00
(fails, actual fails); the other five as above. Over 11 full runs of the 7 clips during development (several builds) the rays
locked the right seed in 68 of 77 clip runs and never locked a wrong one. The misses: 15-16-08 eight times (its true
seed is the weakest offline, ranked ~40th after the joint stage; every miss was at load 5-9) and 15-18-30 once (an
early build's frame placement).

Under heavy load the carry after the lock is what breaks: the bar-hiding read of the Spiny Flip confirm came 5-10
frames late twice, and a lock that lands after the turn-2 menu has nothing to prune with; both end as "No edge" (the
page never beeps on states that do not fit). 15-17-02's 0.63 at the confirm is the one wrong prediction; that clip had an
unexplained coin before the Charge in the offline fit too.

Lock time on this machine: 3.7-5.7 s of search with 3 workers at moderate load (single thread, native: 3.8-7.7 s).
Maps: 0.15-0.3 s. Capture: 3-4 ms per picture while armed (about 2 s).

## Not verified
- Only this capture: 1280x720 OBS of a GV-USB2, with this crop (`CHG_MAP`). Another crop or capture card needs the map
  refitted; the Mario check (NCC) and the trigger levels would show it (the sidebar says why there is no lock).
- Only Mario's Super Charge with Lakilester, at the route's camera. Goombario's Charge and other fights are not built.
- `HUD_HIDE.hw_spiny = 2` is from the A icon on the clips (bar hides 0-2 capture frames after the A); the tracker
  carries -2..+1 around it. The Time Out confirm in the table is the bar hiding - 3 frames (as Mario's actions), so the
  "predicted at the real confirm" column is read at that frame (+-1 shown).
- Bowser's attack is not read from the video (the coin on the turn-2 menu does the pruning).
- The q check against the turn-1 menu (unexercised, see above).
- The input display is not read: the press correction is not auto-calibrated.
- WebGPU is not used: the browser here has none; the WebAssembly search alone fits in the time available.

## Missing pictures (the aura finding, fb_aura/README.md section 8)
Some logic frames never get their own picture in the capture, and x264 sometimes re-encodes a duplicate so it looks
new. What that means here:
- **The rays window.** Frames are not counted: each new picture is placed on the burst's brightness curve (dynamic
  programming over n, steps of 0-3 frames), so a missing picture shows as a jump on the curve and a re-encoded
  duplicate as a step of 0. On the 7 source clips the curve, indexed by distinct pictures from the trigger, has sd < 0.7
  levels at every one of frames 3-45, so none of the 7 has a missing logic frame inside the rays (a skipped one would
  shift every later index by a whole step, 2-9 levels). That includes 15-17-02 and 15-18-30.
- **After the rays** the tracker's clock is time (the capture's frame times), not a picture count, so a logic frame with
  no picture costs nothing. What it cannot see is a lag frame (time passes, the game does not step); those are carried
  as 0/1 frame hypotheses after the rays and as the Spiny Flip confirm shifts.
- So a hidden missing picture does not explain the coin mismatches of 15-17-02 (a flash 24 frames before the Charge)
  and 15-18-30 (q before vs after the Charge): the offline check (readouts/charge_qback.py) also clocked by time. Not
  resolved; both are before the Charge, which the live page does not need.
