// Comet Garden — world simulation. Pure logic, no DOM.
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
  ocean: { id: 'ocean', name: 'Ocean', value: 3, color: '#2f7fe0', deco: '🌊', sea: true, recipe: '☄️ Ice on low ground' },
  reef: { id: 'reef', name: 'Reef', value: 5, color: '#1fc6c0', deco: '🪸', sea: true, recipe: '🌱 Seeds in the ocean' },
  icesheet: {
    id: 'icesheet',
    name: 'Ice Sheet',
    value: 3,
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
  mountain: { id: 'mountain', name: 'Mountain', value: 5, color: '#8a7f8d', deco: '⛰️', recipe: '🪨 A rock on bare ground' },
  highland: { id: 'highland', name: 'Highland', value: 7, color: '#7fa36a', deco: '🌳', recipe: '🌱 Seeds on a mountain' },
  desert: { id: 'desert', name: 'Desert', value: 5, color: '#e6c170', deco: '🏜️', recipe: '🔥 Magma on flat ground' },
  savanna: { id: 'savanna', name: 'Savanna', value: 7, color: '#d9b84a', deco: '🌾', recipe: '🌱 Seeds in a desert' },
  tundra: {
    id: 'tundra',
    name: 'Tundra',
    value: 3,
    color: '#dfe9f2',
    deco: '❄️',
    recipe: '☄️☄️ Two ices on a tall mountain (or a frozen planet)',
  },
  taiga: { id: 'taiga', name: 'Taiga', value: 5, color: '#5f9a7f', deco: '🌲', recipe: '🌱 Seeds on tundra' },
  swamp: { id: 'swamp', name: 'Swamp', value: 3, color: '#6f8a4a', deco: '🟫', recipe: '☄️ Ice on a hill or mountain' },
  marsh: { id: 'marsh', name: 'Marsh', value: 5, color: '#4f8f5a', deco: '🍃', recipe: '🌱 Seeds in a swamp' },
  volcano: { id: 'volcano', name: 'Volcano', value: 6, color: '#d9533b', deco: '🌋', recipe: '🔥 Magma on a hill or mountain' },
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
  stats: { element: 'earth' | 'water' | 'life' | 'fire' | 'air' | 'light'; power: number; reach: number; job: string };
}

