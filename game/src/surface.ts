// What Nico is walking on, for the sound of his footsteps (sound.ts): sidewalk and road, grass and
// forest floor, sand, or wooden boards. Data only.
import { ROAD_SEGS, roadRect, LOTS, DRIVEWAYS, PIER } from './world/map';
import { onBeach } from './world/beach';

export type Surface = 'concrete' | 'grass' | 'sand' | 'wood';
const PAVED = new Set(['patio', 'carpark', 'yard', 'pooldeck', 'beachlot']);
const SANDY = new Set(['playground']);
const inside = (r: { x: number; y: number; w: number; d: number }, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.d;

export function surfaceAt(x: number, y: number): Surface {
  if (inside(PIER, x, y)) return 'wood';
  if (ROAD_SEGS.some(s => inside(roadRect(s, 50), x, y)) || DRIVEWAYS.some(d => inside(d, x, y))) return 'concrete';
  const lot = LOTS.find(l => inside(l, x, y));
  if (lot && PAVED.has(lot.id)) return 'concrete';
  if (lot && SANDY.has(lot.id)) return 'sand';
  if (onBeach(x, y)) return 'sand';
  return 'grass';
}
/** Indoors: wooden floors, except the concrete storage building. */
export const roomSurface = (kind: string): Surface => (kind === 'hall' || kind === 'unit' ? 'concrete' : 'wood');
