import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LEVEL_SALT, goalsMet, makeLevel, solve2 } from '../../src/core/levels';
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
    expect(LEVEL_SALT).toEqual({ 16: 2, 22: 1, 23: 46, 24: 48, 27: 9, 28: 19, 32: 3, 34: 11, 42: 1, 44: 5, 51: 7, 52: 1, 55: 9 });
    for (let n = 1; n <= 60; n++) {
      if (LEVEL_SALT[n]) continue;
      expect(makeLevel(n)).toEqual(makeLevel(n, 'PP', { salt: 0 }));
    }
    for (const [planet, salt] of Object.entries(LEVEL_SALT)) {
      const n = Number(planet);
      const revised = makeLevel(n);
      expect(revised).toEqual(makeLevel(n, 'PP', { salt }));
      expect(revised).not.toEqual(makeLevel(n, 'PP', { salt: 0 }));
      expect(revised.difficulty).toBe(n === 55 ? 'hard' : 'normal');
      if (n === 55) expect(revised.sky.gusty).toBe(true);
      expect(goalsMet(solve2(revised), revised.goals)).toBe(true);
    }
  });
});
