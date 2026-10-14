import { SECTORS, clonePlanet, settle, wrap, type Planet } from './world';
import { traitOf, type TraitId } from './world';
import type { RoundState } from './round';
import type { RoundModifiers } from './modifiers';
import type { RoundAction, ReactionId } from './round';
import { PEBBLE_BEHAVIOUR } from './v2/pebble';
import type { RuleTroubleId } from './rulesets';
import type { GuardId } from './labperks';

export type TroubleId = 'vent' | 'vine' | 'frost' | 'pebble';
export const TROUBLES: Record<
  TroubleId,
  {
    name: 'Ember Vent' | 'Tanglevine' | 'Frost Creep' | 'Space Pebble';
    rule: string;
    counter: string;
    debut: 14 | 28 | 36 | 52;
    pressure: 2;
    icon: string;
  }
> = {
  pebble: {
    name: 'Space Pebble',
    rule: 'A pebble makes a little dent in the marked land.',
    counter: 'Catch it with your throw. Mountains stop pebbles.',
    debut: 52,
    pressure: 2,
    icon: '⬟',
  },
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
  target?: number;
  count?: number;
}
export interface TroubleEvent {
  id: TroubleId;
  kind: 'act' | 'blocked' | 'settled' | 'spread';
  sector: number;
  by?: 'water' | 'mountain' | 'strongRoots' | 'hot' | 'firewall' | 'labRoots' | TraitId;
  perk?: GuardId;
  clearedByThrow?: boolean;
  buddy?: boolean;
  species?: string;
}
export interface TroubleForecast {
  id: TroubleId;
  sector: number | null;
  inThrows: number;
  blockedBy?: TroubleEvent['by'];
}

export interface GuardContext {
  lab: Partial<Record<import('./world').Kind, number>>;
  marks?: RoundState['labMarks'];
}

export interface TroubleClearContext {
  state: RoundState;
  planet: Planet;
  trouble: TroubleState;
  action: RoundAction;
  reaction?: ReactionId;
  nova: boolean;
  distance: number;
  guard: GuardId | null;
  rainReach: number;
  landed: boolean;
  rinseVine?: boolean;
}
export interface TroubleBehaviour {
  clear: (ctx: TroubleClearContext) => boolean;
  perk: ((ctx: TroubleClearContext) => GuardId | undefined) | null;
  calm: boolean;
  buddy: readonly TraitId[];
  effect: (planet: Planet, trouble: TroubleState, at: number) => void;
  repaint: (planet: Planet, trouble: TroubleState) => void;
  firebreak: (planet: Planet, sector: number, guard?: GuardContext) => TroubleEvent['by'] | undefined;
  target: (planet: Planet, trouble: TroubleState) => number | null;
  forecast: boolean;
  forecastShape: string;
  forecastLabel?: string;
  counterIcons: string;
  helpLine: readonly [string, string];
  aimTag: string;
  actLine: string;
  settledLine: string;
  feel: string;
  sourceGlyph: string;
  sourceColor: string;
  actKind: 'act' | 'spread';
  settleOnClear: boolean;
}
function nearbyTarget(planet: Planet, trouble: TroubleState, wanted: (s: Planet['sectors'][number]) => boolean): number | null {
  for (const d of [1, -1, 2, -2]) {
    const at = wrap(trouble.source + d);
    if (wanted(planet.sectors[at])) return at;
  }
  return null;
}
const rinseVine = (c: TroubleClearContext): boolean =>
  (c.rinseVine ??=
    c.action.kind === 'storm' &&
    c.guard === 'rinse' &&
    (c.trouble.tangled ?? []).some((at) => {
      const d = Math.abs(wrap(c.action.sector) - wrap(at));
      return Math.min(d, SECTORS - d) <= c.rainReach;
    }));
