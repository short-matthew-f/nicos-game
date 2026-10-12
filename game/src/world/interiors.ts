// Insides for every building (Nico, 2026-10-10: "any space that exists should be able to be gone
// inside of"). Each is data: wall and floor colours, the things in the room, someone to talk to, and
// what each thing does when you walk up to it. Things are one of four kinds, so a new room is just a
// list: a block (furniture: counters, desks, shelves, beds), something on the wall (boards, maps,
// posters, windows), a big emoji (a cow, a fire truck), or a rug.
import { Container, Graphics, Text } from 'pixi.js';
import { NAVY, BAND } from './draw';
import { iconRow, bigThing } from './icons';

/** sit: sit on it, facing out (a sofa, a bench). at: sit at it on a chair (a desk, a table), back to us. */
export interface Use { label: string; lines?: string[]; sit?: boolean; at?: boolean; boost?: number; action?: string }
/** block: furniture (footprint x, y, w, d; drawn h tall; `items`: emoji along its top). wall: on the back
 * wall. emoji: a big picture standing at (x, y). rug: on the floor. */
export type Thing =
  | { kind: 'block'; x: number; y: number; w: number; d: number; h: number; top: string; front: string; items?: string; use?: Use }
  | { kind: 'wall'; x: number; y: number; w: number; h: number; fill: string; frame?: string; text?: string; items?: string; use?: Use }
  | { kind: 'emoji'; x: number; y: number; e: string; size: number; solid?: [number, number]; use?: Use; seat?: number }   // seat: a chair (use.sit): how high its seat is, px
  | { kind: 'rug'; x: number; y: number; w: number; h: number; color: string; color2?: string };
export interface Interior {
  id: string; title: string;
  w: number; h: number; wall: number;
  colors: { wall: string; stripe?: string; trim: string; floor: [string, string]; tiles?: boolean; pine?: boolean };   // pine: knotty-pine planks
  person?: { who: string; name: string; x: number; y: number; lines: string[]; action?: string; treat?: { label: string; boost: number } };
  crew?: { who: string; name: string; x: number; y: number; lines: string[]; face?: 'front' | 'side' | 'qfront'; flip?: boolean; action?: string; label?: string; docs?: boolean }[];   // others there (the dojo's instructors; the doctors, on hospital days: docs)
  things: Thing[];
}
const W = 1200, H = 820, WALL = 250;
const room = (id: string, title: string, colors: Interior['colors'], things: Thing[], person?: Interior['person']): Interior => ({ id, title, w: W, h: H, wall: WALL, colors, things, person });
const block = (x: number, y: number, w: number, d: number, h: number, top: string, front: string, items?: string, use?: Use): Thing => ({ kind: 'block', x, y, w, d, h, top, front, items, use });
const onWall = (x: number, y: number, w: number, h: number, fill: string, text?: string, items?: string, use?: Use): Thing => ({ kind: 'wall', x, y, w, h, fill, frame: '#FFFFFF', text, items, use });
const big = (x: number, y: number, e: string, size: number, use?: Use, solid?: [number, number]): Thing => ({ kind: 'emoji', x, y, e, size, use, solid });
/** An armchair (a big picture you can sit in): seat is how high its seat is. */
const armchair = (x: number, y: number, e: string, size: number, label: string, solid: [number, number], seat: number): Thing => ({ kind: 'emoji', x, y, e, size, use: sitHere(label), solid, seat });
const rug = (x: number, y: number, w: number, h: number, color: string, color2?: string): Thing => ({ kind: 'rug', x, y, w, h, color, color2 });
const sitHere = (label = '🪑 Sit down'): Use => ({ label, sit: true });
const sitAt = (label: string): Use => ({ label, sit: true, at: true });   // (a chair goes in front of it)

/** A family's home: each one its own (the user, 2026-10-12: "homes should feel unique inside"). A grown-up is in, with a treat. */
const home = (id: string, title: string, colors: Interior['colors'], things: Thing[], who: string, name: string, at: [number, number], lines: string[], treat: { label: string; boost: number }): Interior =>
  room(id, title, colors, things, { who, name, x: at[0], y: at[1], lines, treat });
const window_ = (x: number, w = 130) => onWall(x, 50, w, 120, '#BFE3F5');
const photos = (x: number, kid: string, lines: string[]) => onWall(x, 60, 110, 90, '#7FD1C1', '', undefined, { label: 'canvas Look at the photos', lines: lines.map(l => l.replace('{kid}', kid)) });
const TV_LINES = ['A cartoon about a dog who drives a bus. Funny!', 'The weather: sunny all week!', 'A cooking show. Now you\'re hungry.'];

