// Pocket Planet — world simulation. Pure logic, no DOM.
// A planet is a ring of sectors. Flung objects change a sector (and splash its
// neighbours); each sector's numbers decide its biome; biome neighbourhoods
// spawn creatures. "Life" (score) = biome values + creature points.

export const SECTORS = 24;

export type Kind = 'rock' | 'ice' | 'magma' | 'seed' | 'storm' | 'sun';

export interface Sector {
  land: number; // 0..5
  water: number; // 0..5
  heat: number; // -3..3
  life: number; // 0..3
  biome: BiomeId;
  species: string | null;
}

export type BiomeId =
  | 'barren'
  | 'ocean'
  | 'reef'
  | 'icesheet'
  | 'springs'
  | 'meadow'
  | 'forest'
  | 'jungle'
  | 'mountain'
  | 'highland'
  | 'desert'
  | 'savanna'
  | 'tundra'
  | 'taiga'
  | 'swamp'
  | 'marsh'
  | 'volcano';

export interface BiomeDef {
  id: BiomeId;
  name: string;
  value: number;
  color: string;
  deco: string; // emoji drawn on the surface ('' = none)
  sea?: boolean;
  recipe?: string;
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  barren: { id: 'barren', name: 'Bare Rock', value: 0, color: '#a08aa6', deco: '', recipe: 'Where nothing has landed yet' },
  ocean: { id: 'ocean', name: 'Ocean', value: 2, color: '#2f7fe0', deco: '🌊', sea: true, recipe: '☄️ Ice on low ground' },
  reef: { id: 'reef', name: 'Reef', value: 5, color: '#1fc6c0', deco: '🪸', sea: true, recipe: '🌱 Seeds in the ocean' },
  icesheet: {
    id: 'icesheet',
    name: 'Ice Sheet',
    value: 2,
    color: '#bfe8ff',
    deco: '🧊',
    sea: true,
    recipe: '☄️☄️ Two ices on the same ocean',
  },
  springs: {
    id: 'springs',
    name: 'Hot Springs',
    value: 3,
    color: '#5ed1b8',
    deco: '♨️',
    sea: true,
    recipe: '🔥 Magma beside an ocean warms the water',
  },
  meadow: { id: 'meadow', name: 'Meadow', value: 3, color: '#8fd65a', deco: '🌼', recipe: '🌱 The edges of where a seed lands' },
  forest: { id: 'forest', name: 'Forest', value: 5, color: '#2f9e4f', deco: '🌲', recipe: '🌱 Right where a seed lands' },
  jungle: { id: 'jungle', name: 'Jungle', value: 6, color: '#1f8a3b', deco: '🌴', recipe: '🌱🌱 A forest that gets warm (🔥 or ☀️)' },
  mountain: { id: 'mountain', name: 'Mountain', value: 2, color: '#8a7f8d', deco: '⛰️', recipe: '🪨 A rock on bare ground' },
  highland: { id: 'highland', name: 'Highland', value: 4, color: '#7fa36a', deco: '🌳', recipe: '🌱 Seeds on a mountain' },
  desert: { id: 'desert', name: 'Desert', value: 2, color: '#e6c170', deco: '🏜️', recipe: '🔥 Magma on flat ground' },
  savanna: { id: 'savanna', name: 'Savanna', value: 4, color: '#d9b84a', deco: '🌾', recipe: '🌱 Seeds in a desert' },
  tundra: {
    id: 'tundra',
    name: 'Tundra',
    value: 2,
    color: '#dfe9f2',
    deco: '❄️',
    recipe: '☄️☄️ Two ices on a tall mountain (or a frozen planet)',
  },
  taiga: { id: 'taiga', name: 'Taiga', value: 4, color: '#5f9a7f', deco: '🌲', recipe: '🌱 Seeds on tundra' },
  swamp: { id: 'swamp', name: 'Swamp', value: 3, color: '#6f8a4a', deco: '🟫', recipe: '☄️ Ice on a hill or mountain' },
  marsh: { id: 'marsh', name: 'Marsh', value: 5, color: '#4f8f5a', deco: '🍃', recipe: '🌱 Seeds in a swamp' },
  volcano: { id: 'volcano', name: 'Volcano', value: 3, color: '#d9533b', deco: '🌋', recipe: '🔥 Magma on a hill or mountain' },
};

