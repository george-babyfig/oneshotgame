// The Comet Pier's permanent feat ledger. Its site and art arrive in M11.5.
import type { Profile } from './profile';
import type { StepResult } from '../core/round';
import { REACTIONS } from '../core/round';
import { balance, earn, spend } from './wallet';
import type { EligibleRoundEvent, EligibleRoundResult, LandmarkId, LandmarkState } from './homeworldLife';
import { LANDMARKS, type LandmarkDef, type LandmarkRoute } from './tuning';
import { UNLOCKS } from './unlocks';
import { friendLevel } from './homeworld';
import type { BiomeId } from '../core/world';
import type { Difficulty } from '../core/levels';
import { CONSTELLATIONS } from './tuning';

export interface CometPierProgress {
  hardWins: number;
  normalThreeStars: number;
  hardPlanets: string[];
  normalPlanets: string[];
  troubles: number;
  fusions: number;
  stage: 0 | 1 | 2 | 3 | 4;
}

export const defaultCometPier = (): CometPierProgress => ({
  hardWins: 0,
  normalThreeStars: 0,
  hardPlanets: [],
  normalPlanets: [],
  troubles: 0,
  fusions: 0,
  stage: 0,
});

export type PierMode = 'campaign' | 'voyage' | 'zen' | 'daily' | 'rush' | 'challenge' | 'remix' | 'practice';
const counts = (mode: PierMode) => ['campaign', 'voyage', 'zen', 'daily'].includes(mode);

/** Count real stepRound events once, at the step callback. */
export function recordCometPierStep(p: Profile, step: Pick<StepResult, 'troubleEvents' | 'reactions'>, mode: PierMode): void {
  if (!counts(mode) || p.home.level < 4) return;
  if (p.cometPier.stage === 1) p.cometPier.troubles += step.troubleEvents.filter((e) => e.kind === 'settled').length;
  if (p.cometPier.stage === 2) p.cometPier.fusions += step.reactions.filter((r) => REACTIONS[r.id].kind === 'fusion').length;
  advanceCometPier(p);
}

/** A win is recorded only once per planet by the caller. */
export function recordCometPierWin(p: Profile, mode: PierMode, planet: string | number, hard: boolean, stars: number): void {
  if (!counts(mode) || p.home.level < 4 || p.cometPier.stage !== 0) return;
  const key = `${mode}:${planet}`;
  if (hard && !p.cometPier.hardPlanets.includes(key)) {
    p.cometPier.hardPlanets.push(key);
    p.cometPier.hardWins++;
  } else if (!hard && stars >= 3 && !p.cometPier.normalPlanets.includes(key)) {
    p.cometPier.normalPlanets.push(key);
    p.cometPier.normalThreeStars++;
  }
  advanceCometPier(p);
}

export function cometPierStageProgress(p: Profile): { done: number; total: number } {
  const pier = p.cometPier;
  if (pier.stage === 0) return { done: Math.max(Math.min(pier.hardWins, 3) / 3, Math.min(pier.normalThreeStars, 6) / 6), total: 1 };
  if (pier.stage === 1) return { done: Math.min(pier.troubles, 8), total: 8 };
  if (pier.stage === 2) return { done: Math.min(pier.fusions, 10), total: 10 };
  if (pier.stage === 3) return { done: Math.min(balance(p, 'leaf') / 40, balance(p, 'dew') / 30), total: 1 };
  return { done: 1, total: 1 };
}

/** Each stage starts with fresh counters when it opens. */
export function advanceCometPier(p: Profile): number {
  const pier = p.cometPier;
  if (p.home.level < 4) return pier.stage;
  if (pier.stage === 0 && (pier.hardWins >= 3 || pier.normalThreeStars >= 6)) {
    pier.stage = 1;
    pier.troubles = 0;
    earn(p, 'dust', 200, 'generic_reward');
  }
  if (pier.stage === 1 && pier.troubles >= 8) {
    pier.stage = 2;
    pier.fusions = 0;
    earn(p, 'gems', 15, 'generic_reward');
  }
  if (pier.stage === 2 && pier.fusions >= 10) {
    pier.stage = 3;
    earn(p, 'dust', 250, 'generic_reward');
  }
  return pier.stage;
}