export const INTERIORS: Record<string, Interior> = {
  school: room('school', 'School', { wall: '#F2E6CF', trim: '#B5654F', floor: ['#E3C49A', '#D9B88A'] }, [
    onWall(380, 40, 440, 160, '#2F3B33', '2 + 2 = 4', undefined, { label: '✏️ Draw on the chalkboard', lines: ['You draw a rocket on the chalkboard. 🚀', 'You write NICO WAS HERE in big letters.', 'You draw the janitor. He laughs.'] }),
    onWall(880, 60, 70, 70, '#FFFFFF', undefined, 'clock'), onWall(110, 50, 180, 120, '#F9E39A', 'ABC'),
    ...[0, 1, 2].flatMap(r => [0, 1, 2, 3].map(i => block(170 + i * 230, 420 + r * 130, 130, 40, 60, '#E8C18A', '#B9895A', i === 1 && r === 0 ? 'books' : undefined, sitAt('🪑 Sit at a desk')))),
    block(940, 262, 200, 60, 70, '#B9895A', '#8A5A3B', 'apple globe', { label: "🌍 Spin the globe", lines: ['You spin the globe and point... Australia!', 'You spin the globe and point... the middle of the ocean.'] }),
  ], { who: 'janitor', name: 'the janitor', x: 1080, y: 420, lines: ["School's out! I'm giving the floors a good polish.", 'Mind the wet floor, kiddo.', 'Found a lost lunchbox. Not yours, is it?'] }),
  hospital: { ...room('hospital', 'Hospital', { wall: '#EAF3FB', trim: '#8FB3D9', floor: ['#F4F6F8', '#E9EEF3'], tiles: true }, [
    onWall(120, 60, 220, 110, '#FFFFFF', 'WASH YOUR HANDS!'),
    onWall(1010, 40, 130, 170, '#FFFFFF', 'E\nF P\nT O Z', undefined, { label: '👓 The eye chart', action: 'eyes' }),        // Dr. Nonna's (eyes.ts)
    onWall(830, 50, 150, 110, '#1E2733', 'X-RAY', undefined, { label: '🩻 The X-ray light box', action: 'surgery' }),       // Dr. Poppop's (surgery.ts)
    block(420, 330, 360, 60, 80, '#F4F6F8', '#8FB3D9', 'clipboard stethoscope'),
    ...[0, 1, 2, 3].map(i => block(130 + i * 120, 600, 90, 40, 50, '#5B8FD6', '#4A79B8', undefined, sitHere('🪑 Sit in the waiting room'))),
    block(880, 560, 240, 90, 50, '#FFFFFF', '#C9D3DC', 'pillow', { label: 'pillow Lie on the bed', lines: ['The paper on the bed crinkles. Crinkle crinkle!'] }),
    big(1120, 330, 'plant', 70, undefined, [50, 30]),
  ], { who: 'nurse', name: 'the nurse', x: 600, y: 322, lines: ['Let me check... healthy as a horse!', 'Open wide and say aah! Perfect.', 'Here, have a sticker for being brave. ⭐'], treat: { label: '🩺 Get a check-up', boost: 20 } }),
    // on hospital days, Nico's grandparents are here as doctors (2026-10-12: Nonna an ophthalmologist, Poppop a surgeon)
    crew: [
      { who: 'nonnadoc', name: 'Dr. Nonna', x: 1010, y: 420, face: 'qfront', flip: true, docs: true, action: 'eyes', label: '👓 Help Dr. Nonna with eye exams',
        lines: ['Ciao, Nico! Come, help me with my patients.', 'Read me the bottom line... very good!', 'Eyes are the windows to the soul, you know.'] },
      { who: 'poppopdoc', name: 'Dr. Poppop', x: 250, y: 420, face: 'qfront', docs: true, action: 'surgery', label: '🩺 Help Dr. Poppop',
        lines: ['Scrub in, kiddo! Steady hands.', 'Measure twice, cut once. Same in here as in the woodshop.', 'Every patient goes home smiling.'] },
    ] },
  fire: room('fire', 'Fire Station', { wall: '#F2D6CF', trim: '#8C2F2B', floor: ['#C9CED6', '#BCC2CB'] }, [
    onWall(120, 40, 260, 140, '#FFFFFF', undefined, 'helmet helmet helmet', { label: '⛑️ Try on a helmet', lines: ["It's way too big! It covers your eyes.", 'You look like a real firefighter!'] }),
    big(640, 560, 'firetruck', 105, { label: '🔔 Ring the truck\'s bell', action: 'bell' }, [360, 90]),
    block(900, 262, 240, 50, 200, '#9AA6B2', '#C9D3DC', 'extinguisher axe'),
    block(470, 262, 26, 26, 240, '#C9D3DC', '#E9EEF3', undefined, { label: '🎢 Slide down the pole', lines: ['Wheeee! You slide down the pole. Pretty fast!', 'Down the pole! The firefighters cheer.'] }),
  ], { who: 'firefighter', name: 'the firefighter', x: 300, y: 400, lines: ['When the alarm rings, we\'re out the door in a minute flat!', 'Want to see the truck? Ring the bell!', 'Stay safe, Nico!'] }),
  icecream: room('icecream', 'Ice Cream', { wall: '#FFE3EA', stripe: '#FFFFFF', trim: '#7FD1C1', floor: ['#FFFFFF', '#F7C8D0'], tiles: true }, [
    onWall(380, 40, 440, 150, '#7FD1C1', '12 FLAVOURS!'),
    block(300, 350, 600, 70, 90, '#E9F7F5', '#7FD1C1', 'icecream'),
    ...[[200, 600], [600, 580], [1000, 600]].map(([x, y]) => block(x - 60, y, 120, 50, 60, '#F7C8D0', '#E8A9B4', undefined, sitAt('🪑 Sit at a table'))),
  ], { who: 'scoop', name: 'the ice cream server', x: 600, y: 340, lines: ['What flavour today?'], action: 'icecream' }),
  parts: room('parts', 'Parts & Tools', { wall: '#DCE6EE', trim: '#34495E', floor: ['#C9CED6', '#BCC2CB'] }, [
    onWall(80, 40, 360, 170, '#C9A46A', undefined, 'wrench hammer screwdriver saw ruler', { label: '🔧 Look at the tools', lines: ['So many wrenches! Big ones, tiny ones.', 'A saw, a drill, a level. Poppop would love it here.'] }),
    block(560, 262, 260, 40, 200, '#9AA6B2', '#5B6472', 'wheel gear battery bulb bolt'), block(880, 262, 260, 40, 200, '#9AA6B2', '#5B6472', 'twine sticks wood tin'),
    block(380, 520, 440, 70, 80, '#F9A826', '#D98C1A', 'receipt'),
  ], { who: 'clerk', name: 'the clerk', x: 600, y: 510, lines: ['What are you building today?'], action: 'parts' }),
  toys: room('toys', 'Toy Shop', { wall: '#F7E3EC', stripe: '#FFFFFF', trim: '#5FAFA5', floor: ['#BFE3DA', '#A9D6CB'] }, [
    block(80, 262, 300, 40, 210, '#FFFFFF', '#5FAFA5', 'teddy robot yoyo dice'), block(420, 262, 300, 40, 210, '#FFFFFF', '#5FAFA5', 'toycar train plane ufo'),
    block(760, 262, 360, 40, 210, '#FFFFFF', '#5FAFA5', 'kite target puzzle doll', { label: '🧸 Look at the toys', lines: ['A wind-up robot! It walks in circles.', 'A kite shaped like a dragon.', 'A puzzle with 1000 pieces. Yikes.'] }),
    block(420, 560, 360, 70, 80, '#F7C8D0', '#E5484D', 'gift'),
  ], { who: 'toyshop', name: 'the toy shop owner', x: 600, y: 550, lines: ['Got something to sell? I love homemade toys!'], action: 'toys' }),
  garage: room('garage', 'Garage', { wall: '#D8D2C4', trim: '#6B7280', floor: ['#B8BEC6', '#AEB4BC'] }, [
    onWall(100, 50, 400, 150, '#C9A46A', undefined, 'wrench hammer screwdriver saw', { label: '🔧 Look at the tool wall', lines: ['Every tool has its outline drawn on the board. Very tidy.'] }),
    rug(450, 520, 300, 120, '#8E949C'),
    block(820, 262, 300, 60, 70, '#B9895A', '#8A5A3B', 'toolbox bolt', { label: '🚗 Your car', action: 'garage' }),
    big(260, 690, 'bike', 110, { label: 'bike Ring the bike bell', lines: ['Ring ring!'] }, [120, 30]),
  ]),
  barn: room('barn', 'The Farm', { wall: '#B85C4E', stripe: '#A34E42', trim: '#7A3B33', floor: ['#D9C99A', '#CDBB8A'] }, [
    block(80, 262, 260, 80, 110, '#F2D27A', '#E3BC5A', undefined, { label: '🌾 Jump in the hay', lines: ['You jump in the hay. It gets EVERYWHERE.'] }),
    block(80, 480, 180, 70, 80, '#F2D27A', '#E3BC5A'),
    big(560, 420, 'cow', 140, { label: 'cow Pet the cow', lines: ['Moooo!', 'The cow licks your hand. Slobbery!'] }, [140, 40]),
    big(860, 430, 'horse', 130, { label: 'horse Pat the horse', lines: ['The horse neighs and swishes her tail.'] }, [120, 40]),
    big(300, 640, 'chicken', 160), big(380, 680, 'chick', 150),
    block(900, 600, 220, 60, 50, '#B9895A', '#8A5A3B', 'eggs eggs'),
  ], { who: 'farmer', name: 'the farmer', x: 700, y: 640, lines: ['Mind the chickens!'], action: 'barn' }),
  poolhouse: room('poolhouse', 'Pool House', { wall: '#DCF2F8', trim: '#2F7FA8', floor: ['#E9F7FB', '#D3EEF5'], tiles: true }, [
    ...[0, 1, 2, 3, 4, 5].map(i => block(80 + i * 90, 262, 80, 40, 180, '#5B8FD6', '#4A79B8')),
    block(700, 262, 420, 50, 70, '#F9C846', '#E3A92A', 'flipflops goggles duck ringbuoy', { label: '🛟 Look at the pool toys', lines: ['Goggles, flippers and a giant inflatable duck.'] }),
    block(200, 560, 400, 50, 40, '#B9895A', '#8A5A3B', undefined, sitHere('🪑 Sit on the bench')),
  ], { who: 'lifeguard', name: 'the lifeguard', x: 900, y: 560, lines: ['No running by the pool! Walk, please.', 'Try the water slide, it\'s super fast!', 'Remember: swim with a buddy.'] }),
  cabin: room('cabin', 'Ranger Station', { wall: '#C9A07A', stripe: '#B88E68', trim: '#4E6B3A', floor: ['#A8754A', '#9B6A42'] }, [
    onWall(120, 40, 300, 170, '#DDE8C8', 'TRAIL MAP', undefined, { label: '🗺️ Look at the trail map', lines: ['The lake trail is 2 miles. Watch for deer!', 'X marks the campground. The fox lives near the lake.'] }),
    onWall(520, 60, 360, 110, '#F2E2B6', undefined, 'deer fox rabbit owl'),
    block(500, 420, 300, 70, 80, '#8A5A3B', '#6B4430', 'binoculars notebook'),
    big(1050, 440, 'bear', 120, { label: 'bear Pat the (stuffed) bear', lines: ["It's a stuffed bear. Phew!"] }, [100, 40]),
    block(80, 600, 260, 60, 50, '#6B4430', '#4E3220', undefined, sitHere('🪵 Sit on the log bench')),
  ], { who: 'ranger', name: 'the ranger', x: 650, y: 412, lines: ['Got photos for me?'], action: 'cabin' }),
  // Nico's grandparents (from family photos, reference only): Nonna's kitchen, Poppop's woodshop (a red barn
  // garage, with a CNC router and a plasma cutter), Yia-Yia's painting studio
  nonna: room('nonna', 'Poppop and Nonna', { wall: '#D9A25E', stripe: '#C98F4C', trim: '#7A5236', floor: ['#B9773E', '#AE6D36'], pine: true }, [
    // the kitchen: a stainless fridge, cherry cabinets under granite, the stove (Nonna's pot of sauce), the big digit clock
    block(40, 262, 110, 60, 220, '#E9EEF3', '#C9D3DC'),
    block(165, 262, 185, 70, 80, '#2C3440', '#8A4A32', 'tomato garlic olive'),
    block(365, 262, 140, 70, 90, '#2C3440', '#5B6472', 'pot'),
    onWall(190, 40, 140, 60, '#1E2733', '15:55'),   // (the big digit clock)
    onWall(530, 46, 110, 104, '#FFFFFF', undefined, 'face1 face2', { label: 'canvas Look at the family photos', lines: ['A photo of you as a baby, covered in tomato sauce.', 'Poppop and Nonna on their wedding day.', 'Every cousin at Christmas, in matching pyjamas.'] }),
    // the dining room: the long table with the embroidered cloth (panettone!), the sideboard under the griffins of Perugia
    onWall(670, 40, 230, 120, '#F2E2C4', 'PERVSIA', 'griffin griffin'),
    block(670, 262, 230, 50, 70, '#7A5236', '#8A5A3B', 'wine rooster candle wine', { label: '🦅 Look at the griffin banner', lines: ['Two griffins from Perugia, in Italy. "Augusta Perusia" is the city\'s old Latin name.', 'Nonna says Perugia has the best chocolate in the world.', 'A rooster on the sideboard. Nonna says he keeps an eye on things.'] }),
    block(120, 500, 360, 70, 60, '#FFFFFF', '#EFE6D8', 'panettone plate wine plate', sitAt('🍽️ Sit at the table')),
    // the living room: the stone fireplace, Nonna's Eames chair, the yellow chair, the recliner, the leather sofa
    rug(660, 470, 500, 300, '#A8463D', '#2F4A6B'),
    big(1040, 300, 'fireplace', 100, { label: '🔥 Warm up by the fire', lines: ['The fire crackles. Toasty!', 'Everyone\'s name is on the mantel. There\'s yours: NICO!', 'Stockings for everybody. Somebody\'s already full of chocolate.'] }, [250, 40]),
    armchair(700, 500, 'recliner', 85, '🛋️ Sit in the recliner', [110, 40], 46),
    armchair(880, 470, 'eames', 95, "🪑 Sit in Nonna's Eames chair", [120, 40], 48),
    armchair(1110, 490, 'shellchair', 85, '🪑 Sit in the yellow chair', [100, 36], 44),
    block(800, 590, 200, 50, 40, '#9A6A3E', '#7A5236', 'books candle'),
    block(760, 660, 330, 64, 70, '#7A5A3A', '#6B4E32', undefined, sitHere('🛋️ Sit on the leather sofa')),
    big(1150, 700, 'micalamp', 75, { label: '💡 The mica lamp', lines: ['The lamp makes everything glow orange. Cozy.'] }, [50, 26]),
  ], { who: 'nonna', name: 'Nonna', x: 435, y: 250, lines: ['Ciao, Nico! Are you hungry? You look hungry.'], action: 'nonna' }),
  woodshop: room('woodshop', "Poppop's woodshop", { wall: '#B85C4E', stripe: '#A84E42', trim: '#5E2A24', floor: ['#C9B48A', '#BEA77C'] }, [
    onWall(80, 40, 380, 170, '#C9A46A', undefined, 'hammer saw screwdriver wrench ruler', { label: '🔨 Look at the tool wall', lines: ['Every tool has a hook. Poppop knows where everything is.'] }),
    onWall(980, 50, 140, 100, '#BFE3F5'),
    block(80, 400, 340, 80, 70, '#D9A066', '#8A5A3B', 'wood ruler', { label: '🪚 Build a birdhouse', action: 'birdhouse' }),
    block(520, 262, 280, 120, 110, '#5B6472', '#2C3440', 'cnc gear', { label: '🤖 The CNC router', action: 'cnc' }),
    block(870, 300, 260, 100, 70, '#9AA6B2', '#5B6472', 'spark flame', { label: '⚡ The plasma cutter', action: 'plasma' }),
    block(80, 600, 300, 50, 60, '#C9874A', '#8A5A3B', 'wood wood wood', { label: '🪵 Look at the lumber', lines: ['Oak, maple, pine and cherry. It smells like sawdust in here.'] }),
    rug(560, 600, 300, 120, '#E8D7B8'),   // (sawdust)
  ], { who: 'poppop', name: 'Poppop', x: 700, y: 560, lines: ['Hey there, kiddo! Want to make something?', 'Measure twice, cut once.', 'Safety glasses on! Good.'], action: 'poppop' }),
  yiayia: room('yiayia', "Yia-Yia's studio", { wall: '#FFFFFF', trim: '#2F6FD0', floor: ['#E9EEF3', '#DCE3EA'], tiles: true }, [
    block(110, 520, 160, 50, 160, '#B9895A', '#8A5A3B', 'canvas', { label: '🎨 Paint a picture', action: 'paint' }),   // the easel
    block(330, 560, 260, 70, 60, '#F4F1EA', '#C9D3DC', 'palette brush jar crayon'),
    block(880, 560, 240, 70, 60, '#F9C846', '#E3A92A', undefined, sitHere('🪑 Sit and admire the art')),
    big(1130, 380, 'plant', 70, undefined, [50, 30]),
  ], { who: 'yiayia', name: 'Yia-Yia', x: 760, y: 420, lines: ['Hello, my darling! Shall we paint?', 'Every painting is a good painting.', 'Look at those colours! You\'re an artist.'], action: 'yiayia' }),
  // Litchfield Tang Soo Do (2026-10-11): Nico's real school and its instructors, drawn from the user's photos
  dojo: { ...room('dojo', 'Litchfield Tang Soo Do', { wall: '#F4F2EC', stripe: '#E6E9F2', trim: '#24357A', floor: ['#3E6FD8', '#3567CF'] }, [
    rug(260, 440, 680, 300, '#E2524E', '#3E6FD8'),                                   // the sparring ring on the blue mats
    onWall(120, 40, 90, 170, '#F4F1EA', '당수도'),                                     // a scroll: "Tang Soo Do"
    onWall(980, 50, 170, 110, '#1E2733', 'BELTS', undefined, { label: 'canvas Look at the belts', lines: ['White, yellow, orange, green, blue, purple, brown... and black!', 'Every black belt started as a white belt.'] }),
    big(1060, 520, 'bag', 120, { label: '👊 Hit the punching bag', lines: ['THWACK! The bag swings.', 'Kihap! Great punch!', 'Pow! Pow! Pow!'] }, [40, 30]),
    block(120, 600, 200, 60, 50, '#B9895A', '#8A5A3B', undefined, sitHere('🪑 Sit and watch')),
  ], { who: 'krantz', name: 'Mr. Master Krantz', x: 600, y: 400, lines: ['Welcome to Litchfield Tang Soo Do!', 'Focus first. Then strike.', 'A black belt is a white belt who never quit.'], action: 'dojo' }),
  crew: [
    { who: 'mrskrantz', name: 'Mrs. Master Krantz', x: 470, y: 420, lines: ['Hi Nico! Ready for class?', 'Remember to bow when you step on the mat.', 'Great kicks today!', 'Stand tall, eyes forward.'] },
    { who: 'schindewolf', name: 'Master Schindewolf', x: 960, y: 560, face: 'qfront', flip: true, lines: ['Chamber that kick, Nico!', 'Keep your guard up.', 'Kihap! Let me hear it!', 'Again. Sharper this time.'] },
    { who: 'heidi', name: 'Miss Heidi', x: 800, y: 440, face: 'qfront', flip: true, lines: ['Hi Nico! Ready to work hard?', 'Bend those knees. Strong stance!', 'Breathe in... and KIHAP!', 'Nice form! Keep your hands up.', 'Let\'s see that front kick!'] },
    { who: 'erin', name: 'Erin', x: 230, y: 500, face: 'qfront', lines: ['Hi Nico! Want to practice your form?', 'Nice stance!', 'Stretch first, then kick high.', 'You\'re getting faster!'] },
  ] },
  // Nico's friends' shops (2026-10-11), the friends drawn from photos the user shared (reference only)
  potato: room('potato', "Yarosh's Potatoes", { wall: '#F7E6C4', stripe: '#FFFFFF', trim: '#8A5A3B', floor: ['#FFFFFF', '#F2D9A0'], tiles: true }, [
    onWall(40, 40, 320, 160, '#2F3B33', 'POTATOES!', 'bakedpot tots mash chips', { label: '📋 Read the menu', lines: ['Baked, mashed, curly, tots. Every potato, every way.', 'Today\'s special: a baked potato with EVERYTHING on it.', 'Small print: "No, we don\'t do salads."'] }),
    block(300, 330, 600, 70, 90, '#F4EBD6', '#C9874A', 'bakedpot potato potato'),
    onWall(660, 40, 260, 130, '#F9C846', 'EVERY POTATO,\nEVERY WAY'),
    block(940, 262, 200, 60, 110, '#9AA6B2', '#5B6472', 'fries', { label: '🍟 Peek in the fryer', lines: ['Sizzle sizzle! The curly fries go round and round.', 'It smells amazing in here.'] }),
    block(330, 530, 220, 55, 70, '#D9A066', '#8A5A3B', 'potato potato potato', { label: '🔪 Help Yarosh peel potatoes', action: 'peel' }),   // the peeling board (peel.ts)
    big(130, 470, 'potsack', 110, { label: '🥔 Look at the potatoes', lines: ['A whole sack of potatoes. Some of them have funny faces.', 'Yarosh says this one looks like you.', 'Russet, red, gold, sweet. Who knew there were so many?'] }, [90, 30]),
    big(1040, 600, 'washtub', 120, { label: '💦 Bob for bakers!', action: 'bob' }, [150, 46]),   // (bob.ts)
    ...[[260, 640], [760, 650]].map(([x, y]) => block(x - 70, y, 140, 50, 60, '#E8C18A', '#B9895A', undefined, sitAt('🪑 Sit at a table'))),
  ], { who: 'yarosh', name: 'Yarosh', x: 600, y: 322, lines: ['Potatoes! What\'ll it be?'], action: 'potato' }),
  retro: room('retro', "Alpha's Retro Games", { wall: '#2B2A4A', stripe: '#3B3768', trim: '#4FE3C1', floor: ['#2F2F38', '#26262E'], tiles: true }, [
    onWall(60, 40, 300, 160, '#1E2733', 'HIGH SCORES', undefined, { label: '🏆 Read the high scores', action: 'scores' }),
    block(420, 262, 330, 40, 200, '#5B6472', '#3E4A5A', 'cartridge cartridge2 cartridge3 cartridge', { label: '👾 Look at the games', lines: ['Games from before you were born. Before Mom was born, even.', 'A whole shelf of cartridges. Some of them say DO NOT BLOW ON ME.', 'A game about a plumber. A game about a hedgehog. A game about a frog crossing the road.'] }),
    block(800, 262, 330, 40, 200, '#5B6472', '#3E4A5A', 'crt console handheld joystick', { label: '📺 Look at the old consoles', lines: ['A TV as deep as it is wide. It hums when you turn it on.', 'A handheld with a green screen. Alpha says the batteries last forever.'] }),
    // the cabinets (arcade/games.ts): one game each
    big(110, 690, 'arcade', 165, { label: '🕹️ Play Snake', action: 'arcade:snake' }, [72, 34]),
    big(250, 690, 'arcade2', 165, { label: '🕹️ Play Space Blasters', action: 'arcade:blasters' }, [72, 34]),
    big(390, 690, 'arcade3', 165, { label: '🕹️ Play Brick Breaker', action: 'arcade:bricks' }, [72, 34]),
    big(1100, 720, 'arcade4', 165, { label: '🕹️ Play Frog Hop', action: 'arcade:frog' }, [72, 34]),
    block(760, 500, 300, 60, 80, '#4FE3C1', '#3B3768', 'handheld cartridge2'),
    rug(440, 380, 300, 110, '#3B3768', '#E5484D'),
  ], { who: 'alpha', name: 'Alpha', x: 930, y: 490, lines: ['Welcome to Alpha\'s Retro Games! Everything still works. Mostly.', 'Try the Snake machine. Beat my high score, I dare you.', 'If a game doesn\'t work, blow on it. Trust me.', 'These games are older than my dad.', 'Frog Hop is my favourite. The logs are sneaky.'] }),
  // Maya's: a bookworm's house (books everywhere, a piano, a reading nook)
  h1: home('h1', "Maya's house", { wall: '#FBE3C7', trim: '#C97A3A', floor: ['#E3C49A', '#D9B88A'] }, [
    big(110, 300, 'bookcase', 100, { label: '📚 Look at the books', lines: ['Maya has read ALL of these. Some twice.', 'A whole shelf of dragon books!', 'An encyclopedia. Volume M is missing: Maya has it.'] }, [100, 36]),
    big(220, 300, 'bookcase', 100, undefined, [100, 36]),
    photos(300, 'Maya', ['{kid} at the library, with a stack of books taller than her.', 'A photo of {kid} at her piano recital.']),
    big(560, 300, 'piano', 100, { label: '🎹 Play the piano', lines: ['Plink plonk! You play Chopsticks.', 'You play the only song you know. Twice.', 'Maya\'s mom claps. "Bravo!"'] }, [140, 40]),
    window_(700),
    block(880, 262, 270, 70, 80, '#F4F6F8', '#E8C9A0', 'apple milk cookies'),
    rug(100, 500, 320, 220, '#F28C38', '#FBE3C7'),
    armchair(250, 590, 'chairteal', 85, '📖 Curl up with a book', [110, 40], 46),
    big(120, 640, 'floorlamp', 80, undefined, [30, 20]),
    block(780, 520, 200, 60, 70, '#E8C18A', '#B9895A', 'books globe', sitAt('✏️ Sit at the homework desk')),
    big(1150, 720, 'plant', 70, undefined, [50, 30]),
  ], 'mom', "Maya's mom", [1080, 470], ["Hi Nico! Maya's out playing.", 'Would you like some lemonade?'], { label: '🍋 Lemonade', boost: 20 }),
  // Leo's: a big TV and games, beanbags, and (of course) an ice cream freezer
  h2: home('h2', "Leo's house", { wall: '#D6EEE9', trim: '#3E8F8A', floor: ['#C9CED6', '#BCC2CB'] }, [
    onWall(100, 40, 130, 160, '#2F6FD0', 'GO\nTEAM!'),
    block(80, 262 + 140, 160, 40, 50, '#B9895A', '#8A5A3B', 'skateboard guitar'),
    block(380, 262, 320, 60, 130, '#3E4A5A', '#2C3440', 'TV', { label: '📺 Watch the big TV', lines: TV_LINES }),
    window_(760),
    block(940, 262, 200, 60, 110, '#E9F7F5', '#7FD1C1', 'icecream icecream', { label: '🍦 Peek in the ice cream freezer', lines: ['Eleven kinds of ice cream. Leo\'s dad says it\'s "for guests".', 'Mint chocolate chip, rocky road, and something called Moose Tracks.'] }),
    block(420, 440, 240, 50, 34, '#B9895A', '#8A5A3B', 'console joystick'),
    block(330, 580, 420, 70, 60, '#5B6472', '#4A5260', undefined, sitHere('🛋️ Flop on the couch')),
    block(130, 640, 110, 50, 40, '#E5484D', '#C8463D', undefined, sitHere('🫘 Flop on the beanbag')),
    block(840, 640, 110, 50, 40, '#F9C846', '#E3A92A', undefined, sitHere('🫘 Flop on the beanbag')),
  ], 'dad', "Leo's dad", [1030, 520], ["Leo? He's at the ice cream shop, as usual.", 'Want a granola bar?'], { label: '🥜 Granola bar', boost: 20 }),
  // Sam's: his grandma's cozy house (a ticking grandfather clock, a rocking chair, cookies always baking)
  h3: home('h3', "Sam's house", { wall: '#F7E9C8', stripe: '#F2DDB0', trim: '#B5654F', floor: ['#C9874A', '#BE7C40'] }, [
    big(100, 300, 'grandclock', 100, { label: '🕰️ The grandfather clock', lines: ['Tick... tock... BONG!', 'It\'s older than Sam\'s grandma. She says so, anyway.'] }, [60, 30]),
    onWall(220, 60, 180, 110, '#FFFFFF', 'HOME\nSWEET\nHOME', undefined, { label: '🧵 Look at the stitching', lines: ['Sam\'s grandma stitched this herself. Every letter!'] }),
    window_(460, 140),
    block(700, 262, 290, 70, 80, '#F4F6F8', '#C9874A', 'cookies milk'),
    block(1010, 262, 140, 70, 100, '#E9EEF3', '#9AA6B2', 'cookie'),
    rug(150, 470, 280, 190, '#E5484D', '#F9C846'),
    armchair(280, 560, 'rocker', 90, '🪑 Rock in the rocking chair', [90, 36], 46),
    block(110, 690, 80, 40, 40, '#C9A46A', '#A8834A', 'twine'),
    block(420, 640, 300, 64, 70, '#E8A9B4', '#D98C9A', undefined, sitHere('🛋️ Sit on the flowery sofa')),
    block(850, 510, 220, 60, 60, '#F7C8D0', '#E8A9B4', 'cookies milk', sitAt('🍪 Sit at the kitchen table')),
  ], 'grandma', "Sam's grandma", [850, 250], ["Oh, hello dear! Sam's at the toy shop.", 'Have a cookie, fresh out of the oven.'], { label: '🍪 A warm cookie', boost: 25 }),
  // Ava's: a soccer family (a shelf of trophies, cleats by the door)
  h5: home('h5', "Ava's house", { wall: '#D9ECF7', trim: '#2F6FD0', floor: ['#E3C49A', '#D9B88A'] }, [
    block(80, 262, 300, 40, 140, '#FFFFFF', '#5B78AA', 'trophy trophy trophy', { label: '🏆 Look at the trophies', lines: ['Most Goals, Best Teammate, and one for "Loudest Cheering".', 'Ava\'s first trophy, from when she was four. It\'s tiny!'] }),
    onWall(420, 40, 230, 150, '#3E8F5A', 'GOAL!', 'star', { label: '⚽ The soccer poster', lines: ['A poster of Ava\'s favourite player, mid-kick.', 'Ava drew a mustache on him. Her dad hasn\'t noticed.'] }),
    window_(720),
    block(900, 262, 250, 70, 80, '#F4F6F8', '#F28C38', 'apple apple milk'),
    block(250, 520, 320, 64, 70, '#D77B72', '#C25F57', undefined, sitHere('🛋️ Sit on the sofa')),
    armchair(700, 560, 'chairblue', 85, '🪑 Sit in the armchair', [110, 40], 46),
    block(860, 520, 240, 60, 60, '#E8C18A', '#B9895A', 'plate apple', sitAt('🍊 Sit at the table')),
    block(80, 700, 140, 40, 30, '#9AA6B2', '#7A8694', 'socks socks'),
  ], 'dad', "Ava's dad", [1020, 250], ["Ava's practicing soccer. She's getting good!", 'Want an orange slice? Soccer snack!'], { label: '🍊 Orange slices', boost: 20 }),
  // Mrs. Kim's: plants everywhere, a bonsai, and a tea table
  h6: home('h6', "Mrs. Kim's house", { wall: '#EDE3F5', trim: '#7B5BA6', floor: ['#D9C99A', '#CDBB8A'] }, [
    onWall(110, 40, 90, 170, '#F4F1EA', '花'),
    big(250, 320, 'plant', 95, undefined, [60, 30]),
    block(330, 262, 150, 40, 80, '#5E3E28', '#4A2F20', 'plant', { label: '🌳 Look at the bonsai', lines: ['A tiny tree, fifty years old! Mrs. Kim trims it with tiny scissors.', 'Mr. Kim says it\'s older than their car.'] }),
    window_(530, 180),
    block(860, 262, 260, 70, 80, '#F4F6F8', '#B9A3D6', 'pot apple'),
    big(1150, 330, 'plant', 85, undefined, [50, 30]),
    rug(380, 490, 360, 220, '#7B5BA6', '#EDE3F5'),
    block(440, 540, 240, 60, 40, '#8A5A3B', '#6B4430', 'pot cookies', sitAt('🍵 Sit down for tea')),
    armchair(880, 560, 'chairgreen', 85, '🪑 Sit in the armchair', [110, 40], 46),
    big(110, 700, 'plant', 70, undefined, [50, 30]),
    big(1130, 700, 'plant', 75, undefined, [50, 30]),
  ], 'grandma', 'Mr. Kim', [1000, 520], ['Mrs. Kim is out watering the flowers.', 'Would you like some tea? Kids\' tea: mostly honey.'], { label: '🍯 Honey tea', boost: 20 }),
  // Mr. Brooks's: a doctor's house (medical books, his desk, a big aquarium)
  h7: home('h7', "Mr. Brooks's house", { wall: '#F2E6CF', trim: '#C7443B', floor: ['#B9773E', '#AE6D36'] }, [
    big(100, 300, 'bookcase', 100, { label: '📚 Look at the books', lines: ['"Bones of the Body", "The Heart", "Germs!". A doctor\'s books.', 'A book called "1001 Jokes for Doctors". Dog-eared.'] }, [100, 36]),
    big(210, 300, 'bookcase', 100, undefined, [100, 36]),
    block(330, 262, 240, 60, 75, '#B9895A', '#8A5A3B', 'books clipboard stethoscope', sitAt("📋 Sit at Mr. Brooks's desk")),
    onWall(620, 40, 140, 150, '#1E2733', 'BONES', undefined, { label: '🩻 The X-ray poster', lines: ['An X-ray of a hand. Five fingers, lots of little bones.', 'It glows a bit. Spooky!'] }),
    big(960, 300, 'aquarium', 100, { label: '🐠 Watch the fish', lines: ['Three fish: Doc, Nurse, and Bubbles.', 'The orange one keeps hiding behind the plant.'] }, [160, 40]),
    armchair(180, 560, 'chairblue', 85, '🪑 Sit in the armchair', [110, 40], 46),
    block(380, 620, 320, 64, 70, '#C7443B', '#A8382F', undefined, sitHere('🛋️ Sit on the sofa')),
    big(1140, 700, 'plant', 75, undefined, [50, 30]),
  ], 'mom', 'Mrs. Brooks', [900, 540], ["He's at the hospital till six.", 'Here, take a muffin for the road.'], { label: '🧁 A blueberry muffin', boost: 25 }),
};

