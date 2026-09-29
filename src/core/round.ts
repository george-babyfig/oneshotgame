import { BIOMES, biomeOf, clonePlanet, impact, labBonus, lifeScore, novaCharge, settle, wrap, type Kind, type Planet } from './world';
import { NO_MODIFIERS, type RoundMode, type RoundModifiers } from './modifiers';
import { SECTORS, SPECIES_BY_ID, type BiomeId } from './world';
import type { LevelDef } from './levels';

export const NOVA_CHARGE = 12;
export const LATER_NOVA_CHARGE = 18;
const ROUND_SAVE_VERSION = 2;

export type ReactionId = 'steam' | 'rainGarden' | 'wildflowers' | 'glacier' | 'scorch';

export const REACTIONS: Record<ReactionId, { kind: 'fusion' | 'clash'; name: string; pair: [Kind, Kind]; debut: number; icon: string }> = {
  steam: { kind: 'fusion', name: 'Steam', pair: ['ice', 'magma'], debut: 8, icon: '♨️' },
  rainGarden: { kind: 'fusion', name: 'Rain Garden', pair: ['seed', 'storm'], debut: 13, icon: '🌿' },
  wildflowers: { kind: 'fusion', name: 'Wildflowers', pair: ['seed', 'sun'], debut: 22, icon: '🌼' },
  glacier: { kind: 'fusion', name: 'Glacier', pair: ['rock', 'ice'], debut: 25, icon: '❄️' },
  scorch: { kind: 'clash', name: 'Dry Spell', pair: ['magma', 'sun'], debut: 32, icon: '🍂' },
};

export const REACTION_IDS = Object.keys(REACTIONS) as ReactionId[];

export interface RoundRules {
  version: number;
  reactions: ReactionId[];
  troubles: readonly unknown[];
  combo?: boolean;
}

export const ROUND_RULES_V0: RoundRules = { version: 2, reactions: [], troubles: [] };

/** Every mode teaches the same reactions at the same planet. */
export function rulesForLevel(n: number, _mode: RoundMode = 'campaign'): RoundRules {
  return { version: 2, reactions: REACTION_IDS.filter((id) => n >= REACTIONS[id].debut), troubles: [], combo: n >= 26 };
}

export interface RoundState {
  planet: Planet;
  charge: number; // compatibility mirror for the scene
  bonus: number;
  regionBests: number[];
  arrived: string[];
  novaEnabled: boolean;
  nova: { charge: number; threshold: number; fired: number; held: boolean };
  combo: { links: number; rest: boolean; best: number };
  comboCharge: number;
  queueIndex?: number;
  throwsLeft?: number;
  score?: number;
  continuesUsed?: number;
  goalsProgress?: number[];
  guardianHp?: number;
}

export interface RoundAction {
  kind: Kind;
  sector: number;
  nova?: boolean;
  guardianHit?: boolean;
  outcome?: 'bonk' | 'fizzle' | 'miss';
}

export interface StepResult {
  state: RoundState;
  before: number;
  after: number;
  changed: number[];
  changedBetter: number[];
  spawned: { id: string; at: number }[];
  lost: { species: string; sector: number }[];
  cameBack: { species: string; sector: number }[];
  firstArrivals: string[];
  newRegionBests: number[];
  labBonus: number;
  novaCharge: number;
  novaGain: number;
  novaFired: boolean;
  reactions: { id: ReactionId; at: number; partner: number; sectors: number[] }[];
  combo: { links: number; step: number; ended?: 'rest' | 'worse' | 'round'; superFusion?: boolean };
  troubleEvents: unknown[];
}

export function roundState(planet: Planet, novaEnabled = true): RoundState {
  return {
    planet: clonePlanet(planet),
    charge: 0,
    bonus: 0,
    regionBests: planet.sectors.map((s) => BIOMES[s.biome].value),
    arrived: planet.sectors.flatMap((s) => (s.species ? [s.species] : [])),
    novaEnabled,
    nova: { charge: 0, threshold: NOVA_CHARGE, fired: 0, held: false },
    combo: { links: 0, rest: false, best: 0 },
    comboCharge: 0,
    queueIndex: 0,
    score: lifeScore(planet),
    continuesUsed: 0,
    goalsProgress: [],
  };
}

export function novaReady(state: RoundState): boolean {
  return state.novaEnabled && !state.nova.held && state.nova.charge >= state.nova.threshold;
}

/** A held Supernova fires on the final throw. */
export function novaForThrow(state: RoundState): boolean {
  return state.novaEnabled && state.nova.charge >= state.nova.threshold && (!state.nova.held || state.throwsLeft === 1);
}

