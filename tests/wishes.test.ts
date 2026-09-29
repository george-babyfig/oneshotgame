import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { clonePlanet, newPlanet, type Planet } from '../src/core/world';
import {
  claimWish,
  ensureWishes,
  recordWishCombo,
  recordWishReaction,
  recordWishRound,
  swapWish,
  WISH_TEMPLATES,
} from '../src/meta/wishes';
import { totalStars } from '../src/meta/profile';

const day = '2026-09-28';
function player() {
  const p = defaultProfile(0);
  p.level = 12;
  p.seen = ['deer', 'otter', 'goat'];
  return p;
}
function matchingPlanet(card: ReturnType<typeof ensureWishes>[number]): Planet {
  const def = WISH_TEMPLATES.find((x) => x.id === card.template)!;
  const planet = newPlanet();
  if (def.feat === 'creature') for (let i = 0; i < def.goal; i++) planet.sectors[i].species = ['deer', 'goat', 'otter', 'fish', 'bunny'][i];
  else if (def.feat === 'land') for (let i = 0; i < def.goal; i++) planet.sectors[i].biome = def.land!;
  else {
    planet.sectors[0].biome = def.land!;
    planet.sectors[1].biome = def.near!;
  }
  return planet;
}

describe('Wishes', () => {
  it('seeds the same cards for the same date and seen creatures', () => {
    expect(ensureWishes(player(), day)).toEqual(ensureWishes(player(), day));
    expect(ensureWishes(player(), day)).toHaveLength(3);
    expect(ensureWishes(player(), day).every((q) => ['deer', 'otter', 'goat'].includes(q.species))).toBe(true);
  });
  it('keeps unfinished Wishes across dates and replaces claimed ones', () => {
    const p = player();
    const cards = ensureWishes(p, day);
    const old = cards[0];
    old.progress = old.goal;
    expect(claimWish(p, old.id)).toBe(true);
    const next = ensureWishes(p, '2026-09-29');
    expect(next.map((q) => q.id)).not.toContain(old.id);
    expect(next.map((q) => q.id)).toContain(cards[1].id);
  });
  it('offers one free swap per day', () => {
    const p = player();
    const id = ensureWishes(p, day)[0].id;
    expect(swapWish(p, id, day)).toBe(true);
    expect(swapWish(p, p.quests.list[0].id, day)).toBe(false);
    expect(swapWish(p, p.quests.list[0].id, '2026-09-29')).toBe(true);
  });
  it('keeps progress when a swap is requested', () => {
    const p = player();
    const card = ensureWishes(p, day)[0];
    card.progress = 1;
    expect(swapWish(p, card.id, day)).toBe(false);
    expect((p.quests.list[0] as typeof card).progress).toBe(1);
  });
  it('counts only allowed modes and pays each card plus the all-three bonus once', () => {
    const p = player();
    const cards = ensureWishes(p, day);
    const gems = p.gems;
    const dust = p.dust;
    const stars = totalStars(p);
    for (const card of cards) {
      const planet = matchingPlanet(card);
      const before = card.progress;
      recordWishRound(p, 'rush', planet, day);
      expect(card.progress).toBe(before);
      recordWishRound(p, 'campaign', planet, day);
      expect(card.progress).toBe(card.goal);
      expect(claimWish(p, card.id)).toBe(true);
      expect(claimWish(p, card.id)).toBe(false);
    }
    expect(p.gems - gems).toBe(51);
    expect(p.dust - dust).toBe(150);
    expect(totalStars(p) - stars).toBe(0);
    expect(p.roadPoints).toBe(3);
  });
  it('uses only content already reachable at the planet', () => {
    const p = player();
    p.level = 12;
    p.seen = ['goat'];
    const cards = ensureWishes(p, day);
    expect(cards.every((q) => WISH_TEMPLATES.find((x) => x.id === q.template)!.minLevel <= p.level)).toBe(true);
  });
  it('pays claimable legacy quests before replacing them', () => {
    const p = player();
    p.quests.list = [{ id: 'win3', progress: 3, claimed: false }];
    const gems = p.gems;
    ensureWishes(p, day);
    expect(p.gems - gems).toBe(12);
  });
  it('grows friendship when the wishing creature lives in the Den', () => {
    const p = player();
    const card = ensureWishes(p, day)[0];
    p.home.residents.push({ species: card.species, fp: 3, lastReq: 0, rewarded: 0 });
    card.progress = card.goal;
    expect(claimWish(p, card.id)).toBe(true);
    expect(p.home.residents[0].fp).toBe(5);
    expect(p.home.residents[0].rewarded).toBeGreaterThan(0);
  });
  it('delivers the best friend letter when a Wish reaches that friendship level', () => {
    const p = player();
    const card = ensureWishes(p, day)[0];
    p.home.residents.push({ species: card.species, fp: 24, lastReq: 0, rewarded: 3 });
    card.progress = card.goal;
    claimWish(p, card.id);
    expect(p.mailSeen).toContain(`best-${card.species}`);
    expect(p.home.residents[0].rewarded).toBe(5);
  });
  it('does nothing before Missions opens, even with early Wish data', () => {
    const p = player();
    const card = ensureWishes(p, day)[0];
    p.level = 5;
    const planet = matchingPlanet(card);
    expect(ensureWishes(p, day)).toEqual([]);
    expect(recordWishRound(p, 'campaign', planet, day)).toEqual([]);
    expect(claimWish(p, card.id)).toBe(false);
    expect(card.progress).toBe(0);
  });
  it('adds land progress across rounds while neighbor Wishes need a pair', () => {
    const p = player();
    const cards = ensureWishes(p, day);
    const land = cards[0];
    land.template = 'mountain2';
    land.goal = 3;
    const neighbor = cards[1];
    neighbor.template = 'oceanforest';
    neighbor.goal = 1;
    const planet = newPlanet();
    let before = clonePlanet(planet);
    planet.sectors[0].biome = 'mountain';
    recordWishRound(p, 'campaign', planet, day, before);
    expect(land.progress).toBe(1);
    expect(neighbor.progress).toBe(0);
    before = clonePlanet(planet);
    recordWishRound(p, 'campaign', planet, day, before);
    expect(land.progress).toBe(1);
    planet.sectors[1].biome = 'mountain';
    recordWishRound(p, 'campaign', planet, day, before);
    expect(land.progress).toBe(2);
    before = clonePlanet(planet);
    planet.sectors[2].biome = 'forest';
    planet.sectors[3].biome = 'ocean';
    planet.sectors[4].biome = 'mountain';
    recordWishRound(p, 'campaign', planet, day, before);
    expect(land.progress).toBe(3);
    expect(neighbor.progress).toBe(1);
  });
  it('offers Fusion and Combo Wishes only after their teaching planets and counts their feats', () => {
    const p = player();
    p.level = 12;
    expect(WISH_TEMPLATES.filter((x) => x.feat === 'fusion' && x.minLevel <= p.level).map((x) => x.id)).toEqual(['steam']);
    p.level = 26;
    const cards = ensureWishes(p, day);
    cards[0].template = 'rainGarden';
    cards[0].goal = 1;
    cards[1].template = 'combo3';
    cards[1].goal = 3;
    cards[2].template = 'superSteam';
    cards[2].goal = 1;
    expect(recordWishReaction(p, 'rainGarden', 'rush')).toEqual([]);
    expect(recordWishReaction(p, 'rainGarden', 'campaign')).toEqual([cards[0].id]);
    expect(recordWishCombo(p, 2, 'steam', true)).toEqual([cards[2].id]);
    expect(recordWishCombo(p, 3, 'steam')).toEqual([cards[1].id]);
  });
});
