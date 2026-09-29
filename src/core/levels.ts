import {
  KINDS,
  SECTORS,
  SPECIES_BY_ID,
  clonePlanet,
  lifeScore,
  newPlanet,
  settle,
  type BiomeId,
  type Kind,
  type Planet,
  type Sector,
} from './world';
import { NO_MODIFIERS } from './modifiers';
import { ROUND_RULES_V0, novaReady, roundState, rulesForLevel, stepRound, type RoundRules } from './round';

export { rulesForLevel } from './round';

export { NOVA_CHARGE } from './round';

// ------------------------------------------------------------------ rng
export function rngFrom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let s = h >>> 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Twist = 'none' | 'fast' | 'tiny' | 'moon' | 'hot' | 'frozen' | 'ocean' | 'wind' | 'heavy' | 'wobble' | 'twin' | 'boss';

export const TWISTS: Record<Twist, { name: string; desc: string }> = {
  none: { name: '', desc: '' },
  fast: { name: 'Fast Spin', desc: 'This planet spins twice as fast' },
  tiny: { name: 'Tiny World', desc: 'A small planet — aim carefully' },
  moon: { name: 'Moon Guard', desc: 'A moon orbits and blocks shots' },
  hot: { name: 'Scorched', desc: 'Starts baking hot' },
  frozen: { name: 'Snowball', desc: 'Starts frozen solid' },
  ocean: { name: 'Water World', desc: 'Starts covered in ocean' },
  wind: { name: 'Solar Wind', desc: 'A steady wind pushes every throw sideways' },
  heavy: { name: 'Dense Core', desc: 'Extra-strong gravity bends shots sharply' },
  wobble: { name: 'Wobbly Spin', desc: 'The planet speeds up, slows and spins back' },
  twin: { name: 'Twin Moons', desc: 'Two moons orbit in opposite directions' },
  boss: { name: 'Comet Guardian', desc: 'A guardian comet blocks shots — hit it 3 times for a bonus' },
};

/** Hits needed to defeat a Comet Guardian (every chapter's 10th planet). */
export const BOSS_HP = 3;

/** Physics twists join the pool as the campaign goes on. */
function laterTwists(n: number): Twist[] {
  const out: Twist[] = [];
  if (n >= 12) out.push('wind');
  if (n >= 16) out.push('heavy');
  if (n >= 20) out.push('wobble');
  if (n >= 24) out.push('twin');
  return out;
}

export interface LevelDef {
  n: number;
  seed: string;
  throws: number;
  queue: Kind[]; // deal order (length >= throws + bonus)
  twist: Twist;
  spin: number; // radians per second
  size: number; // planet radius multiplier
  stars: [number, number, number]; // life targets
  start: Planet;
  name: string;
  hue: number;
  difficulty: Difficulty;
  nova: boolean;
  /** Extra goals that must be met (with at least 1★) to win. */
  goals: Goal[];
}

/** A level goal: have N regions of a land type, or a creature living on the planet. */
export interface Goal {
  type: 'biome' | 'species';
  id: string;
  count: number;
}

export function goalProgress(p: Planet, g: Goal): number {
  if (g.type === 'biome') return p.sectors.filter((s) => s.biome === g.id).length;
  return p.sectors.filter((s) => s.species === g.id).length;
}

export function goalsMet(p: Planet, goals: Goal[]) {
  return goals.every((g) => goalProgress(p, g) >= g.count);
}

/** Stars actually earned: goals must be met for any star to count. */
export function starsEarned(p: Planet, score: number, L: Pick<LevelDef, 'stars' | 'goals'>) {
  return goalsMet(p, L.goals) ? starsFor(score, L.stars) : 0;
}

/** The first campaign level with goals. */
export const GOALS_FROM = 6;

export type Difficulty = 'normal' | 'hard' | 'super';

/** The first Hard planet is 15; later chapters keep their established slots. */
export function difficultyOf(n: number, seedPrefix = 'PP'): Difficulty {
  if (seedPrefix !== 'PP') return 'normal';
  if (n >= 19 && n % 10 === 9) return 'super';
  if (n >= 15 && n % 5 === 0) return 'hard';
  return 'normal';
}

export const DIFFICULTY_DUST: Record<Difficulty, number> = { normal: 1, hard: 2, super: 3 };

/** Reviewed layout substitutions for campaign slots. Zero means the original layout. */
export const LEVEL_SALT: Partial<Record<number, number>> = { 16: 2, 22: 1, 23: 46, 24: 48, 27: 9, 28: 19, 32: 3, 44: 5, 51: 7 };

const NAMES_A = [
  'Pebble',
  'Mossy',
  'Glim',
  'Tumble',
  'Nova',
  'Bramble',
  'Puddle',
  'Ember',
  'Frost',
  'Cosmo',
  'Lumen',
  'Dewdrop',
  'Zephyr',
  'Marble',
  'Sprout',
  'Comet',
];
const NAMES_B = ['Rock', 'World', 'Orb', 'Globe', 'Isle', 'Sphere', 'Haven', 'Prime', 'Minor', 'Major'];

