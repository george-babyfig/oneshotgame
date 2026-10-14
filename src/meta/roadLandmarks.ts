import { t } from '../i18n';
import type { Profile } from './profile';
import { today } from './profile';
import { ROAD_CATALOG, playableRoads, type RoadDefinition } from './starroad';
import {
  defaultLandmarkState,
  landmarkState,
  metricDelta,
  storeFeatEvidence,
  storeGrownEvidence,
  storeBestEvidence,
  routeEffort,
  type LandmarkRoundEvent,
} from './landmarks';
import { balance, spend } from './wallet';
import { UNLOCKS } from './unlocks';
import type { RoadLandmarkId } from './m14types';
import type { EligibleRoundResult } from './homeworldLife';
import type { Mail, LetterDef } from './inbox';
import type { RoadLandmarkDef } from './m14types';

/** Three play stages and a delivery build; no currency or Road-point rewards. */
export const ROAD_LANDMARKS: readonly RoadLandmarkDef[] = [
  {
    id: 'rl_road01',
    roadId: 'road01',
    name: 'Sky Loom',
    stages: [
      {
        ask: 'Grow 12 Meadow, Forest or Savanna sectors, or 12 Marsh, Jungle or Highland sectors',
        routes: [
          {
            label: 'Meadow, Forest or Savanna sectors',
            metric: 'grown',
            target: 12,
            biomes: ['meadow', 'forest', 'savanna'],
            taught: 'sun',
          },
          {
            label: 'Marsh, Jungle or Highland sectors',
            metric: 'grown',
            target: 12,
            biomes: ['marsh', 'jungle', 'highland'],
            taught: 'storm',
          },
        ],
        reward: {},
      },
      {
        ask: 'Make 8 Fusions or 8 Supernovas',
        routes: [
          { label: 'Fusions', metric: 'fusions', target: 8, taught: 'steam' },
          { label: 'Supernovas', metric: 'supernovas', target: 8, taught: 'supernova' },
        ],
        reward: {},
      },
      {
        ask: 'Grow 12 Meadow, Forest or Savanna sectors, or 12 Marsh, Jungle or Highland sectors',
        routes: [
          {
            label: 'Meadow, Forest or Savanna sectors',
            metric: 'grown',
            target: 12,
            biomes: ['meadow', 'forest', 'savanna'],
            taught: 'sun',
          },
          {
            label: 'Marsh, Jungle or Highland sectors',
            metric: 'grown',
            target: 12,
            biomes: ['marsh', 'jungle', 'highland'],
            taught: 'storm',
          },
        ],
        reward: {},
      },
    ],
    delivery: { leaf: 20, dew: 20, stone: 20 },
    finish: 'Sky Loom decoration and Sky Weaver title',
    decoration: 'decor_sky_loom',
    title: 'title_sky_weaver',
  },
];
export const roadLandmarkDefinition = (id: RoadLandmarkId) => ROAD_LANDMARKS.find((site) => site.id === id);
export function roadLandmarkState(p: Profile, id: RoadLandmarkId) {
  return (p.home.roadLandmarks[id] ??= defaultLandmarkState());
}
/** Availability persists into Past Roads; only one build can be in progress. */
export function roadLandmarkOpen(p: Profile, id: RoadLandmarkId, catalog: readonly RoadDefinition[] = ROAD_CATALOG): boolean {
  const index = ROAD_LANDMARKS.findIndex((site) => site.id === id);
  if (index < 0 || landmarkState(p, 'keepers_beacon').stage !== 4) return false;
  const available = playableRoads(p, today(), catalog);
  if (!available.some((road) => road.id === ROAD_LANDMARKS[index].roadId)) return false;
  return ROAD_LANDMARKS.slice(0, index).every((site) => roadLandmarkState(p, site.id).stage === 4);
}
export function activeRoadLandmark(p: Profile, catalog: readonly RoadDefinition[] = ROAD_CATALOG) {
  return ROAD_LANDMARKS.find((site) => roadLandmarkOpen(p, site.id, catalog) && roadLandmarkState(p, site.id).stage < 4) ?? null;
}
export function roadLandmarkReady(p: Profile, id: RoadLandmarkId, catalog: readonly RoadDefinition[] = ROAD_CATALOG): boolean {
  const site = roadLandmarkDefinition(id);
  if (!site || !roadLandmarkOpen(p, id, catalog)) return false;
  const state = roadLandmarkState(p, id);
  if (state.stage === 4) return false;
  if (state.stage === 3) return Object.entries(site.delivery).every(([mat, n]) => balance(p, mat as 'leaf' | 'dew' | 'stone') >= n!);
  return site.stages[state.stage as 0 | 1 | 2].routes.some((route, lane) => (state.progress[state.stage * 2 + lane] ?? 0) >= route.target);
}
export function recordRoadLandmarkRound(
  p: Profile,
  event: LandmarkRoundEvent,
  catalog: readonly RoadDefinition[] = ROAD_CATALOG,
): EligibleRoundResult {
  const result: EligibleRoundResult = { earned: [], celebrations: [] };
  if (!event.won || !['campaign', 'voyage', 'zen', 'daily'].includes(event.mode) || !event.roundKey) return result;
  const site = activeRoadLandmark(p, catalog);
  if (!site) return result;
  const state = roadLandmarkState(p, site.id);
  // A ready build needs no more evidence; ignoring it must not grow the save forever.
  if (state.stage >= 3 || roadLandmarkReady(p, site.id, catalog) || state.rounds?.includes(event.roundKey)) return result;
  state.rounds = [...(state.rounds ?? []), event.roundKey].slice(-64);
  site.stages[state.stage as 0 | 1 | 2].routes.forEach((route, lane) => {
    const at = state.stage * 2 + lane;
    state.progress[at] = Math.min(route.target, (state.progress[at] ?? 0) + metricDelta(state, state.stage, route, event));
    storeFeatEvidence(state, state.stage, route, event);
    storeGrownEvidence(state, state.stage, route, event);
  });
  storeBestEvidence(state, event);
  return result;
}
/** Each stage is a deliberate build. Delivery is checked atomically before spending. */
export function buildRoadLandmarkStage(
  p: Profile,
  id: RoadLandmarkId,
  at = Date.now(),
  catalog: readonly RoadDefinition[] = ROAD_CATALOG,
): boolean {
  if (!roadLandmarkReady(p, id, catalog)) return false;
  const site = roadLandmarkDefinition(id)!;
  const state = roadLandmarkState(p, id);
  if (state.stage === 3)
    for (const [mat, n] of Object.entries(site.delivery)) spend(p, mat as 'leaf' | 'dew' | 'stone', n!, 'generic_spend');
  const key = `${id}:stage:${state.stage + 1}`;
  state.stage = (state.stage + 1) as typeof state.stage;
  if (!state.rewarded.includes(key)) state.rewarded.push(key);
  if (!p.home.seen.celebrations.includes(key)) p.home.seen.celebrations.push(key);
  if (state.stage === 4) {
    state.done = at;
    for (const gift of [site.decoration, site.title]) if (!p.wardrobe.includes(gift)) p.wardrobe.push(gift);
  }
  return true;
}
export const roadLandmarkName = () => t('Sky Loom');
export const roadLandmarkDecorationName = () => t('Sky Loom decoration');
export const roadLandmarkTitleName = () => t('Sky Weaver');
/** Package A calls this from checkMail and resolves these kinds with roadLandmarkLetter. */
export function roadLandmarkMail(p: Profile): number {
  let added = 0;
  for (const site of ROAD_LANDMARKS) {
    if (!roadLandmarkOpen(p, site.id)) continue;
    const done = roadLandmarkState(p, site.id).stage === 4;
    const id = `road-landmark-${done ? 'finish' : 'open'}-${site.id}`;
    if (p.mailSeen.includes(id) || p.mail.some((mail) => mail.id === id)) continue;
    p.mail.unshift({
      id,
      kind: done ? 'road_landmark_finish' : 'road_landmark_open',
      at: Date.now(),
      read: false,
      claimed: true,
      vars: { id: site.id },
    });
    p.mailSeen.push(id);
    added++;
  }
  return added;
}
export function roadLandmarkLetter(mail: Mail): LetterDef | null {
  if (!['road_landmark_open', 'road_landmark_finish'].includes(mail.kind) || !roadLandmarkDefinition(mail.vars?.id as RoadLandmarkId))
    return null;
  const name = roadLandmarkName();
  const done = mail.kind === 'road_landmark_finish';
  return {
    from: t('Mission Control'),
    title: done ? ROAD_LANDMARK_STRINGS.finishTitle(name) : ROAD_LANDMARK_STRINGS.openTitle(name),
    body: done
      ? ROAD_LANDMARK_STRINGS.finishBody(name, roadLandmarkDecorationName(), roadLandmarkTitleName())
      : ROAD_LANDMARK_STRINGS.openBody(name),
  };
}
export function lintRoadLandmarks(): string[] {
  const issues: string[] = [];
  for (const site of ROAD_LANDMARKS) {
    if (site.stages.length < 3 || site.stages.length > 4) issues.push(`${site.id}:stage count`);
    if (Object.keys(site.delivery).some((mat) => !['leaf', 'dew', 'stone'].includes(mat))) issues.push(`${site.id}:delivery`);
    for (const stage of site.stages) {
      if (stage.reward.dust || stage.reward.gems) issues.push(`${site.id}:reward`);
      if (stage.routes.length !== 2 || Math.abs(routeEffort(stage.routes[0]) - routeEffort(stage.routes[1])) > 1)
        issues.push(`${site.id}:effort`);
      for (const route of stage.routes)
        if ((UNLOCKS.find((row) => row.id === route.taught)?.planet ?? Infinity) > 29) issues.push(`${site.id}:teaching`);
    }
  }
  return issues;
}
export const ROAD_LANDMARK_STRINGS = {
  openTitle: (landmark: string) => t('{landmark} is ready to build', { landmark }),
  openBody: (landmark: string) => t('You can build {landmark} on the Floating Isle. Its steps stay open.', { landmark }),
  finishTitle: (landmark: string) => t('{landmark} is complete!', { landmark }),
  finishBody: (landmark: string, decoration: string, title: string) =>
    t('{landmark} is complete. Your {decoration} and {title} are ready.', { landmark, decoration, title }),
};

export function roadLandmarkAsk(stage: number): string {
  if (stage >= 3) return t('Bring Essences to finish this Landmark');
  return stage === 1
    ? t('Make 8 Fusions or 8 Supernovas')
    : t('Grow 12 Meadow, Forest or Savanna sectors, or 12 Marsh, Jungle or Highland sectors');
}
export function roadLandmarkRouteLabel(stage: number, lane: number): string {
  if (stage === 1) return lane === 0 ? t('Fusions') : t('Supernovas');
  return lane === 0 ? t('Meadow, Forest or Savanna sectors') : t('Marsh, Jungle or Highland sectors');
}

/** The panel names the next stage; celebrations name the one just completed. */
export function roadLandmarkCompletedStage(stage: number): string {
  return t('Stage {n} is complete!', { n: stage });
}
