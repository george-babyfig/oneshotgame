import { describe, expect, it } from 'vitest';
import { TUNE, availableKinds, goalsMet, greedyPlan, makeLevel, remixTwist, starsEarned } from '../src/core/levels';
import { rulesForLevel } from '../src/core/round';
import { lifeScore } from '../src/core/world';
import { defaultProfile, migrate } from '../src/meta/profile';
import { REMIX_RULES, recordRemix, remixFrame, remixLevel, remixStars, remixTotal, remixUnlocked } from '../src/meta/remix';

describe('Remix planets', () => {
  it('draws the opening Remix deals from the RX seed', () => {
    for (const n of [1, 2, 8, 13, 22, 25, 26, 32]) {
      const remix = remixLevel(n);
      const classic = makeLevel(n);
      expect(remix.queue.slice(0, Math.min(n <= 2 ? remix.throws : 2, remix.throws)), `planet ${n} opening`).not.toEqual(
        classic.queue.slice(0, Math.min(n <= 2 ? classic.throws : 2, classic.throws)),
      );
    }
  });

  it('uses fixed seeds and preserves the campaign name and hue', () => {
    for (let n = 1; n <= 500; n++) {
      const level = remixLevel(n);
      expect(remixTwist(n), `planet ${n} map twist`).toBe(level.twist);
      expect(remixLevel(n)).toEqual(level);
      const classic = makeLevel(n);
      expect([level.name, level.hue]).toEqual([classic.name, classic.hue]);
      expect(level.seed).toMatch(/^RX-/);
    }
  });

  it('keeps every planet through chapter 50 solvable with one goal and one twist', () => {
    let shortCount = 0;
    for (let n = 1; n <= 500; n++) {
      const level = remixLevel(n);
      const rules = rulesForLevel(n, 'remix');
      const plan = greedyPlan(level.start, level.queue, level.throws, 0, level.nova, rules);
      const base = lifeScore(level.start);
      const best = lifeScore(plan);
      const progress = Math.max(0, Math.min(1, (n - 1) / (TUNE.rampLevels - 1)));
      const ease = progress * progress * (3 - 2 * progress);
      const saw = ((n - 1) % 10) / 9;
      const shareTarget = (share: number) => Math.max(base + 5, Math.round((base + (best - base) * share) / 5) * 5);
      const classicTwo = shareTarget(TUNE.f2[0] + TUNE.f2[1] * ease + TUNE.saw * 0.7 * saw + TUNE.bump[level.difficulty][1]);
      const classicThree = shareTarget(Math.min(0.97, TUNE.f3[0] + TUNE.f3[1] * ease + TUNE.bump[level.difficulty][2]));
      const middle = shareTarget(
        (TUNE.f2[0] +
          TUNE.f2[1] * ease +
          TUNE.saw * 0.7 * saw +
          TUNE.bump[level.difficulty][1] +
          Math.min(0.97, TUNE.f3[0] + TUNE.f3[1] * ease + TUNE.bump[level.difficulty][2])) /
          2,
      );
      expect(level.twist, `planet ${n} twist`).not.toBe('none');
      expect(level.twist, `planet ${n} retired twist`).not.toBe('heavy');
      expect(level.goals, `planet ${n} goal`).toHaveLength(1);
      expect(level.troubles, `planet ${n} troubles`).toEqual([]);
      expect(level.sky.obstacle, `planet ${n} obstacle`).toBeNull();
      expect(level.sky.gusty, `planet ${n} gust`).toBe(false);
      expect(level.stars[0], `planet ${n} 1★`).toBeLessThan(level.stars[1]);
      expect(level.stars[1], `planet ${n} 2★`).toBeLessThan(level.stars[2]);
      expect(level.stars[0], `planet ${n} classic 2★ share`).toBe(Math.min(classicTwo, level.stars[1] - 5));
      expect(level.stars[1], `planet ${n} midpoint share`).toBe(Math.min(middle, level.stars[2] - 5));
      expect(level.stars[2], `planet ${n} classic 3★ share`).toBe(Math.min(classicThree, best));
      expect(level.stars[2], `planet ${n} cap`).toBeLessThanOrEqual(lifeScore(plan));
      expect(goalsMet(plan, level.goals), `planet ${n} solver goal`).toBe(true);
      expect(starsEarned(plan, lifeScore(plan), level), `planet ${n} solver stars`).toBe(3);
      if (level.twist === 'short') {
        shortCount++;
        expect(level.shortKind).toBeDefined();
        expect(availableKinds(n).length - 1, `planet ${n} remaining kinds`).toBeGreaterThanOrEqual(3);
        const dealt = level.queue.slice(0, level.throws);
        expect(dealt).not.toContain(level.shortKind);
        expect(new Set(dealt)).toEqual(new Set(availableKinds(n).filter((kind) => kind !== level.shortKind)));
      } else expect(level.shortKind).toBeUndefined();
      const slot = ((n - 1) % 10) + 1;
      expect(level.difficulty).toBe(slot === 5 ? 'hard' : slot === 9 && n >= 19 ? 'super' : 'normal');
      if (slot === 10) expect(level.twist).toBe('boss');
    }
    expect(shortCount).toBeGreaterThan(0);
  });
});

describe('Remix records', () => {
  it('opens only after a chapter boss is cleared and never lowers stars', () => {
    const p = defaultProfile();
    p.level = 10;
    expect(remixUnlocked(p, 1)).toBe(false);
    expect(recordRemix(p, 1, 3).improved).toBe(false);
    p.level = 11;
    expect(remixUnlocked(p, 1)).toBe(true);
    expect(remixUnlocked(p, 2)).toBe(false);
    expect(recordRemix(p, 1, 0).frame).toBe('outline');
    expect(recordRemix(p, 1, 3).improved).toBe(true);
    expect(recordRemix(p, 1, 1).improved).toBe(false);
    expect(remixStars(p, 1)[0]).toBe(3);
    for (let n = 2; n <= 10; n++) recordRemix(p, n, 1);
    expect(remixFrame(p, 1)).toBe('silver');
    for (let n = 2; n <= 10; n++) recordRemix(p, n, 3);
    expect(remixFrame(p, 1)).toBe('gold');
    expect(remixTotal(p)).toBe(30);
    p.remix[1].v = REMIX_RULES - 1;
    const oldFraction = TUNE.f3[0];
    try {
      TUNE.f3[0] = oldFraction + 0.01;
      recordRemix(p, 1, 0);
    } finally {
      TUNE.f3[0] = oldFraction;
    }
    expect(remixStars(p, 1)[0]).toBe(3);
    expect(remixFrame(p, 1)).toBe('gold');
    expect(p.remix[1].v).toBe(REMIX_RULES);
  });

  it('cannot feed the campaign economy or progress records', () => {
    const p = defaultProfile();
    p.level = 11;
    const before = structuredClone(p);
    recordRemix(p, 1, 3);
    const { remix: _oldRemix, ...oldOther } = before;
    const { remix: _newRemix, ...newOther } = p;
    expect(newOther).toEqual(oldOther);
  });

  it('migrates saves made before Remix', () => {
    const old = defaultProfile();
    const { remix: _removed, ...saved } = old;
    const p = migrate(saved);
    expect(p.remix).toEqual({});
    expect(remixStars(p, 1)).toEqual(Array(10).fill(0));
    expect(remixFrame(p, 1)).toBe('none');
  });
});
