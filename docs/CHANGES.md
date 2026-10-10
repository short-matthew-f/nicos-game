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

## Nico likeness pass (2026-10-09)
Matthew sent three photos of Nico and asked for the character to look more like him. This is an intentional restyle of the character only. The sticker filter, proportions, rig and other scenes are unchanged.
- **Hair:** long and dark brown (`#4A3326`, was `#6B4A35`), with a centre part and a low ponytail held by an orange tie.
  - Side: hair is pulled back over the ear, and the ponytail hangs behind the torso.
  - Front: hair falls to the jaw on both sides; the ears are covered.
  - Back: the ponytail runs down the middle of the back.
- **Face:** fairer skin (`#F1C6A6` / shade `#DFA683`), slightly larger eyes, rosier cheeks and a wider grin.
- **Shirt:** a long-sleeve plaid flannel replaces the blue tee. It has a forest-green ground, navy bands and a thin orange line, with collar points and buttons, and no pocket. The plaid is a flat `userSpaceOnUse` `<pattern>` with the scene prefix (`{pfx}plnear` / `{pfx}plfar`), so the checks move with each part's transform and ids don't collide on the combined page. Far-side limbs use a darker variant, as before.
- **Jeans** are darker (`#34466B` / `#2A3957`), and the shoes are grey sneakers.
- `HAIR_TOP` was re-measured from the new side hair (-118.14). The front and back hair still match it, so view swaps keep the same height.
- **Corrections:**
  - The first plaid (6-unit navy bands, darker ground) read as near-black at game size, so the bands were cut to 5 units and the ground lightened.
  - The hair tie sat behind the side hair and was invisible, so it is now drawn on top.
- **Not done:** martial-arts belts (from the photos) as an outfit or unlockable. That's an idea for later and isn't in the default look. The Blender track (`out/blender`) still has the old look; it was an evaluation and isn't used by the game.
- **Verification:** `sh run.sh` gives 90 passed, 0 failed. No checks were added. The walk and walk3d goldens were regenerated because the art changed on purpose. Sheets: `reference/nico_v1_before.png`, `reference/nico_v2_likeness.png`, `reference/nico_v2_walk3d_sheet.png`.

## Game v0: "Nico on the street" (2026-10-09)
The first playable piece, in `game/`, built with Vite + TypeScript + PixiJS 8.21 and pixi-filters 6.1.5. Every package version was released at least two weeks before it was installed. `game/.npmrc` sets `legacy-peer-deps`, because npm 10.9 crashed while resolving vitest's optional peers ("Cannot read properties of null (reading 'edgesOut')").
- **Rendering:** the world is drawn on a WebGL canvas; DOM is used only for the HUD and the thumbstick. This replaces the DOM/SVG plan (see GAME_PLAN for why).
- **Art pipeline:** `python3 src/export_game.py` rasterizes every leaf part of the rig at 2 px per unit **without** the sticker filter. It writes them to `game/public/art/nico/`, with `nico.json` giving each part's origin offset in draw order. It also dumps 59 sampled poses to `game/test/fixtures/poses.json`. It reuses `rig.Nico` through stand-ins for Scene and Timeline, so the game art can't drift from the SVG art.
- **Rig port:** `game/src/rig/pose.ts` gives the ops per part. The ops compose as a CSS transform list, built into a single matrix per sprite rather than mapped to position/rotation/scale, because the arms are `t,r,t,r`. On screen, `NicoView` applies a live `OutlineFilter` (white) and `DropShadowFilter` (navy, 22%) to the whole body, so part seams don't show. Their size is set in screen px from the zoom.
- **Static art** (buildings, trees, playground, cars) draws the white band and shadow as geometry, with no filters. It's cheap, and it stays crisp at any zoom.
- **Decisions:**
  - Landscape-first.
  - The camera shows 800 world px of height, so Nico is about 1/6 of the screen.
  - The thumbstick floats wherever the finger lands, anywhere on screen.
  - WASD/arrow keys work on a PC.
  - Facing: mostly horizontal travel gives the side view (flipped), down gives front, up gives back. There's a 1.25× hysteresis band so diagonals don't flicker.
  - Walk speed is 240 px/s with 1.5× the rig's cadence. Feet slide a little at full speed; a run clip can fix that later.
  - Cars follow lane loops with right-hand traffic. They keep a gap and stop when Nico stands in the zone ahead of them.
  - The "+10 people" debug button adds Nico clones that wander, each with its own live filters. It's there to find the iPad's performance limit.
