import { rulesPlay } from './rulesets';
import { BIOMES, KINDS, biomeOf, clonePlanet, impact, lifeScore, novaCharge, settle, wrap, type Kind, type Planet } from './world';
import { FORM_OF, GUARD_OF, labFusionReach, labGuard, labNovaReach, labPower, type LabEvent } from './labperks';
import { NO_MODIFIERS, type RoundMode, type RoundModifiers } from './modifiers';
import { SECTORS, SPECIES_BY_ID, type BiomeId } from './world';
import type { LevelDef } from './levels';
import { TROUBLE_BEHAVIOUR, firebreakBy, troubleTarget, type TroubleEvent, type TroubleId, type TroubleState } from './troubles';
import { traitOf } from './world';
import { RULES_VERSION, RULES_SUPPORTED, type RulesVersion } from './rules-version';
import { RULESETS, REACTION_DEBUT, TROUBLE_DEBUT, effectiveVersion, type RuleReactionId, type RuleTroubleId } from './rulesets';
import { V2_REACTIONS } from './v2/reactions';
import type { MoteDef, Pickup, ExtraThrowSource, RoundAssists } from '../meta/m15types';
import { applyMote } from './v2/motes';
import { launcherReach, skipperLosesPower } from './launchers';

export const NOVA_CHARGE = 12;
export const LATER_NOVA_CHARGE = 18;
const ROUND_SAVE_VERSION = 2;

export type ReactionId = 'steam' | 'rainGarden' | 'wildflowers' | 'glacier' | 'scorch' | 'firemount' | 'rainbow' | 'flood';

export interface ReactionDef {
  kind: 'fusion' | 'clash';
  name: string;
  pair: [Kind, Kind];
  debut: number;
  icon: string;
  priority: number;
  triggers: Partial<Record<Kind, readonly BiomeId[]>>;
  radius: number;
  charge: number;
  /** Returning false leaves this sector out of the affected footprint. */
  effect: (sector: Planet['sectors'][number], distance: number) => void | false;
  fieldGuide: string;
  extraThrow?: 'rainbow';
  /** Only unfinished package stubs are disabled. */
  enabled?: boolean;
}

export const REACTIONS: Record<ReactionId, ReactionDef> = {
  steam: {
    kind: 'fusion',
    name: 'Steam',
    pair: ['ice', 'magma'],
    debut: 8,
    icon: '♨️',
    priority: 0,
    triggers: { magma: ['icesheet', 'tundra', 'taiga'], ice: ['volcano', 'desert'] },
    radius: 2,
    charge: 3,
    fieldGuide: 'Magma finds icy land and makes Steam!',
    effect(s, distance) {
      if (distance === 0) {
        s.land = Math.min(4, s.land);
        s.water = Math.min(5, Math.max(s.water, s.land + 1));
        s.heat = 2;
      } else {
        s.water = Math.min(5, s.water + 1);
        s.heat += s.heat > 0 ? -1 : s.heat < 0 ? 1 : 0;
      }
    },
  },
  rainGarden: {
    kind: 'fusion',
    name: 'Rain Garden',
    pair: ['seed', 'storm'],
    debut: 13,
    icon: '🌿',
    priority: 1,
    triggers: { storm: ['meadow', 'forest'], seed: ['marsh', 'swamp'] },
    radius: 3,
    charge: 3,
    fieldGuide: 'Rain Cloud finds a meadow and grows a Rain Garden!',
    effect(s) {
      if (s.water > 0) s.life = Math.min(3, s.life + 1);
    },
  },
  wildflowers: {
    kind: 'fusion',
    name: 'Wildflowers',
    pair: ['seed', 'sun'],
    debut: 22,
    icon: '🌼',
    priority: 2,
    triggers: { sun: ['meadow', 'forest'], seed: ['savanna', 'jungle'] },
    radius: 2,
    charge: 3,
    fieldGuide: 'Sunburst finds a meadow and grows Wildflowers!',
    effect(s) {
      if (s.land > 0 || s.water > 0) s.life = Math.min(3, s.life + 1);
    },
  },
  glacier: {
    kind: 'fusion',
    name: 'Glacier',
    pair: ['rock', 'ice'],
    debut: 25,
    icon: '❄️',
    priority: 3,
    triggers: { ice: ['mountain', 'highland'], rock: ['icesheet', 'tundra'] },
    radius: 1,
    charge: 3,
    fieldGuide: 'Ice Comet finds a mountain and makes a Glacier!',
    effect(s, distance) {
      if (distance === 0) s.land = Math.min(5, s.land + 1);
      s.heat = Math.max(-3, s.heat - 2);
    },
  },
  scorch: {
    kind: 'clash',
    name: 'Dry Spell',
    pair: ['magma', 'sun'],
    debut: 32,
    icon: '🍂',
    priority: 6,
    triggers: { sun: ['volcano', 'desert', 'savanna'], magma: ['jungle', 'savanna', 'forest'] },
    radius: 2,
    charge: 0,
    fieldGuide: 'Magma or Sunburst on hot, dry land may cause Dry Spell. It hurts the planet. Watch the red outline!',
    effect(s, distance) {
      if (distance !== 0) {
        if (s.species && traitOf(s.species) === 'fireproof') return false;
        s.life = Math.max(0, s.life - 1);
        s.heat = Math.min(3, s.heat + 1);
      }
    },
  },
  ...V2_REACTIONS,
};

