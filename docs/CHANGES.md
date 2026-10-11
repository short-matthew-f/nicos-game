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

## 2026-10-09 (overnight): save v4
- The town was re-laid out after save v3. An iPad left open overnight would restore Nico and his car at coordinates from the old layout (in the pond's sand, on the soccer field), and `freeAt` only rejects positions inside solids. v3 → v4 keeps the money and sends Nico back to his front door, with his car on the driveway. This is tested.
- Also tonight: emoji on the food menus.

## 2026-10-10: quest givers wait; Ava's ball
- **Nico's report:** quest givers kept walking their routes, so jobs were hard to hand in. The soccer ball "disappeared" in the street: cars drove over it and hid it underneath.
- **Waiting:** whoever Nico is doing a job for stands still, facing him, while he's within 320 px. Someone with a job to offer stops within 220 px.
- **Meeting places (`Job.meet`):** Ava now walks down her street to the end of the field and waits there, so the ball never has to cross a road. She walks back when the job ends. She pays when the ball is within 170 px of her (was 130).
- **The ball and traffic:** traffic and the fire truck push the ball out sideways (`nudge`). Rejected: a normal kick, because a car would shove the ball along the road in front of it. During Ava's job the ball also shows on the minimap.

## 2026-10-10: v2, the business loop
The UX handbook the user shared was read by four small agents. Its digest and the rules we applied are in `docs/UX_NOTES.md`.

**The loop:**
1. **Storage units:** an auction of three units. Each shows a peek inside, the price and a value guess.
2. **Open the unit:** tap the boxes, or "Open them all". Choose Sell or Keep for each item.
3. **Parts & Tools:** buy the workbench, then parts or a "car kit" with just the missing parts.
4. **Garage workbench:** drag the parts onto the plan, axles first, then wheels, then the body.
5. **Ramp test:** pick Low, Medium or High and let go.
6. **Toy Shop:** sell the car. Sold cars appear in the shop window, marked "MADE BY NICO".

After that, more cars are a three-tap quick build. The **Appraiser** skill unlocks on the third unit. A **goal chip** shows one next step at a time, with a star on the minimap, and steps aside while an odd job is on.

**Defaults** (all one-line edits in `src/business.ts`):

| Thing | Value |
|---|---|
| Starter unit | $10. Holds 4 wheels ($2 each), a teddy ($4) and a radio ($7). The only unit on the first visit, so the first buy can't be a loss (found in review: random units next to it could be bought first). Marked "Good first buy". Its guess is the close one. |
| Workbench | $25 |
| Wheel | $2 |
| Axle | $3 |
| Body | $5 |
| Toy car recipe | 2 axles, 4 wheels, 1 body |
| Toy car sale | $40 for the first one, $30 after that (parts cost $19) |
| Ramp | Low falls short. Medium and High pass. |
| Appraiser | Unlocks at 3 units. Exact guesses, and finds sell for 20% more. |

**Random units** are seeded, so a lineup doesn't change when the screen reopens. The price is set around the guess. Across 400 seeds the average outcome is a profit, and between 5% and 40% of units lose money; the tests check that range.

**Save v5** adds `biz`: parts, kept finds (each with its own value), workbench, designs, cars, sold, flips, skills, seed. v4 saves keep their positions; only the business starts fresh. A broken `biz` is cleaned up field by field.

**Feel rules from the handbook:**
- Buying a unit takes two taps.
- Everything in a unit belongs to Nico the moment he buys it, so leaving halfway through sorting loses nothing.
- Parts are used up only when the ramp test passes, or when a quick build finishes.
- A picked-up part rides 46 units above the finger. It snaps within 80 units of a slot and stays snapped until it's 100 away.
- A wrong drop slides the part back and says why.
- Rare finds (worth $10 or more) get a longer reveal, a sparkle sound and a gold ring.
- There are new sounds for the lift, snap, boing, door, cheer and cash.

**Bugs found while building:**
- In WebKit, `setPointerCapture` on SVG groups was unreliable, so a dragged part stuck in mid-air. Move and up are now handled on the window, with one drag at a time.
- The two-tap Buy guard started at `armed = 0`, so in the first 3 seconds after the page loaded, one tap bought. It now starts at -Infinity.
- A CSS class clash (`.unit`) styled the unit screen like an auction card.

**Tests:**
- `test/business.test.ts` covers the economy. The first unit is a profit even when the wheels are kept. The workbench and parts are reachable with three jobs plus the coins. A car sells for more than its parts. Guesses always contain the real value. Items, the goal steps, skills, and buying and selling are all covered.
- The state tests cover v4→v5 and a broken business.
- e2e (`verify/game_e2e.py`) plays the whole loop:
  - the mis-tap guard;
  - leaving mid-build;
  - a wrong drop;
  - a failed and then a passed ramp test;
  - the sale and the quick build;
  - Appraiser;
  - a reload keeping everything.

## 2026-10-10: wider swing set
- Nico: the two swings were very close together. The frame is now 300 px wide (was 210) and the seats are 150 px apart (was 86), so Nico and Primo have a gap between them.

## 2026-10-10: the clicking noise
- **Nico:** "a strange clicking noise" that happened a lot.
- **Cause, measured:** cars and townsfolk scatter the pigeon flocks all over town. That was 56 take-offs a minute while Nico stood at home, and every one played the flap sound (a short burst of noise) at full volume.
- **Fix:**
  - Only a flock within 600 px of Nico (or his car) makes a sound.
  - Every noise burst now fades in over 6 ms, because a burst that starts at full volume clicks.
- **Debugging aid:** `sfx` now counts plays per effect (`played`, shown as `__game.sounds`) for tests and for hunting the next noisy sound.
- **e2e:** far-off scatters stay silent, and a flock Nico walks into flaps. Mutation-checked.

## 2026-10-10: item requests (Nico's idea) and save v6
- **Nico:** "once I can start collecting items, people should occasionally have quests where I need to get them."
- **How it works:**
  - Once Nico has bought a storage unit, someone in town asks for a thing every 60–120 s (the first after 40 s). The request is a "!" bubble that stays for 150 s, one at a time. Example: "My old radio finally broke... could you find me a radio? I'll give you $15."
  - The job chip says what to find, and the minimap star points at the storage units.
  - In the auction, a unit holding the wanted thing shows it through the door, tagged "⭐ There's a 📻 Radio inside!".
  - In that unit, the thing defaults to **Keep**, marked "wanted!".
  - Once it's on the shelf, the chip changes to "bring it to …". Handing it over takes the cheapest one kept.
- **Data** (`src/jobs.ts`):
  - `WANT_REASONS` gives each find a line of why.
  - `WANTERS` lists who asks: Mrs. Kim, Mr. Brooks, Maya, Leo, Sam, Ava and James.
  - The reward is `ceil(top value × 1.5) + 2`. It always beats selling the thing, even with Appraiser (tested).
- **Never stalls:** while a request is on, every auction lineup has one unit with the thing (`lineup(seed, first, want)`). Tested over 60 seeds for every item.
- **Save v6:**
  - Toy cars are counted per product (`stock`, `sold`), ready for more products.
  - **The job in progress is saved**, which was a caveat before. A request's id (`want:<giver>:<item>`) is enough to rebuild it, and an id that no longer exists is dropped.
  - A v5 save moves `cars` and `sold` across.
- **e2e:** the request offered, accepted, "no radio yet", the right unit shown and bought, the radio set to Keep, a reload mid-request, then the hand-over and pay (123 checks). The stall-proofing and the job saving are mutation-checked.

## 2026-10-10: products, and the toy robot (Nico: "more mini games like the car!")
- **Products are data now:** `PRODUCTS` in `src/business.ts` (recipe, sale prices, test minigame, unlocked `after` another product sells, and a pitch line). The build plans (slots, order, tray, quick steps, "why" hints) are in `src/plans.ts`, with no DOM, so tests can check them against the recipes. The garage, the Toy Shop, Parts & Tools (a kit per idea; only parts for ideas you've had) and the goal chip all loop over products.
- **Toy robot** (unlocks when the first toy car sells: "💡 New idea!"):

  | Thing | Value |
  |---|---|
  | Parts | Tin body $4, 2 gears ($3 each), a battery $4, a light bulb $2 ($16 in all) |
  | Build order | Tin body first, then gears and battery, then the bulb (it needs the battery) |
  | Sale | $55 for the first one, $38 after that |

- **The robot's test: program it.** A 6×4 grid with four boxes and a star. Tap arrows to queue up to 12 moves, then press Go. The robot walks the program step by step.
  - Bumping a box or the edge: "Bonk!" and a wobble.
  - Stopping short of the star: a hint to add more steps.
  - Either way, ⌫ edits the program and nothing is lost.
  - Reaching the star: a cheer, then the design is done.
  - The level is `ROBOT_LEVEL`; the logic is `runProgram`, which the tests cover.
- **Shop window:** shows one of each product sold, a robot sprite included.
- **New parts** join the storage-unit pool; the profit and loss test still holds.
- **Tests:**
  - every plan matches its recipe (slots, tray, quick steps) and can be built in order;
  - every part is sold at Parts & Tools;
  - every product sells for more than its parts cost;
  - unlocks come one at a time;
  - the robot's test can be passed and failed (a bump, an edge, stopping short);
  - e2e builds the robot (a wrong order first), fails a program, fixes it, passes, and sells the robot (131 checks).

## 2026-10-10: thinner sticker edges; fewer fires
- **Nico:** "the white area around the stickers should be reduced quite a bit."
  - The world's edge is now one constant, `BAND = 3` px in `world/draw.ts` (was 7). Cars, the fire truck, the ball and the toy-shop window use it instead of their own copies of 7.
  - The characters' outline is `OUTLINE = 3` rig units (was 6). Small props already had 3–5 px.
- **Nico:** "there is maybe a fire too often."
  - The first alarm now comes after 2 minutes (was 25 s), so a restart doesn't bring an instant fire.
  - After that, alarms come every 5–10 minutes (was 70–130 s).

## 2026-10-10: a bigger world: forest, beach, pool, farm, campground, pier
- **Nico:** "the map isn't large enough. And it shouldn't be fully square... add a forest area, a beach area, a swimming pool, and some other zones."
- **The world is now 8100 × 5600** (was 4860 × 3510). The town is unchanged in the top-left, so every old position, save, route and test coordinate still works and there's no save bump. The new land is all east and south (`src/world/zones.ts`).
- **Not square:** a curving shoreline runs from the south-west to the north-east, with ocean beyond (solid), a sandy beach along it, and a pale strip and foam at the water's edge. The forest's edge is uneven.
- **Zones:**
  - **Forest:** pines (a jittered grid that thins out at its edges) and a lake. The ranger cabin and a trailhead lot are at the end of the forest road.
  - **Campground:** tents, a campfire and logs, at the end of the east road.
  - **Beach:** umbrellas, towels, a sandcastle, a lifeguard chair, palms, a lighthouse, and a **pier** you can walk out on.
  - **Pool park:** the pool, a waterslide tower (just looks for now), loungers and a pool house.
  - **Farm:** a barn, crop rows, a fenced pasture and hay bales.
- **Roads** are now segments (`ROAD_SEGS`) instead of lines across the whole map. They lead out to the forest trailhead, the campground, the farm and pool, and the beach car park.
- **Animals** (`world/animals.ts`): cows and chickens at the farm, deer and rabbits in the forest, gulls and crabs on the beach (24 in all). Each wanders near its home. The shy ones run from Nico; the cows don't. Homes settle onto the nearest free ground.
- **Maps:** the minimap and big map show the sand, sea, forest, lake, pool and pier, with zone labels and new icons (🐄 🏊 🌲).
- **Forest fixes from screenshots:**
  - pines first covered the road and the cabin door, so they now keep clear of the space a pine's height below roads, lots and doors;
  - the spacing was loosened so the forest is walkable;
  - the ocean strips were narrowed to 40 px so the steep east coast keeps its beach.
- **Tests:** layout tests use the road segments, and check that animals stand on free ground, the sea is solid past the shallows (except the pier), and the beach is walkable. e2e: the sea stops Nico, the pier doesn't, animals exist and a deer runs off (135 checks). 60 fps on the Mac in every zone.

## 2026-10-10: the beach: shells and a metal detector (Nico's idea)
- **Shells** (`world/beach.ts`): 18 on the sand at a time, six kinds. Scallops are common; sand dollars and starfish are rare. Walk over one to pick it up ("🐚 A new kind: Starfish! (4 of 6 kinds)"). A new one washes up somewhere else 2½ minutes later. They're drawn at 1.5× so they're easy to spot.
- **Metal detector:** a 🧰 tool at Parts & Tools for $12 (`TOOLS` in `business.ts`). On the sand, a 📡 meter appears and it beeps faster and higher as Nico nears one of the four buried treasures (range 520 px). Right on top of one, the action is **⛏️ Dig!**: he crouches and digs for a second.
- **Treasure:** cash ($2–8), or a beach-only find for the shelf (an old bottle, old key, watch, pirate coin or gold ring). Beach finds are marked `where: 'beach'` and never turn up in storage units (tested). A hole is left behind and fades, and a new treasure is buried somewhere else.
- **🎒 Backpack** (top bar): the shell collection (kinds found out of 6, and counts), the shelf, and your tools. Forest photos will go here too.
- **Save:** `biz.tools` and `biz.shells` default to empty, so there's no version bump.
- **Door fix found by the tests:** people now stop for Nico, and anyone standing at a door used to beat it for the action button. Now only someone waiting on a finished job outranks a door. Someone offering a job ties with it (the nearer wins), and "say hi" never blocks it. `Spot.priority` can be a function.
- **Tests:**
  - beeps get faster as Nico gets closer, and stop out of range;
  - shells and treasure land on walkable beach;
  - every shell kind turns up, the rare ones less often;
  - treasure is cash or a beach find;
  - storage units never contain beach finds;
  - the priority rules.
- **e2e:** buy the detector, a weak signal from far away, full signal and Dig on top, dig something up, go quiet off the sand, pick up a shell, the backpack lists it (142 checks).

## 2026-10-10: the forest: a camera and wildlife photos (Nico's idea)
- **📷 Camera:** $10 at Parts & Tools. With an animal within 800 px, the action button offers **📷 Camera**. It's the lowest priority, so doors and people still win when Nico's at them.
- **Aiming:** the view zooms in (600 px tall) behind a viewfinder: a frame over the middle 56% of the screen, with the rest dimmed. The stick moves where the camera points, up to 800 px from Nico, while he stands still. The action button is **📸 Snap!** (a flash and a shutter sound), and "✕ Put the camera away" exits.
- **Stars** (`photoStars`): 3 stars in the middle third of the frame, 2 nearer the edge, 1 at the edge. One fewer if the animal is running, since it comes out blurry. Shy animals bolt when Nico gets close, so the zoom is how you get the good shots.
- **Album:** the best photo of each of the 7 animals is kept in `biz.photos` and listed in the 🎒 backpack.
- **Fox:** new, two of them in the forest. Very shy: it flees from 330 px.
- **The ranger** (the cabin now has a door, as do the barn and the pool house) pays $3 for each animal's photo the first time you show it.
- **Tests:** star scoring. e2e: buy the camera, the camera is offered near a deer, the viewfinder and Snap appear, nothing in frame gives no photo, the deer in frame gives 2+ stars, put it away, the ranger pays (149 checks).

## 2026-10-10: the pool: water slide, swimming, a floating ring (Nico's idea)
- **🛝 Water slide:** at the tower's foot. Nico climbs the ladder (back view), sits at the top, and whooshes round the twisting chute, which speeds up as it goes. The chute now comes down to the water. Then a splash (sound and a ripple ring), and he's swimming (`waterSlideAt`, `WSLIDE` in `zones.ts`).
- **🏊 Jump in:** from the deck on the pool's south side.
- **Swimming:**
  - The stick steers at 150 px/s (100 on the ring), kept inside the pool. He bobs gently.
  - A **mask cuts him off at the waterline**, so the pool, its lane ropes and the shimmer show below, with a ripple ring round him. A first version covered his legs with a patch of pool colour, which hid the ropes.
  - He's drawn lower without moving: `Body.dy`. A first version moved him down every frame, so he drifted to the bottom.
- **🛟 Float on a ring:** the action button toggles a red-and-white ring. He floats higher and bobs slower.
- **🪜 Climb out:** offered within 46 px of an edge. He steps straight out onto the deck, or a step along the edge if a lounger's in the way (found by a test).
- **Tests:** climbing out anywhere round the edge lands on free deck; the slide ends in the water, away from the edge. e2e: the slide, splash, swim, ring, climb out, jump in from the deck, climb out again (158 checks).

## 2026-10-10: building insides: Burger Barn (Nico's idea)
- **"Buildings should have insides."** Tapping **Go in** at Burger Barn now takes Nico inside. The town is hidden but keeps running (traffic, people, animals, fires); anything in the town that cares where Nico is uses his spot outside the door (`here()`).
- **The room** (`world/rooms.ts`) is data (`ROOMS`): its size, the back wall with the **menu board** (drawn from the same `PLACES` menu), a counter with the **cook** behind it, tables with stools, and the door.
  - The cook is a new look in `people.py`: a red-and-white uniform. Nico's art is unchanged (md5).
  - The counter and tables were moved down after a screenshot showed the cook's head covering the menu.
- **Ordering:** at the counter, **🍔 Order** opens the cook's menu ("Hi there! What can I get you?"). Buying puts the food on a **tray**, and Nico carries it in both hands.
- **Eating:** at a table, **🍽️ Sit and eat**. Nico sits side-on on the left stool, with his tray on the table, and eats for 3 seconds. Then comes the speed boost, which now arrives when you eat, not when you pay.
  - The stools draw behind him; at first they hid him.
  - Without food it's **🪑 Sit down**.
- **🚪 Leave** at the door puts him back outside. Leaving with uneaten food eats it on the way out, so it's never lost. The camera keeps to the room's walls, and the minimap is hidden inside.
- **Ice cream next**, the same room with a different menu, once Nico has seen this one.
- **e2e:** go in, order fries (money, then a tray, no boost yet), sit and eat (then the boost), leave back to the door, the $2 case, tap-outside closes the card (166 checks).
- **Stools** (user feedback): they were drawn straight down from above while the table is at an angle. Now they match it: an oval seat on a post, with a foot on the floor.
- **Sitting looked wrong** (user: "does it look natural?"). It didn't: Nico sat on the floor in front of the stool, hunched, with his face at the tabletop. The sitting pose drops the hips to the feet, which is right for the slide but not a stool. Fixes:
  - He's now drawn up by the seat's height (`STOOL_SEAT`), sitting upright (no hunch).
  - Tables have a pedestal, with the top (`TABLE_TOP`, 62 px) a little above the stool seats (43 px). His tray sits on the tabletop.
  - Left as is: his legs point straight forward rather than bending at the knee. The rig's sitting pose has no knee bend, and it's shared with the slide.
- **Bent knees** (user: "can we get his knees to bend?"). The rig's legs were single pieces rotating at the hip. Now a game-only `knee` amount (0..1) splits a side-view leg into a thigh (toward straight forward) and a shin (toward straight down), with the shoe on the end of the shin.
  - The shin is a second sprite drawn with the leg's own art (`bk`/`fk`, cloned in `person.ts`), so no new art or Python change was needed.
  - The shin parts only exist while knees are bent, so walking and the 97 Python parity poses are unchanged (tested).
  - Used for sitting on the Burger Barn stools.

## 2026-10-10: bring the car home
- **Nico:** his car was missing. The garage card now always has **🚗 Bring my car home**, which puts it back on the home driveway, facing the road, wherever it's ended up. (The minimap shows the car as a red dot while you're on foot.)

## 2026-10-10: the storage building, inside (and the end of endless money)
- **Nico found infinite money:** auction units were worth a little more than their price on average, there was no limit on buying them, and Appraiser showed exact values, so he could keep picking winners.
- **Now** (user: "turn the storage units into an inside space... walk up to a bunch of different items and choose whether to trash, sell or keep each"):
  - **The hallway** (`drawHall`): six roll-up doors with a sign each (A · $12), a value guess on the door, and a gap underneath where you can see a couple of things inside. There's an office desk with the **clerk** (a new look: orange vest; Nico's art unchanged).
  - **Buying:** walk up to a door, then a card shows what's under the door, the guess and the price. Buy it and the door rolls up ("YOURS").
  - **Inside a unit** (`drawUnit`): the finds lie about the concrete floor as big stickers. Walk up to each one and choose **💰 Sell**, **🏠 Keep** (shelf) or **🔧 Keep** (parts box), or **🗑️ Trash**.
  - **Junk** (old socks, newspapers, a leaky bucket) is worth nothing, so Trash is a real choice.
  - A wanted item says "⭐ Someone asked you to find one of these!"
