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

/** A child's zoo as stored on the server (learning_zoos.state). Bump `schema` when the shape changes. */
export interface ZooDoc {
  schema: 1;
  avatar: Avatar;
  coins: number;
  /** all coins ever earned, for the profile card and the parents' overview */
  earned: number;
  objects: PlacedObject[];
  animals: Animal[];
  /** YYYY-MM-DD of the last exercise reward, for the daily bonus */
  lastExerciseDay?: string;
  createdAt: number;
}

/** A zoo plus whose it is: the myhome user id (as a string) and display name. */
export interface Profile extends ZooDoc {
  id: string;
  name: string;
}

export type ExerciseEvent =
  | { exercise: 'scitani'; kind: 'problem'; mistakes: number; carry: boolean }
  | { exercise: 'vyjmenovana'; kind: 'round'; correct: number; total: number; retry: boolean };
