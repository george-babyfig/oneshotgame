import { describe, expect, it } from 'vitest';
import { defaultProfile, totalStars } from '../src/meta/profile';
import { addRoadPoints } from '../src/meta/roadpoints';

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
});