export function finishCometPierWithResult(p: Profile): 'ok' | 'locked' | 'resources' | 'finished' {
  advanceCometPier(p);
  const status = cometPierFinishStatus(p);
  if (status !== 'ready') return status;
  spend(p, 'leaf', 40, 'comet_pier');
  spend(p, 'dew', 30, 'comet_pier');
  p.cometPier.stage = 4;
  return 'ok';
}

/** Existing Bay controls can keep their boolean click contract. */
export function finishCometPier(p: Profile): boolean {
  return finishCometPierWithResult(p) === 'ok';
}

/** The Bay can explain why the final Pier action is unavailable. */
export function cometPierFinishStatus(p: Profile): 'ready' | 'locked' | 'resources' | 'finished' {
  if (p.cometPier.stage === 4) return 'finished';
  if (p.home.level < 4 || p.cometPier.stage !== 3) return 'locked';
  return balance(p, 'leaf') >= 40 && balance(p, 'dew') >= 30 ? 'ready' : 'resources';
}

/** Extra completed-round evidence retained by the result flow. All counts are from stepRound. */
export interface LandmarkRoundEvent extends EligibleRoundEvent {
  won: boolean;
  stars: number;
  difficulty: Difficulty;
  knownKindsBefore?: string[];
  reactions?: Partial<Record<'steam' | 'rainGarden' | 'wildflowers' | 'glacier', number>>;
  settledVent?: number;
  settledVine?: number;
}

type StoredLandmarkState = LandmarkState;

const IDS = LANDMARKS.map((site) => site.id);
const ELIGIBLE = new Set(['campaign', 'voyage', 'zen', 'daily']);
const stageId = (id: LandmarkId, stage: number) => `${id}:stage:${stage + 1}`;

export function defaultLandmarkState(): StoredLandmarkState {
  return { stage: 0, progress: [0, 0, 0, 0, 0, 0], rewarded: [], rounds: [], arrivals: [], planets: [] };
}

/** The old Pier record remains authoritative, including rewards paid before M11.5. */
function inheritPier(p: Profile, state: StoredLandmarkState): void {
  const pier = p.cometPier;
  state.stage = pier.stage;
  state.progress = [pier.hardWins, pier.normalThreeStars, pier.troubles, state.progress[3] ?? 0, pier.fusions, state.progress[5] ?? 0];
  for (let i = 0; i < Math.min(pier.stage, 3); i++) {
    const key = stageId('comet_pier', i);
    if (!state.rewarded.includes(key)) state.rewarded.push(key);
  }
  if (pier.stage === 4) {
    state.done ??= Date.now();
    if (!state.rewarded.includes(stageId('comet_pier', 3))) state.rewarded.push(stageId('comet_pier', 3));
  }
}

export function landmarkState(p: Profile, id: LandmarkId): StoredLandmarkState {
  const state = p.home.landmarks[id] as StoredLandmarkState;
  if (id === 'comet_pier') inheritPier(p, state);
  return state;
}

export function landmarkDefinition(id: LandmarkId): LandmarkDef {
  return LANDMARKS[IDS.indexOf(id)];
}

export function landmarkOpen(p: Profile, id: LandmarkId): boolean {
  const index = IDS.indexOf(id);
  if (index < 0 || p.level < 30 || p.home.level < LANDMARKS[index].level) return false;
  return IDS.slice(0, index).every((prior) => landmarkState(p, prior).stage === 4);
}

export function activeLandmark(p: Profile): LandmarkDef | null {
  return LANDMARKS.find((site) => landmarkOpen(p, site.id) && landmarkState(p, site.id).stage < 4) ?? null;
}

