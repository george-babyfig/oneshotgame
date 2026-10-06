import { describe, expect, it } from 'vitest';
import { makeLevel } from '../src/core/levels';
import { clonePlanet } from '../src/core/world';
import { GROWABLE_LANDS, availableLands, ownedIsleDecorations, setIsleDecoration } from '../src/meta/homeworld';
import { defaultProfile, migrate } from '../src/meta/profile';
import { settleHomeworldRound, type SettledRound } from '../src/meta/roundSettlement';

function round(key: string, patch: Partial<SettledRound> = {}): SettledRound {
  const planet = clonePlanet(makeLevel(30).start);
  planet.sectors.forEach((sector) => (sector.biome = 'meadow'));
  return {
    mode: 'campaign',
    roundKey: key,
    planetKey: 'campaign:30',
    planet,
    won: true,
    writesProgress: true,
    stars: 3,
    difficulty: 'normal',
    newStars: 3,
    buddySpecies: null,
    at: 1000,
    steps: [
      {
        firstArrivals: [],
        improvedSectors: { meadow: 12 },
        fusions: 0,
        supernovas: 0,
        settledTroubles: 0,
        settledVent: 0,
        settledVine: 0,
        reactions: {},
      },
    ],
    ...patch,
  };
}

describe('completed Homeworld rounds', () => {
  it('credits separate Voyage replays of one stop to friendship and Greenhouse', () => {
    const p = defaultProfile();
    p.level = 30;
    p.home.residents.push({ species: 'otter', fp: 0, lastReq: 0, rewarded: 0 });
    p.home.plots[0] = { type: 'greenhouse', lv: 1, since: 0, greenhouse: { choice: 'scope', winsTowardNext: 0, stored: 0 } };
    const first = round('voyage-1', { mode: 'voyage', planetKey: 'voyage:same-stop', buddySpecies: 'otter', steps: [] });
    settleHomeworldRound(p, first);
    settleHomeworldRound(p, { ...first, roundKey: 'voyage-2', stars: 3 });
    expect(p.home.residents[0].fp).toBe(2);
    expect(p.home.plots[0]?.greenhouse?.winsTowardNext).toBe(2);
    settleHomeworldRound(p, first);
    expect(p.home.residents[0].fp).toBe(2);
  });
  it('keeps recent round keys bounded while waiting for a Landmark delivery', () => {
    const p = defaultProfile();
    p.level = 30;
    p.home.landmarks.sprout_garden.stage = 3;
    for (let n = 0; n < 70; n++) settleHomeworldRound(p, round(`round-${n}`, { steps: [] }));
    expect(p.home.grownRoundKeys).toHaveLength(64);
    expect(p.home.landmarks.sprout_garden.rounds).toHaveLength(0);
  });
  it('credits growth, a feat and its queued celebration once per persistent round key', () => {
    const p = defaultProfile();
    p.level = 30;
    const before = p.dust;
    expect(settleHomeworldRound(p, round('saved-round')).earned).toMatchObject([{ dust: 100 }]);
    expect(p.dust - before).toBe(100);
    expect(p.home.seen.celebrations).toContain('sprout_garden:stage:1');
    expect(p.stats.grown.meadow).toBe(24);
    settleHomeworldRound(p, round('other-round', { steps: [] }));
    expect(settleHomeworldRound(p, round('saved-round')).earned).toEqual([]);
    expect(p.stats.grown.meadow).toBe(48);
    expect(p.dust - before).toBe(100);
  });

  it('credits no progress for modes and attempts that write nothing', () => {
    for (const patch of [
      { mode: 'remix' as const },
      { mode: 'rush' as const },
      { mode: 'challenge' as const },
      { mode: 'practice' as const },
      { writesProgress: false },
      { won: false },
    ]) {
      const p = defaultProfile();
      p.level = 30;
      const before = p.dust;
      expect(settleHomeworldRound(p, round('ignored', patch)).earned).toEqual([]);
      expect(p.stats.grown).toEqual({});
      expect(p.dust).toBe(before);
    }
  });

  it('queues presentation only after the stage reward is in the wallet', () => {
    const p = defaultProfile();
    p.level = 30;
    const before = p.dust;
    const result = settleHomeworldRound(p, round('reward'));
    expect(result.celebrations).toEqual(['sprout_garden:stage:1']);
    expect(p.dust).toBe(before + 100);
    expect(p.home.seen.celebrations).toContain(result.celebrations[0]);
  });

  it('accepts a Daily feat while keeping Daily out of the grown-land tally', () => {
    const p = defaultProfile();
    p.level = 30;
    expect(settleHomeworldRound(p, round('daily:2026-10-06', { mode: 'daily' })).earned).toMatchObject([{ dust: 100 }]);
    expect(p.home.lastWonRound).toBe('daily:2026-10-06');
    expect(p.stats.grown).toEqual({});
  });

  it('keeps paid Pier progress and Zip on migration', () => {
    const raw = defaultProfile() as unknown as Record<string, unknown>;
    raw.v = 4;
    raw.m115Migrated = false;
    const pier = raw.cometPier as Record<string, unknown>;
    pier.stage = 4;
    pier.hardWins = 3;
    pier.troubles = 8;
    pier.fusions = 10;
    const p = migrate(raw);
    const before = [p.dust, p.gems];
    expect(p.home.landmarks.comet_pier.stage).toBe(4);
    expect(p.cometPier.stage).toBe(4);
    settleHomeworldRound(p, round('old-save'));
    expect([p.dust, p.gems]).toEqual(before);
    expect(p.cometPier.stage).toBe(4);
  });

  it('offers exactly the growable biome table and free Isle placement of owned art', () => {
    const p = defaultProfile();
    expect(GROWABLE_LANDS).toHaveLength(16);
    expect(GROWABLE_LANDS).not.toContain('barren');
    p.stats.grown.meadow = 10;
    expect(availableLands(p)).toContain('meadow');
    p.home.landmarks.sky_bridge.stage = 4;
    p.home.plots[0] = { type: 'lantern', lv: 1, since: 0 };
    expect(ownedIsleDecorations(p)).toContain('lantern');
    const dust = p.dust;
    expect(setIsleDecoration(p, 0, 'lantern')).toBe(true);
    expect(setIsleDecoration(p, 2, 'lantern')).toBe(true);
    expect(p.home.isleDecor).toEqual([null, null, 'lantern']);
    expect(p.dust).toBe(dust);
    expect(setIsleDecoration(p, 1, 'statue')).toBe(false);
  });
});
