import { describe, it, expect } from 'vitest';
import { TOWNSFOLK, stepRoute, type Walk } from '../src/townsfolk';
import { SOLIDS, WORLD, ROAD_SEGS, roadRect } from '../src/world/map';
import { freeAt } from '../src/player';

// (the roads as built: they stop where they end, so the beach below the south road is fair game)
const onRoad = (x: number, y: number) => ROAD_SEGS.map(r => roadRect(r)).some(r => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.d);

describe('townsfolk', () => {
  for (const t of TOWNSFOLK) {
    it(`${t.name}'s route never walks through anything solid or along a road`, () => {
      for (let i = 0; i < t.route.length; i++) {
        const a = t.route[i], b = t.route[(i + 1) % t.route.length], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8);
        for (let k = 0; k <= n; k++) {
          const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n;
          expect(freeAt(x, y, SOLIDS, WORLD), `${t.name} leg ${i} at ${Math.round(x)},${Math.round(y)}`).toBe(true);
          expect(onRoad(x, y), `${t.name} on the road at ${Math.round(x)},${Math.round(y)}`).toBe(false);
        }
      }
    });
    it(`${t.name} goes round the whole route and starts again`, () => {
      const w: Walk = { i: 0, x: t.route[0].x, y: t.route[0].y, wait: 0, vx: 0, vy: 0 };
      const seen = new Set<number>();
      for (let s = 0; s < 600 && seen.size < t.route.length; s += 0.05) { stepRoute(t, w, 0.05); seen.add(w.i); }
      expect(seen.size).toBe(t.route.length);
    });
  }
});