/** Historical launch inventory; executable evaluation uses explicit priority. */
export const REACTION_IDS: ReactionId[] = ['steam', 'rainGarden', 'wildflowers', 'glacier', 'scorch'];
export const REACTION_PRIORITY = (Object.keys(REACTIONS) as ReactionId[]).sort((a, b) => REACTIONS[a].priority - REACTIONS[b].priority);

export interface RoundRules {
  version: number;
  reactions: RuleReactionId[];
  troubles: RuleTroubleId[];
  combo?: boolean;
}

export const ROUND_RULES_V0: RoundRules = { version: 1, reactions: [], troubles: [] };

/** Every mode teaches the same reactions at the same planet. */
export function rulesForLevel(n: number, mode: RoundMode = 'campaign', taught = n, play: RulesVersion = rulesPlay()): RoundRules {
  const cap = mode === 'campaign' ? n : Math.min(n, taught);
  const version = effectiveVersion(n, mode, taught, play);
  const set = RULESETS[version];
  return {
    version,
    reactions: set.reactions.filter((id) => cap >= REACTION_DEBUT[id]),
    troubles: set.troubles[mode].filter((id) => cap >= TROUBLE_DEBUT[id]),
    combo: cap >= 26,
  };
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
  troubles: TroubleState[];
  buddyShieldUsed?: boolean;
  calmUsed?: boolean;
  labMarks?: { rock: number[]; seed: number[] };
  skipperBounces?: number;
  sparklerPlainUsed?: boolean;
  extraUsed?: boolean;
  extraSource?: ExtraThrowSource;
  extraAt?: number;
  wideNext?: number;
  bonusKind?: Kind;
  motesTaken?: number[];
  assists?: RoundAssists;
}

export interface RoundAction {
  kind: Kind;
  sector: number;
  nova?: boolean;
  guardianHit?: boolean;
  outcome?: 'bonk' | 'fizzle' | 'miss';
  /** Only a Skipper special rebound; ordinary Bubble Moon bounces do not count. */
  bounced?: boolean;
  /** Own-flight contacts only. Undefined means sector model; [] means physical flight touched nothing. */
  pickups?: (Pickup | MoteDef)[];
}

export interface StepResult {
  state: RoundState;
  extraThrow?: { source: ExtraThrowSource; kind: Kind };
  before: number;
  after: number;
  changed: number[];
  changedBetter: number[];
  spawned: { id: string; at: number }[];
  lost: { species: string; sector: number }[];
  cameBack: { species: string; sector: number }[];
  firstArrivals: string[];
  newRegionBests: number[];
  labEvents: LabEvent[];
  novaCharge: number;
  novaGain: number;
  novaFired: boolean;
  reactions: { id: ReactionId; at: number; partner: number; sectors: number[] }[];
  combo: { links: number; step: number; ended?: 'rest' | 'worse' | 'round'; superFusion?: boolean };
  troubleEvents: TroubleEvent[];
}