// ---- drawing
export function drawInterior(r: Interior): { view: Container; layer: Container } {
  const view = new Container(), g = new Graphics(), layer = new Container(); layer.sortableChildren = true;
  const { w, h, wall, colors: c } = r, T = 50;
  g.rect(-3000, -3000, w + 6000, h + 6000).fill('#2B2320');
  if (c.tiles) { for (let j = 0; wall + j * T < h; j++) for (let i = 0; i * T < w; i++) g.rect(i * T, wall + j * T, T, T).fill((i + j) % 2 ? c.floor[0] : c.floor[1]); }
  else for (let j = 0; wall + j * 40 < h; j++) g.rect(0, wall + j * 40, w, 40).fill(j % 2 ? c.floor[0] : c.floor[1]).rect(0, wall + j * 40 + 38, w, 2).fill({ color: '#000000', alpha: 0.08 });
  g.rect(0, 0, w, wall).fill(c.wall);
  if (c.stripe) for (let x = 0; x < w; x += 46) g.rect(x, 0, 18, wall).fill({ color: c.stripe, alpha: 0.4 });
  if (c.pine) for (let x = 0, i = 0; x < w; x += 46, i++) {   // plank seams and knots
    g.rect(x, 0, 2, wall).fill({ color: '#6B4430', alpha: 0.35 });
    for (const y of [(i * 67) % 190 + 20, (i * 131 + 90) % 200 + 10]) g.ellipse(x + 23, y, 5, 3.5).fill({ color: '#8A5A2B', alpha: 0.55 });
  }
  g.rect(0, wall - 14, w, 14).fill(c.trim);
  g.roundRect(w / 2 - 100, h - 30, 200, 30, 6).fill('#5E3E28');   // the door
  view.addChild(g, layer);
  for (const t of r.things) {
    layer.addChild(thingArt(t));
    if (t.kind === 'block' && t.use?.at) layer.addChild(chairArt(t));
  }
  return { view, layer };
}
export function thingArt(t: Thing): Container {
  const c = new Container(), g = new Graphics(); c.addChild(g);
  if (t.kind === 'rug') {
    g.ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2 + 6, t.h / 2 + 6).fill('#FFFFFF').ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2, t.h / 2).fill(t.color);
    if (t.color2) g.ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2 - 30, t.h / 2 - 20).fill(t.color2);
    c.zIndex = -1;
  } else if (t.kind === 'wall') {
    g.roundRect(t.x - BAND, t.y - BAND, t.w + 2 * BAND, t.h + 2 * BAND, 8).fill(t.frame ?? '#FFFFFF').roundRect(t.x, t.y, t.w, t.h, 6).fill(t.fill);
    if (t.text) { const x = new Text({ text: t.text, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900', fontSize: Math.min(30, t.h * 0.3), fill: t.fill === '#2F3B33' || t.fill === '#1E2733' ? '#FFFFFF' : NAVY, align: 'center' } }); x.anchor.set(0.5); x.position.set(t.x + t.w / 2, t.y + (t.items ? t.h * 0.3 : t.h / 2)); c.addChild(x); }
    if (t.text === 'TRAIL MAP') g.moveTo(t.x + 30, t.y + t.h - 30).bezierCurveTo(t.x + 90, t.y + 60, t.x + 170, t.y + t.h - 20, t.x + t.w - 40, t.y + 70).stroke({ width: 4, color: '#C8463D' }).circle(t.x + t.w - 40, t.y + 70, 7).fill('#C8463D').ellipse(t.x + 90, t.y + t.h - 50, 34, 16).fill('#7FB8D9');
    if (t.fill === '#7FD1C1' && !t.items && !t.text) g.circle(t.x + t.w * 0.3, t.y + t.h * 0.3, 7).fill('#F9C846').poly([t.x, t.y + t.h, t.x + t.w * 0.45, t.y + t.h * 0.45, t.x + t.w * 0.7, t.y + t.h * 0.7, t.x + t.w, t.y + t.h * 0.5, t.x + t.w, t.y + t.h]).fill('#3E8F5A');   // a landscape
    if (t.items) for (const q of iconRow(t.items, t.x + t.w / 2, t.y + t.h * (t.text ? 0.68 : 0.55), Math.min(40, t.h * 0.42), Math.min(60, t.w / Math.max(1, t.items.split(' ').length)))) c.addChild(q);
    c.zIndex = 0;
  } else if (t.kind === 'block') {
    const F = t.y + t.d, top = F - t.h, depth = Math.min(34, t.d);
    g.ellipse(t.x + t.w / 2 + 8, F - 2, t.w / 2 + 8, 12).fill({ color: NAVY, alpha: 0.18 });
    g.roundRect(t.x - BAND, top - depth - BAND, t.w + 2 * BAND, t.h + depth + 2 * BAND, 9).fill('#FFFFFF');
    g.roundRect(t.x, top, t.w, t.h, 6).fill(t.front).roundRect(t.x, top - depth, t.w, depth + 4, 8).fill(t.top);
    if (t.items === 'TV') g.roundRect(t.x + 14, top + 10, t.w - 28, t.h - 30, 6).fill('#1E2733').roundRect(t.x + 20, top + 16, t.w - 40, t.h - 42, 4).fill('#2C3E52');   // a TV on the cabinet
    else if (t.items) for (const q of iconRow(t.items, t.x + t.w / 2, top - depth / 2 - 6, 38, Math.min(60, t.w / Math.max(1, t.items.split(' ').length)))) c.addChild(q);
    c.zIndex = F;
  } else {
    const x = bigThing(t.e, t.size); x.position.set(t.x, t.y); c.addChild(x);
    c.zIndex = t.y;
  }
  return c;
}
// ---- seats
/** A chair in front of a desk or table (Use.at), pulled up to it, its back to the room. All in world px:
 * `floor` is where its legs stand (its zIndex: anyone sitting on it draws just behind it, so the backrest
 * covers their lower back), `hip` where a sitter's hips go. */
export const CHAIR = { gap: 30, seat: 34, depth: 14, w: 46, back: 22 };   // (back: how far the backrest rises over the seat: about half a sitter's back)
export function chairOf(t: Extract<Thing, { kind: 'block' }>) {
  const x = t.x + t.w / 2, floor = t.y + t.d + CHAIR.gap;
  return { x, floor, hip: floor - CHAIR.seat - CHAIR.depth / 2 };
}
/** Where a sitter's hips go on a block they sit on (a sofa, a bench): on its top, a little back from the
 * front edge, drawn in front of it (z). And where they stand up to. */
export function seatOf(t: Extract<Thing, { kind: 'block' }>) {
  const F = t.y + t.d, top = F - t.h, depth = Math.min(34, t.d);
  return { x: t.x + t.w / 2, hip: top - depth * 0.4, z: F + 1 };
}
function chairArt(t: Extract<Thing, { kind: 'block' }>): Container {
  const { x, floor } = chairOf(t), { w, seat, depth, back } = CHAIR, c = new Container(), g = new Graphics(), wood = t.front, top = floor - seat;
  g.ellipse(x + 4, floor - 1, w / 2 + 4, 6).fill({ color: NAVY, alpha: 0.16 });
  g.roundRect(x - w / 2 - BAND, top - back - BAND, w + 2 * BAND, seat + back + 2 * BAND, 8).fill('#FFFFFF');   // (the sticker edge)
  g.rect(x - w / 2 + 3, top, 6, seat).fill(wood).rect(x + w / 2 - 9, top, 6, seat).fill(wood);                 // legs
  g.roundRect(x - w / 2, top - depth, w, depth + 4, 4).fill(t.top);                                            // the seat
  g.roundRect(x - w / 2, top - back, w, back, 6).fill(wood).roundRect(x - w / 2 + 6, top - back + 5, w - 12, 6, 3).fill(t.top);   // the backrest
  c.addChild(g); c.zIndex = floor; return c;
}

/** What you bump into: blocks and big emoji (their `solid` footprint), and the back wall. */
export function interiorSolids(r: Interior): { x: number; y: number; w: number; d: number }[] {
  const out = [{ x: 0, y: 0, w: r.w, d: r.wall + 14 }, ...(r.crew ?? []).map(p => ({ x: p.x - 22, y: p.y - 16, w: 44, d: 18 }))];
  for (const t of r.things) {
    if (t.kind === 'block') out.push({ x: t.x, y: t.y, w: t.w, d: t.d });
    if (t.kind === 'block' && t.use?.at) { const ch = chairOf(t); out.push({ x: ch.x - CHAIR.w / 2, y: ch.floor - 14, w: CHAIR.w, d: 14 }); }
    if (t.kind === 'emoji' && t.solid) out.push({ x: t.x - t.solid[0] / 2, y: t.y - t.solid[1], w: t.solid[0], d: t.solid[1] });
  }
  return out;
}
/** Where to stand to use a thing: just in front of it. */
export function useSpot(t: Thing): [number, number] {
  if (t.kind === 'block') return [t.x + t.w / 2, t.y + t.d + 50];
  if (t.kind === 'wall') return [t.x + t.w / 2, 250 + 70];
  if (t.kind === 'emoji') return [t.x, t.y + 60];
  return [t.x + t.w / 2, t.y + t.h / 2];
}