function priorEvidence(state: StoredLandmarkState, prefix: string): number {
  return Math.max(0, ...(state.planets ?? []).filter((key) => key.startsWith(prefix)).map((key) => Number(key.slice(prefix.length)) || 0));
}

function grownDelta(state: StoredLandmarkState, event: LandmarkRoundEvent, ids: readonly BiomeId[]): number {
  if (event.improvedSectorIds) {
    const sectors = new Set(ids.flatMap((biome) => event.improvedSectorIds?.[biome] ?? []));
    const prefix = `grown:${state.stage}:${event.planetKey}:`;
    return [...sectors].filter((sector) => !state.planets?.includes(`${prefix}${sector}`)).length;
  }
  return ids.reduce(
    (total, biome) => total + Math.max(0, (event.improvedSectors[biome] ?? 0) - priorEvidence(state, `best:${event.planetKey}:${biome}:`)),
    0,
  );
}

const featMetric = (route: LandmarkRoute) => `${route.metric}${route.reaction ? `:${route.reaction}` : ''}`;
const featCount = (event: LandmarkRoundEvent, route: LandmarkRoute): number => {
  switch (route.metric) {
    case 'reaction':
      return event.reactions?.[route.reaction!] ?? 0;
    case 'fusions':
      return event.fusions;
    case 'supernovas':
      return event.supernovas;
    case 'settled':
      return event.settledTroubles;
    case 'settledVent':
      return event.settledVent ?? 0;
    case 'settledVine':
      return event.settledVine ?? 0;
    default:
      return 0;
  }
};

function featDelta(state: StoredLandmarkState, stage: number, route: LandmarkRoute, event: LandmarkRoundEvent): number {
  return Math.max(0, featCount(event, route) - priorEvidence(state, `feat:${stage}:${event.planetKey}:${featMetric(route)}:`));
}

function storeFeatEvidence(state: StoredLandmarkState, stage: number, route: LandmarkRoute, event: LandmarkRoundEvent): void {
  const count = featCount(event, route);
  if (!count) return; // A zero first win never locks a better replay.
  const prefix = `feat:${stage}:${event.planetKey}:${featMetric(route)}:`;
  const best = Math.max(count, priorEvidence(state, prefix));
  state.planets ??= [];
  state.planets = state.planets.filter((key) => !key.startsWith(prefix));
  state.planets.push(`${prefix}${best}`);
}

function storeGrownEvidence(state: StoredLandmarkState, stage: number, route: LandmarkRoute, event: LandmarkRoundEvent): void {
  if (route.metric !== 'grown' || !event.improvedSectorIds) return;
  const prefix = `grown:${stage}:${event.planetKey}:`;
  for (const sector of new Set((route.biomes ?? []).flatMap((biome) => event.improvedSectorIds?.[biome] ?? []))) {
    const key = `${prefix}${sector}`;
    if (!state.planets?.includes(key)) (state.planets ??= []).push(key);
  }
}

function storeBestEvidence(state: StoredLandmarkState, event: LandmarkRoundEvent): void {
  state.planets ??= [];
  for (const [biome, count] of Object.entries(event.improvedSectors)) {
    const prefix = `best:${event.planetKey}:${biome}:`;
    const best = Math.max(count, priorEvidence(state, prefix));
    state.planets = state.planets.filter((key) => !key.startsWith(prefix));
    state.planets.push(`${prefix}${best}`);
  }
  const prefix = `star:${event.planetKey}:`;
  const stars = Math.max(event.stars, priorEvidence(state, prefix));
  state.planets = state.planets.filter((key) => !key.startsWith(prefix));
  state.planets.push(`${prefix}${stars}`);
}

