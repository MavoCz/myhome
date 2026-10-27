import type { ItemId } from '../state/types';
import { ANIMAL_ART } from './art/animals';
import { PATH_ICON, PEN_ICE_ICON, PEN_SAVANA_ICON } from './art/objects';
import { PLANT_ART, PROP_ART } from './art/pictures';
import { dataUrl, svgDoc } from './art/svg';

/** Picture for each shop item. */
export const THUMBS: Record<ItemId, string> = {
  path: dataUrl(svgDoc([88, 88], PATH_ICON)),
  'pen-savana': dataUrl(svgDoc([88, 82], PEN_SAVANA_ICON)),
  'pen-ice': dataUrl(svgDoc([88, 82], PEN_ICE_ICON)),
  'animal-giraffe': ANIMAL_ART.giraffe.src,
  'animal-penguin': ANIMAL_ART.penguin.src,
  flowerbed: PLANT_ART.blooms[0].src,
  bush: PROP_ART.bush.src,
  tree: PROP_ART.tree.src,
  bench: PROP_ART.bench.src,
  fountain: PROP_ART.fountain.src,
};
