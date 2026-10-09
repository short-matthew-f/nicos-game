# Changes

(Created by the handoff. Add entries here: what changed, why, and what you tried and rejected.)

## Before handoff
- factory: box now enters from x=-150 (was -90) so no flap sliver pops in at the loop seam; belt/roller math derived from total travel (1050px, 12 roller turns).
- Filter regions widened for toy, box, shelf, arch, head, badge, ground box (sticker shadow was clipping).
- verify: handover check made geometric (outline overlap made the pixel check flag a non-jump).

## Track A (2026-10-09)

### Refactor: reusable rig (`src/scene.py`, `src/rig.py`, `src/gen.py`)
- `scene.py`: `Scene` and helpers moved out of `gen.py` verbatim. `gen.py` is still the entrypoint (`run.sh` unchanged); `python3 src/gen.py walk3d` builds one scene.
- `rig.py`: a `Timeline` of clips over a flat pose-state dict. A clip is a pure function `clip(state_at_start, u, dur, **args) -> state` of local time; clips: `walk(to=(x,y))`, `idle(breathe=)`, `putdown`, `pickup`, `turn(to='left'|'right'|'front'|'back')`. Clips declare their instant swaps (`carry`, `view`) so `Timeline.extras(kind)` feeds `Scene` extras. `Nico` turns state into part tracks for the side/front/back sets. Shared gait math (`phase`, `amp`, hip drop `dd`) drives every view.
- `build_walk` is now ~20 lines of timeline. **Result:** `walk.svg` is identical to the handoff build except one keyframe: both legs' scaleX at t=3.8s is `1.17` instead of `1.18`. At that sample the crouch is exactly 0.5, so `1 + 0.35*0.5 = 1.175` sits on a rounding tie; the original computed `(t-3.5)/(4.1-3.5)` = 0.5, the clip computes `u/0.6` = 0.4999999999999997. Invisible; walk goldens 0.00%.
- Correction during the refactor: the first cut registered the box track early (CSS order changed) and reported a `view` swap for plain left/right flips (added 4 stray keyframes). Fixed by keeping the original part order and giving `swaps()` the state at clip start.

