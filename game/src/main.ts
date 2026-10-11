import { Application, Container, CullerPlugin, Graphics, Sprite, Text, Texture, extensions } from 'pixi.js';

// skip drawing (and filtering) anything off screen: most of the town, most of the time
extensions.add(CullerPlugin);
import { WORLD, SOLIDS, ROADS_X, ROADS_Y, PARKED_CAR, BUILDINGS, SWINGS, PROPS, POND, SHED, SHOP, BAKERY, TREES, PINES, doorOf } from './world/map';
import { shoreY } from './world/zones';
import { drawGround, drawWorld, drawBuilding } from './world/draw';
import { outlineArt, slapIn, update as updateStickers, landed } from './world/stickers';
import { Dust } from './world/dust';
import { icon } from './world/icons';
import { yiayiaPainting } from './world/paintings';
import { Night, DAY, inForest, darkness, light } from './world/night';
import { UNLOCKS, unlockOf, isUnlocked, canUnlock, unlock, PAINT_BONUS } from './unlocks';
import { makeTraffic, leaders, carSprite, carCirclesOf } from './world/cars';
import { FireTruck, TRUCK } from './world/firetruck';
import { Fiat, FIAT } from './world/fiat';
import { FireScene } from './world/fire';
import { Siren, sfx, audio, played, footstep, Ambience } from './sound';
import { surfaceAt, roomSurface } from './surface';
import { CYCLE } from './rig/pose';
import { Minimap } from './minimap';
import { BallView, kick, nudge, roll, kickoff } from './world/ball';
import { Ducks } from './world/ducks';
import { Pigeons, Clouds, Coins, COIN } from './world/life';
import { loadArt, hasArt, PersonView } from './rig/person';
import { neutral, type PoseState, type View } from './rig/pose';
import { Input } from './input/stick';
import { chooseView, moveCircle, freeAt, stepGait, GAIT_SCALE, WALK_SPEED } from './player';
import { startUpdates, BUILD_ID } from './update';
import { load, save as writeSave, VERSION, PLAYABLE, type Save } from './state';
import { steer, moveCar, carFits, circles, CAR, type CarState } from './drive';
import { ActionButton, nearest, type Spot } from './interact';
import { PLACES, BOOST, buy, type Place } from './places';
import { slideAt, SLIDE_LEN, SLIDE_START, swingAt, seatX, waterSlideAt, SPLASH, SWIM, inPool, atEdge, climbOut, type Body } from './play';
import { POOL, WSLIDE } from './world/zones';
import { ROOMS, drawRoom, roomSolids, trayArt, SEAT, STOOL, STOOL_SEAT, TABLE_TOP, type Room, HOME_DECOR, decorArt, tvScreen, fishArt, birdhouseArt, drawHall, paintDoor, doorX, HALL_ROOM, HALL_DESK, HALL_EXIT, drawUnit, findArt, unitSlot, UNIT_ROOM, UNIT_EXIT, type DoorView, drawShedRoom, workbenchArt, shelvesArt, binsArt, paintArt, SHED_ROOM, SHED_EXIT, SHED_SLOTS, drawShopRoom, pieceArt, craftTableArt, counterArt, SHOP_ROOM, SHOP_EXIT, SHOP_SLOTS, SHOP_PEGS, browseAt, HOME_ROOM, HOME_EXIT, HOME_FURNITURE, PILLOW, drawHomeRoom, paintWindows, bedArt, nightstandArt, couchArt, pinballArt, kitchenArt, BAKERY_ROOM, BAKERY_EXIT, BAKERY_SLOTS, CASE_SPOTS, caseBrowseAt, drawBakeryRoom, bakedArt, ovenArt, mixTableArt, caseArt, pantryArt, bakeryCounterArt } from './world/rooms';
import { WALLPAPERS, RUGS, REDECORATE, PAINTINGS_KEPT } from './decor';
import { INTERIORS, drawInterior, interiorSolids, useSpot, type Interior } from './world/interiors';
import { RECIPES, PANTRY, BAKERY as BAKERY_RULES, recipe, cantBake, visit as bakeryVisit, whileAway as bakeryAway, emptyTill as bakeryEmpty, visitGap as bakeryGap, HENS } from './bakery';
import type { Shop } from './store';
import { DESIGNS, SHOP as SHOP_RULES, cantMake, visit as shopVisit, whileAway, emptyTill, visitGap, design } from './jewelry';
import { TOWNSFOLK, stepRoute, type Townie, type Walk } from './townsfolk';
import { jobFor, jobById, pickWant, WANT, start as startJob, current as jobStep, advance as advanceJob, target as jobTarget, type Active } from './jobs';
import { drawCat, drawBubble } from './world/critters';
import { DogView, drawDog, doghouseArt } from './world/dog';
import { Pinball } from './pinball/view';
import { DOG, freshDog, stepDog, fetch as dogFetch, mouthOf, type DogState } from './dog';
import { Animals, KINDS as ANIMAL_KINDS } from './world/animals';
import { Shells, Treasure, onBeach, beepGap, holeArt, DETECT, SHELL_KINDS } from './world/beach';
import { Workshop, PLANS } from './workshop';
import { ToyWindow } from './world/display';
import { PARTS_FOR_SALE, PRODUCTS, item, add, has, missing, shelfValue, sellOne, priceOf, partsCost, unlockedProducts, nextGoal, goalPlace, soldAll, take, owns, TOOLS, dugUp, see, photoStars, RANGER_PAYS, DOOR_NAMES, doorUnit, doorState, buyDoor, decide, tickDoors, ensureWanted, peekOf, guess, sellPrice, unlocks, type Choice, type Skill } from './business';

