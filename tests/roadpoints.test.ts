import { describe, expect, it } from 'vitest';
import { defaultProfile, totalStars } from '../src/meta/profile';
import { addRoadPoints, COSMIC_ROAD_ID, STAR_ROAD, grantRoadPoints, type RoadState } from '../src/meta/starroad';

describe('Road points', () => {
  it('shares a cap across sources and leaves campaign stars alone', () => {
    const p = defaultProfile(0);
    expect(addRoadPoints(p, 3, '2026-09-29')).toBe(3);
    expect(addRoadPoints(p, 3, '2026-09-29')).toBe(1);
    expect(addRoadPoints(p, 1, '2026-09-29')).toBe(0);
    expect(p.roadPoints).toBe(4);
    expect(totalStars(p)).toBe(0);
    expect(addRoadPoints(p, 2, '2026-09-30')).toBe(2);
    expect(p.roadPoints).toBe(6);
    expect(addRoadPoints(p, 3, '2026-09-29')).toBe(2);
    expect(p.roadDay.day).toBe('2026-09-30');
  });

  it('gives Road 0 stable tier IDs without changing its thresholds', () => {
    expect(COSMIC_ROAD_ID).toBe('road00');
    expect(STAR_ROAD.map((tier) => tier.id)).toEqual(STAR_ROAD.map((_, i) => `road00:tier${String(i).padStart(2, '0')}`));
    expect(STAR_ROAD.map((tier) => tier.stars)).toEqual([5, 12, 20, 30, 42, 55, 70, 85, 100, 120, 140, 165, 190, 220, 260]);
  });

  it('credits keyed events once across retries, source changes, caps, and clock rollback', () => {
    const state: RoadState = {
      points: 0,
      claimedFreeTierIds: [],
      claimedPaidTierIds: [],
      lastCreditedDay: '',
      earnedOnLastCreditedDay: 0,
      creditedEarningKeys: [],
    };
    const star = { source: 'campaign' as const, date: '2026-09-29', earningKey: 'planet:1:star:1', delta: 3 };
    expect(grantRoadPoints(state, star)).toBe(3);
    expect(grantRoadPoints(state, star)).toBe(0);
    expect(grantRoadPoints(state, { ...star, source: 'wish', delta: 3 })).toBe(1);
    expect(grantRoadPoints(state, { ...star, earningKey: 'planet:2:star:1' })).toBe(0);
    expect(grantRoadPoints(state, { ...star, date: '2026-09-30', earningKey: 'planet:2:star:1' })).toBe(3);
    expect(grantRoadPoints(state, { ...star, date: '2026-09-29', earningKey: 'planet:3:star:1' })).toBe(1);
    expect(state).toMatchObject({ points: 8, lastCreditedDay: '2026-09-30', earnedOnLastCreditedDay: 4 });
  });
});
