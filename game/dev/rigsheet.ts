// Dev page (not part of the game): every character in every pose the game uses, on one sheet, to check the
// rig and the art look right together. npm run dev, then open /dev/rigsheet.html (?page=1 for the next 11
// characters, ?who=nico,primo for some). verify/rig_sheet.py screenshots every page.
import { Application, Container, Graphics, Text } from 'pixi.js';
import { loadArt, PersonView } from '../src/rig/person';
import { neutral, type PoseState } from '../src/rig/pose';
import { MOVES } from '../src/dojo';

export const WHO = ['nico', 'nicoswim', 'nicodobok', 'nicodoc', 'james', 'jamesswim', 'primo', 'primoswim', 'tempo', 'temposwim', 'rea',
  'nonna', 'nonnadoc', 'poppop', 'poppopdoc', 'yiayia', 'mom', 'dad', 'grandma', 'alpha', 'ava', 'leo', 'maya', 'mrbrooks', 'mrskim', 'sam',
  'yarosh', 'clerk', 'cook', 'farmer', 'firefighter', 'janitor', 'lifeguard', 'nurse', 'ranger', 'scoop', 'sensei', 'toyshop', 'krantz',
  'mrskrantz', 'schindewolf', 'erin', 'heidi'];
const P = (o: Partial<PoseState>): PoseState => ({ ...neutral('front'), ...o });
const mv = (k: string) => ({ ...MOVES[k], w: 1 });
const POSES: [string, PoseState][] = [
  ['front', P({})], ['front walk', P({ amp: 1, phase: 0.175, stride_y: 60 })], ['back walk', P({ view: 'back', amp: 1, phase: 0.175, stride_y: -60 })],
  ['qfront', P({ view: 'qfront', amp: 1, phase: 0.1 })], ['qback', P({ view: 'qback', amp: 1, phase: 0.1 })],
  ['side', P({ view: 'side' })], ['side walk', P({ view: 'side', amp: 1, phase: 0.175 })], ['side hold', P({ view: 'side', hold: 1 })],
  ['front hold', P({ hold: 1 })], ['back hold', P({ view: 'back', hold: 1 })], ['qfront hold', P({ view: 'qfront', hold: 1 })],
  ['front crouch\n(dig)', P({ crouch: 1 })], ['front sit\n(sofa/swing)', P({ sit: 1 })], ['back sit\n(desk)', P({ view: 'back', sit: 1 })],
  ['qfront sit', P({ view: 'qfront', sit: 1 })], ['side sit\n(slide)', P({ view: 'side', sit: 1, hold: 0.5 })], ['stool sit', P({ view: 'side', sit: 1, knee: 1 })],
  ['punch', P({ view: 'side', crouch: 0.12, moves: mv('punch') })], ['roundhouse', P({ view: 'side', moves: mv('roundhouse') })],
  ['bow', P({ view: 'side', moves: mv('bow') })], ['wave\n(roof)', P({ wave: 20 })], ['wave other\nway', P({ wave: -20 })],
];
const CW = 100, CH = 150, L = 90, PER = 11;
void (async () => {
  const q = new URLSearchParams(location.search), page = +(q.get('page') ?? 0);
  const who = q.get('who')?.split(',') ?? WHO.slice(page * PER, page * PER + PER);
  const app = new Application();
  await app.init({ width: L + CW * POSES.length + 40, height: 30 + CH * who.length, background: '#B9DA9C', antialias: true, resolution: 2, autoDensity: true });
  document.getElementById('g')!.appendChild(app.canvas);
  await loadArt(who, '../');
  const root = new Container(); app.stage.addChild(root);
  POSES.forEach(([n], c) => { const t = new Text({ text: n, style: { fontSize: 10, fill: '#2B3F55', align: 'center' } }); t.anchor.set(0.5, 0); t.position.set(L + CW * c + CW / 2, 2); root.addChild(t); });
  who.forEach((w, r) => {
    const t = new Text({ text: w, style: { fontSize: 12, fill: '#2B3F55' } }); t.position.set(4, 30 + CH * r + CH / 2); root.addChild(t);
    POSES.forEach(([, st], c) => {
      const pv = new PersonView(w, '../'); pv.setZoom(1, 2);
      const x = L + CW * c + CW / 2, y = 30 + CH * r + CH - 14;
      root.addChild(new Graphics().moveTo(x - 40, y).lineTo(x + 40, y).stroke({ width: 1, color: 0x2B3F55, alpha: 0.3 }));
      pv.pose(x, y, { ...st }); root.addChild(pv.root);
    });
  });
  (window as unknown as { __ready: boolean }).__ready = true;
})();
