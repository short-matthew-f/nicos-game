# Track B findings: Nico in Blender

## What actually ran

- **Blender 5.2.1 LTS** (`/opt/homebrew/bin/blender`), headless: `blender -b --factory-startup -P blender/build_nico.py -- --out out/blender`. The documented command without `--factory-startup` also works (verified), because the script resets to factory-empty itself. Its bundled Python is 3.13 (with numpy). `pip install bpy` was not tried because it needs a matching Python and the project venv is 3.14.
- **Render engine:** Workbench, FLAT lighting, MATERIAL colour, view transform Standard. Cavity, shadows, specular, DOF and Workbench's own object outline are all off. Film is transparent and the AA is 8 samples. Materials hold the palette hex converted from sRGB to linear in `diffuse_color`, so the PNGs come out with the exact hex values (the palette check confirms this). Eevee and Cycles were not needed.
- **Sticker edge:** a Pillow post-process (`blender/sticker_post.py`, run from the venv by the build script). It reproduces `Scene.filt` step by step: square dilate r=5, blur sd=3, alpha threshold `6a-1.6`, white fill, plus that mask blurred at sd=6, offset (5,9), navy at 22% and merged underneath. Every length is multiplied by 1.3 because the 2D scene draws Nico at scale 1.3. The mask is built at 2x supersampling so the 6.5 px dilate is exact.
- **Timings (M-series Mac):** the full build takes **about 44 s wall**. That covers model, rig, baking 4 clips, and rendering 345 frames at about 0.11 s/frame (38.5 s), plus the sticker post on 345 frames in parallel (4.4 s). The proof run (1 frame per view) takes about 3 s. `verify/verify_blender.py` takes about 2 s.
- **Outputs:** `out/blender/<clip>_<view>/fNNNN.png` holds the sticker frames, and `.../raw/` holds the flat Workbench renders. The rest of `out/blender/` is `bones.json` (armature-space bone matrices for every clip frame), `meta.json` (ground row, timings), `nico.blend` (saved in the neutral front-view state, with no face yaw and no far-limb shading; it is the rigged and animated scene with all clips on one timeline: idle 0-48, walk 100-117, putdown 200-244, pickup 300-341) and `*_spritesheet.png`. Clips:
  - walk (17 frames) in side, front, back and threequarter
  - idle (48 frames) in the same four views
  - putdown (44 frames) side
  - pickup (41 frames) side
- **Contact sheets:** `reference/blender_sheet.png`, plus `reference/blender_hull_rejected.png` (the inverted-hull experiment).

## Build summary

- **Model:** made only from primitives in bmesh: spheres, capsules, rounded boxes, a cylinder neck, and strokes built from small spheres for the smile and collar. Units are the 2D units from `build_walk` (hip at 58, shoulder at (2, 42 above the hip), head r=29 at (4, 144), box 40x34). The idle silhouette is **230 px** tall, against about 232 px for the 2D Nico.
- **Rig:** an armature with 13 bones: hips, spine, head, face, arm.L/R, thigh/shin/foot.L/R and prop. Each mesh part has one vertex group (weight 1) and an Armature modifier, which avoids bone-parent inverse-matrix problems. Pose math is plain Python using the same beats as `build_walk`: the 2D `c_`/`w_` ramps for pickup/putdown, lean 25° at full crouch, DC=30.745, arm hold -56°, the box released at 2D t=4.2 and grabbed at 13.3, and a 28° gait swing with arms at 0.85x. Legs use analytic 2-link IK so planted feet stay planted in the crouch, where the 2D version squashes the leg rectangles. All bones are keyframed every frame.
- **Clip timing mapping (for side-by-side with the SVG):** putdown frame f matches 2D `walk.svg` t = 3.3 + f/24 s. Pickup frame f matches t = 12.4 + f/24 s.

## Does it match the sticker style?

Mostly yes. From a normal viewing distance the frames read as the same character family: flat palette fills, the same white band (measured 8-9 px, identical to the 2D golden frames on straight edges), and the same soft down-right navy shadow. That last part is guaranteed, because it is the same filter chain.

Shortfalls and deliberate cheats:

1. **Face in profile.** With a real sphere head, the eye and mouth sit at the front silhouette in side view and nearly vanish. The 2D art cheats by drawing the face well inside the head circle. I copied the cheat: a `face` bone yaws the eye, mouth and cheek set -38° toward the camera in side view (-15° in three-quarter), and the far eye and cheek are hidden in side view. It works, but it is a per-view hack, which is the same kind of special-casing the 2D part-swap needs.
2. **Depth shading.** The 2D side view shades the far limbs darker (SK2/SL2/PANT2/shoe). A flat 3D render has one colour per object, so the script swaps the camera-far limb materials per view: side and three-quarter shade the left limbs, front and back shade none. This is another per-view rule.
3. **Hair.** Two bisected sphere caps (a crown band, and a back section with a sloped nape) approximate the 2D swoop. In front view the hair reads as a straight bowl-cut fringe, a little more "helmet" than the 2D art. A sculpted hair mesh would fix it, but that costs art time.
4. **Outline is whole-frame, not per-group.** The 2D scene filters Nico and the box as separate groups. Here the post-process runs on the whole frame alpha, so the carried box and Nico share one merged sticker. It looks fine and arguably better (no outline over the box edge), but it is different. A per-group edge would need render layers or one render per object.
5. **Front/back walk has little visible leg motion.** The in-place walk moves the feet along the depth axis, so from the front only the 7-unit foot lift, the arm swing and the bob show. It reads as marching in place. The 2D handoff spec (feet alternate lifting, arms foreshortened) gets the same result here for free, but the 2D version can exaggerate the lift and Blender would need a separate "front walk" pose set to do that.
6. **Walk period is 17 frames (0.708 s)** instead of 0.7 s, because 16.8 frames is not an integer at 24 fps. The walk is in place (no root motion) so it loops trivially. Ground travel is left to the engine or scene.
7. Small items:
   - The pocket sits on the front of the torso, so it is not visible in pure side view (the 2D side view draws it).
   - The light sole stripe flashes under the lifted foot in side view.

## Verification (`verify/verify_blender.py`)

Result on `out/blender`: **`42 checks passed, 0 failed`**. The script uses Pillow only. Checks:

- **Palette:** shirt, pants, skin and hair (neck skin on the back view) each cover at least 60 px within ±3 of the hex on a mid-stride walk frame, in 4 views. At least 88% of opaque pixels are exact palette colours. The real value is about 91-93%, and the rest are anti-aliased edges.
- **Transparent background:** the 4 corner pixels have alpha 0 on all 345 frames.
- **Outline:** the median perpendicular width of the white band is 5-9 px for walk and idle in side, front and back. The doc's guess of 5-8 was widened to 9 because the faithful SVG filter at scale 1.3 measures 8-9 px. The 2D golden frames measure the same: about 8 px clearly white on straight edges, with the identical method counting pixels ≥245.
- **Size:** idle silhouette height in side, front and back differs by less than 3% (230/230/230 px).
- **Feet planted:** the lowest opaque row of the raw frames is within 7 px of ground row 392 for every frame of every clip. This uses the raw frames because the sticker band and shadow sit below the feet.
- **Loop seam** (walk, idle) uses the bone matrices from Blender:
  - the pose at frame N equals frame 0 (difference under 0.001)
  - the step from frame N-1 to frame 0 is no larger than 1.25x the biggest in-cycle step, so there is no hitch and no duplicated frame

### Mutation evidence

Each mutation is a `--mutate NAME` flag in `build_nico.py`, rendered into a scratch dir and then run through `verify_blender.py --dir`. All of them went red:

| mutation | what it breaks | red lines (first) |
|---|---|---|
| `lit` | Workbench STUDIO lighting | `walk_side: shirt #5B8FD6 covers 0 px (need >=60 within +-3)`; `walk_side: 30.9% of opaque pixels are exact palette colours (need >=88%...)` |
| `agx` | AgX view transform instead of Standard | `walk_side: shirt #5B8FD6 covers 0 px`; `31.4% of opaque pixels are exact palette colours` |
| `wrong_shirt` | shirt hex #6B9FE6 | `walk_side: shirt #5B8FD6 covers 10 px`; `82.3% of opaque pixels are exact palette colours` |
| `film_opaque` | opaque film + a World | `corner pixels alpha 0 on all 54 sticker frames; non-zero at ['idle_back/f0000.png@0,0', ...]` |
| `outline_r` | dilate r=2 | `walk_side: white sticker band median 4.1px over 65 edge samples (need 5..9)` |
| `outline_wide` | dilate r=8 | `walk_side: white sticker band median 13.4px over 73 edge samples (need 5..9)` |
| `view_scale` | front camera 5% closer | `idle silhouette heights {'side': 230, 'front': 243, 'back': 230} differ by 5.3% (need <3%)` |
| `hip_offset` | hips +10 units (feet float) | `walk_side: lowest opaque row strays 13.0px from ground row 392 (worst f0000.png; need <=7)` |
| `loop_shift` | walk baked with a 16-frame period, looped at 17 | `walk: pose at frame 17 vs frame 0 differs by 7.6537 (need <0.001)`; `walk: seam step 0.000 vs largest in-cycle step 7.654` |

The first `film_opaque` attempt (only `film_transparent=False`) stayed green. With no World datablock, Workbench still wrote alpha 0. The mutation now also adds a World, and with that it goes red. In practice this means that in this setup transparency does not depend on the film flag alone.

## Rejected approaches and corrections

- **Inverted-hull outline: tried, rejected** (`reference/blender_hull_rejected.png`). Setup: a Solidify modifier with flipped normals, 5 units thick, white material, Workbench backface culling. Problems:
  - It outlines every part separately, which draws white rings around the eyes, mouth, collar and hairline, and white seams where an arm crosses the torso.
  - Thin features get speckled.
  - It gives no soft shadow.

  The 2D look is a single silhouette outline, so post-processing the alpha is the right model.