### New scene `walk3d` (prefix `d`), "Coming and Going"
Walk right on the far line (y=376) → turn to front → walk toward the camera (to y=442) → turn around via profile → walk away → turn to side facing left → walk back to the start → flip right. 17.7s, 160KB.
- **Part swap** (handoff lean), three sets under the character's filtered group: side (`dfp`, the original parts), front (`dvfr` + `dfv*`), back (`dvbk` + `dbv*`), toggled with `scale(0,0)`, swap instants added as extras on all three view tracks. Parts of a hidden view are frozen at the neutral pose so they compile to one keyframe (this is why the file stays small; `dt` untouched).
- **Turns** (squash-and-swap): the active view's width goes `0.5 + 0.5*|cos(pi*sm(u))|` (1 → 0.5 → 1 with a quick kink at the swap, like the existing flip passing through 0). The swap is at the midpoint, at a standstill, at a fixed waypoint, so scale and stance are identical on both sides.
- **Front → back goes through profile** (two quarter turns: front→side→back). The handoff only specifies side↔front/back; this composes them and reads as turning around. Rejected: direct front→back swap (reads as a pop/spin with no profile).
- **The return leg** (walk left on the far line + flip right) exists only to close the loop.
- **Front/back art**: same proportions and colours as the side view, shared `arm_art`/`leg_art`; shoe seen end-on (`shoe_art_front`, same height and sole stripe). Front follows `reference/style-reference.png` (two eyes, smile, cheeks, ears, V collar, pocket on the viewer's right). Back: hair covers the whole head to the nape, no face/collar/pocket, ears in shade. Hair top matched to the side view's measured `getBBox` top (-119.56) so the swap doesn't change height (measured: <0.5% across swaps).
- **Toward/away gait**: same cadence as the side walk (phase advances 1 s/s at full speed regardless of screen distance; otherwise the slow screen-y speed makes him shuffle). Swing foot lifts 9 units; hips drop by the same `dd` as the side view and the stance leg shortens to keep its foot on the ground; arms swing foreshortened (shorten up to 14% and tip out a few degrees); 1.5-unit hip sway toward the stance foot; the stance foot gets a small depth offset that cancels the body's screen-y motion, so planted feet don't slide.
- **Depth**: `scale = 1.3*(y-100)/292` (horizon at y=100, 1.3 at the walk scene's ground y=392): 1.23 on the far line, 1.52 on the near line, 1.24x. Kept modest per "slight". Note: the sticker outline and shadow are computed in the character group's local space, so the white edge also thickens by 1.24x up close. Acceptable for a sticker; flag if not.
- Rejected: a ¾ view (handoff lean: skip; the contact sheets read fine without it). Deforming rig (lean: swap).

### verify
- `verify.py walk3d` adds 18 checks: loop seam; exactly one view showing at every 0.05s sample (hidden = scaleY 0; a flip legitimately passes through scaleX 0; sample instants within 1ms of a swap are excluded because the swap is a 1ms keyframe crossfade, and the swap check covers ±2ms); feet planted (lowest visible shoe within 7px of the character's ground point at every sample); ground point on the intended path (on the segment during a walk, exactly at the waypoint while standing; within 1px); back view shows no face (`.dface` elements have zero area whenever the back set shows); each of the 4 swaps: the expected views on each side, height change <3% and feet edge <2px; depth (taller after walking toward, back to size after walking away); front-view symmetry at the neutral stance (t=5.1, 8.0); filter regions.
- First-run corrections: the linear-path check ignored the eased walk start (up to ~18px lag) → replaced with on-segment + waypoint checks; the feet window `[-7,+3]` flagged the planted forward foot (+3.1px) → symmetric ±7px per the spec; one-view check flagged a flip midpoint and an exact swap instant → fixed as described above.
- Full run: **90 checks passed, 0 failed** (71 original + 19 walk3d). The 19th, added after review, asserts the `.dface` markers exist so the back-face check can't pass with nothing to guard.
- `shot.py` now takes an output path and scale, labels frames, and resolves `out/` relative to itself.
- New `verify/browsers.py`: cross-browser smoke test (see below). A browser that won't launch is reported and skipped; `BROWSERS=webkit` selects one.

### Mutation evidence (each break applied to a scratch copy of `src/`, built to a scratch OUT, `verify.py walk3d`)
| Break | Result |
|---|---|
| front shoes drawn 4 units lower | RED: `walk3d swap pops at t=4.7s (height 2.3%, feet 4.9px)` (all 4 swaps) + `feet not on the ground at t=5.35s` |
| front/back shoes float 8 units up | RED: `walk3d feet not on the ground at t=4.75s (lowest shoe 366.2, ground 376.0)` + swaps |
| eye added to the back art | RED: `walk3d: face visible while the back view shows at t=8.85s (area 53.4)` |
| viewer-left shoe +5 x | RED: `walk3d front view not symmetric at t=5.1s (shoe offsets 6.1 / 12.3)` |
| toward walk ends 10px lower | RED: `walk3d off the path at t=7.4s (at 560.0,444.4, 2.4px off)` |
| return walk stops 10px short | RED: `walk3d loop seam: last frame differs from first frame` + path |
| no depth scaling | RED: `walk3d depth scale wrong (heights 232, 231, 231)` |
| front set never hidden | RED: `walk3d: exactly one view should show, at t=0.0s` + face |
| view swaps at 60% of the turn | RED: `expected side -> front swap at t=4.7s ...` + swap pops (height 4.0%) |
| `dface` marker dropped from walk3d (the face check would otherwise pass vacuously; guard added after review) | RED: `walk3d: only 0 face elements marked .dface (expected ...)` |
| character filter region narrowed to x -40..60 | RED: `filter region #df clips content by 19px at t=13.75s` (a first, milder narrowing to -60..100 stayed green because it didn't actually clip; mutation strengthened, not the check) |

### Cross-browser (`verify/browsers.py`)
- WebKit 26.6 (Safari's engine, via Playwright): every animation found and seekable; frames differ from Chromium by 0.00–0.13% of pixels (anti-aliasing) across walk, walk3d, factory, taxi. `transform-origin: 0 0` on SVG groups behaves the same.
- Firefox: **unverified**. Playwright's Firefox 155 exits at launch with "Could not find profile folder" on this Mac (macOS 27), also outside the command sandbox; no system Firefox installed.
- Real Safari / iOS devices not tested.

### Known imperfections touched
- The factory goldens show 0.11% difference on this machine with a byte-identical `factory.svg`, so it's environment (likely the TOY WORKS text font), not a change.

## Track B: Blender evaluation (2026-10-09; built by a delegated sub-session, re-verified here)
- Blender 5.2.1 headless, exactly `blender -b -P blender/build_nico.py -- --out out/blender` (~44s for 345 frames). `pip install bpy` not tried: Blender's Python is 3.13, the venv is 3.14. The doc assumed 4.x.
- Look: Workbench engine, flat material colour, Standard view transform, transparent film; palette hex converted to linear and verified exact in the PNGs.
- Sticker edge: **Pillow port of `Scene.filt`** (`blender/sticker_post.py`) on the frame alpha, lengths x1.3 to match the 2D scale.
  - Rejected: **inverted hull** (the doc's lean). It drew white rings around eyes, mouth, collar and hairline, seams where arms cross the torso, and had no shadow. Evidence: `reference/blender_hull_rejected.png`.
  - Rejected: **the compositor.** Blender 5 moved it to node groups, so the API would have been guesswork; the Pillow port is step-for-step and deterministic.
- Rig: 13-bone armature, primitives only, 2-link leg IK. Clips: idle, walk (17 frames = 0.708s, since 0.7s isn't a whole number of frames at 24fps; walks in place), pickup, putdown, with the beats from `build_walk`.
- Same cheat as 2D: a `face` bone turns the eye/mouth/cheek toward the camera in side and ¾ views, because a real profile puts the face on the silhouette edge.
- Corrections:
  - Hair is now two plane-cut caps (vertex-deleted sphere gave a staircase hairline, and a sloped cut covered the eye).
  - Eyes are plain spheres (flattened ones vanished in profile).
  - World-less Workbench writes alpha 0 even with opaque film, so the `film_opaque` mutation also adds a World to go red.
- `verify/verify_blender.py`: **42 checks passed** (re-run here). Covers palette, transparent corners on all frames, outline width, size across views, feet planted, and the loop seam on bone matrices. Every check was mutation-tested (lit shader, AgX, wrong shirt, opaque film, outline r=2 / r=8, view scale, hip offset, loop shift → all red). The full table is in `docs/BLENDER_FINDINGS.md`.
- Spec deviations in the checks, with reasons:
  - Outline band 5–9px, not 5–8: the faithful filter at 1.3x measures 8–9px, as do the 2D goldens.
  - Exact-palette pixels must be ≥88%: anti-aliased edges are 7–9% of a correct frame; lit renders score ~31%.
  - Width is measured perpendicular to the edge: horizontal scans overstated it on curves.
- `reference/blender_vs_2d.png` (made by `verify/compare_sheet.py`): walk side, toward, away and putdown. 2D frames are taken from the scenes, so the toward/away 2D figure is depth-scaled (larger) and the Blender figure is not.
- `out/blender/` (37MB of PNG frames, the .blend and spritesheets) is regenerable and kept out of git (`.gitignore`).