- **Corrections:**
  - The first car paths used Chaikin smoothing on the 4-corner loop. That converges to a B-spline, so cars cut every corner in a wide diagonal (visible in the first screenshot). Replaced with fixed-reach corner curves (`roundCorners`); the tests below cover it.
  - The e2e car-stop check originally estimated a car's heading from two samples 150 ms apart. It was flaky at corners, so the game now exposes `inFrontOf(i, d)` and the check picks a car on a straight.
- **Tests**
  - `cd game && npm test` (Vitest): 73 tests.
    - Pose parity with the Python rig, 62 tests. Mutations each went red: swing-foot lift 9→8 (24 failed), shoulder pivot y -42→-40 (21 failed), foot-planting sign flipped (16 failed).
    - Opsmatrix composition.
    - Car loops stay on the road, in lane on the straights, with no kinks. The old Chaikin path failed 4 of these.
    - Facing and hysteresis, building collision with sliding, world bounds, thumbstick deadzone and saturation.
  - `python verify/game_e2e.py [url]`: 20 checks in WebKit with an emulated iPad Pro 11 in landscape.
    - No page errors; FPS counter running; Nico centred and about 1/6 of the screen tall.
    - Dragging right, up, down and left gives the right movement and facing; walking stops when the finger lifts.
    - The stick keeps steering with the finger over the HUD, and sliding over a button doesn't press it.
    - A car stops for Nico in its lane and drives on when he leaves.
    - +10 people adds ten walkers and Clear removes them.
    - Mutation: disabling car braking for Nico went red.
  - **Not proven by mutation:** removing `setPointerCapture` stayed green. WebKit already captures implicitly here (touch pointers do this on iPad too), so the explicit call is belt-and-braces and the check guards the behaviour, not the call.
  - Run the e2e against the production build (`npm run build && npm run preview`, then `http://localhost:4173/`). Against the dev server, the first load after an edit can hit Vite's module reload ("Importing a module script failed").
- **Measured:** 60 fps with 51 people in WebKit on the Mac. That says nothing about the iPad; the on-device FPS counter is the real test.
- **Plan B** (not built, pending the iPad result): if the live outline is too slow, bake whole-body frames from the SVG scenes with the sticker included.
- **Correction, before the iPad test:** Pixi filters render at 1× by default (`Filter.defaultOptions.resolution: 1`), so on a Retina screen the live-outlined Nico was drawn soft and upscaled next to crisp buildings. Both filters now use `resolution = 'inherit'`, and the side-by-side crop is clearly sharper. The options type doesn't accept `'inherit'`, so it's set after construction.

## 2026-10-09: GitHub Pages and the update pop-up
- **Hosting:** https://short-matthew-f.github.io/nicos-game/. On every push to `main`, `.github/workflows/pages.yml` runs the Vitest suite, builds `game/` and deploys it. A failing test blocks the deploy.
- **Update check:**
  - The build id (the commit on CI) is compiled in as `__BUILD_ID__` and published as `version.json`.
  - The game polls every 5 minutes, when the app comes back to the foreground, 3 s after load, and when the ⟳ button is tapped.
  - On a new id, it fetches the new page and its script first, then shows "New version ready! Restart / Later".
  - Restart goes to `./?v=<id>`: Pages lets browsers cache `index.html` for 10 minutes, so a plain reload could bring back the old page. A sessionStorage note stops it re-prompting for the build it just restarted into. Rig art URLs carry `?v=<build>` for the same reason.
- **Rejected for now:** a service worker (vite-plugin-pwa prompt mode). It would also give offline play, but a stuck worker can pin an old build, which is the opposite of what was asked.
- **Tests:**
  - Vitest: `needsUpdate` and `assetUrls` (3 tests).
  - `python verify/update_e2e.py [url]`: 11 checks.
    - Up to date: no pop-up, and a toast says so.
    - A faked newer `version.json` gives the pop-up. Later closes it, and it returns on the next check.
    - Restart reloads the page and tidies the URL, with no re-prompt loop.
  - Mutation: removing the restarted-into guard went red in both suites.
  - **Not proven by mutation:** swapping `?v=` navigation for `location.reload()` stayed green. The local preview server doesn't cache HTML the way Pages does, so the cache-bust can't be tested here.
- **Correction:** the commit that added `?v=` to the rig art reused the name `v`, which the sprite loop already used for the view. Sprites loaded `…png` + `side` and drew nothing, and the e2e stayed green because Pixi's empty texture still has bounds. The cache-bust is now `BUST`, and the e2e checks that every part's image actually loaded. That check went red with a deliberately bad URL.

