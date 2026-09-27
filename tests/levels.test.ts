import { describe, expect, it } from 'vitest';
import { GOALS_FROM, difficultyOf, goalsMet, greedyPlan, greedyScore, makeLevel } from '../src/core/levels';
import { lifeScore } from '../src/core/world';

describe('level generator', () => {
  it('every level in the first six chapters is beatable with rising targets', () => {
    for (let n = 1; n <= 60; n++) {
      const L = makeLevel(n);
      expect(L.stars[0]).toBeLessThan(L.stars[1]);
      expect(L.stars[1]).toBeLessThan(L.stars[2]);
      expect(L.stars[0]).toBeGreaterThan(lifeScore(L.start));
      // the solver that set the targets can reach 3 stars
      expect(greedyScore(L.start, L.queue, L.throws)).toBeGreaterThanOrEqual(L.stars[2]);
      expect(L.queue.length).toBeGreaterThanOrEqual(L.throws);
      // goals come from the solver's own line of play, so stars and goals are reachable together
      expect(goalsMet(greedyPlan(L.start, L.queue, L.throws), L.goals)).toBe(true);
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
  });
});