export const KINDS: Record<Kind, KindDef> = {
  rock: {
    id: 'rock',
    name: 'Rock',
    emoji: '🪨',
    color: '#b8a9c9',
    desc: 'Raises land',
    unlock: 1,
    stats: { element: 'earth', power: 3, reach: 1, job: 'Builds tall mountains' },
  },
  ice: {
    id: 'ice',
    name: 'Ice Comet',
    emoji: '☄️',
    color: '#7fdcff',
    desc: 'Adds water, cools',
    unlock: 1,
    stats: { element: 'water', power: 2, reach: 1, job: 'Makes cool water' },
  },
  seed: {
    id: 'seed',
    name: 'Seed Pod',
    emoji: '🌱',
    color: '#7dff8a',
    desc: 'Grows life where there is land or water',
    unlock: 2,
    stats: { element: 'life', power: 2, reach: 1, job: 'Grows strong roots' },
  },
  magma: {
    id: 'magma',
    name: 'Magma',
    emoji: '🔥',
    color: '#ff7a3d',
    desc: 'Heats up, builds volcanoes, dries water',
    unlock: 4,
    stats: { element: 'fire', power: 2, reach: 1, job: 'Builds warm volcanoes' },
  },
  storm: {
    id: 'storm',
    name: 'Rain Cloud',
    emoji: '🌧️',
    color: '#9fb4ff',
    desc: 'Light rain over a wide area',
    unlock: 7,
    stats: { element: 'air', power: 1, reach: 3, job: 'Brings wide rain' },
  },
  sun: {
    id: 'sun',
    name: 'Sunburst',
    emoji: '☀️',
    color: '#ffd84a',
    desc: 'Warms a wide area and sparks life',
    unlock: 11,
    stats: { element: 'light', power: 1, reach: 3, job: 'Brings wide warmth' },
  },
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

/** Object Lab level (1-5) and whether the throw is a charged Supernova. */
export interface ImpactBoost {
  nova?: boolean;
  power?: number;
  novaReach?: number;
  form?: boolean;
  reachDelta?: -1 | 0 | 1;
  centerPowerLoss?: boolean;
  reachCap?: number;
}

/** Repeat the object's main effect across its expanded Supernova reach. */
function applyBoost(p: Planet, kind: Kind, at: number, splash: number, boost: ImpactBoost) {
  const baseRadius = Math.min(4, KINDS[kind].stats.reach + splash + (boost.reachDelta ?? 0) + 1);
  const r = Math.min(4, baseRadius + (boost.novaReach ?? 0));
  for (let d = -r; d <= r; d++) {
    const index = wrap(at + d);
    const before = { ...p.sectors[index] };
    touch(p, at + d, (s) => {
      switch (kind) {
        case 'rock':
          s.land += KINDS.rock.stats.power;
          break;
        case 'ice':
          s.water += KINDS.ice.stats.power;
          break;
        case 'seed':
          if (habitable(s)) s.life += KINDS.seed.stats.power;
          break;
        case 'magma':
          s.heat += KINDS.magma.stats.power;
          s.land += 1;
          if (!boost.form) s.water -= 1;
          break;
        case 'storm':
          s.water += KINDS.storm.stats.power;
          break;
        case 'sun':
          if (habitable(s)) s.life += KINDS.sun.stats.power;
          break;
      }
    });
    if (Math.abs(d) > baseRadius && biomeOf(p.sectors[index]) !== biomeOf(before)) {
      p.sectors[index] = before;
    } else if (boost.novaReach && (kind === 'storm' || kind === 'sun')) {
      const base = p.sectors[index];
      const candidate = { ...base };
      if (kind === 'storm') candidate.water = Math.min(5, candidate.water + 1);
      else if (habitable(candidate)) candidate.life = Math.min(3, candidate.life + 1);
      if (biomeOf(candidate) === biomeOf(base)) p.sectors[index] = candidate;
    }
  }
}

export function boostRadius(b: ImpactBoost = {}) {
  return b.nova ? 1 : 0;
}

/** Supernova charge a landing earns (Lab Lv3+ objects charge 50% faster). */
export function novaCharge(changed: number, spawned: number) {
  return changed + spawned * 2;
}

/** Mutate sectors for an impact. `splash` = extra neighbour radius (upgrade). */
function applyKind(p: Planet, kind: Kind, at: number, splash: number, boost: ImpactBoost): void {
  const r = KINDS[kind].stats.reach + splash;
  const centrePower = Math.max(1, KINDS[kind].stats.power - (boost.centerPowerLoss ? 1 : 0));
  const form = !!boost.form;
  switch (kind) {
    case 'rock':
      touch(p, at, (s) => (s.land += centrePower));
      for (let d = 1; d <= r; d++) for (const j of [at - d, at + d]) touch(p, j, (s) => (s.land += 2));
      if (form) for (const d of [-3, 3]) touch(p, at + d, (s) => (s.land += 1));
      break;
    case 'ice':
      touch(p, at, (s) => {
        s.water += centrePower;
        s.heat = form ? Math.min(s.heat - 1, -2) : s.heat - 1;
      });
      for (let d = 1; d <= r; d++) for (const j of [at - d, at + d]) touch(p, j, (s) => (s.water += form ? 1 : 2));
      break;
    case 'magma':
      touch(p, at, (s) => {
        s.heat += centrePower;
        s.land += 1;
        if (!form) s.water -= 1;
      });
      for (let d = 1; d <= r; d++)
        for (const j of [at - d, at + d])
          touch(p, j, (s) => {
            s.heat += 1;
            if (form || s.water === 0) s.land += 1;
          });
      break;
    case 'seed':
      for (let d = -r; d <= r; d++)
        touch(p, at + d, (s) => {
          if (habitable(s)) s.life += d === 0 ? centrePower + (form ? 1 : 0) : form ? 2 : 1;
        });
      break;
    case 'storm':
      for (let d = -r; d <= r; d++)
        touch(p, at + d, (s) => {
          s.water +=
            d === 0
              ? Math.max(1, KINDS.storm.stats.power + 1 - Number(!!boost.centerPowerLoss))
              : KINDS.storm.stats.power + Number(Math.abs(d) <= 1);
          if (form && s.water >= 2 && habitable(s)) s.life += 1;
          if (s.heat > 0) s.heat -= 1;
          else if (s.heat < 0) s.heat += 1;
        });
      break;
    case 'sun':
      for (let d = -r; d <= r; d++)
        touch(p, at + d, (s) => {
          const hadPlants = s.life >= 2;
          if (!form || hadPlants) s.heat += d === 0 ? centrePower : KINDS.sun.stats.power;
          if (Math.abs(d) < r && habitable(s)) s.life += d === 0 ? centrePower : KINDS.sun.stats.power;
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

export type TraitId = 'fireproof' | 'swimmer' | 'weedproof' | 'frostproof' | 'calm';

export const TRAITS: Record<TraitId, { name: string; rule: string; icon: string }> = {
  fireproof: { name: 'Fireproof', rule: 'Fire and Dry Spell cannot dry its home.', icon: '🛡️' },
  swimmer: { name: 'Swimmer', rule: 'Its home counts as water and stops fire and weeds.', icon: '🌊' },
  weedproof: { name: 'Weedproof', rule: 'Weeds cannot tangle its home.', icon: '🍃' },
  frostproof: { name: 'Frostproof', rule: 'Frost Creep stops at its home.', icon: '🧣' },
  calm: { name: 'Calm', rule: 'The first Trouble waits one more throw.', icon: '✨' },
};

const TRAIT_BY_HOME: Partial<Record<BiomeId, TraitId>> = {
  volcano: 'fireproof',
  desert: 'fireproof',
  savanna: 'fireproof',
  springs: 'fireproof',
  ocean: 'swimmer',
  reef: 'swimmer',
  marsh: 'swimmer',
  swamp: 'swimmer',
  forest: 'weedproof',
  jungle: 'weedproof',
  meadow: 'weedproof',
  highland: 'weedproof',
  tundra: 'frostproof',
  taiga: 'frostproof',
  icesheet: 'frostproof',
  mountain: 'frostproof',
};

/** A creature's first recipe land is its home; planet-wide legendaries are Calm. */
export function traitOf(species: string): TraitId | null {
  const creature = SPECIES_BY_ID[species];
  if (!creature) return null;
  if (creature.rarity === 'legendary') return 'calm';
  return creature.home?.[0] ? (TRAIT_BY_HOME[creature.home[0]] ?? null) : null;
}

/** The missing land in a creature's local habitat recipe. */
export function neededHabitat(id: string, planet: Planet, sector: number): BiomeId | null {
  const home = SPECIES_BY_ID[id]?.home;
  if (!home?.length) return null;
  if (planet.sectors[wrap(sector)].biome !== home[0]) return home[0];
  const near = [planet.sectors[wrap(sector - 1)].biome, planet.sectors[wrap(sector + 1)].biome];
  if (home.length === 2) return near.includes(home[1]) ? home[0] : home[1];
  if (home.length === 3) return home.slice(1).find((biome) => !near.includes(biome)) ?? home[0];
  return home[0];
}
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
  powerApplied?: boolean;
}

export function impact(
  p: Planet,
  kind: Kind,
  at: number,
  splash = 0,
  boost: ImpactBoost = {},
  beforeSettle?: (planet: Planet) => void,
): ImpactResult {
  const before = lifeScore(p);
  const prev = p.sectors.map((s) => s.biome);
  const extra = boostRadius(boost);
  const baseReach =
    boost.reachCap === undefined
      ? KINDS[kind].stats.reach + splash + extra
      : Math.min(boost.reachCap, KINDS[kind].stats.reach + splash + extra + (boost.reachDelta ?? 0));
  const labReach = boost.nova ? Math.min(4, baseReach + (boost.novaReach ?? 0)) : baseReach;
  const beforeLabReach = labReach > baseReach ? clonePlanet(p) : null;
  if (beforeLabReach) applyKind(beforeLabReach, kind, wrap(at), baseReach - KINDS[kind].stats.reach, { ...boost, novaReach: 0 });
  applyKind(p, kind, wrap(at), Math.max(baseReach, labReach) - KINDS[kind].stats.reach, boost);
  if (beforeLabReach)
    for (const distance of [-labReach, labReach]) {
      const index = wrap(at + distance);
      if (biomeOf(p.sectors[index]) !== biomeOf(beforeLabReach.sectors[index])) p.sectors[index] = beforeLabReach.sectors[index];
    }
  if (boost.nova) applyBoost(p, kind, wrap(at), splash, boost);
  beforeSettle?.(p);
  // Add Power after Fusions and Supernova, so it cannot change their recipes.
  let powerApplied = false;
  if (boost.power) {
    const index = wrap(at);
    const sector = p.sectors[index];
    if (habitable(sector)) {
      const candidate = { ...sector, life: Math.min(3, sector.life + boost.power) };
      if (candidate.life > sector.life && biomeOf(candidate) === biomeOf(sector)) {
        touch(p, at, (s) => (s.life += boost.power!));
        powerApplied = true;
      }
    }
  }
  const { spawned, lost } = settle(p);
  const changed = p.sectors.map((s, i) => (s.biome !== prev[i] ? i : -1)).filter((i) => i >= 0);
  return { before, after: lifeScore(p), changed, spawned, lost, ...(powerApplied ? { powerApplied: true } : {}) };
}

export function clonePlanet(p: Planet): Planet {
  return { sectors: p.sectors.map((s) => ({ ...s })), speciesFound: [...p.speciesFound] };
}
