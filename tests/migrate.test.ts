import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';
import { readFileSync } from 'node:fs';
import { openChest, chapterReward } from '../src/meta/progression';

describe('profile migration', () => {
  it('defaults the full aim-line assist off while retaining an explicit on choice', () => {
    expect(defaultProfile(0).settings.fullAimLine).toBe(false);
    expect(migrate({ v: 3, settings: { fullAimLine: true } }).settings.fullAimLine).toBe(true);
    expect(migrate({ v: 3, settings: { fullAimLine: 'true' } }).settings.fullAimLine).toBe(false);
  });
  it('maps the pre-M11 golden once and returns every paid retired tier', () => {
    const raw = JSON.parse(readFileSync('tests/fixtures/saves/h-pre-m11.v3.json', 'utf8'));
    const p = migrate(structuredClone(raw));
    // Scope 250+700+1600; Throws 400+1200; Splash 5000;
    // Mill L3 150+380+900 and L1 150; Grove L1 2000; Observatory L2 2500+6250.
    const refund = 2550 + 1600 + 5000 + 1430 + 150 + 2000 + 8750;
    expect(p.dust).toBe(raw.dust + refund + 1500);
    expect(p.gems).toBe(raw.gems + 1 + 3); // three Event tokens beyond the last reached tier become gems.
    expect(p.home.level).toBe(3);
    expect(p.home.plots.filter((b) => b?.type === 'mill' || b?.type === 'grove' || b?.type === 'observatory')).toEqual([]);
    expect(p.home.plots.find((b) => b?.type === 'launch_bay')?.lv).toBe(1);
    expect(p.home.expedition).toMatchObject(raw.home.expedition);
    expect(p.home.plots.find((b) => b?.type === 'greenhouse')?.greenhouse).toMatchObject({
      choice: 'shower',
      winsTowardNext: 0,
      stored: 2,
      storedByType: { shower: 2, spark: 0, scope: 0 },
    });
    const withoutObservatory = structuredClone(raw);
    withoutObservatory.home.plots = withoutObservatory.home.plots.map((b: { type: string } | null) =>
      b?.type === 'observatory' ? null : b,
    );
    expect(migrate(withoutObservatory).home.plots.find((b) => b?.type === 'greenhouse')?.greenhouse?.stored).toBe(1);
    expect(p.lab).toEqual(raw.lab);
    expect(p.wardrobe).toEqual(raw.wardrobe);
    expect(p.processedTx).toEqual(raw.processedTx);
    expect(p.vault).toMatchObject({ bankedProductionMs: 0, storedDust: 9816 });
    expect(p.home).not.toHaveProperty('debris');
    const twice = migrate(JSON.parse(JSON.stringify(p)));
    expect(twice.dust).toBe(p.dust);
    expect(twice.home.plots.find((b) => b?.type === 'greenhouse')?.greenhouse?.stored).toBe(2);
  });

  it('does not accrue legacy Vault dust through a clock rollback', () => {
    const old = defaultProfile(Date.now() + 86400000);
    old.m11Migrated = false;
    old.vault.storedDust = 0;
    old.galaxy = [{ n: 1, name: '', hue: 0, stars: 3, species: [], life: 0, colors: [] }];
    const migrated = migrate(JSON.parse(JSON.stringify(old)));
    expect(migrated.vault.storedDust).toBe(0);
    expect(migrated.vault.lastTick).toBe(old.lastCollect);
    expect(migrated.lastCollect).toBe(old.lastCollect);
  });

  it('seeds accrued legacy Vault dust only through its paid storage cap', () => {
    const old = defaultProfile(0);
    old.m11Migrated = false;
    old.galaxy = [{ n: 1, name: '', hue: 0, stars: 3, species: [], life: 0, colors: [] }];
    old.upgrades.vault = 1;
    const p = migrate(JSON.parse(JSON.stringify(old)));
    expect(p.vault.storedDust).toBe(15 * 8);
  });
  it('uses defaults for fields saved with the wrong type', () => {
    const p = migrate({ v: 3, settings: 'broken', stats: 17, chapters: 'broken' });
    expect(p.settings.sound).toBe(true);
    expect(p.stats.wins).toBe(0);
    expect(p.chapters).toEqual([]);
  });

  it('turns off old reminder settings and fills new counters', () => {
    const old = defaultProfile(0);
    const { gameCenter: _gameCenter, ...oldSettings } = old.settings;
    const { fails: _fails, visits: _visits, continuesUsed: _continuesUsed, ...oldProfile } = old;
    const saved = { ...oldProfile, settings: { ...oldSettings, notifications: true } };
    const p = migrate({ ...saved });
    expect(p.settings.notifications).toBe(false);
    expect(p.settings.gameCenter).toBe(false);
    expect(p.fails).toEqual({});
    expect(p.visits).toEqual({});
    expect(p.continuesUsed).toEqual({});
  });

  it('keeps a new save’s chosen settings and counters', () => {
    const saved = defaultProfile(0);
    saved.settings.notifications = true;
    saved.settings.gameCenter = true;
    saved.fails[11] = 2;
    saved.visits.bunny = 3;
    saved.continuesUsed[11] = 1;
    const p = migrate({ ...saved });
    expect(p.settings.notifications).toBe(true);
    expect(p.settings.gameCenter).toBe(true);
    expect(p.fails[11]).toBe(2);
    expect(p.visits.bunny).toBe(3);
    expect(p.continuesUsed[11]).toBe(1);
  });

  it('keeps paid rank rewards and catches up unpaid ranks in the next chest', () => {
    const saved = defaultProfile(0);
    saved.rank = 3;
    saved.level = 51;
    saved.chapters = [1, 2, 3, 4];
    const { m4RankPaidThrough: _flag, ...oldSave } = saved;
    const p = migrate(oldSave);
    expect(p.m4RankPaidThrough).toBe(2);
    const preview = chapterReward(5, p);
    const before = p.gems;
    expect(openChest(p, 5)).toEqual(preview);
    expect(p.gems - before).toBe(preview.gems);
    expect(p.m4RankPaidThrough).toBe(5);
    expect(openChest(p, 5)).toBeNull();
    const oldHighRank = migrate({ ...oldSave, rank: 8, chapters: [] });
    expect(chapterReward(1, oldHighRank).gems).toBe(30);
  });

  it('moves legacy Wish points out of campaign stars', () => {
    const saved = defaultProfile(0);
    saved.stars = { 0: 3, 1: 2 };
    const { roadPoints: _points, ...oldSave } = saved;
    const p = migrate(oldSave);
    expect(p.roadPoints).toBe(5);
    expect(p.stars[0]).toBeUndefined();
  });
});

