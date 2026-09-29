import { describe, expect, it } from 'vitest';
import {
  GOALS_FROM,
  difficultyOf,
  goalsMet,
  greedyPlan,
  greedyScore,
  levelMeta,
  makeLevel,
  solve0,
  solve2,
  starsEarned,
} from '../src/core/levels';
import { lifeScore } from '../src/core/world';

describe('level generator', () => {
  it('every level in the first twelve chapters is beatable with rising targets', () => {
    for (let n = 1; n <= 120; n++) {
      const L = makeLevel(n);
      expect(L.stars[0]).toBeLessThan(L.stars[1]);
      expect(L.stars[1]).toBeLessThan(L.stars[2]);
      expect(L.stars[0]).toBeGreaterThan(lifeScore(L.start));
      // the solver that set the targets can reach 3 stars
      expect(greedyScore(L.start, L.queue, L.throws)).toBeGreaterThanOrEqual(L.stars[2]);
      expect(L.queue.length).toBeGreaterThanOrEqual(L.throws);
      // goals come from the solver's own line of play, so stars and goals are reachable together
      expect(goalsMet(greedyPlan(L.start, L.queue, L.throws), L.goals)).toBe(true);
      const plan2 = solve2(L);
      expect(starsEarned(plan2, lifeScore(plan2), L), `solver 2 planet ${n}`).toBe(3);
      expect(goalsMet(plan2, L.goals), `solver 2 goals planet ${n}`).toBe(true);
      const plan0 = solve0(L);
      expect(starsEarned(plan0, lifeScore(plan0), L), `solver 0 planet ${n}`).toBeGreaterThanOrEqual(1);
      if (n < GOALS_FROM) expect(L.goals).toEqual([]);
      if (n >= GOALS_FROM && difficultyOf(n) !== 'normal') expect(L.goals.length).toBeGreaterThan(0);
    }
  });

  it('keeps the first Super Hard planet out of chapter one', () => {
    expect(difficultyOf(9)).toBe('normal');
    expect(difficultyOf(19)).toBe('super');
    expect(difficultyOf(15)).toBe('hard');
  });

  it('is deterministic', () => {
    expect(JSON.stringify(makeLevel(17))).toBe(JSON.stringify(makeLevel(17)));
    for (let n = 1; n <= 120; n++) {
      const level = makeLevel(n);
      expect(makeLevel(n)).toEqual(level);
      expect(levelMeta(n)).toEqual({
        name: level.name,
        hue: level.hue,
        twist: level.twist,
        difficulty: level.difficulty,
        boss: level.twist === 'boss',
      });
    }
  });

  it.skipIf(process.env.BENCH !== '1')('measures uncached generation and metadata', () => {
    const generation: number[] = [];
    const metadata: number[] = [];
    for (let n = 1; n <= 120; n++) {
      let start = performance.now();
      const meta = levelMeta(n, 'BENCH');
      metadata.push(performance.now() - start);
      start = performance.now();
      const level = makeLevel(n, 'BENCH', { goals: true });
      generation.push(performance.now() - start);
      expect(meta.name).toBe(level.name);
    }
    const report = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return { median: sorted[59].toFixed(2), p95: sorted[113].toFixed(2), max: sorted[119].toFixed(2) };
    };
    console.log('makeLevel ms', report(generation), 'levelMeta ms', report(metadata));
  });
});
