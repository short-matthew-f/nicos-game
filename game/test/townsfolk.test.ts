import { describe, it, expect } from 'vitest';
import { TOWNSFOLK, stepRoute, type Walk } from '../src/townsfolk';
import { SOLIDS, WORLD, ROADS_X, ROADS_Y, ROAD_W } from '../src/world/map';
import { freeAt } from '../src/player';

const onRoad = (x: number, y: number) => ROADS_X.some(r => Math.abs(x - r) < ROAD_W / 2) || ROADS_Y.some(r => Math.abs(y - r) < ROAD_W / 2);

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