/** Immutable evidence for eligible round summaries; no scoring rule depends on it. */
export function eligibleStepEvidence(step: StepResult): {
  firstArrivals: string[];
  improvedSectors: Partial<Record<BiomeId, number>>;
  fusions: number;
  supernovas: number;
  settledTroubles: number;
  settledVent: number;
  settledVine: number;
  reactions: Partial<Record<ReactionId, number>>;
} {
  const improvedSectors: Partial<Record<BiomeId, number>> = {};
  for (const index of step.newRegionBests) {
    const biome = step.state.planet.sectors[index]?.biome;
    if (biome) improvedSectors[biome] = (improvedSectors[biome] ?? 0) + 1;
  }
  const reactions: Partial<Record<ReactionId, number>> = {};
  for (const reaction of step.reactions) reactions[reaction.id] = (reactions[reaction.id] ?? 0) + 1;
  return {
    firstArrivals: [...step.firstArrivals],
    improvedSectors,
    fusions: step.reactions.filter((reaction) => REACTIONS[reaction.id].kind === 'fusion').length,
    supernovas: Number(step.novaFired),
    settledTroubles: step.troubleEvents.filter((event) => event.kind === 'settled').length,
    settledVent: step.troubleEvents.filter((event) => event.kind === 'settled' && event.id === 'vent').length,
    settledVine: step.troubleEvents.filter((event) => event.kind === 'settled' && event.id === 'vine').length,
    reactions,
  };
}

export function roundState(
  planet: Planet,
  novaEnabled = true,
  troubles: { id: TroubleId; source: number }[] = [],
  hard = false,
): RoundState {
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
    troubles: troubles.map(({ id, source }) => {
      const trouble: TroubleState = {
        id,
        source,
        settled: false,
        nextIn: hard ? 2 : 3,
        every: hard ? 2 : 3,
        ...(TROUBLE_BEHAVIOUR[id].actKind === 'spread' ? { tangled: [] } : {}),
      };
      if (id === 'pebble') {
        trouble.count = 0;
        trouble.target = troubleTarget(planet, trouble) ?? wrap(source);
      }
      return trouble;
    }),
    buddyShieldUsed: false,
    calmUsed: false,
    labMarks: { rock: [], seed: [] },
  };
}

export function novaReady(state: RoundState): boolean {
  return state.novaEnabled && !state.nova.held && state.nova.charge >= state.nova.threshold;
}

/** A held Supernova fires on the final throw. */
export function novaForThrow(state: RoundState): boolean {
  return state.novaEnabled && state.nova.charge >= state.nova.threshold && (!state.nova.held || state.throwsLeft === 1);
}

function reactionAt(planet: Planet, kind: Kind, sector: number, rules: RoundRules, gentle = false) {
  const at = wrap(sector);
  for (const id of REACTION_PRIORITY) {
    if (REACTIONS[id].enabled === false || !rules.reactions.includes(id) || (gentle && REACTIONS[id].kind === 'clash')) continue;
    const wanted = REACTIONS[id].triggers[kind];
    if (!wanted) continue;
    for (const offset of [0, -1, 1]) {
      const partner = wrap(at + offset);
      if (wanted.includes(planet.sectors[partner].biome)) return { id, at, partner };
    }
  }
  return null;
}

