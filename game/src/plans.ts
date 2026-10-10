// Each product's build plan (data only, no DOM, so tests can check it against the recipes):
// where the parts go and in what order, the tray they start in, and the quick-build steps.
export interface Slot { id: string; kind: string; x: number; y: number; needs: string[] }   // needs: slots that must be filled first
export interface Plan { slots: Slot[]; tray: { kind: string; x: number; y: number; sc: number }[]; steps: [string, string][]; hint: string; why: Record<string, string> }
/** The toy car, top-down, nose to the right. */
export const SLOTS: Slot[] = [
  { id: 'axle0', kind: 'axle', x: 235, y: 150, needs: [] },
  { id: 'axle1', kind: 'axle', x: 365, y: 150, needs: [] },
  { id: 'wheel0', kind: 'wheel', x: 235, y: 62, needs: ['axle0'] },
  { id: 'wheel1', kind: 'wheel', x: 235, y: 238, needs: ['axle0'] },
  { id: 'wheel2', kind: 'wheel', x: 365, y: 62, needs: ['axle1'] },
  { id: 'wheel3', kind: 'wheel', x: 365, y: 238, needs: ['axle1'] },
  { id: 'body', kind: 'body', x: 300, y: 150, needs: ['axle0', 'axle1'] },
];
export const PLANS: Record<string, Plan> = {
  car: { slots: SLOTS, hint: 'Drag the parts onto the plan. Axles first, then wheels, then the body.',
    tray: [
      { kind: 'axle', x: 50, y: 350, sc: 0.45 }, { kind: 'axle', x: 90, y: 350, sc: 0.45 },
      { kind: 'wheel', x: 160, y: 335, sc: 0.8 }, { kind: 'wheel', x: 160, y: 368, sc: 0.8 }, { kind: 'wheel', x: 220, y: 335, sc: 0.8 }, { kind: 'wheel', x: 220, y: 368, sc: 0.8 },
      { kind: 'body', x: 360, y: 350, sc: 0.62 },
    ],
    steps: [['Fit the axles', 'axle'], ['Pop on the wheels', 'wheel'], ['Snap on the body', 'body']],
    why: { wheel: 'Wheels go on the end of an axle: put the axles in first.', body: 'The body goes on last, on top of both axles.' } },
  /** The toy robot, from the front: tin body, gears for its joints, battery inside, bulb on its antenna. */
  robot: { hint: 'Drag the parts onto the plan. The tin body first, then gears and battery, then the bulb.',
    slots: [
      { id: 'tin', kind: 'tin', x: 300, y: 175, needs: [] },
      { id: 'gear0', kind: 'gear', x: 238, y: 190, needs: ['tin'] },
      { id: 'gear1', kind: 'gear', x: 362, y: 190, needs: ['tin'] },
      { id: 'battery', kind: 'battery', x: 300, y: 232, needs: ['tin'] },
      { id: 'bulb', kind: 'bulb', x: 300, y: 62, needs: ['battery'] },
    ],
    tray: [
      { kind: 'tin', x: 80, y: 350, sc: 0.45 },
      { kind: 'gear', x: 200, y: 350, sc: 0.8 }, { kind: 'gear', x: 270, y: 350, sc: 0.8 },
      { kind: 'battery', x: 380, y: 350, sc: 0.8 }, { kind: 'bulb', x: 500, y: 350, sc: 1 },
    ],
    steps: [['Set up the tin body', 'tin'], ['Fit the gears', 'gear'], ['Wire in the battery', 'battery'], ['Screw in the bulb', 'bulb']],
    why: { gear: 'Gears go on the tin body: put the body down first.', battery: 'The battery goes inside the tin body: body first.', bulb: 'The bulb needs power: put the battery in first.', tin: '' } },
};