export function availableKinds(n: number): Kind[] {
  return (Object.keys(KINDS) as Kind[]).filter((k) => KINDS[k].unlock <= n);
}

function startFor(twist: Twist, rnd: () => number): Planet {
  switch (twist) {
    case 'hot':
      return newPlanet(() => ({ heat: 2 }));
    case 'frozen':
      return newPlanet(() => ({ heat: -2, water: 1 }));
    case 'ocean':
      return newPlanet((i) => ({ water: i % 6 === 0 ? 1 : 3 }));
    default: {
      // a couple of random features so no two planets start identical
      const p = newPlanet();
      const lakes = Math.floor(rnd() * 3);
      for (let k = 0; k < lakes; k++) {
        const i = Math.floor(rnd() * SECTORS);
        p.sectors[i].water = 2;
      }
      return p;
    }
  }
}

/**
 * Best life score a perfect-aim greedy player reaches with this queue.
 * Used to set star targets so every generated level is beatable.
 */
export function greedyScore(start: Planet, queue: Kind[], throws: number, splash = 0, nova = true, rules = ROUND_RULES_V0): number {
  return lifeScore(greedyPlan(start, queue, throws, splash, nova, rules));
}

/** The planet the greedy solver ends up with (used to set targets and goals). */
export function greedyPlan(start: Planet, queue: Kind[], throws: number, splash = 0, nova = true, rules = ROUND_RULES_V0): Planet {
  return solvePlan({ start, queue, throws, nova }, rules, splash ? { ...NO_MODIFIERS, splash } : NO_MODIFIERS);
}

type SolverLevel = Pick<LevelDef, 'start' | 'queue' | 'throws' | 'nova'> & Partial<Pick<LevelDef, 'n'>>;

/** Today's perfect-aim, immediate-life choice, with automatic Supernovas. */
export function solve2(level: SolverLevel, rules: RoundRules = rulesForLevel(level.n ?? 1)): Planet {
  return solvePlan(level, rules, NO_MODIFIERS);
}

function solvePlan(level: SolverLevel, rules: RoundRules, mods: typeof NO_MODIFIERS, choiceRules = rules): Planet {
  let state = roundState(level.start, level.nova);
  for (let turn = 0; turn < level.throws; turn++) {
    const kind = level.queue[turn];
    const nova = novaReady(state);
    let best = -1;
    let at = 0;
    for (let sector = 0; sector < SECTORS; sector++) {
      const trial = stepRound(state, { kind, sector, nova }, mods, choiceRules);
      if (trial.after > best) {
        best = trial.after;
        at = sector;
      }
    }
    state = stepRound(state, { kind, sector: at, nova }, mods, rules).state;
  }
  return state.planet;
}

/** The blind solver chooses by the old rule, then experiences the taught rules. */
export function solve0(level: SolverLevel, rules: RoundRules = rulesForLevel(level.n ?? 1)): Planet {
  return solvePlan(level, rules, NO_MODIFIERS, ROUND_RULES_V0);
}

/** Rules have their own seed stream, leaving the layout stream unchanged. */
export function rulesForSeed(seed: string): RoundRules {
  rngFrom(`${seed}-rules`)();
  const match = seed.match(/-(\d+)(?:~\d+)?$/);
  return rulesForLevel(match ? Number(match[1]) : 1);
}

export const DEAL_WEIGHTS: Record<Kind, number> = { rock: 3.5, ice: 4, seed: 4.5, magma: 3, storm: 2, sun: 1.5 };

/** Difficulty knobs (tuned with a skill-level simulation; see tests/levels.test.ts). */
export const TUNE = {
  rampLevels: 20,
  f1: [0.42, 0.17],
  f2: [0.66, 0.15],
  f3: [0.845, 0.05],
  saw: 0.05,
  bump: { normal: [0, 0, 0], hard: [0.06, 0.04, 0.02], super: [0.09, 0.06, 0.03] } as Record<Difficulty, number[]>,
};

/**
 * Goals are taken from what the greedy solver actually built, so the level stays
 * beatable: a land type it grew (asking for a bit less than it made) and a
 * creature that moved in.
 */