function metricDelta(state: StoredLandmarkState, stage: number, route: LandmarkRoute, event: LandmarkRoundEvent): number {
  switch (route.metric) {
    case 'grown':
      return grownDelta(state, event, route.biomes ?? []);
    case 'arrivals':
      return [...new Set(event.firstArrivals)].filter((id) => !state.planets?.includes(`arrival:${stage}:${id}`)).length;
    case 'newKinds':
      return [...new Set(event.firstArrivals)].filter(
        (id) => !event.knownKindsBefore?.includes(id) && !state.planets?.includes(`arrival:${stage}:${id}`),
      ).length;
    case 'reaction':
      return featDelta(state, stage, route, event);
    case 'fusions':
      return featDelta(state, stage, route, event);
    case 'newStars':
      return Math.min(event.newStars, Math.max(0, event.stars - priorEvidence(state, `star:${event.planetKey}:`)));
    case 'supernovas':
      return featDelta(state, stage, route, event);
    case 'settled':
      return featDelta(state, stage, route, event);
    case 'settledVent':
      return featDelta(state, stage, route, event);
    case 'settledVine':
      return featDelta(state, stage, route, event);
    case 'hardWins':
      return event.won && event.difficulty !== 'normal' && !state.planets?.includes(event.planetKey) ? 1 : 0;
    case 'normalThreeStars':
      return event.won &&
        event.difficulty === 'normal' &&
        event.stars >= 3 &&
        event.newStars > 0 &&
        !state.planets?.includes(event.planetKey)
        ? 1
        : 0;
    case 'threeStars':
      return event.won && event.stars >= 3 && event.newStars > 0 && !state.planets?.includes(event.planetKey) ? 1 : 0;
    case 'bestFriends':
    case 'friendLevelThree':
    case 'constellations':
    case 'bundles':
      return 0;
  }
}

function snapshotProgress(p: Profile, route: LandmarkRoute): number {
  const friends = new Map(Object.entries(p.home.friends).map(([species, saved]) => [species, saved.fp]));
  for (const resident of p.home.residents) friends.set(resident.species, resident.fp);
  if (route.metric === 'bestFriends') return [...friends.values()].filter((fp) => friendLevel(fp) >= 5).length;
  if (route.metric === 'friendLevelThree') return [...friends.values()].filter((fp) => friendLevel(fp) >= 3).length;
  if (route.metric === 'constellations') return p.constellations.length;
  if (route.metric === 'bundles') return p.bundles.length;
  return 0;
}

function payStage(p: Profile, site: LandmarkDef, state: StoredLandmarkState, stage: number, result: EligibleRoundResult): void {
  const id = stageId(site.id, stage);
  if (state.rewarded.includes(id)) return;
  state.rewarded.push(id);
  const reward = site.stages[stage].reward;
  if (reward.dust) earn(p, 'dust', reward.dust, 'generic_reward');
  if (reward.gems) earn(p, 'gems', reward.gems, 'generic_reward');
  result.earned.push({ id, ...reward });
  result.celebrations.push(id);
  if (!p.home.seen.celebrations.includes(id)) p.home.seen.celebrations.push(id);
}

function advanceFromSnapshots(p: Profile, site: LandmarkDef, state: StoredLandmarkState, result: EligibleRoundResult): void {
  while (state.stage < 3) {
    const stage = state.stage as 0 | 1 | 2;
    const routes = site.stages[stage].routes;
    routes.forEach((route, lane) => {
      state.progress[stage * 2 + lane] = Math.max(state.progress[stage * 2 + lane] ?? 0, snapshotProgress(p, route));
    });
    if (!routes.some((route, lane) => (state.progress[stage * 2 + lane] ?? 0) >= route.target)) break;
    payStage(p, site, state, stage, result);
    state.stage = (stage + 1) as LandmarkState['stage'];
  }
}

/** Refresh saved conditions when the Homeworld opens or a collection changes. */
export function refreshLandmarkSnapshots(p: Profile): EligibleRoundResult {
  const result: EligibleRoundResult = { earned: [], celebrations: [] };
  const site = activeLandmark(p);
  if (site && site.id !== 'comet_pier') advanceFromSnapshots(p, site, landmarkState(p, site.id), result);
  return result;
}

