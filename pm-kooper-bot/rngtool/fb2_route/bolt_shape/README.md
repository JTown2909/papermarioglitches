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

**Next:** fix the ends from the stage's world coordinates and the battle camera (read the projection from the
emulator, or fit one homography for the z = -91 plane from all four sky bolts' ends), so only u and the lifetime are
free; model the texture's bright core instead of the whole strip; then repeat the blind test, and then on the runner's
clips (`scan.py` finds violet events, `grab.py` takes full-resolution masks).
