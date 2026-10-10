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
### v0: "Nico on the street" (done)
This is the thinnest version that tests the two biggest risks: **control feel** and **the live sticker look in Safari on the iPad**.
- Nico walks around a scrolling neighborhood bigger than the screen. Controls are a floating thumbstick (touch the left half of the screen) or WASD/arrow keys.
- He faces his direction of travel using the rig's side, front and back views.
- He is drawn live from the rig's parts with the sticker outline and shadow.
- A few cars drive themselves around the roads, and things lower on screen draw in front.
- There's an FPS counter, plus a debug button that adds more walkers to find the iPad's performance limit.
- **Done when:** it opens on the iPad over Wi-Fi, Nico says it feels right, and it holds a steady frame rate.

### v1: "Alive" (done, 2026-10-09, plus extras from the overnight build)
- **Driving:** Nico's red car, Sasquatch-style steering, reverse when stuck, and traffic that squeezes past a car parked in its way.
- **Places:** Burger Barn and the ice cream shop sell lunch and treats (a speed boost). The school, hospital, shops and home each have a door and a line of text.
- **Playground:** a slide and swings (sitting properly; the swings are shared with Primo). There's also a park with a pond, ducks, a fountain and benches to sit on.
- **Fire truck:** the alarm, lights and siren, and fire calls. A building catches fire, and the truck drives there and sprays it out.
- **People:** James and Primo, plus six townspeople on routines. You can say hi to anyone. Five of them offer odd jobs that pay $3–6.
- **More life:** the school bus with its stops, pigeons, cloud shadows, hidden coins, a soccer field with goals, sounds with a mute button, rooftop landmarks, and a minimap plus a big map.
- **Nico's feedback, all done:** 8-direction facing (3/4 views for everyone), a mid-size town with tall buildings, solid trees, the playground behind-walk fix, sitting poses.

### v2: the business loop (built 2026-10-10)
- **Storage units:** an auction of three, each with a peek inside, the price and a value guess. The first unit is guaranteed to make a profit. Two taps to buy. Open the boxes, then choose Sell or Keep for each.
- **Building:** buy a workbench and parts at Parts & Tools. Build the toy car by dragging parts onto a plan, then test it on a ramp (Low falls short; Medium and High pass).
- **Selling:** sell the car at the Toy Shop ($40 for the first, then $30). Sold cars appear in its window. After the first, building another is three quick taps.
- **Appraiser:** the first skill, unlocked on the third unit.
- **Goal chip:** shows one step at a time, with a minimap star.
- Prices and rules are in `src/business.ts`, and the UX rules are in `docs/UX_NOTES.md`.

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

## Waiting on
- Nico playing v2. Use the playtest list at the end of `docs/UX_NOTES.md`.
- The iPad report: frame rate (lite mode switches on by itself below 45 fps), how the stick feels, and Nico's reactions to the overnight build.

## Idea parking lot (wanted, not scheduled)
- **Customizing his house and his clothes** (Nico, longer term).
- **Karate class** (Nico does karate). A dojo in the city with a timing or sequence minigame. Belts earned there show up on his outfit and could unlock a reusable skill.
- **Hair down** as an alternative look.
