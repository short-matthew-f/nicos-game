import { Application, Container } from 'pixi.js';
import { WORLD, SOLIDS, ROADS_X, ROADS_Y } from './world/map';
import { drawGround, drawWorld } from './world/draw';
import { makeTraffic, leaders } from './world/cars';
import { loadNicoArt, NicoView } from './rig/nico';
import { neutral, type PoseState } from './rig/pose';
import { Input } from './input/stick';
import { chooseView, moveCircle, WALK_SPEED } from './player';
import { startUpdates, BUILD_ID } from './update';

const VIEW_H = 800;          // world px visible top to bottom (Nico ~ 1/6 of the screen)
const AMP_RATE = 5;          // gait amplitude ramp (1/s)
const CADENCE = 1.5;         // gait phase per second at full speed (rig walk = 1)

interface Walker { x: number; y: number; st: PoseState; view: NicoView; vx: number; vy: number; t: number }

async function main() {
  // stop iOS page gestures (pinch zoom, double-tap zoom, rubber-banding)
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick'])
    document.addEventListener(ev, e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

  const host = document.getElementById('game')!;
  const app = new Application();
  const resolution = Math.min(window.devicePixelRatio || 1, 2);
  await app.init({ resizeTo: host, background: '#B9DA9C', antialias: true, resolution, autoDensity: true, preference: 'webgl' });
  host.appendChild(app.canvas);
  await loadNicoArt();

  const world = new Container();
  const layer = new Container(); layer.sortableChildren = true;
  world.addChild(drawGround(), layer);
  app.stage.addChild(world);
  drawWorld(layer);

  const cars = makeTraffic(3);
  for (const c of cars) layer.addChild(c.view);
  const lead = leaders(cars);

  const nico = { x: ROADS_X[0] - 220, y: ROADS_Y[0] + 200, st: neutral('front'), view: new NicoView() };
  layer.addChild(nico.view.root);

  const walkers: Walker[] = [];
  // read by verify/game_e2e.py; place() moves Nico for tests
  const game: Record<string, unknown> = {
    place: (x: number, y: number) => { nico.x = x; nico.y = y; },
    // stand Nico d px ahead of car i, in its lane (for the car-stops check)
    inFrontOf: (i: number, d: number) => { const c = cars[i], [x, y] = c.pos, h = c.loop.heading(c.s); nico.x = x + Math.cos(h) * d; nico.y = y + Math.sin(h) * d; },
  };
  (window as unknown as { __game: unknown }).__game = game;
  const updater = startUpdates(() => { /* nothing to save yet */ });
  document.getElementById('check-update')!.addEventListener('click', () => updater.check(true));
  Object.assign(game, { build: BUILD_ID, checkUpdate: () => updater.check(true) });
  const input = new Input(host);
  let zoom = 1;
  const onResize = () => {
    zoom = app.screen.height / VIEW_H;
    world.scale.set(zoom);
    for (const n of [nico, ...walkers]) n.view.setZoom(zoom, resolution);
  };
  onResize();
  app.renderer.on('resize', onResize);

  function stepGait(st: PoseState, speed01: number, vy: number, dt: number) {
    const target = Math.min(1, speed01 * 1.6);
    st.amp += Math.max(-AMP_RATE * dt, Math.min(AMP_RATE * dt, target - st.amp));
    const rate = CADENCE * Math.max(speed01, st.amp > 0.01 ? 0.35 : 0);
    st.phase += rate * dt;
    // front/back: planted foot cancels the body's screen-y motion (rig units per phase)
    st.stride_y = rate > 0 ? (vy / rate) / 0.75 : 0;
    if (st.amp < 0.01 && speed01 === 0) { st.amp = 0; st.phase = 0; }
  }

  function addWalkers(n: number) {
    for (let i = 0; i < n; i++) {
      const view = new NicoView();
      const w: Walker = { x: 0, y: 0, st: neutral('side'), view, vx: 0, vy: 0, t: 0 };
      // start on a sidewalk
      const horiz = Math.random() < 0.5;
      if (horiz) { w.x = 100 + Math.random() * (WORLD.w - 200); w.y = ROADS_Y[Math.random() < 0.5 ? 0 : 1] + (Math.random() < 0.5 ? -98 : 98); }
      else { w.y = 100 + Math.random() * (WORLD.h - 200); w.x = ROADS_X[Math.random() < 0.5 ? 0 : 1] + (Math.random() < 0.5 ? -98 : 98); }
      view.setZoom(zoom, resolution);
      layer.addChild(view.root);
      walkers.push(w);
    }
    updateCount();
  }
  function clearWalkers() { for (const w of walkers) { w.view.root.destroy({ children: true }); } walkers.length = 0; updateCount(); }
  const peopleEl = document.getElementById('people')!;
  function updateCount() { const n = walkers.length + 1; peopleEl.textContent = `${n} ${n === 1 ? 'person' : 'people'}`; }
  document.getElementById('more')!.addEventListener('click', () => addWalkers(10));
  document.getElementById('fewer')!.addEventListener('click', clearWalkers);
  const hint = document.getElementById('hint')!;

  const fpsEl = document.getElementById('fps')!;
  let fpsAcc = 0, fpsN = 0, fps = 0;

  app.ticker.add(t => {
    const dt = Math.min(t.deltaMS / 1000, 0.05);
    fpsAcc += t.deltaMS; fpsN++;
    if (fpsAcc > 500) { fps = Math.round(1000 * fpsN / fpsAcc); fpsEl.textContent = `${fps} fps`; fpsAcc = 0; fpsN = 0; }

    // Nico
    const vx = input.vx * WALK_SPEED, vy = input.vy * WALK_SPEED;
    const sp = Math.hypot(input.vx, input.vy);
    if (sp > 0) hint.style.opacity = '0';
    [nico.x, nico.y] = moveCircle(nico.x, nico.y, vx * dt, vy * dt, SOLIDS, WORLD);
    Object.assign(nico.st, chooseView(vx, vy, nico.st));
    stepGait(nico.st, sp, vy, dt);
    nico.view.pose(nico.x, nico.y, nico.st);

    // test walkers: wander along sidewalks, pick a new direction now and then
    for (const w of walkers) {
      w.t -= dt;
      if (w.t <= 0) {
        w.t = 1.5 + Math.random() * 3;
        const a = Math.floor(Math.random() * 5);
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]];
        [w.vx, w.vy] = dirs[a].map(v => v * WALK_SPEED * 0.5);
      }
      const [nx, ny] = moveCircle(w.x, w.y, w.vx * dt, w.vy * dt, SOLIDS, WORLD);
      if (nx === w.x && ny === w.y && (w.vx || w.vy)) w.t = 0;
      w.x = nx; w.y = ny;
      Object.assign(w.st, chooseView(w.vx, w.vy, w.st));
      stepGait(w.st, Math.hypot(w.vx, w.vy) / WALK_SPEED, w.vy, dt);
      w.view.pose(w.x, w.y, w.st);
    }

    for (let i = 0; i < cars.length; i++) cars[i].update(dt, lead[i], [nico.x, nico.y]);

    // camera follows Nico, clamped to the world
    const vw = app.screen.width / zoom, vh = app.screen.height / zoom;
    const cx = Math.min(WORLD.w - vw / 2, Math.max(vw / 2, nico.x));
    const cy = Math.min(WORLD.h - vh / 2, Math.max(vh / 2, nico.y - 40));
    world.position.set(app.screen.width / 2 - cx * zoom, app.screen.height / 2 - cy * zoom);

    const nb = nico.view.root.getBounds();
    Object.assign(game, {
      nico: { art: nico.view.artLoaded(), x: nico.x, y: nico.y, view: nico.st.view, face: nico.st.face, amp: nico.st.amp,
              screen: { x: nb.x, y: nb.y, w: nb.width, h: nb.height } },
      cars: cars.map(c => ({ speed: c.speed, pos: c.pos, heading: c.loop.heading(c.s) })), fps, people: walkers.length + 1, zoom,
    });
  });
}

main();
