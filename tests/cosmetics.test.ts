import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { STAR_ROAD } from '../src/meta/progression';
import {
  COSMETICS,
  COSMETIC_BY_ID,
  DEFAULT_LOOK,
  buyCosmetic,
  currentLook,
  equip,
  fullSet,
  masteryLevel,
  owns,
  roadTierOf,
} from '../src/meta/cosmetics';
import { BADGE_SLOTS, NAME_A, NAME_B, currentBanner, passportName, pinnedBadges, titlesOwned, toggleBadge } from '../src/meta/passport';

describe('cosmetics', () => {
  it('has unique ids and a free default in every slot', () => {
    expect(new Set(COSMETICS.map((c) => c.id)).size).toBe(COSMETICS.length);
    for (const [slot, id] of Object.entries(DEFAULT_LOOK)) {
      expect(COSMETIC_BY_ID[id].slot).toBe(slot);
      expect(COSMETIC_BY_ID[id].source).toBe('free');
    }
  });

  it('every road/pass item sits on the Star Road exactly once, in the right lane', () => {
    for (const c of COSMETICS.filter((x) => x.source === 'road' || x.source === 'pass')) {
      const r = roadTierOf(c.id);
      expect(r, c.id).not.toBeNull();
      expect(r!.lane).toBe(c.source === 'road' ? 'free' : 'pass');
      const hits = STAR_ROAD.filter((t) => t.reward.item === c.id || t.pass.item === c.id).length;
      expect(hits).toBe(1);
    }
    for (const t of STAR_ROAD) for (const it of [t.reward.item, t.pass.item]) if (it) expect(COSMETIC_BY_ID[it]).toBeDefined();
  });

  it('derives ownership from progress (retroactive, no migration)', () => {
    const p = defaultProfile();
    expect(owns(p, 'suit_grape')).toBe(false);
    p.chapters = [2];
    expect(owns(p, 'suit_grape')).toBe(true);
    expect(owns(p, 'suit_moss')).toBe(false);
    p.habitats = ['greenwoods'];
    expect(owns(p, 'suit_moss')).toBe(true);
    expect(owns(p, 'suit_aurora')).toBe(false);
    p.starter = true;
    expect(owns(p, 'suit_aurora')).toBe(true);
    const orbit = roadTierOf('l_orbit')!;
    p.roadPass = [orbit.i];
    expect(owns(p, 'l_orbit')).toBe(false); // claimed tiers only count while the pass is owned
    p.pass = true;
    expect(owns(p, 'l_orbit')).toBe(true);
  });

  it('buys, equips, and falls back when an item is no longer owned', () => {
    const p = defaultProfile();
    p.gems = 50;
    expect(buyCosmetic(p, 'hat_sprout')).toBe(false);
    p.gems = 500;
    expect(buyCosmetic(p, 'hat_sprout')).toBe(true);
    expect(p.gems).toBe(420);
    expect(buyCosmetic(p, 'hat_sprout')).toBe(false); // no double purchase
    expect(buyCosmetic(p, 'hat_halo')).toBe(false); // pass items are never sold for gems
    expect(equip(p, 'hat_sprout')).toBe(true);
    expect(currentLook(p).hat).toBe('hat_sprout');
    p.wardrobe = [];
    expect(currentLook(p).hat).toBe(DEFAULT_LOOK.hat);
  });

  it('detects a full set and launcher mastery', () => {
    expect(fullSet({ suit: 'suit_star', hat: 'hat_halo', launcher: 'l_orbit', trail: 'tr_cosmic', emote: 'em_cheer' })).toBe('captain');
    expect(fullSet({ suit: 'suit_star', hat: 'hat_halo', launcher: 'l_pad', trail: 'tr_cosmic', emote: 'em_cheer' })).toBeNull();
    expect(masteryLevel(0)).toBe(0);
    expect(masteryLevel(500)).toBe(2);
    expect(masteryLevel(99999)).toBe(3);
  });
});

describe('planet passport', () => {
  it('names come only from the word lists', () => {
    const p = defaultProfile();
    expect(passportName(p)).toBe('Explorer');
    p.passport.first = 3;
    p.passport.second = 5;
    expect(passportName(p)).toBe(`${NAME_A[3]} ${NAME_B[5]}`);
  });

  it('titles and banners are earned', () => {
    const p = defaultProfile();
    expect(titlesOwned(p).map((x) => x.text)).toEqual(['Stargazer']);
    p.pass = true;
    expect(titlesOwned(p).some((x) => x.id === 'pass')).toBe(true);
    p.passport.banner = 5; // Nebula needs rank 4
    expect(currentBanner(p).id).toBe(0);
    p.rank = 4;
    expect(currentBanner(p).id).toBe(5);
  });

  it('pins up to three earned badges', () => {
    const p = defaultProfile();
    p.stats.wins = 60;
    p.seen = ['otter'];
    p.chapters = [1];
    const earned = ['first_planet', 'planets_10', 'planets_50', 'first_creature', 'chapter_1'].map((x) => `com.pocketplanet.game.ach.${x}`);
    expect(toggleBadge(p, 'com.pocketplanet.game.ach.lifebook_full')).toBe(false);
    p.passport.badgesSet = true; // start from an empty shelf
    earned.forEach((id) => toggleBadge(p, id));
    expect(p.passport.badges.length).toBe(BADGE_SLOTS);
    expect(pinnedBadges(p).map((a) => a.id)).toEqual(earned.slice(-BADGE_SLOTS));
    // unpinning everything keeps the shelf empty instead of refilling it
    [...p.passport.badges].forEach((id) => toggleBadge(p, id));
    expect(pinnedBadges(p)).toEqual([]);
  });
});

describe('object lab and supernova', async () => {
  const W = await import('../src/core/world');
  it('keeps base charge independent of Lab level', () => {
    expect(W.novaCharge(4, 1)).toBe(6);
  });

  it('a supernova reaches further and grows more life', () => {
    const a = W.newPlanet((i) => ({ land: 2, water: i % 2 }));
    const b = W.clonePlanet(a);
    const plain = W.impact(a, 'seed', 5);
    const nova = W.impact(b, 'seed', 5, 0, { nova: true });
    expect(nova.after).toBeGreaterThan(plain.after);
  });
});