export function biomeOf(s: Pick<Sector, 'land' | 'water' | 'heat' | 'life'>): BiomeId {
  if (s.water > s.land) {
    if (s.heat <= -2) return 'icesheet';
    if (s.heat >= 2) return 'springs';
    if (s.life >= 1) return 'reef';
    return 'ocean';
  }
  if (s.heat >= 2 && s.land >= 3) return 'volcano';
  if (s.heat >= 2) return s.life >= 1 ? 'savanna' : 'desert';
  if (s.heat <= -2) return s.life >= 1 ? 'taiga' : 'tundra';
  if (s.water >= 2) return s.life >= 1 ? 'marsh' : 'swamp';
  if (s.land >= 3) return s.life >= 1 ? 'highland' : 'mountain';
  if (s.life >= 2) return s.heat >= 1 ? 'jungle' : 'forest';
  if (s.life === 1) return 'meadow';
  return 'barren';
}

// ------------------------------------------------------------------ objects
export interface KindDef {
  id: Kind;
  name: string;
  emoji: string;
  color: string;
  desc: string;
  unlock: number; // level it first appears
}

export const KINDS: Record<Kind, KindDef> = {
  rock: { id: 'rock', name: 'Rock', emoji: '🪨', color: '#b8a9c9', desc: 'Raises land', unlock: 1 },
  ice: { id: 'ice', name: 'Ice Comet', emoji: '☄️', color: '#7fdcff', desc: 'Adds water, cools', unlock: 1 },
  seed: { id: 'seed', name: 'Seed Pod', emoji: '🌱', color: '#7dff8a', desc: 'Grows life where there is land or water', unlock: 2 },
  magma: { id: 'magma', name: 'Magma', emoji: '🔥', color: '#ff7a3d', desc: 'Heats up, builds volcanoes, dries water', unlock: 4 },
  storm: { id: 'storm', name: 'Rain Cloud', emoji: '🌧️', color: '#9fb4ff', desc: 'Light rain over a wide area', unlock: 7 },
  sun: { id: 'sun', name: 'Sunburst', emoji: '☀️', color: '#ffd84a', desc: 'Warms a wide area and sparks life', unlock: 11 },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const wrap = (i: number) => ((i % SECTORS) + SECTORS) % SECTORS;

export interface Planet {
  sectors: Sector[];
  speciesFound: string[]; // ids present on this planet
}

export function newPlanet(init?: (i: number) => Partial<Sector>): Planet {
  const sectors: Sector[] = [];
  for (let i = 0; i < SECTORS; i++) {
    const s: Sector = { land: 1, water: 0, heat: 0, life: 0, biome: 'barren', species: null, ...(init?.(i) ?? {}) };
    s.biome = biomeOf(s);
    sectors.push(s);
  }
  return { sectors, speciesFound: [] };
}

function touch(p: Planet, i: number, f: (s: Sector) => void) {
  const s = p.sectors[wrap(i)];
  f(s);
  s.land = clamp(s.land, 0, 5);
  s.water = clamp(s.water, 0, 5);
  s.heat = clamp(s.heat, -3, 3);
  s.life = clamp(s.life, 0, 3);
}

const habitable = (s: Sector) => s.land >= 1 || s.water >= 1;

/** Mutate sectors for an impact. `splash` = extra neighbour radius (upgrade). */
function applyKind(p: Planet, kind: Kind, at: number, splash: number) {
  const r = 1 + splash;
  switch (kind) {
    case 'rock':
      touch(p, at, (s) => (s.land += 2));
      for (let d = 1; d <= r; d++) for (const j of [at - d, at + d]) touch(p, j, (s) => (s.land += 1));
      break;
    case 'ice':
      touch(p, at, (s) => {
        s.water += 2;
        s.heat -= 1;
      });
      for (let d = 1; d <= r; d++) for (const j of [at - d, at + d]) touch(p, j, (s) => (s.water += 1));
      break;
    case 'magma':
      touch(p, at, (s) => {
        s.heat += 2;
        s.land += 1;
        s.water -= 1;
      });
      for (let d = 1; d <= r; d++) for (const j of [at - d, at + d]) touch(p, j, (s) => (s.heat += 1));
      break;
    case 'seed':
      for (let d = -r; d <= r; d++)
        touch(p, at + d, (s) => {
          if (habitable(s)) s.life += d === 0 ? 2 : 1;
        });
      break;
    case 'storm':
      for (let d = -(r + 2); d <= r + 2; d++)
        touch(p, at + d, (s) => {
          s.water += 1;
          if (s.heat > 0) s.heat -= 1;
          else if (s.heat < 0) s.heat += 1;
        });
      break;
    case 'sun':
      for (let d = -(r + 2); d <= r + 2; d++)
        touch(p, at + d, (s) => {
          s.heat += 1;
          if (habitable(s)) s.life += 1;
        });
      break;
  }
}

// ------------------------------------------------------------------ creatures
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface SpeciesDef {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  hint: string;
  /** Biomes in the recipe (home first) — lets the UI build a localized hint. */
  home?: BiomeId[];
  /** Does sector i (with its neighbours) host this creature? */
  test: (p: Planet, i: number) => boolean;
}

const b = (p: Planet, i: number) => p.sectors[wrap(i)].biome;
const nextTo = (p: Planet, i: number, x: BiomeId) => b(p, i - 1) === x || b(p, i + 1) === x;
const between = (p: Planet, i: number, x: BiomeId, y: BiomeId) =>
  (b(p, i - 1) === x && b(p, i + 1) === y) || (b(p, i - 1) === y && b(p, i + 1) === x);
const single = (id: string, name: string, emoji: string, biome: BiomeId): SpeciesDef => ({
  id,
  name,
  emoji,
  rarity: 'common',
  hint: `Lives in ${BIOMES[biome].name}`,
  home: [biome],
  test: (p, i) => b(p, i) === biome,
});
const pair = (id: string, name: string, emoji: string, here: BiomeId, near: BiomeId): SpeciesDef => ({
  id,
  name,
  emoji,
  rarity: 'uncommon',
  hint: `${BIOMES[here].name} next to ${BIOMES[near].name}`,
  home: [here, near],
  test: (p, i) => b(p, i) === here && nextTo(p, i, near),
});
const trio = (id: string, name: string, emoji: string, here: BiomeId, x: BiomeId, y: BiomeId): SpeciesDef => ({
  id,
  name,
  emoji,
  rarity: 'rare',
  hint: `${BIOMES[here].name} between ${BIOMES[x].name} and ${BIOMES[y].name}`,
  home: [here, x, y],
  test: (p, i) => b(p, i) === here && between(p, i, x, y),
});

// Order matters: rarer creatures are checked first so they win a sector.
export const SPECIES: SpeciesDef[] = [
  // legendary: planet-wide conditions
  {
    id: 'worldtree',
    name: 'World Tree Spirit',
    emoji: '🧚',
    rarity: 'legendary',
    hint: 'Every region of a planet full of life',
    test: (p, i) => p.sectors.every((s) => s.life >= 1) && b(p, i) === 'forest',
  },
  {
    id: 'leviathan',
    name: 'Leviathan',
    emoji: '🐋',
    rarity: 'legendary',
    hint: 'Six Ocean or Reef regions in a row',
    test: (p, i) => {
      for (let d = -5; d <= 0; d++) {
        let ok = true;
        for (let k = 0; k < 6; k++) {
          const x = b(p, i + d + k);
          if (x !== 'ocean' && x !== 'reef') ok = false;
        }
        if (ok) return true;
      }
      return false;
    },
  },
  // rare: between two biomes
  trio('dragon', 'Sky Dragon', '🐉', 'volcano', 'mountain', 'highland'),
  trio('unicorn', 'Prism Unicorn', '🦄', 'meadow', 'forest', 'jungle'),
  trio('sunbird', 'Sunbird', '🦚', 'savanna', 'jungle', 'desert'),
  trio('kraken', 'Kraken', '🦑', 'ocean', 'reef', 'icesheet'),
  trio('mammoth', 'Woolly Mammoth', '🦣', 'tundra', 'taiga', 'mountain'),
  trio('dino', 'Magma Rex', '🦖', 'jungle', 'volcano', 'swamp'),
  // uncommon: next to another biome
  pair('otter', 'Tide Otter', '🦦', 'forest', 'ocean'),
  pair('turtle', 'Obsidian Turtle', '🐢', 'volcano', 'ocean'),
  pair('octopus', 'Canopy Octopus', '🐙', 'reef', 'jungle'),
  pair('whale', 'Snow Whale', '🐳', 'icesheet', 'ocean'),
  pair('camel', 'Oasis Camel', '🐫', 'desert', 'springs'),
  pair('eagle', 'Frost Eagle', '🦅', 'mountain', 'tundra'),
  pair('bear', 'Ridge Bear', '🐻', 'highland', 'forest'),
  pair('butterfly', 'Dew Butterfly', '🦋', 'meadow', 'marsh'),
  pair('elephant', 'Grass Elephant', '🐘', 'savanna', 'meadow'),
  pair('wolf', 'Aurora Wolf', '🐺', 'taiga', 'tundra'),
  pair('flamingo', 'Steam Flamingo', '🦩', 'springs', 'marsh'),
  pair('croc', 'Mud Croc', '🐊', 'swamp', 'jungle'),
  // common: one biome
  single('bunny', 'Hopper Bunny', '🐇', 'meadow'),
  single('deer', 'Moss Deer', '🦌', 'forest'),
  single('parrot', 'Rainbow Parrot', '🦜', 'jungle'),
  single('fish', 'Glimfish', '🐟', 'ocean'),
  single('reeffish', 'Reef Darter', '🐠', 'reef'),
  single('seal', 'Floe Seal', '🦭', 'icesheet'),
  single('crab', 'Steam Crab', '🦀', 'springs'),
  single('goat', 'Crag Goat', '🐐', 'mountain'),
  single('llama', 'Cloud Llama', '🦙', 'highland'),
  single('scorpion', 'Dune Scorpion', '🦂', 'desert'),
  single('giraffe', 'Tall Neck', '🦒', 'savanna'),
  single('penguin', 'Tuxling', '🐧', 'tundra'),
  single('owl', 'Pine Owl', '🦉', 'taiga'),
  single('frog', 'Bog Frog', '🐸', 'swamp'),
  single('duck', 'Reed Duck', '🦆', 'marsh'),
  single('newt', 'Ember Newt', '🦎', 'volcano'),
];

export const SPECIES_BY_ID: Record<string, SpeciesDef> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const RARITY_POINTS: Record<Rarity, number> = { common: 8, uncommon: 20, rare: 45, legendary: 120 };

/** Recompute biomes and spawn/remove creatures. Returns creatures that newly appeared. */
export function settle(p: Planet): { spawned: { id: string; at: number }[]; lost: string[] } {
  for (const s of p.sectors) s.biome = biomeOf(s);
  const lost: string[] = [];
  // creatures whose home no longer qualifies wander off
  p.sectors.forEach((s, i) => {
    if (s.species && !SPECIES_BY_ID[s.species].test(p, i)) {
      lost.push(s.species);
      s.species = null;
    }
  });
  const present = new Set(p.sectors.map((s) => s.species).filter(Boolean) as string[]);
  const spawned: { id: string; at: number }[] = [];
  for (const sp of SPECIES) {
    if (present.has(sp.id)) continue;
    for (let i = 0; i < SECTORS; i++) {
      const s = p.sectors[i];
      if (s.species) {
        // a rarer creature may displace a common one
        const cur = SPECIES_BY_ID[s.species];
        if (RARITY_POINTS[cur.rarity] >= RARITY_POINTS[sp.rarity]) continue;
      }
      if (sp.test(p, i)) {
        if (s.species) present.delete(s.species);
        s.species = sp.id;
        present.add(sp.id);
        spawned.push({ id: sp.id, at: i });
        break;
      }
    }
  }
  p.speciesFound = [...present];
  return { spawned, lost };
}

export function lifeScore(p: Planet): number {
  let v = 0;
  const kinds = new Set<BiomeId>();
  for (const s of p.sectors) {
    v += BIOMES[s.biome].value;
    kinds.add(s.biome);
    if (s.species) v += RARITY_POINTS[SPECIES_BY_ID[s.species].rarity];
  }
  kinds.delete('barren');
  return v + kinds.size * 3; // variety bonus
}

export interface ImpactResult {
  before: number;
  after: number;
  changed: number[]; // sector indices whose biome changed
  spawned: { id: string; at: number }[];
  lost: string[];
}

export function impact(p: Planet, kind: Kind, at: number, splash = 0): ImpactResult {
  const before = lifeScore(p);
  const prev = p.sectors.map((s) => s.biome);
  applyKind(p, kind, wrap(at), splash);
  const { spawned, lost } = settle(p);
  const changed = p.sectors.map((s, i) => (s.biome !== prev[i] ? i : -1)).filter((i) => i >= 0);
  return { before, after: lifeScore(p), changed, spawned, lost };
}

export function clonePlanet(p: Planet): Planet {
  return { sectors: p.sectors.map((s) => ({ ...s })), speciesFound: [...p.speciesFound] };
}
