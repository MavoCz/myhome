import type { Biome, ItemId, Species } from '../state/types';

export type Category = 'stavby' | 'zvirata' | 'dekorace';

export interface CatalogItem {
  id: ItemId;
  name: string;
  category: Category;
  price: number;
  /** footprint in tiles */
  w: number;
  h: number;
  /** the avatar cannot walk through it */
  blocks: boolean;
  biome?: Biome;
  capacity?: number;
  species?: Species;
  needs?: Biome;
  hint: string;
}

export const CATALOG: CatalogItem[] = [
  { id: 'path', name: 'Cestička', category: 'stavby', price: 2, w: 1, h: 1, blocks: false, hint: 'Táhni prstem a kresli cestu. Mapu posuneš dvěma prsty, pravým tlačítkem myši nebo šipkami.' },
  { id: 'pen-savana', name: 'Výběh savana', category: 'stavby', price: 20, w: 6, h: 5, blocks: true, biome: 'savana', capacity: 2, hint: 'Pro žirafy. Vejdou se sem dvě.' },
  { id: 'pen-ice', name: 'Ledová kra', category: 'stavby', price: 20, w: 6, h: 5, blocks: true, biome: 'ice', capacity: 3, hint: 'Pro tučňáky. Vejdou se sem tři.' },
  { id: 'pen-farm', name: 'Statek', category: 'stavby', price: 15, w: 6, h: 5, blocks: true, biome: 'farm', capacity: 4, hint: 'Pro domácí zvířátka. Vejdou se sem čtyři.' },
  { id: 'animal-giraffe', name: 'Žirafa', category: 'zvirata', price: 30, w: 1, h: 1, blocks: false, species: 'giraffe', needs: 'savana', hint: 'Bydlí ve výběhu savana.' },
  { id: 'animal-penguin', name: 'Tučňák', category: 'zvirata', price: 25, w: 1, h: 1, blocks: false, species: 'penguin', needs: 'ice', hint: 'Bydlí na ledové kře.' },
  { id: 'animal-rabbit', name: 'Králík', category: 'zvirata', price: 15, w: 1, h: 1, blocks: false, species: 'rabbit', needs: 'farm', hint: 'Bydlí na statku. Má rád mrkev.' },
  { id: 'flowerbed', name: 'Záhonek', category: 'dekorace', price: 5, w: 1, h: 1, blocks: true, hint: 'Zalévej ho a vyroste kytička.' },
  { id: 'bush', name: 'Keřík', category: 'dekorace', price: 4, w: 1, h: 1, blocks: true, hint: 'Keřík s červenými bobulemi.' },
  { id: 'tree', name: 'Strom', category: 'dekorace', price: 8, w: 2, h: 2, blocks: true, hint: 'Velký košatý strom.' },
  { id: 'bench', name: 'Lavička', category: 'dekorace', price: 6, w: 2, h: 1, blocks: true, hint: 'Pro unavené návštěvníky.' },
  { id: 'fountain', name: 'Fontána', category: 'dekorace', price: 25, w: 2, h: 2, blocks: true, hint: 'Šplouchá a třpytí se.' },
];

export const CATEGORIES: { id: Category; name: string }[] = [
  { id: 'zvirata', name: 'Zvířata' },
  { id: 'stavby', name: 'Výběhy a cesty' },
  { id: 'dekorace', name: 'Dekorace' },
];

export function item(id: ItemId): CatalogItem {
  const found = CATALOG.find(c => c.id === id);
  if (!found) throw new Error(`Unknown catalog item ${id}`);
  return found;
}

export const SPECIES_NAME: Record<Species, string> = { giraffe: 'Žirafa', penguin: 'Tučňák', rabbit: 'Králík' };
export const BIOME_NAME: Record<Biome, string> = { savana: 'výběh savana', ice: 'ledovou kru', farm: 'statek' };
