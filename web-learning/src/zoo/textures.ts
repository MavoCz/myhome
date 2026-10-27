import type { Avatar } from '../state/types';
import { ANIMAL_ART } from './art/animals';
import { avatarRig } from './art/avatar';
import { BUBBLE_FRAME, BUBBLE_ICON, BUBBLE_VB } from './art/objects';
import { FX_ART, PLANT_ART, PROP_ART, SPECIES_FOOD } from './art/pictures';
import { dataUrl, svgDoc, type Rig, type Vec } from './art/svg';

/** Texture pixels per viewBox unit; high enough to stay sharp when zoomed in on a retina tablet. */
export const RES = 1.8;

export type CanvasMap = Map<string, HTMLCanvasElement>;

async function svgImage(svg: string, vb: Vec) {
  const img = new Image();
  img.src = dataUrl(svgDoc(vb, svg));
  await img.decode();
  return img;
}

async function rasterize(svg: string, vb: Vec): Promise<HTMLCanvasElement> {
  const img = await svgImage(svg, vb);
  const c = document.createElement('canvas');
  c.width = Math.ceil(vb[0] * RES);
  c.height = Math.ceil(vb[1] * RES);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Frame name for a picture placed on a power-of-two canvas. */
export const PICTURE_FRAME = 'pic';

async function decode(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/**
 * Pictures go on a power-of-two canvas so WebGL 1 can build mipmaps for them; without mipmaps a
 * big textured picture shrunk to zoo size shimmers with noise. The real size is kept in data-*
 * attributes and becomes a frame of the texture.
 */
function potCanvas(w: number, h: number) {
  const side = 2 ** Math.ceil(Math.log2(Math.max(w, h)));
  const c = document.createElement('canvas');
  c.width = c.height = side;
  c.dataset.frameW = String(w);
  c.dataset.frameH = String(h);
  return c;
}

async function loadPicture(src: string): Promise<HTMLCanvasElement> {
  const img = await decode(src);
  const c = potCanvas(img.naturalWidth, img.naturalHeight);
  c.getContext('2d')!.drawImage(img, 0, 0);
  return c;
}

/** A need bubble: the drawn frame with a picture inside. */
async function bubble(iconSrc: string): Promise<HTMLCanvasElement> {
  const [frame, icon] = await Promise.all([svgImage(BUBBLE_FRAME, BUBBLE_VB), decode(iconSrc)]);
  const k = 256 / BUBBLE_VB[0];
  const c = potCanvas(256, 256);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(frame, 0, 0, 256, 256);
  const s = (BUBBLE_ICON.size * k) / Math.max(icon.naturalWidth, icon.naturalHeight);
  const w = icon.naturalWidth * s, h = icon.naturalHeight * s;
  ctx.drawImage(icon, BUBBLE_ICON.cx * k - w / 2, BUBBLE_ICON.cy * k - h / 2, w, h);
  return c;
}

const STAGES = ['seeds', 'sprout', 'bud'] as const;

/** Texture and height of what is on a flowerbed at a growth stage. */
export function plantOf(stage: number, bloom: number) {
  if (stage >= STAGES.length) return { key: `plant:bloom-${bloom}`, height: PLANT_ART.blooms[bloom].height };
  const name = STAGES[Math.max(0, stage)];
  return { key: `plant:${name}`, height: PLANT_ART[name].height };
}

const rigJobs = (prefix: string, rig: Rig) =>
  Object.entries(rig.parts).map(([part, p]) => [`${prefix}:${part}`, p.svg, rig.vb] as const);

let shared: Promise<CanvasMap> | null = null;

/** Everything except the avatar is the same for every zoo, so it is loaded once per session. */
function sharedTextures(): Promise<CanvasMap> {
  shared ??= (async () => {
    const job = (key: string, src: string): [string, string] => [key, src];
    const pictures = [
      ...Object.entries(ANIMAL_ART).map(([species, a]) => job(`animal:${species}`, a.src)),
      ...Object.entries(PROP_ART).map(([name, a]) => job(`obj:${name}`, a.src)),
      ...Object.entries(FX_ART).map(([name, a]) => job(`fx:${name}`, a.src)),
      ...STAGES.map(name => job(`plant:${name}`, PLANT_ART[name].src)),
      ...PLANT_ART.blooms.map((b, i) => job(`plant:bloom-${i}`, b.src)),
    ];
    const bubbles = [
      ...Object.entries(SPECIES_FOOD).map(([species, food]) => job(`fx:bubble-${species}`, FX_ART[food].src)),
      job('fx:bubble-water', FX_ART.drop.src),
    ];
    const out: CanvasMap = new Map();
    await Promise.all([
      ...pictures.map(async ([key, src]) => out.set(key, await loadPicture(src))),
      ...bubbles.map(async ([key, src]) => out.set(key, await bubble(src))),
    ]);
    return out;
  })();
  return shared;
}

export async function zooTextures(avatar: Avatar): Promise<CanvasMap> {
  const base = await sharedTextures();
  const out: CanvasMap = new Map(base);
  await Promise.all(rigJobs('avatar', avatarRig(avatar)).map(async ([key, svg, vb]) => out.set(key, await rasterize(svg, vb))));
  return out;
}
