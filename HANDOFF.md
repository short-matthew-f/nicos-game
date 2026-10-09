# Handoff: rigged character views for the Toy Works sticker animations

Written for a Claude Code session working locally. Read this whole file first, then run `sh run.sh`.

## 1. Goal

The project makes flat-color "white sticker" animated SVGs for Nico's city game: a character, a taxi, and a packing line. Three scenes exist and pass 71 checks. Your job:

1. **Primary:** give Nico **front and back views** so he can walk toward and away from the camera, and **turn between side and front/back**. Today he only has a side view, and turning is a flat `scaleX` flip (the flip is fine, keep it for left/right turns).
2. **Secondary:** refactor the walk scene into a **reusable character rig** with named clips (`walk`, `idle`, `pickup`, `putdown`, `turn`) so a second character or scene is cheap.
3. **Stretch (only if 1 and 2 are solid):** a new scene that uses the toward/away walks.

4. **Track B (evaluation, separate):** build Nico in Blender and render the same clips from several angles so I can compare against the 2D approach. See `docs/BLENDER_TRACK.md`. It is untested and must not block Track A.

Do not restyle anything. The look is signed off.

## 2. Style (do not drift)

Reference image: `reference/style-reference.png`. Rules: flat fills, no gradients; white sticker outline about 6 units, rounded; soft cast shadow offset down-right; faces are minimal (dot eye, small smile, pink cheek).

Palette: bg `#E9EEF3`, navy ink `#2B3F55`, skin `#E8B48F` / shade `#D6996F`, hair `#6B4A35`, shirt `#5B8FD6` / sleeve `#4F86D0`, pants `#5B78AA` / far-side `#4A6590`, shoes `#34495E`, taxi/box yellows `#E8B64A` `#F9A826` `#FFE29A`, coral `#D77B72`, teal `#5FAFA5` / `#3E8F8A`.

The sticker effect is one SVG filter (`Scene.filt` in `src/gen.py`): dilate, blur, threshold, white fill, plus an offset soft shadow.

## 3. Layout

```
src/gen.py        everything: Scene helper + build_walk / build_taxi / build_factory
src/page.py       wraps the three SVGs in a viewer page (out/animated-stickers.html)
verify/verify.py  behavior checks (Playwright + Chromium, seeks animations to exact times)
verify/shot.py    contact sheet: python verify/shot.py walk 0.5,2,4 3  -> /tmp/walk_sheet.png
reference/        style reference + golden frames (informational diffs only)
out/              generated SVGs + page. These are build output; regenerate, don't hand-edit.
```

Setup: `pip install -r requirements.txt && playwright install chromium`, then `sh run.sh`. Expect `71 checks passed, 0 failed`.

## 4. How the animation works (read before editing)

- **Pure CSS keyframes inside the SVG**, no JS, no SMIL, so each file works standalone. `Scene.A(name, fn, inner)` wraps `inner` in a `<g class>` and registers `fn(t) -> list of ops` (`('t',x,y)`, `('r',deg)`, `('s',sx,sy)`). `Scene.keyframes()` samples every track at dt=0.05s (plus any `extras` times) and emits `@keyframes`, collapsing constant runs.
- **Pivots:** every animated group has `transform-origin: 0 0`, so a limb is drawn with its joint at its local origin and positioned by a `translate` op *inside the same op list*. CSS applies ops right-to-left to points: `[t, r]` rotates about the origin, then translates.
- **Rig as math:** the character's pose is computed in Python each sample (gait phase, crouch, lean, arm blend, forward kinematics for the carried box). Study `build_walk` first. It is the reference for how to do this.
- **Visibility is `scale(0)`**, not opacity. Instant swaps (carried box to resting box) need `extras=(t-0.001, t)` so the keyframes land exactly on the swap time. View swaps for the new work should use the same trick.
- **Loops:** `T` must be a multiple of `dt`. Pose at `t=T` must equal pose at `t=0`, or the actor must be fully off-screen at the seam (factory box, entry at x=-150).
- **Filters:** `filterUnits="userSpaceOnUse"`, in the *local* space of the filtered group, sized by hand. Content outside the region gets its sticker edge sliced. `verify.py` checks this for every filtered group at many times. If you add or grow parts, widen the region.
- **IDs and classes are prefixed per scene** (`w`, `t`, `f`) because the page inlines all three SVGs in one document. Keep that for new scenes.
- Robot-arm IK is 2-link, elbow-up (`sign = -1`). It is the reference for any future IK.

## 5. Task 1 in detail: front and back views

Current Nico (side view) is built from hip-local parts: `upper` (neck, torso, head, hair, face), two arms pivoting at the shoulder `(2,-42)`, two legs pivoting at the hip with separate shoe groups.

Needed:

