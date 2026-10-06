import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { awayCollectables, awayRecapLines, collectAway, creditVaultWin } from '../src/meta/economy';

const HOUR = 3600000;

describe('away collection', () => {
  it('waits for four hours unless something is ready', () => {
    const now = 10 * HOUR;
    const p = defaultProfile(now - HOUR);
    p.tutorial = true;
    p.galaxy.push({ n: 1, name: 'Test', hue: 0, stars: 1, species: [], life: 10, colors: [] });
    creditVaultWin(p, { mode: 'campaign', planetKey: 'campaign:1', buddySpecies: null, at: now - HOUR });
    expect(awayCollectables(p, HOUR, now).vault).toBeGreaterThan(0);
    expect(awayCollectables(p, HOUR, now).show).toBe(false);
    expect(awayCollectables(p, 20 * 60_000, now).show).toBe(false);
    expect(awayCollectables(p, 3 * HOUR, now).show).toBe(false);
    expect(awayCollectables(p, 4 * HOUR, now).show).toBe(true);
    p.visitors.push({ species: 'moss_deer', dust: 30, gems: 0, memento: null });
    expect(awayCollectables(p, HOUR, now).show).toBe(true);
    expect(awayCollectables(p, 20 * 60_000, now).show).toBe(false);
  });

  it('collects a fuelled Vault, greenhouse booster and visitors together', () => {
    const now = 10 * HOUR;
    const p = defaultProfile(now - HOUR);
    p.tutorial = true;
    p.level = 12;
    p.galaxy.push({ n: 1, name: 'Test', hue: 0, stars: 1, species: [], life: 10, colors: [] });
    creditVaultWin(p, { mode: 'campaign', planetKey: 'campaign:1', buddySpecies: null, at: now - HOUR });
    p.home.plots[0] = {
      type: 'greenhouse',
      lv: 1,
      since: now - 2 * HOUR,
      greenhouse: { choice: 'scope', winsTowardNext: 0, stored: 1 },
    };
    p.visitors.push({ species: 'moss_deer', dust: 30, gems: 0, memento: null });
    const before = awayCollectables(p, 5 * HOUR, now);
    expect(before.vault).toBeGreaterThan(0);
    expect(before.home.dust).toBe(0);
    expect(before.home.boosters).toBe(1);
    const collected = collectAway(p, 5 * HOUR, now);
    expect(collected.vault).toBe(before.vault);
    expect(collected.home.boosters).toEqual({ scope: before.home.boosters });
    expect(p.boosters.scope).toBeGreaterThan(0);
    expect(collected.visitors).toBe(30);
    expect(p.visitors).toHaveLength(0);
    const again = collectAway(p, 5 * HOUR, now);
    expect(again).toMatchObject({ vault: 0, visitors: 0, visitorCount: 0, welcomeGems: 0 });
    expect(again.home.boosters).toEqual({});
    expect(awayCollectables(p, 0, now).show).toBe(false);
  });

  it('keeps the three-day gift and gives a three-line long-away recap', () => {
    const now = 20 * HOUR;
    const p = defaultProfile(now);
    p.tutorial = true;
    p.level = 34;
    p.home.residents.push({ species: 'otter', fp: 0, lastReq: -1, rewarded: 1 });
    p.visitors.push({ species: 'moss_deer', dust: 30, gems: 2, memento: 'moss_deer' });
    expect(awayRecapLines(p, 7 * 24 * HOUR, now)[0]).toContain('1 keepsakes');
    const gift = awayCollectables(p, 7 * 24 * HOUR, now).welcomeGems;
    expect(gift).toBeGreaterThan(0);
    expect(collectAway(p, 7 * 24 * HOUR, now).welcomeGems).toBe(gift);
    expect(collectAway(p, 7 * 24 * HOUR, now).welcomeGems).toBe(0);
    expect(collectAway(p, 7 * 24 * HOUR, now + HOUR).welcomeGems).toBe(0);
    expect(p.mementos).toContain('moss_deer');
    expect(awayRecapLines(p, 7 * 24 * HOUR, now)).toHaveLength(3);
    expect(awayRecapLines(p, 7 * 24 * HOUR, now)[0]).toContain('💎0');
    expect(awayRecapLines(p, 7 * 24 * HOUR, now)[2]).toContain('34');
    expect(awayRecapLines(p, 7 * 24 * HOUR, now)[1]).toContain('Tide Otter');
  });
});
