import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate, totalStars } from '../src/meta/profile';
import {
  addRoadPoints,
  claimRoad,
  COSMIC_ROAD_ID,
  currentRoad,
  FREE_ROAD_GEMS,
  grantProfileRoadPoints,
  grantRoadPass,
  grantRoadPoints,
  newRoadState,
  pastRoads,
  ROAD_CATALOG,
  ROAD_PACING,
  roadCap,
  roadCloseOn,
  roadHasPass,
  roadReady,
  STAR_ROAD,
  type RoadDefinition,
} from '../src/meta/starroad';
import { readFileSync } from 'node:fs';

const roadOne: RoadDefinition = {
  id: 'road01',
  name: 'Second Road',
  opensOn: '2026-01-02',
  tiers: [{ id: 'road01:tier00', stars: 5, reward: { gems: 5 }, pass: { item: 'l_orbit' } }],
};

describe('Star Roads', () => {
  it('has 20 stable ten-point steps, 150 free gems, and a 51-day simulated Regular pace', () => {
    expect(COSMIC_ROAD_ID).toBe('road00');
    expect(STAR_ROAD.map((tier) => tier.id)).toEqual(STAR_ROAD.map((_, i) => `road00:tier${String(i).padStart(2, '0')}`));
    expect(STAR_ROAD.map((tier) => tier.stars)).toEqual(Array.from({ length: 20 }, (_, i) => (i + 1) * 10));
    expect(FREE_ROAD_GEMS).toBe(150);
    expect(STAR_ROAD.reduce((n, tier) => n + Number(!!tier.pass.item) + Number(!!tier.pass.skin), 0)).toBe(12);
    expect(ROAD_PACING.regularDays).toBeGreaterThanOrEqual(42);
    expect(ROAD_PACING.regularDays).toBeLessThanOrEqual(56);
    expect(STAR_ROAD.every((tier) => !tier.pass.gems && !tier.pass.dust && !tier.pass.boosters && !tier.pass.launcher)).toBe(true);
  });

  it('shares a cap across existing new-star delta callers without changing campaign stars', () => {
    const p = defaultProfile(0);
    expect(addRoadPoints(p, 3, '2026-09-29')).toBe(3);
    expect(addRoadPoints(p, 3, '2026-09-29')).toBe(1);
    expect(addRoadPoints(p, 1, '2026-09-29')).toBe(0);
    expect(p.roadPoints).toBe(4);
    expect(totalStars(p)).toBe(0);
    expect(addRoadPoints(p, 2, '2026-09-30')).toBe(2);
    expect(addRoadPoints(p, 3, '2026-09-29')).toBe(2);
    expect(p.roadDay).toEqual({ day: '2026-09-30', earned: 4 });
  });

  it('credits stable events once, handles retries and clock rollback, and opens catch-up at day 42', () => {
    const state = newRoadState();
    state.plannedEndOn = '2026-02-25';
    const star = { source: 'campaign' as const, date: '2026-01-01', earningKey: 'planet:1:star:1', delta: 3 };
    expect(grantRoadPoints(state, star)).toBe(3);
    expect(grantRoadPoints(state, star)).toBe(0);
    expect(grantRoadPoints(state, { ...star, source: 'wish', delta: 3 })).toBe(1);
    expect(grantRoadPoints(state, { ...star, earningKey: 'planet:2:star:1' })).toBe(0);
    expect(grantRoadPoints(state, { ...star, date: '2026-01-02', earningKey: 'planet:2:star:1' })).toBe(3);
    expect(grantRoadPoints(state, { ...star, date: '2025-12-31', earningKey: 'planet:3:star:1' })).toBe(1);
    expect(state.points).toBe(8);
    expect(state.lastCreditedDay).toBe('2026-01-02');
    expect(grantRoadPoints(state, { ...star, date: '2026-02-12', earningKey: 'catchup:one', delta: 3 })).toBe(3);
    expect(grantRoadPoints(state, { ...star, date: '2026-02-12', earningKey: 'catchup:two', delta: 3 })).toBe(3);
    expect(grantRoadPoints(state, { ...star, date: '2026-02-12', earningKey: 'catchup:three', delta: 3 })).toBe(2);
    expect(grantRoadPoints(state, { ...star, date: '2026-02-12', earningKey: 'second', delta: 1 })).toBe(0);
    expect(roadCap(state, '2026-02-26')).toBe(4);
  });

  it('uses the Road close date for every child, with no personal Road 0 catch-up window', () => {
    expect(roadCloseOn('road00')).toBeUndefined();
    expect(roadCloseOn('road00', [...ROAD_CATALOG, roadOne])).toBe('2026-01-01');
    const p = defaultProfile(0);
    grantProfileRoadPoints(p, { source: 'daily', date: '2026-09-01', earningKey: 'one', delta: 3 });
    expect(p.roadRecords.road00.plannedEndOn).toBeUndefined();
    expect(roadCap(p.roadRecords.road00, '2026-11-01')).toBe(4);
  });

  it('waits for installed content, then fills the oldest unfinished Past Road before the current one', () => {
    const p = defaultProfile(0);
    p.roadRecords.road00.points = 199;
    p.roadPoints = 199;
    expect(currentRoad(p, '2027-01-01').id).toBe('road00');
    expect(pastRoads(p, '2027-01-01')).toEqual([]);
    const catalog = [...ROAD_CATALOG, roadOne];
    expect(currentRoad(p, '2026-01-03', catalog).id).toBe('road01');
    expect(pastRoads(p, '2026-01-03', catalog).map((road) => road.id)).toEqual(['road00']);
    const event = { source: 'daily' as const, date: '2026-01-03', earningKey: 'daily:2026-01-03:star:1', delta: 3 };
    expect(grantProfileRoadPoints(p, event, catalog)).toBe(3);
    expect(p.roadRecords.road00.points).toBe(200);
    expect(p.roadRecords.road01.points).toBe(2);
    expect(grantProfileRoadPoints(p, event, catalog)).toBe(0);
    expect(p.roadDay.earned).toBe(3);
  });

  it('gives one point per keyed Wish under the shared daily cap', () => {
    const p = defaultProfile(0);
    expect(grantProfileRoadPoints(p, { source: 'campaign', date: '2026-01-01', earningKey: 'planet:1', delta: 3 })).toBe(3);
    const wish = { source: 'wish' as const, date: '2026-01-01', earningKey: 'wish:2026-01-01:one', delta: 9 };
    expect(grantProfileRoadPoints(p, wish)).toBe(1);
    expect(grantProfileRoadPoints(p, wish)).toBe(0);
    expect(grantProfileRoadPoints(p, { ...wish, earningKey: 'wish:2026-01-01:two' })).toBe(0);
    expect(p.roadRecords.road00.points).toBe(4);
  });

  it('claims both lanes once and backfills reached paid looks on pass ownership', () => {
    const p = defaultProfile(0);
    p.roadRecords.road00.points = 20;
    p.roadPoints = 20;
    expect(roadReady(p)).toEqual([0, 1]);
    const first = claimRoad(p, 0);
    expect(first).toEqual([STAR_ROAD[0].reward]);
    expect(claimRoad(p, 0)).toEqual([]);
    expect(roadReady(p)).not.toContain(5);
    const gems = p.gems;
    const paid = grantRoadPass(p);
    expect(paid).toEqual([STAR_ROAD[0].pass, STAR_ROAD[1].pass]);
    expect(p.gems).toBe(gems);
    expect(p.roadRecords.road00.claimedFreeTierIds).toEqual([STAR_ROAD[0].id]);
    expect(grantRoadPass(p)).toEqual([]);
    p.pass = false; // a refund removes access to looks without touching earned value
    expect(roadHasPass(p, COSMIC_ROAD_ID)).toBe(false);
    expect(p.roadRecords.road00.claimedPaidTierIds).toEqual([STAR_ROAD[0].id, STAR_ROAD[1].id]);
    p.pass = true;
    expect(roadHasPass(p, COSMIC_ROAD_ID)).toBe(true);
  });

  it('migrates the pre-M12 save golden without repaying prior tier grants', () => {
    const raw = JSON.parse(readFileSync('tests/fixtures/road/pre-m12-partial.v5.json', 'utf8'));
    const p = migrate(raw);
    expect(p.roadRecords.road00.points).toBe(55);
    expect(p.roadRecords.road00.claimedFreeTierIds).toEqual([STAR_ROAD[0].id, STAR_ROAD[1].id, STAR_ROAD[5].id]);
    expect(p.roadRecords.road00.legacyGrantIds).toContain('legacy:paid:03');
    expect(p.gems).toBe(raw.gems);
    expect(p.dust).toBe(raw.dust);
    expect(p.processedTx).toEqual(raw.processedTx);
    expect(claimRoad(p, 0)).toEqual([]);
    expect(p.gems).toBe(raw.gems);
    const twice = migrate(JSON.parse(JSON.stringify(p)));
    expect(twice.roadRecords).toEqual(p.roadRecords);
    expect(twice.gems).toBe(p.gems);
  });

  it('keeps future Road passes separate from Cosmic Road ownership', () => {
    const p = defaultProfile(0);
    p.roadRecords.road01 = newRoadState();
    p.roadRecords.road01.points = 5;
    expect(grantRoadPass(p, 'road01', [...ROAD_CATALOG, roadOne])).toEqual([roadOne.tiers[0].pass]);
    expect(p.pass).toBe(false);
    expect(roadHasPass(p, 'road01')).toBe(true);
    expect(roadHasPass(p, COSMIC_ROAD_ID)).toBe(false);
  });

  it('records the free finish sticker once', () => {
    const p = defaultProfile(0);
    p.roadRecords.road00.points = 200;
    p.roadPoints = 200;
    expect(claimRoad(p, 19)).toEqual([STAR_ROAD[19].reward]);
    expect(p.roadStickers).toEqual(['cosmic_road']);
    expect(claimRoad(p, 19)).toEqual([]);
    expect(migrate(JSON.parse(JSON.stringify(p))).roadStickers).toEqual(['cosmic_road']);
  });
});
