# Game plan

This builds on `docs/GAMEPLAY_HANDOFF.md`. **Decided** means Matthew or Nico decided it on 2026-10-09. Everything else is a recommendation that can change.

## Decided
- **Audience:** Nico, 12+. Normal reading level, real choices, visible numbers. He's used to complex games: give him real interactivity, real choices and skills he builds up and reuses, without a thousand things to track.
- **Characters:** the 2D SVG sticker rig (`src/rig.py`) in the signed-off style, now drawn to look like Nico (ponytail approved). Blender is not used.
- **Controls:** walking and driving work like *Sneaky Sasquatch* (Nico's request). The camera looks down at an angle and follows him. A thumbstick moves him, and action buttons appear when he's next to something he can use.
- **World:** it should feel big, explorable and alive, with people and traffic. It also needs delightful side spots: a playground he can play on, a fast-food place for lunch, schools, hospitals, and a fire truck that sometimes drives around.
- **First build:** smaller than handoff §12. Get the feel right first, then add the business loop. The first product is a **toy car**.

## Built to change
The handoff isn't a complete list, and it isn't fixed. Nico will change his mind as the game takes shape, and that's expected. So the code should make changes cheap:
- **Content is data.** Products, parts, hustles, places, prices and text live in data files.
- **Minigames are plug-ins.** Each one is a separate module behind a single `start(ctx) → result` interface.
- **Saves are versioned.** When the data changes, old saves are migrated, so changing direction never wipes his progress.
- Every change of direction gets a line in `docs/CHANGES.md` saying what changed and why.

## Milestones
### v0: "Nico on the street" (now)
This is the thinnest version that tests the two biggest risks: **control feel** and **the live sticker look in Safari on the iPad**.
- Nico walks around a scrolling neighborhood bigger than the screen. Controls are a floating thumbstick (touch the left half of the screen) or WASD/arrow keys.
- He faces his direction of travel using the rig's side, front and back views.
- He is drawn live from the rig's parts with the sticker outline and shadow.
- A few cars drive themselves around the roads, and things lower on screen draw in front.
- There's an FPS counter, plus a debug button that adds more walkers to find the iPad's performance limit.
- **Done when:** it opens on the iPad over Wi-Fi, Nico says it feels right, and it holds a steady frame rate.

### v1: "Alive" (next)
- Get in and out of a car, and drive with the same thumbstick.
- The playground (play on it), a fast-food place (buy lunch, which introduces money), and the school and hospital as places.
- The fire truck leaves its station now and then.
- People walking around on their own routines.

### v2: the business loop
- Storage-unit flipping as the first hustle. The first unit is guaranteed to make a profit, and price and value ranges are shown before the player buys.
- Buy a workbench, then build the toy car prototype: drag the parts into place, then test it on a ramp.
- Sell the first car, then a shorter routine for repeat builds.
- The first unlockable skill, such as Appraiser.

Then workers, conveyors and more hustles (handoff §12 onward).

## Tech
- **`game/`**: Vite and TypeScript, with **PixiJS** (WebGL canvas) drawing the world. DOM is used only for the HUD, buttons, menus and the thumbstick.
- **Why not DOM/SVG for the world:** a busy city means dozens of moving things re-sorted by depth every frame, and the sticker outline is a costly SVG filter. Both are slow paths in Safari.
- **Art pipeline:** `src/gen.py` gains an export mode that rasterizes each rig part (and later buildings and props) at 2–3× **without** the sticker filter. It writes the images plus a JSON file of pivots and views into `game/public/art/`. The art is generated, never hand-made.
- **Rig:** the pose math is ported to TypeScript and runs live each frame. A parity test checks that the TypeScript port reproduces poses dumped from the Python rig.
- **Sticker outline:** applied live to the whole character, so part seams don't show.
  - *Plan B if the iPad can't keep up:* whole-body frames baked from the existing SVG scenes, sticker included.
- **State:** one game-state module, saved locally (IndexedDB) with a version number. Nothing runs while the game is closed (§13.6 is still open).
- **iPad:**
  - Landscape-first, `viewport-fit=cover`, no zooming (pinch or double-tap).
  - `touch-action: none` on the canvas, with pointer capture so a drag keeps steering.
  - Handles `devicePixelRatio` and rotation.
  - Sound starts after the first tap.
  - Can be added to the home screen later.
- **Testing on the iPad:** `npm run dev` serves to the local Wi-Fi, and you open the printed address on the iPad. Optional: bundle into a single HTML page published as a private link, so the Mac doesn't need to be running.
- **Tests:** Vitest for pose parity, input math and game rules. Playwright (WebKit, emulated iPad with touch) to check what's on screen. The mutation-testing standard from the art track still applies.

## Still open
- The second hustle and when taxi and construction arrive.
- How time works: rent and wages (§13.6), and what failure costs (§13.7).
- How deep factory planning goes (§13.5).

## Nico's feedback on v1, 2026-10-09 (being worked through in this order)
1. Trees are solid, so you can't drive through them. The playground equipment doesn't look wrong when you walk behind it, and you can't walk through it.
2. **Scale:** buildings and the world are bigger, so Nico isn't as tall as the trees and houses. Cars grow too.
3. Sitting properly on the slide and the swing (the swing bar was on his lap), with the equipment spaced further apart.
4. **People he knows walking around town:** James (short brown hair with a side-swept fringe; navy hoodie or blue polo with khakis) and cousin Primo (younger and smaller; shoulder-length wavy light-brown hair worn loose; blue soccer jersey and camo cargo pants). The photos are reference only and never go in the repo, which is public.
5. **"8 directions":** he can already walk in any direction. The art only faces 4 ways (side, front, back), so this needs 3/4 front and 3/4 back views drawn in the rig. Waiting to confirm that's what he meant.

## Idea parking lot (wanted, not scheduled)
- **Customizing his house and his clothes** (Nico, longer term).
- **Karate class** (Nico does karate). A dojo in the city with a timing or sequence minigame. Belts earned there show up on his outfit and could unlock a reusable skill.
- **Hair down** as an alternative look.