- **The limits** (the user also suggested "limit the number of auctions which spawn in a certain timeframe", which is what this does):
  - You sort **one unit at a time**.
  - A sorted unit's door shows **SOLD, "new stuff in 6:59"**: 7 minutes of play before new stuff arrives (`HALL.restock`). The timers only count while the game is open.
  - Unit prices sit closer to what's inside (×0.8–1.1 of the estimate, was ×0.7–1.0).
- **The first time,** only Unit A (the starter) is for sale; the other doors say "buy Unit A first".
- **Leaving halfway is fine:** the rest waits in your unit (it's saved).
- **The clerk** buys your kept finds ("Sell all").
- **Save:** `biz.doors` and `biz.unit`, cleaned up field by field. The old auction screens are gone from `workshop.ts`.
- **A regression test for the loophole:** a greedy player with Appraiser, buying the best-looking unit the moment one's free and selling everything, for an hour of play. With the new rules that comes to $4.20 a minute (54 units). The test fails above $6/min. The first version of the new rules allowed $8.60/min, hence the tighter prices and the longer restock.
- **e2e (173 checks):**
  - the hallway, with only Unit A for sale at first;
  - the card, then buy, then the door is "yours";
  - walk in, sort all six things, sold out;
  - the other doors open;
  - leave halfway, one unit at a time;
  - Appraiser on the third unit;
  - a wanted radio shows under a door, its card says so, keep it.

## 2026-10-10: farm animals stay in; easier digging
- **Nico:** "the farm animals are roaming everywhere because they're not enclosed."
  - The pasture now has fences on all four sides (a new `fencev` prop for the up-and-down sides), with a gate on the right for Nico.
  - Cows stay inside the pasture and chickens inside the farmyard (`PENS` in `world/animals.ts`): wandering and running-away targets are kept inside the pen, and so is every step.
  - The chicken homes that sat outside the farmyard were moved in.
  - Test: two minutes of Nico chasing them round the farm, and every cow and chicken stays penned. Mutation-checked: without the pen rules, the test fails.
- **Nico didn't notice the Dig button:** it only appeared within 56 px. Now it shows within 110 px (`DETECT.dig`), and the first time the meter fills on each treasure a hint pops up: "📡 It's right here! Tap ⛏️ Dig!"

## 2026-10-10: sticker unlocks and the work shed (part 1)
- **The user's idea:** "a bunch of the things in the game have to be unlocked with a purchase, and they get 'added to the world' like applying a sticker... You could show an outline where it will be." Also: "he's itching for a workshop... a work shed next to his house... buy equipment and tools."
- **`src/unlocks.ts`:** unlockables as data (`UNLOCKS`: id, label, price, which room it goes in, what it needs first). Bought ones are in `biz.unlocked`.
- **`world/stickers.ts`:**
  - Until bought, a thing is a **dashed white outline** with its name and a **price tag**.
  - Buying **slaps it on like a sticker**: it drops in 35% bigger and tilted, squashes, wobbles, and a white flash runs round its edge, with a sparkle sound.
  - It pivots round its own foot, so it lands in place. A building's art is drawn in world coordinates, so without that it would have flown in from the corner of the map.
- **The work shed ($15)** stands in the back garden below Nico's house (`SHED` in `map.ts`).
  - Two flowers and a bush moved over, and Mrs. Kim's watering spots moved with them.
  - Its space and doorway are kept clear of lamps: a lamp had been standing right in the doorway.
  - It's solid once bought. If Nico is standing where it lands, he's moved to the door.
  - **Go in** leads to the shed's room: a wooden floor, plank walls and a window.
- **Inside: the workbench ($15)** is the first equipment sticker. Building moved there from the garage, and Parts & Tools no longer sells a workbench. The garage keeps "Bring my car home".
- **The goal chip:** "Build your work shed, behind your house ($15)", then "Put a workbench in your shed ($15)", then parts and building. The star points at the shed.
- **Nico's save:** a save that already has a workbench gets the shed and the bench, already standing (`migrateUnlocks`, tested).
- **Economy:** the shed and bench cost $30, against the old $25 workbench. The "reachable with three jobs plus coins" test still holds.
- **Tests:**
  - unlocks: prices, buy once, the bench needs the shed first, the migration;
  - layout: nothing in the shed's space or doorway (mutation-checked: without the filter a lamp blocks the door).
- **e2e (180):** the outline and its price, walk-through until bought, buy, then solid and "Go in"; inside, the bench outline, buy, use; the build flows now go through the shed. Mutation-checked: when the shed isn't made solid, a check fails.
- **Not yet:** the shed isn't on the minimap; the minimap is drawn once at start-up.

## 2026-10-10: the rest of the shed (part 2), and a waist-high bench
- **New stickers inside the shed** (each a dashed outline with a price until bought):
  - **🗄️ Shelves** ($10, needs the shed): everything Nico has kept sits on the boards, storage finds and a 🐚 for each kind of shell. Tap for the count and what it's worth.
  - **🧰 Parts bins** ($15, needs the workbench): order parts from the shed. It opens the Parts & Tools card.
  - **🎨 Paint station** ($20, needs the workbench): painted toys sell for **$5 more** (`PAINT_BONUS`, in `priceOf`).
- Buying the workbench shows the bins and paint outlines straight away, not on the next visit.
- **The user:** "the workbench is a lot taller than Nico." It was drawn 200 px tall against Nico's 132. Benches are now drawn from the floor up: legs to about his waist (`BENCH = 64` px), then the top seen from above. The paint station was redrawn the same way.
- **Tests:** equipment order and a place for each; the paint bonus. e2e: buy all three, the bins open parts, the shelves count your finds, a painted car sells for $35 (186 checks).
- **Stickers fold down from a corner** (user: "can it sort of fold down like the corner is being placed into place?"). The drop-and-wobble was replaced:
  - The top-left corner sticks first, and a fold line sweeps diagonally to the bottom-right over 0.8 s (fast at first, easing as the last corner goes down).
  - The stuck part is revealed with a mask.
  - The part not stuck yet is mirrored across the fold and drawn as the sticker's white back, with a soft shadow and a crease along the fold, as if lifted and folded over.
  - Then the white flash runs round the edge.

### Bibs and Bobs, the beach shop (2026-10-10)
Nico: "a purchasable beach side store where he can make necklaces and bracelets out of shells to sell... passive income." The user named it "Bibs and Bobs". They added that he should go inside and play a mini game to make things, the things should show on the shelves, and people should come in, visit and sometimes buy. Hemp twine comes from the hardware store.
- **A sticker unlock** ($25, `unlocks.ts`): a dashed outline at the top of the sand, east of the beach parking lot (`SHOP` in `map.ts`). It sits outside `BUILDINGS`, like the shed, so it never catches fire.
  - Shells and buried treasure never spawn under it or on its step.
  - A palm that stood in front of it was moved.
  - It shows on the minimap with 🐚. The shed now shows on the minimap too.
- **🧵 Hemp twine** is a part sold at Parts & Tools ($1, or 5 for $5). It shows once the shop is owned and never turns up in storage units (`where: 'shop'`).
- **Inside:** the back wall has eight pegs on two shelf boards. There's a stringing table on the left and a counter with the till on the right.
- **The stringing mini game** (`Workshop.jewelry`):
  - Nico chooses a bracelet (4 shells), a necklace (7) or a wind chime (10).
  - He taps his shells to string them along the twine, and taps one on the twine to take it off.
  - The price shows as he goes: the base price, plus each shell's value (rarer shells are worth more), plus a pattern bonus. All one kind is a matching set (+$2), two kinds alternating is a pattern (+$2), and the same both ways is a mirror (+$1).
  - "Tie it off" uses the shells and one length of twine, and hangs the piece on the shelves.
- **Visitors** (`jewelry.ts`, `visit`):
  - Someone arrives every 20 to 40 s and buys about one time in six, so roughly one sale every three minutes.
  - Inside the shop you see townsfolk walk in, look at a piece, and say "So pretty!" or "I'll take it! 💰". If they buy, that piece leaves the shelf.
  - Out in town, a sale just pops up as a toast.
  - The money waits in the till until Nico taps it.
- **Sales while away** (the parked time question, answered for this feature): on load, `whileAway` replays the visitors for the time since the shop was last open, up to 3 hours. Sales can never exceed what's on the shelves, and a toast says what sold.
- **Shell collection:** "kinds found" is now its own record (`biz.found`), because making jewelry uses shells up. Old saves fill it from the shells in hand, with no version bump.
- **Tests:**
  - Pricing and patterns; making a piece and the refusals.
  - Twine never appears in units.
  - Visitors buy what they looked at; the till; away catch-up and its cap; the save.
  - A greedy hour (every shell picked up, the best pieces made) earns about $2.40 a minute. The test fails above $6, and a mutation check confirmed it catches a raised buy chance.
  - The layout test now covers both the shed and the shop.
  - e2e: buy the shop, buy twine, string a pattern bracelet ($9), a visitor buys it, empty the till, and things sell during an hour away (201 checks).

### Tempo (2026-10-10)
- A new townsperson, from the user ("Let's add tempo now too. This kiddo should be in an all red tracksuit"). He has short dark-brown hair, is a little smaller than Nico, and wears an all-red tracksuit: a jacket with a stand-up collar, a white zip and white sleeve stripes, red track pants with a white stripe down each leg, and white trainers.
  - `people.py` gained a `track` top and a `stripe` on the legs. Nico's art is byte-identical.
  - The photos are reference only and are not in the repo.
- He runs up and down the beach: the sandcastle, outside Bibs and Bobs, and the pier.
- The townsfolk route test now checks the roads as built (segments), not as endless lines, so a beach route can cross below where the south road ends.

### Day and night (2026-10-10)
The user: "a day and night cycle might be nice. The city could have some street lamps that create a glow around them. The moon could come out. The forest could be a little spooky."
- **The clock** (`world/night.ts`, `DAY`): a day is 12 minutes of play, about 7 of daylight and 3 of night, with a warm sunset and sunrise in between. It's saved (`Save.clock`, optional, no version bump), and a new game starts mid-morning.
- **The dark:** a multiply tint over the world: white by day, warm orange at sunset, moonlit blue at night. The forest gets an extra layer of dark, with feathered edges.
- **The lights:** additive glows drawn on top of the dark, so it doesn't dim them:
  - every street lamp (a glow round the bulb and a pool of light on the ground);
  - most building windows, the same ones every night (`windowSpots` was pulled out of `drawBuilding` for this);
  - the campfire (flickering), the lighthouse lamp with a turning beam, and the pool's underwater lights;
  - two soft headlight beams ahead of every car, including Nico's;
  - a soft light round Nico, so he's easy to see in the dark.
- **The moon** rises on the left at dusk, crosses the top of the screen and sets at dawn: a glowing disc with craters, drawn over the world on screen.
- **A little spooky:** pairs of eyes glint between the forest pines, blink, and fade away when Nico comes close. Fog drifts through the woods, and fireflies dance round the campground.
- Night first tried headlights as hard-edged triangles on the car body: they were dimmed by the dark and looked cut out. They're now soft glows in the light layer. The forest's dark had a hard straight edge, so it's now four feathered layers.
- e2e: night is full dark and still running, the clock turns, back to day. The away-sales check now uses a debug hook (`awayFor`) that runs the same catch-up as loading; a reload saved "now" over the test's "an hour ago" (205 checks).

### Primo climbs buildings (2026-10-10)
- From the user: "he often climbs on buildings. It would be funny to see him up on top of buildings sometimes."
- Once a lap of his playground route (about once a minute), Primo stops beside Burger Barn and climbs up its front wall hand over hand, back to us. He steps up onto the roof and waves from up there for a few seconds, then climbs back down and runs off to the slide.
- Say hi while he's up there: "Look at me! I'm on the roof!" A route stop with `climb: '<building id>'` does it for anyone, on any building.

### Real sounds (2026-10-10)
The user: "genuine sound effects might make things feel better. The sound of walking on sand vs walking on sidewalk or the forest. Actual bird noises. Trees rustling. Etc. gentle car horns."
- **Footsteps are real recordings:** "Impact Sounds" by Kenney, CC0, converted to mono AAC `.m4a` for Safari, 116 KB in `public/sfx`.
  - There are five takes per surface, never the same take twice in a row, with a little pitch wobble.
  - One plays each time a foot comes down (from the walk cycle's phase).
  - `surface.ts` decides what he's on: sidewalk, road and paved lots sound like concrete; the park, fields and forest floor like grass; the beach and the sandpit like sand (the snow-crunch takes); the pier and indoor floors like wood.
- **Birds** (synthesised, since no CC0 birdsong recordings were at hand): four little songs (a tweet-tweet, a trill, a whistle up and down, a warble), panned left or right at random. They sing more often among trees and only by day.
- **At night:** owls hoot in the forest and crickets chirp.
- **Wind in the leaves:** a soft noise loop that swells in gusts, louder the more trees are round Nico.
- **Waves:** a slow swell near the shore.
- **Car horns:** a polite double toot, two notes through a soft filter, instead of the harsh square-wave honk.
- Tests: a surface map unit test; e2e walks on concrete, sand and grass and hears the right footsteps (208 checks).

### Weight (2026-10-10)
The user: "Make sure things have 'weight' even though we are in the sticker verse."
- **Nico gets going and slows down over a moment** instead of starting and stopping dead: his velocity eases toward the stick. His walk animation and footsteps now follow how far he really moved, so he no longer walks on the spot against a wall.
- **Each foot lands with a little squash.** On sand he kicks up small puffs.
- **The camera trails a moment behind** (it cuts on a jump of more than a screen, like going through a door).
- **His car leans out on turns** and pitches forward when it brakes and back when it speeds up: the body shifts over its shadow.
- **Stickers land with a thump:** a low thud, a ring of dust along the bottom, and a small jolt of the screen.

### Nico's house, inside, and sleeping (2026-10-10)
Nico wanted to go inside his house. The user asked "How can Nico sleep?"
- **Walk in through his front door** (it used to show a card). Inside:
  - his bed, with a nightstand lamp that glows after dark;
  - a couch under the windows (sit on it);
  - the kitchen, with mom's note on the fridge: "Grab a snack" gives an apple and a little speed, every 2 minutes;
  - a big round rug and a picture;
  - two windows that show the sky outside: blue by day, orange at sunset, and stars and the moon at night.
- **Sleeping:** at night the bed says "Go to sleep". Nico climbs in, tucked under the blanket with his head on the pillow, and the screen fades to night with floating Zzz. It's morning when he wakes: the clock jumps to sunrise and he's full of energy (+30 s speedy). By day it's "Take a nap" (+15 s speedy, no time skip).
- The furniture is data (`HOME_FURNITURE`), ready for decorating.
- e2e: in, sleep at night and wake at sunrise, a snack, out (214 checks).

### Nico's Bakery (2026-10-10)
Nico: "he wants to be able to open a bakery."
- **A $40 sticker** on the south-west block, between the houses and Parts & Tools. A bush moved out of its way. It's on the minimap with 🧁.
- **Inside:**
  - a candy-stripe wall and a checkerboard floor;
  - the oven and the mixing table;
  - a glass display case in the middle (what's for sale sits inside it);
  - the pantry shelf, and the counter with the till;
  - a chalk menu board.
- **Recipes** (`bakery.ts`):
  - chocolate chip cookies (4 at $3);
  - cupcakes (3 at $4);
  - loaves of bread (2 at $5).
- **Ingredients:** flour, sugar, butter and chocolate come from the pantry shelf, one at a time or "everything for cookies". Eggs are free at the farm: tap the barn door to collect what the hens have laid, one every 25 s, up to 6.
- **The baking mini game** (`Workshop.bake`):
  1. Tap each ingredient into the bowl.
  2. Stir six times.
  3. Into the oven: a needle runs along a bar, and you tap "Take it out!" in the gold zone.
  - Golden sells for $1 more each; a little early or late is fine; doughy or burnt sells for half.
- **Selling** uses the same visitors-and-till as Bibs and Bobs, now shared in `store.ts`. Food sells faster (a visitor every 15 to 30 s, 3 in 10 buy) but for less. Customers walk up to the case and say "Yum, I'll have that! 💰". It keeps selling while Nico is away, like the shop (up to 3 hours, only what's in the case).
- Tests:
  - recipes, the oven's timing, baking and the case limit, customers, the till, catching up, the save;
  - a greedy hour of nonstop golden trays earns about $3.30 a minute after ingredients (the test fails above $6);
  - the layout test covers the bakery;
  - e2e: buy it, eggs from the farm, the pantry kit, mix, stir, take it out golden, 4 cookies in the case, a customer buys one (222 checks).

### Decorating the house (2026-10-10)
Nico: "he wants to be able to decorate his house."
- **Things to buy for the house:** sticker unlocks, `room: 'home'`. Each shows as a dashed outline with a price in its spot, and when bought it sticks on with the fold, a thud and dust. Each one does something:
  - 🖼️ **Posters** ($3) above the bed: a soccer star and a rocket.
  - 📚 **Bookshelf** ($10): read a book.
  - 🪴 **Big plant** ($5): water it.
  - 🫘 **Beanbag** ($5): flop into it.
  - 📺 **TV and game console** ($20): sit on the beanbag to play. The screen flickers and a level gets beaten every few seconds.
  - 🐠 **Fish tank** ($15): three fish swim round it; feed them and they zoom.
  - 🐱 **A pet cat** ($25): she sits watching the fish, breathing, and purrs when you pet her.
- **🎨 Redecorate** (by the door) picks the wallpaper and the rug, $5 a change:
  - six wallpapers: sky blue, mint, sunny yellow, peach, space, team red;
  - four rugs: red and yellow, ocean, forest, candy.
  - Saved in `biz.home`; the colours are data in `decor.ts`.
- e2e: buy a beanbag and a TV, play games and beat a level, space wallpaper (228 checks).

### Play as a friend (2026-10-10)
Nico wanted to switch between Nico, James and Primo; Tempo is in too.
- **The 👤 button** (next to the backpack) picks who you play: Nico, James, Primo or Tempo. Not while driving or in the middle of something.
- **Whoever you play as hands their routine to Nico:** play as Primo and Nico is the one swinging and climbing Burger Barn; play as Tempo and Nico runs along the beach, saying Nico things.
- The choice is saved (`Save.player`, optional), and it's applied once the game is set up.
- People keep their tap spot under their first name, whoever's walking the route. That fixed a crash on the first try.
- e2e: play as Primo, Nico walks Primo's rounds, back to Nico (231 checks).

### Inside every building (2026-10-10)
The user: "any space that exists should be able to be gone inside of."
- **`world/interiors.ts`:** a room is data. It has wall and floor colours, the things in it, and someone to talk to. A thing is one of four kinds:
  - a block (counters, desks, shelves, beds);
  - something on the back wall (chalkboards, maps, posters, windows);
  - a big emoji (a cow, the fire truck);
  - a rug.
  Anything can have a use: a line or two when you walk up, a seat, or the building's own business.
- **New insides:**
  - **School:** a chalkboard you can draw on, rows of desks to sit at, a globe to spin, and the janitor.
  - **Hospital:** the nurse gives you a check-up and a little speed; there's a waiting room and a bed that crinkles.
  - **Fire station:** the truck (unless it's out on a call; ring its bell), the pole, a helmet rack, and a firefighter.
  - **Ice cream:** order at the counter, sit at a table.
  - **Parts & Tools, Toy Shop:** shelves of stuff, and the clerk or the owner at the counter (the same buying and selling as before).
  - **Garage:** the tool wall, your bike, and "Bring my car home" at the bench.
  - **The farm's barn:** hay, a cow, a horse, chickens, and the farmer with the eggs.
  - **Pool house:** lockers and pool toys, and the lifeguard.
  - **Ranger station:** the trail map, a stuffed bear, and the ranger with the photo album.
  - **The six houses round town:** each family's living room. Maya's mom, Leo's dad, Sam's grandma and the others say hi and offer a treat (lemonade, a cookie, a muffin...: a little speed, every 2 minutes).
- **New people** (made up): the nurse, firefighter, farmer, ranger, lifeguard, ice cream server, toy shop owner, janitor, and moms, dads and grandmas. `people.py` gained bald and curly hair, glasses and a mustache for them. Their art loads in the background after the town is up, so starting the game is no slower.
- **Doors now take you inside.** The menus and buying cards moved to the counter inside. The e2e door helper walks up to the counter, and the debug `place()` steps outside when it's given a spot out in town.
- Tests: every building has an inside and a door; in every room, everything you can use, the person and the way out can be reached (17 more). e2e: 231 checks.

### Poppop, Nonna and Yia-Yia (2026-10-10)
Nico's grandparents, from family photos (reference only, not in the repo).
- **The people:**
  - **Poppop:** short, fluffy, wavy white hair receding at the front corners, a big white walrus mustache, glasses, and an orange-and-green plaid flannel. The user said his first hair "looked a little weird", so three agents each tried a direction (a natural fringe, fluffy sides, a short crop), all redone after the user sent a side photo. The user picked the first: tousled and fluffy, receding at the corners, ears showing.
  - **Nonna:** short (4'11": Nico is almost as tall as her), with soft wavy grey hair, thin rimless glasses, a blue shirt and a grey cardigan.
  - **Yia-Yia:** short grey hair, dark rectangular glasses, a bright blue fleece.
  - `people.py` gained glasses (round or rectangular), a mustache, curly hair, a cardigan, and a plaid pattern.
- **Poppop and Nonna's house**, at the edge of the woods (north-east, off the forest road): Nonna's kitchen.
  - "A big bowl of pasta": sit at the table, +60 s speedy, every 3 minutes.
  - **Pizzelle with Nonna:** a mini game. Batter on the iron, close it, open it when the steam stops; three perfect ones and she teaches you her recipe. Nonna's pizzelle become a fourth recipe at the bakery (`learn: 'pizzelle'`).
- **Poppop's woodshop:** a red barn of a garage (barns now get big double doors with white X bracing). Inside: a tool wall, lumber, a workbench, the CNC router and the plasma cutter. Three projects with Poppop:
  - **Birdhouse:** tap each nail three times. It goes up on a post in Nico's garden.
  - **CNC router:** pick a star, a heart or a rocket, and watch the bit carve it. A carved "⭐ NICO ⭐" sign goes over his kitchen.
  - **Plasma cutter:** hold the button to cut round a star, with sparks. A steel star goes on his wall.
  - These are `earned` unlocks: never for sale, stuck on when made.
- **Yia-Yia's studio** (south block, next to the Toy Shop):
  - Her two paintings are on the wall, redrawn in the game's style from photos of her real ones: grasses round a carved stone pillar with a fish and a pink flower, and a portrait of a fair-haired girl in white on green. The photos aren't in the repo.
  - **Paint with Yia-Yia:** finger-paint on a real canvas (9 colours, 3 brush sizes). "Hang it up!" saves it (a small JPEG in the save, the newest 8 kept). It hangs in her gallery, and the newest also hangs at home.
- Grandparents' houses never catch fire. Their art loads in the background.
- e2e: learn pizzelle, cut a plasma star, paint and hang a picture (235 checks).
  - The item-request check now catches Maya between doors: while she waits at the school door, the door wins the tie.

### No more emoji in the world (2026-10-10)
- **The user:** "why are there suddenly a bunch of emoji in the game". The new insides used emoji as quick stand-ins for things on shelves and counters, and for the cow, horse, chickens, fire truck, bike and bear.
- **`world/icons.ts`:** about 80 small drawn icons in the sticker style (flat shapes with a white edge): food, tools and parts, toys, pool things, the cabin's animals, the grandparents' things, the pantry's ingredients. There are also eight big drawn things: the cow, horse, chicken, chick, fire truck, bike, bear and plant.
- **Rooms now draw these** instead of emoji, and the wall signs lost their emoji. Also redrawn:
  - the bakery pantry shelf, and the menu board (little cookie, cupcake and bread drawings with prices);
  - the shed's parts bins;
  - the carved sign at home (NICO between two drawn stars, hearts or rockets).
- **Emoji still in the world, from before:** the finds lying in a storage unit and on the shed shelves, and the Burger Barn tray. The minimap labels, and the buttons and messages, also use emoji.
- **Yia-Yia's paintings, redrawn closer to her originals** (the user: "make the drawings look both in the style and a little more close to the originals"; the grass was poking outside the painting). Mocked up on a local page drawn by the game's own code first, then the user approved them: "Those are way better. Lock it in."
  - `world/paintings.ts`; each painting is clipped to its canvas.
  - **Grasses:** long, wavy, tapering ribbon blades (cubic curves) that arch over the pillar and droop. The gold is soft scattered mosaic dabs, with a dark leafy patch behind the grass. The pillar has a carved capital and a fish band.
  - **Portrait:** the girl sits in a wide white gown, sleeves folded in her lap, with straight fair hair past her chin, a full fringe and big blue-green eyes, and a soft reflection on the teal floor.

### Poppop's Fiat 500 (2026-10-10)
- The user: "Poppop should drive a fiat 500". `world/fiat.ts`: a round white Fiat 500 with maroon seats (the user: "His fiat was white with maroon seats"; light grey roof, canvas sunroof rolled back, round headlights, chrome bumpers) parked straight on a new driveway in front of the red barn (`DRIVEWAYS` id 'poppop', so the street lamp there is dropped).
- Every 100-200 s (first after 45 s) Poppop drives `poppopRoute()`: down the drive, west along the road into town, a lap of the outer ring road with the traffic, back east, and round in front of the barn to park nose-out. You can see the top of his head through the roof while he's out; a minimap dot and headlights at night.
- Traffic brakes for him and he gives way to anyone not already waiting for him (same rule as the fire truck); Nico's car bumps into it. Speed 210 (traffic 250).
- `roundCorners` now clamps each corner's reach to half the shorter neighbouring run, so the tight turn-round in front of the barn doesn't fold over (the town loops' runs are all long, so they're unchanged).
- Tests: `test/fiat.test.ts` (stays on road/driveway, a full lap home, no stall in traffic); e2e: drives out into town.

### The grandparents out and about (2026-10-10)
- **Poppop and Nonna** go out together in the Fiat; Nonna rides in the passenger seat (grey curls through the roof).
  - The drive (`poppopRoute`) now also goes down the west road past the ring: it pulls in by Nico's bakery, turns round, then pulls in by Parts & Tools. Both stops are in `POPPOP_STOPS`; the dwell times are in `FIAT.dwell`.
  - At Parts & Tools they both go in, so their heads disappear. At the bakery Nonna gets out and drops off up to 2 pizzelle at $3 each, if there's room in the case. That's about $1.50 a minute at most, well under the income caps. The bakery stop only happens once Nico owns the bakery (`fiat.wants`).
- **Yia-Yia** is now a townie with her own routine. She paints in her studio for 80 s, out of sight (a new `inside` stop). Then she walks down the sidewalk to the beach and paints the sea for 45 s at a new easel prop (`face`: side-on to it), then walks back.
- **While they're out**, their room has a note on the counter instead of them, e.g. "Gone for a drive in the Fiat!" or "Gone to paint the sea at the beach!" (`away()` in `main.ts`).
- **New "ever seen" record:** `Biz.seen` (`page:id` -> count) remembers every storage/beach find, jewelry design made, recipe baked and painting painted. Those otherwise get sold or used up; the sticker book will read it.
- **Debug and tests:**
  - New debug hooks: `homeAll`, `yiayiaOut`, and `fiatGo(near?)`.
  - The e2e sends everyone home before the grandparent and bakery checks, so a pizzelle drop-off can't change the cookie counts. It adds checks for the pizzelle drop-off and Yia-Yia's note.

### Biscuit the dog (2026-10-10)
- **Adopting him:** a new world unlock, 'doghouse' ($30). It's a dashed outline in Nico's yard until bought; then a red doghouse with BISCUIT over the door slaps down and the dog comes with it.
- **How he behaves** (brain in `src/dog.ts`, pure and unit tested; art in `world/dog.ts`, a golden dog from the side with a red collar):
  - He heels beside Nico, sits when Nico stops, and lies down after 10 s.
  - He dashes to catch up, and pops back beside Nico if he's left far behind.
  - Kick the ball near him and he fetches it, carries it back in his mouth and drops it at Nico's feet. Then he does a happy spin.
  - "Pet Biscuit" makes him wag and woof, and gives Nico a little energy.
  - He waits out of sight while Nico is inside somewhere or driving.
  - Inside the house he's asleep at the foot of the bed.
  - Traffic stops for him and pigeons scatter.
  - The bark is synthesised (`sfx.bark`).
- **Fixed:** the house crashed when Nico walked in after earning Poppop's carved sign or metal star (`decorSpots` looked up a walk-up spot those wall pieces don't have). The new e2e caught it.
- **Debug:** `kickBall(vx, vy)`; `__game.dog`.

### Nico's City Pinball (2026-10-10)
- **What the user asked for:** "a real working pinball game... inside of Nico's house... when you walk up to it you can push play, and a pinball sized screen pops up complete with buttons for left and right flippers and a load ball."
- **The machine in the house:** stands against the wall between the couch and the kitchen (`HOME_FURNITURE.pinball`, `pinballArt`). Walking up to it offers "Play pinball".
- **The screen** (`pinball/view.ts`): a full-screen cabinet.
  - A dot-matrix score display on top: amber dots, words drawn 4x and averaged down so they stay readable.
  - The playfield under glass.
  - Big arcade buttons: left and right flippers, and LAUNCH. Hold LAUNCH to pull the plunger back (the ball sinks with it); a quick tap gives a varied normal launch.
  - Touching the left or right half of the glass also flips.
  - Keys: arrows, Z and /, Shift; space to launch; Esc to close.
  - Portrait puts the buttons in a row under the cabinet.
  - The town's ticker is paused while it's open.
- **The table** (`pinball/table.ts`):
  - Arched top, plunger lane with a one-way gate, N-I-C-O rollover lanes, three pop bumpers, the Burger Barn saucer, three F-I-R drop targets (flush to the wall), a spinner lane, two slingshots and two flippers.
  - Playfield art: night sky, moon, the city skyline with lit windows, and NICO'S CITY painted on.
- **Physics** (`pinball/physics.ts`, pure):
  - Substepped capsule collisions, so nothing tunnels.
  - Flippers are tapered capsules that give the ball their surface speed (ω × r).
  - Bumpers and slingshots kick; ball-to-ball collisions for multiball.
- **Rules** (`pinball/rules.ts`):
  - 3 balls and an 8 s ball save.
  - Lighting N-I-C-O raises the bonus multiplier (up to 5X); the flipper buttons rotate the lit lanes.
  - All three targets light the lock; the saucer then starts MULTIBALL.
  - End-of-ball bonus, an extra ball at 100,000, and ball search (a ball sitting still for 5 s gets a kick).
  - The high score is saved in `Biz.scores.pinball`.
  - Score popups float up from hits; the display between games explains the rules.
- **Found and fixed by simulation:**
  - The saucer re-caught its own eject forever (it now has a cooldown).
  - The ball wedged under the slingshots (they were raised) and behind the drop targets (moved flush, one-sided, with a deflector over the bank).
  - The ball could escape the enclosed drain (the left wall now runs to the bottom).
  - Every tap launched identically and fed the drain; the plunger range is now 1720-2350 plus a ±1.5% wobble.
- **Tests:**
  - `test/pinball.test.ts`: launches, cradle, flip shots, drain, no tunnelling under random flipping, and the rules.
  - A robot player runs for 3 minutes on three seeds, including multiball, and must never get stuck.
  - `test/pinball-targets.test.ts`.
  - e2e: walk up, PLAY, hold LAUNCH, flipper button, arrow key, close.

### Karate dojo and belts (2026-10-10)
- **The dojo:** "KARATE DOJO" on the open ground past the storage yard (x 4660, y 3300). Inside: a training mat, a 空手 scroll, the belt board, a bench, and a punching bag (a new drawn `bag` big thing).
- **Sensei:** a new look in `src/people.py`: white gi with a black belt, grey hair, barefoot. A new `top='gi'` draws the crossed lapels and the belt in all views.
- **The class** (`karate.ts`; screen `workshop.karate()`):
  - Sensei calls a combination (punch, kick, block; kiai from orange up). Nico watches, then does it back in order.
  - A miss means "Not quite. Watch again!"; three clean combinations earn the next belt.
  - Combinations are 3 + belt moves long and called a little faster each belt.
  - The belts: white, yellow, orange, green, blue, purple, brown, black.
- **The belt shows on Nico:** `PersonView.setBelt` draws it over the torso part in every view, with the knot and tails at the front. Nico's exported art is unchanged (hash `f7e1f80e...`). Friends Nico plays as don't wear it.
- **Save:** `Biz.belt` (-1 none; 0..7).
- **Moved:** a coin that sat under the new building.
- **Tests:** `test/karate.test.ts`; e2e takes a whole class, including a wrong move.

### Weather and seasons (2026-10-10)
- **Seasons** (`world/weather.ts`): turn every 3 in-game days (a day is 12 minutes), spring → summer → fall → winter. A new game starts in summer, with winter about 70 minutes of play away. Sleeping through the night counts as a new day. `Save.day` is kept only when > 0. A toast announces each new season.
- **Weather spells:** 80-200 s each, wet by season (summer 18%, spring/fall 40%, winter 55%: snow instead of rain).
- **Rain:**
  - Slanting streaks and splashes in screen space, a grey tint, and a soft rain hiss (muffled indoors).
  - Puddles fade in by the roads as the ground gets wet and dry out slowly. Walking through one splashes.
  - Everyone out in it, Nico included, puts up an umbrella (`umbrellaArt`).
- **Snow:**
  - Flakes drift down, and a blanket of snow settles over the ground (melts slowly in winter, fast after).
  - Footsteps crunch (the soft step set) and kick up a puff.
- **Winter:** strings of coloured lights along every house's eaves, glowing after dark, and a wreath on each door.
- **Fall:** leaves drift down when it isn't raining.
- **Debug:** `setWeather(kind, hold)`, `setSeason(name)`, `__game.weather`. The e2e holds the sky clear except for its own weather checks.

### No more emoji in the drawn world; a frame-rate check (2026-10-10)
- **New drawn icons** (`world/icons.ts`) for every storage and beach find: radio, oil lamp, chair, suitcase, skateboard, guitar, console, trophy, socks, newspapers, bucket, bottle, old key, watch, pirate coin, ring, axle, metal detector, camera, shell. Also Burger Barn's burger, fries and shake, and a gi. `ITEM_ICON` maps every item id to one.
- **Now drawn as icons instead of emoji:**
  - the finds in a storage unit (`findArt`) and the shed shelves;
  - the tray at Burger Barn and its menu board;
  - what you can see under each storage door;
  - the minimap's place markers (plus the dojo, Yia-Yia's studio and the woodshop).
- **Text changes:**
  - Locked storage doors say LOCKED.
  - Buy outlines drop the emoji from their labels (the buttons keep theirs).
  - The big map's legend is words.
- **Frame rate** (WebKit on the Mac, 2x): a steady 60 fps in all of these: town by day, clear and in rain; the forest at night, clear and in snow; and town on a winter night with the holiday lights. Still to check on the real iPad: `?debug` shows the fps.

### Nico's sticker book (2026-10-10)
- **Where:** a 📖 button next to the backpack opens the book.
- **Pages** (`book.ts`), each paying a one-off reward when it's full:

  | Page | Contents | Reward |
  |---|---|---|
  | On the beach | 6 shells and 5 dug-up treasures | $15 |
  | Animal photos | 7 animals, with their stars | $20 |
  | Storage treasures | 15 finds | $30 |
  | Made by Nico | toys, jewelry, bakes | $25 |
  | With the family | Nonna's pasta, pizzelle, the birdhouse, the sign, the star, a painting | $20 |
  | Karate belts | 8 belts | $40 |
  | Around town | the dog, pinball, a goal, a fire put out, rain, snow, the shop, the bakery | $20 |

  64 stickers in all.
- **Stickers** are the game's own drawings, extracted to images once each (`stickerArt`): icons, the animals, the beach shells, a tied belt. Empty slots are dashed outlines, and tapping one says where to look.
- **"📖 New sticker: …!"** pops up (and the button wiggles) whenever one is earned. It waits until the current message has gone.
- **Built on `Biz.seen`,** so things that are sold or used up still count.
- **New records:** Nonna's pasta, a goal, a fire put out nearby, being out in rain or snow, playing pinball.
- **New icons:** a seagull and a crab.
- **Tests:** `test/book.test.ts` (every icon sticker has real art). E2e: open the book, collect a full page once, read a hint.
- **Change (the user, 2026-10-11):** "The belt should only be on in the dojo." Nico now wears his belt only while he's inside the dojo (`wearBelt` in the loop); it comes off when he leaves. E2e checks both.
- **Easier karate (2026-10-11):** Nico found it "a little too hard" and was stuck around brown belt. The brown-belt test was 9 moves at 0.49 s each.
  - **Combinations:** now a move longer only every other belt: 3, 3, 4, 4, 5, 5, 6, 6 (was 3 to 10).
  - **Calling speed:** Sensei never calls faster than 0.62 s a move.
  - **After a miss:** Sensei shows the same combination again 35% slower.

### Litchfield Tang Soo Do: Nico's real school and instructors (2026-10-11)
- The user shared the school's emblem and photos of the instructors (reference only, not in the repo): "I'd like them all worked in... make sure that they look like them."
- **The school:**
  - The dojo is now LITCHFIELD TANG SOO DO. The building has a navy roof, a white sign and the school's emblem over the door.
  - The emblem is redrawn as vector art (`world/emblem.ts`): a red-edged navy ring with the name and 당수도, and the red and blue swirl round a red-and-blue centre. It was compared side by side with the original until it matched.
  - Inside: blue mats with a red sparring ring, a big emblem on the back wall, a 당수도 scroll, the belt board and the bag.
- **The instructors** (`src/people.py`, compared with the photos in several passes):
  - **Mr. Master Krantz** runs the class: salt-and-pepper hair swept back and receding, black rectangular glasses, a white goatee.
  - **Mrs. Master Krantz:** honey-blonde hair from a centre part, with a long braid over her shoulder.
  - **Master Schindewolf** (by the bag): shaved head with a short grey band round the sides, round wire glasses, a trimmed grey-brown beard.
  - **Erin:** dark-blonde hair with a side part and streaks, a ponytail, tortoiseshell frames (the user: "turtle frames"), and a navy shirt under her dobok. Her face is longer and narrower (a new `head=(rx, ry)` oval, which squeezes hair and ears to fit).
  - Everyone wears a Tang Soo Do dobok: white, with a wide black collar band, black cuffs, the school patch and Korean lettering, and bare feet. The masters' belts are black with a red stripe; Erin's is plain black.
  - Each instructor has their own lines to say.
- **Nico wears his whites in the dojo:** a new `nicodobok` look with his own hair and face copied from `rig.py`, swapped in on entering and out on leaving, with his rank's belt drawn over it (white until he earns one). His usual art is unchanged.
- **The class:** Mr. Master Krantz teaches it (was "Sensei"). The shout is "Kihap!" (Tang Soo Do's word, not "Kiai").
- **Glasses for everyone:** see-through lenses (the user: "I would like to be able to see eyes behind glasses"). Poppop, Nonna, Yia-Yia and the townspeople with glasses were re-exported.
- **Still to confirm:** the belt colours are still the generic eight (white to black). If Litchfield uses different ones, it's a one-line change in `karate.ts`.
- **Fixed (the user):** "Mr master Krantz side view is a little weird. The mouth shouldn't go outside the goatee." The side-view goatee now covers the whole curve of the mouth, and a shorter smile is drawn inside it.
