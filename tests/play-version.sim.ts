import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { RULES_VERSION } from '../src/core/rules-version';
import { rulesForLevel } from '../src/core/round';
import { migrate, readInterruptedRound, saveInterruptedRound } from '../src/meta/profile';
import { dailyLevel } from '../src/meta/modes';

it('uses the play-2 setup while keeping late Dailies frozen', () => {
  expect(process.env.RULES_PLAY).toBe('2');
  expect(RULES_VERSION).toBe(2);
  expect(rulesForLevel(63).version).toBe(2);
  const rows = JSON.parse(readFileSync('tests/fixtures/daily/frozen-days-late.json', 'utf8')) as {
    day: string;
    taught: number;
    sha256: string;
  }[];
  for (const row of rows.filter((row) => row.day === rows[0].day)) {
    expect(
      createHash('sha256')
        .update(JSON.stringify(dailyLevel(row.day, row.taught)))
        .digest('hex'),
    ).toBe(row.sha256);
  }
});

it('keeps a pre-flip interrupted round at v1 when re-saved under the shadow switch', () => {
  const p = migrate(JSON.parse(readFileSync('tests/fixtures/saves/m-release-1.2.v8.json', 'utf8')));
  const checkpoint = readInterruptedRound(p)!;
  expect(checkpoint).not.toBeNull();
  expect(checkpoint.rulesVersion ?? 1).toBe(1);
  saveInterruptedRound(p, checkpoint);
  expect(JSON.parse(JSON.parse(p.savedRound!).round).rulesVersion).toBe(1);
  expect(readInterruptedRound(p)?.state).toEqual(checkpoint.state);
});
