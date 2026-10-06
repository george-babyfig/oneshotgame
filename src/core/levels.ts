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
import { NO_MODIFIERS, type RoundModifiers } from './modifiers';
import { OBSTACLES, skyFor, type ObstacleId, type SkyDef } from './sky';
import { flyFull, sceneGeometry, STAR_SLING } from './flight';
import { ROUND_RULES_V0, novaReady, roundState, rulesForLevel, stepRound, type RoundRules } from './round';
import { TROUBLES, forecastTroubles, type TroubleId } from './troubles';

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

export type Twist =
  'none' | 'fast' | 'tiny' | 'moon' | 'hot' | 'frozen' | 'ocean' | 'wind' | 'heavy' | 'wobble' | 'twin' | 'boss' | 'short' | ObstacleId;

export const TWISTS: Record<Twist, { name: string; desc: string }> = {
  none: { name: '', desc: '' },
  fast: { name: 'Fast Spin', desc: 'This planet spins twice as fast' },
  tiny: { name: 'Tiny World', desc: 'A small planet — aim carefully' },
  moon: { name: 'Moon Guard', desc: 'A moon orbits and blocks shots' },
  hot: { name: 'Scorched', desc: 'Starts baking hot' },
  frozen: { name: 'Snowball', desc: 'Starts frozen solid' },
  ocean: { name: 'Water World', desc: 'Starts covered in ocean' },
  wind: { name: 'Solar Wind', desc: 'A steady wind pushes every throw sideways' },
  heavy: { name: '', desc: '' }, // retired in M7.5 (kept so old seeds still type-check)
  wobble: { name: 'Wobbly Spin', desc: 'The planet speeds up, slows and spins back' },
  twin: { name: 'Twin Moons', desc: 'Two moons orbit in opposite directions' },
  boss: { name: 'Comet Guardian', desc: 'A guardian comet blocks shots — hit it 3 times for a bonus' },
  short: { name: 'Short Supply', desc: 'One object sits this planet out' },
  rocks: { name: OBSTACLES.rocks.name, desc: OBSTACLES.rocks.rule },
  bubble: { name: OBSTACLES.bubble.name, desc: OBSTACLES.bubble.rule },
  mist: { name: OBSTACLES.mist.name, desc: OBSTACLES.mist.rule },
  ring: { name: OBSTACLES.ring.name, desc: OBSTACLES.ring.rule },
  tug: { name: OBSTACLES.tug.name, desc: OBSTACLES.tug.rule },
};

/** Hits needed to defeat a Comet Guardian (every chapter's 10th planet). */
export const BOSS_HP = 3;

/** Physics twists join the pool as the campaign goes on. */
function laterTwists(n: number, obstacleCap = Infinity): Twist[] {
  const out: Twist[] = [];
  if (n >= 12) out.push('wind');
  if (n >= 20) out.push('wobble');
  if (n >= 24) out.push('twin');
  for (const [id, def] of Object.entries(OBSTACLES) as [ObstacleId, (typeof OBSTACLES)[ObstacleId]][])
    if (n >= def.debut + 2 && def.debut < obstacleCap) out.push(id);
  return out;
}

export interface LevelDef {
  n: number;
  seed: string;
  throws: number;
  queue: Kind[]; // deal order (length >= throws + bonus)
  twist: Twist;
  sky: SkyDef;
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
  troubles: { id: TroubleId; source: number }[];
  shortKind?: Kind;
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
  if (!goalsMet(p, L.goals)) return 0;
  const stars = starsFor(score, L.stars);
  if (stars < 3 || !('n' in L)) return stars;
  if (L.n === 1 && (L as Partial<LevelDef>).seed?.startsWith('PP-')) {
    const adjacent = p.sectors.some(
      (sector, index) =>
        (sector.biome === 'ocean' && p.sectors[(index + 1) % SECTORS].biome === 'mountain') ||
        (sector.biome === 'mountain' && p.sectors[(index + 1) % SECTORS].biome === 'ocean'),
    );
    if (!adjacent) return 2;
  }
  const start = (L as Partial<LevelDef>).start;
  if (
    L.n === 3 &&
    (L as Partial<LevelDef>).seed?.startsWith('PP-') &&
    start &&
    !p.speciesFound.some((id) => !start.speciesFound.includes(id))
  )
    return 2;
  return stars;
}

/** The first campaign level with goals. */
export const GOALS_FROM = 6;

export type Difficulty = 'normal' | 'hard' | 'super';

/** The first Hard planet is 15; later chapters keep their established slots. */
export function difficultyOf(n: number, seedPrefix = 'PP'): Difficulty {
  if (seedPrefix === 'RX') {
    if (n >= 19 && n % 10 === 9) return 'super';
    return n % 10 === 5 ? 'hard' : 'normal';
  }
  if (seedPrefix !== 'PP') return 'normal';
  if (n >= 19 && n % 10 === 9) return 'super';
  if (n >= 15 && n % 5 === 0) return 'hard';
  return 'normal';
}

export const DIFFICULTY_DUST: Record<Difficulty, number> = { normal: 1, hard: 2, super: 3 };

/** Reviewed layout substitutions for campaign slots. Zero means the original layout. */
export const LEVEL_SALT: Partial<Record<number, number>> = {
  1: 3,
  2: 118,
  4: 1,
  5: 2,
  6: 1,
  7: 75,
  8: 5,
  9: 35,
  10: 33,
  11: 25,
  12: 18,
  13: 8,
  14: 43,
  15: 100,
  16: 2,
  17: 11,
  18: 26,
  19: 1,
  20: 42,
  21: 6,
  22: 11,
  23: 339,
  24: 21,
  25: 79,
  27: 17,
  28: 6,
  29: 98,
  30: 15,
  31: 11,
  32: 1,
  34: 35,
  35: 37,
  36: 49,
  38: 20,
  39: 60,
  40: 17,
  41: 3,
  42: 49,
  43: 14,
  44: 16,
  45: 109,
  47: 2,
  48: 11,
  49: 118,
  50: 23,
  51: 6,
  52: 1,
  53: 23,
  54: 10,
  55: 9,
  56: 29,
  58: 10,
  59: 59,
  60: 4,
};

