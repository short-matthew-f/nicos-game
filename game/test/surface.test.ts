import { describe, it, expect } from 'vitest';
import { surfaceAt, roomSurface } from '../src/surface';
import { ROADS_X, ROADS_Y, PIER, LOTS, POOL } from '../src/world/map';
import { shoreY } from '../src/world/zones';

describe('what Nico walks on (for his footsteps)', () => {
  it('sidewalks and roads are concrete, the park is grass, the beach and sandpit are sand, the pier is wood', () => {
    expect(surfaceAt(1700, ROADS_Y[1] - 100)).toBe('concrete');                 // the sidewalk
    expect(surfaceAt(ROADS_X[0], 600)).toBe('concrete');                        // the road
    expect(surfaceAt(2100, 2050)).toBe('grass');                               // the park
    const pg = LOTS.find(l => l.id === 'playground')!; expect(surfaceAt(pg.x + 50, pg.y + 50)).toBe('sand');
    expect(surfaceAt(2300, shoreY(2300) - 100)).toBe('sand');                  // the beach
    expect(surfaceAt(PIER.x + PIER.w / 2, PIER.y + 200)).toBe('wood');
    expect(surfaceAt(POOL.x - 60, POOL.y + 100)).toBe('concrete');             // the pool deck
    expect(surfaceAt(6400, 700)).toBe('grass');                                // the forest floor
    expect(roomSurface('diner')).toBe('wood'); expect(roomSurface('unit')).toBe('concrete');
  });
});
