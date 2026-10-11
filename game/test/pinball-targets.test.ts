import { it, expect } from 'vitest';
import { Table } from '../src/pinball/physics';
import { TARGETS } from '../src/pinball/table';
it('pinball: a ball never comes to rest beside the drop targets, whichever are down', () => {
  for (const down of [[true, true, true], [false, true, true], [true, false, true], [true, true, false], [false, false, false]])
    for (let x = 30; x <= 80; x += 6) for (const y0 of [380, 420, 470, 520]) {
      const t = new Table(); t.targets = [...down]; const b = t.load(); b.inLane = false; Object.assign(b, { x, y: y0, vx: 0, vy: 0 });
      for (let k = 0; k < 240; k++) t.step(1 / 60);
      if (t.balls.length) expect(Math.hypot(b.vx, b.vy) > 5 || b.y > 600 || b.held > 0, `${down} from ${x},${y0}: rests at ${b.x.toFixed(0)},${b.y.toFixed(0)}`).toBe(true);
    }
  void TARGETS;
});
