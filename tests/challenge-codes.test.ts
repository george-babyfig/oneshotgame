import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { challengeLevel, decodeChallenge, encodeChallenge } from '../src/meta/modes';
const rows = JSON.parse(readFileSync('tests/fixtures/challenge/v1-codes.json', 'utf8')) as {
  code: string;
  seed: string;
  score: number;
  sha256: string;
}[];
for (const play of [1, 2] as const)
  it(`keeps all 32 v1 challenge codes and CH hashes at play ${play}`, () => {
    expect(rows).toHaveLength(32);
    for (const row of rows) {
      expect(decodeChallenge(row.code, play)).toEqual({ seed: row.seed, score: row.score });
      expect(encodeChallenge(row.seed, row.score, play)).toBe(row.code);
      expect(row.code.startsWith('1-')).toBe(true);
      expect(
        createHash('sha256')
          .update(JSON.stringify(challengeLevel(row.seed, 14, play)))
          .digest('hex'),
      ).toBe(row.sha256);
    }
    expect(decodeChallenge(rows[0].code.replace(/^1-/, '2-'), play)).toBeNull();
    expect(decodeChallenge(rows[0].code.replace(/^1-/, '3-'), play)).toBeNull();
  });