## 2026-10-09: v1 slice 1 (driving, the action button, money and save)
- **Decisions:**
  - **Driving, Sneaky Sasquatch style:** push the stick toward where you want to go and the car turns toward it at up to 3 rad/s. Speed follows how far the stick is pushed (top speed 430 px/s, 1.8× walking). Sharp turns slow it; a turn of more than 90° crawls round. Releasing the stick coasts to a stop. A stopped car can still turn, so it can't get stuck.
  - **Collisions:** the car is three circles along its length, tested against buildings, the world edge and traffic. A turn into a wall is undone, and a move into one slides along whichever axis is still open.
  - **Nico's car:** red with a white stripe, so it stands out from traffic. It starts on a new driveway at his garage. Traffic brakes for any part of it, so leaving it in a lane jams the road. That's realistic, and it's kept.
  - The camera eases out from 800 to 1050 px while driving and looks ahead of the car.
  - **One action button for everything:** spots in the world (`interact.ts`) offer an action within reach. The car offers Get in, and while driving Get out appears once the car is nearly stopped. Get out tries the driver's side, then the other side, the front and the back. E, Space or Enter work on a keyboard.
  - **Money and save:** money is shown in the HUD, starting at $20 (a data constant). The save (`state.ts`) is versioned in localStorage and written every 5 s, on hide or pagehide, on getting in or out, and before an update restart. It holds money, Nico's spot, the car's spot and whether he's driving. Junk or newer-version saves load as fresh. A saved spot that's now inside a building (the map changed) falls back to the default.
- **Tests:**
  - Vitest, now 90 tests.
    - Driving: short-way turning, turning round from a stop, speed follows the stick and is capped, coasting, wall stop and slide, never inside a building after 60 s of random steering, and the parked spot fits.
    - Save: round-trip, junk, and newer versions. Spots: nearest, switched off.
  - e2e, now 31 checks: Get in appears, stick-right drives right, no Get out at speed, stick-down turns down, the camera pulls back, release stops and offers Get out, Get out lands beside the car, traffic stops behind the parked car, and a reload restores Nico's spot.
  - Mutations, all red: steering sign flipped (3 unit tests and 1 e2e), traffic ignoring Nico's car (e2e), and save disabled (e2e).
- **Correction to the mutation method:** `npm run build` type-checks first, so a mutation that leaves an unused import fails the build, and the e2e then quietly tests the previous `dist/`. Two mutations looked green for that reason. Mutation runs now build with `npx vite build` and check for "built".

## 2026-10-09: v1 slice 2 (building doors, Burger Barn lunch, the playground)
- **Decisions:**
  - **Doors:** every building has a door spot. `places.ts` is pure data: title, a line of text, and optionally a menu. Walking up shows "Go in" ("Order lunch" at Burger Barn) and opens a card. Nico can't move while a card is open; Leave or Escape closes it. School, hospital, home, garage, fire station, parts shop, toy shop and storage have a line each, hinting at what's coming.
  - **Lunch:** burger $5, fries $3, shake $4. It's the first use of money. Food gives "speedy" walking (1.35×) for 40 to 90 s, capped at 180 s and shown as ⚡ in the HUD. It's a small, temporary payoff, not a hunger meter: no new thing to keep track of. Items you can't afford are greyed out. There's no way to earn yet; that comes in v2.
  - **Playground:** the equipment is now sized against Nico, about 1.6× bigger. At first the tower was shorter than he is.
    - **Slide:** a scripted 2.8 s run. He walks to the ladder, climbs it (back view), sits (side view, crouched), speeds up down the chute and hops off.
    - **Swings:** he sits on the nearest seat and swings toward and away from the camera. The chains stretch, and he's drawn between the frame and his seat's chains, so he reads as sitting in it. Hop off, or pushing the stick, ends it.
  - Activity timelines live in `play.ts` as pure functions of time.
- **Corrections:**
  - The e2e hook object had a `place` field for the open building, which overwrote the `place()` test helper. It's renamed `inside`.
  - The first playground render showed the equipment smaller than Nico, so it was resized.
- **Tests:**
  - Vitest, 94 tests.
    - Every place is a real building whose door Nico can stand at.
    - `buy`: price, cap, exact money, not enough.
    - Slide: reaches the platform, ends past the chute somewhere Nico can stand, sits while sliding, always drawn in front of the slide.
    - Swing: builds up, then swings.
  - e2e, 46 checks: the Burger Barn door, the menu opens, frozen while open, fries take $3 and give a boost, the HUD updates, boosted walking is faster, a $5 burger is disabled with $2, Leave, the school door, climbs the slide, lands at the bottom, the swing moves, Hop off is offered, the stick hops off.
  - Mutations: no boost and no stick-to-hop-off each went red in the e2e. Breaking the "enough money" check went red in Vitest only: the e2e stays green because the UI disables the button separately.

