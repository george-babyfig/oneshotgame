import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';
import { chapterReward, openChest, rewardText } from '../src/meta/progression';
import { BOOSTERS, PRODUCTS } from '../src/meta/tuning';
import { claimWish, ensureWishes, swapWish, wishRoadPoints } from '../src/meta/wishes';
import { grantProfileRoadPoints, STAR_ROAD } from '../src/meta/starroad';
import { collectAll, homeBadge, mergeHomeCelebrations, tickHome } from '../src/meta/homeworld';
import { homeworldNextUp, nextUp } from '../src/meta/nextup';
import { COSMETICS, isPaidLook, owns, visibleCosmetics } from '../src/meta/cosmetics';
import { unlocked } from '../src/meta/unlocks';
import { letterStrings } from '../src/meta/inbox';

function wishes() {
  const p = defaultProfile(0);
  p.level = 12;
  p.seen = ['bunny'];
  p.home.firstHour = 2;
  p.chapters = [1];
  return p;
}

describe('FC Wish promises and clock safety', () => {
  it('pays one deal per calendar day through rollback, forward travel, and save reloads', () => {
    let p = wishes();
    const day = '2026-10-06';
    const initial = ensureWishes(p, day);
    const gems = p.gems;
    for (const card of initial) {
      card.progress = card.goal;
      expect(claimWish(p, card.id, day)).toBe(true);
    }
    expect(p.gems - gems).toBe(51);
    const ids = initial.map((card) => card.id);
    for (const date of ['2026-10-05', day, '2026-10-01', day]) {
      p = migrate(p as unknown as Record<string, unknown>);
      expect(ensureWishes(p, date).map((card) => card.id)).toEqual(ids);
      expect(p.quests.bonusClaimed).toBe(true);
      for (const card of p.quests.list) expect(claimWish(p, card.id, date)).toBe(false);
      expect(p.gems - gems).toBe(51);
    }
    const future = ensureWishes(p, '2026-10-08');
    expect(future.map((card) => card.id)).not.toEqual(ids);
    future.forEach((card) => {
      card.progress = card.goal;
      claimWish(p, card.id, '2026-10-08');
    });
    const laterIds = future.map((card) => card.id);
    for (const date of ['2026-10-07', '2026-10-08']) expect(ensureWishes(p, date).map((card) => card.id)).toEqual(laterIds);
    expect(p.gems - gems).toBe(102);
  });
  it('cannot renew the free swap by rewinding a date', () => {
    const p = wishes();
    const day = '2026-10-06';
    const cards = ensureWishes(p, day);
    expect(swapWish(p, cards[0].id, day)).toBe(true);
    expect(swapWish(p, p.quests.list[0].id, '2026-10-05')).toBe(false);
    expect(swapWish(p, p.quests.list[0].id, day)).toBe(false);
  });
  it('advertises exactly the point claim pays with room, a capped day, and a completed Road', () => {
    for (const state of ['room', 'cap', 'finished'] as const) {
      const p = wishes();
      const day = '2026-10-06';
      const card = ensureWishes(p, day)[0];
      if (state === 'cap') {
        grantProfileRoadPoints(p, { source: 'campaign', date: day, earningKey: 'one', delta: 3 });
        grantProfileRoadPoints(p, { source: 'campaign', date: day, earningKey: 'two', delta: 1 });
      }
      if (state === 'finished') p.roadRecords.road00.points = STAR_ROAD.at(-1)!.stars;
      const before = structuredClone(p);
      const preview = wishRoadPoints(p, card, day);
      expect(p).toEqual(before);
      expect(preview).toBe(state === 'room' ? 1 : 0);
      card.progress = card.goal;
      claimWish(p, card.id, day);
      expect(p.roadRecords.road00.points - before.roadRecords.road00.points).toBe(preview);
      expect(wishRoadPoints(p, card, day)).toBe(0);
    }
  });
});

describe('FC honest chest previews', () => {
  it('never shrinks a later preview after opening the earlier chest', () => {
    const p = defaultProfile();
    p.level = 21;
    const preview = chapterReward(2, p);
    expect(preview).toMatchObject({ gems: 70, dust: 850 });
    openChest(p, 1);
    expect(chapterReward(2, p)).toEqual(preview);
    expect(openChest(p, 2)).toEqual(preview);
  });
  it('reserves legacy catch-up for the earliest unopened chest so later previews stay stable', () => {
    const p = defaultProfile();
    p.level = 61;
    p.chapters = [1, 2, 3, 4];
    p.m4RankPaidThrough = 2;
    const sixth = chapterReward(6, p);
    expect(sixth).toMatchObject({ gems: 110, dust: 2250 });
    expect(openChest(p, 5)).toMatchObject({ gems: 185, dust: 3250 });
    expect(chapterReward(6, p)).toEqual(sixth);
    expect(openChest(p, 6)).toEqual(sixth);
  });
  it('preserves every rank once when opening several chests out of order and reloading', () => {
    let p = defaultProfile();
    p.level = 31;
    const preview1 = chapterReward(1, p);
    const preview3 = chapterReward(3, p);
    expect(openChest(p, 2)).toMatchObject({ gems: 70, dust: 850 });
    p = migrate(p as unknown as Record<string, unknown>);
    expect(chapterReward(1, p)).toEqual(preview1);
    expect(chapterReward(3, p)).toEqual(preview3);
    expect(openChest(p, 3)).toEqual(preview3);
    expect(openChest(p, 1)).toEqual(preview1);
    expect(p.m4RankPaidThrough).toBe(3);
    expect(openChest(p, 2)).toBeNull();
  });
});