/** Called once after a winning eligible round. A stable round key makes replays harmless. */
export function recordLandmarkRound(p: Profile, event: LandmarkRoundEvent): EligibleRoundResult {
  const result: EligibleRoundResult = { earned: [], celebrations: [] };
  if (!event.won || !ELIGIBLE.has(event.mode) || !event.roundKey) return result;
  const site = activeLandmark(p);
  if (!site) return result;
  const state = landmarkState(p, site.id);
  if (state.stage >= 3 || state.rounds?.includes(event.roundKey)) return result;
  state.rounds ??= [];
  state.rounds.push(event.roundKey);
  if (state.rounds.length > 64) state.rounds.splice(0, state.rounds.length - 64);
  if (site.id === 'comet_pier') {
    const before = p.cometPier.stage;
    if (before === 0)
      recordCometPierWin(
        p,
        event.mode,
        event.planetKey.replace(new RegExp(`^${event.mode}:`), ''),
        event.difficulty !== 'normal' && !!event.firstPlanetWin,
        event.newStars > 0 ? event.stars : 0,
      );
    if (before === 1) {
      p.cometPier.troubles += featDelta(state, 1, site.stages[1].routes[0], event);
      state.progress[3] = Math.min(8, (state.progress[3] ?? 0) + featDelta(state, 1, site.stages[1].routes[1], event));
      for (const route of site.stages[1].routes) storeFeatEvidence(state, 1, route, event);
      if (state.progress[3] >= 8) p.cometPier.troubles = Math.max(8, p.cometPier.troubles);
      advanceCometPier(p);
    }
    if (before === 2) {
      p.cometPier.fusions += featDelta(state, 2, site.stages[2].routes[0], event);
      storeFeatEvidence(state, 2, site.stages[2].routes[0], event);
      state.progress[5] = Math.min(
        10,
        (state.progress[5] ?? 0) + Math.min(event.newStars, Math.max(0, event.stars - priorEvidence(state, `star:${event.planetKey}:`))),
      );
      if (state.progress[5] >= 10) p.cometPier.fusions = Math.max(10, p.cometPier.fusions);
      advanceCometPier(p);
    }
    inheritPier(p, state);
    storeBestEvidence(state, event);
    for (let i = before; i < Math.min(state.stage, 3); i++) {
      const id = stageId(site.id, i);
      result.earned.push({ id, ...site.stages[i as 0 | 1 | 2].reward });
      result.celebrations.push(id);
      if (!p.home.seen.celebrations.includes(id)) p.home.seen.celebrations.push(id);
    }
    return result;
  }
  if (state.stage < 3) {
    const stage = state.stage as 0 | 1 | 2;
    site.stages[stage].routes.forEach((route, lane) => {
      state.progress[stage * 2 + lane] = Math.min(
        route.target,
        (state.progress[stage * 2 + lane] ?? 0) + metricDelta(state, stage, route, event),
      );
    });
    for (const route of site.stages[stage].routes) {
      storeFeatEvidence(state, stage, route, event);
      storeGrownEvidence(state, stage, route, event);
    }
    if (site.stages[stage].routes.some((route) => route.metric === 'arrivals' || route.metric === 'newKinds'))
      state.planets = [...new Set([...(state.planets ?? []), ...event.firstArrivals.map((id) => `arrival:${stage}:${id}`)])];
    state.arrivals = [...new Set([...(state.arrivals ?? []), ...event.firstArrivals])]; // Retain older save evidence.
    if (event.difficulty !== 'normal' || event.stars >= 3) state.planets = [...new Set([...(state.planets ?? []), event.planetKey])];
    storeBestEvidence(state, event);
    advanceFromSnapshots(p, site, state, result);
  }
  return result;
}

export function landmarkStageProgress(p: Profile, id: LandmarkId): { stage: number; routes: { done: number; total: number }[] } {
  const site = landmarkDefinition(id);
  const state = landmarkState(p, id);
  if (state.stage >= 3)
    return {
      stage: state.stage,
      routes: Object.entries(site.delivery).map(([mat, n]) => ({ done: balance(p, mat as 'leaf' | 'stone' | 'dew'), total: n! })),
    };
  const stage = state.stage as 0 | 1 | 2;
  return {
    stage,
    routes: site.stages[stage].routes.map((route, lane) => ({ done: state.progress[stage * 2 + lane] ?? 0, total: route.target })),
  };
}

