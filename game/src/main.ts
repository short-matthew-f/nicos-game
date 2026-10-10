import { Application, Container } from 'pixi.js';
import { WORLD, SOLIDS, ROADS_X, ROADS_Y, PARKED_CAR } from './world/map';
import { drawGround, drawWorld } from './world/draw';
import { makeTraffic, leaders, carSprite, carCirclesOf } from './world/cars';
import { loadNicoArt, NicoView } from './rig/nico';
import { neutral, type PoseState } from './rig/pose';
import { Input } from './input/stick';
import { chooseView, moveCircle, freeAt, WALK_SPEED } from './player';
import { startUpdates, BUILD_ID } from './update';
import { load, save as writeSave, type Save } from './state';
import { steer, moveCar, carFits, circles, type CarState } from './drive';
import { ActionButton, nearest, type Spot } from './interact';

const VIEW_H = 800;          // world px visible top to bottom while walking (Nico ~ 1/6 of the screen)
const VIEW_H_DRIVE = 1050;   // ...and while driving: see further ahead
const AMP_RATE = 5;          // gait amplitude ramp (1/s)
const CADENCE = 1.5;         // gait phase per second at full speed (rig walk = 1)
const MY_CAR = { color: '#E0453A', stripe: '#FFFFFF' };   // Nico's car: red with a white stripe
const NICO_START = { x: ROADS_X[0] - 220, y: ROADS_Y[0] + 200 };

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

  // ---- the save: money, and where Nico and his car were (if that's still a valid spot)
  const saved: Save = load();
  const state = { money: saved.money };
  const nico = { x: NICO_START.x, y: NICO_START.y, st: neutral('front'), view: new NicoView() };
  if (saved.nico && freeAt(saved.nico.x, saved.nico.y, SOLIDS, WORLD)) { nico.x = saved.nico.x; nico.y = saved.nico.y; }
  layer.addChild(nico.view.root);

  const car: CarState = { ...PARKED_CAR, speed: 0 };
  if (saved.car && carFits(saved.car.x, saved.car.y, saved.car.h, SOLIDS, WORLD)) Object.assign(car, saved.car, { speed: 0 });
  const { view: carView, turn: turnCar } = carSprite(MY_CAR.color, false, MY_CAR.stripe);
  layer.addChild(carView);
  let mode: 'walk' | 'drive' = saved.driving ? 'drive' : 'walk';

  const persist = () => writeSave({ v: 1, money: state.money, nico: { x: nico.x, y: nico.y }, car: { x: car.x, y: car.y, h: car.h }, driving: mode === 'drive' });
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });
  setInterval(persist, 5000);

  const moneyEl = document.getElementById('money')!;
  const showMoney = () => { moneyEl.textContent = `$${state.money}`; };
  showMoney();

  // ---- getting in and out
  function getIn() { mode = 'drive'; nico.view.root.visible = false; persist(); }
  function getOut() {
    // step out on the driver's side if there's room, else the other side, front or back
    const fx = Math.cos(car.h), fy = Math.sin(car.h);
    const others = carCirclesOf(cars);
    for (const [ax, ay] of [[fy, -fx], [-fy, fx], [-fx, -fy], [fx, fy]]) {
      const d = ax * fx + ay * fy !== 0 ? 95 : 62;
      const x = car.x + ax * d, y = car.y + ay * d;
      if (freeAt(x, y, SOLIDS, WORLD) && others.every(([ox, oy, r]) => Math.hypot(x - ox, y - oy) > r + 16)) {
        nico.x = x; nico.y = y; car.speed = 0; mode = 'walk'; nico.view.root.visible = true;
        Object.assign(nico.st, neutral('front')); persist(); return;
      }
    }
    toast("No room to get out here");
  }
  nico.view.root.visible = mode === 'walk';

  const spots: Spot[] = [
    { id: 'car', x: 0, y: 0, r: 110, label: 'Get in', run: getIn, when: () => mode === 'walk' },
  ];
  const outSpot: Spot = { id: 'out', x: 0, y: 0, r: Infinity, label: 'Get out', run: getOut };
  const action = new ActionButton();

  const toastEl = document.getElementById('toast')!;
  let toastTimer = 0;
  function toast(msg: string) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toastEl.classList.remove('on'), 2200);
  }

  const walkers: Walker[] = [];
  // read by verify/*.py; place() and friends move things for tests
  const game: Record<string, unknown> = {
    place: (x: number, y: number) => { nico.x = x; nico.y = y; },
    placeCar: (x: number, y: number, h: number) => { Object.assign(car, { x, y, h, speed: 0 }); },
    // stand Nico d px ahead of car i, in its lane (for the car-stops check)
    inFrontOf: (i: number, d: number) => { const c = cars[i], [x, y] = c.pos, h = c.loop.heading(c.s); nico.x = x + Math.cos(h) * d; nico.y = y + Math.sin(h) * d; },
    act: () => { action.spot?.run(); },
  };
  (window as unknown as { __game: unknown }).__game = game;
  const updater = startUpdates(persist);
  document.getElementById('check-update')!.addEventListener('click', () => updater.check(true));
  Object.assign(game, { build: BUILD_ID, checkUpdate: () => updater.check(true) });
  const input = new Input(host);

  let zoom = 1, viewH = mode === 'drive' ? VIEW_H_DRIVE : VIEW_H;
  const applyZoom = () => {
    zoom = app.screen.height / viewH;
    world.scale.set(zoom);
    for (const n of [nico, ...walkers]) n.view.setZoom(zoom, resolution);
  };
  applyZoom();
  app.renderer.on('resize', applyZoom);

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
    if (Math.hypot(input.vx, input.vy) > 0) hint.style.opacity = '0';

    if (mode === 'walk') {
      const vx = input.vx * WALK_SPEED, vy = input.vy * WALK_SPEED;
      const sp = Math.hypot(input.vx, input.vy);
      [nico.x, nico.y] = moveCircle(nico.x, nico.y, vx * dt, vy * dt, SOLIDS, WORLD);
      Object.assign(nico.st, chooseView(vx, vy, nico.st));
      stepGait(nico.st, sp, vy, dt);
      nico.view.pose(nico.x, nico.y, nico.st);
    } else {
      const prevH = car.h;
      steer(car, input.vx, input.vy, dt);
      moveCar(car, prevH, dt, SOLIDS, WORLD, carCirclesOf(cars));
    }
    carView.position.set(car.x, car.y);
    turnCar(car.h);
    carView.zIndex = car.y + 22;

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

    // traffic brakes for Nico on foot, and for every part of his car
    const blockers: [number, number][] = circles(car.x, car.y, car.h).map(([x, y]) => [x, y]);
    if (mode === 'walk') blockers.push([nico.x, nico.y]);
    for (let i = 0; i < cars.length; i++) cars[i].update(dt, lead[i], blockers);

    // action button
    spots[0].x = car.x; spots[0].y = car.y;
    action.show(mode === 'drive' ? (car.speed < 40 ? outSpot : null) : nearest(spots, nico.x, nico.y));

    // camera follows Nico (or his car, looking ahead), clamped to the world; eases the zoom
    const wantH = mode === 'drive' ? VIEW_H_DRIVE : VIEW_H;
    if (Math.abs(viewH - wantH) > 0.5) { viewH += (wantH - viewH) * Math.min(1, dt * 3); applyZoom(); }
    const fx = mode === 'drive' ? car.x + Math.cos(car.h) * car.speed * 0.35 : nico.x;
    const fy = mode === 'drive' ? car.y + Math.sin(car.h) * car.speed * 0.35 : nico.y - 40;
    const vw = app.screen.width / zoom, vh = app.screen.height / zoom;
    const cx = Math.min(WORLD.w - vw / 2, Math.max(vw / 2, fx));
    const cy = Math.min(WORLD.h - vh / 2, Math.max(vh / 2, fy));
    world.position.set(app.screen.width / 2 - cx * zoom, app.screen.height / 2 - cy * zoom);

    const nb = nico.view.root.getBounds();
    Object.assign(game, {
      mode, money: state.money, action: action.spot ? action.spot.id : null,
      car: { x: car.x, y: car.y, h: car.h, speed: car.speed },
      nico: { art: nico.view.artLoaded(), x: nico.x, y: nico.y, view: nico.st.view, face: nico.st.face, amp: nico.st.amp,
              screen: { x: nb.x, y: nb.y, w: nb.width, h: nb.height } },
      cars: cars.map(c => ({ speed: c.speed, pos: c.pos, heading: c.loop.heading(c.s) })), fps, people: walkers.length + 1, zoom,
    });
  });
}

main();