export const TROUBLE_BEHAVIOUR: Record<RuleTroubleId, TroubleBehaviour> = {
  vent: {
    clear(c) {
      const a = c.action,
        d = c.distance,
        g = c.guard;
      return (
        (c.landed && a.kind === 'storm' && c.nova && d <= 3) ||
        (c.landed &&
          ((a.kind === 'ice' && d <= (g === 'ventCooler' ? 2 : 1)) || (a.kind === 'storm' && d <= 3) || (c.reaction === 'steam' && d <= 2)))
      );
    },
    perk(c) {
      const a = c.action,
        d = c.distance,
        g = c.guard;
      return a.kind === 'ice' && d === 2 && c.reaction !== 'steam' && g === 'ventCooler' ? g : undefined;
    },
    calm: true,
    buddy: ['fireproof', 'swimmer'],
    effect(planet, trouble, at) {
      const s = planet.sectors[at];
      s.life = Math.max(0, s.life - 1);
      s.heat = Math.min(3, s.heat + 1);
    },
    repaint(planet, trouble) {},
    firebreak(planet, sector, guard) {
      const s = planet.sectors[wrap(sector)];
      const trait = s.species ? traitOf(s.species) : null;
      if (s.water >= 2) return 'water';
      if (s.land >= 3) return 'mountain';
      if (
        (guard?.lab.rock ?? 1) >= 4 &&
        [-1, 1].some((d) => {
          const near = wrap(sector + d);
          return guard?.marks?.rock?.includes(near) && planet.sectors[near].land >= 3;
        })
      )
        return 'firewall';
      if (trait === 'fireproof' || trait === 'swimmer') return trait;

      return undefined;
    },
    target(planet, trouble) {
      return nearbyTarget(planet, trouble, (s) => s.life > 0);
    },
    forecast: true,
    forecastShape: '◆',
    counterIcons: '☄️ 🌧️',
    helpLine: ['{trouble} dried one sector · {counter}', '{trouble} dried {n} sectors · {counter}'],
    aimTag: '{name} reaches this land',
    actLine: 'Warm breeze from the vent',
    settledLine: 'Vent cooled!',
    feel: '#ffb587',
    sourceGlyph: '♨',
    sourceColor: '#ffad72',
    actKind: 'act',
    settleOnClear: false,
  },
  vine: {
    clear(c) {
      const a = c.action,
        d = c.distance,
        g = c.guard;
      return (
        (c.landed && a.kind === 'storm' && c.nova && d <= 3) ||
        (c.landed &&
          ((a.kind === 'magma' && (d <= (g === 'weedBurner' ? 2 : 1) || !!c.trouble.tangled?.includes(wrap(a.sector)))) || rinseVine(c)))
      );
    },
    perk(c) {
      const a = c.action,
        d = c.distance,
        g = c.guard;
      return a.kind === 'magma' && d === 2 && !c.trouble.tangled?.includes(wrap(a.sector)) && g === 'weedBurner'
        ? g
        : rinseVine(c) && !(c.nova && d <= 3)
          ? (g ?? undefined)
          : undefined;
    },
    calm: true,
    buddy: ['weedproof', 'swimmer'],
    effect(_planet, trouble, at) {
      trouble.tangled = [...(trouble.tangled ?? []), at];
    },
    repaint(planet, trouble) {
      for (const at of trouble.tangled ?? []) {
        planet.sectors[at].biome = 'barren';
        planet.sectors[at].species = null;
      }
    },
    firebreak(planet, sector, guard) {
      const s = planet.sectors[wrap(sector)];
      const trait = s.species ? traitOf(s.species) : null;
      if (s.water >= 2) return 'water';
      if (s.life >= 3) return 'strongRoots';
      if ((guard?.lab.seed ?? 1) >= 4 && guard?.marks?.seed?.includes(wrap(sector))) return 'labRoots';
      if (trait === 'weedproof' || trait === 'swimmer') return trait;

      return undefined;
    },
    target(planet, trouble) {
      const source = wrap(trouble.source);
      const head = trouble.tangled?.at(-1) ?? source;
      for (let d = 1; d < SECTORS; d++) {
        const at = wrap(head + d);
        if (planet.sectors[at].water >= 2) return null;
        if (planet.sectors[at].life > 0 && !trouble.tangled?.includes(at)) return at;
      }
      return null;
    },
    forecast: true,
    forecastShape: '▲',
    counterIcons: '🔥',
    helpLine: ['{trouble} reached one sector · {counter}', '{trouble} reached {n} sectors · {counter}'],
    aimTag: '{name} reaches this land',
    actLine: 'A vine reached this land',
    settledLine: '{name} settled!',
    feel: '#9ee68d',
    sourceGlyph: '✿',
    sourceColor: '#8bd773',
    actKind: 'spread',
    settleOnClear: true,
  },
  frost: {
    clear(c) {
      const a = c.action,
        d = c.distance,
        g = c.guard;
      return (
        (c.landed && a.kind === 'storm' && c.nova && d <= 3) ||
        (c.landed && ((a.kind === 'magma' && d <= 1) || (a.kind === 'sun' && d <= (g === 'frostMelter' ? 4 : 3))))
      );
    },
    perk(c) {
      const a = c.action,
        d = c.distance,
        g = c.guard;
      return a.kind === 'sun' && d === 4 && g === 'frostMelter' ? g : undefined;
    },
    calm: true,
    buddy: ['frostproof'],
    effect(planet, trouble, at) {
      const s = planet.sectors[at];
      s.heat = Math.max(-3, s.heat - 1);
    },
    repaint(planet, trouble) {},
    firebreak(planet, sector, guard) {
      const s = planet.sectors[wrap(sector)];
      const trait = s.species ? traitOf(s.species) : null;
      if (s.heat >= 2) return 'hot';
      if (trait === 'frostproof') return trait;

      return undefined;
    },
    target(planet, trouble) {
      return nearbyTarget(planet, trouble, (s) => s.heat > -3);
    },
    forecast: true,
    forecastShape: '●',
    counterIcons: '🔥 ☀️',
    helpLine: ['{trouble} cooled one sector · {counter}', '{trouble} cooled {n} sectors · {counter}'],
    aimTag: '{name} reaches this land',
    actLine: 'A cool breeze',
    settledLine: '{name} settled!',
    feel: '#b8e8ff',
    sourceGlyph: '❄',
    sourceColor: '#b8e7ff',
    actKind: 'act',
    settleOnClear: false,
  },
  pebble: PEBBLE_BEHAVIOUR,
};

