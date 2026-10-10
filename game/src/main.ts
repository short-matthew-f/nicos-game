import { Application, Container } from 'pixi.js';
import { WORLD, SOLIDS, ROADS_X, ROADS_Y, PARKED_CAR, BUILDINGS, SWINGS, PROPS, doorOf } from './world/map';
import { drawGround, drawWorld } from './world/draw';
import { makeTraffic, leaders, carSprite, carCirclesOf } from './world/cars';
import { FireTruck, TRUCK } from './world/firetruck';
import { Siren } from './sound';
import { Minimap } from './minimap';
import { loadArt, PersonView } from './rig/person';
import { neutral, type PoseState } from './rig/pose';
import { Input } from './input/stick';
import { chooseView, moveCircle, freeAt, WALK_SPEED } from './player';
import { startUpdates, BUILD_ID } from './update';
import { load, save as writeSave, VERSION, type Save } from './state';
import { steer, moveCar, carFits, circles, CAR, type CarState } from './drive';
import { ActionButton, nearest, type Spot } from './interact';
import { PLACES, BOOST, buy, type Place } from './places';
import { slideAt, SLIDE_LEN, SLIDE_START, swingAt, seatX, type Body } from './play';
import { TOWNSFOLK, stepRoute, type Townie, type Walk } from './townsfolk';

const VIEW_H = 920;          // world px visible top to bottom while walking (Nico ~ 1/7 of the screen)
const VIEW_H_DRIVE = 1400;   // ...and while driving: see further ahead
const AMP_RATE = 5;          // gait amplitude ramp (1/s)
const CADENCE = 1.5;         // gait phase per second at full speed (rig walk = 1)
const MY_CAR = { color: '#E0453A', stripe: '#FFFFFF' };   // Nico's car: red with a white stripe
const HOME_DOOR = doorOf(BUILDINGS.find(b => b.id === 'home')!);
const NICO_START = { x: HOME_DOOR[0] + 60, y: HOME_DOOR[1] + 40 };   // just outside his front door

