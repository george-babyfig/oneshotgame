import { describe, expect, it } from 'vitest';
import { BIOMES, newPlanet, type ImpactResult } from '../src/core/world';
import { earnedLandingProgress, tokensForLand, EVENTS } from '../src/meta/events';

describe('Object Lab churn limits', () => {
  const result = (before: number, after: number, id = 'bunny'): ImpactResult => ({
    before,
    after,
    changed: [0],
    spawned: [{ id, at: 0 }],
    lost: [],
  });

  it('counts event tokens and land progress only for first arrivals and new regional bests', () => {
    const planet = newPlanet(() => ({ land: 1, life: 1 }));
    const bests = planet.sectors.map((s) => BIOMES[s.biome].value);
    const arrived = new Set<string>();
    planet.sectors[0].biome = 'volcano';
    bests[0] = -Infinity;
    const first = earnedLandingProgress(result(10, 15), planet, bests, arrived);
    expect(first).toEqual({ regions: ['volcano'], arrivals: 1, firstArrivals: new Set(['bunny']) });
    expect(tokensForLand(EVENTS[0], first.regions, first.arrivals)).toBe(1);
    expect(tokensForLand(EVENTS[3], first.regions, first.arrivals)).toBe(2);
    bests[0] = BIOMES[planet.sectors[0].biome].value;
    arrived.add('bunny');
    const repeat = earnedLandingProgress(result(15, 16), planet, bests, arrived);
    expect(repeat).toEqual({ regions: [], arrivals: 0, firstArrivals: new Set() });
    expect(tokensForLand(EVENTS[0], repeat.regions, repeat.arrivals)).toBe(0);
    expect(earnedLandingProgress(result(16, 10), planet, bests, arrived)).toEqual({ regions: [], arrivals: 0, firstArrivals: new Set() });
  });
});
