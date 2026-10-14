import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';
import {
  FESTIVALS,
  FESTIVAL_TIERS,
  claimFestival,
  ensureFestival,
  festivalDaysLeft,
  festivalLive,
  festivalOn,
  festivalReady,
  spotFestival,
} from '../src/meta/festivals';
import { RESIDENT_ACCS, accAvailable, wearAcc } from '../src/meta/homeworld';
import {
  VOYAGE_LEN,
  VOYAGE_REWARDS,
  clearStop,
  ensureVoyage,
  stopReward,
  voyageBase,
  voyageLevel,
  voyageUnlocked,
} from '../src/meta/voyage';
import { OBSTACLES } from '../src/core/sky';
import { goalProgress, makeLevel } from '../src/core/levels';
import {
  ALBUM_PAGES,
  MAX_PLACED,
  SCALE_MAX,
  STICKERS,
  albumReady,
  bgUnlocked,
  claimMilestones,
  claimPage,
  hasSticker,
  milestonesReady,
  moveSticker,
  ownedStickers,
  pageStickers,
  placeSticker,
  raiseSticker,
  removeSticker,
  scaleSticker,
  setPageBg,
} from '../src/meta/stickers';
import { SPECIES } from '../src/core/world';
import { FESTIVAL_UNLOCK_LEVEL } from '../src/meta/unlocks';

const SEPT = new Date(2026, 8, 20);

describe('festivals', () => {
  it('has one festival per month, each with a costume residents can wear', () => {
    expect(FESTIVALS).toHaveLength(12);
    expect(festivalOn(SEPT).id).toBe('acorn');
    for (const f of FESTIVALS) expect(RESIDENT_ACCS.some((a) => a.id === f.acc)).toBe(true);
    expect(festivalDaysLeft(new Date(2026, 8, 30))).toBe(1);
    expect(festivalDaysLeft(new Date(2026, 1, 1))).toBe(28);
  });

  it('counts only after unlock, resets each month, and pays each tier once', () => {
    const p = defaultProfile();
    spotFestival(p, SEPT);
    expect(p.festival.spotted).toBe(0); // level 1: not unlocked yet
    p.level = FESTIVAL_UNLOCK_LEVEL;
    for (let i = 0; i < FESTIVAL_TIERS[2].spot; i++) spotFestival(p, SEPT);
    expect(festivalReady(p, SEPT)).toEqual([0, 1, 2]);
    const gems = p.gems;
    expect(claimFestival(p, 0, SEPT)).not.toBeNull();
    expect(claimFestival(p, 0, SEPT)).toBeNull();
    expect(p.album.fest).toEqual(['acorn']);
    expect(hasSticker(p, 'f_acorn')).toBe(true);
    claimFestival(p, 1, SEPT);
    claimFestival(p, 2, SEPT);
    expect(p.gems).toBe(gems + 15 + 20);
    expect(p.home.accs).toContain('acorn');
    // a new month starts from zero, but stickers and costumes are kept
    ensureFestival(p, new Date(2026, 9, 1));
    expect(p.festival.spotted).toBe(0);
    expect(p.album.fest).toEqual(['acorn']);
  });

  it("plays festival music only until this month's track is finished", () => {
    const p = defaultProfile();
    expect(festivalLive(p, SEPT)).toBe(false); // not unlocked yet
    p.level = FESTIVAL_UNLOCK_LEVEL;
    expect(festivalLive(p, SEPT)).toBe(true);
    for (let i = 0; i < FESTIVAL_TIERS[2].spot; i++) spotFestival(p, SEPT);
    FESTIVAL_TIERS.forEach((_, i) => claimFestival(p, i, SEPT));
    expect(festivalLive(p, SEPT)).toBe(false);
    expect(festivalLive(p, new Date(2026, 9, 1))).toBe(true); // next month's festival
  });

  it('festival costumes cannot be bought, only earned', () => {
    const p = defaultProfile();
    p.gems = 1000;
    p.home.residents.push({ species: 'bunny', fp: 0 } as never);
    expect(wearAcc(p, 'bunny', 'pumpkin')).toBe('locked');
    expect(p.gems).toBe(1000);
    p.home.accs.push('pumpkin');
    expect(accAvailable(p, p.home.residents[0], 'pumpkin')).toBe(true);
    expect(wearAcc(p, 'bunny', 'pumpkin')).toBe('ok');
  });
});

