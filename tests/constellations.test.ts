import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { newPlanet } from '../src/core/world';
import { owns } from '../src/meta/cosmetics';
import {
  CONSTELLATIONS,
  addDrops,
  canFill,
  constellationsReady,
  dropsFor,
  fillBundle,
  lightConstellation,
  unlockedConstellation,
} from '../src/meta/constellations';

describe('constellations', () => {
  it('drops materials from the lands on a planet (more for 3 stars)', () => {
    const p = newPlanet((i) => (i < 6 ? { water: 3 } : {}));
    p.sectors.forEach((s, i) => (s.biome = i < 6 ? 'ocean' : i < 10 ? 'forest' : 'barren'));
    expect(dropsFor(p, 1)).toEqual({ dew: 3, leaf: 2 });
    expect(dropsFor(p, 3)).toEqual({ dew: 4, leaf: 3 });
  });

  it('fills bundles in order, lights the constellation once, and grants its item', () => {
    const p = defaultProfile();
    const c = CONSTELLATIONS[0];
    expect(unlockedConstellation(p, 1)).toBe(false);
    expect(canFill(p, c.bundles[0])).toBe(false);
    addDrops(p, { dew: 20, leaf: 10, stone: 10 });
    expect(constellationsReady(p)).toBe(1);
    for (const b of c.bundles) expect(fillBundle(p, c.id, b.id)).toBe(true);
    expect(fillBundle(p, c.id, c.bundles[0].id)).toBe(false); // already filled
    expect(p.mats.dew).toBe(20 - 6 - 3 - 4);
    const gems = p.gems;
    expect(owns(p, c.reward.item!)).toBe(false);
    expect(lightConstellation(p, c.id)?.gems).toBe(c.reward.gems);
    expect(p.gems).toBe(gems + (c.reward.gems ?? 0));
    expect(lightConstellation(p, c.id)).toBeNull();
    expect(owns(p, c.reward.item!)).toBe(true);
    expect(unlockedConstellation(p, 1)).toBe(true);
  });

  it('every reward item exists and is only earned from its constellation', async () => {
    const { COSMETIC_BY_ID } = await import('../src/meta/cosmetics');
    for (const c of CONSTELLATIONS) {
      const x = COSMETIC_BY_ID[c.reward.item!];
      expect(x, c.id).toBeDefined();
      expect(x.source).toBe('constellation');
      expect(x.unlock).toBe(c.id);
    }
  });
});
