// Nico on screen: one Sprite per exported rig part, posed every frame from pose.ts, with
// the sticker outline + shadow applied live to the whole body (so part seams don't show).
import { Assets, Container, Matrix, Sprite, Texture } from 'pixi.js';
import { DropShadowFilter, OutlineFilter } from 'pixi-filters';
import { partOps, opsMatrix, mul, type PoseState, type View } from './pose';
import { NAVY } from '../world/draw';

interface PartMeta { part: string; img: string; x: number; y: number; w: number; h: number }
interface ArtMeta { res: number; views: Record<View, PartMeta[]> }

export const RIG_SCALE = 0.75;   // world px per rig unit (Nico ~ 132 px tall)
export const OUTLINE = 6;        // rig units, matches the SVG sticker band
export const SHADOW = { x: 5, y: 9, blur: 3, alpha: 0.22 };

let art: ArtMeta | null = null;
export async function loadNicoArt(base = './'): Promise<void> {
  art = await (await fetch(`${base}art/nico/nico.json`)).json() as ArtMeta;
  const urls = Object.values(art.views).flat().map(p => base + p.img);
  await Assets.load(urls);
}

export class NicoView {
  readonly root = new Container();
  private views = {} as Record<View, { c: Container; parts: { meta: PartMeta; sprite: Sprite }[] }>;
  private outline: OutlineFilter; private shadow: DropShadowFilter;

  constructor(base = './') {
    if (!art) throw new Error('loadNicoArt() first');
    for (const v of ['side', 'front', 'back'] as View[]) {
      const c = new Container();
      const parts = art.views[v].map(meta => {
        const sprite = new Sprite(Texture.from(base + meta.img));
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
    const px = RIG_SCALE * zoom;
    this.outline.thickness = OUTLINE * px * resolution;
    this.shadow.offset = { x: SHADOW.x * px, y: SHADOW.y * px };
  }

  pose(x: number, y: number, st: PoseState) {
    const res = art!.res;
    for (const v of ['side', 'front', 'back'] as View[]) this.views[v].c.visible = v === st.view;
    const ops = partOps(st);
    for (const { meta, sprite } of this.views[st.view].parts) {
      // part transform, then place the image so its local origin lands on the part origin
      const m = mul(opsMatrix(ops[meta.part]), [1 / res, 0, 0, 1 / res, meta.x, meta.y]);
      sprite.setFromMatrix(new Matrix(m[0], m[1], m[2], m[3], m[4], m[5]));
    }
    const sx = st.view === 'side' ? st.face : 1;
    this.root.position.set(x, y);
    this.root.scale.set(RIG_SCALE * sx, RIG_SCALE);
    this.root.zIndex = y;
  }
}