- **Compositor: not used.** Blender 5's compositor moved to node groups, so node and socket names would be guesswork. A Pillow port of the SVG chain is exact primitive for primitive, deterministic, and testable. The cost is a second step, which the build script runs automatically.
- **Freestyle: not tried.** It draws line strokes, not a filled offset band, and has the same internal-line problem as the hull.
- **Hair by deleting UV-sphere vertices below a plane: rejected.** It gave a staircase hairline. Bisecting the mesh with a plane gives a clean edge. One sloped plane covered the eye in side view, so it was replaced by two caps (a crown band above +7, and a back section with a sloped nape).
- **Eyes as spheres flattened along world X: rejected.** They disappeared in side view. Eyes are now plain spheres, and the per-view face yaw handles visibility.
- **Outline check range 5-8 px: corrected to 5-9 px.** The 2D reference itself measures 8-9 px.
- **Palette threshold 93% exact pixels: lowered to 88%.** Anti-aliased edges are about 7-9% of opaque pixels in a correct render. Lit and AgX renders score about 31%, so the margin is still large.
- **Horizontal-scan outline measure: replaced** by the perpendicular distance to the flat render, because horizontal scans overestimate on slanted edges (they gave 13-20 px on the head curve).
- **Walk period 0.7 s:** changed to 17 frames at 24 fps (0.708 s).
- **No `pip install bpy`:** its Python version does not match the 3.14 venv, and Blender's bundled 3.13 already covers it.

## Effort estimate

| task | first character (this one) | second character |
|---|---|---|
| model from primitives + palette | ~1.5 h | ~1 h (reuse builders and palette code) |
| rig + clip pose math (walk/idle/pickup/putdown) | ~1.5 h | ~0.5 h (same skeleton and pose functions, retuned proportions) |
| look (Workbench + sticker post) | ~1 h, done once | 0 |
| per-view art cheats (face yaw, far-limb shading, hair) | ~1 h | ~0.5-1 h |
| verify + mutation tests | ~1 h, done once | ~0.1 h (point at the new dir) |
| render | under 1 min per full set | under 1 min |

This is roughly **5-6 h for the first character and about 2-3 h for a second similar biped**. A non-biped or a different silhouette (the robot, for example) needs a new skeleton, about 2 h more. New angles and clips are where Blender wins: a new view is one camera line, and a new clip is one pose function rendered from every view.

## Cost: file sizes and spritesheets

- **2D SVGs (whole animated scenes including background):**
  - `walk.svg` 193 KB
  - `walk3d.svg` (Track A, as of this run) 162 KB
  - `factory.svg` 82 KB
  - `taxi.svg` 15 KB

  These are resolution-independent.
- **Blender PNG frames (800x460 RGBA, character only):** about 26-28 KB per frame. One walk cycle in one view is about 460 KB. All 345 sticker frames total **9.3 MB**, and the raw intermediates add 21.7 MB more (deletable).
- **Spritesheets** (`blender/spritesheet.py`, a shared crop box per clip):
  - walk side: 17 cells of 143x276 in 212 KB
  - walk front: 170 KB
  - walk back: 156 KB
  - putdown: 44 cells of 180x281 in 547 KB

  That is about 2.2x smaller than loose frames. Feasible and engine-friendly, since each sheet comes with a fixed cell and origin printed as JSON. Half-resolution or palette-quantised PNG (the art has about 25 colours plus AA) would shrink them a lot more. Not tried.
- **Rule of thumb:** a single Blender view-clip at 1x is already about 1-3x the size of the entire animated 2D walk scene. It is also fixed-resolution, so 2x displays would need about 4x the bytes.

## Recommendation (options; your call)

1. **Stay 2D (Track A part-swap).**
   - Pros: smallest files, crisp at any scale, one CSS/SVG toolchain, and the face/shading cheats come naturally.
   - Cons: every new view or clip is hand-drawn art plus pose math per view, and three-quarter views are expensive.
2. **Go Blender.**
   - Pros: new angles (three-quarter, any yaw) and new clips are nearly free, IK keeps feet planted in crouches, and renders are fast and reproducible.
   - Cons: PNG/spritesheet weight, fixed resolution, and it still needs per-view cheats (face yaw, far-limb shading) to look like the 2D art. The face in profile is the weakest point.
3. **Hybrid (my lean).** Keep 2D SVG for the side view, which is the signed-off look and the most common shot. Use Blender spritesheets for toward/away and three-quarter shots, and for anything needing many angles (turns, crowd characters). The sticker filter is identical, so the two sit together without a visible seam. The one mismatch to watch is face detail in profile, and the hybrid avoids it by never using Blender for profile.

If going hybrid, the next steps are:

- a half-res/quantised spritesheet export
- a turn clip (yaw 0→90° over about 8 frames, using the same rig) to replace the squash-and-swap
- a 2-3 frame A/B in the actual game engine to check the PNG edge against the SVG edge at the shipped scale
