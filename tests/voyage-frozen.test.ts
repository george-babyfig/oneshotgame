// Captured before M13 game edits at 2a61ed15a1e07dcfb1c085ba133a8f996d1c17f3.
// submitOn is provisionally 2026-10-14: retain this runway if the release date moves.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { isoWeek } from '../src/meta/events';
import { VOYAGE_LEN, voyageBase, voyageLevel } from '../src/meta/voyage';

const file = 'tests/fixtures/voyage/frozen-weeks.json';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
it('preserves every 1.0 Voyage stop across the 1.1 calendar runway', () => {
  const rows = [];
  for (let at = Date.UTC(2026, 10, 2); at <= Date.UTC(2027, 0, 20); at += 7 * 86400000) {
    const week = isoWeek(new Date(at));
    for (const hemisphere of ['north', 'south'] as const)
      for (const taught of [16, 28, 36, 60, 120])
        rows.push({
          week,
          hemisphere,
          taught,
          sha256: hash(Array.from({ length: VOYAGE_LEN }, (_, i) => voyageLevel(week, voyageBase(taught), i, taught, hemisphere))),
        });
  }
  expect(rows).toEqual(JSON.parse(readFileSync(file, 'utf8')));
}, 120000);

it('saves the theme only when a new week opens, leaving a 1.0 open week untouched', async () => {
  const { defaultProfile, migrate } = await import('../src/meta/profile');
  const { ensureVoyage } = await import('../src/meta/voyage');
  const { eventFor } = await import('../src/meta/events');
  const p = defaultProfile(0);
  p.level = 36;
  p.settings.hemi = 'south';
  expect(ensureVoyage(p, '2026-W45').theme).toBe(eventFor('2026-W45', 'south').id);
  p.settings.hemi = 'north';
  const started = structuredClone(p.voyage);
  expect(ensureVoyage(p, '2026-W45')).toEqual(started);
  const old = JSON.parse(readFileSync('tests/fixtures/saves/j-release-1.0.v6.json', 'utf8'));
  const loaded = migrate(old);
  ensureVoyage(loaded, loaded.voyage.week);
  expect(loaded.voyage).not.toHaveProperty('theme');
  expect(ensureVoyage(loaded, '2026-W46').theme).toBe(eventFor('2026-W46', loaded.settings.hemi).id);
});
