import { describe, expect, it } from 'vitest';
import { biomeOf, impact, lifeScore, newPlanet, SPECIES } from '../src/core/world';
import { makeLevel, greedyScore } from '../src/core/levels';

describe('biomes', () => {
  it('maps sector values to biomes', () => {
    expect(biomeOf({ land: 1, water: 0, heat: 0, life: 0 })).toBe('barren');
    expect(biomeOf({ land: 1, water: 3, heat: 0, life: 0 })).toBe('ocean');
    expect(biomeOf({ land: 1, water: 3, heat: 0, life: 1 })).toBe('reef');
    expect(biomeOf({ land: 3, water: 0, heat: 2, life: 0 })).toBe('volcano');
    expect(biomeOf({ land: 1, water: 0, heat: 0, life: 2 })).toBe('forest');
    expect(biomeOf({ land: 1, water: 0, heat: 1, life: 2 })).toBe('jungle');
    expect(biomeOf({ land: 1, water: 0, heat: -2, life: 1 })).toBe('taiga');
  });
});

describe('impacts', () => {
  it('ice makes ocean and spawns fish', () => {
    const p = newPlanet();
    const r = impact(p, 'ice', 5);
    expect(p.sectors[5].biome).toBe('ocean');
    expect(r.after).toBeGreaterThan(r.before);
    expect(r.spawned.map((s) => s.id)).toContain('fish');
  });
  it('seeds grow a forest and a deer', () => {
    const p = newPlanet();
    impact(p, 'seed', 3);
    expect(p.sectors[3].biome).toBe('forest');
    expect(p.speciesFound).toContain('deer');
    expect(lifeScore(p)).toBeGreaterThan(0);
  });
  it('species ids are unique', () => {
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
  });
});

describe('levels', () => {
  it('generates beatable levels', () => {
    for (let n = 1; n <= 40; n++) {
      const L = makeLevel(n);
      expect(L.queue.length).toBeGreaterThanOrEqual(L.throws);
      expect(L.stars[0]).toBeLessThan(L.stars[1]);
      expect(L.stars[1]).toBeLessThan(L.stars[2]);
      expect(greedyScore(L.start, L.queue, L.throws)).toBeGreaterThanOrEqual(L.stars[2]);
    }
  });
});
