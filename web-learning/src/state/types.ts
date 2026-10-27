export type Species = 'giraffe' | 'penguin';
export type Biome = 'savana' | 'ice';

export type ItemId =
  | 'path'
  | 'pen-savana'
  | 'pen-ice'
  | 'tree'
  | 'bush'
  | 'bench'
  | 'flowerbed'
  | 'fountain'
  | 'animal-giraffe'
  | 'animal-penguin';

export interface Avatar {
  hair: string;
  outfit: string;
  skin: string;
}

/** Something built on the zoo grid. x/y is the top-left tile of its footprint. */
export interface PlacedObject {
  id: string;
  kind: Exclude<ItemId, 'animal-giraffe' | 'animal-penguin'>;
  x: number;
  y: number;
  /** flowerbed growth, 0 = seeds … 3 = in bloom */
  stage?: number;
  lastWatered?: number;
}

export interface Animal {
  id: string;
  species: Species;
  penId: string;
  lastFed?: number;
  /** how many times it was fed, shown as hearts */
  joy: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar: Avatar;
  coins: number;
  /** all coins ever earned, for the profile card */
  earned: number;
  objects: PlacedObject[];
  animals: Animal[];
  /** YYYY-MM-DD of the last exercise reward, for the daily bonus */
  lastExerciseDay?: string;
  createdAt: number;
}

export type ExerciseEvent =
  | { exercise: 'scitani'; kind: 'problem'; mistakes: number; carry: boolean }
  | { exercise: 'vyjmenovana'; kind: 'round'; correct: number; total: number; retry: boolean };