describe('FC Homeworld readiness and celebrations', () => {
  it('settles a returned friend once on the Homeworld tick and routes both Next Up surfaces to it (M13)', () => {
    const p = wishes();
    p.level = 21; // trips and their return are shown from planet 21 (noun budget)
    p.home.intro = true;
    p.home.expedition = { species: 'bunny', hours: 4, ends: 1000, planet: -1 };
    const before = { gems: p.gems, dust: p.dust };
    tickHome(p, 1000);
    expect(p.home.expedition).toBeNull();
    expect(p.home.tripReturn?.species).toBe('bunny');
    expect(p.gems + p.dust).toBeGreaterThan(before.gems + before.dust);
    expect(homeBadge(p, 1000)).toBe(1);
    expect(nextUp(p, 1000)).toMatchObject({ homeTarget: 'expedition' });
    expect(homeworldNextUp(p, 1000)).toMatchObject({ homeTarget: 'expedition' });
    const paid = { gems: p.gems, dust: p.dust };
    // Collect all and later ticks never pay the same trip again.
    expect(collectAll(p, 1000)).toEqual({ gems: 0, dust: 0, boosters: {} });
    tickHome(p, 2000);
    expect({ gems: p.gems, dust: p.dust }).toEqual(paid);
    // Seeing the postcard acknowledges the return and clears the badge.
    p.home.tripReturn = null;
    p.home.seen.celebrations = [];
    expect(homeBadge(p, 2000)).toBe(0);
  });
  it('collapses outdated friend and Landmark history to their current milestones', () => {
    const p = wishes();
    p.home.residents = [{ species: 'bunny', fp: 26, rewarded: 5 }];
    p.home.landmarks.sprout_garden.stage = 4;
    p.home.seen.celebrations = [
      'friend:bunny:level:2',
      'friend:bunny:level:3',
      'friend:otter:level:3',
      'sprout_garden:stage:1',
      'sprout_garden:stage:2',
      'sprout_garden:stage:3',
    ];
    const balances = { gems: p.gems, dust: p.dust };
    expect(mergeHomeCelebrations(p)).toEqual(['friend:bunny:level:5', 'sprout_garden:stage:4']);
    expect({ gems: p.gems, dust: p.dust }).toEqual(balances);
  });
});

describe('FC first sessions and consistent collection gates', () => {
  it('shows only earned or owned looks in session one, with gem looks available later', () => {
    const p = wishes();
    p.meta.sessions = 1;
    const early = visibleCosmetics(p);
    expect(early.length).toBeGreaterThan(0);
    expect(early.every((item) => owns(p, item.id) || (item.source !== 'gems' && !isPaidLook(item)))).toBe(true);
    p.meta.sessions = 2;
    expect(visibleCosmetics(p).filter((item) => item.source === 'gems')).toHaveLength(
      COSMETICS.filter((item) => item.source === 'gems').length,
    );
  });
  it('opens Lifebook at 3, Atlas at 23 and Album at 24', () => {
    const p = defaultProfile();
    p.level = 2;
    expect(unlocked(p, 'sticker_album')).toBe(false);
    p.level = 3;
    expect(unlocked(p, 'sticker_album')).toBe(false);
    expect(unlocked(p, 'lifebook')).toBe(true);
    p.level = 6;
    expect(unlocked(p, 'star_atlas')).toBe(false);
    p.level = 23;
    expect(unlocked(p, 'star_atlas')).toBe(true);
    p.level = 24;
    expect(unlocked(p, 'sticker_album')).toBe(true);
  });
  it('uses one Crystal Frost name and a unique Life Spark symbol', () => {
    expect(PRODUCTS.find((item) => item.key === 'pack_crystalfrost')!.contents).toContain('Crystal Frost crown');
    expect(BOOSTERS.spark.emoji).toBe('🌱');
    expect(rewardText({ dust: 10, boosters: { spark: 1 } })).toEqual(['✨ 10', '🌱 ×1']);
  });
  it('invites a grown-up at a sensible hour without right-now pressure', () => {
    const copy = letterStrings().find((line) => line.includes('The {e} is happening'))!;
    expect(copy).toContain('grown-up');
    expect(copy).toContain('evening before bedtime');
    expect(copy).not.toContain('Ask a grown-up');
    expect(copy).not.toContain('right now');
  });
  it('rotates feasible optional goals with play and never sticks on a missing rare species', () => {
    const p = wishes();
    p.level = 19;
    p.seen = ['goat', 'llama', 'newt', 'dragon'];
    expect(nextUp(p, 0).action).toBe('play');
    p.seen = ['llama', 'newt', 'dragon', 'dino'];
    expect(nextUp(p, 0).action).not.toBe('lifebook');
    p.level = 21;
    p.chapters = [1, 2];
    const actions = Array.from({ length: 6 }, (_, index) => {
      p.meta.sessions = index + 1;
      return nextUp(p, 0).action;
    });
    expect(actions).toContain('lifebook');
    expect(actions).toContain('play');
    expect(actions[0]).not.toBe(actions[1]);
  });
  it('keeps an unopened chapter chest ahead of later feature introductions', () => {
    const p = defaultProfile();
    p.level = 13;
    expect(nextUp(p, 0)).toMatchObject({ action: 'starmap', kind: 'claim' });
  });
});
