import type { Species } from '../../state/types';
import benchUrl from './img/bench.png';
import bedUrl from './img/bed.png';
import bloomOrangeUrl from './img/bloom-orange.png';
import bloomPinkUrl from './img/bloom-pink.png';
import bloomPurpleUrl from './img/bloom-purple.png';
import bloomRedUrl from './img/bloom-red.png';
import bloomYellowUrl from './img/bloom-yellow.png';
import budUrl from './img/bud.png';
import bushUrl from './img/bush.png';
import canUrl from './img/can.png';
import carrotUrl from './img/carrot.png';
import coinUrl from './img/coin.png';
import dropUrl from './img/drop.png';
import fishUrl from './img/fish.png';
import fountainUrl from './img/fountain.png';
import gateUrl from './img/gate.png';
import heartUrl from './img/heart.png';
import leavesUrl from './img/leaves.png';
import saladUrl from './img/salad.png';
import seedsUrl from './img/seeds.png';
import sproutUrl from './img/sprout.png';
import treeUrl from './img/tree.png';

// Props, plants and small icons are paper-cutout pictures like the animals (docs/art-pipeline.md).

export interface PropArt {
  src: string;
  /** width in world pixels */
  width: number;
  /** how far above the bottom edge of its footprint the picture's bottom edge stands */
  lift: number;
  /** width of the shadow ellipse under it, none if missing */
  shadow?: number;
}

export type PropName = 'tree' | 'bush' | 'bench' | 'fountain' | 'gate' | 'bed';

export const PROP_ART: Record<PropName, PropArt> = {
  tree: { src: treeUrl, width: 150, lift: 6, shadow: 96 },
  bush: { src: bushUrl, width: 62, lift: 5, shadow: 54 },
  bench: { src: benchUrl, width: 124, lift: 6, shadow: 110 },
  fountain: { src: fountainUrl, width: 132, lift: 8, shadow: 124 },
  gate: { src: gateUrl, width: 200, lift: 0 },
  bed: { src: bedUrl, width: 58, lift: 6 },
};

/** Where the fountain's spray starts, in world pixels above its anchor. */
export const FOUNTAIN_SPOUT = 100;

/** What lies or grows on a flowerbed: stages 0, 1 and 2, then one of the blooms. */
export const PLANT_ART = {
  seeds: { src: seedsUrl, height: 9 },
  sprout: { src: sproutUrl, height: 24 },
  bud: { src: budUrl, height: 42 },
  blooms: [bloomPinkUrl, bloomPurpleUrl, bloomRedUrl, bloomOrangeUrl, bloomYellowUrl].map(src => ({ src, height: 54 })),
};

export type FxName = 'heart' | 'drop' | 'leaves' | 'fish' | 'carrot' | 'salad' | 'can';

/** Small effect pictures with their size in world pixels along the longer side. */
export const FX_ART: Record<FxName, { src: string; size: number }> = {
  heart: { src: heartUrl, size: 24 },
  drop: { src: dropUrl, size: 12 },
  leaves: { src: leavesUrl, size: 34 },
  fish: { src: fishUrl, size: 35 },
  carrot: { src: carrotUrl, size: 34 },
  salad: { src: saladUrl, size: 34 },
  can: { src: canUrl, size: 42 },
};

export const SPECIES_FOOD: Record<Species, FxName> = { giraffe: 'leaves', penguin: 'fish', rabbit: 'carrot', elephant: 'salad' };

/** The currency: a gold token with a paw print. */
export const COIN_URL = coinUrl;