export function landmarkFinishStatus(p: Profile, id: LandmarkId): 'ready' | 'locked' | 'resources' | 'finished' {
  if (id === 'comet_pier') return cometPierFinishStatus(p);
  if (!landmarkOpen(p, id)) return 'locked';
  const state = landmarkState(p, id);
  if (state.stage === 4) return 'finished';
  if (state.stage !== 3) return 'locked';
  return Object.entries(landmarkDefinition(id).delivery).every(([mat, n]) => balance(p, mat as 'leaf' | 'stone' | 'dew') >= n!)
    ? 'ready'
    : 'resources';
}

export function finishLandmark(p: Profile, id: LandmarkId, at = Date.now()): 'ok' | 'locked' | 'resources' | 'finished' {
  const status = landmarkFinishStatus(p, id);
  if (status !== 'ready') return status;
  if (id === 'comet_pier') {
    const result = finishCometPierWithResult(p);
    if (result !== 'ok') return result;
  } else {
    for (const [mat, n] of Object.entries(landmarkDefinition(id).delivery)) spend(p, mat as 'leaf' | 'stone' | 'dew', n!, 'generic_spend');
  }
  const state = landmarkState(p, id);
  state.stage = 4;
  state.done = at;
  const key = stageId(id, 3);
  if (!state.rewarded.includes(key)) state.rewarded.push(key);
  if (!p.home.seen.celebrations.includes(key)) p.home.seen.celebrations.push(key);
  return 'ok';
}

/** Content costs keep Atlas alternatives honest as the catalogue changes. */
function routeEffort(route: LandmarkRoute): number {
  if (route.metric === 'constellations')
    return CONSTELLATIONS.map((item) => item.bundles.length)
      .sort((a, b) => a - b)
      .slice(0, route.target)
      .reduce((sum, count) => sum + count, 0);
  const weight =
    route.metric === 'hardWins'
      ? 2
      : route.metric === 'reaction' && route.reaction === 'glacier'
        ? 10 / 3
        : route.metric === 'bestFriends'
          ? 4
          : 1;
  return route.target * weight;
}

/** Content gate for CI: taught asks, safe deliveries and equal-effort alternatives. */
export function lintLandmarkTeaching(): string[] {
  const problems: string[] = [];
  for (const site of LANDMARKS)
    for (const [stageIndex, stage] of site.stages.entries()) {
      if (stage.routes.length < 2) problems.push(`${site.id}:${stageIndex + 1}:missing alternative`);
      if (stage.routes.length === 2 && Math.abs(routeEffort(stage.routes[0]) - routeEffort(stage.routes[1])) > 1)
        problems.push(`${site.id}:${stageIndex + 1}:unequal alternative`);
      const constellation = stage.routes.find((route) => route.metric === 'constellations');
      const bundles = stage.routes.find((route) => route.metric === 'bundles');
      if (constellation && bundles) {
        const litCost = routeEffort(constellation);
        const visibleBeforeLighting = CONSTELLATIONS.filter((item, index) => index < 2 || item.id === 'kite').reduce(
          (sum, item) => sum + item.bundles.length,
          0,
        );
        if (bundles.target >= litCost || bundles.target > visibleBeforeLighting)
          problems.push(`${site.id}:${stageIndex + 1}:bundle route dominated or unreachable`);
      }
      for (const route of stage.routes) {
        const taught = UNLOCKS.find((row) => row.id === route.taught)?.planet;
        if (taught === undefined || taught > 29) problems.push(`${site.id}:${stageIndex + 1}:${route.taught}`);
      }
      if (Object.keys(site.delivery).some((mat) => !['leaf', 'dew', 'stone'].includes(mat))) problems.push(`${site.id}:rare delivery`);
    }
  return problems;
}