function applyReaction(planet: Planet, id: ReactionId, at: number, extraReach: number, safeAfterRadius = 4): number[] {
  const baseRadius = REACTIONS[id].radius;
  const radius = Math.min(4, baseRadius + extraReach);
  const sectors: number[] = [];
  for (let distance = -radius; distance <= radius; distance++) {
    const index = wrap(at + distance);
    const s = planet.sectors[index];
    const beforeExtra = Math.abs(distance) > safeAfterRadius ? { ...s } : null;
    if (REACTIONS[id].effect(s, distance) === false) continue;
    if (beforeExtra && biomeOf(s) !== biomeOf(beforeExtra)) Object.assign(s, beforeExtra);
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

function ringDistance(a: number, b: number): number {
  const d = Math.abs(wrap(a) - wrap(b));
  return Math.min(d, SECTORS - d);
}

/** Impact and reaction settle first; sources clear, then the remaining clocks tick. */
function advanceTroubles(
  planet: Planet,
  previous: RoundState,
  action: RoundAction,
  reaction: ReactionId | undefined,
  nova: boolean,
  mods: RoundModifiers,
  landed = true,
): { troubles: TroubleState[]; events: TroubleEvent[]; buddyShieldUsed: boolean; calmUsed: boolean } {
  if (mods.gentle)
    return { troubles: previous.troubles ?? [], events: [], buddyShieldUsed: !!previous.buddyShieldUsed, calmUsed: !!previous.calmUsed };
  if (!(previous.troubles ?? []).some((trouble) => !trouble.settled))
    return { troubles: previous.troubles ?? [], events: [], buddyShieldUsed: !!previous.buddyShieldUsed, calmUsed: !!previous.calmUsed };
  const events: TroubleEvent[] = [];
  let buddyShieldUsed = !!previous.buddyShieldUsed;
  let calmUsed = !!previous.calmUsed;
  const troubles = (previous.troubles ?? []).map((old) => {
    const t = { ...old, tangled: old.tangled ? [...old.tangled] : undefined };
    if (t.settled) return t;
    const d = ringDistance(action.sector, t.source);
    const guard = labGuard(action.kind, mods.lab[action.kind] ?? 1);
    // Rinse follows the actual Rain Cloud footprint; Trouble source counters remain centred on the landing.
    const rainBaseReach = KINDS.storm.stats.reach + mods.splash + (previous.wideNext ?? 0) + (nova ? 1 : 0);
    const launcherRainReach = launcherReach(mods.launcher ?? NO_MODIFIERS.launcher, 'storm');
    const rainReach =
      launcherRainReach || previous.wideNext
        ? Math.min(4, rainBaseReach + launcherRainReach + (nova ? labNovaReach(mods.lab.storm ?? 1) : 0))
        : Math.max(rainBaseReach, Math.min(4, rainBaseReach + (nova ? labNovaReach(mods.lab.storm ?? 1) : 0)));
    const behaviour = TROUBLE_BEHAVIOUR[t.id];
    const context = { state: previous, planet, trouble: t, action, reaction, nova, distance: d, guard, rainReach, landed };
    const cleared = behaviour.clear(context);
    if (cleared) {
      t.settled = true;
      t.tangled = [];
      if (behaviour.settleOnClear) settle(planet);
      const perk = behaviour.perk?.(context);
      events.push({ id: t.id, kind: 'settled', sector: t.source, clearedByThrow: true, ...(perk ? { perk } : {}) });
      return t;
    }
    t.nextIn -= 1;
    if (t.nextIn > 0) return t;
    const calmBuddy = mods.buddyShield === 'calm' && !buddyShieldUsed;
    const calmResident = [previous.planet, planet].some((p) => p.sectors.some((s) => s.species && traitOf(s.species) === 'calm'));
    if (behaviour.calm && !calmUsed && (calmBuddy || calmResident)) {
      calmUsed = true;
      if (calmBuddy) buddyShieldUsed = true;
      t.delayed = true;
      t.nextIn = 1;
      if (calmBuddy) events.push({ id: t.id, kind: 'blocked', sector: t.source, by: 'calm', buddy: true });
      return t;
    }
    t.nextIn = t.every;
    const at = troubleTarget(planet, t);
    if (at === null) {
      t.settled = true;
      events.push({ id: t.id, kind: 'settled', sector: t.source });
      return t;
    }
    const by = firebreakBy(planet, at, t.id, { lab: mods.lab, marks: previous.labMarks });
    const buddy = mods.buddyShield;
    const matchesBuddy = buddy && behaviour.buddy.includes(buddy);
    // A built firebreak (including Life Spark's strong roots) takes this beat;
    // the Buddy remains ready for a later beat instead of stacking here.
    if (by || (!buddyShieldUsed && matchesBuddy)) {
      if (!by && matchesBuddy) buddyShieldUsed = true;
      events.push({ id: t.id, kind: 'blocked', sector: at, by: by ?? buddy!, ...(!by && matchesBuddy ? { buddy: true } : {}) });
      return t;
    }
    const s = planet.sectors[at];
    const species = s.species ?? undefined;
    behaviour.effect(planet, t, at);
    settle(planet);
    behaviour.repaint(planet, t);
    events.push({ id: t.id, kind: behaviour.actKind, sector: at, ...(species ? { species } : {}) });
    return t;
  });
  for (const t of troubles) if (!t.settled) TROUBLE_BEHAVIOUR[t.id].repaint(planet, t);
  planet.speciesFound = planet.sectors.flatMap((s) => (s.species ? [s.species] : []));
  return { troubles, events, buddyShieldUsed, calmUsed };
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
    const planet = (state.troubles ?? []).some((trouble) => !trouble.settled) ? clonePlanet(state.planet) : state.planet;
    const trouble = advanceTroubles(planet, state, action, undefined, false, mods, false);
    const after = lifeScore(planet);
    const lost = state.planet.sectors.flatMap((s, sector) =>
      s.species && planet.sectors[sector].species !== s.species ? [{ species: s.species, sector }] : [],
    );
    const settledGain = trouble.events.filter((event) => event.kind === 'settled').length * 3;
    const charge = Math.min(state.nova.threshold, state.nova.charge + settledGain);
    const missed: StepResult = {
      state: {
        ...state,
        planet,
        ...(rules.version === 2 && state.wideNext ? { wideNext: 0 } : {}),
        ...(mods.launcher?.id === 'skipper' ? { skipperBounces: (state.skipperBounces ?? 0) + Number(!!action.bounced) } : {}),
        troubles: trouble.troubles,
        buddyShieldUsed: trouble.buddyShieldUsed,
        calmUsed: trouble.calmUsed,
        charge,
        nova: { ...state.nova, charge },
        score: after + state.bonus,
        combo: { links: 0, rest: false, best: combo.best },
        queueIndex: state.queueIndex === undefined ? undefined : state.queueIndex + 1,
        throwsLeft: state.throwsLeft === undefined ? undefined : Math.max(0, state.throwsLeft - 1),
      },
      before,
      after,
      changed: [],
      changedBetter: [],
      spawned: [],
      lost,
      cameBack: [],
      firstArrivals: [],
      newRegionBests: [],
      labEvents: [],
      novaCharge: settledGain,
      novaGain: settledGain,
      novaFired: false,
      reactions: [],
      combo: { links: 0, step: 0, ended: 'worse' },
      troubleEvents: trouble.events,
    };
    return finishPickups(missed, action, rules);
  }
  const planet = clonePlanet(state.planet);
  const priorSpecies = state.planet.sectors.map((s) => s.species);
  const priorBiomes = state.planet.sectors.map((s) => s.biome);
  const priorPresent = new Set(priorSpecies.filter((id): id is string => !!id));
  const meter = state.nova ?? { charge: state.charge, threshold: NOVA_CHARGE, fired: 0, held: false };
  const nova = state.novaEnabled && meter.charge >= meter.threshold && (action.nova ?? !meter.held);
  const candidateReaction = reactionAt(state.planet, action.kind, action.sector, rules, mods.gentle);
  // Weed Burner clears the vine before a simultaneous Dry Spell can scorch life.
  const burnsVine =
    action.kind === 'magma' &&
    labGuard('magma', mods.lab.magma ?? 1) === 'weedBurner' &&
    (state.troubles ?? []).some(
      (t) => t.id === 'vine' && !t.settled && (ringDistance(action.sector, t.source) <= 2 || !!t.tangled?.includes(wrap(action.sector))),
    );
  const reaction = candidateReaction?.id === 'scorch' && burnsVine ? null : candidateReaction;
  const oldCombo = state.combo ?? { links: 0, rest: false, best: 0 };
  const fusion = reaction !== null && REACTIONS[reaction.id].kind === 'fusion';
  const comboEnabled = rules.combo !== false;
  const linkCount = fusion && comboEnabled ? (nova ? 2 : 1) : 0;
  const reached = oldCombo.links + linkCount;
  const step = fusion && comboEnabled && reached >= 2 ? Math.min(4, reached) : 0;
  const level = mods.lab[action.kind] ?? 1;
  const comboReach = fusion && comboEnabled && oldCombo.links < 3 && reached >= 3 ? 1 : 0;
  // Sparkler's extra two Fusion sectors still share the reach-four cap.
  const extraReach = comboReach + (fusion ? labFusionReach(level) + 2 * Number(mods.launcher?.id === 'sparkler') : 0);
  let affected: number[] = [];
  const form = !!mods.forms?.[action.kind] && level >= 5;
  const reachDelta = launcherReach(mods.launcher ?? NO_MODIFIERS.launcher, action.kind);
  const wide = rules.version === 2 ? Math.min(1, Math.max(0, state.wideNext ?? 0)) : 0;
  const skipperBounceNumber = (state.skipperBounces ?? 0) + Number(!!action.bounced && mods.launcher?.id === 'skipper');
  const centerPowerLoss = !!action.bounced && skipperLosesPower(mods.launcher ?? NO_MODIFIERS.launcher, action.kind, skipperBounceNumber);
  const result = impact(
    planet,
    action.kind,
    action.sector,
    mods.splash + wide,
    {
      nova,
      power: labPower(level),
      novaReach: labNovaReach(level),
      form,
      ...(reachDelta || wide ? { reachDelta, reachCap: 4 } : {}),
      ...(centerPowerLoss ? { centerPowerLoss: true } : {}),
    },
    (land) => {
      if (reaction)
        affected = applyReaction(
          land,
          reaction.id,
          reaction.at,
          extraReach,
          REACTIONS[reaction.id].radius + comboReach + 2 * Number(mods.launcher?.id === 'sparkler' && fusion),
        );
      if (fusion && comboEnabled && reached >= 4) comboBloom(land, action.sector);
    },
  );
  const labMarks = { rock: [...(state.labMarks?.rock ?? [])], seed: [...(state.labMarks?.seed ?? [])] };
  if ((mods.lab[action.kind] ?? 1) >= 4 && (action.kind === 'rock' || action.kind === 'seed')) {
    const reach = Math.min(4, KINDS[action.kind].stats.reach + mods.splash + wide + reachDelta + (nova ? 1 + labNovaReach(level) : 0));
    for (let d = -reach; d <= reach; d++) {
      const at = wrap(action.sector + d);
      if (action.kind === 'seed' || planet.sectors[at].land >= 3) {
        const marks = labMarks[action.kind];
        if (!marks.includes(at)) marks.push(at);
      }
    }
  }
  const trouble = advanceTroubles(planet, { ...state, labMarks }, action, reaction?.id, nova, mods);
  const finalAfter = lifeScore(planet);
  const changed = planet.sectors.map((s, i) => (s.biome !== priorBiomes[i] ? i : -1)).filter((i) => i >= 0);
  const spawned = result.spawned.filter((entry) => planet.sectors[entry.at].species === entry.id);
  const lost = priorSpecies.flatMap((species, sector) =>
    species && planet.sectors[sector].species !== species ? [{ species, sector }] : [],
  );
  const changedBetter = changed.filter((i) => BIOMES[planet.sectors[i].biome].value > BIOMES[priorBiomes[i]].value);
  const regionBests = [...state.regionBests];
  const newRegionBests = changed.filter((i) => BIOMES[planet.sectors[i].biome].value > (regionBests[i] ?? 0));
  planet.sectors.forEach((sector, i) => {
    regionBests[i] = Math.max(regionBests[i] ?? 0, BIOMES[sector.biome].value);
  });
  const arrived = new Set(state.arrived);
  const firstArrivals: string[] = [];
  const cameBack: { species: string; sector: number }[] = [];
  for (const species of spawned) {
    if (!arrived.has(species.id)) firstArrivals.push(species.id);
    else if (!priorPresent.has(species.id)) cameBack.push({ species: species.id, sector: species.at });
    arrived.add(species.id);
  }
  const betterThrow = finalAfter >= result.before;
  const labEvents: LabEvent[] = [];
  if (result.powerApplied && betterThrow) labEvents.push({ type: 'power', kind: action.kind, level, sector: wrap(action.sector) });
  if (form)
    labEvents.push({ type: 'form', kind: action.kind, form: FORM_OF[action.kind], sector: wrap(action.sector), changed: changed.length });
  for (const event of trouble.events)
    if (TROUBLE_BEHAVIOUR[event.id].perk !== null && (event.perk || event.by === 'firewall' || event.by === 'labRoots')) {
      const kind: Kind = event.by === 'firewall' ? 'rock' : event.by === 'labRoots' ? 'seed' : action.kind;
      labEvents.push({
        type: 'guard',
        kind,
        perk: event.perk ?? GUARD_OF[kind],
        trouble: event.id,
        sector: event.sector,
        how: event.kind === 'blocked' ? 'blocked' : 'settled',
      });
    }
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
  const fusionGain = state.novaEnabled && reaction && betterThrow ? REACTIONS[reaction.id].charge : 0;
  const threshold = nova ? LATER_NOVA_CHARGE : meter.threshold;
  const troubleGain = state.novaEnabled && betterThrow ? trouble.events.filter((event) => event.kind === 'settled').length * 3 : 0;
  const settledTrouble = trouble.events.some((event) => event.kind === 'settled');
  const raisedLand = planet.sectors.some((sector, i) => sector.land > state.planet.sectors[i].land);
  const plainSparkler = mods.launcher?.id === 'sparkler' && !fusion && !settledTrouble;
  const skipPenalty =
    ((mods.launcher?.tune ?? 1) >= 2 && firstArrivals.length > 0) ||
    ((mods.launcher?.tune ?? 1) >= 3 && raisedLand) ||
    ((mods.launcher?.tune ?? 1) >= 4 && !state.sparklerPlainUsed);
  const sparklerAdjustment = mods.launcher?.id === 'sparkler' && betterThrow ? (fusion ? 2 : plainSparkler && !skipPenalty ? -1 : 0) : 0;
  const rawGain = gain + fusionGain + comboGain + troubleGain;
  const effectiveGain = Math.max(0, rawGain + sparklerAdjustment);
  const charge = state.novaEnabled ? Math.min(threshold, (nova ? 0 : meter.charge) + effectiveGain) : 0;
  const novaState = { charge, threshold, fired: meter.fired + Number(nova), held: nova ? false : meter.held };
  const totalBonus = state.bonus;
  const next: RoundState = {
    ...state,
    planet,
    ...(rules.version === 2 && state.wideNext ? { wideNext: 0 } : {}),
    charge,
    bonus: totalBonus,
    regionBests,
    arrived: [...arrived],
    nova: novaState,
    combo,
    comboCharge: (state.comboCharge ?? 0) + comboGain,
    ...(mods.launcher?.id === 'sparkler' ? { sparklerPlainUsed: !!state.sparklerPlainUsed || !!plainSparkler } : {}),
    ...(mods.launcher?.id === 'skipper' ? { skipperBounces: skipperBounceNumber } : {}),
    troubles: trouble.troubles,
    labMarks,
    buddyShieldUsed: trouble.buddyShieldUsed,
    calmUsed: trouble.calmUsed,
    queueIndex: state.queueIndex === undefined ? undefined : state.queueIndex + 1,
    throwsLeft: state.throwsLeft === undefined ? undefined : Math.max(0, state.throwsLeft - 1),
    score: lifeScore(planet) + totalBonus,
    guardianHp: state.guardianHp === undefined ? undefined : Math.max(0, state.guardianHp - (action.guardianHit ? (nova ? 2 : 1) : 0)),
  };
  const completed: StepResult = {
    state: next,
    before: result.before,
    after: finalAfter,
    changed,
    changedBetter,
    spawned,
    lost,
    cameBack,
    firstArrivals,
    newRegionBests,
    labEvents,
    novaCharge: nova ? charge : charge - meter.charge,
    novaGain: effectiveGain,
    novaFired: nova,
    reactions: reaction ? [{ ...reaction, sectors: affected }] : [],
    combo: comboResult,
    troubleEvents: trouble.events,
  };
  return finishPickups(completed, action, rules, reaction?.id);
}

/** One shared cap; the fixed bonus object is part of the saved round. */
export function grantExtraThrow(state: RoundState, source: ExtraThrowSource): StepResult['extraThrow'] {
  if (state.extraUsed || !state.bonusKind) return undefined;
  state.extraUsed = true;
  state.extraSource = source;
  if (state.throwsLeft !== undefined) state.throwsLeft += 1;
  return { source, kind: state.bonusKind };
}

function finishPickups(result: StepResult, action: RoundAction, rules: RoundRules, reaction?: ReactionId): StepResult {
  if (rules.version !== 2) return result;
  const used = result.state.extraUsed;
  // Contacts precede the landing reaction; the first source wins.
  for (const pickup of action.pickups ?? []) if (pickup.kind === 'throw' || pickup.kind === 'wide') applyMote(result.state, pickup);
  if (!used && result.state.extraUsed && result.state.bonusKind)
    result.extraThrow = { source: result.state.extraSource ?? 'mote', kind: result.state.bonusKind };
  if (reaction && REACTIONS[reaction].extraThrow) {
    const extra = grantExtraThrow(result.state, REACTIONS[reaction].extraThrow!);
    if (extra) result.extraThrow = extra;
  }
  if (result.extraThrow && result.combo.ended === 'round') delete result.combo.ended;
  return result;
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

export function serializeRound(state: RoundState, rulesVersion: RulesVersion = RULES_VERSION): string {
  return JSON.stringify({ version: ROUND_SAVE_VERSION, rulesVersion, state });
}

export function restoreRound(json: string): RoundState | null {
  return restoreRoundWithVersion(json)?.state ?? null;
}

export function restoreRoundWithVersion(json: string): { state: RoundState; rulesVersion: RulesVersion } | null {
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
    const rulesVersion = 'rulesVersion' in saved ? (saved.rulesVersion as RulesVersion) : 1;
    if (!RULES_SUPPORTED.includes(rulesVersion)) return null;
    const state = saved.state as RoundState;
    if (saved.version === 1) {
      state.combo = { links: 0, rest: false, best: 0 };
      state.comboCharge = 0;
    }
    if (rulesVersion === 2) {
      state.extraUsed = !!state.extraUsed;
      if (state.extraAt !== undefined && (!Number.isInteger(state.extraAt) || state.extraAt < 0 || state.extraAt > 1024)) return null;
      if (state.bonusKind && !Object.hasOwn(KINDS, state.bonusKind)) return null;
      if (state.extraSource && state.extraSource !== 'rainbow' && state.extraSource !== 'mote') return null;
      if (state.motesTaken) state.motesTaken = [...new Set(state.motesTaken.filter((n) => Number.isInteger(n) && n >= 0))];
      state.wideNext = Number.isInteger(state.wideNext) && state.wideNext! > 0 ? 1 : 0;
    }
    if (!Array.isArray(state.troubles)) state.troubles = [];
    if (!state.labMarks) state.labMarks = { rock: [], seed: [] };
    if (typeof state.buddyShieldUsed !== 'boolean') state.buddyShieldUsed = false;
    if (typeof state.calmUsed !== 'boolean') state.calmUsed = false;
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
      !RULESETS[rulesVersion].novaThresholds.includes(state.nova.threshold) ||
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
    if (rulesVersion === 2)
      for (const trouble of state.troubles)
        if (trouble.id === 'pebble') {
          if (!Number.isInteger(trouble.count) || trouble.count! < 0) trouble.count = 0;
          if (!Number.isInteger(trouble.target)) {
            delete trouble.target;
            trouble.target = troubleTarget(state.planet, trouble) ?? wrap(trouble.source);
          } else trouble.target = wrap(trouble.target!);
        }
    return { state, rulesVersion };
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
