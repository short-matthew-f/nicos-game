import { describe, it, expect } from 'vitest';
import { JOBS, start, current, advance, target, wantJob, jobById, pickWant, wantReward, WANT_REASONS, WANTERS } from '../src/jobs';
import { item, sellPrice, lineup, freshBiz, add, take, owns } from '../src/business';
import { TOWNSFOLK } from '../src/townsfolk';
import { SOLIDS, WORLD } from '../src/world/map';
import { freeAt } from '../src/player';

describe('odd jobs', () => {
  it('every job is offered by someone in town and pays something', () => {
    for (const j of JOBS) {
      expect(TOWNSFOLK.some(t => t.who === j.giver), j.id).toBe(true);
      expect(j.reward).toBeGreaterThan(0);
    }
  });
  it('every place a job sends you is somewhere Nico can stand', () => {
    for (const j of JOBS) for (const s of j.steps) if (s.kind === 'go') {
      const spots = Array.isArray(s.at[0]) ? s.at as [number, number][] : [s.at as [number, number]];
      for (const [x, y] of spots) expect(freeAt(x, y, SOLIDS, WORLD), `${j.id} ${s.label} at ${x},${y}`).toBe(true);
    }
  });
  it('steps go in order and the last one finishes the job', () => {
    const j = JOBS.find(j => j.id === 'water')!, a = start(j);
    expect(current(a).kind).toBe('go');
    expect(target(a, [0, 0])).toEqual([130, 1915]);
    expect(advance(a)).toBe(false); expect(advance(a)).toBe(false); expect(advance(a)).toBe(false);
    expect(current(a).kind).toBe('return');
    expect(target(a, [5, 6])).toEqual([5, 6]);   // back to whoever asked
    expect(advance(a)).toBe(true);
  });
  it('a step with several possible places picks one when the job starts', () => {
    const j = JOBS.find(j => j.id === 'cat')!;
    const a = start(j, () => 0.99), b = start(j, () => 0);
    expect(a.at[0]).not.toEqual(b.at[0]);
  });
  it('a giver can walk to the meeting place from anywhere on their route without going through anything', () => {
    const seg = (a: [number, number], b: [number, number]) => Array.from({ length: 41 }, (_, i) => [a[0] + (b[0] - a[0]) * i / 40, a[1] + (b[1] - a[1]) * i / 40] as [number, number]);
    for (const j of JOBS) if (j.meet) {
      const route = TOWNSFOLK.find(t => t.who === j.giver)!.route;
      for (let i = 0; i < route.length; i++) for (const from of seg([route[i].x, route[i].y], [route[(i + 1) % route.length].x, route[(i + 1) % route.length].y])) {
        const legs: [number, number][] = [from, [j.meet[0][0], from[1]], ...j.meet];   // as main.ts walks it
        for (let k = 0; k + 1 < legs.length; k++) for (const [x, y] of seg(legs[k], legs[k + 1]))
          expect(freeAt(x, y, SOLIDS, WORLD), `${j.id}: from ${from} at ${x.toFixed(0)},${y.toFixed(0)}`).toBe(true);
      }
    }
  });
  it('item requests: for real things, from real people, paying more than the thing sells for (even for an appraiser)', () => {
    for (const id of Object.keys(WANT_REASONS)) {
      expect(item(id).kind, id).toBe('find');
      expect(wantReward(id), id).toBeGreaterThan(sellPrice(item(id).value[1], true));
    }
    for (const w of WANTERS) expect(TOWNSFOLK.some(t => t.who === w), w).toBe(true);
  });
  it('an item request can be rebuilt from its saved id; nonsense ids are not', () => {
    const j = wantJob('maya', 'radio');
    expect(jobById(j.id)).toEqual(j);
    expect(jobById('cat')!.id).toBe('cat');
    for (const bad of ['want:maya:spaceship', 'want:nobody:radio', 'want:maya:wheel', 'nope']) expect(jobById(bad), bad).toBeNull();
  });
  it('while someone wants a thing, every auction has one (a request never stalls on bad luck)', () => {
    for (const id of Object.keys(WANT_REASONS)) for (let seed = 1; seed < 60; seed++)
      for (const u of lineup(seed, false, id)) if (u.contents.some(c => c.id === id)) expect(u.peek[0], `${id} seed ${seed} shows`).toBe(id);
    for (const id of Object.keys(WANT_REASONS)) for (let seed = 1; seed < 60; seed++)
      expect(lineup(seed, false, id).some(u => u.contents.some(c => c.id === id)), `${id} seed ${seed}`).toBe(true);
  });
  it('handing a thing over takes the cheapest one kept', () => {
    const b = freshBiz(); b.finds.push({ id: 'radio', value: 9 }, { id: 'radio', value: 5 }); add(b, 'wheel');
    expect(owns(b, 'radio')).toBe(true);
    expect(take(b, 'radio')).toBe(true); expect(b.finds).toEqual([{ id: 'radio', value: 9 }]);
    expect(take(b, 'teddy')).toBe(false);
    expect(take(b, 'wheel')).toBe(true); expect(owns(b, 'wheel')).toBe(false);
  });
  it('picks someone free to ask', () => {
    const w = pickWant(() => 0.99, who => who !== 'james')!;
    expect(w.giver).toBe('james'); expect(WANT_REASONS[w.item]).toBeDefined();
    expect(pickWant(() => 0.5, () => true)).toBeNull();
  });
});
