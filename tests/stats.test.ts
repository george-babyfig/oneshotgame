import { describe, expect, it } from 'vitest';
import { KINDS } from '../src/core/world';
import { DEAL_WEIGHTS, makeLevel } from '../src/core/levels';

describe('object identity and deal', () => {
  it('matches the six identity cards in the M6 table', () => {
    expect(Object.fromEntries(Object.entries(KINDS).map(([id, def]) => [id, def.stats]))).toEqual({
      rock: { element: 'earth', power: 2, reach: 1, job: 'Builds tall mountains' },
      ice: { element: 'water', power: 2, reach: 1, job: 'Makes cool water' },
      seed: { element: 'life', power: 2, reach: 1, job: 'Grows strong roots' },
      magma: { element: 'fire', power: 2, reach: 1, job: 'Builds warm volcanoes' },
      storm: { element: 'air', power: 1, reach: 3, job: 'Brings wide rain' },
      sun: { element: 'light', power: 1, reach: 3, job: 'Brings wide warmth' },
    });
    for (const kind of Object.values(KINDS)) expect(kind.stats.job.split(' ')).toHaveLength(3);
  });

  it('uses the exact reweighted deal over a large deterministic sample', () => {
    expect(DEAL_WEIGHTS).toEqual({ rock: 3.5, ice: 4, seed: 4, magma: 3, storm: 2.5, sun: 1.25 });
    const counts = { rock: 0, ice: 0, seed: 0, magma: 0, storm: 0, sun: 0 };
    for (let n = 21; n <= 120; n++) for (const kind of makeLevel(n).queue) counts[kind]++;
    expect(counts.ice).toBeGreaterThan(counts.rock);
    expect(counts.storm).toBeGreaterThan(counts.sun);
    expect(counts.seed).toBeGreaterThan(counts.magma);
  });
});
