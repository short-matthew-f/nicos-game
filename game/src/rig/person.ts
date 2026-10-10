// A person on screen (Nico, or anyone drawn on his rig: art/<who>/): one Sprite per exported rig part, posed every frame from pose.ts, with
// the sticker outline + shadow applied live to the whole body (so part seams don't show).
import { Assets, Container, Matrix, Sprite, Texture } from 'pixi.js';
import { DropShadowFilter, OutlineFilter } from 'pixi-filters';
import { partOps, opsMatrix, mul, VIEWS, type PoseState, type View } from './pose';
import { NAVY } from '../world/draw';
import { BUILD_ID } from '../update';

interface PartMeta { part: string; img: string; x: number; y: number; w: number; h: number }
interface ArtMeta { res: number; height?: number; views: Record<View, PartMeta[]> }
export type Who = string;   // a folder in art/: 'nico', 'james', 'primo', townspeople...

export const RIG_SCALE = 0.75;   // world px per rig unit (Nico ~ 132 px tall)
export const OUTLINE = 6;        // rig units, matches the SVG sticker band
export const SHADOW = { x: 5, y: 9, blur: 3, alpha: 0.22 };

const arts = new Map<Who, ArtMeta>();
// ?v= so a new deploy never mixes with cached art (Pages lets browsers cache files for 10 minutes)
const BUST = `?v=${encodeURIComponent(BUILD_ID)}`;
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
      const parts = art.views[v].map(meta => {
        const sprite = new Sprite(Texture.from(base + meta.img + BUST));
        c.addChild(sprite);
        return { meta, sprite };
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

  /** Every part has real pixels (a bad image URL gives Pixi's 1x1 empty texture). */
  artLoaded(): boolean {
    return Object.values(this.views).every(v => v.parts.every(p => p.sprite.texture.width > 2 && p.sprite.texture.source.resource != null));
  }

  pose(x: number, y: number, st: PoseState) {
    const res = this.art.res;
    for (const v of VIEWS) this.views[v].c.visible = v === st.view;
    const ops = partOps(st);
    for (const { meta, sprite } of this.views[st.view].parts) {
      // part transform, then place the image so its local origin lands on the part origin
      const m = mul(opsMatrix(ops[meta.part]), [1 / res, 0, 0, 1 / res, meta.x, meta.y]);
      sprite.setFromMatrix(new Matrix(m[0], m[1], m[2], m[3], m[4], m[5]));
    }
    const sx = st.view === 'front' || st.view === 'back' ? 1 : st.face;   // side and 3/4 views flip to face left
    this.root.position.set(x, y);
    this.root.scale.set(RIG_SCALE * this.height * sx, RIG_SCALE * this.height);
    this.root.zIndex = y;
  }
}
