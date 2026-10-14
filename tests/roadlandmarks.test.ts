import { afterEach, expect, it, vi } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';
import * as roads from '../src/meta/starroad';
import { ROAD01 } from '../src/meta/content/road01';
import {
  ROAD_LANDMARKS,
  roadLandmarkOpen,
  roadLandmarkState,
  recordRoadLandmarkRound,
  buildRoadLandmarkStage,
  roadLandmarkReady,
  roadLandmarkMail,
  roadLandmarkLetter,
  lintRoadLandmarks,
} from '../src/meta/roadLandmarks';
import { ownedIsleDecorations, setIsleDecoration, mergeHomeCelebrations } from '../src/meta/homeworld';
import { passportStats, titlesOwned } from '../src/meta/passport';
import { settleHomeworldRound } from '../src/meta/roundSettlement';
import { makeLevel } from '../src/core/levels';
import type { LandmarkRoundEvent } from '../src/meta/landmarks';

const catalog = [roads.ROAD_CATALOG[0], { ...ROAD01.road, opensOn: '2026-02-26' }];
const id = ROAD_LANDMARKS[0].id;
function readyProfile() {
  const p = defaultProfile(Date.UTC(2026, 1, 26, 12));
  p.level = 121;
  p.home.level = 5;
  p.home.firstHour = 2;
  for (const state of Object.values(p.home.landmarks)) state.stage = 4;
  p.cometPier.stage = 4;
  return p;
}
function event(mode: LandmarkRoundEvent['mode'] = 'campaign', key = 'a'): LandmarkRoundEvent {
  return {
    mode,
    roundKey: key,
    planetKey: `${mode}:${key}`,
    won: true,
    stars: 3,
    newStars: 0,
    difficulty: 'normal',
    at: Date.now(),
    firstArrivals: [],
    improvedSectors: { meadow: 12, marsh: 12 },
    improvedSectorIds: { meadow: Array.from({ length: 12 }, (_, i) => i), marsh: Array.from({ length: 12 }, (_, i) => i + 12) },
    fusions: 10,
    supernovas: 10,
    settledTroubles: 0,
  };
}
function scenario() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-26T12:00:00Z'));
  const playable = roads.playableRoads;
  vi.spyOn(roads, 'playableRoads').mockImplementation((p, day) => playable(p, day, catalog));
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it('B11 has four builds, taught equal-effort alternatives and safe delivery', () => {
  expect(lintRoadLandmarks()).toEqual([]);
  expect(ROAD_LANDMARKS).toHaveLength(1);
  expect(ROAD_LANDMARKS[0].stages).toHaveLength(3);
});
it('opens after its Road and Beacon, remains open as a Past Road and never needs a Pass', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-25T12:00:00Z'));
  const p = readyProfile();
  p.roadSeenDay = '';
  expect(roadLandmarkOpen(p, id, catalog)).toBe(false);
  vi.setSystemTime(new Date('2026-02-26T12:00:00Z'));
  p.home.landmarks.keepers_beacon.stage = 3;
  expect(roadLandmarkOpen(p, id, catalog)).toBe(false);
  p.home.landmarks.keepers_beacon.stage = 4;
  expect(roadLandmarkOpen(p, id, catalog)).toBe(true);
  vi.setSystemTime(new Date('2027-03-01T12:00:00Z'));
  expect(roadLandmarkOpen(p, id, [...catalog, { ...catalog[1], id: 'road02', opensOn: '2027-01-01' }])).toBe(true);
  expect(p.pass).toBe(false);
});
it.each(['campaign', 'voyage', 'zen', 'daily'] as const)('counts %s, pauses ready stages until Build and grants no Road points', (mode) => {
  scenario();
  const p = readyProfile();
  const points = p.roadPoints;
  recordRoadLandmarkRound(p, event(mode), catalog);
  expect(roadLandmarkState(p, id).stage).toBe(0);
  expect(roadLandmarkReady(p, id, catalog)).toBe(true);
  expect(buildRoadLandmarkStage(p, id, Date.now(), catalog)).toBe(true);
  expect(roadLandmarkState(p, id).stage).toBe(1);
  expect(roadLandmarkState(p, id).progress.slice(2, 4)).toEqual([0, 0]);
  expect(p.roadPoints).toBe(points);
});
it.each(['remix', 'rush', 'challenge', 'practice'] as const)('rejects %s', (mode) => {
  scenario();
  const p = readyProfile();
  recordRoadLandmarkRound(p, event(mode), catalog);
  expect(roadLandmarkReady(p, id, catalog)).toBe(false);
});
it('rejects losses and duplicate settlement and remembers a best replay per sector/feat', () => {
  scenario();
  const p = readyProfile();
  const e = event();
  e.improvedSectorIds = { meadow: [0, 1] };
  e.improvedSectors = { meadow: 2 };
  recordRoadLandmarkRound(p, { ...e, won: false }, catalog);
  expect(roadLandmarkState(p, id).progress[0]).toBe(0);
  recordRoadLandmarkRound(p, e, catalog);
  recordRoadLandmarkRound(p, e, catalog);
  recordRoadLandmarkRound(p, { ...e, roundKey: 'replay' }, catalog);
  expect(roadLandmarkState(p, id).progress[0]).toBe(2);
  e.improvedSectorIds.meadow!.push(2);
  recordRoadLandmarkRound(p, { ...e, roundKey: 'better' }, catalog);
  expect(roadLandmarkState(p, id).progress[0]).toBe(3);
  p.home.roadLandmarks[id]!.stage = 1;
  recordRoadLandmarkRound(p, { ...e, roundKey: 'fusion', fusions: 3 }, catalog);
  recordRoadLandmarkRound(p, { ...e, roundKey: 'fusion-replay', fusions: 3 }, catalog);
  expect(roadLandmarkState(p, id).progress[2]).toBe(3);
});
it.each([0, 1])('alternative %i alone completes every feat stage', (lane) => {
  scenario();
  const p = readyProfile();
  for (const stage of [0, 1, 2] as const) {
    const e = event('campaign', `stage-${stage}`);
    if (lane === 0) {
      e.improvedSectors = { meadow: 12 };
      e.improvedSectorIds = { meadow: e.improvedSectorIds!.meadow };
      e.supernovas = 0;
    } else {
      e.improvedSectors = { marsh: 12 };
      e.improvedSectorIds = { marsh: e.improvedSectorIds!.marsh };
      e.fusions = 0;
    }
    recordRoadLandmarkRound(p, e, catalog);
    expect(roadLandmarkReady(p, id, catalog)).toBe(true);
    expect(buildRoadLandmarkStage(p, id, Date.now(), catalog)).toBe(true);
  }
  expect(roadLandmarkState(p, id).stage).toBe(3);
});
it('delivery spends atomically once, gifts do not place themselves, Passport and mail persist', () => {
  scenario();
  const p = readyProfile();
  roadLandmarkState(p, id).stage = 3;
  p.mats = { ...p.mats, leaf: 20, dew: 20, stone: 19 };
  const before = { ...p.mats };
  expect(buildRoadLandmarkStage(p, id, Date.now(), catalog)).toBe(false);
  expect(p.mats).toEqual(before);
  expect(roadLandmarkMail(p)).toBe(1);
  expect(roadLandmarkMail(p)).toBe(0);
  expect(roadLandmarkLetter(p.mail[0])?.body).toContain('Its steps stay open.');
  p.mats.stone = 20;
  expect(buildRoadLandmarkStage(p, id, Date.now(), catalog)).toBe(true);
  expect(buildRoadLandmarkStage(p, id, Date.now(), catalog)).toBe(false);
  expect([p.mats.leaf, p.mats.dew, p.mats.stone]).toEqual([0, 0, 0]);
  expect(p.home.isleDecor).toEqual([null, null, null]);
  expect(ownedIsleDecorations(p)).toContain('decor_sky_loom');
  expect(setIsleDecoration(p, 1, 'decor_sky_loom')).toBe(true);
  expect(titlesOwned(p).find((title) => title.id === 'title_sky_weaver')?.text).toBe('Sky Weaver');
  expect(passportStats(p).find((stat) => stat.label === 'Road Landmarks')?.value).toBe(1);
  expect(roadLandmarkMail(p)).toBe(1);
  expect(roadLandmarkMail(p)).toBe(0);
  expect(roadLandmarkLetter(p.mail[0])?.body).toContain('Sky Loom decoration');
  expect(p.wardrobe.filter((gift) => gift === 'decor_sky_loom')).toHaveLength(1);
  expect(mergeHomeCelebrations(p)).toContain('rl_road01:stage:4');
  const loaded = migrate(JSON.parse(JSON.stringify(p)));
  expect(loaded.home.roadLandmarks[id]).toEqual(p.home.roadLandmarks[id]);
  expect(loaded.home.isleDecor[1]).toBe('decor_sky_loom');
  expect(titlesOwned(loaded).some((title) => title.id === 'title_sky_weaver')).toBe(true);
  expect(roadLandmarkMail(loaded)).toBe(0);
});
it('roundSettlement credits real step evidence only when progress is written', () => {
  scenario();
  const p = readyProfile();
  const level = makeLevel(30);
  const round = {
    mode: 'zen' as const,
    roundKey: 'settled',
    planetKey: 'zen:a',
    planet: level.start,
    won: true,
    writesProgress: true,
    stars: 3,
    difficulty: level.difficulty,
    newStars: 0,
    buddySpecies: null,
    at: Date.now(),
    steps: [{ ...event(), settledVent: 0, settledVine: 0, reactions: {} }],
  };
  settleHomeworldRound(p, { ...round, writesProgress: false });
  expect(roadLandmarkReady(p, id, catalog)).toBe(false);
  settleHomeworldRound(p, round);
  expect(roadLandmarkReady(p, id, catalog)).toBe(true);
});

it('a ready stage stops saving evidence while the child keeps playing', () => {
  scenario();
  const p = readyProfile();
  recordRoadLandmarkRound(p, event(), catalog);
  const saved = structuredClone(roadLandmarkState(p, id));
  for (let day = 1; day <= 180; day++) recordRoadLandmarkRound(p, event('daily', `day:${day}`), catalog);
  expect(roadLandmarkState(p, id)).toEqual(saved);
  expect(buildRoadLandmarkStage(p, id, Date.now(), catalog)).toBe(true);
});
