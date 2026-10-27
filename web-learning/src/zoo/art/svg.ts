export type Vec = [number, number];

export interface RigPart {
  svg: string;
  /** rotation point in viewBox units */
  pivot: Vec;
}

/**
 * A character drawn as separate parts that share one viewBox, so every part can be
 * rotated around its own joint and still line up with the others.
 */
export interface Rig {
  vb: Vec;
  /** the point that stands on the ground */
  anchor: Vec;
  /** world pixels per viewBox unit */
  scale: number;
  parts: Record<string, RigPart>;
  /** draw order for a still picture */
  order: string[];
}

export const svgDoc = (vb: Vec, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb[0]} ${vb[1]}" width="${vb[0]}" height="${vb[1]}">${inner}</svg>`;

export const dataUrl = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

export const rigPreview = (rig: Rig) => svgDoc(rig.vb, rig.order.map(k => rig.parts[k].svg).join(''));
