import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { migrate } from '../src/meta/profile';
import { milestonesReady, pageDone } from '../src/meta/stickers';
for (const file of readdirSync('tests/fixtures/saves').filter((f) => f.endsWith('.json')))
  it(`keeps album rewards and claims at both play versions: ${file}`, () => {
    const raw = JSON.parse(readFileSync(`tests/fixtures/saves/${file}`, 'utf8'));
    const profiles = ([1, 2] as const).map((play) => migrate(structuredClone(raw), { play }));
    const values = profiles.map((p, index) => ({
      gems: milestonesReady(p, index === 0 ? 1 : 2),
      feats: pageDone(p, 'feat'),
      claims: p.album.pagesClaimed,
      stamps: p.combo.stamps,
      fusions: p.fusionsFound,
    }));
    expect(values[1]).toEqual(values[0]);
  });

import { STICKERS, REACTION_STICKERS, V2_REACTION_STICKERS, visibleStickers, pageStickers } from '../src/meta/stickers';
import { LAUNCH_FUSION_IDS, recordReaction, ALL_COMBO_STAMPS } from '../src/meta/reactions';
import { titlesOwned } from '../src/meta/passport';
import { defaultProfile } from '../src/meta/profile';

it('keeps new discovery stickers outside every album reward and the launch titles', () => {
  expect(REACTION_STICKERS.map((s) => s.art)).toEqual(LAUNCH_FUSION_IDS);
  expect(V2_REACTION_STICKERS.every((s) => s.bonus)).toBe(true);
  for (const s of V2_REACTION_STICKERS)
    for (const kind of ['feat', 'fusion', 'critter', 'fest', 'voyage'] as const) expect(pageStickers(kind)).not.toContain(s);
  const p = defaultProfile(0);
  const before = milestonesReady(p);
  const dust = p.dust;
  recordReaction(p, 'firemount');
  recordReaction(p, 'rainbow');
  expect(p.dust).toBeGreaterThan(dust);
  const again = p.dust;
  recordReaction(p, 'firemount');
  recordReaction(p, 'rainbow');
  expect(p.dust).toBe(again);
  expect(milestonesReady(p, 2)).toBe(before);
  expect(titlesOwned(p).some((t) => t.id === 'reactions')).toBe(false);
  p.fusionsFound.push(...LAUNCH_FUSION_IDS);
  p.combo.stamps = ALL_COMBO_STAMPS;
  expect(titlesOwned(p).map((t) => t.id)).toContain('reactions');
  expect(titlesOwned(p).map((t) => t.id)).toContain('combo');
  expect(visibleStickers(p, 1).some((s) => s.id === 'r_firemount')).toBe(false);
  expect(visibleStickers(p, 2).some((s) => s.id === 'r_firemount')).toBe(true);
  expect(STICKERS.filter((s) => s.id.startsWith('r_') && !LAUNCH_FUSION_IDS.some((id) => s.id === `r_${id}`)).every((s) => s.bonus)).toBe(
    true,
  );
});