function pickGoals(n: number, difficulty: Difficulty, start: Planet, plan: Planet, blind: Planet, rnd: () => number): Goal[] {
  if (n < GOALS_FROM) return [];
  const want = difficulty === 'super' ? 2 : difficulty === 'hard' ? 1 : rnd() < 0.6 ? 1 : 0;
  if (!want) return [];
  const count = (p: Planet, id: string) => p.sectors.filter((s) => s.biome === id).length;
  const biomes = [...new Set(plan.sectors.map((s) => s.biome))]
    .filter((b) => b !== 'barren' && Math.min(count(plan, b), count(blind, b)) > count(start, b))
    .map((b) => ({ id: b as BiomeId, have: Math.min(count(plan, b), count(blind, b)), from: count(start, b) }));
  const rank = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
  const species = plan.sectors
    .map((s) => s.species)
    .filter((id): id is string => !!id && blind.sectors.some((s) => s.species === id) && !start.sectors.some((s) => s.species === id))
    .sort((a, b) => rank[SPECIES_BY_ID[b].rarity] - rank[SPECIES_BY_ID[a].rarity]);
  const out: Goal[] = [];
  const takeSpecies = () => {
    if (!species.length) return;
    // prefer the rarest creature on harder planets, any on normal ones
    const id = difficulty === 'super' ? species[0] : species[Math.floor(rnd() * species.length)];
    out.push({ type: 'species', id, count: 1 });
  };
  const takeBiome = () => {
    if (!biomes.length) return;
    const b = biomes.splice(Math.floor(rnd() * biomes.length), 1)[0];
    const k = difficulty === 'super' ? 0.8 : 0.7;
    out.push({ type: 'biome', id: b.id, count: Math.max(b.from + 1, Math.round(b.have * k)) });
  };
  if (want >= 2) {
    takeSpecies();
    takeBiome();
  } else if (rnd() < 0.5) takeSpecies();
  else takeBiome();
  if (!out.length) takeBiome();
  if (n >= 25 && rnd() < 0.15) {
    const source = ['tundra', 'icesheet', 'taiga', 'volcano', 'desert', 'savanna'] as const;
    const eligible = source.filter((id) => Math.min(count(plan, id), count(blind, id)) > count(start, id));
    if (eligible.length) {
      const id = eligible[Math.floor(rnd() * eligible.length)];
      if (!out.some((goal) => goal.type === 'biome' && goal.id === id))
        out.push({ type: 'biome', id, count: Math.max(1, Math.min(count(plan, id), count(blind, id)) - 1) });
    }
  }
  return out;
}

export interface LevelOptions {
  goals?: boolean;
  boss?: boolean;
  salt?: number;
  rules?: RoundRules;
}

function levelLayout(n: number, seedPrefix: string, o: LevelOptions) {
  const salt = o.salt ?? (seedPrefix === 'PP' ? LEVEL_SALT[n] : undefined);
  const seed = `${seedPrefix}-${n}${salt ? `~${salt}` : ''}`;
  const rnd = rngFrom(seed);
  const kinds = availableKinds(n);
  let twist: Twist = 'none';
  if (n >= 5 && n % 5 === 0) {
    const pool: Twist[] = ['fast', 'tiny', 'moon', 'hot', 'frozen', 'ocean', ...laterTwists(n)];
    twist = pool[Math.floor(rnd() * pool.length)];
  } else if (n >= 8 && rnd() < 0.25) {
    const pool: Twist[] = ['fast', 'tiny', 'moon', ...laterTwists(n)];
    twist = pool[Math.floor(rnd() * pool.length)];
  }
  // every chapter ends with a Comet Guardian
  if ((seedPrefix === 'PP' && n >= 10 && n % 10 === 0) || o.boss) twist = 'boss';
  const throws = n === 1 ? 6 : n === 2 ? 8 : Math.min(16, 9 + Math.floor(n / 4));
  // weighted deal: new kinds show up a bit more on their debut level
  const weights = DEAL_WEIGHTS;
  const queue: Kind[] = [];
  if (n === 1) queue.push('rock', 'ice', 'ice', 'rock', 'ice', 'rock');
  if (n === 2) queue.push('seed', 'ice', 'seed', 'rock', 'seed', 'ice', 'seed', 'rock');
  if (n === 8) queue.push('magma', 'ice');
  if (n === 13) queue.push('seed', 'storm');
  if (n === 22) queue.push('seed', 'sun');
  if (n === 25) queue.push('rock', 'ice');
  if (n === 32) queue.push('magma', 'sun');
  if (n === 26) queue.push('magma', 'ice', 'storm');
  const debut = kinds.find((k) => KINDS[k].unlock === n);
  if (debut && n > 2) queue.push(debut);
  while (queue.length < throws + 12) {
    const total = kinds.reduce((a, k) => a + weights[k] * (k === debut ? 1.6 : 1), 0);
    let roll = rnd() * total;
    for (const k of kinds) {
      roll -= weights[k] * (k === debut ? 1.6 : 1);
      if (roll < 0) {
        queue.push(k);
        break;
      }
    }
  }
  const start = startFor(twist, rnd);
  if (n === 8 || n === 26) {
    start.sectors[12].water = 3;
    start.sectors[12].heat = -2;
  }
  if (n === 26) start.sectors[18].life = 1;
  settle(start); // creatures that already fit the starting planet are there from the start
  const difficulty = difficultyOf(n, seedPrefix);
  const spin = (twist === 'fast' ? 0.9 : 0.35 + Math.min(0.3, n * 0.012)) * (rnd() < 0.5 ? 1 : -1);
  const name = `${NAMES_A[Math.floor(rnd() * NAMES_A.length)]} ${NAMES_B[Math.floor(rnd() * NAMES_B.length)]}`;
  const hue = difficulty === 'super' ? 285 : difficulty === 'hard' ? 15 : 200 + Math.floor(rnd() * 110);
  return { n, seed, throws, queue, twist, spin, size: twist === 'tiny' ? 0.72 : 1, start, name, hue, difficulty };
}

