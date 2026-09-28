import { describe, expect, it } from 'vitest';
import { BIOMES, landingLabBonus, newPlanet, type ImpactResult } from '../src/core/world';
import { earnedLandingProgress, tokensForLand, EVENTS } from '../src/meta/events';

describe('Object Lab churn limits', () => {
  const result = (before: number, after: number, id = 'bunny'): ImpactResult => ({
    before,
    after,
    changed: [0],
    spawned: [{ id, at: 0 }],
    lost: [],
  });

  it('pays Bloom only for a new regional best and Magnet only for a first arrival', () => {
    const planet = newPlanet(() => ({ land: 1, life: 1 }));
    const bests = planet.sectors.map((s) => BIOMES[s.biome].value);
    const arrived = new Set<string>();
    const original = bests[0];
    planet.sectors[0].biome = 'forest';
    expect(BIOMES.forest.value).toBeGreaterThan(original);
    expect(landingLabBonus(5, result(10, 15), planet, bests, arrived)).toBe(11);
    planet.sectors[0].biome = 'meadow';
    expect(landingLabBonus(5, result(15, 16), planet, bests, arrived)).toBe(3);
    planet.sectors[0].biome = 'jungle';
    expect(landingLabBonus(5, result(16, 18), planet, bests, arrived)).toBe(5);
  });

  it('pays nothing for a worse throw and does not repay its arrival or best later', () => {
    const planet = newPlanet(() => ({ land: 1, life: 1 }));
    const bests = planet.sectors.map((s) => BIOMES[s.biome].value);
    const arrived = new Set<string>();
    planet.sectors[0].biome = 'forest';
    expect(landingLabBonus(5, result(20, 10), planet, bests, arrived)).toBe(0);
    expect(landingLabBonus(5, result(10, 15), planet, bests, arrived)).toBe(3);
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
    landingLabBonus(5, result(10, 15), planet, bests, arrived);
    const repeat = earnedLandingProgress(result(15, 16), planet, bests, arrived);
    expect(repeat).toEqual({ regions: [], arrivals: 0, firstArrivals: new Set() });
    expect(tokensForLand(EVENTS[0], repeat.regions, repeat.arrivals)).toBe(0);
    expect(earnedLandingProgress(result(16, 10), planet, bests, arrived)).toEqual({ regions: [], arrivals: 0, firstArrivals: new Set() });
  });
});
