// Captured from untouched 1.0, 2a61ed15a1e07dcfb1c085ba133a8f996d1c17f3.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { dailyLevel } from '../src/meta/modes';

for (const play of [1, 2] as const)
  for (const late of [false, true]) {
    const file = `tests/fixtures/daily/frozen-days${late ? '-late' : ''}.json`;
    it(`preserves frozen Daily bytes at play ${play}, late=${late}`, () => {
      const rows = [];
      for (let at = Date.UTC(2026, 10, 2); at <= Date.UTC(2027, 0, 20); at += 86400000) {
        const day = new Date(at).toISOString().slice(0, 10);
        for (const taught of late ? [52, 60, 120] : [16, 28, 36])
          rows.push({
            day,
            taught,
            sha256: createHash('sha256')
              .update(JSON.stringify(dailyLevel(day, taught, play)))
              .digest('hex'),
          });
      }
      expect(rows).toEqual(JSON.parse(readFileSync(file, 'utf8')));
    }, 120000);
  }