function reactionAt(planet: Planet, kind: Kind, sector: number, rules: RoundRules) {
  const at = wrap(sector);
  for (const id of REACTION_IDS) {
    if (!rules.reactions.includes(id)) continue;
    const lands: Partial<Record<Kind, BiomeId[]>> =
      id === 'steam'
        ? { magma: ['icesheet', 'tundra', 'taiga'], ice: ['volcano', 'desert'] }
        : id === 'rainGarden'
          ? { storm: ['meadow', 'forest'], seed: ['marsh', 'swamp'] }
          : id === 'wildflowers'
            ? { sun: ['meadow', 'forest'], seed: ['savanna', 'jungle'] }
            : id === 'glacier'
              ? { ice: ['mountain', 'highland'], rock: ['icesheet', 'tundra'] }
              : { sun: ['volcano', 'desert', 'savanna'], magma: ['jungle', 'savanna', 'forest'] };
    const wanted = lands[kind];
    if (!wanted) continue;
    for (const offset of [0, -1, 1]) {
      const partner = wrap(at + offset);
      if (wanted.includes(planet.sectors[partner].biome)) return { id, at, partner };
    }
  }
  return null;
}

function applyReaction(planet: Planet, id: ReactionId, at: number, extraReach: number): number[] {
  const radius = Math.min(4, (id === 'rainGarden' ? 3 : id === 'glacier' ? 1 : 2) + extraReach);
  const sectors: number[] = [];
  for (let distance = -radius; distance <= radius; distance++) {
    const index = wrap(at + distance);
    const s = planet.sectors[index];
    if (id === 'steam') {
      if (distance === 0) {
        s.land = Math.min(4, s.land);
        s.water = Math.min(5, Math.max(s.water, s.land + 1));
        s.heat = 2;
      } else {
        s.water = Math.min(5, s.water + 1);
        s.heat += s.heat > 0 ? -1 : s.heat < 0 ? 1 : 0;
      }
    } else if (id === 'rainGarden') {
      if (s.water > 0) s.life = Math.min(3, s.life + 1);
    } else if (id === 'wildflowers') {
      if (s.land > 0 || s.water > 0) s.life = Math.min(3, s.life + 1);
    } else if (id === 'glacier') {
      if (distance === 0) s.land = Math.min(5, s.land + 1);
      s.heat = Math.max(-3, s.heat - 2);
    } else if (distance !== 0) {
      s.life = Math.max(0, s.life - 1);
      s.heat = Math.min(3, s.heat + 1);
    }
    s.biome = biomeOf(s);
    sectors.push(index);
  }
  return sectors;
}

function comboBloom(planet: Planet, at: number): void {
  for (const offset of [-1, 0, 1]) {
    const sector = planet.sectors[wrap(at + offset)];
    if (sector.land > 0 || sector.water > 0) sector.life = Math.min(3, sector.life + 1);
  }
}