## 2026-10-09: v1 slice 3 (the fire truck)
- **Decisions:**
  - The fire station has two open bays. The first alarm comes 25 s after load, then every 70–130 s. The truck pulls out of the left bay with its lights flashing and a siren (WebAudio, which starts after the first tap; volume falls off with distance from the screen centre). It laps the outer ring road with traffic and comes back in through the right bay. It starts and ends hidden behind the station's front wall, and a toast says "The fire alarm is ringing!" if Nico is within 1600 px.
  - **Traffic:** cars brake for the truck. The truck brakes for Nico, his car and any car that isn't itself waiting for the truck, so the two can never wait on each other. Nico's car bumps into the truck.
- **Correction:** the first route turned west while still inside the doorway and cut across the wall. The route now starts deeper inside and turns at y=1145.
- **Tests:**
  - Vitest, 98 tests: the route stays on roads, the apron or inside the station; waits, then laps and comes home with a new wait; stops for someone in the way; 240 s with rapid alarms plus traffic never leaves the truck stuck for 6 s.
  - e2e, 50 checks: waits at first; drives out on the alarm; the toast; home within a minute.
  - Mutation: removing the truck's braking went red.
  - **Not proven:** the "don't yield to cars waiting for the truck" rule. A 4-minute simulation never deadlocked even without it (the truck was stuck at most 0.2 s), so it guards a jam that hasn't been seen.