const VIEW_H = 920;          // world px visible top to bottom while walking (Nico ~ 1/7 of the screen)
const VIEW_H_DRIVE = 1400;   // ...and while driving: see further ahead
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
  await loadArt(['nico', 'cook', 'clerk', ...TOWNSFOLK.map(t => t.who)]);

  const world = new Container();
  const layer = new Container(); layer.sortableChildren = true;
  world.addChild(drawGround(), layer);
  app.stage.addChild(world);
  const minimap = new Minimap(window.innerWidth < 640 ? 130 : 170);
  app.stage.addChild(minimap.view);
  // tap the minimap for the big map; tap again to close it
  const bigMap = new Container(); bigMap.visible = false;
  const bigBack = new Graphics(); bigMap.addChild(bigBack);
  const bigNote = new Text({ text: 'Tap anywhere to close  ·  🟠 you  ·  🟡 your job', style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '800', fontSize: 16, fill: '#FFFFFF' } });
  bigNote.anchor.set(0.5, 1);
  let big: Minimap | null = null;
  app.stage.addChild(bigMap);
  function openBigMap() {
    const w = Math.min(app.screen.width - 48, (app.screen.height - 48) * WORLD.w / WORLD.h);
    if (!big || Math.abs(big.w - w) > 1) { if (big) big.view.destroy({ children: true }); big = new Minimap(w, true); bigMap.addChild(big.view); }
    bigBack.clear().rect(0, 0, app.screen.width, app.screen.height).fill({ color: '#2B3F55', alpha: 0.45 });
    big.view.position.set((app.screen.width - big.w) / 2, (app.screen.height - big.h) / 2);
    bigMap.addChild(bigNote); bigNote.position.set(app.screen.width / 2, app.screen.height - 8);
    bigMap.visible = true;
  }
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
  const ball = kickoff(), ballView = new BallView();
  layer.addChild(ballView.root);
  let goalReset = 0; const score = { left: 0, right: 0 };
  const pigeons = new Pigeons(); for (const v of pigeons.views) layer.addChild(v);
  // only flocks Nico can see make a sound: cars and people scatter them all over town
  let scatters = 0;   // every flock take-off in town (for tests)
  pigeons.onScatter = (x, y) => { scatters++; const [mx, my] = mode === 'drive' ? [car.x, car.y] : here(); if (Math.hypot(x - mx, y - my) < 600) sfx.flap(); };
  const coins = new Coins(); for (const v of coins.views) layer.addChild(v);
  const dust = new Dust(); world.addChild(dust.view);   // (over the ground and the things on it, under the clouds)
  const clouds = new Clouds(); world.addChild(clouds.view);   // above everything: shadows fall on it all
  // day and night: the dark and the lights go over everything, the moon over the world on screen
  const night = new Night(); world.addChild(night.view); app.stage.addChildAt(night.moon, app.stage.getChildIndex(world) + 1);
  const animals = new Animals(); for (const a of animals.list) { a.view.cullable = true; layer.addChild(a.view); }
  // the beach: shells to pick up, treasure to find with the metal detector
  const shells = new Shells(); for (const v of shells.views) { v.cullable = true; layer.addChild(v); }
  const treasure = new Treasure();
  const holes: { view: { alpha: number; destroy(): void }; t: number }[] = [];
  let beepIn = 0, signal = 0, hinted = '';   // (hinted: the treasure we've already said 'dig here' for)   // s until the next beep; 0..5 bars
  const ducks = new Ducks();
  let quackIn = 2;
  for (const d of ducks.views) layer.addChild(d);
  const truck = new FireTruck();
  layer.addChild(truck.view);
  const fiat = new Fiat();   // Poppop's Fiat 500, out for a drive now and then (Nonna too)
  layer.addChild(fiat.view);
  // Nonna drops off a couple of her pizzelle at Nico's bakery on the way past, if there's room in the case
  fiat.wants = stop => stop === 'parts' || (stop === 'bakery' && isUnlocked(biz, 'bakery') && biz.bakery.rack.length < BAKERY_RULES.rack);
  fiat.onStop = stop => {
    if (stop !== 'bakery') return;
    const n = Math.min(2, BAKERY_RULES.rack - biz.bakery.rack.length);
    for (let i = 0; i < n; i++) biz.bakery.rack.push({ id: 'pizzelle', price: recipe('pizzelle').price });
    if (!n) return;
    redrawCase(); persist();
    const [mx, my] = mode === 'drive' ? [car.x, car.y] : here();
    if (room?.kind === 'bakery' || Math.hypot(mx - fiat.pos[0], my - fiat.pos[1]) < 1200) toast('🧇 Nonna dropped off some pizzelle at your bakery!');
  };
  // fire calls: when the alarm rings, a building near the truck's route catches fire (just
  // smoke and flames in a front window) and the truck stops there to spray it out
  const fireScene = new FireScene(); layer.addChild(fireScene.view);
  const fireCandidates = BUILDINGS.filter(b => !['home', 'fire', 'nonna', 'woodshop', 'yiayia'].includes(b.id)).filter(b => {
    const s = truck.nearestS(b.x + b.w / 2, b.y + b.d), [px, py] = truck.loop.at(s);
    return Math.hypot(px - (b.x + b.w / 2), py - (b.y + b.d)) < 420;
  });
  let wasBurning = false;
  truck.onAlarm = t => {
    const b = fireCandidates[Math.floor(Math.random() * fireCandidates.length)];
    if (!b) return;
    t.stopAt = t.nearestS(b.x + b.w / 2, b.y + b.d);
    fireScene.start(b);
    toast(`🚒 Fire at the ${b.label ? b.label.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()) : 'house'}! Follow the fire truck!`);
  };
  const siren = new Siren();

  // ---- the save: money, and where Nico and his car were (if that's still a valid spot)
  const saved: Save = load();
  const state = { money: saved.money, biz: saved.biz };
  let clock = saved.clock ?? DAY.start;   // the time of day (0..1)
  let player = saved.player ?? 'nico';   // who he's playing as (playAs)
  const ambience = new Ambience(), around = { trees: 0, shore: 9999, forest: false, dark: 0, inside: false };
  let aroundIn = 0, lastFoot = 0, squash = 0, shake = 0, windowsIn = 0, lastDt = 0;
  const nv = [0, 0], cam = { x: NaN, y: NaN };   // Nico's velocity (eased); where the camera's looking (it trails a little)
  // a sticker hitting the world: a thump, a ring of dust along its bottom, a little jolt
  landed.on = (box, parent) => { sfx.thud(); shake = 0.3; if (parent === layer) dust.land(box.x, box.y + box.h - 10, box.w); };
  // ---- the work shed in the garden: an outline with a price until it's bought, then a building
  // (solid from the start if it's already his, before a saved position is checked)
  const shedRect = { x: SHED.x, y: SHED.y, w: SHED.w, d: SHED.d };
  const shedBox = { x: SHED.x - 10, y: SHED.y - SHED.h - 10, w: SHED.w + 20, h: SHED.d + SHED.h + 20 };
  let shedView: Container | null = null, shedOutline: Container | null = null;
  function placeShed(slap: boolean) {
    shedOutline?.destroy({ children: true }); shedOutline = null;
    shedView = drawBuilding(SHED); layer.addChild(shedView);
    if (!SOLIDS.includes(shedRect)) SOLIDS.push(shedRect);
    if (slap) slapIn(shedView, SHED.x + SHED.w / 2, SHED.y + SHED.d, shedBox);
  }
  if (isUnlocked(saved.biz, 'shed')) placeShed(false);
  else { shedOutline = outlineArt(shedBox.x, shedBox.y, shedBox.w, shedBox.h, '🏚️ Work shed', unlockOf('shed').price); shedOutline.zIndex = SHED.y - SHED.h; layer.addChild(shedOutline); }
  // ---- Bibs and Bobs on the beach: the same, an outline with a price until it's bought
  const shopRect = { x: SHOP.x, y: SHOP.y, w: SHOP.w, d: SHOP.d };
  const shopBox = { x: SHOP.x - 10, y: SHOP.y - SHOP.h - 10, w: SHOP.w + 20, h: SHOP.d + SHOP.h + 20 };
  let shopOutline: Container | null = null;
  function placeShop(slap: boolean) {
    shopOutline?.destroy({ children: true }); shopOutline = null;
    const v = drawBuilding(SHOP); layer.addChild(v);
    if (!SOLIDS.includes(shopRect)) SOLIDS.push(shopRect);
    if (slap) slapIn(v, SHOP.x + SHOP.w / 2, SHOP.y + SHOP.d, shopBox);
  }
  if (isUnlocked(saved.biz, 'shop')) placeShop(false);
  else { shopOutline = outlineArt(shopBox.x, shopBox.y, shopBox.w, shopBox.h, '🐚 Bibs and Bobs', unlockOf('shop').price); shopOutline.zIndex = SHOP.y - SHOP.h; layer.addChild(shopOutline); }
  // inside a building: the room, and where Nico is outside (the town only ever sees that)
  type Box = { x: number; y: number; w: number; d: number };
  let room: { kind: 'diner' | 'hall' | 'unit' | 'shed' | 'shop' | 'home' | 'bakery' | 'inside'; id: string; w: number; h: number; view: Container; layer: Container; solids: Box[]; worker?: PersonView;
    outside: [number, number]; diner?: Room; doors?: DoorView[]; painted?: string[]; finds?: Map<number, Container>; outlines?: Record<string, Container>; rack?: Container; windows?: Graphics; lamp?: Container } | null = null;
  let carrying: { label: string; boost: number } | null = null;   // a tray of food, from the counter to a table
  // the odd job in progress (saved; an item request's id says who and what)
  let job: Active | null = null;
  if (saved.job) {
    const j = jobById(saved.job.id);
    if (j && saved.job.step < j.steps.length) job = { job: j, step: saved.job.step, at: saved.job.at.length === j.steps.length ? saved.job.at : startJob(j).at };
  }
  const nico = { x: NICO_START.x, y: NICO_START.y, st: neutral('front'), view: new PersonView() };
  if (saved.nico && freeAt(saved.nico.x, saved.nico.y, SOLIDS, WORLD)) { nico.x = saved.nico.x; nico.y = saved.nico.y; }
  layer.addChild(nico.view.root);
  /** Where Nico is in the town (outside the door, while he's in a building). */
  const here = (): [number, number] => (room ? room.outside : [nico.x, nico.y]);

  const car: CarState = { ...PARKED_CAR, speed: 0 };
  if (saved.car && carFits(saved.car.x, saved.car.y, saved.car.h, SOLIDS, WORLD)) Object.assign(car, saved.car, { speed: 0 });
  const { view: carView, turn: turnCar, lean: leanCar } = carSprite(MY_CAR.color, false, MY_CAR.stripe);
  const lean = [0, 0], lastCar = { h: 0, speed: 0 };
  layer.addChild(carView);
  let mode: 'walk' | 'drive' | 'play' = saved.driving ? 'drive' : 'walk';
  let boost = 0;   // seconds of speedy walking left (lunch)

  const persist = () => writeSave({ v: VERSION, money: state.money, nico: { x: here()[0], y: here()[1] }, car: { x: car.x, y: car.y, h: car.h }, driving: mode === 'drive', biz: state.biz, job: job ? { id: job.job.id, step: job.step, at: job.at } : null, clock, ...(player !== 'nico' ? { player } : {}) });
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
  let play: { kind: 'slide' | 'swing' | 'bench' | 'dig' | 'camera' | 'waterslide' | 'swim' | 'eat' | 'sleep' | 'games'; t: number; from: [number, number]; seat: number } | null = null;
  let aim: [number, number] = [0, 0];   // where the camera's pointing (camera mode)
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
    if (play.kind === 'bench') { nico.x = play.from[0]; nico.y = play.from[1] + 40; }
    if (play.kind === 'camera') viewfinder.hidden = true;
    if (play.kind === 'games') { nico.x = play.from[0]; nico.y = play.from[1] + 70; if (tvGlow) tvGlow.alpha = 0.1; }
    if (play.kind === 'sleep') { nico.x = BED_SIDE[0]; nico.y = BED_SIDE[1]; sleepEl.classList.remove('on'); }
    if (play.kind === 'eat') { nico.x = play.from[0] + STOOL; nico.y = play.from[1] + SEAT; tableTray?.view.destroy(); tableTray = null; }
    if (play.kind === 'swim') { waterSkin.visible = ring.visible = false; nico.view.root.mask = null; swimMask.clear(); floating = false; const [ox, oy] = climbOut(nico.x, nico.y); nico.x = ox; nico.y = oy; }
    play = null; mode = 'walk';
    nico.view.root.scale.y = Math.abs(nico.view.root.scale.y);
    Object.assign(nico.st, { crouch: 0, hold: 0, sit: 0, knee: 0, amp: 0 });
  }
  // the camera: aim with the stick, snap; the best photo of each animal goes in the album
  const viewfinder = document.getElementById('viewfinder')!, flashEl = viewfinder.querySelector('.flash') as HTMLElement;
  const CAM = { zoomH: 600, reach: 800, aimSpeed: 650, frame: 0.56 };   // view height while aiming, how far it can look, frame size (of the screen)
  function startCamera() {
    mode = 'play'; play = { kind: 'camera', t: 0, from: [nico.x, nico.y], seat: 0 };
    aim = [nico.x, nico.y - 40]; viewfinder.hidden = false; hint.style.opacity = '0';
  }
  function snap() {
    if (play?.kind !== 'camera') return;
    sfx.shutter(); flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
    const fw = app.screen.width * CAM.frame / 2 / zoom, fh = app.screen.height * CAM.frame / 2 / zoom;
    const best: Record<string, number> = {};
    for (const a of animals.list) {
      const st = photoStars((a.x - aim[0]) / fw, (a.y - 35 - aim[1]) / fh, a.scared > 0);
      if (st !== null) best[a.kind] = Math.max(best[a.kind] ?? 0, st);
    }
    const kinds = Object.keys(best);
    if (!kinds.length) { toast('📷 Nothing in the picture. Aim at an animal!'); return; }
    const lines = kinds.map(k => {
      const was = biz.photos[k] ?? 0; biz.photos[k] = Math.max(was, best[k]);
      return `${ANIMAL_KINDS[k as keyof typeof ANIMAL_KINDS].label} ${'★'.repeat(best[k])}${'☆'.repeat(3 - best[k])}${!was ? ' (new!)' : best[k] > was ? ' (better!)' : ''}`;
    });
    persist(); toast(`📷 ${lines.join('  ·  ')}`);
  }
  document.getElementById('vf-close')!.addEventListener('click', () => stopPlay());
  const snapSpot: Spot = { id: 'snap', x: 0, y: 0, r: Infinity, label: '📸 Snap!', run: snap };
  const cameraSpot: Spot = { id: 'camera', x: 0, y: 0, r: Infinity, priority: -0.5, label: '📷 Camera', run: startCamera,
    when: () => mode === 'walk' && !room && biz.tools.includes('camera') && animals.list.some(a => Math.hypot(a.x - nico.x, a.y - nico.y) < CAM.reach) };
  // the pool: the water slide, swimming (the water hides his legs), floating on a ring
  // (a mask cuts him off at the waterline, so the pool, its ropes and shimmer show below; a ripple rings him)
  const waterSkin = new Graphics().ellipse(0, -36, 50, 11).stroke({ width: 5, color: '#FFFFFF', alpha: 0.7 }).ellipse(0, -36, 40, 7).fill({ color: '#7CD3EF', alpha: 0.6 });
  const swimMask = new Graphics(); layer.addChild(swimMask);
  const ring = new Graphics();
  ring.ellipse(0, -34, 52, 19).fill('#FFFFFF').ellipse(0, -34, 48, 16).fill('#E5484D').ellipse(0, -36, 30, 8).fill('#4FC3E8');
  for (const a of [0.4, 1.6, 2.7]) ring.ellipse(Math.cos(a) * 40, -34 + Math.sin(a) * 13, 7, 9).fill('#FFFFFF');
  waterSkin.visible = ring.visible = false; layer.addChild(waterSkin, ring);
  let floating = false;
  const splashes: { g: Graphics; t: number }[] = [];
  function splash(x: number, y: number) {
    sfx.splash();
    const g = new Graphics().ellipse(0, 0, 40, 12).stroke({ width: 5, color: '#FFFFFF', alpha: 0.9 }); g.position.set(x, y); g.zIndex = y + 1; layer.addChild(g); splashes.push({ g, t: 0 });
  }
  function startWaterslide() { mode = 'play'; play = { kind: 'waterslide', t: 0, from: [nico.x, nico.y], seat: 0 }; }
  function startSwim(x: number, y: number) {
    [nico.x, nico.y] = inPool(x, y); mode = 'play'; play = { kind: 'swim', t: 0, from: [nico.x, nico.y], seat: 0 };
    splash(nico.x, nico.y - 30); waterSkin.visible = true;
  }
  const swimSpot: Spot = { id: 'swimact', x: 0, y: 0, r: Infinity,
    label: () => (atEdge(nico.x, nico.y) ? '🪜 Climb out' : floating ? '🛟 Ring off' : '🛟 Float on a ring'),
    run: () => { if (atEdge(nico.x, nico.y)) { stopPlay(); return; } floating = !floating; ring.visible = floating; sfx.tap(); } };
  const hopOff: Spot = { id: 'hop', x: 0, y: 0, r: Infinity, label: 'Hop off', run: stopPlay };
  const standUp: Spot = { id: 'stand', x: 0, y: 0, r: Infinity, label: 'Stand up', run: stopPlay };
  function sitOnBench(bx: number, by: number) { mode = 'play'; play = { kind: 'bench', t: 0, from: [bx, by], seat: 0 }; }

  // ---- buildings: walk up to a door to see what's there
  const placeEl = document.getElementById('place')!, menuEl = document.getElementById('place-menu')!;
  const leave = document.getElementById('place-close')!;
  let openPlace: Place | null = null;
  let cardOpen: string | null = null;   // what card is showing: a building id, or 'job:<id>'
  interface CardButton { label: string; sub?: string; id?: string; disabled?: boolean; onClick: () => void }
  /** A card with a title, a line of text, some choices and a way out. */
  function showCard(id: string, title: string, text: string, buttons: CardButton[], leaveLabel = 'Leave') {
    cardOpen = id;
    document.getElementById('place-title')!.textContent = title;
    document.getElementById('place-text')!.textContent = text;
    leave.textContent = leaveLabel;
    menuEl.replaceChildren();
    for (const bt of buttons) {
      const b = document.createElement('button'); b.type = 'button'; if (bt.id) b.dataset.item = bt.id;
      b.innerHTML = `<span>${bt.label}</span>` + (bt.sub ? `<span class="price">${bt.sub}</span>` : '');
      b.disabled = !!bt.disabled;
      b.addEventListener('click', () => { closePlace(); bt.onClick(); });
      menuEl.appendChild(b);
    }
    placeEl.hidden = false;
  }
  function showPlace(p: Place) {
    showCard(p.building, p.title, p.text, []);
    openPlace = p;
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
  }
  function closePlace() { placeEl.hidden = true; openPlace = null; cardOpen = null; }
  // close on Leave, or on a tap anywhere outside the card (never get stuck in a building).
  // pointerup as well as click: some touches on iOS never produce a click.
  leave.addEventListener('click', closePlace);
  leave.addEventListener('pointerup', closePlace);
  placeEl.addEventListener('pointerdown', e => { if (e.target === placeEl) closePlace(); });
  window.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (work.screen) work.close(); else if (cardOpen) closePlace(); });

  // ---- the business (v2): storage auction, Parts & Tools, the garage workbench, the Toy Shop
  // Nico's pinball machine (in his house): its own screen, with the best score kept in the save
  const pinball = new Pinball({
    high: () => state.biz.scores.pinball ?? 0,
    setHigh: n => { state.biz.scores.pinball = n; persist(); },
    opened: on => { cardOpen = on ? 'pinball' : null; if (on) { see(state.biz, 'game', 'pinball'); app.ticker.stop(); } else { app.ticker.start(); } },   // (the town waits while he plays: one thing to draw)
  });
  const work = new Workshop({
    biz: state.biz,
    money: () => state.money,
    setMoney: n => { state.money = n; showMoney(); persist(); },
    save: () => persist(),
    toast: m => toast(m),
    opened: on => { cardOpen = on ? 'work' : null; },
    skill: sk => showSkill(sk),
    made: () => redrawRack(),
    baked: () => redrawCase(),
    made2: (what, data) => madeWith(what, data),
  });
  const biz = state.biz;
  // Bibs and Bobs kept selling while Nico was away (up to a few hours' worth; only what's on its shelves)
  function catchUp(wait = 1500) {
    const lines: string[] = [];
    if (isUnlocked(biz, 'shop')) { const a = whileAway(biz, Date.now()); if (a.length) lines.push(`🐚 Bibs and Bobs sold ${a.length} thing${a.length === 1 ? '' : 's'} ($${biz.shop.till} in the till)`); }
    if (isUnlocked(biz, 'bakery')) { const a = bakeryAway(biz, Date.now()); if (a.length) lines.push(`🧁 the bakery sold ${a.length} ($${biz.bakery.till} in the till)`); }
    if (lines.length) setTimeout(() => toast(`While you were away, ${lines.join(', and ')}!`), wait);
  }
  catchUp();
  /** What's in the toy shop window: one of each thing sold, then more cars. */
  function windowToys() { const kinds = PRODUCTS.filter(q => biz.sold[q.id]).map(q => q.id); while (kinds.length < Math.min(3, soldAll(biz))) kinds.push('car'); return kinds.slice(0, 3); }
  function showSkill(sk: Skill) { sfx.cheer(); showCard(`skill:${sk.id}`, `🎓 New skill: ${sk.name}!`, sk.text, [], 'Nice!'); }
  const toyWindow = new ToyWindow(); layer.addChild(toyWindow.view); toyWindow.set(windowToys());
  const partsLine = () => Object.entries(biz.items).map(([id, n]) => `${item(id).label.split(' ')[0]}×${n}`).join('  ') || 'none';
  const needLine = (recipe: Record<string, number>) => missing(biz, recipe).map(([id, n]) => `${n} ${item(id).label.split(' ')[0]}`).join(' ');
  const BIZ_DOORS: Record<string, (p: Place) => void> = {
    storage: () => enterHall(),
    home: () => enterHome(),
    // the farm: the hens lay eggs (one every so often, up to a basketful), free for the bakery
    barn: p => {
      const n = Math.floor(eggs);
      showCard('barn', p.title, n ? `The farmer waves from the hay loft. "The hens have laid ${n} egg${n === 1 ? '' : 's'}! Take them for your baking."` : '"The hens are busy laying. Come back in a bit!"', n ? [
        { label: `🥚 Collect ${n} egg${n === 1 ? '' : 's'}`, sub: 'free', id: 'eggs', onClick: () => { add(biz, 'egg', n); eggs -= n; persist(); sfx.pop(); toast(`🥚 ${n} egg${n === 1 ? '' : 's'} in your bag (${biz.items.egg} now). Perfect for baking!`); } },
      ] : [], 'Close');
    },
    parts: p => showParts(p),
    burger: () => enterRoom('burger'),
    cabin: p => {
      const pics = Object.keys(biz.photos), fresh = pics.filter(k => !biz.shown.includes(k)), all = Object.keys(ANIMAL_KINDS).length;
      showCard('cabin', p.title, pics.length
        ? `"You've photographed ${pics.length} of the ${all} animals round here. ${fresh.length ? 'Let me see the new ones!' : 'Keep looking: the fox is the shyest of all.'}"`
        : '"Hello! I\'m the ranger. If you ever get a camera, bring me photos of the animals: I\'ll pay for each new one."', fresh.length ? [
        { label: '📷 Show your photos', sub: `+$${fresh.length * RANGER_PAYS}`, id: 'showphotos', onClick: () => {
          biz.shown.push(...fresh); state.money += fresh.length * RANGER_PAYS; showMoney(); persist(); sfx.coin();
          toast(`Ranger: "Wonderful! ${fresh.map(k => ANIMAL_KINDS[k as keyof typeof ANIMAL_KINDS].label).join(', ')}!" +$${fresh.length * RANGER_PAYS}`);
        } }] : []);
    },
    garage: p => {
      // the car home button: it's always here, whatever else the garage has (the car can end up anywhere)
      const carHome = { label: '🚗 Bring my car home', sub: 'onto the driveway', id: 'carhome', onClick: () => {
        Object.assign(car, { ...PARKED_CAR, speed: 0 }); carView.position.set(car.x, car.y); turnCar(car.h); persist();
        toast('🚗 Your car is back on the driveway!');
      } };
      showCard('garage', p.title, `Your garage: where your car lives.${isUnlocked(biz, 'shed') ? ' Building happens in your work shed, out back.' : ''}`, [carHome]);
    },
    toys: p => {
      const have = PRODUCTS.filter(q => biz.stock[q.id]);
      if (!have.length) { showCard('toys', p.title, soldAll(biz) ? `Your toys are selling well! Bring more when you've built them.` : p.text, []); return; }
      const firstEver = have.find(q => !biz.sold[q.id]);
      showCard('toys', p.title, firstEver ? `"A ${firstEver.name} you built yourself? Let me see... It's wonderful! I'll buy it."` : 'More toys? The kids love them!',
        have.map(q => {
          const price = priceOf(biz, q.id);
          return { label: `${q.emoji} Sell a ${q.name}`, sub: `$${price}`, id: `sell:${q.id}`, onClick: () => {
            if (!biz.stock[q.id]) return;
            const first = !biz.sold[q.id];
            biz.stock[q.id]--; biz.sold[q.id] = (biz.sold[q.id] ?? 0) + 1; state.money += price; showMoney(); persist(); sfx.cash(5); toyWindow.set(windowToys());
            const next = PRODUCTS.find(n => n.after === q.id);
            toast(first ? `🎉 Your first ${q.name} sale! +$${price}. Look: it's in the shop window!${next ? ` 💡 New idea: a ${next.name}!` : ''}` : `Sold! +$${price}`);
          } };
        }));
    },
  };
  function showParts(p: Place) {
    const buy = (cost: number, then: () => void) => () => { if (state.money < cost) return; state.money -= cost; then(); showMoney(); persist(); sfx.tap(); showParts(p); };
    const ideas = unlockedProducts(biz), used = new Set(ideas.flatMap(q => Object.keys(q.recipe)));   // only parts for ideas Nico has had
    if (isUnlocked(biz, 'shop')) used.add('twine');   // (and twine, once he has a shop to make jewelry in)
    showCard('parts', p.title, biz.workbench ? `Your parts: ${partsLine()}.` : 'Wheels, axles, bodies and tools. (You\'ll build things on a workbench, in a work shed of your own.)', [
      ...TOOLS.filter(t => !biz.tools.includes(t.id)).map(t => ({ label: t.label, sub: `$${t.price}`, id: `tool:${t.id}`, disabled: state.money < t.price,
        onClick: buy(t.price, () => { biz.tools.push(t.id); toast(`${t.label}! ${t.text}`); }) })),
      ...(biz.workbench ? ideas.filter(q => missing(biz, q.recipe).length).map(q => {
        const kit = missing(biz, q.recipe), cost = partsCost(Object.fromEntries(kit));
        return { label: `🧰 ${q.name[0].toUpperCase()}${q.name.slice(1)} kit`, sub: `$${cost} · ${needLine(q.recipe)}`, id: `kit:${q.id}`, disabled: state.money < cost,
          onClick: buy(cost, () => { for (const [id, n] of kit) add(biz, id, n); toast(`🧰 Everything you need for a ${q.name}!`); }) };
      }) : []),
      ...PARTS_FOR_SALE.filter(q => used.has(q.id)).map(q => ({ label: item(q.id).label, sub: `$${q.price}${q.id === 'twine' ? ` · have ${biz.items.twine ?? 0}` : ''}`, id: `part:${q.id}`, disabled: state.money < q.price,
        onClick: buy(q.price, () => add(biz, q.id)) })),
      ...(isUnlocked(biz, 'shop') ? [{ label: '🧵 Hemp twine ×5', sub: '$5', id: 'part:twine5', disabled: state.money < 5, onClick: buy(5, () => add(biz, 'twine', 5)) }] : []),
    ]);
  }
  const goalEl = document.getElementById('goal')!;
  /** The buy card for an unlockable: what it is, what it does, the price. */
  function unlockCard(id: string, then: () => void) {
    const u = unlockOf(id);
    showCard(`unlock:${id}`, u.label, u.text, [
      { label: '✨ Buy it', sub: `$${u.price}`, id: 'unlock', disabled: u.price > state.money, onClick: () => {
        if (!unlock(biz, id, state.money)) return;
        state.money -= u.price; showMoney(); sfx.sparkle(); sfx.snap(); then(); persist();
        toast(`${u.label}: it's yours!`);
      } },
    ], 'Not now');
  }
  const SHED_DOOR = doorOf(SHED);
  const shedSpot: Spot = { id: 'shed', x: SHED_DOOR[0], y: SHED_DOOR[1], r: 130,
    label: () => (isUnlocked(biz, 'shed') ? '🚪 Go in' : `✨ Work shed · $${unlockOf('shed').price}`),
    run: () => {
      if (isUnlocked(biz, 'shed')) { enterShed(); return; }
      unlockCard('shed', () => {
        placeShed(true);
        if (!freeAt(nico.x, nico.y, SOLIDS, WORLD)) { nico.x = SHED_DOOR[0]; nico.y = SHED_DOOR[1] + 20; }   // (never stuck inside it)
      });
    } };
  // ---- inside the shed: equipment outlines, the workbench
  const shedArt: Record<string, () => Container> = {
    workbench: workbenchArt, bins: binsArt, paint: paintArt,
    shelves: () => shelvesArt([...biz.finds.map(f => item(f.id).label.split(' ')[0]), ...SHELL_KINDS.filter(k => biz.found.includes(k.id)).map(() => '🐚')]),
  };
  function enterShed() {
    const { view, layer: rl } = drawShedRoom(), outlines: Record<string, Container> = {};
    for (const u of UNLOCKS.filter(q => q.room === 'shed')) {
      const sl = SHED_SLOTS[u.id]; if (!sl) continue;
      if (isUnlocked(biz, u.id)) rl.addChild(shedArt[u.id]());
      else { const o = outlineArt(sl.x - 10, sl.y - sl.h - 10, sl.w + 20, sl.h + sl.d + 20, u.label, u.price); o.zIndex = sl.y - sl.h; o.visible = canUnlock(biz, u.id); rl.addChild(o); outlines[u.id] = o; }
    }
    const solids: Box[] = [{ x: 0, y: 0, w: SHED_ROOM.w, d: SHED_ROOM.wall + 14 }];
    const solidOf = (id: string) => { const sl = SHED_SLOTS[id]; return { x: sl.x, y: sl.y, w: sl.w, d: sl.d }; };
    for (const u of UNLOCKS) if (u.room === 'shed' && isUnlocked(biz, u.id) && SHED_SLOTS[u.id]) solids.push(solidOf(u.id));
    showRoom({ kind: 'shed', id: 'shed', w: SHED_ROOM.w, h: SHED_ROOM.h, view, layer: rl, solids, outlines }, [SHED_EXIT[0], SHED_EXIT[1] - 70]);
    sfx.door();
  }
  function shedSpots(): Spot[] {
    return [
      ...UNLOCKS.filter(u => u.room === 'shed' && SHED_SLOTS[u.id] && (isUnlocked(biz, u.id) || canUnlock(biz, u.id))).map(u => {
        const sl = SHED_SLOTS[u.id];
        return { id: u.id, x: sl.x + sl.w / 2, y: sl.y + sl.d + 50, r: 130,
          label: isUnlocked(biz, u.id) ? ({ workbench: '🛠️ Use the workbench', bins: '🧰 Order parts', shelves: '🗄️ Look at your shelves', paint: '🎨 Paint station' }[u.id] ?? u.label) : `✨ ${u.label} · $${u.price}`,
          run: () => {
            if (isUnlocked(biz, u.id)) {
              if (u.id === 'workbench') workbenchCard();
              if (u.id === 'bins') showParts(PLACES.find(p => p.building === 'parts')!);
              if (u.id === 'shelves') { const n = biz.finds.length; showCard('shelves', '🗄️ Your shelves', n ? `${n} thing${n === 1 ? '' : 's'} you've kept, worth about $${shelfValue(biz)}. (The storage office will buy them.) ${biz.found.length} kinds of shell too.` : 'Empty for now: things you keep from storage units and the beach go here.', [], 'Close'); }
              if (u.id === 'paint') showCard('paint', '🎨 Paint station', `Every toy you build gets a shiny coat of paint: painted toys sell for $${PAINT_BONUS} more.`, [], 'Nice');
              return;
            }
            unlockCard(u.id, () => {
              if (room?.kind !== 'shed') return;
              room.outlines?.[u.id]?.destroy({ children: true });
              const a = shedArt[u.id](); room.layer.addChild(a);
              slapIn(a, sl.x + sl.w / 2, sl.y + sl.d, { x: sl.x - 10, y: sl.y - sl.h - 10, w: sl.w + 20, h: sl.h + sl.d + 20 });
              room.solids.push({ x: sl.x, y: sl.y, w: sl.w, d: sl.d });
              if (nico.y < sl.y + sl.d + 20 && nico.y > sl.y - 10) nico.y = sl.y + sl.d + 40;   // (step back out of its way)
              for (const [id, o] of Object.entries(room.outlines ?? {})) if (!o.destroyed) o.visible = canUnlock(biz, id);   // (the bench opens up more spots)
            });
          } };
      }),
      { id: 'leave', x: SHED_EXIT[0], y: SHED_EXIT[1], r: 120, label: '🚪 Leave', run: leaveRoom },
    ];
  }
  // ---- inside every other building (world/interiors.ts): walk round, use things, talk to whoever's there
  const treatIn: Record<string, number> = {};   // s till each grown-up has another treat
  function enterInside(id: string, at?: [number, number]) {
    const r = INTERIORS[id], { view, layer: rl } = drawInterior(r);
    const solids = interiorSolids(r);
    const addWorker = () => {
      if (!r.person || room?.id !== id || room.worker) return;
      const v = new PersonView(r.person.who); v.setZoom(zoom, resolution); if (low) v.setLow(true);
      v.pose(r.person.x, r.person.y, neutral('front')); v.root.zIndex = r.person.y; rl.addChild(v.root); room.worker = v;
    };
    const out = r.person ? away(r.person.who) : null;
    if (r.person && !out) solids.push({ x: r.person.x - 22, y: r.person.y - 16, w: 44, d: 18 });
    if (id === 'fire') { const t = r.things.find(q => q.kind === 'emoji'); if (t && truck.out) rl.children.find(c => c.zIndex === (t as { y: number }).y)?.removeFromParent(); }   // (the truck's out on a call)
    if (id === 'yiayia') hangGallery(rl);
    showRoom({ kind: 'inside', id, w: r.w, h: r.h, view, layer: rl, solids }, at ?? [r.w / 2, r.h - 100]);
    if (r.person && !out) { if (hasArt(r.person.who)) addWorker(); else void loadArt([r.person.who]).then(addWorker); }   // (their art loads in the background: see below)
    sfx.door();
  }
  /** The building's own business (its menu, buying, selling...), from the counter. */
  const placeAction = (id: string) => {
    if (GRAN[id]) { GRAN[id](); return; }
    const p = PLACES.find(q => q.building === id); if (p) (BIZ_DOORS[id] ?? showPlace)(p);
  };
  // ---- the grandparents: Nonna's pasta and pizzelle, Poppop's woodshop projects, Yia-Yia's easel
  let pastaIn = 0;
  const done2 = (id: string) => isUnlocked(biz, id);
  const GRAN: Record<string, () => void> = {
    nonna: () => showCard('nonna', '👵 Nonna', `Nonna: “${pick(['Ciao, Nico! You look hungry. Sit, sit!', 'Mangia! You\'re a growing boy.', 'I made too much pasta again. Help me eat it!'])}”`, [
      { label: '🍝 A big bowl of pasta', sub: pastaIn > 0 ? 'still full!' : 'free', id: 'pasta', disabled: pastaIn > 0, onClick: () => {
        pastaIn = 180; const t = INTERIORS.nonna.things.find(q => q.kind === 'block' && q.use?.sit && q.use.label.includes('table'));
        if (t && t.kind === 'block') { nico.x = t.x + t.w / 2; nico.y = t.y + t.d + 50; sitOnBench(t.x + t.w / 2, t.y + t.d + 6); }
        boost = Math.min(BOOST.max, boost + 60); sfx.coin(); toast('🍝 Nonna brings a huge bowl of pasta. Mangia! You feel super speedy! ⚡');
      } },
      { label: biz.learned.includes('pizzelle') ? '🧇 Make pizzelle with Nonna' : '🧇 Learn to make pizzelle', sub: biz.learned.includes('pizzelle') ? 'you know how!' : 'her secret recipe', id: 'pizzelle', onClick: () => work.pizzelle() },
    ], 'Grazie!'),
    poppop: () => showCard('poppop', '👴 Poppop', `Poppop: “${pick(['Hey there, kiddo! What shall we make today?', 'Safety glasses on. Now, what are we building?', 'I\'ve got some nice oak here. Want to make something?'])}”`, [
      { label: '🐦 Build a birdhouse', sub: done2('birdhouse') ? 'made one!' : 'hammer and nails', id: 'proj:birdhouse', onClick: () => work.birdhouse() },
      { label: '🤖 Carve a sign on the CNC router', sub: done2('sign') ? 'make a new one' : 'the machine carves it', id: 'proj:cnc', onClick: () => work.cnc() },
      { label: '⚡ Cut a metal star (plasma cutter)', sub: done2('metalstar') ? 'made one!' : 'sparks!', id: 'proj:plasma', onClick: () => work.plasma() },
    ], 'Thanks, Poppop!'),
    yiayia: () => showCard('yiayia', '🎨 Yia-Yia', `Yia-Yia: “${pick(['Hello, my darling! Shall we paint?', 'The light is lovely today. Let\'s paint!', 'Your last one was wonderful. Another?'])}” ${biz.paintings.length ? `(${biz.paintings.length} of your paintings are on the walls.)` : ''}`, [
      { label: '🎨 Paint a picture', sub: 'at the easel', id: 'paint', onClick: () => work.paint() },
    ], 'Bye, Yia-Yia!'),
    birdhouse: () => work.birdhouse(), cnc: () => work.cnc(), plasma: () => work.plasma(), paint: () => work.paint(),
  };
  /** Something made with a grandparent: it goes where it belongs (the bakery's recipes, Nico's house and garden, the gallery). */
  function madeWith(what: string, data?: string) {
    if (what === 'pizzelle') { const first = !biz.learned.includes('pizzelle'); if (first) biz.learned.push('pizzelle'); boost = Math.min(BOOST.max, boost + 20); toast(first ? '🧇 You learned Nonna\'s pizzelle! Bake them at your bakery.' : '🧇 Warm pizzelle! Crunchy and sweet. ⚡'); }
    if (what === 'birdhouse' && !isUnlocked(biz, 'birdhouse')) { biz.unlocked.push('birdhouse'); placeBirdhouse(); }
    if (what === 'sign') { if (!isUnlocked(biz, 'sign')) biz.unlocked.push('sign'); if (data) biz.home.sign = data; }
    if (what === 'metalstar' && !isUnlocked(biz, 'metalstar')) biz.unlocked.push('metalstar');
    if (what === 'painting' && data) { see(biz, 'art', 'painting'); biz.paintings.push(data); biz.paintings.splice(0, Math.max(0, biz.paintings.length - PAINTINGS_KEPT)); if (room?.id === 'yiayia') enterInside('yiayia', [nico.x, nico.y]); }
    persist();
  }
  /** A painting from a data URL (loaded into a sprite once the image has decoded), framed at x, y, w x h. */
  function framedPainting(data: string, x: number, y: number, w: number, h: number): Container {
    const c = new Container(), g = new Graphics().roundRect(x - 8, y - 8, w + 16, h + 16, 6).fill('#FFFFFF').roundRect(x - 5, y - 5, w + 10, h + 10, 4).fill('#C9A04A');
    c.addChild(g);
    const img = new Image(); img.onload = () => { if (c.destroyed) return; const sp = new Sprite(Texture.from(img)); sp.position.set(x, y); sp.width = w; sp.height = h; c.addChild(sp); }; img.src = data;
    return c;
  }
  /** Yia-Yia's gallery: her two paintings, then Nico's (newest first), along the studio wall. */
  function hangGallery(layer: Container) {
    const slots = [80, 290, 500, 710, 920].map(x => ({ x, y: 40, w: 170, h: 130 }));
    slots.forEach((q, i) => {
      if (i < 2) { const c = new Container(), fr = new Graphics().roundRect(q.x - 8, q.y - 8, q.w + 16, q.h + 16, 6).fill('#FFFFFF').roundRect(q.x - 5, q.y - 5, q.w + 10, q.h + 10, 4).fill(i ? '#9AA6B2' : '#B89A4A');
        const art = yiayiaPainting(i as 0 | 1, q.w, q.h); art.position.set(q.x, q.y); c.addChild(fr, art); c.zIndex = 1; layer.addChild(c); return; }
      const p = biz.paintings[biz.paintings.length - 1 - (i - 2)];
      if (p) { const c = framedPainting(p, q.x, q.y, q.w, q.h); c.zIndex = 1; layer.addChild(c); }
      else { const e = new Graphics().roundRect(q.x, q.y, q.w, q.h, 6).stroke({ width: 4, color: '#C9D3DC' }); e.zIndex = 1; layer.addChild(e); }
    });
  }
  let birdhouseView: Container | null = null;
  function placeBirdhouse() { if (birdhouseView) return; birdhouseView = birdhouseArt(470, 1700); layer.addChild(birdhouseView); }
  function insideSpots(): Spot[] {
    if (!room) return [];
    const r: Interior = INTERIORS[room.id], out: Spot[] = [];
    const note = r.person && !room.worker ? away(r.person.who) : null;
    if (note) out.push({ id: 'counter', x: r.person!.x, y: r.person!.y + 130, r: 120, label: '📝 Read the note', run: () => toast(note) });
    else if (r.person) {
      const pr = r.person, act = pr.action, treat = pr.treat;
      out.push({ id: 'counter', x: pr.x, y: pr.y + 130, r: 120, label: act ? ({ icecream: '🍦 Order ice cream', parts: '🔧 Shop for parts', toys: '🧸 Sell your toys', barn: '🥚 Ask about eggs', cabin: '📷 Talk to the ranger' }[act] ?? `💬 Talk to ${pr.name}`) : treat ? `💬 Say hi to ${pr.name}` : `💬 Talk to ${pr.name}`,
        run: () => {
          if (act) { placeAction(act); return; }
          const line = pick(pr.lines);
          if (!treat) { toast(`${pr.name[0].toUpperCase()}${pr.name.slice(1)}: “${line}”`); return; }
          showCard(`talk:${room!.id}`, r.title, `${pr.name[0].toUpperCase()}${pr.name.slice(1)}: “${line}”`, [{ label: treat.label, sub: (treatIn[room!.id] ?? 0) > 0 ? 'had one!' : 'free', id: 'treat', disabled: (treatIn[room!.id] ?? 0) > 0,
            onClick: () => { treatIn[room!.id] = 120; boost = Math.min(BOOST.max, boost + treat.boost); sfx.coin(); toast(`${treat.label}! Thank you! ⚡`); } }], 'Bye!');
        } });
    }
    r.things.forEach((t, i) => {
      if (!('use' in t) || !t.use) return;
      const u = t.use, [x, y] = useSpot(t);
      out.push({ id: u.action && u.action === room!.id ? 'counter' : `thing${i}`, x, y, r: 100, label: u.label, run: () => {
        if (u.sit) { sitOnBench(x, y - 44); return; }
        if (u.action === 'bell') { for (let k = 0; k < 3; k++) audio.tone('triangle', 1568, 1568, 0.25, 0.08, k * 0.3); toast('🔔 Ding ding ding! The firefighters come running... false alarm!'); return; }
        if (u.action) { placeAction(u.action); return; }
        if (u.lines) toast(pick(u.lines));
      } });
    });
    out.push({ id: 'leave', x: r.w / 2, y: r.h - 30, r: 120, label: '🚪 Leave', run: leaveRoom });
    return out;
  }
  // ---- Nico's house: his bed, the couch, the fridge; windows show the sky outside
  const sleepEl = document.getElementById('sleep')!;
  const BED_SIDE: [number, number] = [HOME_FURNITURE.bed.x + HOME_FURNITURE.bed.w + 70, HOME_FURNITURE.bed.y + HOME_FURNITURE.bed.d - 20];
  let snackIn = 0;   // s till the fridge has another snack
  let eggs: number = HENS.max;   // eggs waiting at the farm (the hens lay more as time goes by)
  function enterHome(at: [number, number] = [HOME_EXIT[0], HOME_EXIT[1] - 70]) {
    const f0 = HOME_FURNITURE;
    const { view, layer: rl, windows } = drawHomeRoom(WALLPAPERS[biz.home.wall], RUGS[biz.home.rug]), { bed, blanket } = bedArt(), stand = nightstandArt();
    const lamp = light(stand.bulb[0], stand.bulb[1], 110, 90, 0xFFD98A, 0.8); lamp.zIndex = 9999;
    rl.addChild(bed, blanket, stand.view, couchArt(), kitchenArt(), pinballArt(), lamp);
    if (dog) { const g = new Graphics(); drawDog(g, 'sleep'); g.position.set(f0.bed.x + f0.bed.w / 2 - 14, f0.bed.y + f0.bed.d - 24); g.scale.set(1.2); g.zIndex = 9000; rl.addChild(g); }   // (Biscuit, curled up asleep on the foot of the bed)
    paintWindows(windows, darkness(clock));
    const f = HOME_FURNITURE, outlines: Record<string, Container> = {};
    // decorations: the ones he's bought, and outlines (with prices) for the rest
    for (const u of UNLOCKS.filter(q => q.room === 'home')) {
      if (isUnlocked(biz, u.id)) rl.addChild(homeDecor(u.id));
      else { const [x, y, w, h] = decorBox(u.id); const o = outlineArt(x, y, w, h, u.label, u.price); o.zIndex = u.id === 'posters' ? 2 : y; o.scale.set(1); o.visible = canUnlock(biz, u.id); rl.addChild(o); outlines[u.id] = o; }
    }
    if (biz.paintings.length) { const pc = framedPainting(biz.paintings[biz.paintings.length - 1], 832, 58, 96, 68); pc.zIndex = 1; rl.addChild(pc); }   // (your newest painting, from Yia-Yia's)
    showRoom({ kind: 'home', id: 'home', w: HOME_ROOM.w, h: HOME_ROOM.h, view, layer: rl, windows, lamp, outlines,
      solids: [{ x: 0, y: 0, w: HOME_ROOM.w, d: HOME_ROOM.wall + 14 }, ...Object.values(f).map(q => ({ x: q.x, y: q.y, w: q.w, d: q.d })), ...decorSolids()] }, at);
    sfx.door();
  }
  const decorSolids = () => UNLOCKS.filter(u => u.room === 'home' && isUnlocked(biz, u.id)).map(u => HOME_DECOR[u.id]).filter(q => q && q.d > 0).map(q => ({ x: q.x, y: q.y, w: q.w, d: q.d }));
  /** The outline box for a decoration (x, y, w, h). */
  function decorBox(id: string): [number, number, number, number] {
    const q = HOME_DECOR[id];
    if (id === 'cat') return [q.x - 45, q.y - 70, 90, 80];
    return [q.x - 10, q.y + q.d - q.h - 10, q.w + 20, q.h + 20];
  }
  /** A decoration's art (the TV's screen and the fish move: kept for the loop). */
  let tvGlow: Graphics | null = null, fish: Graphics[] = [], petCat: Container | null = null;
  function homeDecor(id: string): Container {
    const c = new Container(); c.sortableChildren = true;
    if (id === 'sign') {   // the carved sign: NICO, with the design he picked at either end (drawn, not emoji)
      const a = decorArt('sign'), q = HOME_DECOR.sign, t = new Text({ text: 'NICO', style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900', fontSize: 26, fill: '#5A3A22' } });
      const shape = ({ '⭐': 'star', '❤️': 'heart', '🚀': 'rocket' } as Record<string, string>)[biz.home.sign ?? '⭐'] ?? 'star';
      t.anchor.set(0.5); t.position.set(q.x + q.w / 2, q.y + q.h / 2); c.addChild(a, t);
      for (const dx of [-60, 60]) { const ic = icon(shape, 26); ic.position.set(q.x + q.w / 2 + dx, q.y + q.h / 2); c.addChild(ic); }
      c.zIndex = 1; return c; }
    if (id === 'cat') { const k = drawCat(); k.position.set(HOME_DECOR.cat.x, HOME_DECOR.cat.y); k.scale.set(1.3); c.addChild(k); c.zIndex = HOME_DECOR.cat.y; petCat = c; return c; }
    const a = decorArt(id); c.addChild(a); c.zIndex = a.zIndex;
    if (id === 'tv') { tvGlow = tvScreen(); tvGlow.alpha = 0.1; c.addChild(tvGlow); }
    if (id === 'fishtank') fish = ['#F28C38', '#F9C846', '#E5484D'].map(col => { const g = fishArt(col); c.addChild(g); return g; });
    return c;
  }
  /** Redecorate: pick the wallpaper and the rug. */
  function showRedecorate() {
    const pickIt = (kind: 'wall' | 'rug', key: string) => () => {
      if (biz.home[kind] === key || state.money < REDECORATE) return;
      state.money -= REDECORATE; biz.home[kind] = key; showMoney(); persist(); sfx.sparkle();
      enterHome([nico.x, nico.y]); toast(kind === 'wall' ? `🎨 New wallpaper: ${WALLPAPERS[key].label}!` : `🎨 A new rug: ${RUGS[key].label}!`);
    };
    showCard('redecorate', '🎨 Redecorate', `Pick new wallpaper or a new rug ($${REDECORATE} each).`, [
      ...Object.entries(WALLPAPERS).map(([k, v]) => ({ label: `${v.label} walls`, sub: biz.home.wall === k ? 'now' : `$${REDECORATE}`, id: `wall:${k}`, disabled: biz.home.wall === k || state.money < REDECORATE, onClick: pickIt('wall', k) })),
      ...Object.entries(RUGS).map(([k, v]) => ({ label: `${v.label} rug`, sub: biz.home.rug === k ? 'now' : `$${REDECORATE}`, id: `rug:${k}`, disabled: biz.home.rug === k || state.money < REDECORATE, onClick: pickIt('rug', k) })),
    ], 'Close');
  }
  /** Spots for the decorations: buy one (it's stuck on), or use it. */
  function decorSpots(): Spot[] {
    const spotAt: Record<string, [number, number]> = { posters: [195, 575], bookshelf: [465, 360], tv: [360, 690], beanbag: [205, 845], fishtank: [1075, 745], plant: [1220, 610], cat: [900, 830] };
    const out: Spot[] = [];
    for (const u of UNLOCKS.filter(q => q.room === 'home')) {
      const owned = isUnlocked(biz, u.id);
      if (!owned && !canUnlock(biz, u.id)) continue;
      if (u.id === 'tv' && owned && isUnlocked(biz, 'beanbag')) continue;   // (the beanbag spot plays the games)
      if (u.id === 'beanbag' && !owned && isUnlocked(biz, 'tv')) { /* buy it from its own outline */ }
      if (!spotAt[u.id]) continue;   // (the carved sign and the metal star just hang on the wall: nothing to walk up to)
      const [x, y] = spotAt[u.id];
      const use: Record<string, () => void> = {
        posters: () => toast('🖼️ Your posters: a soccer star and a rocket to the moon.'),
        bookshelf: () => toast(`📚 You pick a book: "${pick(['The Robot Who Could', 'Treasure Island', 'Big Book of Cars', 'Space for Kids', 'The Mystery of the Old Pier'])}". A good read!`),
        tv: () => toast('📺 You need somewhere comfy to sit and play: a beanbag!'),
        beanbag: () => { mode = 'play'; play = { kind: 'games', t: 0, from: [HOME_DECOR.beanbag.x + HOME_DECOR.beanbag.w / 2, HOME_DECOR.beanbag.y + 10], seat: 0 }; sfx.tap(); },
        fishtank: () => { sfx.splash(); toast('🐠 You sprinkle in some fish food. The fish zoom up to eat it!'); fishFed = 3; },
        plant: () => toast('🪴 You water the plant. It looks happy.'),
        cat: () => { sfx.purr(); toast(`🐱 ${pick(['Purrrr...', 'She rubs against your leg.', 'Mrrrow!', 'She rolls over for a tummy rub.'])}`); },
      };
      out.push({ id: u.id, x, y, r: 110, label: owned ? ({ posters: '🖼️ Look at your posters', bookshelf: '📚 Read a book', tv: '📺 Your TV', beanbag: isUnlocked(biz, 'tv') ? '🎮 Play video games' : '🫘 Flop on the beanbag', fishtank: '🐠 Feed the fish', plant: '🪴 Water the plant', cat: '🐱 Pet the cat' }[u.id] ?? u.label) : `✨ ${u.label} · $${u.price}`,
        run: () => {
          if (owned) { use[u.id]?.(); return; }
          unlockCard(u.id, () => {
            if (room?.kind !== 'home') return;
            room.outlines?.[u.id]?.destroy({ children: true });
            const a = homeDecor(u.id); room.layer.addChild(a);
            const [bx, by, bw, bh] = decorBox(u.id); slapIn(a, bx + bw / 2, by + bh, { x: bx, y: by, w: bw, h: bh });
            room.solids = [{ x: 0, y: 0, w: HOME_ROOM.w, d: HOME_ROOM.wall + 14 }, ...Object.values(HOME_FURNITURE).map(q => ({ x: q.x, y: q.y, w: q.w, d: q.d })), ...decorSolids()];
            for (const [id, o] of Object.entries(room.outlines ?? {})) if (!o.destroyed) o.visible = canUnlock(biz, id);
          });
        } });
    }
    out.push({ id: 'redecorate', x: 470, y: 840, r: 100, label: '🎨 Redecorate', run: showRedecorate });
    return out;
  }
  let fishFed = 0;
  function homeSpots(): Spot[] {
    const c = HOME_FURNITURE.couch, k = HOME_FURNITURE.kitchen, night = darkness(clock) > 0.3;
    return [
      { id: 'bed', x: BED_SIDE[0], y: BED_SIDE[1], r: 130, label: night ? '😴 Go to sleep' : '😴 Take a nap', run: () => {
        mode = 'play'; play = { kind: 'sleep', t: 0, from: [PILLOW[0], PILLOW[1]], seat: night ? 1 : 0 }; sfx.tap();
      } },
      { id: 'couch', x: c.x + c.w / 2, y: c.y + c.d + 50, r: 120, label: '🛋️ Sit on the couch', run: () => sitOnBench(c.x + c.w / 2, c.y + c.d - 6) },
      { id: 'fridge', x: k.x + k.w - 43, y: k.y + k.d + 50, r: 120, label: '🥤 Grab a snack', run: () => {
        if (snackIn > 0) { toast('🥤 You just had one! Save some for later.'); return; }
        snackIn = 120; boost = Math.min(BOOST.max, boost + 15); sfx.coin(); toast('🍎 An apple from the fridge. Crunch! You feel speedy! ⚡');
      } },
      { id: 'pinball', x: HOME_FURNITURE.pinball.x + HOME_FURNITURE.pinball.w / 2, y: HOME_FURNITURE.pinball.y + HOME_FURNITURE.pinball.d + 50, r: 110, label: '🕹️ Play pinball', run: () => pinball.open() },
      ...decorSpots(),
      { id: 'leave', x: HOME_EXIT[0], y: HOME_EXIT[1], r: 120, label: '🚪 Go outside', run: leaveRoom },
    ];
  }
  /** Asleep in bed: tucked in, the screen fades to night, morning comes (or, for a nap, a little rest). */
  function sleepStep(t: number, night: boolean): Body {
    if (t > 0.8) sleepEl.classList.add('on');
    if (t >= 2.4 && t - lastDt < 2.4) {   // (once, while it's dark)
      if (night) { clock = 0.03; boost = Math.min(BOOST.max, boost + 30); }
      else boost = Math.min(BOOST.max, boost + 15);
      if (room?.windows) paintWindows(room.windows, darkness(clock));
      persist();
    }
    if (t >= 2.6) sleepEl.classList.remove('on');
    if (t >= 3.6) { stopPlay(); toast(night ? '☀️ Good morning! You slept all night and feel full of energy! ⚡' : '😌 What a nice nap. You feel rested! ⚡'); }
    return { x: PILLOW[0], y: PILLOW[1] + 104, view: 'front', face: 1, amp: 0, crouch: 0, hold: 0, sit: 0, z: HOME_FURNITURE.bed.y + 140, sy: 1 };
  }
  // ---- Bibs and Bobs: the stringing table, the shelves, the till; visitors come in and browse
  const SHOP_DOOR = doorOf(SHOP);
  const shopSpot: Spot = { id: 'bibs', x: SHOP_DOOR[0], y: SHOP_DOOR[1], r: 130,
    label: () => (isUnlocked(biz, 'shop') ? '🚪 Go in' : `✨ Bibs and Bobs · $${unlockOf('shop').price}`),
    run: () => {
      if (isUnlocked(biz, 'shop')) { enterShop(); return; }
      unlockCard('shop', () => {
        placeShop(true); biz.shop.last = Date.now();
        if (!freeAt(nico.x, nico.y, SOLIDS, WORLD)) { nico.x = SHOP_DOOR[0]; nico.y = SHOP_DOOR[1] + 20; }
      });
    } };
  const shellColor = (k: string) => SHELL_KINDS.find(q => q.id === k)?.color ?? '#FFFFFF';
  /** The pieces on the shelves, one per peg. */
  function rackArt(): Container {
    const c = new Container();
    biz.shop.rack.forEach((p, i) => { const g = pieceArt(p.id, (p.shells ?? []).map(shellColor)); g.position.set(...SHOP_PEGS[i]); g.scale.set(1.5); c.addChild(g); });
    c.zIndex = SHOP_ROOM.wall - 20; return c;
  }
  function redrawRack() { if (room?.kind !== 'shop') return; room.rack?.destroy({ children: true }); room.rack = rackArt(); room.layer.addChild(room.rack); }
  function enterShop() {
    const { view, layer: rl } = drawShopRoom(), rack = rackArt();
    rl.addChild(craftTableArt(), counterArt(), rack);
    const box = (q: { x: number; y: number; w: number; d: number }) => ({ x: q.x, y: q.y, w: q.w, d: q.d });
    showRoom({ kind: 'shop', id: 'bibs', w: SHOP_ROOM.w, h: SHOP_ROOM.h, view, layer: rl, rack,
      solids: [{ x: 0, y: 0, w: SHOP_ROOM.w, d: SHOP_ROOM.wall + 14 }, box(SHOP_SLOTS.table), box(SHOP_SLOTS.counter)] }, [SHOP_EXIT[0], SHOP_EXIT[1] - 70]);
    sfx.door();
    visitIn.shop = Math.min(visitIn.shop, 4);   // (someone's along soon)
  }
  const pieceName = (p: { id: string }) => design(p.id).name;
  function shopSpots(): Spot[] {
    const t = SHOP_SLOTS.table, c = SHOP_SLOTS.counter;
    return [
      { id: 'craft', x: t.x + t.w / 2, y: t.y + t.d + 50, r: 130, label: '🧵 Make jewelry', run: () => {
        const shellsHave = Object.values(biz.shells).reduce((n, k) => n + k, 0), twine = biz.items.twine ?? 0;
        showCard('craft', '🧵 The stringing table', `You have ${shellsHave} shell${shellsHave === 1 ? '' : 's'} and ${twine} length${twine === 1 ? '' : 's'} of hemp twine (Parts & Tools sells it). ${biz.shop.rack.length}/${SHOP_RULES.rack} on the shelves. What will you make?`,
          DESIGNS.map(d => { const why = cantMake(biz, d.id); return { label: `${d.emoji} ${d.name[0].toUpperCase()}${d.name.slice(1)}`, sub: why ?? `${d.beads} shells + twine`, id: `make:${d.id}`, disabled: !!why, onClick: () => work.jewelry(d.id) }; }), 'Not now');
      } },
      { id: 'till', x: c.x + c.w / 2, y: c.y + c.d + 50, r: 130, label: () => (biz.shop.till ? `💰 Empty the till ($${biz.shop.till})` : '💰 The till'), run: () => {
        const n = emptyTill(biz);
        if (!n) { toast(biz.shop.rack.length ? '💰 Nothing in the till yet: visitors are browsing!' : '💰 Nothing in the till: make some jewelry for the shelves!'); return; }
        state.money += n; showMoney(); persist(); sfx.cash(Math.max(1, Math.round(n / 4)));
        toast(`💰 +$${n} from Bibs and Bobs! (${biz.shop.sold} sold so far)`);
      } },
      { id: 'shelves', x: 650, y: SHOP_ROOM.wall + 60, r: 110, priority: -0.2, label: '🛍️ Your shelves', run: () => {
        const r = biz.shop.rack;
        showCard('rack', '🛍️ On the shelves', r.length ? r.map(p => `${design(p.id).emoji} ${pieceName(p)} $${p.price}`).join(' · ') : 'Nothing yet: make something at the stringing table!', [], 'Close');
      } },
      { id: 'leave', x: SHOP_EXIT[0], y: SHOP_EXIT[1], r: 120, label: '🚪 Leave', run: leaveRoom },
    ];
  }
  // visitors, at Bibs and Bobs and the bakery: one every so often. Inside you see them walk in, look at
  // what's for sale and maybe buy; out in town, a sale just pops up (the money goes in the till either way)
  interface StoreCfg { id: 'shop' | 'bakery'; title: string; emoji: string; shop: () => Shop; exit: [number, number]; browse: (i: number) => [number, number]; spots: number;
    visit: (r?: () => number, at?: number) => StoreSold | null; gap: () => number; redraw: () => void; what: (id: string) => string; buy: string[]; pass: string[]; empty: string }
  type StoreSold = { id: string; price: number };
  const STORES: StoreCfg[] = [
    { id: 'shop', title: 'Bibs and Bobs', emoji: '🐚', shop: () => biz.shop, exit: SHOP_EXIT, browse: browseAt, spots: SHOP_PEGS.length, visit: (r, at) => shopVisit(biz, r, at), gap: () => visitGap(),
      redraw: () => redrawRack(), what: id => design(id).name, buy: ["I'll take it! 💰", 'Ooh, this one! 💰', 'Perfect! 💰'], pass: ['So pretty!', 'Maybe next time.', 'Lovely shells!', 'Hmm…'], empty: 'Nothing to buy yet!' },
    { id: 'bakery', title: "Nico's Bakery", emoji: '🧁', shop: () => biz.bakery, exit: BAKERY_EXIT, browse: caseBrowseAt, spots: CASE_SPOTS.length, visit: (r, at) => bakeryVisit(biz, r, at), gap: () => bakeryGap(),
      redraw: () => redrawCase(), what: id => recipe(id).name.replace(/s$/, '').replace('loave', 'loaf').replace('cookie', 'cookie'), buy: ['Yum, I\'ll have that! 💰', 'Smells amazing! 💰', 'One for me! 💰'], pass: ['Mmm, smells good!', 'Just looking!', 'Tomorrow, maybe.'], empty: 'Nothing baked yet!' },
  ];
  const visitIn: Record<string, number> = { shop: visitGap(), bakery: bakeryGap() };
  interface Shopper { view: PersonView; name: string; x: number; y: number; st: PoseState; to: [number, number][]; look: number; peg: number; said?: Text; store: StoreCfg }
  const shoppers: Shopper[] = [];
  const SHOPPER_SPEED = 150;
  function shopperArrives(store: StoreCfg) {
    const t = TOWNSFOLK[Math.floor(Math.random() * TOWNSFOLK.length)];
    const view = new PersonView(t.who); view.setZoom(zoom, resolution); room!.layer.addChild(view.root);
    const n = store.shop().rack.length, peg = n ? Math.floor(Math.random() * n) : Math.floor(Math.random() * store.spots);
    const [bx, by] = store.browse(peg), jitter = (Math.random() - 0.5) * 40, [ex, ey] = store.exit;
    shoppers.push({ view, name: t.name, x: ex, y: ey - 10, st: neutral('back'), to: [[ex, Math.min(ey - 60, by + 120)], [bx + jitter, by]], look: 3 + Math.random() * 2, peg, store });
    sfx.door();
  }
  function say(sh: Shopper, text: string) {
    sh.said?.destroy();
    const t = new Text({ text, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '800', fontSize: 22, fill: NAVY_TEXT, stroke: { color: '#FFFFFF', width: 6 } } });
    t.anchor.set(0.5, 1); sh.view.root.parent?.addChild(t); sh.said = t;
  }
  const NAVY_TEXT = '#2B3F55';
  function sold(store: StoreCfg, p: StoreSold, who: string) {
    sfx.cash(2);
    toast(`${store.emoji} ${who} bought your ${store.what(p.id)} for $${p.price}! ($${store.shop().till} in the till at ${store.title})`);
    persist();
  }
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  function stepShop(dt: number) {
    for (const store of STORES) {
      if (!isUnlocked(biz, store.id)) continue;
      store.shop().last = Date.now();
      if ((visitIn[store.id] -= dt) > 0) continue;
      visitIn[store.id] = store.gap();
      if (room?.kind === store.id) shopperArrives(store);
      else { const p = store.visit(); if (p) sold(store, p, pick(TOWNSFOLK).name); }
    }
    for (const sh of shoppers) {
      if (sh.to.length) {
        const [tx, ty] = sh.to[0], dx = tx - sh.x, dy = ty - sh.y, d = Math.hypot(dx, dy), st = Math.min(d, SHOPPER_SPEED * dt);
        const vx = d ? dx / d * SHOPPER_SPEED : 0, vy = d ? dy / d * SHOPPER_SPEED : 0;
        sh.x += d ? dx / d * st : 0; sh.y += d ? dy / d * st : 0;
        Object.assign(sh.st, chooseView(vx, vy, sh.st)); stepGait(sh.st, SHOPPER_SPEED, vy, dt);
        if (d < 2) sh.to.shift();
      } else if (sh.look > 0) {
        Object.assign(sh.st, { view: 'back' }); stepGait(sh.st, 0, 0, dt);
        sh.look -= dt;
        if (sh.look <= 0) {
          // made up their mind
          const s0 = sh.store, p = s0.shop().rack.length ? s0.visit(Math.random, sh.peg) : null;
          if (p) { say(sh, pick(s0.buy)); sold(s0, p, sh.name); s0.redraw(); }
          else say(sh, s0.shop().rack.length ? pick(s0.pass) : s0.empty);
          sh.to.push([s0.exit[0], Math.min(s0.exit[1] - 60, sh.y + 120)], [s0.exit[0], s0.exit[1] + 40]);
          sh.look = -1;
        }
      }
      sh.view.pose(sh.x, sh.y, sh.st); sh.view.root.zIndex = sh.y;
      if (sh.said) { sh.said.position.set(sh.x, sh.y - 150); sh.said.zIndex = 99999; }
    }
    for (let i = shoppers.length - 1; i >= 0; i--) {
      const sh = shoppers[i];
      if (sh.look < 0 && !sh.to.length) { sh.said?.destroy(); sh.view.root.destroy({ children: true }); shoppers.splice(i, 1); }
    }
  }
  /** Leaving a shop: anyone still browsing goes too. */
  function clearShoppers() { for (const sh of shoppers) { sh.said?.destroy(); sh.view.root.destroy({ children: true }); } shoppers.length = 0; }
  // ---- Nico's Bakery: an outline with a price till it's bought; inside, the oven, the case, the pantry
  const BAKERY_DOOR = doorOf(BAKERY);
  const bakeryRect = { x: BAKERY.x, y: BAKERY.y, w: BAKERY.w, d: BAKERY.d };
  const bakeryBox = { x: BAKERY.x - 10, y: BAKERY.y - BAKERY.h - 10, w: BAKERY.w + 20, h: BAKERY.d + BAKERY.h + 20 };
  let bakeryOutline: Container | null = null;
  function placeBakery(slap: boolean) {
    bakeryOutline?.destroy({ children: true }); bakeryOutline = null;
    const v = drawBuilding(BAKERY); layer.addChild(v);
    if (!SOLIDS.includes(bakeryRect)) SOLIDS.push(bakeryRect);
    if (slap) slapIn(v, BAKERY.x + BAKERY.w / 2, BAKERY.y + BAKERY.d, bakeryBox);
  }
  if (isUnlocked(biz, 'bakery')) placeBakery(false);
  else { bakeryOutline = outlineArt(bakeryBox.x, bakeryBox.y, bakeryBox.w, bakeryBox.h, "🧁 Nico's Bakery", unlockOf('bakery').price); bakeryOutline.zIndex = BAKERY.y - BAKERY.h; layer.addChild(bakeryOutline); }
  const bakerySpot: Spot = { id: 'bakery', x: BAKERY_DOOR[0], y: BAKERY_DOOR[1], r: 130,
    label: () => (isUnlocked(biz, 'bakery') ? '🚪 Go in' : `✨ Nico's Bakery · $${unlockOf('bakery').price}`),
    run: () => {
      if (isUnlocked(biz, 'bakery')) { enterBakery(); return; }
      unlockCard('bakery', () => {
        placeBakery(true); biz.bakery.last = Date.now();
        if (!freeAt(nico.x, nico.y, SOLIDS, WORLD)) { nico.x = BAKERY_DOOR[0]; nico.y = BAKERY_DOOR[1] + 20; }
      });
    } };
  // ---- Biscuit, Nico's dog: buy the doghouse in his yard and a dog comes with it (dog.ts)
  const DOGHOUSE: [number, number] = [660, 1895];
  const dogBox = { x: DOGHOUSE[0] - 80, y: DOGHOUSE[1] - 145, w: 160, h: 160 }, dogRect = { x: DOGHOUSE[0] - 58, y: DOGHOUSE[1] - 40, w: 116, d: 42 };
  let dogOutline: Container | null = null, dog: DogState | null = null, dogView: DogView | null = null, dogTrick = 0;
  function placeDog(slap: boolean) {
    dogOutline?.destroy({ children: true }); dogOutline = null;
    const v = doghouseArt(DOGHOUSE[0], DOGHOUSE[1], DOG.name); layer.addChild(v);
    if (!SOLIDS.includes(dogRect)) SOLIDS.push(dogRect);
    if (slap) slapIn(v, DOGHOUSE[0], DOGHOUSE[1], dogBox);
    const [mx, my] = here();
    dog = freshDog(slap ? DOGHOUSE[0] : mx - 60, slap ? DOGHOUSE[1] + 40 : my + 10);
    dogView = new DogView(); layer.addChild(dogView.view);
  }
  if (isUnlocked(biz, 'doghouse')) placeDog(false);
  else { dogOutline = outlineArt(dogBox.x, dogBox.y, dogBox.w, dogBox.h, '🐶 A dog', unlockOf('doghouse').price); dogOutline.zIndex = dogBox.y; layer.addChild(dogOutline); }
  const dogSpot: Spot = { id: 'doghouse', x: DOGHOUSE[0], y: DOGHOUSE[1] + 40, r: 110, when: () => !isUnlocked(biz, 'doghouse'),
    label: () => `✨ A dog · $${unlockOf('doghouse').price}`,
    run: () => unlockCard('doghouse', () => {
      placeDog(true); sfx.bark();
      if (!freeAt(nico.x, nico.y, SOLIDS, WORLD)) { nico.y = DOGHOUSE[1] + 50; }
      toast(`🐶 Meet ${DOG.name}! He'll follow you everywhere. Kick the ball near him and he'll fetch it.`);
    }) };
  // pet him: a happy wiggle, a woof, and a little energy
  const petSpot: Spot = { id: 'dog', x: -1e5, y: 0, r: 80, priority: -0.2, when: () => !!dog && !room && mode === 'walk',
    label: () => `🐶 Pet ${DOG.name}`,
    run: () => { if (!dog) return; sfx.bark(); dogTrick = 1.2; dust.puff(dog.x, dog.y - 60, '#F06A8A', 6, 80, 10); boost = Math.min(BOOST.max, boost + 3); toast(pick([`${DOG.name} wags his whole body!`, `${DOG.name} rolls over for a tummy rub.`, `Good boy, ${DOG.name}!`])); } };
  function caseArtNow(): Container {
    const c = new Container();
    biz.bakery.rack.forEach((p, i) => { const g = bakedArt(p.id); g.position.set(...CASE_SPOTS[i]); g.scale.set(1.2); c.addChild(g); });
    c.zIndex = BAKERY_SLOTS.case.y + 1; return c;
  }
  function redrawCase() { if (room?.kind !== 'bakery') return; room.rack?.destroy({ children: true }); room.rack = caseArtNow(); room.layer.addChild(room.rack); }
  function enterBakery() {
    const { view, layer: rl } = drawBakeryRoom(), { back, glass } = caseArt(), rack = caseArtNow();
    rl.addChild(ovenArt(), mixTableArt(), back, rack, glass, pantryArt(), bakeryCounterArt());
    const box = (q: { x: number; y: number; w: number; d: number }) => ({ x: q.x, y: q.y, w: q.w, d: q.d }), S = BAKERY_SLOTS;
    showRoom({ kind: 'bakery', id: 'bakery', w: BAKERY_ROOM.w, h: BAKERY_ROOM.h, view, layer: rl, rack,
      solids: [{ x: 0, y: 0, w: BAKERY_ROOM.w, d: BAKERY_ROOM.wall + 14 }, box(S.oven), box(S.table), box(S.case), box(S.counter), box(S.pantry)] }, [BAKERY_EXIT[0], BAKERY_EXIT[1] - 70]);
    sfx.door();
    visitIn.bakery = Math.min(visitIn.bakery, 4);
  }
  const ING = ['flour', 'sugar', 'butter', 'egg', 'chocolate'];
  const pantryLine = () => ING.map(k => `${item(k).label.split(' ')[0]}×${biz.items[k] ?? 0}`).join('  ');
  function showPantry() {
    const buy = (cost: number, then: () => void) => () => { if (state.money < cost) return; state.money -= cost; then(); showMoney(); persist(); sfx.tap(); showPantry(); };
    showCard('pantry', '🥫 The pantry', `In stock: ${pantryLine()}. (Eggs are free at the farm's hen house!)`, [
      ...RECIPES.map(r => { const kit = Object.entries(r.needs).map(([k, n]) => [k, Math.max(0, n - (biz.items[k] ?? 0))] as [string, number]).filter(([, n]) => n > 0),
        cost = kit.reduce((t, [k, n]) => t + n * PANTRY.find(q => q.id === k)!.price, 0);
        return { label: `${r.emoji} Everything for ${r.name}`, sub: kit.length ? `$${cost}` : 'you have it all', id: `kit:${r.id}`, disabled: !kit.length || state.money < cost,
          onClick: buy(cost, () => { for (const [k, n] of kit) add(biz, k, n); toast(`${r.emoji} Ready to bake ${r.name}!`); }) }; }),
      ...PANTRY.map(q => ({ label: item(q.id).label, sub: `$${q.price}`, id: `ing:${q.id}`, disabled: state.money < q.price, onClick: buy(q.price, () => add(biz, q.id)) })),
    ], 'Close');
  }
  function bakerySpots(): Spot[] {
    const S = BAKERY_SLOTS;
    return [
      { id: 'bake', x: S.table.x + S.table.w / 2, y: S.table.y + S.table.d + 50, r: 130, label: '🥣 Bake something', run: () => {
        showCard('bake', '🥣 The mixing table', `Ingredients: ${pantryLine()}. ${biz.bakery.rack.length}/${BAKERY_RULES.rack} in the display case. What will you bake?`,
          RECIPES.map(r => { const why = cantBake(biz, r.id); return { label: `${r.emoji} ${r.name[0].toUpperCase()}${r.name.slice(1)}`, sub: why ?? `makes ${r.makes} · $${r.price} each`, id: `bake:${r.id}`, disabled: !!why, onClick: () => work.bake(r.id) }; }), 'Not now');
      } },
      { id: 'pantry', x: S.pantry.x + S.pantry.w / 2, y: S.pantry.y + S.pantry.d + 60, r: 120, label: '🥫 The pantry', run: showPantry },
      { id: 'till', x: S.counter.x + S.counter.w / 2, y: S.counter.y + S.counter.d + 50, r: 130, label: () => (biz.bakery.till ? `💰 Empty the till ($${biz.bakery.till})` : '💰 The till'), run: () => {
        const n = bakeryEmpty(biz);
        if (!n) { toast(biz.bakery.rack.length ? '💰 Nothing in the till yet: customers are on their way!' : '💰 Nothing in the till: bake something for the display case!'); return; }
        state.money += n; showMoney(); persist(); sfx.cash(Math.max(1, Math.round(n / 4)));
        toast(`💰 +$${n} from the bakery! (${biz.bakery.sold} sold so far)`);
      } },
      { id: 'leave', x: BAKERY_EXIT[0], y: BAKERY_EXIT[1], r: 120, label: '🚪 Leave', run: leaveRoom },
    ];
  }
  /** The workbench: one button per idea (the hands-on first build, then quick builds once it's designed). */
  function workbenchCard() {
    const shelf = biz.finds.map(f => item(f.id).label.split(' ')[0]).join(' ');
    const made = PRODUCTS.filter(q => biz.stock[q.id]).map(q => `${q.emoji}×${biz.stock[q.id]}`).join(' ');
    const lines = [`Parts: ${partsLine()}.`, ...(shelf ? [`On the shelf: ${shelf}`] : []), ...(made ? [`Ready to sell: ${made}`] : [])];
    showCard('workbench', '🛠️ Your workbench', lines.join(' '), unlockedProducts(biz).map(q => {
      const ready = has(biz, q.recipe), proven = biz.designs.includes(q.id);
      return proven
        ? { label: `${q.emoji} Build a ${q.name}`, sub: ready ? `${PLANS[q.id].steps.length} quick steps` : `need ${needLine(q.recipe)}`, id: `quick:${q.id}`, disabled: !ready, onClick: () => work.quick(q.id) }
        : { label: `${q.emoji} Build the ${q.name}`, sub: ready ? 'your first one!' : `need ${needLine(q.recipe)}`, id: `build:${q.id}`, disabled: !ready, onClick: () => work.build(q.id) };
    }));
  }
  /** What Nico can do inside the room he's in. */
  function roomSpots(): Spot[] {
    if (!room) return [];
    if (room.kind === 'shed') return shedSpots();
    if (room.kind === 'shop') return shopSpots();
    if (room.kind === 'home') return homeSpots();
    if (room.kind === 'bakery') return bakerySpots();
    if (room.kind === 'inside') return insideSpots();
    if (room.kind === 'hall') return [
      ...DOOR_NAMES.map((nm, i) => {
        const st = doorState(biz, i), u = st === 'sale' ? doorUnit(biz, i) : null;
        return { id: `door${i}`, x: doorX(i), y: HALL_ROOM.wall + 60, r: 120,
          label: st === 'sale' ? `📦 Unit ${nm}: $${u!.price}` : st === 'yours' ? `🚪 Into Unit ${nm}` : st === 'sold' ? `Unit ${nm}: sold` : `🔒 Unit ${nm}`,
          run: () => useDoor(i) };
      }),
      { id: 'clerk', x: HALL_DESK.x + HALL_DESK.w / 2, y: HALL_DESK.y + HALL_DESK.d + 50, r: 110, label: biz.finds.length ? '💰 Sell your finds' : '🗒️ Office', run: atOffice },
      { id: 'leave', x: HALL_EXIT[0], y: HALL_EXIT[1], r: 130, label: '🚪 Leave', run: leaveRoom },
    ];
    if (room.kind === 'unit') return [
      ...(biz.unit?.items ?? []).map(it => {
        const [x, y] = unitSlot(it.slot);
        return { id: `find${it.slot}`, x, y: y + 30, r: 85, label: `${item(it.id).label}`, run: () => sortFind(it.slot) };
      }),
      { id: 'leave', x: UNIT_EXIT[0], y: UNIT_EXIT[1], r: 120, label: '🚪 Back to the hallway', run: leaveRoom },
    ];
    const r = room.diner!;
    return [
      { id: 'order', x: r.order[0], y: r.order[1], r: 110, label: carrying ? '🍔 Find a table' : '🍔 Order', run: () => orderAt(r.id) },
      ...r.tables.map(([x, y], i) => ({ id: `table${i}`, x, y: y + SEAT, r: 90, label: carrying ? '🍽️ Sit and eat' : '🪑 Sit down', run: () => sitAt(i) })),
      { id: 'leave', x: r.door[0], y: r.door[1], r: 110, label: '🚪 Leave', run: leaveRoom },
    ];
  }
  // ---- inside buildings (Burger Barn): order at the counter, carry the tray to a table, eat
  const trayView = trayArt('🍔'); trayView.visible = false;
  let tableTray: { view: { destroy(): void } } | null = null;
  /** Swap in a room (from the town, or from another room of the same building: the hallway and a unit). */
  function showRoom(next: Omit<NonNullable<typeof room>, 'outside'>, at: [number, number], face: View = 'back') {
    const outside: [number, number] = room ? room.outside : [nico.x, nico.y];
    if (room) { clearShoppers(); layer.addChild(nico.view.root); trayView.removeFromParent(); room.view.destroy({ children: true }); }
    room = { ...next, outside };
    app.stage.addChildAt(room.view, app.stage.getChildIndex(world) + 1); room.view.scale.set(zoom);
    world.visible = false; minimap.view.visible = false;
    room.layer.addChild(nico.view.root, trayView);
    [nico.x, nico.y] = at; Object.assign(nico.st, { view: face });
    persist();
  }
  function enterRoom(id: string) {
    const r = ROOMS[id], place = PLACES.find(p => p.building === id)!;
    const { view, layer: rl } = drawRoom(r, (place.menu ?? []).map(m => ({ label: m.label, price: m.price })));
    const worker = new PersonView(r.worker.who); worker.setZoom(zoom, resolution); rl.addChild(worker.root);
    worker.pose(r.worker.x, r.worker.y, neutral('front')); worker.root.zIndex = r.worker.y;
    showRoom({ kind: 'diner', id, w: r.w, h: r.h, view, layer: rl, solids: roomSolids(r), worker, diner: r }, r.enter);
    sfx.door();
  }
  // ---- the storage building: a hallway of doors; buy one, go in, sort what's inside
  function enterHall(atDoor: number | null = null) {
    ensureWanted(biz, wanted());
    const { view, layer: rl, doors } = drawHall();
    const worker = new PersonView('clerk'); worker.setZoom(zoom, resolution); rl.addChild(worker.root);
    worker.pose(HALL_DESK.x + HALL_DESK.w / 2, HALL_DESK.y - 8, neutral('front')); worker.root.zIndex = HALL_DESK.y - 8;
    const at: [number, number] = atDoor === null ? [HALL_EXIT[0], HALL_EXIT[1] - 60] : [doorX(atDoor), HALL_ROOM.wall + 70];
    showRoom({ kind: 'hall', id: 'storage', w: HALL_ROOM.w, h: HALL_ROOM.h, view, layer: rl, worker, doors, painted: [],
      solids: [{ x: 0, y: 0, w: HALL_ROOM.w, d: HALL_ROOM.wall + 14 }, { x: HALL_DESK.x, y: HALL_DESK.y - 10, w: HALL_DESK.w, d: HALL_DESK.d + 10 }] }, at, atDoor === null ? 'back' : 'front');
    paintDoors();
  }
  /** Keep the doors' signs, notes and peeks up to date (repainted only when something changes). */
  function paintDoors() {
    if (room?.kind !== 'hall') return;
    const ap = biz.skills.includes('appraiser'), want = wanted();
    DOOR_NAMES.forEach((nm, i) => {
      const st = doorState(biz, i), d = biz.doors[i];
      let sign = `${nm}`, note = '', peek = '';
      if (st === 'sale') { const u = doorUnit(biz, i), [lo, hi] = guess(u, ap || !!u.starter); sign = `${nm} · $${u.price}`; note = `worth ~$${lo}–$${hi}`; peek = peekOf(u, want).map(id => item(id).label.split(' ')[0]).join(' ') + ' ❓'; }
      if (st === 'yours') { sign = `${nm} · YOURS`; note = `${biz.unit!.items.length} left to sort`; }
      if (st === 'sold') { const t = Math.ceil(d.sold); sign = `${nm} · SOLD`; note = `new stuff in ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }
      if (st === 'locked') { sign = `${nm} · 🔒`; note = 'buy Unit A first'; }
      const key = [st, sign, note, peek].join('|');
      if (room!.painted![i] !== key) { room!.painted![i] = key; paintDoor(room!.doors![i], i, st, sign, note, peek); }
    });
  }
  function useDoor(i: number) {
    const st = doorState(biz, i), nm = DOOR_NAMES[i];
    if (st === 'yours') { enterUnit(); return; }
    if (st === 'sold') { const t = Math.ceil(biz.doors[i].sold); toast(`Unit ${nm} is empty. New stuff arrives in ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}.`); return; }
    if (st === 'locked') { toast('Start with Unit A: it\'s a good one to begin with.'); return; }
    const u = doorUnit(biz, i), ap = biz.skills.includes('appraiser'), [lo, hi] = guess(u, ap || !!u.starter), want = wanted();
    const sorting = biz.unit ? `You're still sorting Unit ${biz.unit.name}: finish that one first.` : '';
    const seen = peekOf(u, want).map(id => item(id).label).join(' and ');
    showCard(`door${i}`, `Unit ${nm} · ${u.size}`, `${sorting || `Through the gap under the door you can see ${seen}.`} It's probably worth about $${lo}–$${hi}.${u.starter ? ' ⭐ A good first buy!' : ''}`, [
      { label: `📦 Buy it`, sub: `$${u.price}`, id: 'buy', disabled: !!biz.unit || u.price > state.money, onClick: () => {
        if (!buyDoor(biz, i, state.money)) return;
        state.money -= u.price; showMoney(); sfx.door(); persist(); paintDoors();
        toast(`Unit ${nm} is yours! Walk on in.`);
      } },
    ], 'Not now');
  }
  function atOffice() {
    const n = biz.finds.length, worth = shelfValue(biz);
    showCard('office', 'Storage office', n ? `Clerk: "Selling some of your finds? I'll give you $${worth} for all ${n}."` : 'Clerk: "Buy a unit, sort through it, keep what you like. One unit at a time, mind!"', n ? [
      { label: `💰 Sell all ${n} kept find${n === 1 ? '' : 's'}`, sub: `$${worth}`, id: 'sellshelf', onClick: () => {
        let got = 0; for (const f of [...biz.finds]) got += sellOne(biz, f.id, f.value);
        state.money += got; showMoney(); persist(); sfx.cash(n); toast(`Sold ${n} find${n === 1 ? '' : 's'} for $${got}`);
      } }] : [], 'Close');
  }
  function enterUnit() {
    const u = biz.unit; if (!u) return;
    const { view, layer: rl } = drawUnit(), finds = new Map<number, Container>();
    for (const it of u.items) { const [x, y] = unitSlot(it.slot), a = findArt(item(it.id).label.split(' ')[0]); a.position.set(x, y); a.zIndex = y; rl.addChild(a); finds.set(it.slot, a); }
    showRoom({ kind: 'unit', id: `unit${u.door}`, w: UNIT_ROOM.w, h: UNIT_ROOM.h, view, layer: rl, finds, solids: unitSolids() }, [UNIT_EXIT[0], UNIT_EXIT[1] - 70]);
    sfx.door();
  }
  const unitSolids = (): Box[] => [{ x: 0, y: 0, w: UNIT_ROOM.w, d: UNIT_ROOM.wall + 14 },
    ...(biz.unit?.items ?? []).map(it => { const [x, y] = unitSlot(it.slot); return { x: x - 30, y: y - 14, w: 60, d: 18 }; })];
  /** Walk up to a find: sell it, keep it, or bin it. */
  function sortFind(slot: number) {
    const it = biz.unit?.items.find(q => q.slot === slot); if (!it) return;
    const t = item(it.id), ap = biz.skills.includes('appraiser'), price = sellPrice(it.value, ap), want = wanted() === it.id;
    const part = t.kind === 'part';
    const choose = (c: Choice) => () => {
      const name = biz.unit!.name, r = decide(biz, slot, c);
      room?.finds?.get(slot)?.destroy({ children: true }); room?.finds?.delete(slot);
      if (room?.kind === 'unit') room.solids = unitSolids();
      if (c === 'sell') { state.money += r.money; showMoney(); sfx.cash(Math.max(1, Math.round(r.money / 3))); }
      else if (c === 'keep') sfx.snap(); else sfx.boing();
      toast(c === 'sell' ? `Sold ${t.label} for $${r.money}` : c === 'keep' ? `${t.label}: ${part ? 'into your parts box' : 'on your shelf at home'}` : `${t.label}: in the bin`);
      if (r.done) {
        const sk = unlocks(biz);
        setTimeout(() => toast(`📦 Unit ${name} all sorted! The door's locked till new stuff comes in.`), 1600);
        for (const k of sk) setTimeout(() => showSkill(k), 2400);
      }
      persist();
    };
    showCard(`find${slot}`, t.label, `${price > 0 ? `It would sell for $${price}.` : 'Nobody would buy this.'}${want ? ' ⭐ Someone asked you to find one of these!' : part ? ' A part for your workbench.' : ''}`, [
      { label: '💰 Sell', sub: price > 0 ? `$${price}` : 'worth nothing', id: 'sell', disabled: price <= 0, onClick: choose('sell') },
      { label: want ? '⭐ Keep it' : part ? '🔧 Keep (part)' : '🏠 Keep', sub: part ? 'parts box' : 'your shelf', id: 'keep', onClick: choose('keep') },
      { label: '🗑️ Trash', sub: 'throw it out', id: 'trash', onClick: choose('trash') },
    ], 'Later');
  }
  function leaveRoom() {
    if (!room) return;
    clearShoppers();
    if (room.kind === 'unit') { enterHall(biz.unit?.door ?? Number(room.id.slice(4))); return; }   // out of a unit: back in the hallway at its door
    const [ox, oy] = room.outside;
    layer.addChild(nico.view.root); trayView.removeFromParent(); trayView.visible = false; tableTray?.view.destroy(); tableTray = null;
    room.view.destroy({ children: true }); room = null;
    world.visible = true; minimap.view.visible = true;
    nico.x = ox; nico.y = oy + 30; Object.assign(nico.st, { view: 'front' });
    if (carrying) { toast('You ate your lunch on the way out. Yum!'); boost = Math.min(BOOST.max, boost + carrying.boost); carrying = null; }
    persist();
  }
  function orderAt(id: string) {
    const place = PLACES.find(p => p.building === id)!;
    if (carrying) { toast(`Cook: "Enjoy your ${carrying.label.split(' ').slice(1).join(' ').toLowerCase()}! Grab a table."`); return; }
    showCard(`order:${id}`, place.title, `Cook: "Hi there! What can I get you?"`, (place.menu ?? []).map(m => ({
      label: m.label, sub: `$${m.price}`, id: m.id, disabled: m.price > state.money,
      onClick: () => {
        if (m.price > state.money) return;
        state.money -= m.price; showMoney(); persist(); sfx.tap();
        carrying = { label: m.label, boost: m.boost };
        trayView.removeChildren().forEach(c => c.destroy()); trayView.addChild(...trayArt(m.label.split(' ')[0]).removeChildren()); trayView.visible = true;
        toast(`Cook: "One ${m.label.split(' ').slice(1).join(' ').toLowerCase()}, coming up! Find a table."`);
      },
    })), 'Not now');
  }
  function sitAt(i: number) {
    if (!room) return;
    const [tx, ty] = room.diner!.tables[i];
    mode = 'play'; play = { kind: 'eat', t: 0, from: [tx - STOOL, ty + 12], seat: i };   // on the left stool
    if (carrying) { trayView.visible = false; const t = trayArt(carrying.label.split(' ')[0]); t.position.set(tx - 10, ty - TABLE_TOP + 4); t.zIndex = ty + 15; room.layer.addChild(t); tableTray = { view: t }; }
  }
  function startDig() {
    const n = treasure.nearest(nico.x, nico.y);
    if (n.d > DETECT.dig) return;
    mode = 'play'; play = { kind: 'dig', t: 0, from: [nico.x, nico.y], seat: n.i }; sfx.dig();
  }
  function dugTreasure(at: [number, number]) {
    const i = treasure.nearest(at[0], at[1] + 50).i;
    const got = treasure.dig(i);
    const hole = holeArt(); hole.position.set(at[0] + 4, at[1] + 54); hole.zIndex = at[1] + 40; layer.addChild(hole); holes.push({ view: hole, t: 20 });
    if (got.what === 'cash') { state.money += got.cash; showMoney(); sfx.coin(); toast(`📡 Dug up $${got.cash} in old coins!`); }
    else { const v = dugUp(biz, got.what); sfx.sparkle(); toast(`📡 Dug up ${item(got.what).label}! (worth about $${v}: it's on your shelf)`); }
    persist();
  }
  function showBag() {
    const kinds = SHELL_KINDS.filter(k => biz.found.includes(k.id));
    const shellLine = kinds.length ? kinds.map(k => `${k.label} ×${biz.shells[k.id] ?? 0}`).join(', ') : 'none yet: look along the beach!';
    const shelf = biz.finds.map(f => item(f.id).label.split(' ')[0]).join(' ') || 'nothing yet';
    const tools = TOOLS.filter(t => biz.tools.includes(t.id)).map(t => t.label).join(', ') || 'none yet (Parts & Tools)';
    const pics = Object.keys(ANIMAL_KINDS).filter(k => biz.photos[k]);
    const photoLine = pics.length ? pics.map(k => `${ANIMAL_KINDS[k as keyof typeof ANIMAL_KINDS].label} ${'★'.repeat(biz.photos[k])}`).join(', ') : 'none yet (a camera from Parts & Tools)';
    showCard('bag', '🎒 Your backpack', `🐚 Shells (${kinds.length} of ${SHELL_KINDS.length} kinds): ${shellLine}.  📷 Photos (${pics.length} of ${Object.keys(ANIMAL_KINDS).length} animals): ${photoLine}.  🏠 On your shelf: ${shelf}.  🧰 Tools: ${tools}.`, [], 'Close');
  }
  document.getElementById('bag')!.addEventListener('click', showBag);
  const detectorEl = document.getElementById('detector')!;

  const digSpot: Spot = { id: 'dig', x: 0, y: 0, r: DETECT.dig, priority: 0.8, label: '⛏️ Dig!', run: startDig,
    when: () => mode === 'walk' && !room && biz.tools.includes('detector') };
  const spots: Spot[] = [
    { id: 'car', x: 0, y: 0, r: 110, label: 'Get in', run: getIn, when: () => mode === 'walk' },
    { id: 'slide', x: SLIDE_START[0], y: SLIDE_START[1] + 20, r: 90, label: 'Slide!', run: startSlide },
    { id: 'swing', x: (seatX(0) + seatX(1)) / 2, y: SWINGS.y + 25, r: 110, label: 'Swing', run: startSwing, priority: 0.6 },   // even with Primo on the other swing
    ...PROPS.filter(p => p.kind === 'bench').map((p, i) => ({ id: `bench${i}`, x: p.x, y: p.y + 30, r: 70, label: 'Sit', run: () => sitOnBench(p.x, p.y) })),
    ...PLACES.map(p => {
      const [x, y] = doorOf(BUILDINGS.find(b => b.id === p.building)!);
      return { id: p.building, x, y, r: 70, label: INTERIORS[p.building] ? '🚪 Go in' : p.action ?? 'Go in', run: () => (INTERIORS[p.building] ? enterInside(p.building) : (BIZ_DOORS[p.building] ?? showPlace)(p)) };
    }),
  ];
  // ---- people Nico knows, on their routines; walk up to one to say hi
  interface Local { t: Townie; orig: Townie; w: Walk; st: PoseState; view: PersonView; swingT: number; seat: number; said: number; bubble?: { visible: boolean }; trip: [number, number][]; met: [number, number] | null; climb?: { b: typeof BUILDINGS[number]; t: number; dur: number } | null }
  const locals: Local[] = TOWNSFOLK.map(t => {
    const view = new PersonView(t.who);
    layer.addChild(view.root);
    const r = t.route[0];
    return { t, orig: t, w: { i: 0, x: r.x, y: r.y, wait: 0, vx: 0, vy: 0 }, st: neutral('front'), view, swingT: -1, seat: -1, said: 0, trip: [], met: null };
  });
  // ---- play as a friend (Nico: switch between Nico, James, Primo and Tempo). Whoever you play as hands
  // their routine to Nico: play as James and Nico walks James's rounds (and says hi like he would)
  const NICO_LINES = ["Hey! It's me, Nico!", 'Want to come to my bakery?', 'I found a starfish on the beach!', 'Race you to the playground!'];
  /** Give someone a new look (a new PersonView in the same place, the job bubble moved over). */
  function relook(o: { view: PersonView; bubble?: { visible: boolean } }, who: string) {
    const old = o.view, parent = old.root.parent, v = new PersonView(who);
    v.setZoom(zoom, resolution); if (low) v.setLow(true);
    v.root.visible = old.root.visible; v.root.zIndex = old.root.zIndex; v.root.position.copyFrom(old.root.position);
    if (o.bubble) { const b = o.bubble as unknown as Container; b.removeFromParent(); v.root.addChild(b); }
    parent?.addChild(v.root); old.root.destroy({ children: true }); o.view = v;
  }
  function playAs(who: string) {
    for (const l of locals) {
      const want = l.orig.who === who ? { ...l.orig, who: 'nico', name: 'Nico', lines: NICO_LINES } : l.orig;
      if (l.t.who !== want.who) { l.t = want; relook(l, want.who); }
    }
    if (nico.view.who !== who) relook(nico, who);
    player = who;
  }
  document.getElementById('who')!.addEventListener('click', () => {
    if (mode !== 'walk') { toast(mode === 'drive' ? 'Park the car first!' : 'Finish what you\'re doing first!'); return; }
    showCard('who', '👤 Who do you want to play as?', 'Whoever you pick, Nico takes their place walking round town.', PLAYABLE.map(([w, name]) => ({
      label: name, sub: w === player ? 'playing' : '', id: `who:${w}`, disabled: w === player || (!!job && job.job.giver === w),
      onClick: () => { playAs(w); persist(); sfx.sparkle(); dust.puff(nico.x, nico.y - 40, '#FFFFFF', 8, 120, 14); toast(`👤 Now playing as ${name}!`); },
    })), 'Close');
  });
  // ---- odd jobs: people with a job show a "!"; talk to them to take it on
  const jobWait: Record<string, number> = {};   // seconds until a job is offered again
  // item requests ("can you find me a radio?"): one at a time, now and then, once Nico has bought a unit
  let wantOffer: { giver: string; item: string; left: number } | null = null, wantIn = WANT.first;
  const offers = (who: string) => {
    if (job) return null;
    if (wantOffer?.giver === who) return jobById(`want:${who}:${wantOffer.item}`);
    const j = jobFor(who); return j && !(jobWait[j.id] > 0) ? j : null;
  };
  const wanted = () => { const st = job && jobStep(job); return st && st.kind === 'bring' ? st.item : null; };
  const finishing = (who: string) => {
    if (!job || job.job.giver !== who) return false;
    const st = jobStep(job);
    return st.kind === 'return' || (st.kind === 'bring' && owns(state.biz, st.item));
  };
  function payJob() {
    if (!job) return;
    const st = jobStep(job);
    if (st.kind === 'bring' && !take(state.biz, st.item)) return;   // (hand it over)
    const j = job.job, name = locals.find(l => l.t.who === j.giver)?.t.name ?? '';
    state.money += j.reward; showMoney(); persist(); sfx.coin();
    toast(`${name}: “${j.thanks}” +$${j.reward}`);
    jobWait[j.id] = j.cooldown; job = null;
  }
  function talkTo(l: Local) {
    if (l.climb) { toast(`${l.t.name}: “${['Look at me! I\'m on the roof!', 'You can see the whole town from up here!', 'Shh, don\'t tell anyone I\'m up here!'][l.said++ % 3]}”`); return; }
    if (finishing(l.t.who)) { payJob(); return; }
    const w = wanted();
    if (w && job!.job.giver === l.t.who) { toast(`${l.t.name}: “Any luck finding ${item(w).label}? The storage units might have one.”`); return; }
    const j = offers(l.t.who);
    if (j) {
      showCard(`job:${j.id}`, l.t.name, j.ask, [{ label: 'Sure!', sub: `+$${j.reward}`, id: 'accept', onClick: () => { job = startJob(j); if (wantOffer?.giver === j.giver) wantOffer = null; persist(); toast(`📋 ${j.title}`); } }], 'Not now');
      return;
    }
    toast(`${l.t.name}: “${l.t.lines[l.said++ % l.t.lines.length]}”`);
  }
  for (const l of locals) {
    spots.push({
      // someone waiting to be told a job's done beats the door they're standing at; someone with a job to
      // offer ties with it (the nearer wins); just saying hi never blocks a door
      id: l.t.who, x: 0, y: 0, r: 90, priority: () => (finishing(l.t.who) ? 0.5 : offers(l.t.who) ? 0 : -0.1),
      label: () => finishing(l.t.who) ? `Finish job ✔` : offers(l.t.who) ? `Talk to ${l.t.name} ❗` : `Say hi to ${l.t.name}`,
      run: () => talkTo(l),
    });
    if (jobFor(l.t.who)) { const b = drawBubble(); b.position.set(0, -172); b.scale.set(1.25); b.visible = false; l.view.root.addChild(b); l.bubble = b; }
  }
  const jobSpot: Spot = {
    id: 'job', x: 0, y: 0, r: 80, priority: 1, label: () => (job && jobStep(job).kind === 'go' ? (jobStep(job) as { label: string }).label : ''),
    when: () => !!job && jobStep(job).kind === 'go',
    run: () => {
      if (!job) return;
      const label = (jobStep(job) as { label: string }).label;
      toast(label.startsWith('Water') ? '💧 Watered!' : `✔ ${label}`);
      if (advanceJob(job)) payJob();
    },
  };
  spots.push(jobSpot, digSpot, cameraSpot, shedSpot, shopSpot, bakerySpot,
    dogSpot, petSpot,
    { id: 'waterslide', x: WSLIDE.x, y: WSLIDE.y + 40, r: 80, label: '🛝 Water slide!', run: startWaterslide },
    { id: 'swim', x: POOL.x + POOL.w / 2, y: POOL.y + POOL.d + 50, r: 200, label: '🏊 Jump in', run: () => startSwim(nico.x, POOL.y + POOL.d - 40) });
  const cat = drawCat(); cat.visible = false; layer.addChild(cat);
  const jobEl = document.getElementById('job')!;
  jobEl.addEventListener('click', () => {
    if (!job) return;
    const j = job.job;
    showCard('job:quit', j.title, `Right now: ${jobStep(job).note}.`, [{ label: 'Give up the job', id: 'quit', onClick: () => { toast('Job dropped.'); job = null; } }], 'Keep going');
  });
  /** Stand still, turned toward Nico. */
  /** Back from a job's meeting place: the same legs in reverse (before the start point). */
  function meetBack(l: Local): [number, number][] {
    const m = jobFor(l.t.who)?.meet; if (!m || !l.met) return [];
    return [...m.slice(0, -1).reverse(), [m[0][0], l.met[1]]];
  }
  /** Gone in somewhere on their rounds (Yia-Yia in her studio): out of sight. */
  const gone = (l: Local) => l.w.wait > 0 && !!l.t.route[l.w.i].inside && !l.trip.length && !l.met;
  /** Who's out, with the note they left on the door (null: they're in). */
  function away(who: string): string | null {
    if ((who === 'poppop' || who === 'nonna') && fiat.out) return '📝 “Gone for a drive in the Fiat! Back soon. Love, Poppop & Nonna”';
    const l = locals.find(q => q.orig.who === who);
    if (l && !gone(l)) return '📝 “Gone to paint the sea at the beach! Come find me. Love, Yia-Yia”';
    return null;
  }
  function standFacing(l: Local, mx: number, my: number, dt: number) {
    l.w.vx = l.w.vy = 0;
    Object.assign(l.st, chooseView(mx - l.w.x, my - l.w.y, l.st));
    stepGait(l.st, 0, 0, dt, GAIT_SCALE * l.view.height);
    l.view.pose(l.w.x, l.w.y, l.st);
  }
  /** Up a building's front wall, onto the roof, a wave, and back down (Primo climbs things). */
  function stepClimb(l: Local, dt: number) {
    const c = l.climb!, b = c.b, t = (c.t += dt), back = c.dur - t, k = Math.min(t, back);
    stepRoute(l.t, l.w, dt);   // (ticks the stop's wait; it moves on when that's done)
    const wall = l.w.y - (b.y + b.d - b.h) + 6, roof = b.d * 0.45, UP = 1.8, OVER = 0.5;
    let lift: number, view: View = 'front', amp = 0, hold = 0;
    if (k < UP) { lift = wall * smoothstep(k / UP); view = 'back'; amp = 1; }                 // hand over hand up the wall
    else if (k < UP + OVER) { lift = wall + roof * (k - UP) / OVER; view = t < back ? 'back' : 'front'; amp = 0.6; }
    else { lift = wall + roof; hold = 0.5 + 0.5 * Math.sin(t * 7); }                           // up top, waving
    Object.assign(l.st, { view, face: 1, crouch: 0, hold, sit: 0, stride_y: 0 });
    stepGait(l.st, amp * 140, 0, dt, GAIT_SCALE * l.view.height);
    l.view.pose(l.w.x, l.w.y - lift, l.st); l.view.root.zIndex = b.y + b.d + 5;
    if (l.w.wait <= 0 || back <= 0) { l.climb = null; Object.assign(l.st, { hold: 0 }); }
  }
  const smoothstep = (a: number) => { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); };
  function stepLocal(l: Local, dt: number) {
    if (l.climb) { stepClimb(l, dt); return; }
    // someone Nico's doing a job for (or who has one to offer) waits for him when he's close,
    // instead of walking off; a job with a meeting place sends them there and back
    if (l.swingT < 0) {
      const [mx, my] = mode === 'drive' ? [car.x, car.y] : here();
      const near = Math.hypot(mx - l.w.x, my - l.w.y);
      const mine = !!job && job.job.giver === l.t.who, meet = mine ? job!.job.meet : undefined;
      if (meet && !l.met) { l.met = [l.w.x, l.w.y]; l.trip = [[meet[0][0], l.w.y], ...meet]; }   // along her own street first
      if (!mine && l.met) { l.trip = [...meetBack(l), l.met]; l.met = null; }   // job over (or dropped): walk back, then carry on
      if (l.trip.length) {
        const [tx, ty] = l.trip[0], dx = tx - l.w.x, dy = ty - l.w.y, d = Math.hypot(dx, dy), step = l.t.speed * dt;
        if (d <= step) { l.w.x = tx; l.w.y = ty; l.trip.shift(); l.w.vx = l.w.vy = 0; }
        else { l.w.vx = dx / d * l.t.speed; l.w.vy = dy / d * l.t.speed; l.w.x += l.w.vx * dt; l.w.y += l.w.vy * dt; }
        Object.assign(l.st, chooseView(l.w.vx, l.w.vy, l.st));
        stepGait(l.st, Math.hypot(l.w.vx, l.w.vy), l.w.vy, dt, GAIT_SCALE * l.view.height);
        l.view.pose(l.w.x, l.w.y, l.st);
        return;
      }
      if (l.met || (mine && near < 320) || (offers(l.t.who) && near < 220)) { standFacing(l, mx, my, dt); return; }
    }
    const reached = stepRoute(l.t, l.w, dt);
    if (reached?.climb) { const b = BUILDINGS.find(q => q.id === reached.climb); if (b) { l.climb = { b, t: 0, dur: reached.wait ?? 8 }; stepClimb(l, 0); return; } }
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
    const stop = l.t.route[l.w.i];
    if (l.w.wait > 0 && stop.face) { standFacing(l, stop.face[0], stop.face[1], dt); return; }   // (Yia-Yia at her easel)
    Object.assign(l.st, chooseView(l.w.vx, l.w.vy, l.st));
    stepGait(l.st, Math.hypot(l.w.vx, l.w.vy), l.w.vy, dt, GAIT_SCALE * l.view.height);   // (taller people take longer strides)
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
    place: (x: number, y: number) => { if (room && (x > room.w || y > room.h)) for (let i = 0; i < 3 && room; i++) leaveRoom(); nico.x = x; nico.y = y; },   // (a spot out in town: step outside first)
    placeCar: (x: number, y: number, h: number) => { Object.assign(car, { x, y, h, speed: 0 }); },
    // stand Nico d px ahead of car i, in its lane (for the car-stops check)
    inFrontOf: (i: number, d: number) => { const c = cars[i], [x, y] = c.pos, h = c.loop.heading(c.s); nico.x = x + Math.cos(h) * d; nico.y = y + Math.sin(h) * d; },
    act: () => { action.spot?.run(); },
    // test/inspection: show the whole town (zoom out to fit) until called again with false
    overview: (on: boolean) => { overview = on; },
    alarm: () => truck.alarm(),
    pinball: () => pinball.snapshot(),
    pinballOpen: () => pinball.open(),
    fiatGo: (near?: 'bakery' | 'parts') => { fiat.go(); if (near) fiat.s = fiat.stops[near] - 300; },
    homeAll: () => { fiat.home(); for (const l of locals) { const k = l.t.route.findIndex(q => q.inside); if (k >= 0) { l.w.i = k; l.w.x = l.t.route[k].x; l.w.y = l.t.route[k].y; l.w.wait = l.t.route[k].wait ?? 60; } } },
    yiayiaOut: () => { const l = locals.find(q => q.orig.who === 'yiayia')!; const k = l.t.route.findIndex(q => q.face); l.w.i = k; l.w.x = l.t.route[k].x; l.w.y = l.t.route[k].y; l.w.wait = 30; },
    setMoney: (m: number) => { state.money = m; showMoney(); },
  };
  (window as unknown as { __game: unknown }).__game = game;
  for (const c of layer.children) c.cullable = true;   // everything placed so far
  const updater = startUpdates(persist);
  document.getElementById('check-update')!.addEventListener('click', () => updater.check(true));
  const muteEl = document.getElementById('mute')!;
  const showMute = () => { muteEl.textContent = audio.muted ? '🔇' : '🔊'; };
  showMute();
  muteEl.addEventListener('click', () => { audio.setMuted(!audio.muted); showMute(); if (!audio.muted) sfx.tap(); });
  Object.assign(game, { build: BUILD_ID, checkUpdate: () => updater.check(true) });
  const input = new Input(host);
  input.reserved = (x, y) => {
    if (bigMap.visible) return true;
    const b = minimap.view.getBounds();
    return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  };
  input.onTap = () => { if (bigMap.visible) bigMap.visible = false; else openBigMap(); };

  let overview = false;
  let zoom = 1, viewH = mode === 'drive' ? VIEW_H_DRIVE : VIEW_H;
  const applyZoom = () => {
    zoom = app.screen.height / viewH;
    world.scale.set(zoom); room?.view.scale.set(zoom);
    for (const n of [nico, ...walkers, ...locals, ...shoppers]) n.view.setZoom(zoom, resolution);
    room?.worker?.setZoom(zoom, resolution);
  };
  applyZoom();
  app.renderer.on('resize', applyZoom);



  function addWalkers(n: number) {
    for (let i = 0; i < n; i++) {
      const view = new PersonView();
      const w: Walker = { x: 0, y: 0, st: neutral('side'), view, vx: 0, vy: 0, t: 0 };
      // start on a sidewalk
      const horiz = Math.random() < 0.5;
      if (horiz) { w.x = 100 + Math.random() * (WORLD.w - 200); w.y = ROADS_Y[Math.random() < 0.5 ? 0 : 1] + (Math.random() < 0.5 ? -98 : 98); }
      else { w.y = 100 + Math.random() * (WORLD.h - 200); w.x = ROADS_X[Math.random() < 0.5 ? 0 : 1] + (Math.random() < 0.5 ? -98 : 98); }
      view.setZoom(zoom, resolution); if (low) view.setLow(true);
      view.root.cullable = true;
      layer.addChild(view.root);
      walkers.push(w);
    }
    updateCount();
  }
  function clearWalkers() { for (const w of walkers) { w.view.root.destroy({ children: true }); } walkers.length = 0; updateCount(); }
  const peopleEl = document.getElementById('people')!;
  function updateCount() { const n = walkers.length + 1; peopleEl.textContent = `${n} ${n === 1 ? 'person' : 'people'}`; }
  // the stress-test buttons only show with ?debug in the address
  const debug = new URLSearchParams(location.search).has('debug');
  for (const id of ['more', 'fewer']) document.getElementById(id)!.hidden = !debug;
  document.getElementById('more')!.addEventListener('click', () => addWalkers(10));
  document.getElementById('fewer')!.addEventListener('click', clearWalkers);
  const hint = document.getElementById('hint')!;

  const fpsEl = document.getElementById('fps')!;
  let fpsAcc = 0, fpsN = 0, fps = 0;
  // if the device can't keep up (under 45 fps for 4 s), drop the costly extras for good:
  // characters' soft shadows and the cloud shadows (the sticker outlines stay)
  let slowFor = 0, low = false;
  function goLow() {
    low = true;
    for (const n of [nico, ...walkers, ...locals]) n.view.setLow(true);
    clouds.view.visible = false;
    console.info('[nico] low-quality mode: fps was', fps);
  }

  if (player !== 'nico') playAs(player);   // (playing as a friend, from the save: once everything's set up)
  // the people inside buildings: their art loads in the background once the town is up (so the game starts as fast as before)
  setTimeout(() => { void loadArt([...new Set(Object.values(INTERIORS).map(r => r.person?.who).filter((w): w is string => !!w && !hasArt(w)))]); }, 1500);
  app.ticker.add(t => {
    const dt = Math.min(t.deltaMS / 1000, 0.05);
    fpsAcc += t.deltaMS; fpsN++;
    if (fpsAcc > 500) {
      fps = Math.round(1000 * fpsN / fpsAcc); fpsEl.textContent = `${fps} fps${low ? ' (lite)' : ''}`; fpsAcc = 0; fpsN = 0;
      slowFor = fps < 45 && !document.hidden ? slowFor + 0.5 : 0;
      if (slowFor >= 4 && !low) goLow();
    }
    if (Math.hypot(input.vx, input.vy) > 0) hint.style.opacity = '0';

    const frozen = cardOpen !== null;   // a card is open (a building, a job offer)
    boost = Math.max(0, boost - dt);
    const fast = boost > 0 ? BOOST.speed : 1;
    if (mode === 'play' && play) {
      play.t += dt; lastDt = dt;
      let b: Body;
      if (play.kind === 'slide') {
        b = slideAt(play.t, play.from);
        if (play.t >= SLIDE_LEN) { nico.x = b.x; nico.y = b.y; stopPlay(); }
      } else if (play.kind === 'games') {
        // on the beanbag, back to us, facing the TV (if there is one): the screen flickers, levels get beaten
        b = { x: play.from[0], y: play.from[1] + 6, view: 'back', face: 1, amp: 0, crouch: 1, hold: tvGlow ? 0.5 + 0.2 * Math.sin(play.t * 9) : 0, sit: 0, z: play.from[1] + 30, sy: 1 };
        if (tvGlow) { tvGlow.tint = [0x7FD1E8, 0xF9C846, 0xF06A8A, 0x3BB273][Math.floor(play.t * 3) % 4]; tvGlow.alpha = 0.9; }
        if (tvGlow && Math.floor(play.t / 5) > Math.floor((play.t - lastDt) / 5)) { sfx.goal(); toast(`🎮 ${pick(['You beat level', 'High score on level', 'You found a secret in level'])} ${Math.floor(play.t / 5) + 1}!`); }
        if (Math.hypot(input.vx, input.vy) > 0.5 && play.t > 0.4) stopPlay();
      } else if (play.kind === 'sleep') {
        b = sleepStep(play.t, play.seat === 1);
      } else if (play.kind === 'eat') {
        // sitting at the table (back to us, facing it); with food, a few seconds' eating, then the boost
        // upright on the stool's seat (sitting drops the hips to the feet, so draw him up by the seat's height)
        b = { x: play.from[0], y: play.from[1], dy: -STOOL_SEAT, knee: 1, view: 'side', face: 1, amp: 0, crouch: 0, hold: carrying ? 0.6 + 0.4 * Math.abs(Math.sin(play.t * 5)) : 0, sit: 1, z: play.from[1] + 20, sy: 1 };   // (in front of the table: sitting at it)
        if (carrying && play.t >= 3) {
          boost = Math.min(BOOST.max, boost + carrying.boost); sfx.coin();
          toast(`Yum! ${carrying.label}. You feel speedy! ⚡`); carrying = null; tableTray?.view.destroy(); tableTray = null;
        }
        if (!carrying && Math.hypot(input.vx, input.vy) > 0.5 && play.t > 0.4) stopPlay();
      } else if (play.kind === 'waterslide') {
        const w = waterSlideAt(play.t);
        if (w) b = w;
        else { startSwim(SPLASH[0], SPLASH[1]); b = { x: nico.x, y: nico.y, view: 'front', face: 1, amp: 0, crouch: 0, hold: 0, sit: 0, z: nico.y, sy: 1 }; }
      } else if (play.kind === 'swim') {
        // paddling about: the stick steers (slower on the ring); the water hides everything below his chest
        const sp = floating ? SWIM.ringSpeed : SWIM.speed, vx = input.vx * sp, vy = input.vy * sp;
        [nico.x, nico.y] = inPool(nico.x + vx * dt, nico.y + vy * dt);
        Object.assign(nico.st, chooseView(vx, vy, nico.st));
        const bob = Math.sin(play.t * (floating ? 2 : 4)) * (floating ? 4 : 2), sink = floating ? 8 : 20;
        b = { x: nico.x, y: nico.y, dy: sink + bob, view: nico.st.view, face: nico.st.face, amp: Math.hypot(input.vx, input.vy) > 0.1 ? 1 : 0.35, crouch: 0, hold: 0, sit: 0, z: nico.y, sy: 1 };
        waterSkin.position.set(nico.x, nico.y + bob * 0.3); waterSkin.zIndex = nico.y + 0.5;
        const line = nico.y + bob * 0.3 - 36;
        swimMask.clear().rect(nico.x - 150, line - 400, 300, 400).fill(0xffffff); nico.view.root.mask = swimMask;
        ring.position.set(nico.x, nico.y + (floating ? 6 : 0) + bob); ring.zIndex = nico.y + 0.6;
      } else if (play.kind === 'camera') {
        // standing still, camera up; the stick moves where it's pointing (not too far off)
        aim[0] += input.vx * CAM.aimSpeed * dt; aim[1] += input.vy * CAM.aimSpeed * dt;
        const dx = aim[0] - nico.x, dy = aim[1] - nico.y, d = Math.hypot(dx, dy);
        if (d > CAM.reach) { aim[0] = nico.x + dx / d * CAM.reach; aim[1] = nico.y + dy / d * CAM.reach; }
        b = { x: play.from[0], y: play.from[1], view: nico.st.view, face: nico.st.face, amp: 0, crouch: 0, hold: 1, sit: 0, z: play.from[1], sy: 1 };
      } else if (play.kind === 'dig') {
        // crouched over the hole, scooping (a bob of the arms), then up with whatever's there
        b = { x: play.from[0], y: play.from[1], view: 'front', face: 1, amp: 0.4, crouch: 1, hold: 0, sit: 0, z: play.from[1], sy: 1 };
        if (play.t >= 1.1) { const at: [number, number] = [play.from[0], play.from[1] - 50]; stopPlay(); dugTreasure(at); }
      } else if (play.kind === 'bench') {
        // sitting on the bench, facing out: hips on the seat, legs dangling
        b = { x: play.from[0], y: play.from[1] - 2, view: 'front', face: 1, amp: 0, crouch: 1, hold: 0, sit: 0, z: play.from[1] + 1, sy: 1 };
        if (Math.hypot(input.vx, input.vy) > 0.5 && play.t > 0.4) stopPlay();
      } else {
        const sw = swingAt(play.t, play.seat);
        seats[play.seat].set(sw.chain); b = sw.body;
        if (Math.hypot(input.vx, input.vy) > 0.5 && play.t > 0.6) stopPlay();
      }
      if (play) {
        nico.x = b.x; nico.y = b.y;
        Object.assign(nico.st, { view: b.view, face: b.face, crouch: b.crouch, hold: b.hold, sit: b.sit, knee: b.knee ?? 0, stride_y: 0 });
        stepGait(nico.st, b.amp * 150, 0, dt);   // (climbing the ladder: a steady step)
        nico.view.pose(nico.x, nico.y + (b.dy ?? 0), nico.st);   // (dy: drawn lower, not moved: sunk in the water)
        nico.view.root.zIndex = b.z;
        nico.view.root.scale.y *= b.sy;
      }
    }
    if (mode === 'walk' && !frozen) {
      // weight: he gets going and slows down over a moment, instead of starting and stopping dead
      const tvx = input.vx * WALK_SPEED * fast, tvy = input.vy * WALK_SPEED * fast, ease = 1 - Math.exp(-dt * (tvx || tvy ? 14 : 18));
      nv[0] += (tvx - nv[0]) * ease; nv[1] += (tvy - nv[1]) * ease;
      const vx = nv[0], vy = nv[1], [ox, oy] = [nico.x, nico.y];
      [nico.x, nico.y] = room ? moveCircle(nico.x, nico.y, vx * dt, vy * dt, room.solids, { w: room.w, h: room.h - 20 })
        : moveCircle(nico.x, nico.y, vx * dt, vy * dt, SOLIDS, WORLD);
      const sp = dt ? Math.hypot(nico.x - ox, nico.y - oy) / dt / WALK_SPEED : 0;   // (how fast he really went: no walking on the spot into a wall)
      Object.assign(nico.st, chooseView(tvx, tvy, nico.st));
      if (room && carrying) nico.st.hold = 1;   // carrying the tray in both hands
      stepGait(nico.st, sp * WALK_SPEED * fast, vy, dt);
      nico.view.pose(nico.x, nico.y, nico.st);
      // a footstep each time a foot comes down: what it sounds like depends on what he's walking on
      const foot = Math.floor(nico.st.phase / (CYCLE / 2));
      if (foot !== lastFoot && nico.st.amp > 0.4 && sp > 0.2) {
        const ground = room ? roomSurface(room.kind) : surfaceAt(nico.x, nico.y);
        footstep(ground); squash = 1;
        if (ground === 'sand') dust.puff(nico.x + (foot % 2 ? 10 : -10), nico.y, '#E8D5A0', 2, 40, 8);   // (sand kicked up)
      }
      lastFoot = foot;
      squash = Math.max(0, squash - dt * 9);
      nico.view.root.scale.y *= 1 - 0.035 * squash; nico.view.root.scale.x *= 1 + 0.02 * squash;   // (a little squash as each foot lands)
      if (room) { trayView.position.set(nico.x, nico.y - 66); trayView.zIndex = nico.y + 1; }
    } else if (mode === 'drive') {
      const prevH = car.h;
      if (frozen) steer(car, 0, 0, dt); else steer(car, input.vx, input.vy, dt);
      const truckCircles: [number, number, number][] = truck.out ? truck.points().map(([x, y]) => [x, y, TRUCK.wid * 0.45]) : [];
      moveCar(car, prevH, dt, SOLIDS, WORLD, [...carCirclesOf(cars), ...truckCircles, ...fiat.points().map(([x, y]) => [x, y, FIAT.wid * 0.48] as [number, number, number])]);
    }
    carView.position.set(car.x, car.y);
    turnCar(car.h);
    { // weight: the body leans out on turns and pitches when it speeds up or brakes, over its shadow
      const turnRate = dt ? (((car.h - lastCar.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI) / dt : 0, accel = dt ? (car.speed - lastCar.speed) / dt : 0;
      const side = Math.max(-5, Math.min(5, -turnRate * car.speed * 0.012)), fwd = Math.max(-5, Math.min(5, -accel * 0.012));
      lean[0] += (side - lean[0]) * Math.min(1, dt * 8); lean[1] += (fwd - lean[1]) * Math.min(1, dt * 8);
      leanCar(Math.cos(car.h) * lean[1] - Math.sin(car.h) * lean[0], Math.sin(car.h) * lean[1] + Math.cos(car.h) * lean[0]);
      lastCar.h = car.h; lastCar.speed = car.speed;
    }
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
      stepGait(w.st, Math.hypot(w.vx, w.vy), w.vy, dt);
      w.view.pose(w.x, w.y, w.st);
    }

    for (const l of locals) {
      stepLocal(l, dt);
      const out = gone(l); l.view.root.visible = !out;   // (gone indoors: out of sight, and there's no one to say hi to)
      const sp = spots.find(p => p.id === l.orig.who)!; sp.x = out ? -1e5 : l.w.x; sp.y = l.w.y;   // (their spot keeps its first name, whoever's walking the route)
    }

    // the ball: Nico kicks it walking, his car knocks it driving; goals reset it
    if (goalReset > 0) { goalReset -= dt; if (goalReset <= 0) Object.assign(ball, kickoff()); }
    else {
      if (mode === 'walk' && !room && kick(ball, nico.x, nico.y, 18, Math.hypot(input.vx, input.vy) * WALK_SPEED * fast)) { sfx.kick(); if (dog && dogFetch(dog, ball)) sfx.bark(); }
      if (mode === 'drive') for (const [cx, cy, r] of circles(car.x, car.y, car.h)) if (kick(ball, cx, cy, r, Math.abs(car.speed))) { sfx.kick(); break; }
      for (const l of locals) if (!gone(l)) kick(ball, l.w.x, l.w.y, 18, l.t.speed);
      // traffic nudges it off the road to the side, rather than driving over and hiding it
      for (const c of cars) if (c.speed > 5) { const h = c.loop.heading(c.s); for (const [cx, cy, r] of circles(c.pos[0], c.pos[1], h)) if (nudge(ball, cx, cy, r, h)) break; }
      if (truck.out) for (const [cx, cy] of truck.points()) if (nudge(ball, cx, cy, TRUCK.wid * 0.45, truck.heading)) break;
      const g = roll(ball, dt, SOLIDS, WORLD);
      if (g) {
        if (g < 0) score.right++; else score.left++;
        toast(`⚽ GOAL! ${score.left} – ${score.right}`); sfx.goal();
        goalReset = 1.6;
      }
    }
    // Biscuit: heels, sits, lies down, fetches; waits by the door while Nico's in somewhere, rides along in the car
    if (dog && dogView) {
      const hidden = !!room || mode === 'drive';
      if (hidden) { const [hx, hy] = mode === 'drive' ? [car.x, car.y] : room!.outside; Object.assign(dog, { x: hx - 50, y: hy + 20, vx: 0, vy: 0, mode: 'follow', still: 0 }); }
      else {
        const moving = mode === 'walk' && Math.hypot(input.vx, input.vy) > 0.05;
        const ev = stepDog(dog, dt, nico, moving, ball, (x, y, dx, dy) => moveCircle(x, y, dx, dy, SOLIDS, WORLD, 14));
        if (ev === 'got') sfx.bark();
        if (dog.mode === 'bring' || ev === 'drop') { const [bx, by] = mouthOf(dog); Object.assign(ball, { x: bx, y: by, vx: 0, vy: 0, z: ev === 'drop' ? 0 : 30, vz: 0 }); }
        if (ev === 'drop') { dogTrick = 0.6; toast(`🐶 ${DOG.name} drops the ball at your feet. Again!`); }
        if (dogTrick > 0) { dogTrick -= dt; dog.face = Math.sin(dogTrick * 16) > 0 ? 1 : -1; }   // (a happy spin)
        dogView.update(dog, dt);
      }
      dogView.view.visible = !hidden;
      petSpot.x = hidden ? -1e5 : dog.x; petSpot.y = dog.y;
    }
    ballView.draw(ball, dt);
    ducks.update(dt);
    tickDoors(biz, dt); paintDoors(); updateStickers(dt); stepShop(dt);
    clock = (clock + dt / DAY.length) % 1; dust.update(dt); snackIn -= dt; pastaIn -= dt; for (const k in treatIn) treatIn[k] -= dt; eggs = Math.min(HENS.max, eggs + dt / HENS.lay);
    if (room?.kind === 'home') {   // the fish swim round their tank (faster when they've just been fed)
      fishFed = Math.max(0, fishFed - dt); const T = HOME_DECOR.fishtank, sp = fishFed > 0 ? 2.5 : 1, tt = performance.now() / 1000;
      fish.forEach((g, i) => { if (g.destroyed) return; const u = tt * 0.5 * sp + i * 2.1, x = T.x + T.w / 2 + Math.sin(u) * (T.w / 2 - 26); g.position.set(x, T.y + T.d - T.h + 24 + i * 18 + Math.sin(u * 1.7) * 4); g.scale.x = Math.cos(u) >= 0 ? 1 : -1; });
      if (petCat && !petCat.destroyed) petCat.scale.y = 1 + 0.02 * Math.sin(tt * 2.2);   // (breathing)
    }
    if (room?.kind === 'home' && room.windows) { const dk = darkness(clock); if ((windowsIn -= dt) <= 0) { windowsIn = 2; paintWindows(room.windows, dk); } if (room.lamp) room.lamp.alpha = 0.25 + 0.6 * dk; }
    if ((aroundIn -= dt) <= 0) {   // what's round Nico, for the birds, the wind in the trees and the waves (twice a second)
      aroundIn = 0.5; const [ax, ay] = here(), near = (p: [number, number]) => Math.abs(p[0] - ax) < 600 && Math.abs(p[1] - ay) < 500;
      around.trees = TREES.filter(near).length + PINES.filter(near).length; around.shore = Math.max(0, shoreY(ax) - ay); around.forest = inForest(ax, ay);
    }
    around.dark = night.dark; around.inside = !!room; ambience.update(dt, around);
    night.update(clock, dt, here(), { w: app.screen.width, h: app.screen.height });
    night.headlights([[car.x, car.y, car.h], ...cars.map(c => [c.pos[0], c.pos[1], c.loop.heading(c.s)] as [number, number, number]), ...(fiat.out ? [[fiat.pos[0], fiat.pos[1], fiat.heading] as [number, number, number]] : [])], CAR.len, CAR.wid);
    if (room) night.moon.visible = false;
    for (const sp of splashes) { sp.t += dt; sp.g.scale.set(1 + sp.t * 2.2); sp.g.alpha = Math.max(0, 1 - sp.t / 0.8); if (sp.t > 0.8) sp.g.destroy(); }
    splashes.splice(0, splashes.length, ...splashes.filter(sp => sp.t <= 0.8));
    animals.update(dt, [mode === 'drive' ? [car.x, car.y] : here()]);
    clouds.update(dt);
    const movers: [number, number][] = [mode === 'drive' ? [car.x, car.y] : here(), ...locals.map(l => [l.w.x, l.w.y] as [number, number]), ...cars.map(c => c.pos as [number, number])];
    if (dog && dogView?.view.visible) movers.push([dog.x, dog.y]);
    pigeons.update(dt, movers);
    const got = coins.update(dt, mode === 'drive' ? circles(car.x, car.y, car.h).map(([x, y]) => [x, y] as [number, number]) : room ? [] : [[nico.x, nico.y]]);
    // the beach: shells underfoot, the detector's beeps, old holes filling in
    for (const k of shells.update(dt, mode === 'walk' && !room ? [nico.x, nico.y] : null)) {
      const first = !biz.found.includes(k); if (first) biz.found.push(k);
      biz.shells[k] = (biz.shells[k] ?? 0) + 1; persist(); sfx.shell();
      const kinds = biz.found.length, sh = SHELL_KINDS.find(q => q.id === k)!;
      toast(`🐚 ${first ? 'A new kind: ' : ''}${sh.label}! (${kinds} of ${SHELL_KINDS.length} kinds)`);
    }
    for (const h of holes) { h.t -= dt; h.view.alpha = Math.min(1, h.t / 4); if (h.t <= 0) h.view.destroy(); }
    holes.splice(0, holes.length, ...holes.filter(h => h.t > 0));
    const detecting = mode === 'walk' && !room && biz.tools.includes('detector') && onBeach(nico.x, nico.y);
    if (detecting) {
      const n = treasure.nearest(nico.x, nico.y), gap = beepGap(n.d);
      digSpot.x = treasure.spots[n.i][0]; digSpot.y = treasure.spots[n.i][1];
      signal = gap === null ? 0 : Math.max(1, Math.round(5 - 4 * (gap - DETECT.fastest) / (DETECT.slowest - DETECT.fastest)));
      beepIn -= dt;
      if (gap !== null && beepIn <= 0) { sfx.beep(signal); beepIn = gap; }
      if (n.d <= DETECT.dig && hinted !== n.i + ':' + treasure.spots[n.i].join()) { hinted = n.i + ':' + treasure.spots[n.i].join(); toast("📡 It's right here! Tap ⛏️ Dig!"); }
    } else { signal = 0; digSpot.x = digSpot.y = -9999; }
    detectorEl.hidden = !detecting;
    if (detecting && detectorEl.dataset.signal !== String(signal)) {   // a little signal meter: five bars, lit up to the signal
      detectorEl.dataset.signal = String(signal);
      detectorEl.innerHTML = '📡 ' + [1, 2, 3, 4, 5].map(i => `<i class="${i <= signal ? 'on' : ''}" style="height:${6 + i * 3}px"></i>`).join('');
    }
    if (got) { state.money += got * COIN.value; showMoney(); persist(); sfx.coin(); toast(`🪙 Found a coin! +$${got * COIN.value}`); }
    // quacks when Nico's near the pond; honks from cars he's been holding up
    const me: [number, number] = mode === 'drive' ? [car.x, car.y] : here();
    quackIn -= dt;
    if (quackIn <= 0) { quackIn = 3 + Math.random() * 6; if (Math.hypot(me[0] - (POND.x + POND.w / 2), me[1] - (POND.y + POND.d / 2)) < 420) sfx.quack(); }
    for (const c of cars) if (c.waitedOnNico > 1.2 && c.honked > 4 && Math.hypot(c.pos[0] - me[0], c.pos[1] - me[1]) < 700) { sfx.honk(); c.honked = 0; }

    // traffic brakes for Nico on foot, and for every part of his car
    // (and for the fire truck, which goes first: it yields only to cars not waiting for it)
    const mine: [number, number, string?][] = circles(car.x, car.y, car.h).map(([x, y]) => [x, y, 'mine']);
    if (mode !== 'drive' && !room) mine.push([nico.x, nico.y, 'nico']);
    for (const l of locals) if (!gone(l)) mine.push([l.w.x, l.w.y]);
    if (dog && dogView?.view.visible) mine.push([dog.x, dog.y]);
    const truckPts: [number, number, string][] = truck.out ? truck.points().map(([x, y]) => [x, y, 'truck']) : [];
    // (and Poppop in his Fiat, who gives way to everyone not already waiting for him)
    const fiatPts: [number, number, string][] = fiat.out ? fiat.points().map(([x, y]) => [x, y, 'fiat']) : [];
    for (let i = 0; i < cars.length; i++) cars[i].update(dt, lead[i], [...truckPts, ...fiatPts, ...mine]);
    const carPts = (not: string) => cars.filter(c => c.blockedBy !== not).flatMap(c => {
      const [x, y] = c.pos, h = c.loop.heading(c.s);
      return circles(x, y, h).map(([cx, cy]) => [cx, cy]) as [number, number][];
    });
    const truckOut = truck.update(dt, [...mine, ...carPts('truck'), ...(fiat.blockedBy !== 'truck' ? fiatPts : [])]);
    fiat.update(dt, [...mine, ...truckPts, ...carPts('fiat')]);
    // the fire: water from the truck while it's parked there spraying
    const spraying = truck.out && truck.stopAt !== null && truck.speed === 0 && truck.spraying > 0;
    fireScene.update(dt, spraying ? [truck.pos[0], truck.pos[1] - 70] : null);
    if (wasBurning && !fireScene.burning) toast('🔥 The fire is out! Hooray for the firefighters!');
    wasBurning = fireScene.burning;

    // action button
    spots[0].x = car.x; spots[0].y = car.y;
    cameraSpot.x = nico.x; cameraSpot.y = nico.y;
    action.show(frozen ? null : mode === 'drive' ? (car.speed < 40 ? outSpot : null)
      : mode === 'play' ? (play?.kind === 'swing' ? hopOff : play?.kind === 'bench' ? standUp : play?.kind === 'camera' ? snapSpot : play?.kind === 'swim' ? swimSpot : play?.kind === 'eat' && !carrying ? standUp : null) : room ? nearest(roomSpots(), nico.x, nico.y) : nearest(spots, nico.x, nico.y));
    boostEl.hidden = boost <= 0;
    if (boost > 0) boostEl.textContent = `⚡ ${Math.ceil(boost)}s`;

    // camera follows Nico (or his car, looking ahead), clamped to the world; eases the zoom
    const wantH = overview ? Math.max(WORLD.h, WORLD.w * app.screen.height / app.screen.width) : mode === 'drive' ? VIEW_H_DRIVE : play?.kind === 'camera' ? CAM.zoomH : VIEW_H;
    if (Math.abs(viewH - wantH) > 0.5) { viewH += (wantH - viewH) * Math.min(1, dt * 3); applyZoom(); }
    const fx = mode === 'drive' ? car.x + Math.cos(car.h) * car.speed * 0.35 : play?.kind === 'camera' ? aim[0] : nico.x;
    const fy = mode === 'drive' ? car.y + Math.sin(car.h) * car.speed * 0.35 : play?.kind === 'camera' ? aim[1] : nico.y - 40;
    const vw = app.screen.width / zoom, vh = app.screen.height / zoom;
    const bw = room ? room.w : WORLD.w, bh = room ? room.h : WORLD.h;   // (inside: the room's walls; a small room just sits in the middle)
    // (it trails a moment behind, so moving feels like moving; a jump of more than a screen just cuts)
    if (!(Math.abs(fx - cam.x) < 900 && Math.abs(fy - cam.y) < 700)) { cam.x = fx; cam.y = fy; }
    else { const k = 1 - Math.exp(-dt * 9); cam.x += (fx - cam.x) * k; cam.y += (fy - cam.y) * k; }
    const cx = vw >= bw ? bw / 2 : Math.min(bw - vw / 2, Math.max(vw / 2, cam.x));
    const cy = vh >= bh ? bh / 2 : Math.min(bh - vh / 2, Math.max(vh / 2, cam.y));
    shake = Math.max(0, shake - dt); const sh = shake > 0 ? 7 * shake / 0.3 : 0;   // (a thump: the screen jolts and settles)
    world.position.set(app.screen.width / 2 - cx * zoom + (Math.random() - 0.5) * sh, app.screen.height / 2 - cy * zoom + (Math.random() - 0.5) * sh);
    room?.view.position.copyFrom(world.position);

    siren.update(dt, truckOut ? Math.hypot(truck.pos[0] - cx, truck.pos[1] - cy) : null);

    // jobs: the next step's spot, the ball step, the cat, the "!" bubbles, the HUD chip
    for (const id in jobWait) jobWait[id] -= dt;
    for (const l of locals) if (l.bubble) l.bubble.visible = !!offers(l.t.who) || finishing(l.t.who);
    let jobAt: [number, number] | null = null;
    if (job) {
      const giver = locals.find(l => l.t.who === job!.job.giver)!;
      jobAt = jobTarget(job, [giver.w.x, giver.w.y]);
      const st = jobStep(job);
      if (st.kind === 'go') { jobSpot.x = jobAt[0]; jobSpot.y = jobAt[1]; }
      if (st.kind === 'bring' && !owns(biz, st.item)) jobAt = doorOf(BUILDINGS.find(b => b.id === 'storage')!);   // go find one
      if (st.kind === 'ball' && Math.hypot(ball.x - giver.w.x, ball.y - giver.w.y) < 170) payJob();
      cat.visible = !!job && job.job.id === 'cat' && job.step === 0;
      if (cat.visible) { cat.position.set(jobAt[0], jobAt[1] - 6); cat.zIndex = jobAt[1]; }
    } else cat.visible = false;
    jobEl.hidden = !job;
    if (job) {
      const st = jobStep(job), who = locals.find(l => l.t.who === job!.job.giver)?.t.name;
      const t = `📋 ${st.kind === 'bring' && owns(biz, st.item) ? `bring ${item(st.item).label} to ${who}` : st.note}`;
      if (jobEl.textContent !== t) jobEl.textContent = t;
    }
    if (wantOffer) { wantOffer.left -= dt; if (wantOffer.left <= 0 || job) wantOffer = null; }
    else if (!job && biz.flips > 0 && (wantIn -= dt) <= 0) {
      wantIn = WANT.every[0] + Math.random() * (WANT.every[1] - WANT.every[0]);
      const w = pickWant(Math.random, () => false);   // (a request takes the place of their usual job for a while)
      if (w) wantOffer = { ...w, left: WANT.offerFor };
    }
    const goal = nextGoal(biz, state.money), gp = goalPlace(biz, state.money);
    goalEl.hidden = !goal || !!job;   // one thing at a time: an odd job's chip takes the place of the goal
    if (goal && goalEl.textContent !== goal) goalEl.textContent = goal;
    const goalAt = gp && !job ? (gp === 'shed' ? SHED_DOOR : doorOf(BUILDINGS.find(b => b.id === gp)!)) : null;

    // minimap: top-left, under the money
    const mr = moneyEl.getBoundingClientRect();
    minimap.view.position.set(mr.left + 6, mr.bottom + 16);
    const flash = Math.floor(performance.now() / 250) % 2 === 0;
    const mapDots = ([
      ...locals.filter(l => !gone(l)).map(l => ({ x: l.w.x, y: l.w.y, color: l.t.who === 'primo' ? '#2456C8' : '#2E3A66', r: 3 })),
      ...(truck.out ? [{ x: truck.pos[0], y: truck.pos[1], color: flash ? '#FF4D4D' : '#4DA3FF', r: 4 }] : []),
      ...(fiat.out ? [{ x: fiat.pos[0], y: fiat.pos[1], color: FIAT.seats, r: 3.5 }] : []),
      ...(fireScene.burning && fireScene.building ? [{ x: fireScene.building.x + fireScene.building.w / 2, y: fireScene.building.y, color: flash ? '#F28C38' : '#FFD45C', r: 6, ring: true }] : []),
      ...(mode === 'drive' ? [] : [{ x: car.x, y: car.y, color: MY_CAR.color, r: 3.5 }]),
      ...(jobAt ? [{ x: jobAt[0], y: jobAt[1], color: '#F9C846', r: 5.5, ring: true }] : []),
      ...(goalAt ? [{ x: goalAt[0], y: goalAt[1], color: '#F9C846', r: 5.5, ring: true }] : []),
      ...(job?.job.id === 'ball' ? [{ x: ball.x, y: ball.y, color: '#FFFFFF', r: 4.5, ring: true }] : []),   // where the ball is
      { x: mode === 'drive' ? car.x : nico.x, y: mode === 'drive' ? car.y : nico.y, color: '#F08A3C', r: 5, ring: true },
    ]);
    minimap.update(mapDots);
    if (bigMap.visible && big) big.update(mapDots.map(d => ({ ...d, r: (d.r ?? 4) * 1.6 })));

    const nb = nico.view.root.getBounds();
    Object.assign(game, {
      townsfolk: locals.map(l => ({ gone: gone(l), who: l.t.who, x: l.w.x, y: l.w.y, swinging: l.swingT >= 0, climbing: !!l.climb, art: l.view.artLoaded() })),
      spots: Object.fromEntries(spots.map(p => [p.id, { x: p.x, y: p.y }])), parked: PARKED_CAR,
      ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy }, score: { ...score }, coins: coins.available,
      placeBall: (x: number, y: number) => { Object.assign(ball, { x, y, vx: 0, vy: 0, z: 0, vz: 0 }); },
      kickBall: (vx: number, vy: number) => { Object.assign(ball, { vx, vy }); if (dog) dogFetch(dog, ball); },
      dog: dog ? { x: dog.x, y: dog.y, mode: dog.mode, visible: !!dogView?.view.visible } : null,
      bigMap: bigMap.visible, minimapAt: (() => { const b = minimap.view.getBounds(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })(),
      low, goLow: () => goLow(),
      biz: JSON.parse(JSON.stringify(biz)), work: { screen: work.screen, filled: [...work.filled], lastRun: work.lastRun }, goal,
      setBiz: (o: Partial<typeof biz>) => { Object.assign(biz, o); toyWindow.set(windowToys()); persist(); },
      animals: animals.list.map(a => ({ kind: a.kind, x: a.x, y: a.y, scared: a.scared > 0 })),
      shells: shells.spots.filter(q => q.gone <= 0).map(q => ({ x: q.x, y: q.y, kind: q.kind })), buried: treasure.spots.map(([x, y]) => ({ x, y })), signal,
      use: (id: string) => { spots.find(q => q.id === id)?.run(); },   // (tests: use a spot by name, whoever else is standing near it)
      hallDoors: DOOR_NAMES.map((_, i) => { const st = doorState(biz, i); return { state: st, peek: st === 'sale' ? peekOf(doorUnit(biz, i), wanted()) : [], price: st === 'sale' ? doorUnit(biz, i).price : 0 }; }),
      exitRooms: () => { for (let i = 0; i < 3 && room; i++) leaveRoom(); },
      unlocked: [...biz.unlocked], solidAt: (x: number, y: number) => !freeAt(x, y, SOLIDS, WORLD),
      room: room ? room.id : null, carrying: carrying?.label ?? null, roomSpots: Object.fromEntries(roomSpots().map(q => [q.id, { x: q.x, y: q.y }])),
      floating, inWater: play?.kind === 'swim', photos: { ...biz.photos }, aimAt: (x: number, y: number) => { aim = [x, y]; }, aim: [...aim],
      sounds: { ...played }, scatters, player, last2: work.last2, awayFor: (sec: number) => { biz.shop.last = biz.bakery.last = Date.now() - sec * 1000; catchUp(0); }, clock, dark: night.dark, setClock: (u: number) => { clock = u; }, shoppers: shoppers.map(q => ({ name: q.name, x: q.x, y: q.y, looking: q.look > 0 })), visitNow: () => { for (const k in visitIn) visitIn[k] = 0; }, baking: { ...work.baking }, strung: [...work.strung], want: wantOffer ? { ...wantOffer } : null,
      offerWant: (giver: string, it: string) => { wantOffer = { giver, item: it, left: WANT.offerFor }; },
      mode, money: state.money, boost, play: play?.kind ?? null, inside: openPlace?.building ?? cardOpen, job: job ? { id: job.job.id, step: job.step, at: jobAt } : null, jobWait: { ...jobWait }, action: action.spot ? action.spot.id : null,
      car: { x: car.x, y: car.y, h: car.h, speed: car.speed },
      fire: fireScene.burning ? fireScene.building!.id : null,
      fiat: { at: fiat.at, out: fiat.out, s: fiat.s, len: fiat.loop.length, speed: fiat.speed, pos: fiat.pos, wait: fiat.wait, blockedBy: fiat.blockedBy },
      truck: { out: truck.out, stopAt: truck.stopAt, spraying: truck.spraying, s: truck.s, len: truck.loop.length, speed: truck.speed, pos: truck.pos, wait: truck.wait },
      nico: { art: nico.view.artLoaded(), x: nico.x, y: nico.y, view: nico.st.view, face: nico.st.face, amp: nico.st.amp,
              screen: { x: nb.x, y: nb.y, w: nb.width, h: nb.height } },
      cars: cars.map(c => ({ speed: c.speed, pos: c.pos, heading: c.loop.heading(c.s) })), fps, people: walkers.length + 1, zoom,
    });
  });
}

main();