export function stepRound(
  state: RoundState,
  action: RoundAction,
  mods: RoundModifiers = NO_MODIFIERS,
  rules: RoundRules = ROUND_RULES_V0,
): StepResult {
  if (action.outcome) {
    const before = lifeScore(state.planet);
    const combo = state.combo ?? { links: 0, rest: false, best: 0 };
    return {
      state: {
        ...state,
        combo: { links: 0, rest: false, best: combo.best },
        queueIndex: state.queueIndex === undefined ? undefined : state.queueIndex + 1,
        throwsLeft: state.throwsLeft === undefined ? undefined : Math.max(0, state.throwsLeft - 1),
      },
      before,
      after: before,
      changed: [],
      changedBetter: [],
      spawned: [],
      lost: [],
      cameBack: [],
      firstArrivals: [],
      newRegionBests: [],
      labBonus: 0,
      novaCharge: 0,
      novaGain: 0,
      novaFired: false,
      reactions: [],
      combo: { links: 0, step: 0, ended: 'worse' },
      troubleEvents: [],
    };
  }
  const planet = clonePlanet(state.planet);
  const priorSpecies = state.planet.sectors.map((s) => s.species);
  const priorBiomes = state.planet.sectors.map((s) => s.biome);
  const priorPresent = new Set(priorSpecies.filter((id): id is string => !!id));
  const meter = state.nova ?? { charge: state.charge, threshold: NOVA_CHARGE, fired: 0, held: false };
  const nova = state.novaEnabled && meter.charge >= meter.threshold && (action.nova ?? !meter.held);
  const reaction = reactionAt(state.planet, action.kind, action.sector, rules);
  const oldCombo = state.combo ?? { links: 0, rest: false, best: 0 };
  const fusion = reaction !== null && REACTIONS[reaction.id].kind === 'fusion';
  const comboEnabled = rules.combo !== false;
  const linkCount = fusion && comboEnabled ? (nova ? 2 : 1) : 0;
  const reached = oldCombo.links + linkCount;
  const step = fusion && comboEnabled && reached >= 2 ? Math.min(4, reached) : 0;
  const extraReach = fusion && comboEnabled && oldCombo.links < 3 && reached >= 3 ? 1 : 0;
  let affected: number[] = [];
  const result = impact(planet, action.kind, action.sector, mods.splash, { nova }, (land) => {
    if (reaction) affected = applyReaction(land, reaction.id, reaction.at, extraReach);
    if (fusion && comboEnabled && reached >= 4) comboBloom(land, action.sector);
  });
  const lost = priorSpecies.flatMap((species, sector) =>
    species && planet.sectors[sector].species !== species ? [{ species, sector }] : [],
  );
  const changedBetter = result.changed.filter((i) => BIOMES[planet.sectors[i].biome].value > BIOMES[priorBiomes[i]].value);
  const regionBests = [...state.regionBests];
  const newRegionBests = result.changed.filter((i) => BIOMES[planet.sectors[i].biome].value > (regionBests[i] ?? 0));
  planet.sectors.forEach((sector, i) => {
    regionBests[i] = Math.max(regionBests[i] ?? 0, BIOMES[sector.biome].value);
  });
  const arrived = new Set(state.arrived);
  const firstArrivals: string[] = [];
  const cameBack: { species: string; sector: number }[] = [];
  for (const species of result.spawned) {
    if (!arrived.has(species.id)) firstArrivals.push(species.id);
    else if (!priorPresent.has(species.id)) cameBack.push({ species: species.id, sector: species.at });
    arrived.add(species.id);
  }
  const level = mods.lab[action.kind] ?? 1;
  const betterThrow = result.after >= result.before;
  const bonus = betterThrow ? labBonus(level, newRegionBests.length, firstArrivals.length) : 0;
  const comboEnds = !betterThrow || (reaction !== null && !fusion);
  let combo = { ...oldCombo };
  let comboResult: StepResult['combo'];
  let comboGain = 0;
  if (!comboEnabled) {
    combo = { links: 0, rest: false, best: oldCombo.best };
    comboResult = { links: 0, step: 0 };
  } else if (comboEnds) {
    combo = { links: 0, rest: false, best: oldCombo.best };
    comboResult = { links: 0, step: 0, ended: 'worse' };
  } else if (fusion) {
    combo = { links: reached, rest: false, best: Math.max(oldCombo.best, reached) };
    comboResult = { links: reached, step, ...(nova ? { superFusion: true } : {}) };
    const allowance = Math.max(0, 12 - (state.comboCharge ?? 0));
    const raw = (oldCombo.links < 2 && reached >= 2 ? 2 : 0) + (reached >= 4 ? 3 : 0);
    comboGain = Math.min(allowance, raw);
  } else if (oldCombo.links && !oldCombo.rest) {
    combo = { ...oldCombo, rest: true };
    comboResult = { links: oldCombo.links, step: 0 };
  } else {
    combo = { links: 0, rest: false, best: oldCombo.best };
    comboResult = { links: 0, step: 0, ...(oldCombo.links ? { ended: 'rest' as const } : {}) };
  }
  if (state.throwsLeft === 1 && combo.links) comboResult.ended = 'round';
  const gain =
    state.novaEnabled && !nova && betterThrow ? novaCharge(changedBetter.length, firstArrivals.length) * (mods.shower ? 2 : 1) : 0;
  const fusionGain = state.novaEnabled && fusion && betterThrow ? 3 : 0;
  const threshold = nova ? LATER_NOVA_CHARGE : meter.threshold;
  const charge = state.novaEnabled ? Math.min(threshold, (nova ? 0 : meter.charge + gain) + fusionGain + comboGain) : 0;
  const novaState = { charge, threshold, fired: meter.fired + Number(nova), held: nova ? false : meter.held };
  const totalBonus = state.bonus + bonus;
  const next: RoundState = {
    ...state,
    planet,
    charge,
    bonus: totalBonus,
    regionBests,
    arrived: [...arrived],
    nova: novaState,
    combo,
    comboCharge: (state.comboCharge ?? 0) + comboGain,
    queueIndex: state.queueIndex === undefined ? undefined : state.queueIndex + 1,
    throwsLeft: state.throwsLeft === undefined ? undefined : Math.max(0, state.throwsLeft - 1),
    score: lifeScore(planet) + totalBonus,
    guardianHp: state.guardianHp === undefined ? undefined : Math.max(0, state.guardianHp - (action.guardianHit ? (nova ? 2 : 1) : 0)),
  };
  return {
    state: next,
    before: result.before,
    after: result.after,
    changed: result.changed,
    changedBetter,
    spawned: result.spawned,
    lost,
    cameBack,
    firstArrivals,
    newRegionBests,
    labBonus: bonus,
    novaCharge: nova ? charge : charge - meter.charge,
    novaGain: gain + fusionGain + comboGain,
    novaFired: nova,
    reactions: reaction ? [{ ...reaction, sectors: affected }] : [],
    combo: comboResult,
    troubleEvents: [],
  };
}