/** Selected raw-v2 campaign salts for lint outliers in unshipped planets 61-120. */
export const RAW_LEVEL_SALT: Partial<Record<number, number>> = {
  68: 4,
  70: 9,
  75: 14,
  76: 9,
  77: 2,
  80: 6,
  90: 6,
  93: 12,
  95: 1,
  99: 13,
  101: 1,
  102: 4,
  104: 6,
  111: 3,
  114: 1,
  115: 2,
  119: 15,
  120: 8,
};

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

type SolverLevel = Pick<LevelDef, 'start' | 'queue' | 'throws' | 'nova'> &
  Partial<Pick<LevelDef, 'n' | 'troubles' | 'difficulty' | 'seed' | 'goals'>>;

/** Today's perfect-aim, immediate-life choice, with automatic Supernovas. */
export function solve2(level: SolverLevel, rules: RoundRules = rulesForLevel(level.n ?? 1)): Planet {
  return solvePlan(level, rules, NO_MODIFIERS);
}

export function solveWith(level: SolverLevel, rules: RoundRules, mods: RoundModifiers): Planet {
  return solvePlan(level, rules, mods);
}

/** Try goal-aware plans independently of the immediate-score greedy plan. */
export function solveForGoals(level: SolverLevel, rules: RoundRules, mods: RoundModifiers): Planet {
  if (!level.goals?.length) return solvePlan(level, rules, mods);
  let best = solvePlan(level, rules, mods);
  if (goalsMet(best, level.goals)) return best;
  for (const goalWeight of [12, 30, 80, 200]) {
    const candidate = solvePlan(level, rules, mods, rules, goalWeight);
    if (goalsMet(candidate, level.goals)) return candidate;
    const progress = (planet: Planet) => level.goals!.reduce((sum, goal) => sum + Math.min(goal.count, goalProgress(planet, goal)), 0);
    if (progress(candidate) > progress(best)) best = candidate;
  }
  return best;
}

