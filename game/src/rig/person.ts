// A person on screen (Nico, or anyone drawn on his rig: art/<who>/): one Sprite per exported rig part, posed every frame from pose.ts, with
// the sticker outline + shadow applied live to the whole body (so part seams don't show).
import { Assets, Container, Graphics, Matrix, Sprite, Texture } from 'pixi.js';
import { DropShadowFilter, OutlineFilter } from 'pixi-filters';
import { partOps, opsMatrix, mul, VIEWS, type PoseState, type View } from './pose';
import { NAVY } from '../world/draw';
import { BUILD_ID } from '../update';
import type { Frame } from '../eyes';

interface PartMeta { part: string; img: string; x: number; y: number; w: number; h: number }
interface ArtMeta { res: number; height?: number; views: Record<View, PartMeta[]> }
export type Who = string;   // a folder in art/: 'nico', 'james', 'primo', townspeople...

export const RIG_SCALE = 0.75;   // world px per rig unit (Nico ~ 132 px tall)
export const OUTLINE = 3;        // rig units (was 6, the SVG sticker band; Nico wanted less white)
export const SHADOW = { x: 5, y: 9, blur: 3, alpha: 0.22 };

const arts = new Map<Who, ArtMeta>();
const SHINS: Record<string, string> = { bl: 'bk', fl: 'fk', legl: 'knl', legr: 'knr', legf: 'knf', legn: 'knn' };
// ?v= so a new deploy never mixes with cached art (Pages lets browsers cache files for 10 minutes)
const BUST = `?v=${encodeURIComponent(BUILD_ID)}`;
export const hasArt = (who: Who) => arts.has(who);
export async function loadArt(who: Who[] = ['nico'], base = './'): Promise<void> {
  await Promise.all(who.map(async w => {
    const art = await (await fetch(`${base}art/${w}/${w}.json${BUST}`)).json() as ArtMeta;
    await Assets.load(Object.values(art.views).flat().map(p => base + p.img + BUST));
    arts.set(w, art);
  }));
}

export class PersonView {
  readonly root = new Container();
  private views = {} as Record<View, { c: Container; parts: { meta: PartMeta; sprite: Sprite }[] }>;
  private outline: OutlineFilter; private shadow: DropShadowFilter;
  private art: ArtMeta;
  readonly height: number;   // relative to Nico (Primo is smaller)

  constructor(readonly who: Who = 'nico', base = './') {
    const art = arts.get(who);
    if (!art) throw new Error(`loadArt(['${who}']) first`);
    this.art = art; this.height = art.height ?? 1;
    for (const v of VIEWS) {
      const c = new Container();
      const parts = art.views[v].flatMap(meta => {
        const sprite = new Sprite(Texture.from(base + meta.img + BUST));
        c.addChild(sprite);
        const out = [{ meta, sprite }];
        // a second copy of each leg, for the shin when the knees bend (sitting; pose.ts 'bk'/'fk', 'knl'/'knr', 'knf'/'knn')
        const shinPart = SHINS[meta.part];
        if (shinPart) {
          const shin = new Sprite(Texture.from(base + meta.img + BUST)); shin.visible = false; c.addChild(shin);
          out.push({ meta: { ...meta, part: shinPart }, sprite: shin });
        }
        return out;
      });
      this.views[v] = { c, parts };
      this.root.addChild(c);
    }
    this.outline = new OutlineFilter({ thickness: 4, color: 0xffffff, quality: 0.2 });
    this.shadow = new DropShadowFilter({ offset: { x: 4, y: 7 }, color: NAVY, alpha: SHADOW.alpha, blur: SHADOW.blur, quality: 3 });
    // render the filters at the screen's resolution (Pixi's default is 1x: soft on Retina)
    this.outline.resolution = this.shadow.resolution = 'inherit';
    this.root.filters = [this.outline, this.shadow];
  }

  /** Outline and shadow are in screen pixels, so they follow the camera zoom. */
  setZoom(zoom: number, resolution: number) {
    const px = RIG_SCALE * zoom;   // (the band is the same width on everyone, whatever their height)
    this.outline.thickness = OUTLINE * px * resolution;
    this.shadow.offset = { x: SHADOW.x * px, y: SHADOW.y * px };
  }

  /** A karate belt round the waist (Nico earns them at the dojo): drawn over the torso part, so the
   * exported art never changes. null takes it off. (In rig units: the shirt meets the trousers at y = -4.) */
  private belts: Partial<Record<View, Graphics>> = {};
  setBelt(color: string | null, edge = '#00000033') {
    for (const v of VIEWS) {
      this.belts[v]?.destroy(); delete this.belts[v];
      if (!color) continue;
      const g = new Graphics(), c = this.views[v].c, up = this.views[v].parts.findIndex(p => p.meta.part === 'up');
      const [x0, x1] = v === 'side' ? [-20, 18] : v === 'qfront' || v === 'qback' ? [-20, 21] : [-22, 22];
      g.roundRect(x0 - 1, -13, x1 - x0 + 2, 9, 2).fill(color).rect(x0, -13, x1 - x0, 1.5).fill(edge).rect(x0, -5.5, x1 - x0, 1.5).fill(edge);
      if (v === 'front' || v === 'qfront' || v === 'side') {
        const k = v === 'side' ? 14 : v === 'qfront' ? 3 : 0;   // the knot, at the front
        g.poly([k - 2, -7, k - 7, 9, k - 2.5, 10, k + 0.5, -6]).fill(color).poly([k + 2, -7, k + 7, 9, k + 2.5, 10, k - 0.5, -6]).fill(color);   // the two tails
        g.roundRect(k - 4.5, -14, 9, 11, 2.5).fill(color).roundRect(k - 4.5, -14, 9, 11, 2.5).stroke({ width: 1, color: edge });
      }
      c.addChildAt(g, c.getChildIndex(this.views[v].parts[up].sprite) + 1); this.belts[v] = g;   // (just over the torso, under the front arm)
    }
  }

