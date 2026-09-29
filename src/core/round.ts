import { BIOMES, clonePlanet, impact, labBonus, novaCharge, type Kind, type Planet } from './world';
import { NO_MODIFIERS, type RoundModifiers } from './modifiers';

export const NOVA_CHARGE = 10;

export interface RoundRules {
  version: number;
  reactions: readonly unknown[];
  troubles: readonly unknown[];
}

export const ROUND_RULES_V0: RoundRules = { version: 0, reactions: [], troubles: [] };

export interface RoundState {
  planet: Planet;
  charge: number;
  bonus: number;
  regionBests: number[];
  arrived: string[];
  novaEnabled: boolean;
}

export interface RoundAction {
  kind: Kind;
  sector: number;
  nova?: boolean;
}

export interface StepResult {
  state: RoundState;
  before: number;
  after: number;
  changed: number[];
  spawned: { id: string; at: number }[];
  lost: { id: string; at: number }[];
  firstArrivals: string[];
  newRegionBests: number[];
  labBonus: number;
  novaCharge: number;
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
  };
}

export function stepRound(
  state: RoundState,
  action: RoundAction,
  mods: RoundModifiers = NO_MODIFIERS,
  _rules: RoundRules = ROUND_RULES_V0,
): StepResult {
  const planet = clonePlanet(state.planet);
  const priorSpecies = state.planet.sectors.map((s) => s.species);
  const nova = state.novaEnabled && (action.nova ?? state.charge >= NOVA_CHARGE);
  const result = impact(planet, action.kind, action.sector, mods.splash, { nova });
  const lost = result.lost.map((id) => ({ id, at: priorSpecies.indexOf(id) }));
  const regionBests = [...state.regionBests];
  const newRegionBests = result.changed.filter((i) => BIOMES[planet.sectors[i].biome].value > (regionBests[i] ?? 0));
  planet.sectors.forEach((sector, i) => {
    regionBests[i] = Math.max(regionBests[i] ?? 0, BIOMES[sector.biome].value);
  });
  const arrived = new Set(state.arrived);
  const firstArrivals: string[] = [];
  for (const species of result.spawned) {
    if (!arrived.has(species.id)) firstArrivals.push(species.id);
    arrived.add(species.id);
  }
  const level = mods.lab[action.kind] ?? 1;
  const bonus = result.after < result.before ? 0 : labBonus(level, newRegionBests.length, firstArrivals.length);
  const charge = nova
    ? 0
    : state.novaEnabled
      ? Math.min(NOVA_CHARGE, state.charge + novaCharge(result.changed.length, result.spawned.length, level) * (mods.shower ? 2 : 1))
      : state.charge;
  return {
    state: {
      planet,
      charge,
      bonus: state.bonus + bonus,
      regionBests,
      arrived: [...arrived],
      novaEnabled: state.novaEnabled,
    },
    before: result.before,
    after: result.after,
    changed: result.changed,
    spawned: result.spawned,
    lost,
    firstArrivals,
    newRegionBests,
    labBonus: bonus,
    novaCharge: nova ? 0 : charge - state.charge,
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
