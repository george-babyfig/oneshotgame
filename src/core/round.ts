import { BIOMES, KINDS, biomeOf, clonePlanet, impact, lifeScore, novaCharge, settle, wrap, type Kind, type Planet } from './world';
import { FORM_OF, GUARD_OF, labFusionReach, labGuard, labNovaReach, labPower, type LabEvent } from './labperks';
import { NO_MODIFIERS, type RoundMode, type RoundModifiers } from './modifiers';
import { SECTORS, SPECIES_BY_ID, type BiomeId } from './world';
import type { LevelDef } from './levels';
import { TROUBLES, firebreakBy, troubleTarget, type TroubleEvent, type TroubleId, type TroubleState } from './troubles';
import { traitOf } from './world';
import { RULES_VERSION } from './rules-version';
import { launcherReach, skipperLosesPower } from './launchers';

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
  troubles: TroubleId[];
  combo?: boolean;
}

export const ROUND_RULES_V0: RoundRules = { version: RULES_VERSION, reactions: [], troubles: [] };

/** Every mode teaches the same reactions at the same planet. */
export function rulesForLevel(n: number, mode: RoundMode = 'campaign', taught = n): RoundRules {
  const cap = mode === 'campaign' ? n : Math.min(n, taught);
  return {
    version: RULES_VERSION,
    reactions: REACTION_IDS.filter((id) => cap >= REACTIONS[id].debut),
    troubles:
      mode === 'zen' || mode === 'rush' || mode === 'remix'
        ? []
        : (Object.keys(TROUBLES) as TroubleId[]).filter((id) => cap >= TROUBLES[id].debut),
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
}

export interface RoundAction {
  kind: Kind;
  sector: number;
  nova?: boolean;
  guardianHit?: boolean;
  outcome?: 'bonk' | 'fizzle' | 'miss';
  /** Only a Skipper special rebound; ordinary Bubble Moon bounces do not count. */
  bounced?: boolean;
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
  labEvents: LabEvent[];
  novaCharge: number;
  novaGain: number;
  novaFired: boolean;
  reactions: { id: ReactionId; at: number; partner: number; sectors: number[] }[];
  combo: { links: number; step: number; ended?: 'rest' | 'worse' | 'round'; superFusion?: boolean };
  troubleEvents: TroubleEvent[];
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
    troubles: troubles.map(({ id, source }) => ({
      id,
      source,
      settled: false,
      nextIn: hard ? 2 : 3,
      every: hard ? 2 : 3,
      ...(id === 'vine' ? { tangled: [] } : {}),
    })),
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
  for (const id of REACTION_IDS) {
    if (!rules.reactions.includes(id) || (gentle && REACTIONS[id].kind === 'clash')) continue;
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

function applyReaction(planet: Planet, id: ReactionId, at: number, extraReach: number, safeAfterRadius = 4): number[] {
  const baseRadius = id === 'rainGarden' ? 3 : id === 'glacier' ? 1 : 2;
  const radius = Math.min(4, baseRadius + extraReach);
  const sectors: number[] = [];
  for (let distance = -radius; distance <= radius; distance++) {
    const index = wrap(at + distance);
    const s = planet.sectors[index];
    const beforeExtra = Math.abs(distance) > safeAfterRadius ? { ...s } : null;
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
      if (s.species && traitOf(s.species) === 'fireproof') continue;
      s.life = Math.max(0, s.life - 1);
      s.heat = Math.min(3, s.heat + 1);
    }
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
    const rainBaseReach = KINDS.storm.stats.reach + mods.splash + (nova ? 1 : 0);
    const launcherRainReach = launcherReach(mods.launcher ?? NO_MODIFIERS.launcher, 'storm');
    const rainReach = launcherRainReach
      ? Math.min(4, rainBaseReach + launcherRainReach + (nova ? labNovaReach(mods.lab.storm ?? 1) : 0))
      : Math.max(rainBaseReach, Math.min(4, rainBaseReach + (nova ? labNovaReach(mods.lab.storm ?? 1) : 0)));
    const rinseVine =
      t.id === 'vine' &&
      action.kind === 'storm' &&
      guard === 'rinse' &&
      (t.tangled ?? []).some((at) => ringDistance(action.sector, at) <= rainReach);
    const cleared =
      landed &&
      ((action.kind === 'storm' && nova && d <= 3) ||
        (t.id === 'vent' &&
          ((action.kind === 'ice' && d <= (guard === 'ventCooler' ? 2 : 1)) ||
            (action.kind === 'storm' && d <= 3) ||
            (reaction === 'steam' && d <= 2))) ||
        (t.id === 'vine' &&
          ((action.kind === 'magma' && (d <= (guard === 'weedBurner' ? 2 : 1) || !!t.tangled?.includes(wrap(action.sector)))) ||
            rinseVine)) ||
        (t.id === 'frost' && ((action.kind === 'magma' && d <= 1) || (action.kind === 'sun' && d <= (guard === 'frostMelter' ? 4 : 3)))));
    if (cleared) {
      t.settled = true;
      t.tangled = [];
      if (t.id === 'vine') settle(planet);
      const perk =
        t.id === 'vent' && action.kind === 'ice' && d === 2 && reaction !== 'steam' && guard === 'ventCooler'
          ? guard
          : t.id === 'vine' && action.kind === 'magma' && d === 2 && !t.tangled?.includes(wrap(action.sector)) && guard === 'weedBurner'
            ? guard
            : t.id === 'vine' && rinseVine && !(nova && d <= 3)
              ? (guard ?? undefined)
              : t.id === 'frost' && action.kind === 'sun' && d === 4 && guard === 'frostMelter'
                ? guard
                : undefined;
      events.push({ id: t.id, kind: 'settled', sector: t.source, clearedByThrow: true, ...(perk ? { perk } : {}) });
      return t;
    }
    t.nextIn -= 1;
    if (t.nextIn > 0) return t;
    const calmBuddy = mods.buddyShield === 'calm' && !buddyShieldUsed;
    const calmResident = [previous.planet, planet].some((p) => p.sectors.some((s) => s.species && traitOf(s.species) === 'calm'));
    if (!calmUsed && (calmBuddy || calmResident)) {
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
    const matchesBuddy =
      buddy &&
      (t.id === 'vent'
        ? buddy === 'fireproof' || buddy === 'swimmer'
        : t.id === 'vine'
          ? buddy === 'weedproof' || buddy === 'swimmer'
          : buddy === 'frostproof');
    // A built firebreak (including Life Spark's strong roots) takes this beat;
    // the Buddy remains ready for a later beat instead of stacking here.
    if (by || (!buddyShieldUsed && matchesBuddy)) {
      if (!by && matchesBuddy) buddyShieldUsed = true;
      events.push({ id: t.id, kind: 'blocked', sector: at, by: by ?? buddy!, ...(!by && matchesBuddy ? { buddy: true } : {}) });
      return t;
    }
    const s = planet.sectors[at];
    const species = s.species ?? undefined;
    if (t.id === 'vent') {
      s.life = Math.max(0, s.life - 1);
      s.heat = Math.min(3, s.heat + 1);
    } else if (t.id === 'vine') {
      t.tangled = [...(t.tangled ?? []), at];
    } else s.heat = Math.max(-3, s.heat - 1);
    settle(planet);
    if (t.id === 'vine') {
      // Tangled land keeps its underlying numbers so Magma can uncover it later.
      for (const index of t.tangled ?? []) {
        planet.sectors[index].biome = 'barren';
        planet.sectors[index].species = null;
      }
    }
    events.push({ id: t.id, kind: t.id === 'vine' ? 'spread' : 'act', sector: at, ...(species ? { species } : {}) });
    return t;
  });
  for (const t of troubles)
    if (t.id === 'vine' && !t.settled)
      for (const at of t.tangled ?? []) {
        planet.sectors[at].biome = 'barren';
        planet.sectors[at].species = null;
      }
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
    return {
      state: {
        ...state,
        planet,
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
  const skipperBounceNumber = (state.skipperBounces ?? 0) + Number(!!action.bounced && mods.launcher?.id === 'skipper');
  const centerPowerLoss = !!action.bounced && skipperLosesPower(mods.launcher ?? NO_MODIFIERS.launcher, action.kind, skipperBounceNumber);
  const result = impact(
    planet,
    action.kind,
    action.sector,
    mods.splash,
    {
      nova,
      power: labPower(level),
      novaReach: labNovaReach(level),
      form,
      ...(reachDelta ? { reachDelta, reachCap: 4 } : {}),
      ...(centerPowerLoss ? { centerPowerLoss: true } : {}),
    },
    (land) => {
      if (reaction)
        affected = applyReaction(
          land,
          reaction.id,
          reaction.at,
          extraReach,
          (reaction.id === 'rainGarden' ? 3 : reaction.id === 'glacier' ? 1 : 2) +
            comboReach +
            2 * Number(mods.launcher?.id === 'sparkler' && fusion),
        );
      if (fusion && comboEnabled && reached >= 4) comboBloom(land, action.sector);
    },
  );
  const labMarks = { rock: [...(state.labMarks?.rock ?? [])], seed: [...(state.labMarks?.seed ?? [])] };
  if ((mods.lab[action.kind] ?? 1) >= 4 && (action.kind === 'rock' || action.kind === 'seed')) {
    const reach = Math.min(4, KINDS[action.kind].stats.reach + mods.splash + reachDelta + (nova ? 1 + labNovaReach(level) : 0));
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
    if (event.perk || event.by === 'firewall' || event.by === 'labRoots') {
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
  const fusionGain = state.novaEnabled && fusion && betterThrow ? 3 : 0;
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
  return {
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
  return JSON.stringify({ version: ROUND_SAVE_VERSION, rulesVersion: RULES_VERSION, state });
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
    if ('rulesVersion' in saved && saved.rulesVersion !== RULES_VERSION) return null;
    const state = saved.state as RoundState;
    if (saved.version === 1) {
      state.combo = { links: 0, rest: false, best: 0 };
      state.comboCharge = 0;
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