## 2026-10-09: Nico's feedback, part 1 (trees, playground)
- **Trees are solid:** a trunk footprint for each tree is in `SOLIDS`, so you can't walk or drive through them.
- **Walking behind the playground "felt wrong":** the slide and swing frame each sat on one white sticker box covering their whole bounding rectangle, so walking behind them meant vanishing behind an opaque white panel. Each piece (tower, chute, frame) now gets its own band and shadow. The tower, the chute end and the swing posts have solid footprints.
- The swings moved 120 px further from the slide (Nico: space it out). The lot is wider, and a tree moved.
- Fixed a Pixi v8 deprecation: the truck's lights were children of a Graphics.
- The e2e now places Nico by named spots (`__game.spots`) instead of coordinates, ahead of the scale pass. The boost check walks left now, because a solid tree stands to the right.
- **Tests:** Vitest 99 (a car can't drive through a tree), e2e 50.

## 2026-10-09: Nico's feedback, part 2 (the scale pass: "not the same height as the buildings")
- **Decision:** Nico stays the same size. The world grows around him.
  - The layout in `map.ts` is now in plan units, multiplied by `K = 1.6` (the town is 5760 × 4160).
  - Wall heights have their own factor, `HK = 2.4`: a house is about 220 px against Nico's 132, and the school and hospital get two rows of windows.
  - Doors are 66 × 165 (a bit taller than him), windows are bigger, and signs use 30 px type.
  - Trees are about twice his height.
  - Cars are drawn at 1.5× and the fire truck at 1.4×. The white bands stay 7 px, so they match everything else.
  - Collision circles, braking zones and gaps are all derived from `CAR.len`/`TRUCK.len` rather than written as numbers.
  - The driveways, the parked car and the fire route are derived from the garage and station records.
  - The playground equipment keeps its size (it was already sized against Nico); only its positions scale.
  - **Feel:** 4 cars per loop instead of 3. Top speeds: walking 270, traffic 250, Nico's car 560, truck 330.
  - **Cameras:** the walking view shows 920 px of height (Nico is about 1/7 of the screen), and the driving view 1400 px.
  - Nico now starts just outside his front door.
- **Correction:** the braking zone started a set distance ahead of a vehicle's centre. Scaled up, that start fell inside the truck's own front end, so the truck braked, rolled past and drove through someone standing at its bumper. The zone now starts at 0.1 × length. Caught by the "stops for someone" unit test.
- **Save v2:** v1 positions are from the smaller town, so `migrate` keeps the money but drops Nico's and the car's positions (tested).
- **Tests:** Vitest 100, e2e 50. The e2e now starts from open ground (`at('home', 700, 230)`), because the new start by his door is near the world edge, where the camera is clamped.

## 2026-10-09: Nico's feedback, part 3 (sitting properly)
- **`sit` (0..1) added to the pose.** This is game-only: the Python rig doesn't have it, so the parity fixtures leave it out and the code reads it as `st.sit ?? 0`. All 62 parity tests still pass. In the side view, sitting blends both legs from the walk swing to pointing forward (-68°) and drops the hips 44 units. Both legs go forward together, not opposite as in walking.
- **Slide:** he climbs, turns and sits at the top of the chute, rides down its surface (seated, legs forward, hands out), then stands up off the end. He used to crouch-stand on the slide.
- **Swing ("the bar was on his lap"):** the plank now draws behind him and is wider than he is, so its ends show at his hips. Only the chains draw in front, at his hands. Full crouch in the front view gives short, dangling legs.
- **Tests:** the slide unit test now checks he's sitting (`sit > 0.9`) while he slides. Vitest 100, e2e 50.

## 2026-10-09: James and Primo walk around town
- **People besides Nico:** `src/people.py` defines a `Look` for each person: skin, hair style and colour, top (hoodie or tee/jersey), sleeves, trousers (plain or camo pattern), shoes and height. `wearing(look)` swaps a look into the rig module while that person is exported, then restores Nico's, so `rig.py` and Nico's art are unchanged. The exported Nico PNGs are byte-identical, checked by md5, and `nico.json` only gained `height`. This is also the base for "customise his clothes" later.
  - **James:** short brown hair brushed to the side, navy hoodie (hood, drawstrings, pocket), khakis.
  - **Primo:** 0.86× Nico's height, loose wavy light-brown hair with highlights, a blue jersey with white stripes and a crest, camo cargo trousers. His front-view hair was shortened to jaw length at Matthew's request; it still reaches his shoulders from behind and the side.
  - Photos were reference only and are not in the repo (public).
- **Game:** `PersonView(who)` replaces `NicoView` (`rig/person.ts`), with art in `art/<who>/`. A smaller person keeps the same sticker band width.
- **Routines are data** (`townsfolk.ts`): stops with optional waits and an optional swing, plus a few lines each.
  - **James** walks the sidewalks round the middle block and stops in at Burger Barn.
  - **Primo** swings for 9 s, runs past the slide, looks in at the school, and comes back.
  - Walk up to either of them and you get "Say hi to …", which shows their next line.
  - **Swings are shared:** Nico takes the free seat, and if both are taken a toast says so.
- **Tests:**
  - Vitest 104: each route avoids anything solid and never runs along a road; each route completes and loops.
  - e2e 56: both in town with art loaded, James moves, Say hi and his line, Primo gets on a swing, Nico takes the other seat.
  - Mutation: ignoring seat occupancy went red.

## 2026-10-09: never stuck inside a building; phone top bar
- Matthew got stuck on the Toy Shop card on his iPhone. It couldn't be reproduced in emulated iPhone WebKit, where Leave works. Fixes:
  - A tap anywhere outside the card now closes it.
  - Leave also closes on `pointerup`, in case a touch never becomes a click.
  - The e2e checks closing by a tap outside the card.
- On screens narrower than 640 px (phones in portrait), the top bar shows only money and ⟳. The fps/people chip and the +10/Clear test buttons wrapped into a mess there.
- **Diagonal views mock-up** (`src/mock_diag.py`, for sign-off): following Nico's note, the 3/4 front ponytail now hangs behind his head and neck instead of over his shoulder.
- **Diagonal hair, iterated over six review rounds** (Nico: "something going on with the hair" in the down-right view). Rejected along the way:
  - a straight diagonal hairline that cut across the forehead;
  - a skull-hugging curve that read as a bowl cut;
  - arched hairlines that gave him a big domed forehead;
  - pulled-back hair with the ear showing. This was the root problem: his front view has hair falling past the ears to the jaw, so the 3/4 view didn't match.

  **Kept:**
  - **3/4 front:** the front view's centre-part hairstyle, turned. The part is right of centre, the near side shows more hair, and the far side has a narrow fall beside his face. The ponytail hangs out of sight behind his neck.
  - **3/4 back:** hair covers the back of his head and hangs to the jaw, with his cheek showing in front of it.

## 2026-10-09 (overnight): crash lock-up, a middle-sized town, a minimap
- **Crash lock-up** (Matthew: crashing locked his car and the oncoming one "basically forever"):
  - **Cause:** `carFits` was all-or-nothing. Once Nico's car overlapped a traffic car, every move still overlapped, so his speed stayed 0. The traffic car was braking for him too, so both stayed stuck.
  - **Fixes:**
    - `moveCar` now accepts a move that doesn't dig in deeper (`overlap()` measures how deep). An overlapping car can always steer out.
    - **Reverse:** with the nose against something, pulling the stick back backs out at 170 px/s, swinging the tail toward the stick.
    - Traffic, and the fire truck, waiting on Nico's car for more than 6 s squeeze past at a crawl for 5 s. They still wait for Nico on foot, however long he stands there.
  - **Tests:** escape from an overlap, reverse off a wall, wait for Nico on foot, squeeze past his car. All three mutations went red.
- **Scale:** `K` went from 1.6 to 1.35, a middle ground (Matthew was getting lost). Building heights (`HK`) are unchanged, so Nico still isn't as tall as the houses. The save went to v3 (positions are dropped, money is kept; tested).
- **Minimap** under the money: roads, lots and buildings in their roof colours, emoji markers for home, Burger Barn, the school, hospital, fire station and toy shop. Live dots: Nico (orange, ringed), his car, James and Primo, and the fire truck flashing while it's out.

## 2026-10-09 (overnight): 8 directions
- **The signed-off 3/4 views are in the rig** (`rig.py`: `upper_qfront`, `upper_qback`, `_torso_q`, `shoe_art_q`, `Nico.q_parts`). They use the front/back gait numbers (stance foot planted, hip sway, arm swing), with hips at -10/+9 and shoulders at -19/+15 for a turned body. The near leg sits 2 units lower. Draw order: far arm, far leg, near leg, body, near arm. `gen.py` output for the existing scenes is unchanged (`git status out/` clean), and Nico's existing PNGs are unchanged.
- **James and Primo** get turned versions too (`people.py`): James's short cap and fringe with the ear showing; Primo's loose hair to the jaw with bangs; hoodie and jersey details moved for the turn.
- **Export:** 5 views per person. The parity fixtures went from 59 to 97 poses, including 3/4 walk cycles. `pose.ts` `qOps` passes parity, and `partOps` throws on an unknown view instead of falling back to front/back.
- **Facing:** `chooseView` picks the nearest of 8 directions. Side and 3/4 views flip for the left. There's an 8° sticky band past each sector edge so diagonals don't flicker.
- **Tests:** Vitest 148 (8 facings, sticky edges, parity). e2e 61: dragging in each diagonal gives qfront/qback with the right flip. Mutation: removing the diagonal facings went red in 4 e2e checks.
- `mock_diag.py` now draws the rig's real diagonal art, and its output is identical.

## 2026-10-09 (overnight): a livelier town, laid out properly
- **Problem found while planning:** buildings draw their tall front walls upward from the footprint, and with walls 2.4× taller the roofs of Burger Barn, the fire station and the shops were sitting on the road above them. Auto-nudging them down just pushed them into other things (the school onto the playground, a house over Nico's door).
- **New layout** (`map.ts`): roads are still laid out in plan units × K. Everything else is placed block by block in world px, with each building's drawn height in mind.
  - Top row: three houses, the school, the hospital (with a car park and an ambulance).
  - Middle row: Nico's house, garage and driveway, with a back garden; Burger Barn with patio umbrella tables; the playground; the park (pond with lily pads, a fountain, benches, flower beds); the fire station; and a new ice cream shop with a cart out front.
  - Bottom row: the parts and toy shops with a soccer field behind them, the storage yard (cones, parked cars), and houses.
  - Mailboxes and flowers in front gardens.
  - Generated streetlamps along the sidewalks and a hydrant at each crossing. They're filtered so none lands on a road, building, lot, driveway or tree.
  - Grass tufts so the lawns aren't flat.
- **Places:** the ice cream shop sells a cone ($2), a root beer float ($3) and a sundae ($4), each with a speed boost.
- **Routes:** James walks the middle block and stops in at Burger Barn. Primo plays at the swings, past the slide and round the fountain.
- **Layout tests** (`test/layout.test.ts`): no building as drawn covers a road or sidewalk or leaves the world; buildings don't overlap; every door opens onto walkable ground; trees and props stay off roads, out of buildings and off the field; equipment is on the sand, the pond in the park, the goals at the field ends. These caught a bush inside the garage and lamps on a road. Vitest 153, e2e 61.

## 2026-10-09 (overnight): soccer, ducks, benches
- **Soccer ball** (`world/ball.ts`): walk into it to kick it. Faster means harder, and a hard kick hops it into the air. Nico's car knocks it too, and so do James and Primo if they walk into it. It rolls with friction, bounces off walls and posts, and a goal counts when it crosses a goal line between the posts. A toast shows "⚽ GOAL! 1 – 0" and the ball goes back to the centre spot.
- **Ducks** (`world/ducks.ts`): three mallards paddle slow loops round the pond, bobbing, and face the way they swim.
- **Benches:** walk up and tap "Sit". He sits facing out; "Stand up" or the stick gets him up.
- **Tests:** Vitest 158 (kick direction and strength, out of reach, rolls to a stop, wall bounce, scores between the posts but not wide). e2e 66 (kick, dribble into the goal and score, Sit, Stand up offered, the stick stands him up).

## 2026-10-09 (overnight): townspeople
- **Six made-up townspeople** (`people.py` looks; `townsfolk.ts` routes). They have a spread of skin tones, hair and clothes, and three of them are grown-ups at about 1.2× Nico's height.
  - Maya: the school.
  - Leo: the ice cream shop.
  - Mrs. Kim: the sidewalks by Nico's house.
  - Sam: the parts and toy shops.
  - Ava: the south-west houses.
  - Mr. Brooks: the hospital.

  Each walks their own block's sidewalks, with no road crossings, stops in at doors from the side the door faces, and has a few things to say when Nico says hi. The route tests cover all of them. Townspeople can kick the soccer ball if they walk into it.
- **Off-screen culling** (Pixi `CullerPlugin`, `cullable` on everything in the world): characters, cars and props off screen aren't drawn or filtered, which matters with 9 live-outlined people.
- **Streetlamps:** only on the north side of the east-west roads (a lamp south of a road drew up across it, as if it stood in the road), 120 px tall instead of 150, and no doubled lamps at corners. Door lanes are kept clear of lamps; this was caught by Maya's and Leo's route tests at the school and ice cream doors.
- The STORAGE sign was navy on navy, so its trim is now cream.
- **Tests:** Vitest 170, e2e 66.

## 2026-10-09 (overnight): odd jobs (a way to earn money)
- Until now money only went down. **Five odd jobs** (`jobs.ts`, data), each from a townsperson:
  - Mrs. Kim: water three flower beds by her house ($5).
  - Mr. Brooks: carry a package from the hospital to the fire station ($6).
  - Sam: find his cat Whiskers, hiding in one of five places ($5).
  - Ava: kick the soccer ball over to her ($4).
  - Maya: fetch her library book from school ($3).
- **How it works:**
  - Anyone with a job shows a "!" bubble, and their button says "Talk to … ❗". The offer card has "Sure! +$N" or "Not now".
  - The current step shows in the top bar (📋). A gold star on the minimap marks where to go: a place, or the person to go back to. At each place the action button offers the step ("Water flowers", "Pick up package"…), then "Finish job ✔" back with them pays out.
  - Tapping the 📋 chip offers to give the job up.
  - A job comes back after a cooldown (90–120 s), so the money can keep coming.
  - Only one job at a time. Jobs aren't saved; money is.
- **Spot priority:** a job step at a shop door (the package at the hospital) has to beat the door's own "Go in". Spots now have a `priority`, which is tested.
- Building cards are now a general `showCard` (title, text, choices, way out), shared by shops and job offers.
- **Tests:**
  - Vitest 175: every job's giver exists and it pays; every place a job sends you is walkable (caught a cat spot inside a park bench); steps run in order; several-place steps pick one.
  - e2e 73: the ❗ offer, accepting, the chip, each step offered at its place, Finish job, paid $6, no new job straight away.
  - Mutation: no cooldown went red.

## 2026-10-09 (overnight): sounds and little bits of life
- **Sound** (`sound.ts`): all synthesised with WebAudio, no files. There's a ball kick, a coin, a goal fanfare, quacks now and then near the pond, wing flaps, a honk from cars Nico has held up for more than 1.2 s (on foot or in his car, at most every 4 s per car, only nearby), and the siren. A 🔊/🔇 button mutes everything and is remembered on the device.
- **Pigeons** (8 flocks of 4): they peck and hop. When Nico, a townsperson or a car comes within 150 px they flap off, fading as they climb, and come back about 20 s later.
- **Cloud shadows:** six soft shadows drift slowly across the whole town.
- **Hidden coins:** 15 gold coins spinning in corners and out-of-the-way spots (world edges, behind buildings). Walking or driving over one gives +$1 and a toast, and it comes back after 3 minutes. A reason to explore, and a second way to earn.
- **Tests:** Vitest 176 (every coin and flock is reachable and off the road; caught a coin under a tree and one by a lamp). e2e 76 (coin pickup once only, mute button).

## 2026-10-09 (overnight): fire calls; tidier top bar; spot priorities
- **Fire calls:** when the alarm rings, a building near the truck's route (not Nico's home or the fire station) catches fire. Flames and smoke pour from a front window where you can see them from the street, and a toast says "🚒 Fire at the School! Follow the fire truck!". The minimap marks the fire, flashing. The truck brakes to a stop in the lane beside it and sprays an arc of water for 10 s until the fire is out ("🔥 The fire is out!"), then finishes its lap home.
  - **Corrections:**
    - The truck stopped 2 px short of its mark and waited forever: the stop window was 1 px, but braking held it 4 px out. The window is now 8 px, and a unit test drives it to a fire, sprays and comes home.
    - The fire was fading out a moment after the truck stopped spraying, so it burned forever. It now goes out in 8 s of spraying.
    - The first version put the flames on the roof, which is off screen from the street.
- **Spot priorities:** James waiting at Burger Barn's door, or Mr. Brooks at the hospital's, lost the tie to the door's "Go in". So you couldn't say hi, and Mr. Brooks couldn't pay for the package job. The e2e caught both once the fire call made the run longer. Order now: job step (1) > swing (0.6, even with Primo on the other one) > people (0.5) > doors and everything else (0).
- The +10 people / Clear stress-test buttons only show with `?debug` in the address (the e2e uses it). The frame-rate counter stays, for the iPad report.
- **Tests:** Vitest 177. e2e 77: a building is on fire with a toast, the truck stops there and sprays, then goes home.

## 2026-10-09 (overnight): rooftop landmarks
- Buildings were plain boxes, so each now has a landmark on its roof, readable even from the overview:
  - a giant burger on Burger Barn;
  - a giant cone on the ice cream shop;
  - a teddy bear on the toy shop;
  - a gear on Parts & Tools;
  - a red cross on the hospital;
  - the alarm bell on the fire station;
  - a flag waving over the school;
  - chimneys on the houses.
- Storage units have a row of numbered orange roll-up doors (with the office door kept), and the garage has one big roll-up door for the car.
- Vitest 177, e2e 77.

## 2026-10-09 (overnight): the big map
- **Tap the minimap** for a big map of the whole town: every building named, the playground, park and soccer field labelled, live dots (you in orange, your job in gold, friends, the fire truck, a fire). Tap anywhere to close. A touch on the minimap goes to the map instead of starting the thumbstick (`Input.reserved`/`onTap`). More minimap emoji: 🍦 🔧 📦.
- e2e 79: the map opens without moving Nico, and a tap closes it.

## 2026-10-09 (overnight): the school bus
- One of the inner loop's cars is now a yellow school bus: long, with windows down both sides and black stripes. It pulls in for 3.5 s at two bus-stop shelters (glass back, bench, a bus sign) along the park's south edge, and traffic behind it waits.
- **Correction (same bug as the fire truck):** the braking margin (10 px) was wider than the stop window (8 px), so the bus parked just short of its first stop forever. The window is now 12 px and the margin 6; the comment says why. A unit test runs the bus for 2 minutes and checks it waits more than 3 s at least twice.
- Generated streetlamps now also keep clear of the hand-placed props.
- Vitest 178, e2e 79.

## 2026-10-09 (overnight): automatic lite mode
- Every frame rate so far was measured on the Mac. As insurance for the iPad: if it stays under 45 fps for 4 s, the game permanently drops the costly extras (characters' soft drop shadows and the cloud shadows). The white sticker outlines stay, so the style holds. The fps chip then reads "(lite)".
- e2e 80: lite mode runs and is labelled.
- **Not proven:** the automatic trigger. The Mac never drops under 45 fps, so the e2e forces it through a hook. The trigger itself is a 4-line threshold.

## 2026-10-09 (overnight): walk cycle from real speed
- `stepGait` moved to `player.ts` (testable) and now takes the real speed in px/s. A faster walk means a longer stride (amp up to 1.25, a jog) and quicker steps. Taller people (the grown-ups) take longer strides at the same pace. Before, the cadence was a fixed multiple of stick deflection, so boosted (lunch) walking and different heights didn't match the legs.
- **Correction while measuring foot slide:** I expected the exact stride-matching cadence to stop the feet sliding. Measured, it slid *more* (0.46 of walking speed, against the old 0.36). With a sine leg swing the planted foot can't match the ground all the way through a step, and 0.8 of the "exact" cadence slides least (0.35–0.38 across speeds). So the remaining slide is part of this gait style; fixing it would need a stance phase in the rig. `test/gait.test.ts` keeps the slide under 0.4 of the walking speed at 120, 270 and boosted 365 px/s, and checks that faster means a longer stride and quicker steps, and that walking stops cleanly.
- Vitest 181, e2e 80.