describe('M13 preserving save migration', () => {
  const rawGolden = () => JSON.parse(readFileSync('tests/fixtures/saves/j-release-1.0.v6.json', 'utf8'));
  it('keeps the untouched 1.0 fixture rich, old-format and reproducible', () => {
    const raw = rawGolden();
    expect(raw.v).toBe(6);
    expect(raw).not.toHaveProperty('m13Migrated');
    expect(raw.galaxy.length).toBeGreaterThanOrEqual(25);
    expect(raw.galaxy.some((g: { colors: string[] }) => !g.colors.length)).toBe(true);
    expect(raw.galaxy.every((g: object) => !('sec' in g))).toBe(true);
    expect(raw.home.residents.map((r: { fp: number }) => r.fp)).toEqual([2, 9, 24]);
    expect(raw.home.expedition).toEqual({ species: 'otter', hours: 4, ends: Date.UTC(2026, 10, 4, 16), planet: expect.any(Number) });
    expect(raw.home.expedition).not.toHaveProperty('n');
    expect(raw.voyage.cleared).toBe(2);
    expect(raw.voyage).not.toHaveProperty('theme');
    expect(raw.quests.list.some((q: { claimed: boolean }) => !q.claimed)).toBe(true);
    expect(raw.roadPoints).toBe(60);
    expect(raw.pass).toBe(true);
    expect(raw.roadPassEntitlements).toContain('road00');
    expect(raw.meta.productEntitlements).toContain('com.pocketplanet.game.theme.tidepool');
    expect(raw.settings).toMatchObject({ notifications: true, gameCenter: true });
    expect(raw.home.lastTick).toBeGreaterThan(0);
    expect(raw.vault.lastTick).toBeGreaterThan(0);
  });
  it('preserves Wishes, Road, Voyage and chosen privacy settings, and migrates once', () => {
    const raw = rawGolden();
    const p = migrate(raw);
    expect(p.v).toBe(7);
    expect(p.m13Migrated).toBe(true);
    expect(p.quests).toEqual(raw.quests);
    expect(p.voyage).toEqual(raw.voyage);
    expect(p.roadRecords).toEqual(raw.roadRecords);
    expect(p.settings).toEqual(raw.settings);
    expect(p.home.tripFuel).toBe(true);
    expect(p.home.tripReturn).toBeNull();
    expect(p.home.expedition).toMatchObject({
      n: p.galaxy[raw.home.expedition.planet].n,
      legacyLoot: { dust: 24, gems: 2, boosters: { spark: 1 } },
    });
    expect(p.galaxy.every((g) => g.sec?.length === 120 && g.approx === 1)).toBe(true);
    expect(migrate(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it.each([
    null,
    false,
    [],
    {},
    'bad',
    { species: 'otter', hours: 2, ends: 100, planet: 0 },
    { species: 'otter', hours: 4, ends: Infinity, planet: 0 },
    { species: 'invalid', hours: 4, ends: 100, planet: 0 },
  ])('rejects malformed null-default trips: %j', (trip) => {
    const raw = rawGolden();
    raw.home.expedition = trip;
    expect(migrate(raw).home.expedition).toBeNull();
  });
  it('clamps old future trips and freezes the effective Bay level without paying friendship', () => {
    const raw = rawGolden();
    const now = Date.now();
    raw.home.expedition.ends = now + 100 * 86400000;
    raw.home.plots[0] = { type: 'launch_bay', lv: 3, done: now + 3600000 };
    const p = migrate(raw);
    expect(p.home.expedition?.ends).toBeLessThanOrEqual(Date.now() + 4 * 3600000);
    expect(p.home.expedition?.legacyLoot?.dust).toBe(24); // upgrading Bay 3 still effectively 2
    expect(p.home.residents).toEqual(raw.home.residents);
  });
});

// This is the contract consumed by noun audits and the nightly backup-size career.
describe('step-0 career options', () => {
  it('retains untilLevel/onLevel and returns the profile', async () => {
    const { simulate } = await import('./sim/economy/career');
    const levels: number[] = [];
    const c = await simulate('Regular', 'default', { days: 3, untilLevel: 3, onLevel: (p) => levels.push(p.level) });
    expect(levels).toEqual([2, 3, 4]);
    expect(c.profile.level).toBe(4);
    expect(c.days).toHaveLength(1);
  });
  it('supports the complete 180-day size career and rejects invalid day counts', async () => {
    const { simulate } = await import('./sim/economy/career');
    for (const days of [0, -1, 181, 1.5, NaN]) await expect(simulate('Regular', 'default', { days })).rejects.toThrow(RangeError);
    const c = await simulate('Regular', 'default', { days: 180 });
    expect(c.days).toHaveLength(180);
    expect(c.profile.level).toBe(c.days.at(-1)?.level);
    expect(c.profile.home.residents.length).toBeGreaterThan(1);
    expect(c.bayLevelDays[3]).toBeGreaterThan(0);
    expect(c.profile.galaxy.every((g) => g.sec?.length === 120)).toBe(true);
  }, 120000);
});
