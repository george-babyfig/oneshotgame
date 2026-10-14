import { describe, expect, it } from 'vitest';
import { newPlanet } from '../src/core/world';
import { dropsFor, unlockedConstellation } from '../src/meta/constellations';
import { titlesOwned } from '../src/meta/passport';
import { defaultProfile } from '../src/meta/profile';
import { ALL_COMBO_STAMPS, recordCombo, recordReaction } from '../src/meta/reactions';
import { hasSticker, pageStickers } from '../src/meta/stickers';

describe('reaction discoveries', () => {
  it('pays each discovery once and derives its sticker and title', () => {
    const p = defaultProfile();
    p.level = 32;
    expect(recordReaction(p, 'steam')).toEqual({ first: true, stardust: 50, sticker: 'r_steam' });
    expect(recordReaction(p, 'steam')).toEqual({ first: false, stardust: 0 });
    expect(p.dust).toBe(50);
    expect(hasSticker(p, 'r_steam')).toBe(true);
    for (const id of ['rainGarden', 'wildflowers', 'glacier'] as const) recordReaction(p, id);
    expect(p.dust).toBe(200);
    expect(titlesOwned(p).some((title) => title.text === 'Little Chemist')).toBe(true);
    expect(recordReaction(p, 'scorch')).toEqual({ first: true, stardust: 0 });
    expect(p.dust).toBe(200);
    expect(p.fusionsFound).toContain('scorch');
    expect(hasSticker(p, 'r_scorch')).toBe(false);
    expect(pageStickers('feat').some((sticker) => sticker.id === 'r_scorch')).toBe(false);
  });

  it('pays thirteen first stamps and keeps the best Combo', () => {
    const p = defaultProfile();
    p.level = 26;
    expect(recordCombo(p, 4).first).toBe(3);
    expect(recordCombo(p, 4).first).toBe(0);
    for (const id of ['steam', 'rainGarden', 'wildflowers', 'glacier'] as const) {
      recordCombo(p, 2, id);
      recordCombo(p, 2, id, true);
    }
    expect(p.combo).toEqual({ best: 4, stamps: ALL_COMBO_STAMPS });
    expect(p.dust).toBe(13 * 30);
    expect(hasSticker(p, 'combo_12')).toBe(true);
    expect(titlesOwned(p).some((title) => title.text === 'Chain Maker')).toBe(true);
  });
});

describe('frost and Atlas', () => {
  it('pays exactly one frost for each frozen sector on a win', () => {
    const world = newPlanet();
    world.sectors[0].biome = 'tundra';
    world.sectors[1].biome = 'taiga';
    world.sectors[2].biome = 'icesheet';
    expect(dropsFor(world, 1).frost).toBe(3);
    expect(dropsFor(world, 3).frost).toBe(3);
  });

  it('opens the next two neighbouring unfinished constellations', () => {
    const p = defaultProfile();
    p.level = 23;
    expect([0, 1, 2].map((i) => unlockedConstellation(p, i))).toEqual([true, true, false]);
    p.constellations.push('otter');
    expect([0, 1, 2, 3].map((i) => unlockedConstellation(p, i))).toEqual([true, true, true, false]);
    p.constellations.push('mill');
    expect([1, 2, 3, 4].map((i) => unlockedConstellation(p, i))).toEqual([true, true, true, false]);
  });
});
