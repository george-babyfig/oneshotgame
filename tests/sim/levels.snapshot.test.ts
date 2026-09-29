import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LEVEL_SALT, goalsMet, greedyPlan, makeLevel } from '../../src/core/levels';
import originalHashes from './levels.default.snapshot.json';

describe('campaign level seeds', () => {
  it('records the M6 deal and target layout when no salt is selected', () => {
    const hashes: string[] = [];
    for (let n = 1; n <= 60; n++) {
      // Nova availability is tracked by the level snapshot; this hashes the deal and targets.
      const { nova: _nova, ...layout } = makeLevel(n, 'PP', { salt: 0 });
      const digest = createHash('sha256').update(JSON.stringify(layout)).digest('hex');
      hashes.push(digest);
      if (process.env.UPDATE_FIXTURES !== '1') expect(digest, `planet ${n}`).toBe(originalHashes[n - 1]);
    }
    if (process.env.UPDATE_FIXTURES === '1')
      writeFileSync(new URL('./levels.default.snapshot.json', import.meta.url), JSON.stringify(hashes, null, 2) + '\n');
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
