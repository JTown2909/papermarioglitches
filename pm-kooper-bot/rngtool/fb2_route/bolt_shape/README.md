# Reading the stage lightning's zigzag (study, Nov 21-22; not on the page yet)

**Why:** each Final Bowser stage bolt draws one `rand_int(359)` (`effects/lightning_bolt.c`, `unk_110`). The page already
uses bolts for timing only (when and where a bolt shows is fixed by the stage's loops, `kkj_02.inc.c`). Its zigzag comes
from that value, so a readable shape is a direct reading of the RNG, which could narrow the T7 states.

**The shape (game code):** 12 vertices from start to end; vertex i is moved by the segment vector rotated by
`theta = (u + (i - lifetime) * 10) % 120 - 60` (C remainder: negative for small u) and scaled by `offset[i] * 0.04`
(`D_E00BCC30[lifetime - 1]`). The strip around them has half-width `8 * scale * width[i] / 10`, perpendicular to the
local direction; the last vertex's edge is horizontal (the blob where the bolt hits the floor). So the picture gives u
modulo 120, plus the small-u case. `model.py` has `verts` / `strip` / `raster`.

**Ground truth:** `../bolt_render.py` (emulator, debug core) renders a Final Bowser turn with every bolt draw and its
value logged; 57 draws in one run (`/dev/shm/boltgt`, frames not kept). Sky bolts show 2 frames after their draw for
about 7 frames.

**Results so far:**
- Bolts at the same place drawn with 165 and 283 look nearly identical frame by frame; 2 looks different: consistent
  with the shape depending on u mod 120.
- `gtfit2.py` (the ends and width fitted with the true value, then every u ranked by area overlap): the best u modulo
  120 came out right within 1-2 for u = 2, 121, 165; 3-5 off for 114; about 8 off for 291.
- `blind.py` (u not given, ends free): wrong on all three tried (62 / 91 / 33 for true 45 / 51 / 1 mod 120). With the
  ends free, the fit drifts: the area overlap is only ~0.25 (the bolt's texture and alpha are not modelled) and the ends
  trade off against u.

- The screen mapping is not a similarity: the bolt plane (z = -91) maps about 1.57x sideways vs 1.03x vertically in
  the emulator's 640x480 (an affine from the four sky bolts' ends, which bolt is which from the stage loop's order:
  fits within ~7 px). With the world ends and that affine fixed, only u and the lifetime free:
  `blind2.py` (area): 45 -> 42, 2 -> 0 right; 51 -> 38, 1 -> 33, 114 -> 8 wrong.
  `blind3.py` (centre line): 45 -> 50, 51 -> 57, 2 -> 0 within 6; 1 -> 28, 114 -> 19 wrong. Residuals 10-25 px remain,
  so something in the shape or the mapping is still off.

**Next (was):** fix the ends from the stage's world coordinates and the battle camera (read the projection from the
emulator, or fit one homography for the z = -91 plane from all four sky bolts' ends), so only u and the lifetime are
free; model the texture's bright core instead of the whole strip; then repeat the blind test, and then on the runner's
clips (`scan.py` finds violet events, `grab.py` takes full-resolution masks).

**Solved (Nov 22):**
- `bolt_truth.py` (emulator, breakpoint on `lightning_bolt_appendGfx` = 0xE00BC374, the effect's data read from RAM each
  frame): `model.verts` matches the game's 12 vertices to 0.03 world units on all 116 + 784 renders (lifetime as read).
- `cam_read.py`: the battle camera in the menus is fixed: eye (0, 129.63, 495.12), looking at (0, 60, 0), vfov 25,
  viewport 296x200 at (12, 20) of the 320x240 frame. `cam.py` projects world points with it; the projected true
  vertices land on the drawn bolts.
- The emulator screenshot shows the frame after the logged one (one frame late).
- The bright violet is the texture's core along the vertex path; the strip's full width is mostly transparent, so the
  match is on the centre line (two-way chamfer), not the area.
- `blind5.py` (exact geometry, the camera, u and the lifetime free): the four sky bolts, 16 bolts over three seeds:
  u mod 120 within 3 on 15, within 5 on all 16; the lifetime right every time. The circulating bolts read badly
  (partly off screen or hidden), except the front-right one (146, 1, z 113): 0, 0, 3, 7.
- The runner's capture: `clipread.py` maps the camera's 320-space through the page's CHG_MAP0 (the Charge rays' capture
  layout). The 20:40:53 clip's bolt at 6.7 s reads as sky bolt 4, u mod 120 = 19 (139 or 259 or 19), with both
  halves of its frames reading 18-19 on their own, and the projected shape lies on the bolt frame after frame.

**What a bolt gives:** u mod 120 to about +-3, ~4 bits, plus its lifetime (so its frame). The page's Final Bowser states
already simulate the stage's bolt draws (`fbBolts`, a `rand_int(359)` each); each state's value at that draw can be
weighed by the reading.

**Next:** on the page: after a sky-bolt onset (`fbBoltFrame` finds them), keep ~6 game frames of the sky's violet mask,
score u (0..358) x lifetime for the bolt type the stage loop's phase gives, and weigh the Final Bowser states by the
value each one draws there. Test on the emulator truth runs first, then on clips where the page was locked.