export type LevelMeta = Pick<LevelDef, 'name' | 'hue' | 'twist' | 'difficulty'> & { boss: boolean };

/** Preview metadata without running either solver. */
export function levelMeta(n: number, seedPrefix = 'PP'): LevelMeta {
  const { name, hue, twist, difficulty } = levelLayout(n, seedPrefix, {});
  return { name, hue, twist, difficulty, boss: twist === 'boss' };
}

const LEVEL_CACHE_LIMIT = 256;
const levelCache = new Map<string, LevelDef>();

function copyLevel(level: LevelDef): LevelDef {
  return {
    ...level,
    queue: [...level.queue],
    start: clonePlanet(level.start),
    stars: [...level.stars],
    goals: level.goals.map((goal) => ({ ...goal })),
  };
}

/** `o.goals` / `o.boss` give non-campaign planets (the weekly Voyage) goals and a Comet Guardian. */
export function makeLevel(n: number, seedPrefix = 'PP', o: LevelOptions = {}): LevelDef {
  const salt = o.salt ?? (seedPrefix === 'PP' ? LEVEL_SALT[n] : undefined);
  const key = JSON.stringify([n, seedPrefix, !!o.goals, !!o.boss, salt ?? null, o.rules ?? rulesForLevel(n)]);
  const cached = levelCache.get(key);
  if (cached) return copyLevel(cached);
  const level = buildLevel(n, seedPrefix, o);
  if (levelCache.size >= LEVEL_CACHE_LIMIT) levelCache.delete(levelCache.keys().next().value!);
  levelCache.set(key, level);
  return copyLevel(level);
}

function buildLevel(n: number, seedPrefix: string, o: LevelOptions): LevelDef {
  const layout = levelLayout(n, seedPrefix, o);
  const { seed, throws, queue, twist, spin, size, start, name, hue, difficulty } = layout;
  const nova = seedPrefix !== 'PP' || n >= 9;
  const rules = o.rules ?? rulesForSeed(seed);
  const plan = solve2({ ...layout, nova }, rules);
  const blind = solve0({ ...layout, nova }, rules);
  const best = lifeScore(plan);
  const base = lifeScore(start);
  // Star targets as a share of the greedy optimum: gentle for the first chapter,
  // then a sawtooth inside every chapter (easier after a chest, harder near the end).
  const ease = Math.min(1, (n - 1) / TUNE.rampLevels);
  const saw = seedPrefix === 'PP' ? ((n - 1) % 10) / 9 : 0.5;
  const bump = TUNE.bump[difficulty];
  const f1 = TUNE.f1[0] + TUNE.f1[1] * ease + TUNE.saw * saw + bump[0];
  const f2 = TUNE.f2[0] + TUNE.f2[1] * ease + TUNE.saw * 0.7 * saw + bump[1];
  // The middle chapter needs a small lift to keep sharp clears inside its ceiling.
  const f3 = Math.min(0.97, TUNE.f3[0] + TUNE.f3[1] * ease + bump[2] + (n >= 31 && n <= 45 ? 0.004 : 0));
  const t = (f: number) => Math.max(base + 5, Math.round((base + (best - base) * f) / 5) * 5);
  const stars: [number, number, number] = [Math.min(t(f1), Math.floor(lifeScore(blind) / 5) * 5), t(f2), t(f3)];
  if (stars[1] <= stars[0]) stars[1] = stars[0] + 5;
  if (stars[2] <= stars[1]) stars[2] = stars[1] + 5;
  const goals = seedPrefix === 'PP' || o.goals ? pickGoals(n, difficulty, start, plan, blind, rngFrom(`${seed}-goals`)) : [];
  return {
    n,
    seed,
    throws,
    queue,
    twist,
    spin,
    size,
    stars,
    start,
    name,
    hue,
    difficulty,
    nova,
    goals,
  };
}

export function starsFor(score: number, stars: [number, number, number]): number {
  return score >= stars[2] ? 3 : score >= stars[1] ? 2 : score >= stars[0] ? 1 : 0;
}

export type { Sector };
