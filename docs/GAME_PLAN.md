# Game plan: first playable ("First Sale")

Status: draft for approval. It builds on `docs/GAMEPLAY_HANDOFF.md`. **Decided** means Matthew decided it on 2026-10-09. Everything else is a recommendation.

## Decided
- The audience is Nico, 12+. Normal reading level, real choices and visible numbers.
- Characters use the 2D SVG sticker rig (`src/rig.py`) in the signed-off style. Blender is not used.
- The first build is smaller than handoff §12: one hustle, one product and a first sale, playable on the iPad. After that it extends toward §12.
- The first product is a **toy car**.

## Built to change
The handoff isn't a complete list, and it isn't fixed. Nico will change his mind as the game takes shape, and that's expected. So the code should make changes cheap:
- **Content is data.** Products, parts, hustles, places, prices and text live in data files. A new product or a changed price is a data edit, not a code change.
- **Minigames are plug-ins.** Each one is a separate module behind the same `start(ctx) → result` interface. You can add, swap or retire one without touching the others.
- **Saves are versioned.** When the data changes, old saves are migrated, so changing direction never wipes his progress.
- Every change of direction gets a line in `docs/CHANGES.md` saying what changed and why, so we can always see how we got here.

## Slice 0 scope (recommended)
1. **The city as a tappable neighborhood map.** No free walking yet. It has four places: a storage yard, a parts supplier, Nico's garage workshop and a customer (a toy shop counter or a neighbor). Tapping a place shows Nico walking there (the rig's walk clip), then opens it.
2. **Hustle: storage-unit flipping.** I chose it over cleaning because it involves decisions that suit a 12+ player, and because a unit can contain toy-car parts (wheels, a spring motor). That links the hustle to the product as handoff §4 proposes. The flow is: look through the door gap at visible clues → see the price and an honest "could be worth $X–$Y" range → bid or pass → open the unit → sort the items into Sell, Keep or Scrap. The first unit is guaranteed to make a profit (handoff §5: no hidden loss in the opening).
3. **Equipment:** buy one tool from the supplier, a small workbench and drill, plus parts the player didn't find.
4. **Toy car prototype:** an assembly minigame where the player drags the body, axles and wheels into place, then tests the car by rolling it down a ramp. Distance and straightness give a quality score, and a bad test points to the part that caused it.
5. **First sale:** the customer buys the car and the price reflects its quality.
6. **Repeat production:** the second car uses a shorter build routine, as handoff §6 says. This ends the slice and leads into workers and conveyors (§12).

**Acceptance:** on an iPad, a new player can go from $0 to a sold toy car in about 15 minutes. Every price and payout shows on screen before the player commits. Progress survives closing Safari. Every place stays playable after the car is sold.

## Tech (recommended)
- **A `game/` folder in this repo**, built with Vite and TypeScript, with no UI framework. Rendering uses DOM and inline SVG, so the existing sticker art and its CSS animation work as they are.
- **Art pipeline:** the Python generators get a mode that exports reusable assets (Nico's clips, props and buildings) as SVG into `game/public/art/`. Art stays generated, never hand-edited.
- **State:** one game-state module holds cash, inventory, unlocks and designs, and every money change goes through it. Each minigame is its own module that receives that state and returns a result (`start(ctx) → result`). State is saved locally with IndexedDB; nothing runs while the game is closed (handoff §13.6 is still open).
- **iPad specifics:** touch and pointer events only, with 44pt+ targets and no hover. Pinch-zoom, double-tap zoom and pull-to-refresh are disabled. Sound only starts after the first tap. It can be added to the home screen (PWA manifest and offline cache) and is built landscape-first.
- **Hosting:** a static site, chosen later. Local testing on the iPad uses `vite --host` on the same Wi-Fi.
- **Tests:** Vitest checks economy and state rules. Playwright runs on WebKit with an emulated iPad (touch, 1180×820) and plays the slice end to end, checking what's on screen. The mutation-testing standard from the art track still applies.

## Still open (not blocking slice 0)
- The second hustle (cleaning, per §12) and when taxi and construction arrive.
- How time works: rent and wages (§13.6), and what failure costs (§13.7).
- How deep factory planning goes (§13.5). This matters at the worker/conveyor step, not before.

## Idea parking lot (wanted, not scheduled)
- **Karate class** (Nico does karate). It could be a dojo in the city with a timing or sequence minigame. Belts earned there would show up on his outfit and could unlock a reusable skill. It fits the "skills he builds and reuses" goal.