/** A preview uses the same transition and leaves its source untouched. */
export function previewStep(
  state: RoundState,
  action: RoundAction,
  mods: RoundModifiers = NO_MODIFIERS,
  rules: RoundRules = ROUND_RULES_V0,
) {
  return stepRound(state, action, mods, rules);
}

export function serializeRound(state: RoundState): string {
  return JSON.stringify({ version: ROUND_SAVE_VERSION, state });
}

export function restoreRound(json: string): RoundState | null {
  try {
    const saved: unknown = JSON.parse(json);
    if (
      !saved ||
      typeof saved !== 'object' ||
      !('version' in saved) ||
      ![1, ROUND_SAVE_VERSION].includes(saved.version as number) ||
      !('state' in saved)
    )
      return null;
    const state = saved.state as RoundState;
    if (saved.version === 1) {
      state.combo = { links: 0, rest: false, best: 0 };
      state.comboCharge = 0;
    }
    if (
      !state ||
      !Array.isArray(state.planet?.sectors) ||
      state.planet.sectors.length !== SECTORS ||
      !Array.isArray(state.planet.speciesFound) ||
      !Array.isArray(state.regionBests) ||
      state.regionBests.length !== SECTORS ||
      !Array.isArray(state.arrived) ||
      !state.nova ||
      !Number.isFinite(state.nova.charge) ||
      ![NOVA_CHARGE, LATER_NOVA_CHARGE].includes(state.nova.threshold) ||
      !Number.isInteger(state.nova.fired) ||
      typeof state.nova.held !== 'boolean' ||
      state.charge !== state.nova.charge ||
      typeof state.novaEnabled !== 'boolean' ||
      !Number.isFinite(state.bonus) ||
      !state.combo ||
      !Number.isInteger(state.combo.links) ||
      !Number.isInteger(state.combo.best) ||
      typeof state.combo.rest !== 'boolean' ||
      !Number.isInteger(state.comboCharge) ||
      state.comboCharge < 0 ||
      state.comboCharge > 12
    )
      return null;
    return state;
  } catch {
    return null;
  }
}

export function starScopePreview(level: Pick<LevelDef, 'queue'>, state: RoundState, n = 5): Kind[] {
  return level.queue.slice(state.queueIndex ?? 0, (state.queueIndex ?? 0) + Math.max(0, n));
}

export function lifeSparkSectors(level: Pick<LevelDef, 'goals'>, planet: Planet): number[] {
  if (!level.goals.length) return [3, 11, 19];
  const wanted = new Set<BiomeId>();
  for (const goal of level.goals) {
    if (goal.type === 'biome') wanted.add(goal.id as BiomeId);
    else for (const biome of SPECIES_BY_ID[goal.id]?.home ?? []) wanted.add(biome);
  }
  const count = (p: Planet, id: string, type: 'biome' | 'species') =>
    p.sectors.filter((sector) => (type === 'biome' ? sector.biome : sector.species) === id).length;
  const working = clonePlanet(planet);
  const chosen: number[] = [];
  for (let step = 0; step < 3; step++) {
    let best = -Infinity;
    let pick = -1;
    for (let i = 0; i < SECTORS; i++) {
      if (chosen.includes(i)) continue;
      const trial = clonePlanet(working);
      trial.sectors[i].life = Math.min(3, trial.sectors[i].life + 1);
      settle(trial);
      const progress = level.goals.reduce((total, goal) => {
        const before = Math.min(goal.count, count(working, goal.id, goal.type));
        const after = Math.min(goal.count, count(trial, goal.id, goal.type));
        return total + (after - before);
      }, 0);
      const target = [...wanted].some((id) => id === working.sectors[i].biome || id === trial.sectors[i].biome);
      const value =
        progress * 1000 +
        (target ? 20 : 0) +
        (BIOMES[trial.sectors[i].biome].value - BIOMES[working.sectors[i].biome].value) * 5 -
        i * 0.001;
      if (value > best) {
        best = value;
        pick = i;
      }
    }
    if (pick < 0) break;
    chosen.push(pick);
    working.sectors[pick].life = Math.min(3, working.sectors[pick].life + 1);
    settle(working);
  }
  return chosen;
}
