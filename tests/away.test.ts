import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { awayCollectables, awayRecapLines, collectAway } from '../src/meta/economy';

const HOUR = 3600000;

describe('away collection', () => {
  it('waits for four hours unless something is ready', () => {
    const now = 10 * HOUR;
    const p = defaultProfile(now);
    p.tutorial = true;
    p.galaxy.push({ n: 1, name: 'Test', hue: 0, stars: 1, species: [], life: 10, colors: [] });
    p.lastCollect = now - HOUR;
    expect(awayCollectables(p, HOUR, now).vault).toBeGreaterThan(0);
    expect(awayCollectables(p, HOUR, now).show).toBe(false);
    expect(awayCollectables(p, 20 * 60_000, now).show).toBe(false);
    expect(awayCollectables(p, 3 * HOUR, now).show).toBe(false);
    expect(awayCollectables(p, 4 * HOUR, now).show).toBe(true);
    p.visitors.push({ species: 'moss_deer', dust: 30, gems: 0, memento: null });
    expect(awayCollectables(p, HOUR, now).show).toBe(true);
    expect(awayCollectables(p, 20 * 60_000, now).show).toBe(false);
  });

  it('collects vault, producers and visitors together, with one collect quest event', () => {
    const now = 10 * HOUR;
    const p = defaultProfile(now);
    p.tutorial = true;
    p.level = 12;
    p.lastCollect = now - HOUR;
    p.galaxy.push({ n: 1, name: 'Test', hue: 0, stars: 1, species: [], life: 10, colors: [] });
    p.home.plots[0] = { type: 'mill', lv: 1, since: now - 2 * HOUR };
    p.visitors.push({ species: 'moss_deer', dust: 30, gems: 0, memento: null });
    p.quests.list = [{ id: 'collect2', progress: 0, claimed: false }];
    const before = awayCollectables(p, 5 * HOUR, now);
    expect(before.vault).toBeGreaterThan(0);
    expect(before.home.dust).toBeGreaterThan(0);
    const collected = collectAway(p, 5 * HOUR, now);
    expect(collected.vault).toBe(before.vault);
    expect(collected.home.dust).toBe(before.home.dust);
    expect(collected.visitors).toBe(30);
    expect(p.visitors).toHaveLength(0);
    expect(p.quests.list[0].progress).toBe(1);
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
    expect(p.mementos).toContain('moss_deer');
    expect(awayRecapLines(p, 7 * 24 * HOUR, now)).toHaveLength(3);
    expect(awayRecapLines(p, 7 * 24 * HOUR, now)[0]).toContain(String(gift));
    expect(awayRecapLines(p, 7 * 24 * HOUR, now)[2]).toContain('34');
    expect(awayRecapLines(p, 7 * 24 * HOUR, now)[1]).toContain('Tide Otter');
  });
});
