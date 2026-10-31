import type { Species } from '../../state/types';
import elephantUrl from './img/elephant.png';
import giraffeUrl from './img/giraffe.png';
import penguinUrl from './img/penguin.png';
import rabbitUrl from './img/rabbit.png';

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
  /** walking speed in world pixels per second and steps per second */
  speed: number;
  stride: number;
  /** a trick is this many jumps this high; a single jump ends with a wiggle */
  jump: number;
  jumps: number;
}

export const ANIMAL_ART: Record<Species, AnimalArt> = {
  giraffe: { src: giraffeUrl, height: 175, bob: 5, tilt: 2.5, speed: 42, stride: 9, jump: 22, jumps: 1 },
  penguin: { src: penguinUrl, height: 88, bob: 7, tilt: 6, speed: 34, stride: 13, jump: 34, jumps: 3 },
  rabbit: { src: rabbitUrl, height: 80, bob: 14, tilt: 4, speed: 40, stride: 8, jump: 42, jumps: 2 },
  elephant: { src: elephantUrl, height: 125, bob: 4, tilt: 2, speed: 30, stride: 7, jump: 16, jumps: 1 },
};
