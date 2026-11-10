# Paper Mario glitches

Paper Mario (JP, N64) glitch research and speedrun tools. Everything lives in [`pm-kooper-bot/`](pm-kooper-bot/).

- **RNG manipulation page** for Any% (No ACE): [`pm-kooper-bot/rngtool/`](pm-kooper-bot/rngtool/). It reads the seed from the capture of a real N64 and beeps the presses for Duplighosts, Jr. Troopa, Hallway Bowser (Time Out) and Final Bowser. Per-version notes are in [`rngtool/charge_live/README.md`](pm-kooper-bot/rngtool/charge_live/README.md).
- **Headless emulator bot** (patched mupen64plus core driven from Python) and the clip, LZS and route searches: [`pm-kooper-bot/README.md`](pm-kooper-bot/README.md). `rngtool/make_states.sh` rebuilds the cores, the harness and the battle savestates.

No ROMs, savestates, clips or video frames are stored here. You need your own JP ROM (`.z64`).

History: moved from `HackMidwest2026/HackMidwest` (branch `claude/festive-ptolemy-egnjza`), keeping the history of `pm-kooper-bot/`.
