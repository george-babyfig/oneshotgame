import { SECTORS, clonePlanet, settle, wrap, type Planet } from './world';
import { traitOf, type TraitId } from './world';
import type { RoundState } from './round';
import type { RoundModifiers } from './modifiers';

export type TroubleId = 'vent' | 'vine' | 'frost';
export const TROUBLES: Record<
  TroubleId,
  { name: 'Ember Vent' | 'Tanglevine' | 'Frost Creep'; rule: string; counter: string; debut: 14 | 28 | 36; pressure: 2; icon: string }
> = {
  vent: {
    name: 'Ember Vent',
    rule: 'Dries nearby green land.',
    counter: 'Ice Comet or Rain Cloud cools it.',
    debut: 14,
    pressure: 2,
    icon: '♨️',
  },
  vine: {
    name: 'Tanglevine',
    rule: 'Covers the next green land.',
    counter: 'Magma on the vine clears it.',
    debut: 28,
    pressure: 2,
    icon: '🌿',
  },
  frost: { name: 'Frost Creep', rule: 'Cools nearby land.', counter: 'Magma or Sunburst melts it.', debut: 36, pressure: 2, icon: '❄️' },
};
export interface TroubleState {
  id: TroubleId;
  source: number;
  settled: boolean;
  tangled?: number[];
  nextIn: number;
  every: 2 | 3;
  delayed?: boolean;
}
export interface TroubleEvent {
  id: TroubleId;
  kind: 'act' | 'blocked' | 'settled' | 'spread';
  sector: number;
  by?: 'water' | 'mountain' | 'strongRoots' | 'hot' | TraitId;
  species?: string;
}
export interface TroubleForecast {
  id: TroubleId;
  sector: number | null;
  inThrows: number;
  blockedBy?: TraitId | 'water' | 'mountain' | 'strongRoots' | 'hot';
}

export function firebreakBy(planet: Planet, sector: number, id: TroubleId): TroubleEvent['by'] | undefined {
  const s = planet.sectors[wrap(sector)];
  const trait = s.species ? traitOf(s.species) : null;
  if (id === 'vent') {
    if (s.water >= 2) return 'water';
    if (s.land >= 3) return 'mountain';
    if (trait === 'fireproof' || trait === 'swimmer') return trait;
  } else if (id === 'vine') {
    if (s.water >= 2) return 'water';
    if (s.life >= 3) return 'strongRoots';
    if (trait === 'weedproof' || trait === 'swimmer') return trait;
  } else {
    if (s.heat >= 2) return 'hot';
    if (trait === 'frostproof') return trait;
  }
  return undefined;
}
export function isFirebreak(planet: Planet, sector: number, id: TroubleId): boolean {
  return !!firebreakBy(planet, sector, id);
}

/** The same target picker drives the forecast and the round step. */
export function troubleTarget(planet: Planet, trouble: TroubleState): number | null {
  const source = wrap(trouble.source);
  if (trouble.id === 'vine') {
    const head = trouble.tangled?.at(-1) ?? source;
    for (let d = 1; d < SECTORS; d++) {
      const at = wrap(head + d);
      if (planet.sectors[at].water >= 2) return null;
      if (planet.sectors[at].life > 0 && !trouble.tangled?.includes(at)) return at;
    }
    return null;
  }
  for (const d of [1, -1, 2, -2]) {
    const at = wrap(source + d);
    const s = planet.sectors[at];
    if (trouble.id === 'vent' ? s.life > 0 : s.heat > -3) return at;
  }
  return null;
}

export function forecastTroubles(state: RoundState, mods: RoundModifiers): TroubleForecast[] {
  if (mods.gentle) return [];
  const planet = clonePlanet(state.planet);
  const troubles = (state.troubles ?? []).map((trouble) => ({ ...trouble, tangled: [...(trouble.tangled ?? [])] }));
  const out: TroubleForecast[] = [];
  let buddyUsed = !!state.buddyShieldUsed;
  let calmUsed = !!state.calmUsed;
  for (let turn = 1; turn <= 8 && out.length < 2; turn++) {
    for (const trouble of troubles) {
      if (trouble.settled) continue;
      if (--trouble.nextIn > 0) continue;
      const calmBuddy = mods.buddyShield === 'calm' && !buddyUsed;
      const calmResident = planet.sectors.some((s) => s.species && traitOf(s.species) === 'calm');
      if (!calmUsed && (calmBuddy || calmResident)) {
        calmUsed = true;
        if (calmBuddy) buddyUsed = true;
        trouble.delayed = true;
        trouble.nextIn = 1;
        continue;
      }
      trouble.nextIn = trouble.every;
      const sector = troubleTarget(planet, trouble);
      const blockedBy = sector === null ? undefined : firebreakBy(planet, sector, trouble.id);
      if (sector === null) {
        out.push({ id: trouble.id, sector, inThrows: turn });
        trouble.settled = true;
        continue;
      }
      const buddy = mods.buddyShield;
      const matched =
        buddy &&
        (trouble.id === 'vent'
          ? buddy === 'fireproof' || buddy === 'swimmer'
          : trouble.id === 'vine'
            ? buddy === 'weedproof' || buddy === 'swimmer'
            : buddy === 'frostproof');
      const forecastBlock = blockedBy ?? (!buddyUsed && matched ? buddy : undefined);
      out.push({ id: trouble.id, sector, inThrows: turn, ...(forecastBlock ? { blockedBy: forecastBlock } : {}) });
      if (blockedBy || (!buddyUsed && matched)) {
        if (!blockedBy && matched) buddyUsed = true;
        continue;
      }
      const s = planet.sectors[sector];
      if (trouble.id === 'vent') {
        s.life = Math.max(0, s.life - 1);
        s.heat = Math.min(3, s.heat + 1);
      } else if (trouble.id === 'frost') s.heat = Math.max(-3, s.heat - 1);
      else trouble.tangled.push(sector);
      settle(planet);
      for (const t of troubles)
        if (t.id === 'vine' && !t.settled)
          for (const at of t.tangled) {
            planet.sectors[at].biome = 'barren';
            planet.sectors[at].species = null;
          }
    }
  }
  return out.slice(0, 2);
}
