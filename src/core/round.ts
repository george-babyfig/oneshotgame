import { BIOMES, clonePlanet, impact, labBonus, lifeScore, novaCharge, settle, type Kind, type Planet } from './world';
import { NO_MODIFIERS, type RoundModifiers } from './modifiers';
import { SECTORS, SPECIES_BY_ID, type BiomeId } from './world';
import type { LevelDef } from './levels';

export const NOVA_CHARGE = 12;
export const LATER_NOVA_CHARGE = 18;
const ROUND_SAVE_VERSION = 1;

export interface RoundRules {
  version: number;
  reactions: readonly unknown[];
  troubles: readonly unknown[];
}

export const ROUND_RULES_V0: RoundRules = { version: 0, reactions: [], troubles: [] };

export interface RoundState {
  planet: Planet;
  charge: number; // compatibility mirror for the scene
  bonus: number;
  regionBests: number[];
  arrived: string[];
  novaEnabled: boolean;
  nova: { charge: number; threshold: number; fired: number; held: boolean };
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
  reactions: unknown[];
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
    queueIndex: 0,
    score: lifeScore(planet),
    continuesUsed: 0,
    goalsProgress: [],
  };
}

export function novaReady(state: RoundState): boolean {
  return state.novaEnabled && !state.nova.held && state.nova.charge >= state.nova.threshold;
}

export function stepRound(
  state: RoundState,
  action: RoundAction,
  mods: RoundModifiers = NO_MODIFIERS,
  _rules: RoundRules = ROUND_RULES_V0,
): StepResult {
  const planet = clonePlanet(state.planet);
  const priorSpecies = state.planet.sectors.map((s) => s.species);
  const priorBiomes = state.planet.sectors.map((s) => s.biome);
  const priorPresent = new Set(priorSpecies.filter((id): id is string => !!id));
  const meter = state.nova ?? { charge: state.charge, threshold: NOVA_CHARGE, fired: 0, held: false };
  const nova = state.novaEnabled && meter.charge >= meter.threshold && (action.nova ?? !meter.held);
  const result = impact(planet, action.kind, action.sector, mods.splash, { nova });
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
  // Fusion and Trouble hooks are zero until those rules arrive.
  const gain =
    state.novaEnabled && !nova && betterThrow ? novaCharge(changedBetter.length, firstArrivals.length) * (mods.shower ? 2 : 1) : 0;
  const threshold = nova ? LATER_NOVA_CHARGE : meter.threshold;
  const charge = state.novaEnabled ? (nova ? 0 : Math.min(threshold, meter.charge + gain)) : 0;
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
    novaCharge: nova ? 0 : charge - meter.charge,
    novaGain: gain,
    novaFired: nova,
    reactions: [],
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
    if (!saved || typeof saved !== 'object' || !('version' in saved) || saved.version !== ROUND_SAVE_VERSION || !('state' in saved))
      return null;
    const state = saved.state as RoundState;
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
      !Number.isFinite(state.bonus)
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
