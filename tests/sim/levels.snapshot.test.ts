import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LEVEL_SALT, goalsMet, greedyPlan, makeLevel } from '../../src/core/levels';
import originalHashes from './levels.default.snapshot.json';

describe('campaign level seeds', () => {
  it('preserves every original layout when no salt is selected', () => {
    for (let n = 1; n <= 60; n++) {
      const digest = createHash('sha256')
        .update(JSON.stringify(makeLevel(n, 'PP', { salt: 0 })))
        .digest('hex');
      expect(digest, `planet ${n}`).toBe(originalHashes[n - 1]);
    }
  });

  it('changes only reviewed default layouts', () => {
    expect(LEVEL_SALT).toEqual({ 24: 48 });
    for (let n = 1; n <= 60; n++) {
      if (n === 24) continue;
      expect(makeLevel(n)).toEqual(makeLevel(n, 'PP', { salt: 0 }));
    }
    const original = makeLevel(24, 'PP', { salt: 0 });
    const revised = makeLevel(24);
    expect(revised).toEqual(makeLevel(24, 'PP', { salt: 48 }));
    expect(revised).not.toEqual(original);
    expect(revised.difficulty).toBe('normal');
    expect(goalsMet(greedyPlan(revised.start, revised.queue, revised.throws), revised.goals)).toBe(true);
  });
});
