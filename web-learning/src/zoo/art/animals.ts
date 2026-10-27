import type { Species } from '../../state/types';
import giraffeUrl from './img/giraffe.png';
import penguinUrl from './img/penguin.png';

/**
 * Animals are paper-cutout illustrations generated with Qwen Image 2.1 (see tools/) and cut out
 * of their background. Each picture is cropped tight, feet on the bottom edge, facing right.
 */
export interface AnimalArt {
  src: string;
  /** how tall the animal stands in the zoo, in world pixels */
  height: number;
  /** how far it bobs and leans while walking */
  bob: number;
  tilt: number;
}

export const ANIMAL_ART: Record<Species, AnimalArt> = {
  giraffe: { src: giraffeUrl, height: 175, bob: 5, tilt: 2.5 },
  penguin: { src: penguinUrl, height: 88, bob: 7, tilt: 6 },
};
