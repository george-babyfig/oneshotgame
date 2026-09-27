import { describe, expect, it } from 'vitest';
import { greedyScore, makeLevel } from '../src/core/levels';
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
    }
  });

  it('is deterministic', () => {
    expect(JSON.stringify(makeLevel(17))).toBe(JSON.stringify(makeLevel(17)));
  });
});