export function firebreakBy(planet: Planet, sector: number, id: TroubleId, guard?: GuardContext): TroubleEvent['by'] | undefined {
  return TROUBLE_BEHAVIOUR[id].firebreak(planet, sector, guard);
}
export function isFirebreak(planet: Planet, sector: number, id: TroubleId): boolean {
  return !!firebreakBy(planet, sector, id);
}

/** The same target picker drives the forecast and the round step. */
export function troubleTarget(planet: Planet, trouble: TroubleState): number | null {
  return TROUBLE_BEHAVIOUR[trouble.id].target(planet, trouble);
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
      if (trouble.settled || !TROUBLE_BEHAVIOUR[trouble.id].forecast) continue;
      if (--trouble.nextIn > 0) continue;
      const calmBuddy = mods.buddyShield === 'calm' && !buddyUsed;
      const calmResident = planet.sectors.some((s) => s.species && traitOf(s.species) === 'calm');
      if (TROUBLE_BEHAVIOUR[trouble.id].calm && !calmUsed && (calmBuddy || calmResident)) {
        calmUsed = true;
        if (calmBuddy) buddyUsed = true;
        trouble.delayed = true;
        trouble.nextIn = 1;
        continue;
      }
      trouble.nextIn = trouble.every;
      const sector = troubleTarget(planet, trouble);
      const blockedBy = sector === null ? undefined : firebreakBy(planet, sector, trouble.id, { lab: mods.lab, marks: state.labMarks });
      if (sector === null) {
        out.push({ id: trouble.id, sector, inThrows: turn });
        trouble.settled = true;
        continue;
      }
      const buddy = mods.buddyShield;
      const matched = buddy && TROUBLE_BEHAVIOUR[trouble.id].buddy.includes(buddy);
      const forecastBlock = blockedBy ?? (!buddyUsed && matched ? buddy : undefined);
      out.push({ id: trouble.id, sector, inThrows: turn, ...(forecastBlock ? { blockedBy: forecastBlock } : {}) });
      if (blockedBy || (!buddyUsed && matched)) {
        if (!blockedBy && matched) buddyUsed = true;
        continue;
      }
      TROUBLE_BEHAVIOUR[trouble.id].effect(planet, trouble, sector);
      settle(planet);
      for (const t of troubles) if (!t.settled) TROUBLE_BEHAVIOUR[t.id].repaint(planet, t);
    }
  }
  return out.slice(0, 2);
}
