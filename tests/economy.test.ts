import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate, totalStars } from '../src/meta/profile';
import { applyLevelWin, collectDust, grantProduct, pendingDust, planetRate } from '../src/meta/economy';
import { CALENDAR_DAYS, stamp } from '../src/meta/calendar';
import { owns } from '../src/meta/cosmetics';
import {
  chestsReady,
  claimQuest,
  claimQuestBonus,
  claimRoad,
  ensureQuests,
  openChest,
  questEvent,
  roadReady,
  STAR_ROAD,
} from '../src/meta/progression';
import { makeLevel } from '../src/core/levels';
import { clonePlanet } from '../src/core/world';

const win = (p = defaultProfile(0), n = 1, stars = 2) => {
  const L = makeLevel(n);
  return { p, out: applyLevelWin(p, { n, stars, score: 100, planet: clonePlanet(L.start), name: L.name, hue: L.hue }) };
};

describe('economy', () => {
  it('first clear pays more and unlocks the next level', () => {
    const { p, out } = win();
    expect(out.firstClear).toBe(true);
    expect(out.dust).toBe(25 + 2 * 15 + 40);
    expect(p.level).toBe(2);
    const again = applyLevelWin(p, { n: 1, stars: 3, score: 150, planet: clonePlanet(makeLevel(1).start), name: 'x', hue: 0 });
    expect(again.firstClear).toBe(false);
    expect(again.gems).toBe(2);
    expect(p.level).toBe(2);
    expect(p.galaxy).toHaveLength(1);
    expect(p.stars[1]).toBe(3);
  });

  it('stardust accrues per hour and caps at the vault size', () => {
    const { p } = win();
    p.lastCollect = 0;
    const rate = planetRate(p.galaxy[0]);
    expect(pendingDust(p, 3600000)).toBe(rate);
    expect(pendingDust(p, 100 * 3600000)).toBe(rate * 4);
    expect(collectDust(p, 3600000)).toBe(rate);
    expect(pendingDust(p, 3600000)).toBe(0);
  });

  it('star calendar stamps once a day and never resets after a gap', () => {
    const p = defaultProfile(0);
    const g = p.gems;
    expect(stamp(p, '2026-01-01')?.gems).toBe(10);
    expect(p.gems).toBe(g + 10);
    expect(stamp(p, '2026-01-01')).toBeNull();
    stamp(p, '2026-01-02');
    stamp(p, '2026-01-09'); // a week away: simply the next stamp
    expect(p.daily.streak).toBe(3);
    expect(owns(p, 'hat_beanie')).toBe(false);
    for (let d = 10; d < 10 + 11; d++) stamp(p, `2026-01-${d}`);
    expect(p.daily.streak).toBe(14);
    expect(owns(p, 'hat_beanie')).toBe(true);
    // second time round, item days pay gems instead
    p.daily.streak = CALENDAR_DAYS + 13;
    expect(stamp(p, '2026-03-01')?.item).toBeUndefined();
  });

  it('grants purchases exactly once', () => {
    const p = defaultProfile(0);
    const g0 = p.gems;
    expect(grantProduct(p, 'com.pocketplanet.game.gems500', 't1')?.gems).toBe(500);
    expect(grantProduct(p, 'com.pocketplanet.game.gems500', 't1')).toBeNull();
    expect(p.gems).toBe(g0 + 500);
    p.piggy = 90;
    expect(grantProduct(p, 'com.pocketplanet.game.piggy', 't2')?.gems).toBe(90);
    expect(p.piggy).toBe(0);
    grantProduct(p, 'com.pocketplanet.game.starter', 't3');
    expect(p.starter).toBe(true);
    expect(p.skins).toContain('aurora');
    expect(grantProduct(p, 'com.pocketplanet.game.starter', 't4')?.gems).toBe(0);
    grantProduct(p, 'com.pocketplanet.game.cosmicpass', 't5');
    expect(p.pass).toBe(true);
  });
});

describe('progression', () => {
  it('star road pays the free lane, and the pass lane retroactively', () => {
    const p = defaultProfile(0);
    expect(roadReady(p, 4)).toEqual([]);
    expect(roadReady(p, 12)).toEqual([0, 1]);
    const got = claimRoad(p, 0, 12);
    expect(got).toEqual([STAR_ROAD[0].reward]);
    expect(roadReady(p, 12)).toEqual([1]);
    p.pass = true;
    expect(roadReady(p, 12)).toEqual([0, 1]);
    claimRoad(p, 0, 12);
    expect(p.skins).toContain('cosmic');
    expect(claimRoad(p, 5, 12)).toEqual([]);
  });

  it('chapter chest opens once when the chapter is finished', () => {
    const p = defaultProfile(0);
    p.level = 11;
    expect(chestsReady(p)).toEqual([1]);
    expect(openChest(p, 1)).not.toBeNull();
    expect(openChest(p, 1)).toBeNull();
    expect(chestsReady(p)).toEqual([]);
  });

  it('quests progress, claim and pay a bonus', () => {
    const p = defaultProfile(0);
    ensureQuests(p, '2026-03-03');
    expect(p.quests.list).toHaveLength(3);
    const same = JSON.stringify(p.quests.list);
    ensureQuests(p, '2026-03-03');
    expect(JSON.stringify(p.quests.list)).toBe(same);
    for (const ev of ['throw', 'win', 'star', 'creature', 'three', 'booster', 'collect', 'land'] as const) questEvent(p, ev, 100);
    const g = p.gems;
    for (const q of p.quests.list) expect(claimQuest(p, q.id)).toBeGreaterThan(0);
    expect(p.gems).toBeGreaterThan(g);
    expect(claimQuestBonus(p)).not.toBeNull();
    expect(claimQuestBonus(p)).toBeNull();
  });

  it('migrates v1 saves', () => {
    const p = migrate({ gems: 99, level: 5, stars: { 1: 3, 2: 2 }, galaxy: [{ n: 1, name: 'a', hue: 1, stars: 3, species: [], life: 9 }] });
    expect(p.v).toBe(3);
    expect(p.gems).toBe(99);
    expect(p.galaxy[0].colors).toEqual([]);
    expect(p.settings.reduceMotion).toBe(false);
    expect(totalStars(p)).toBe(5);
  });
});