function solvePlan(level: SolverLevel, rules: RoundRules, mods: RoundModifiers, choiceRules = rules, goalWeight = 0): Planet {
  let state = roundState(level.start, level.nova, level.troubles, level.difficulty === 'hard' || level.difficulty === 'super');
  const queue =
    level.n === 2 && !level.seed?.startsWith('RX-') && choiceRules !== ROUND_RULES_V0
      ? [level.queue[1], level.queue[0], ...level.queue.slice(2)]
      : level.queue;
  for (let turn = 0; turn < level.throws; turn++) {
    const kind = queue[turn];
    const nova = novaReady(state);
    let best = -1;
    let at = 0;
    for (let sector = 0; sector < SECTORS; sector++) {
      const trial = stepRound(
        choiceRules === ROUND_RULES_V0 ? { ...state, troubles: [] } : state,
        { kind, sector, nova },
        mods,
        choiceRules,
      );
      // Aware play also values the next forecast beat, so it can cool a source early.
      const nextBeat = choiceRules === ROUND_RULES_V0 ? undefined : forecastTroubles(trial.state, mods)[0];
      const risk =
        nextBeat?.inThrows === 1 && nextBeat.sector !== null && !nextBeat.blockedBy
          ? (trial.state.planet.sectors[nextBeat.sector].species ? 12 : 0) + (nextBeat.id === 'vine' ? 8 : 3)
          : 0;
      const goalValue =
        goalWeight * (level.goals?.reduce((sum, goal) => sum + Math.min(goal.count, goalProgress(trial.state.planet, goal)), 0) ?? 0);
      const value =
        trial.after +
        goalValue +
        (choiceRules === ROUND_RULES_V0 ? 0 : trial.troubleEvents.filter((e) => e.kind === 'settled').length * 12 - risk);
      if (value > best) {
        best = value;
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
  rampLevels: 30,
  f1: [0.4, 0.24],
  f2: [0.68, 0.13],
  f3: [0.88, 0.05],
  saw: 0.05,
  // Difficulty comes from forecast Troubles and sky placement, not larger star targets.
  bump: { normal: [0, 0, 0], hard: [0, 0, 0], super: [0, 0, 0] } as Record<Difficulty, number[]>,
};

/** Only the raw profile's target adjustments; the reviewed fractions are frozen. */
function rawTargetOffsets(n: number, difficulty: Difficulty): readonly [number, number] {
  if (difficulty === 'super') return [0.03, 0.045];
  if (difficulty === 'hard') {
    if (n === 15) return [-0.005, 0];
    if (n === 20) return [-0.035, 0.015];
    return [n >= 61 ? 0.025 : 0.01, n >= 61 ? 0.03 : 0.01];
  }
  if (n <= 3) return [0, 0.05];
  if (n <= 10) return [0.005, 0.01];
  if (n <= 20) return [0, 0.01];
  if (n <= 30) return [-0.11, 0.035];
  if (n <= 60) return [-0.07, 0];
  return [-0.135, -0.02];
}

/**
 * Goals are taken from what the greedy solver actually built, so the level stays
 * beatable: a land type it grew (asking for a bit less than it made) and a
 * creature that moved in.
 */
function pickGoals(
  n: number,
  difficulty: Difficulty,
  start: Planet,
  plan: Planet,
  blind: Planet,
  rnd: () => number,
  profile: GenerationProfile = 'reviewed-v1',
): Goal[] {
  if (n < GOALS_FROM) return [];
  const goalRate = n <= 10 ? 0.3 : n <= 20 ? 0.45 : 0.6;
  const want = difficulty === 'super' ? 2 : difficulty === 'hard' ? 1 : rnd() < goalRate ? 1 : 0;
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
    // A common creature has several achievable recipes in the dealt queue.
    const id = species[species.length - 1];
    out.push({ type: 'species', id, count: 1 });
  };
  const takeBiome = () => {
    if (!biomes.length) return;
    // Later Hard goals name a land the deal can build by several paths.
    const index =
      (difficulty === 'hard' && n >= 25) || (profile === 'raw-v2' && difficulty === 'normal' && n <= 20)
        ? biomes.reduce((best, b, i) => (b.have - b.from > biomes[best].have - biomes[best].from ? i : best), 0)
        : Math.floor(rnd() * biomes.length);
    const b = biomes.splice(index, 1)[0];
    let k = difficulty === 'super' ? 0.65 : difficulty === 'hard' && n >= 25 ? 0.4 : difficulty === 'hard' ? 0.65 : 0.55;
    if (profile === 'raw-v2' && difficulty === 'normal') k = n <= 20 ? 0.3 : n >= 61 ? 0.9 : 0.35;
    if (profile === 'raw-v2' && difficulty === 'hard' && n <= 20) k = 0.8;
    out.push({ type: 'biome', id: b.id, count: Math.max(b.from + 1, Math.round(b.have * k)) });
  };
  if (difficulty === 'hard' && n >= 25) takeBiome();
  else if (want >= 2) {
    takeSpecies();
    takeBiome();
  } else {
    const speciesRate = difficulty === 'hard' ? (profile === 'raw-v2' && n === 20 ? 1 : 0.3) : profile === 'raw-v2' && n <= 20 ? 0 : 0.15;
    if (rnd() < speciesRate) takeSpecies();
    else takeBiome();
  }
  if (!out.length) takeBiome();
  if (n >= 25 && difficulty !== 'hard' && profile !== 'raw-v2' && rnd() < 0.15) {
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

export type GenerationProfile = 'reviewed-v1' | 'raw-v2';

/** Keep old public seeds stable. A raw seed stores its version in the numeric
 * salt so an interrupted round can reconstruct it from LevelDef.seed. */
const RAW_SALT_OFFSET = 1_000_000;
const DAILY_RAW_CUTOVER = '2026-10-14';

/** Offline Solver-0 and shadow-lint salt selections avoid retry builds on
 * the fixed shadow window. */
const RAW_SELECTED_SALT: Partial<Record<number, Record<number, number>>> = {
  4: { 1005: 1015 },
  5: { 1008: 1032, 1010: 1019 },
  6: { 1001: 1018, 1003: 1032 },
  7: { 1007: 1017, 1008: 1040 },
  8: { 1001: 1049, 1004: 1031 },
  9: { 1008: 1023, 1009: 1020 },
  10: { 1002: 1012, 1010: 1021 },
  12: { 1004: 1005, 1006: 1007, 1008: 1009 },
  13: { 1006: 1023, 1008: 1050 },
  14: { 1005: 1006, 1008: 1009, 1012: 1014 },
  15: { 1014: 1015 },
  17: { 1008: 1014 },
  18: { 1003: 1035 },
  21: { 1003: 1005, 1004: 1005, 1006: 1008, 1007: 1008 },
  25: { 1021: 1023, 1022: 1023, 1032: 1033, 200026: 200027 },
  31: { 1005: 1020 },
  33: { 1007: 1026, 1009: 1025 },
  34: { 1008: 1085, 1010: 1073 },
  35: { 1020: 1021, 1022: 1023 },
  37: { 1005: 1012, 1007: 1019 },
  39: { 1013: 1014, 1019: 1020, 1023: 1024 },
  44: { 1005: 1080 },
  46: { 1005: 1041 },
  48: { 1002: 1070 },
  49: { 1002: 1005, 1003: 1005, 1004: 1005, 1019: 1020, 1022: 1024, 1023: 1024 },
  52: { 1003: 1037, 1004: 1023, 1005: 1022, 1006: 1018 },
  54: { 1007: 1099 },
  55: { 1002: 1003, 1004: 1005, 1007: 1008, 1013: 1014, 1024: 1025, 1028: 1029, 1029: 1032 },
  56: { 1004: 1052 },
  57: { 1002: 1014 },
  61: { 1007: 1043 },
  62: { 1008: 1042 },
  64: { 1003: 1044 },
  67: { 1002: 1031, 1005: 1025, 1006: 1045, 1009: 1014 },
  78: { 1005: 1040, 1010: 1044 },
  82: { 1005: 1018 },
  94: { 1004: 1034, 1007: 1037 },
  96: { 1007: 1049 },
  102: { 1008: 1025 },
  108: { 1003: 1020, 1005: 1030, 1006: 1031, 1009: 1041 },
  113: { 1009: 1027 },
  114: { 1001: 1047 },
};

function generationProfile(n: number, seedPrefix: string, o: LevelOptions): GenerationProfile {
  if (o.profile) return o.profile;
  if (o.salt !== undefined && o.salt >= RAW_SALT_OFFSET) return 'raw-v2';
  if (seedPrefix === 'PP') return n > 60 || (o.salt !== undefined && o.salt >= 1001) ? 'raw-v2' : 'reviewed-v1';
  if (seedPrefix.startsWith('DAY-')) return seedPrefix.slice(4) >= DAILY_RAW_CUTOVER ? 'raw-v2' : 'reviewed-v1';
  if (seedPrefix.startsWith('VOY-')) return seedPrefix.slice(4, 12) > '2026-W44' ? 'raw-v2' : 'reviewed-v1';
  // Challenge codes have no generator-version field. Every version-1 code
  // continues to use the layout it originally encoded.
  return 'reviewed-v1';
}

function effectiveSalt(salt: number | undefined, profile: GenerationProfile): number | undefined {
  return profile === 'raw-v2' && salt !== undefined && salt >= RAW_SALT_OFFSET ? salt - RAW_SALT_OFFSET : salt;
}

export interface LevelOptions {
  goals?: boolean;
  boss?: boolean;
  salt?: number;
  profile?: GenerationProfile;
  rules?: RoundRules;
  obstacleCap?: number;
  remix?: boolean;
}

function levelLayout(n: number, seedPrefix: string, o: LevelOptions) {
  const obstacleCap = o.obstacleCap ?? (seedPrefix === 'PP' ? Infinity : 0);
  const profile = generationProfile(n, seedPrefix, o);
  const defaultSalt = seedPrefix === 'PP' ? (profile === 'reviewed-v1' ? LEVEL_SALT[n] : RAW_LEVEL_SALT[n]) : undefined;
  const salt = effectiveSalt(o.salt ?? defaultSalt, profile);
  const seed = `${seedPrefix}-${n}${profile === 'raw-v2' ? `~${RAW_SALT_OFFSET + (salt ?? 0)}` : salt ? `~${salt}` : ''}`;
  const randomSeed = `${seedPrefix}-${n}${salt ? `~${salt}` : ''}`;
  const rnd = rngFrom(randomSeed);
  const kinds = availableKinds(n);
  let twist: Twist = 'none';
  if (o.remix) {
    twist = chooseRemixTwist(n, kinds.length, rnd);
  } else if (n >= 5 && n % 5 === 0) {
    const pool: Twist[] = ['fast', 'tiny', 'moon', 'hot', 'frozen', 'ocean', ...laterTwists(n, obstacleCap)];
    twist = pool[Math.floor(rnd() * pool.length)];
  } else if (n >= 8 && rnd() < 0.25) {
    const later = laterTwists(n, obstacleCap);
    const obstacles = later.filter((t): t is ObstacleId => t in OBSTACLES);
    const ordinary = ['fast', 'tiny', 'moon', ...later.filter((t) => !(t in OBSTACLES))] as Twist[];
    const spaced = seedPrefix === 'PP' && [33, 41, 46, 51, 57].some((debut) => Math.abs(n - debut) <= 3) ? [] : obstacles;
    const pool: Twist[] = [...ordinary, ...spaced.slice(0, ordinary.length)];
    twist = pool[Math.floor(rnd() * pool.length)];
  }
  const teaching: Partial<Record<number, ObstacleId>> = { 33: 'rocks', 41: 'bubble', 46: 'mist', 51: 'ring', 57: 'tug' };
  if (seedPrefix === 'PP' && teaching[n]) twist = teaching[n];
  if (seedPrefix === 'PP' && [14, 16, 18, 28, 36].includes(n)) twist = 'none';

  // every chapter ends with a Comet Guardian
  if ((seedPrefix === 'PP' && n >= 10 && n % 10 === 0) || o.boss) twist = 'boss';
  const throws = n === 1 ? 6 : n === 2 ? 8 : Math.min(16, 9 + Math.floor(n / 4));
  // weighted deal: new kinds show up a bit more on their debut level
  const weights = DEAL_WEIGHTS;
  const queue: Kind[] = [];
  if (!o.remix && n === 1) queue.push('rock', 'ice', 'ice', 'rock', 'ice', 'rock');
  if (!o.remix && n === 2) queue.push('ice', 'rock', 'seed', 'rock', 'seed', 'ice', 'seed', 'rock');
  if (!o.remix && n === 8) queue.push('magma', 'ice');
  if (!o.remix && n === 13) queue.push('seed', 'storm');
  if (!o.remix && n === 22) queue.push('seed', 'sun');
  if (!o.remix && n === 25) queue.push('rock', 'ice');
  if (!o.remix && n === 32) queue.push('magma', 'sun');
  if (!o.remix && n === 26) queue.push('magma', 'ice', 'storm');
  if (seedPrefix === 'PP' && n === 14) queue.push('seed', 'ice', 'storm');
  if (seedPrefix === 'PP' && [16, 18].includes(n)) queue.push('seed', 'ice', 'storm');
  if (seedPrefix === 'PP' && n === 28) queue.push('seed', 'magma', 'seed');
  if (seedPrefix === 'PP' && n === 36) queue.push('seed', 'magma', 'sun');
  if (seedPrefix === 'PP' && teaching[n]) queue.push('rock', 'ice', 'seed');
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
  let shortKind: Kind | undefined;
  if (o.remix && twist === 'short') {
    const shortRnd = rngFrom(`${randomSeed}-short`);
    shortKind = kinds[Math.floor(shortRnd() * kinds.length)];
    const remaining = kinds.filter((kind) => kind !== shortKind);
    // Replace every occurrence, including the opening deal, before solving.
    for (let i = 0; i < queue.length; i++) if (queue[i] === shortKind) queue[i] = remaining[Math.floor(shortRnd() * remaining.length)];
    // Put every remaining kind in the throws a player can actually reach.
    for (const kind of remaining) {
      if (queue.slice(0, throws).includes(kind)) continue;
      const duplicates = queue
        .slice(0, throws)
        .flatMap((dealt, i) => (queue.slice(0, throws).filter((other) => other === dealt).length > 1 ? [i] : []));
      queue[duplicates[Math.floor(shortRnd() * duplicates.length)]] = kind;
    }
  }
  const difficulty = difficultyOf(n, seedPrefix);
  const troubleRnd = rngFrom(`${randomSeed}-troubles`);
  const campaignEligible = seedPrefix === 'PP' && n >= 14 && ![15, 19, 22, 26, 32, 33, 34, 37, 41, 46, 51, 57].includes(n);
  const otherTaught = (o.rules?.troubles ?? []).filter((id) => TROUBLES[id].debut <= n);
  const otherEligible =
    seedPrefix !== 'PP' && !o.remix && twist !== 'boss' && !/^(ZEN|RUSH|REMIX)/.test(seedPrefix) && otherTaught.length > 0;
  const eligible = campaignEligible || otherEligible;
  const guaranteed = [14, 16, 18, 28, 36].includes(n) || (difficulty !== 'normal' && n >= 20);
  const haveTrouble =
    eligible &&
    (seedPrefix.startsWith('DAY-') || (seedPrefix === 'PP' ? guaranteed || (n >= 16 && troubleRnd() < 0.3) : troubleRnd() < 0.3));
  // Place one foundation throw before an early Sunburst on quiet campaign
  // planets. Keep Trouble deals intact so their taught counter stays timely.
  if (seedPrefix === 'PP' && n >= 44 && !haveTrouble) {
    const earlySun = queue.slice(0, throws).findIndex((kind) => kind === 'sun');
    const midpoint = Math.ceil(throws / 2);
    const lateRock = queue.slice(midpoint, throws).findIndex((kind) => kind === 'rock');
    if (earlySun >= 0 && lateRock >= 0) {
      const rock = midpoint + lateRock;
      [queue[earlySun], queue[rock]] = [queue[rock], queue[earlySun]];
    }
  }
  const taught = seedPrefix === 'PP' ? (Object.keys(TROUBLES) as TroubleId[]).filter((id) => TROUBLES[id].debut <= n) : otherTaught;
  const choose = (): TroubleId => taught[Math.floor(troubleRnd() * taught.length)];
  const troubles: { id: TroubleId; source: number }[] = haveTrouble
    ? [
        {
          id:
            seedPrefix === 'PP' && [14, 16, 18].includes(n)
              ? 'vent'
              : seedPrefix === 'PP' && n === 28
                ? 'vine'
                : seedPrefix === 'PP' && n === 36
                  ? 'frost'
                  : choose(),
          source: seedPrefix === 'PP' && [14, 16, 18, 28, 36].includes(n) ? 10 : Math.floor(troubleRnd() * SECTORS),
        },
      ]
    : [];
  if (haveTrouble && difficulty === 'super' && n >= 40 && troubleRnd() < 0.5)
    troubles.push({ id: choose(), source: (troubles[0].source + 9 + Math.floor(troubleRnd() * 7)) % SECTORS });
  if (twist in OBSTACLES && troubles.length && n < OBSTACLES[twist as ObstacleId].debut + 10) twist = 'none';
  const afterHard = seedPrefix === 'PP' && n > 1 && (difficultyOf(n - 1) === 'hard' || difficultyOf(n - 1) === 'super');
  const budget = difficulty === 'super' ? 5 : difficulty === 'hard' ? 4 : (n <= 30 ? 2 : 3) - Number(afterHard);
  if (!o.remix && (twistPressure[twist] ?? 0) + troubles.length * 2 + (troubles.length && n >= 25 ? 1 : 0) > budget) twist = 'none';
  const start = startFor(twist, rnd);
  if (seedPrefix === 'PP' && [14, 16, 18, 28, 36].includes(n)) {
    const lesson = start.sectors[11];
    lesson.land = 1;
    lesson.water = 0;
    lesson.life = [14, 16, 18].includes(n) ? 2 : 1;
    lesson.heat = n === 28 ? 2 : n === 36 ? 1 : 0;
  }
  if (!o.remix && (n === 8 || n === 26)) {
    start.sectors[12].water = 3;
    start.sectors[12].heat = -2;
  }
  if (!o.remix && n === 26) start.sectors[18].life = 1;
  settle(start); // creatures that already fit the starting planet are there from the start
  const spin = (twist === 'fast' ? 0.9 : 0.35 + Math.min(0.3, n * 0.012)) * (rnd() < 0.5 ? 1 : -1);
  const name = `${NAMES_A[Math.floor(rnd() * NAMES_A.length)]} ${NAMES_B[Math.floor(rnd() * NAMES_B.length)]}`;
  const hue = difficulty === 'super' ? 285 : difficulty === 'hard' ? 15 : 200 + Math.floor(rnd() * 110);
  let sky = skyFor(n, twist, randomSeed, difficulty);
  if (o.remix) sky = { ...sky, obstacle: null, gusty: false };
  sky.ringDirection = spin > 0 ? -1 : 1;
  for (let attempt = 1; attempt <= 32 && skyWall({ sky, size: twist === 'tiny' ? 0.72 : 1, spin, twist }); attempt++) {
    sky = skyFor(n, twist, `${randomSeed}-sky-${attempt}`, difficulty);
    sky.ringDirection = spin > 0 ? -1 : 1;
  }
  return {
    n,
    seed,
    randomSeed,
    throws,
    queue,
    twist,
    sky,
    spin,
    size: twist === 'tiny' ? 0.72 : 1,
    start,
    name,
    hue,
    difficulty,
    troubles,
    ...(shortKind ? { shortKind } : {}),
  };
}

/** Share the generator's first draw with the Star Map's cheap twist preview. */
function chooseRemixTwist(n: number, kindCount: number, rnd: () => number): Twist {
  const slot = ((n - 1) % 10) + 1;
  if (slot === 10) return 'boss';
  const pool: Twist[] = slot <= 4 ? ['hot', 'frozen', 'ocean', 'tiny', 'short'] : ['wind', 'wobble', 'twin', 'moon', 'fast', 'short'];
  // A short deal must still have at least three unlocked kinds to play with.
  let twist: Twist;
  do twist = pool[Math.floor(rnd() * pool.length)];
  while (twist === 'short' && kindCount < 4);
  return twist;
}

export function remixTwist(n: number): Twist {
  return chooseRemixTwist(n, availableKinds(n).length, rngFrom(`RX-${n}`));
}

export type LevelMeta = Pick<LevelDef, 'name' | 'hue' | 'twist' | 'difficulty'> & { boss: boolean; obstacle: ObstacleId | null };

/** Preview metadata without running either solver. */
export function levelMeta(n: number, seedPrefix = 'PP'): LevelMeta {
  const profile = generationProfile(n, seedPrefix, {});
  const salt = seedPrefix === 'PP' ? (profile === 'reviewed-v1' ? LEVEL_SALT[n] : RAW_LEVEL_SALT[n]) : undefined;
  const key = JSON.stringify([n, seedPrefix, profile, false, false, false, salt ?? null, rulesForLevel(n), undefined]);
  const cached = levelCache.get(key);
  if (cached)
    return {
      name: cached.name,
      hue: cached.hue,
      twist: cached.twist,
      difficulty: cached.difficulty,
      boss: cached.twist === 'boss',
      obstacle: cached.sky.obstacle,
    };
  let layout = levelLayout(n, seedPrefix, { profile, salt });
  for (let attempt = 1; attempt <= 32 && (pressureOf({ ...layout, goals: [] }) > budgetFor(layout) || skyWall(layout)); attempt++)
    layout = levelLayout(n, seedPrefix, { profile, salt: (salt ?? 0) + attempt });
  const { name, hue, twist, difficulty, sky } = layout;
  return { name, hue, twist, difficulty, boss: twist === 'boss', obstacle: sky.obstacle };
}

const LEVEL_CACHE_LIMIT = 256;
const levelCache = new Map<string, LevelDef>();

function copyLevel(level: LevelDef): LevelDef {
  return {
    ...level,
    queue: [...level.queue],
    sky: {
      ...level.sky,
      rockPhase: [...level.sky.rockPhase],
      rockRows: [...level.sky.rockRows],
      rockDirection: [...level.sky.rockDirection],
      rockAngle: [...level.sky.rockAngle],
      rockSpeed: [...level.sky.rockSpeed],
    },
    start: clonePlanet(level.start),
    stars: [...level.stars],
    goals: level.goals.map((goal) => ({ ...goal })),
    troubles: level.troubles.map((trouble) => ({ ...trouble })),
  };
}

/** `o.goals` / `o.boss` give non-campaign planets (the weekly Voyage) goals and a Comet Guardian. */
export function makeLevel(n: number, seedPrefix = 'PP', o: LevelOptions = {}): LevelDef {
  const profile = generationProfile(n, seedPrefix, o);
  const defaultSalt = seedPrefix === 'PP' ? (profile === 'reviewed-v1' ? LEVEL_SALT[n] : RAW_LEVEL_SALT[n]) : undefined;
  const encodedRawSalt = profile === 'raw-v2' && o.salt !== undefined && o.salt >= RAW_SALT_OFFSET;
  const normalizedSalt = effectiveSalt(o.salt ?? defaultSalt, profile);
  const preselectedSalt =
    profile === 'raw-v2' && seedPrefix === 'PP' && normalizedSalt !== undefined && !encodedRawSalt
      ? RAW_SELECTED_SALT[n]?.[normalizedSalt]
      : undefined;
  const salt =
    profile === 'raw-v2' && seedPrefix === 'PP' && normalizedSalt !== undefined ? (preselectedSalt ?? normalizedSalt) : normalizedSalt;
  const options = { ...o, profile, salt };
  const key = JSON.stringify([
    n,
    seedPrefix,
    profile,
    !!o.goals,
    !!o.boss,
    !!o.remix,
    salt ?? null,
    o.rules ?? rulesForLevel(n),
    o.obstacleCap,
  ]);
  const cached = levelCache.get(key);
  if (cached) return copyLevel(cached);
  let { level, blind } = buildLevel(n, seedPrefix, options);
  const valid = (candidate: LevelDef, blindResult: Planet) => {
    if (pressureOf(candidate) > budgetFor(candidate) || skyWall(candidate)) return false;
    if (
      profile === 'raw-v2' &&
      n <= 60 &&
      preselectedSalt === undefined &&
      !encodedRawSalt &&
      (seedPrefix === 'PP' || candidate.goals.length > 0)
    ) {
      if (starsEarned(blindResult, lifeScore(blindResult), candidate) < 1) return false;
    }
    return true;
  };
  let isValid = valid(level, blind);
  for (let attempt = 1; attempt <= 32 && !isValid; attempt++) {
    ({ level, blind } = buildLevel(n, seedPrefix, { ...options, salt: (salt ?? 0) + attempt }));
    isValid = valid(level, blind);
  }
  if (!isValid) throw new Error(`No feasible layout for planet ${n}`);
  if (levelCache.size >= LEVEL_CACHE_LIMIT) levelCache.delete(levelCache.keys().next().value!);
  levelCache.set(key, level);
  return copyLevel(level);
}

function buildLevel(n: number, seedPrefix: string, o: LevelOptions): { level: LevelDef; blind: Planet } {
  const layout = levelLayout(n, seedPrefix, o);
  const { seed, randomSeed, throws, queue, twist, sky, spin, size, start, name, hue, difficulty, troubles } = layout;
  const raw = o.profile === 'raw-v2';
  const nova = o.remix ? n >= 9 : seedPrefix !== 'PP' || n >= 9;
  const rules = o.rules ?? rulesForSeed(seed);
  const plan = solve2({ ...layout, nova }, rules);
  const blind = solve0({ ...layout, nova }, rules);
  const best = lifeScore(plan);
  const base = lifeScore(start);
  // Star targets as a share of the greedy optimum: gentle for the first chapter,
  // then a sawtooth inside every chapter (easier after a chest, harder near the end).
  const progress = Math.max(0, Math.min(1, (n - 1) / (TUNE.rampLevels - 1)));
  const ease = progress * progress * (3 - 2 * progress);
  const saw = seedPrefix === 'PP' || o.remix ? ((n - 1) % 10) / 9 : 0.5;
  const bump = TUNE.bump[difficulty];
  const breather = seedPrefix === 'PP' && n > 1 && (difficultyOf(n - 1) === 'hard' || difficultyOf(n - 1) === 'super') ? 0.02 : 0;
  const obstacleLesson = seedPrefix === 'PP' && [33, 41, 46, 51, 57].includes(n);
  const teachingFloor = n === 41 ? 0.35 : n === 46 ? 0.25 : n === 57 ? 0.3 : obstacleLesson ? 0.2 : 0;
  const chapterOneStar =
    seedPrefix === 'PP' && !obstacleLesson
      ? n >= 46
        ? 0.04
        : n >= 31
          ? 0.02
          : n >= 11 && n <= 20
            ? difficulty === 'normal'
              ? 0.08
              : 0.04
            : 0
      : 0;
  const [rawOne, rawThree] = raw ? rawTargetOffsets(n, difficulty) : [0, 0];
  const f1 = TUNE.f1[0] + TUNE.f1[1] * ease + TUNE.saw * saw + bump[0] + chapterOneStar - breather - teachingFloor + rawOne;
  const f2 = TUNE.f2[0] + TUNE.f2[1] * ease + TUNE.saw * 0.7 * saw + bump[1] - breather - (obstacleLesson ? 0.08 : 0);
  // The middle chapter needs a small lift to keep sharp clears inside its ceiling.
  const f3 = Math.min(
    0.97,
    TUNE.f3[0] +
      TUNE.f3[1] * ease +
      bump[2] -
      (seedPrefix === 'PP' && n >= 21 ? 0.02 : 0) -
      breather -
      (obstacleLesson ? 0.05 : 0) +
      rawThree,
  );
  const t = (f: number) => Math.max(base + 5, Math.round((base + (best - base) * f) / 5) * 5);
  // Remix's twist and required goal carry the challenge; its score bars use
  // the classic shares on this seed, without campaign obstacle lesson relief.
  const remixF1 = f2;
  const remixF2 = (f2 + f3) / 2;
  const remixF3 = f3;
  const stars: [number, number, number] = o.remix
    ? [t(remixF1), t(remixF2), t(remixF3)]
    : [Math.min(t(f1), Math.floor(lifeScore(blind) / 5) * 5), t(f2), t(f3)];
  if (seedPrefix === 'PP' && n === 15) stars[0] += 25;
  if (seedPrefix === 'PP' && n === 20) stars[0] += 35;
  if (seedPrefix === 'PP' && n === 23) stars[0] += 15;
  if (seedPrefix === 'PP' && n === 10) stars[0] += 30;
  if (seedPrefix === 'PP' && n === 11) stars[0] += 10;
  if (seedPrefix === 'PP' && n === 14) stars[0] += 35;
  if (seedPrefix === 'PP' && n === 18) stars[0] += 20;
  if (seedPrefix === 'PP' && n === 24) stars[0] += 20;
  if (seedPrefix === 'PP' && n === 28) stars[0] -= 20;
  if (seedPrefix === 'PP' && n === 25) stars[0] += 40;
  if (seedPrefix === 'PP' && n === 34) stars[0] += 10;
  if (seedPrefix === 'PP' && n === 35) stars[0] += 10;
  if (seedPrefix === 'PP' && n === 39) stars[0] += 20;
  if (seedPrefix === 'PP' && n === 49) stars[0] += 30;
  if (seedPrefix === 'PP' && (n === 55 || n === 60)) stars[0] += 5;
  // Keep three stars readable for casual play after the midgame ramp without
  // changing the one-star floor or the number of throws.
  if (seedPrefix === 'PP' && difficulty === 'normal' && n >= 31 && n <= 60) stars[2] -= n <= 45 ? 10 : 5;
  if (seedPrefix === 'PP' && difficulty === 'normal' && n >= 11 && n <= 20) stars[2] -= 5;
  if (seedPrefix === 'PP' && n === 9) stars[2] += 20;
  if (seedPrefix === 'PP' && n === 3) stars[2] -= 10;
  if (seedPrefix === 'PP' && n === 6) stars[2] += 15;
  if (seedPrefix === 'PP' && n === 7) stars[2] += 5;
  if (seedPrefix === 'PP' && n === 12) stars[2] += 25;
  if (seedPrefix === 'PP' && n === 13) stars[2] += 20;
  if (seedPrefix === 'PP' && n === 16) stars[0] += 10;
  if (seedPrefix === 'PP' && n === 18) stars[0] += 5;
  if (seedPrefix === 'PP' && n === 10) stars[2] += 10;
  if (seedPrefix === 'PP' && n === 14) stars[2] += 15;
  if (seedPrefix === 'PP' && n === 18) stars[2] += 10;
  if (seedPrefix === 'PP' && (n === 13 || n === 17)) stars[2] -= 5;
  if (seedPrefix === 'PP' && n === 23) stars[2] -= 10;
  if (seedPrefix === 'PP' && n === 24) stars[2] -= 5;
  if (seedPrefix === 'PP' && n === 28) stars[2] -= 15;
  if (o.remix) {
    stars[2] = Math.min(stars[2], best);
    stars[1] = Math.min(stars[1], stars[2] - 5);
    stars[0] = Math.min(stars[0], stars[1] - 5);
  } else {
    if (stars[1] <= stars[0]) stars[1] = stars[0] + 5;
    if (stars[2] <= stars[1]) stars[2] = stars[1] + 5;
  }
  const goals = o.remix
    ? remixGoal(start, plan, rngFrom(`${randomSeed}-goals`))
    : seedPrefix === 'PP' || o.goals
      ? pickGoals(n, difficulty, start, plan, blind, rngFrom(`${randomSeed}-goals`), o.profile)
      : [];
  // The first goal is one Highland, supported by Rock Pebble in the opening deal.
  if (seedPrefix === 'PP' && n === 6) goals.splice(0, goals.length, { type: 'biome', id: 'highland', count: 1 });
  if (seedPrefix === 'PP' && n === 7) goals.splice(0, goals.length, { type: 'biome', id: 'ocean', count: 1 });
  if (seedPrefix === 'PP' && n === 12) goals.splice(0, goals.length, { type: 'biome', id: 'highland', count: 1 });
  // The Vent lesson asks for one more ocean sector than the start; both solvers
  // make several, so this stays a readable goal without trapping careful play.
  if (seedPrefix === 'PP' && n === 14) goals.splice(0, goals.length, { type: 'biome', id: 'ocean', count: 3 });
  if ([16, 18, 33, 41, 46, 51, 57].includes(n) && seedPrefix === 'PP') goals.length = 0;
  return {
    level: {
      n,
      seed,
      throws,
      queue,
      twist,
      sky,
      spin,
      size,
      stars,
      start,
      name,
      hue,
      difficulty,
      nova,
      goals,
      troubles,
      ...(layout.shortKind ? { shortKind: layout.shortKind } : {}),
    },
    blind,
  };
}

const REMIX_GOAL_SHARE = 1; // The campaign-scale gate needs the full planned goal count in early chapters.
/** A single goal from the actual Remix solver result, including early planets. */
function remixGoal(start: Planet, plan: Planet, rnd: () => number): Goal[] {
  const counts = [...new Set(plan.sectors.map((sector) => sector.biome))]
    .filter((id) => id !== 'barren')
    .map((id) => ({
      id,
      have: plan.sectors.filter((sector) => sector.biome === id).length,
      from: start.sectors.filter((sector) => sector.biome === id).length,
    }))
    .filter((row) => row.have > row.from);
  const candidates = counts.length
    ? counts
    : [...new Set(plan.sectors.map((sector) => sector.biome))]
        .filter((id) => id !== 'barren')
        .map((id) => ({ id, have: plan.sectors.filter((sector) => sector.biome === id).length, from: 0 }));
  const pick = candidates[Math.floor(rnd() * candidates.length)];
  return [
    {
      type: 'biome',
      id: pick?.id ?? 'barren',
      count: Math.max(1, Math.min(pick?.have ?? 1, Math.max((pick?.from ?? 0) + 1, Math.round((pick?.have ?? 1) * REMIX_GOAL_SHARE)))),
    },
  ];
}

export function starsFor(score: number, stars: [number, number, number]): number {
  return score >= stars[2] ? 3 : score >= stars[1] ? 2 : score >= stars[0] ? 1 : 0;
}

export type { Sector };

const twistPressure: Partial<Record<Twist, number>> = {
  fast: 1,
  tiny: 1,
  moon: 1,
  wind: 1,
  wobble: 2,
  twin: 2,
  hot: 1,
  frozen: 1,
  ocean: 1,
  boss: 1,
  rocks: 1,
  bubble: 1,
  mist: 1,
  ring: 2,
  tug: 2,
};
export function pressureOf(level: Pick<LevelDef, 'sky' | 'twist' | 'troubles' | 'goals'>): number {
  return (level.sky.gusty ? 2 : (twistPressure[level.twist] ?? 0)) + level.troubles.length * 2 + Math.max(0, level.goals.length - 1);
}
export function budgetFor(level: Pick<LevelDef, 'seed' | 'n' | 'difficulty' | 'sky'>): number {
  if (level.seed.startsWith('PP-') && [16, 18].includes(level.n)) return 2;
  if ([33, 41, 46, 51, 57].includes(level.n) && level.sky.obstacle) return OBSTACLES[level.sky.obstacle].pressure;
  if (level.difficulty === 'super') return 5;
  if (level.difficulty === 'hard') return 4;
  const normal = level.n <= 30 ? 2 : 3;
  return level.seed.startsWith('PP-') && level.n > 1 && (difficultyOf(level.n - 1) === 'hard' || difficultyOf(level.n - 1) === 'super')
    ? normal - 1
    : normal;
}

/** A sky is a wall only if too many direct aims fail for all sampled release times. */
export function skyWall(level: Pick<LevelDef, 'sky' | 'size' | 'spin' | 'twist'>): boolean {
  if (!level.sky.obstacle) return false;
  const geo = sceneGeometry(390, 844, level.size);
  const surface = Array(SECTORS).fill(geo.R);
  const world = {
    ...geo,
    radius: geo.R,
    surface,
    rotation: 0,
    spin: level.spin,
    twist: level.twist,
    wind: level.spin > 0 ? 170 : -170,
    sky: level.sky,
  };
  let blocked = 0;
  for (let sector = 0; sector < SECTORS; sector++) {
    let clear = false;
    const angle = ((sector + 0.5) / SECTORS) * Math.PI * 2;
    const target = { x: geo.cx + Math.cos(angle) * geo.R, y: geo.cy + Math.sin(angle) * geo.R };
    const dx = target.x - geo.launch.x;
    const dy = target.y - geo.launch.y;
    const len = Math.hypot(dx, dy);
    const launch = { ...geo.launch, vx: (dx / len) * 700, vy: (dy / len) * 700, elapsed: 0 };
    if (flyFull(STAR_SLING, launch, { ...world, sky: undefined }, 0).hit?.kind !== 'land') continue;
    for (let t = 0; t <= 3; t += 0.5) {
      const result = flyFull(STAR_SLING, launch, world, t);
      if (result.hit?.kind !== 'bonk' && result.hit?.kind !== 'fizzle') {
        clear = true;
        break;
      }
    }
    if (!clear && ++blocked > 4) return true;
  }
  return false;
}