- **Front part set:** symmetric torso with collar, both arms visible at the sides, face visible, two legs. **Back part set:** same silhouette, hair covers the whole head, no face, no collar or pocket.
- **Walk toward the camera:** feet alternate lifting; body bobs; arms swing but are foreshortened (mostly vertical shift and slight rotation); optional slight scale-up over distance for depth. **Walk away:** same on the back set, scale down.
- **Turn side to front/back:** squash the side view's width toward about 0.5, swap to the front or back set at that moment, expand. The swap frame must not change the silhouette height or foot position.
- Keep shared geometry shared (colors, proportions, shoe/leg code) so views don't drift apart.

Build a short demo scene (a `build_walk_depth` or similar): walk right, turn to front, walk toward camera, turn to back, walk away, loop. Name it `walk3d`; do not reuse the `walk` prefix.

### Add these checks to `verify.py` (behavior, not build metadata)

- Existing 71 checks still pass (no regressions in `walk`, `taxi`, `factory`).
- **Feet planted** during toward/away walks: lowest shoe bottom tracks the intended ground path within about 7px at every sample.
- **View swap does not pop:** across each swap, the character's bounding box height changes less than 3% and the feet's bottom edge moves less than 2px (use `getBoundingClientRect` just before and after the swap time).
- **Back view shows no face:** the eye, mouth and cheek elements are not visible (scale 0 or removed) at every sample where the back set is active.
- **Front view symmetry at the neutral stance:** left and right shoe x-centers are within 2px of mirrored about the body center.
- **Loop seam** for the new scene, same style as the others.
- Verify each check can fail: temporarily break the thing it guards and confirm it goes red. (`verify.py` was mutation-tested this way. Keep that bar.)

Add golden frames for the new scene with `python verify/verify.py --update-golden walk3d`. Golden diffs are informational only; look at the actual frames with `verify/shot.py` and judge them visually.

## 6. Decisions you will face (options, with my lean)

1. **Part swap vs. one deforming rig.** Swap (separate front/back/side groups toggled by `scale(0)`) is simple, keeps flat shapes crisp, and matches how the current scene works. A deforming rig needs more art and breaks the flat look. *Lean: swap.*
2. **¾ view for turns.** Squash-and-swap is cheap and reads fine at this size; a ¾ set adds a lot of art for a small gain. *Lean: skip, revisit only if the swap looks bad in the contact sheets.*
3. **Rig API shape.** A `Character` class with `parts`, `pose(t) -> dict`, and clips as pure functions of local time, sequenced by a small `Timeline` (list of `(start, clip, args)`). Keeps pose math testable without a browser. *Lean: this; keep it a thin layer over `Scene`, don't invent a framework.*
4. **File size.** `walk.svg` is about 190KB from dense sampling. Fine now. If the new scene gets heavy, raise `dt` for slow limbs before anything fancier.

If a decision isn't covered here and changes the look, stop and ask. Otherwise decide, and record it (see section 8).

## 7. Known imperfections (don't "fix" silently; mention if you touch them)

- At put-down and pick-up, the resting box is drawn behind the character's group, so the character's white outline slightly overlays the box edge for a moment. The check there is geometric (box doesn't jump). Moving the box in front would hide the hand.
- Only Chromium has been tested. CSS transforms with `transform-origin: 0 0` on SVG groups should work in Safari and Firefox, but that is unverified. If you can open the SVGs in both, say what you see.
- Walking foot speed isn't locked to ground speed during the 0.35s ramps (slight slide).
- `getBBox()` ignores `clip-path`, which is why `fbelt` is skipped in the filter-region check.
- The pause/play tap in `page.py` only toggles `animation-play-state`.

## 8. Working agreements

- Keep `docs/CHANGES.md` (create it). For every non-trivial change write what changed and why, and **list rejected approaches and corrections explicitly** (e.g. "tried X, rejected because Y"). Don't make changes quietly.
- Prefer tests that assert behavior on screen over tests that assert build output (file sizes, keyframe counts, string matches).
- Be concise in summaries. Show options with brief reasoning when you need me to choose.
- Don't edit files in `out/` by hand; change `src/` and rebuild.

## 9. Deliverables

(Track B has its own deliverables in `docs/BLENDER_TRACK.md`.)

- `src/gen.py` (or split into modules if the refactor warrants), updated `src/page.py` including the new scene.
- `out/*.svg` and `out/animated-stickers.html` rebuilt.
- `verify/verify.py` with the new checks, all passing, plus the mutation evidence in `docs/CHANGES.md`.
- Contact sheets (`verify/shot.py`) for the new scene committed under `reference/` so I can eyeball them.
- A closing note: what works, what you couldn't verify (browsers, devices), and anything you'd want a decision on.