describe('weekly voyage', () => {
  it('only rolls obstacles already taught in campaign', () => {
    let checked = 0;
    for (let week = 1; week <= 20; week++) {
      const key = `2026-W${String(week).padStart(2, '0')}`;
      for (let stop = 0; stop < 6; stop++) {
        const full = voyageLevel(key, 55, stop, 120);
        if (!full.sky.obstacle) continue;
        checked++;
        const cap = OBSTACLES[full.sky.obstacle].debut;
        const restricted = voyageLevel(key, 55, stop, cap);
        expect(restricted.sky.obstacle === null || OBSTACLES[restricted.sky.obstacle].debut < cap).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(0);
    for (let i = 0; i < 12; i++) expect(makeLevel(60, `MODE-${i}`).sky.obstacle, `uncapped seeded mode ${i}`).toBeNull();
  });

  it('builds 7 feasible stops with goals and a Guardian at the end', () => {
    const base = voyageBase(30);
    for (let i = 0; i < VOYAGE_LEN; i++) {
      const L = voyageLevel('2026-W39', base, i);
      expect(L.twist === 'boss').toBe(i === VOYAGE_LEN - 1);
      expect(L.stars[0]).toBeLessThan(L.stars[1]);
      // same week → same planet
      expect(voyageLevel('2026-W39', base, i).start).toEqual(L.start);
      for (const g of L.goals) expect(goalProgress(L.start, g)).toBeLessThan(g.count);
    }
    expect(voyageBase(3)).toBe(8);
    expect(voyageBase(200)).toBe(55);
  });

  it('opens stops in order, pays each first clear once, and counts finished voyages', () => {
    const p = defaultProfile();
    p.level = 20;
    ensureVoyage(p, '2026-W39');
    expect(voyageUnlocked(p, 1)).toBe(false);
    expect(clearStop(p, 1, 3).reward).toBeNull(); // skipping ahead
    expect(clearStop(p, 0, 0).reward).toBeNull(); // a loss
    const dust = p.dust;
    expect(clearStop(p, 0, 2).reward).toEqual(stopReward(p, 0));
    expect(p.dust).toBe(dust + (VOYAGE_REWARDS[0].dust ?? 0) + 175); // retired Event play value stays in each stop
    expect(clearStop(p, 0, 3).reward).toBeNull(); // replay: better stars, no reward
    expect(p.voyage.stars[0]).toBe(3);
    for (let i = 1; i < VOYAGE_LEN; i++) expect(clearStop(p, i, 1).reward).not.toBeNull();
    expect(p.voyageDone).toBe(1);
    expect(hasSticker(p, 'v_1')).toBe(true);
    // next week: a new route; base is fixed for the week
    p.level = 40;
    ensureVoyage(p, '2026-W40');
    expect(p.voyage.cleared).toBe(0);
    expect(p.voyage.base).toBe(voyageBase(40));
  });
});

describe('sticker album', () => {
  it('has a sticker for every creature and unique ids', () => {
    expect(pageStickers('critter')).toHaveLength(SPECIES.length);
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(STICKERS.length);
    for (const pg of ALBUM_PAGES) expect(pageStickers(pg.id).length).toBeGreaterThan(0);
  });

  it('derives stickers from progress and pays milestones and pages once', () => {
    const p = defaultProfile();
    expect(ownedStickers(p)).toHaveLength(0);
    p.seen = SPECIES.map((s) => s.id);
    expect(milestonesReady(p)).toBe(Math.floor(SPECIES.length / 10));
    const gems = p.gems;
    claimMilestones(p);
    expect(p.gems).toBe(gems + 10 * Math.floor(SPECIES.length / 10));
    expect(claimMilestones(p)).toBeNull();
    expect(albumReady(p)).toBe(1); // the critter page
    expect(claimPage(p, 'critter')?.gems).toBe(100);
    expect(claimPage(p, 'critter')).toBeNull();
    expect(claimPage(p, 'fest')).toBeNull();
  });

  it('places only owned stickers, within limits, and keeps edits in bounds', () => {
    const p = defaultProfile();
    expect(placeSticker(p, 0, 'c_bunny')).toBe(-1);
    p.seen = ['bunny', 'otter'];
    expect(placeSticker(p, 0, 'c_bunny', 2, -1)).toBe(0);
    expect(p.album.pages[0].items[0]).toMatchObject({ x: 1, y: 0 });
    moveSticker(p, 0, 0, 0.4, 0.6);
    for (let i = 0; i < 10; i++) scaleSticker(p, 0, 0, 1.5);
    expect(p.album.pages[0].items[0].s).toBe(SCALE_MAX);
    placeSticker(p, 0, 'c_otter');
    expect(raiseSticker(p, 0, 0)).toBe(1);
    expect(p.album.pages[0].items.map((i) => i.id)).toEqual(['c_otter', 'c_bunny']);
    removeSticker(p, 0, 0);
    expect(p.album.pages[0].items).toHaveLength(1);
    for (let i = 0; i < MAX_PLACED + 5; i++) placeSticker(p, 1, 'c_otter');
    expect(p.album.pages[1].items).toHaveLength(MAX_PLACED);
    expect(bgUnlocked(p, 7)).toBe(false);
    expect(setPageBg(p, 0, 7)).toBe(false);
    expect(setPageBg(p, 0, 1)).toBe(true);
  });

  it('migrates old saves with an empty album', () => {
    const old = JSON.parse(JSON.stringify(defaultProfile())) as Record<string, unknown>;
    delete old.album;
    delete old.voyage;
    delete old.festival;
    const p = migrate(old);
    expect(p.album.pages).toHaveLength(3);
    expect(p.voyageDone).toBe(0);
    expect(p.festival.spotted).toBe(0);
  });
});