interface Walker { x: number; y: number; st: PoseState; view: PersonView; vx: number; vy: number; t: number }

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
  await loadArt(['nico', 'james', 'primo']);

  const world = new Container();
  const layer = new Container(); layer.sortableChildren = true;
  world.addChild(drawGround(), layer);
  app.stage.addChild(world);
  const minimap = new Minimap(window.innerWidth < 640 ? 130 : 170);
  app.stage.addChild(minimap.view);
  const { seats } = drawWorld(layer);

  // parked cars (the ambulance and friends): static car sprites
  for (const p of PROPS) if (p.kind === 'parked') {
    const { view, turn } = carSprite(p.color ?? '#9FB7C9', false, p.stripe);
    turn(p.h ?? 0); view.position.set(p.x, p.y); view.zIndex = p.y + CAR.wid * 0.4;
    layer.addChild(view);
  }
  const cars = makeTraffic(3);
  for (const c of cars) layer.addChild(c.view);
  const lead = leaders(cars);
  const truck = new FireTruck();
  layer.addChild(truck.view);
  const siren = new Siren();
  let wasOut = false;

  // ---- the save: money, and where Nico and his car were (if that's still a valid spot)
  const saved: Save = load();
  const state = { money: saved.money };
  const nico = { x: NICO_START.x, y: NICO_START.y, st: neutral('front'), view: new PersonView() };
  if (saved.nico && freeAt(saved.nico.x, saved.nico.y, SOLIDS, WORLD)) { nico.x = saved.nico.x; nico.y = saved.nico.y; }
  layer.addChild(nico.view.root);

  const car: CarState = { ...PARKED_CAR, speed: 0 };
  if (saved.car && carFits(saved.car.x, saved.car.y, saved.car.h, SOLIDS, WORLD)) Object.assign(car, saved.car, { speed: 0 });
  const { view: carView, turn: turnCar } = carSprite(MY_CAR.color, false, MY_CAR.stripe);
  layer.addChild(carView);
  let mode: 'walk' | 'drive' | 'play' = saved.driving ? 'drive' : 'walk';
  let boost = 0;   // seconds of speedy walking left (lunch)

  const persist = () => writeSave({ v: VERSION, money: state.money, nico: { x: nico.x, y: nico.y }, car: { x: car.x, y: car.y, h: car.h }, driving: mode === 'drive' });
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });
  setInterval(persist, 5000);

  const moneyEl = document.getElementById('money')!;
  const showMoney = () => { moneyEl.textContent = `$${state.money}`; };
  const boostEl = document.getElementById('boost')!;
  showMoney();

  // ---- getting in and out
  function getIn() { mode = 'drive'; nico.view.root.visible = false; persist(); }
  function getOut() {
    // step out on the driver's side if there's room, else the other side, front or back
    const fx = Math.cos(car.h), fy = Math.sin(car.h);
    const others = carCirclesOf(cars);
    for (const [ax, ay] of [[fy, -fx], [-fy, fx], [-fx, -fy], [fx, fy]]) {
      const d = ax * fx + ay * fy !== 0 ? CAR.len * 0.85 : CAR.wid * 1.1;
      const x = car.x + ax * d, y = car.y + ay * d;
      if (freeAt(x, y, SOLIDS, WORLD) && others.every(([ox, oy, r]) => Math.hypot(x - ox, y - oy) > r + 16)) {
        nico.x = x; nico.y = y; car.speed = 0; mode = 'walk'; nico.view.root.visible = true;
        Object.assign(nico.st, neutral('front')); persist(); return;
      }
    }
    toast("No room to get out here");
  }
  nico.view.root.visible = mode === 'walk';

  // ---- playground: the game takes over Nico's pose for a moment
  let play: { kind: 'slide' | 'swing'; t: number; from: [number, number]; seat: number } | null = null;
  function startSlide() { mode = 'play'; play = { kind: 'slide', t: 0, from: [nico.x, nico.y], seat: 0 }; }
  const seatTaken: (string | null)[] = [null, null];   // who's on each swing
  function startSwing() {
    const near = Math.abs(nico.x - seatX(0)) < Math.abs(nico.x - seatX(1)) ? 0 : 1;
    const seat = seatTaken[near] ? 1 - near : near;
    if (seatTaken[seat]) { toast('Both swings are taken!'); return; }
    seatTaken[seat] = 'nico';
    mode = 'play'; play = { kind: 'swing', t: 0, from: [nico.x, nico.y], seat };
  }
  function stopPlay() {
    if (!play) return;
    if (play.kind === 'swing') { seats[play.seat].set(1); seatTaken[play.seat] = null; nico.x = seatX(play.seat); nico.y = SWINGS.y + 34; }
    play = null; mode = 'walk';
    nico.view.root.scale.y = Math.abs(nico.view.root.scale.y);
    Object.assign(nico.st, { crouch: 0, hold: 0, sit: 0, amp: 0 });
  }
  const hopOff: Spot = { id: 'hop', x: 0, y: 0, r: Infinity, label: 'Hop off', run: stopPlay };

  // ---- buildings: walk up to a door to see what's there
  const placeEl = document.getElementById('place')!, menuEl = document.getElementById('place-menu')!;
  let openPlace: Place | null = null;
  function showPlace(p: Place) {
    openPlace = p;
    document.getElementById('place-title')!.textContent = p.title;
    document.getElementById('place-text')!.textContent = p.text;
    menuEl.replaceChildren();
    for (const item of p.menu ?? []) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.item = item.id;
      b.innerHTML = `<span>${item.label}</span><span class="price">$${item.price}</span><span class="more">+${item.boost}s speedy</span>`;
      b.disabled = item.price > state.money;
      b.addEventListener('click', () => {
        const r = buy(state.money, boost, item);
        if (!r) return;
        state.money = r.money; boost = r.boost; showMoney(); persist();
        closePlace(); toast(`Yum! ${item.label}. You feel speedy!`);
      });
      menuEl.appendChild(b);
    }
    placeEl.hidden = false;
  }
  function closePlace() { placeEl.hidden = true; openPlace = null; }
  // close on Leave, or on a tap anywhere outside the card (never get stuck in a building).
  // pointerup as well as click: some touches on iOS never produce a click.
  const leave = document.getElementById('place-close')!;
  leave.addEventListener('click', closePlace);
  leave.addEventListener('pointerup', closePlace);
  placeEl.addEventListener('pointerdown', e => { if (e.target === placeEl) closePlace(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && openPlace) closePlace(); });

  const spots: Spot[] = [
    { id: 'car', x: 0, y: 0, r: 110, label: 'Get in', run: getIn, when: () => mode === 'walk' },
    { id: 'slide', x: SLIDE_START[0], y: SLIDE_START[1] + 20, r: 90, label: 'Slide!', run: startSlide },
    { id: 'swing', x: (seatX(0) + seatX(1)) / 2, y: SWINGS.y + 25, r: 110, label: 'Swing', run: startSwing },
    ...PLACES.map(p => {
      const [x, y] = doorOf(BUILDINGS.find(b => b.id === p.building)!);
      return { id: p.building, x, y, r: 70, label: p.action ?? 'Go in', run: () => showPlace(p) };
    }),
  ];
  // ---- people Nico knows, on their routines; walk up to one to say hi
  interface Local { t: Townie; w: Walk; st: PoseState; view: PersonView; swingT: number; seat: number; said: number }
  const locals: Local[] = TOWNSFOLK.map(t => {
    const view = new PersonView(t.who);
    layer.addChild(view.root);
    const r = t.route[0];
    return { t, w: { i: 0, x: r.x, y: r.y, wait: 0, vx: 0, vy: 0 }, st: neutral('front'), view, swingT: -1, seat: -1, said: 0 };
  });
  for (const l of locals) spots.push({
    id: l.t.who, x: 0, y: 0, r: 90, label: `Say hi to ${l.t.name}`,
    run: () => { toast(`${l.t.name}: “${l.t.lines[l.said++ % l.t.lines.length]}”`); },
  });
  function stepLocal(l: Local, dt: number) {
    const reached = stepRoute(l.t, l.w, dt);
    if (reached?.swing !== undefined && !seatTaken[reached.swing]) { l.seat = reached.swing; seatTaken[l.seat] = l.t.who; l.swingT = 0; }
    if (l.swingT >= 0) {
      if (l.w.wait > 0) {
        l.swingT += dt;
        const sw = swingAt(l.swingT, l.seat);
        seats[l.seat].set(sw.chain);
        Object.assign(l.st, { view: sw.body.view, face: 1, crouch: sw.body.crouch, hold: 0, sit: 0, stride_y: 0 });
        stepGait(l.st, 0, 0, dt);
        l.view.pose(sw.body.x, sw.body.y, l.st);
        l.view.root.zIndex = sw.body.z;
        l.view.root.scale.y *= sw.body.sy;
        return;
      }
      seats[l.seat].set(1); seatTaken[l.seat] = null; l.swingT = -1; l.seat = -1;
      Object.assign(l.st, { crouch: 0 });
    }
    Object.assign(l.st, chooseView(l.w.vx, l.w.vy, l.st));
    stepGait(l.st, Math.hypot(l.w.vx, l.w.vy) / WALK_SPEED, l.w.vy, dt);
    l.view.pose(l.w.x, l.w.y, l.st);
  }

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
    // test/inspection: show the whole town (zoom out to fit) until called again with false
    overview: (on: boolean) => { overview = on; },
    alarm: () => truck.alarm(),
    setMoney: (m: number) => { state.money = m; showMoney(); },
  };
  (window as unknown as { __game: unknown }).__game = game;
  const updater = startUpdates(persist);
  document.getElementById('check-update')!.addEventListener('click', () => updater.check(true));
  Object.assign(game, { build: BUILD_ID, checkUpdate: () => updater.check(true) });
  const input = new Input(host);

  let overview = false;
  let zoom = 1, viewH = mode === 'drive' ? VIEW_H_DRIVE : VIEW_H;
  const applyZoom = () => {
    zoom = app.screen.height / viewH;
    world.scale.set(zoom);
    for (const n of [nico, ...walkers, ...locals]) n.view.setZoom(zoom, resolution);
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
      const view = new PersonView();
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

    const frozen = openPlace !== null;   // a building's card is open
    boost = Math.max(0, boost - dt);
    const fast = boost > 0 ? BOOST.speed : 1;
    if (mode === 'play' && play) {
      play.t += dt;
      let b: Body;
      if (play.kind === 'slide') {
        b = slideAt(play.t, play.from);
        if (play.t >= SLIDE_LEN) { nico.x = b.x; nico.y = b.y; stopPlay(); }
      } else {
        const sw = swingAt(play.t, play.seat);
        seats[play.seat].set(sw.chain); b = sw.body;
        if (Math.hypot(input.vx, input.vy) > 0.5 && play.t > 0.6) stopPlay();
      }
      if (play) {
        nico.x = b.x; nico.y = b.y;
        Object.assign(nico.st, { view: b.view, face: b.face, crouch: b.crouch, hold: b.hold, sit: b.sit, stride_y: 0 });
        stepGait(nico.st, b.amp, 0, dt);
        nico.view.pose(nico.x, nico.y, nico.st);
        nico.view.root.zIndex = b.z;
        nico.view.root.scale.y *= b.sy;
      }
    }
    if (mode === 'walk' && !frozen) {
      const vx = input.vx * WALK_SPEED * fast, vy = input.vy * WALK_SPEED * fast;
      const sp = Math.hypot(input.vx, input.vy);
      [nico.x, nico.y] = moveCircle(nico.x, nico.y, vx * dt, vy * dt, SOLIDS, WORLD);
      Object.assign(nico.st, chooseView(vx, vy, nico.st));
      stepGait(nico.st, sp * fast, vy, dt);
      nico.view.pose(nico.x, nico.y, nico.st);
    } else if (mode === 'drive') {
      const prevH = car.h;
      if (frozen) steer(car, 0, 0, dt); else steer(car, input.vx, input.vy, dt);
      const truckCircles: [number, number, number][] = truck.out ? truck.points().map(([x, y]) => [x, y, TRUCK.wid * 0.45]) : [];
      moveCar(car, prevH, dt, SOLIDS, WORLD, [...carCirclesOf(cars), ...truckCircles]);
    }
    carView.position.set(car.x, car.y);
    turnCar(car.h);
    carView.zIndex = car.y + CAR.wid * 0.4;

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

    for (const l of locals) {
      stepLocal(l, dt);
      const sp = spots.find(p => p.id === l.t.who)!; sp.x = l.w.x; sp.y = l.w.y;
    }

    // traffic brakes for Nico on foot, and for every part of his car
    // (and for the fire truck, which goes first: it yields only to cars not waiting for it)
    const mine: [number, number, string?][] = circles(car.x, car.y, car.h).map(([x, y]) => [x, y, 'mine']);
    if (mode !== 'drive') mine.push([nico.x, nico.y]);
    for (const l of locals) mine.push([l.w.x, l.w.y]);
    const truckPts: [number, number, string][] = truck.out ? truck.points().map(([x, y]) => [x, y, 'truck']) : [];
    for (let i = 0; i < cars.length; i++) cars[i].update(dt, lead[i], [...truckPts, ...mine]);
    const truckOut = truck.update(dt, [...mine, ...cars.filter(c => c.blockedBy !== 'truck').flatMap(c => {
      const [x, y] = c.pos, h = c.loop.heading(c.s);
      return circles(x, y, h).map(([cx, cy]) => [cx, cy]) as [number, number][];
    })]);
    if (truckOut && !wasOut) {
      const [tx, ty] = truck.pos;
      if (Math.hypot(tx - (mode === 'drive' ? car.x : nico.x), ty - (mode === 'drive' ? car.y : nico.y)) < 1600) toast('🚒 The fire alarm is ringing!');
    }
    wasOut = truckOut;

    // action button
    spots[0].x = car.x; spots[0].y = car.y;
    action.show(frozen ? null : mode === 'drive' ? (car.speed < 40 ? outSpot : null)
      : mode === 'play' ? (play?.kind === 'swing' ? hopOff : null) : nearest(spots, nico.x, nico.y));
    boostEl.hidden = boost <= 0;
    if (boost > 0) boostEl.textContent = `⚡ ${Math.ceil(boost)}s`;

    // camera follows Nico (or his car, looking ahead), clamped to the world; eases the zoom
    const wantH = overview ? Math.max(WORLD.h, WORLD.w * app.screen.height / app.screen.width) : mode === 'drive' ? VIEW_H_DRIVE : VIEW_H;
    if (Math.abs(viewH - wantH) > 0.5) { viewH += (wantH - viewH) * Math.min(1, dt * 3); applyZoom(); }
    const fx = mode === 'drive' ? car.x + Math.cos(car.h) * car.speed * 0.35 : nico.x;
    const fy = mode === 'drive' ? car.y + Math.sin(car.h) * car.speed * 0.35 : nico.y - 40;
    const vw = app.screen.width / zoom, vh = app.screen.height / zoom;
    const cx = Math.min(WORLD.w - vw / 2, Math.max(vw / 2, fx));
    const cy = Math.min(WORLD.h - vh / 2, Math.max(vh / 2, fy));
    world.position.set(app.screen.width / 2 - cx * zoom, app.screen.height / 2 - cy * zoom);

    siren.update(dt, truckOut ? Math.hypot(truck.pos[0] - cx, truck.pos[1] - cy) : null);

    // minimap: top-left, under the money
    const mr = moneyEl.getBoundingClientRect();
    minimap.view.position.set(mr.left + 6, mr.bottom + 16);
    const flash = Math.floor(performance.now() / 250) % 2 === 0;
    minimap.update([
      ...locals.map(l => ({ x: l.w.x, y: l.w.y, color: l.t.who === 'primo' ? '#2456C8' : '#2E3A66', r: 3 })),
      ...(truck.out ? [{ x: truck.pos[0], y: truck.pos[1], color: flash ? '#FF4D4D' : '#4DA3FF', r: 4 }] : []),
      ...(mode === 'drive' ? [] : [{ x: car.x, y: car.y, color: MY_CAR.color, r: 3.5 }]),
      { x: mode === 'drive' ? car.x : nico.x, y: mode === 'drive' ? car.y : nico.y, color: '#F08A3C', r: 5, ring: true },
    ]);

    const nb = nico.view.root.getBounds();
    Object.assign(game, {
      townsfolk: locals.map(l => ({ who: l.t.who, x: l.w.x, y: l.w.y, swinging: l.swingT >= 0, art: l.view.artLoaded() })),
      spots: Object.fromEntries(spots.map(p => [p.id, { x: p.x, y: p.y }])), parked: PARKED_CAR,
      mode, money: state.money, boost, play: play?.kind ?? null, inside: openPlace?.building ?? null, action: action.spot ? action.spot.id : null,
      car: { x: car.x, y: car.y, h: car.h, speed: car.speed },
      truck: { out: truck.out, s: truck.s, len: truck.loop.length, speed: truck.speed, pos: truck.pos, wait: truck.wait },
      nico: { art: nico.view.artLoaded(), x: nico.x, y: nico.y, view: nico.st.view, face: nico.st.face, amp: nico.st.amp,
              screen: { x: nb.x, y: nb.y, w: nb.width, h: nb.height } },
      cars: cars.map(c => ({ speed: c.speed, pos: c.pos, heading: c.loop.heading(c.s) })), fps, people: walkers.length + 1, zoom,
    });
  });
}

main();