  private specs: Partial<Record<View, Graphics>> = {};
  /** Glasses over the face (2026-10-12: the frames Nico picked at Dr. Nonna's eye exams), drawn in the head's own
   * place in each view, so they move with it. null takes them off. */
  setGlasses(f: Frame | null) {
    for (const v of VIEWS) {
      this.specs[v]?.destroy(); delete this.specs[v];
      if (!f || v === 'back') continue;
      const g = new Graphics(), c = this.views[v].c, w = 2.4, lens = { color: '#DCEAF5', alpha: 0.25 };
      const one = (x: number, y: number, rx: number, ry: number) => {
        if (f.shape === 'round') g.ellipse(x, y, rx, ry).fill(lens).stroke({ width: w, color: f.color });
        else if (f.shape === 'cat') g.poly([x - rx, y - ry * 0.4, x - rx * 0.2, y - ry, x + rx, y - ry * 1.15, x + rx * 0.8, y + ry * 0.7, x - rx * 0.6, y + ry * 0.8]).fill(lens).stroke({ width: w, color: f.color, join: 'round' });
        else g.roundRect(x - rx, y - ry, rx * 2, ry * 2, f.shape === 'soft' ? ry * 0.9 : 2.5).fill(lens).stroke({ width: w, color: f.color });
      };
      if (v === 'front') { one(-9.5, -85, 7.5, 6.2); one(9.5, -85, 7.5, 6.2); g.moveTo(-2, -86).lineTo(2, -86).moveTo(-17, -86).lineTo(-27, -84).moveTo(17, -86).lineTo(27, -84).stroke({ width: w, color: f.color }); }
      else if (v === 'qfront') { one(0, -84, 7, 6.2); one(17, -84, 4.2, 6); g.moveTo(7, -85).lineTo(13, -85).moveTo(-7, -85).lineTo(-17, -82).stroke({ width: w, color: f.color }); }
      else if (v === 'side') { one(20, -85, 3.2, 6); g.moveTo(17, -86).lineTo(-1, -83).stroke({ width: w, color: f.color }); }
      else { g.moveTo(-26, -84).lineTo(-18, -86).stroke({ width: w, color: f.color }); }   // qback: just the arm by the ear
      const up = this.views[v].parts.findIndex(p => p.meta.part === 'up');
      c.addChildAt(g, c.getChildIndex(this.views[v].parts[up].sprite) + 1); this.specs[v] = g;
    }
  }

  /** Cheaper drawing for slow devices: keep the white sticker outline, drop the soft shadow. */
  setLow(low: boolean) { this.root.filters = low ? [this.outline] : [this.outline, this.shadow]; }

  /** Every part has real pixels (a bad image URL gives Pixi's 1x1 empty texture). */
  artLoaded(): boolean {
    return Object.values(this.views).every(v => v.parts.every(p => p.sprite.texture.width > 2 && p.sprite.texture.source.resource != null));
  }

  pose(x: number, y: number, st: PoseState) {
    const res = this.art.res;
    for (const v of VIEWS) this.views[v].c.visible = v === st.view;
    const ops = partOps(st);
    for (const { meta, sprite } of this.views[st.view].parts) {
      sprite.visible = !!ops[meta.part];   // (the shins only exist while the knees are bent)
      if (!sprite.visible) continue;
      // part transform, then place the image so its local origin lands on the part origin
      const m = mul(opsMatrix(ops[meta.part]), [1 / res, 0, 0, 1 / res, meta.x, meta.y]);
      sprite.setFromMatrix(new Matrix(m[0], m[1], m[2], m[3], m[4], m[5]));
    }
    const belt = this.belts[st.view];
    if (belt && ops.up) { const m = opsMatrix(ops.up); belt.setFromMatrix(new Matrix(m[0], m[1], m[2], m[3], m[4], m[5])); }
    const specs = this.specs[st.view];
    if (specs && ops.up) { const m = opsMatrix(ops.up); specs.setFromMatrix(new Matrix(m[0], m[1], m[2], m[3], m[4], m[5])); }
    const sx = st.view === 'front' || st.view === 'back' ? 1 : st.face;   // side and 3/4 views flip to face left
    this.root.position.set(x, y);
    this.root.scale.set(RIG_SCALE * this.height * sx, RIG_SCALE * this.height);
    this.root.zIndex = y;
  }
}
