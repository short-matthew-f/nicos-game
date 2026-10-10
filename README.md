# Nico's game

A city game for Nico, played in the browser on his iPad.

**Play:** https://short-matthew-f.github.io/nicos-game/

- `game/` is the game itself: Vite, TypeScript and PixiJS. `cd game && npm install && npm run dev`
- `src/` holds the SVG sticker rig and the art export (`python3 src/export_game.py`).
- `docs/GAME_PLAN.md` is the plan, and `docs/CHANGES.md` is the decision log.

Every push to `main` runs the tests, builds `game/`, and publishes it to GitHub Pages.
