# Track B: Nico in Blender (evaluation)

Purpose: let me **see** what a 3D-rigged Nico looks like in the sticker style, and compare it with the 2D part-swap approach in `HANDOFF.md` section 5. This is an evaluation, not a replacement. Do Track A (2D) first or in parallel; don't block it on this.

Status: **untested**. I (the claude.ai session that wrote this) never ran Blender. Everything below is a plan, not a result. Report what actually worked.

## Goal

A low-poly Nico, rigged once, rendered headless from side, front, back and three-quarter views with the same look as `reference/style-reference.png`: flat color, white sticker outline, soft down-right shadow, transparent background. Output PNG frame sequences and a contact sheet so I can compare against the SVG version.

## Setup

- Blender 4.x installed locally, run headless: `blender -b -P blender/build_nico.py -- --out out/blender`.
- Alternative: `pip install bpy` (needs the matching Python version for that bpy release). Pick whichever installs cleanly and say which.
- Everything scripted, no manual GUI steps, so the result is reproducible.

## Build

1. **Model:** capsules, spheres and rounded boxes only (head, hair cap, torso, two arms, two legs, shoes, small box prop). Proportions from `src/gen.py` (`build_walk`): about 175 units tall, head radius about 29, shoulders at hip+42. Colors from the palette in HANDOFF.md section 2.
2. **Rig:** simple armature (hips, spine, head, shoulders, elbows, hips-to-knee-to-foot). IK on the legs or arms only if it earns its keep.
3. **Clips:** `idle`, `walk` (loopable), `pickup`, `putdown`, same beats as the 2D scene.
4. **Look:**
   - Flat shading: emission or shadeless materials with the exact palette hex values, no lighting variation, no gradients.
   - White outline: inverted-hull (duplicate, flip normals, scale slightly, white emission) so the outline width stays about 6 px at the output resolution. Try Freestyle only if the hull looks wrong.
   - Soft shadow: shadow-catcher plane or a blurred, offset copy of the alpha channel in the compositor (down-right, about 20% navy, like the SVG filter).
   - Orthographic camera; transparent background; 800x460 canvas to match the SVGs.
5. **Render:** 24 fps walk cycles from four camera angles (side, front, back, three-quarter), plus the pickup/putdown from side. PNG sequences under `out/blender/<clip>_<view>/`.

## Verification (behavior, scripted)

Add `verify/verify_blender.py`, runnable without a GUI. Assert what shows up in the rendered frames:

- **Palette:** sample pixels from shirt, pants, skin, hair on a mid-walk frame; each is within a small tolerance of the palette hex (proves flat shading, no lighting leak).
- **Transparent background:** corner pixels have alpha 0.
- **Outline:** the white band around the silhouette is 5 to 8 px wide at the side, front and back views (measure by walking inward from the silhouette edge).
- **Consistent size across views:** silhouette height varies by less than 3% between side, front and back on the idle pose.
- **Feet planted:** lowest opaque pixel row stays within 7 px of the ground line during walk cycles.
- **Walk loop is seamless:** the first and last frames of the cycle are a clean wrap (frame N+1 equals frame 0 by pose; check bone transforms, not just pixels).
- Verify each check can fail by breaking what it guards (for example swap one material to a lit shader and confirm the palette check goes red).

## Compare (the actual deliverable)

Produce `reference/blender_vs_2d.png`: one sheet, same moments in each column (walk side, walk toward camera, walk away, putdown), 2D SVG frames on the left and Blender frames on the right. Then a short `docs/BLENDER_FINDINGS.md`:

- Does it match the sticker style? Where does it fall short (outline corners, shadow softness, face detail)?
- Effort estimate: hours to model/rig/render one character, and for a second character.
- Cost: file sizes (PNG sequences vs SVG), and whether the frames could be packed as spritesheets for a game engine.
- Recommendation with brief reasoning: stay 2D, go Blender, or hybrid (Blender for toward/away views, 2D SVG for side). Show options; I'll decide.

## Out of scope

Facial animation, cloth/hair physics, realistic lighting, anything that makes it look less flat.
