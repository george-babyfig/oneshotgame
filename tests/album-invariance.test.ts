import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { migrate } from '../src/meta/profile';
import { milestonesReady, pageDone } from '../src/meta/stickers';
for (const file of readdirSync('tests/fixtures/saves').filter((f) => f.endsWith('.json')))
  it(`keeps album rewards and claims at both play versions: ${file}`, () => {
    const raw = JSON.parse(readFileSync(`tests/fixtures/saves/${file}`, 'utf8'));
    const profiles = ([1, 2] as const).map((play) => migrate(structuredClone(raw), { play }));
    const values = profiles.map((p) => ({
      gems: milestonesReady(p),
      feats: pageDone(p, 'feat'),
      claims: p.album.pagesClaimed,
      stamps: p.combo.stamps,
      fusions: p.fusionsFound,
    }));
    expect(values[1]).toEqual(values[0]);
  });
