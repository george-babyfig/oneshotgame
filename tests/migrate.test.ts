import { grantProfileRoadPoints, anyRoadReady, roadForProduct, roadOpen, ROAD_CATALOG } from '../src/meta/starroad';
import { ALMANAC, CALENDAR_OVERRIDES, almanacTheme, calendarSalt } from '../src/meta/almanac';
import { ROAD01 } from '../src/meta/content/road01';
import { ROAD_LANDMARKS, roadLandmarkMail } from '../src/meta/roadLandmarks';
import { COSMETICS, availableStylesRelease, stylesNewDot, themed } from '../src/meta/cosmetics';
import { describe, expect, it, vi } from 'vitest';
import { defaultProfile, migrate, PROFILE_VERSION, today } from '../src/meta/profile';
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
    expect(p.v).toBe(PROFILE_VERSION);
    expect(p.m13Migrated).toBe(true);
    expect(p.quests).toEqual(raw.quests);
    expect(p.voyage).toEqual(raw.voyage);
    expect(p.roadRecords).toEqual(
      Object.fromEntries(Object.entries(raw.roadRecords).map(([id, state]) => [id, { ...(state as object), creditedEarningKeys: [] }])),
    );
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

describe('M14 step-0 save v8 contract', () => {
  const golden = (path = 'tests/fixtures/saves/k-release-1.1.v7.json') => JSON.parse(readFileSync(path, 'utf8'));

  it('preserves the rich 1.1 promises and wallet while consolidating dedupe evidence', () => {
    const raw = golden();
    expect(raw.v).toBe(7);
    expect(raw.roadPoints).toBe(120);
    expect(raw.roadCreditedEarningKeys).toHaveLength(40);
    expect(raw.roadRecords.road00.claimedFreeTierIds).toHaveLength(12);
    expect(raw.roadRecords.road00.claimedPaidTierIds).toHaveLength(12);
    expect(raw.home.expedition.yield).toBeTruthy();
    expect(raw.home.tripReturn.yield).toBeTruthy();
    expect(raw.quests.list.some((card: { from?: string }) => card.from === 'friend')).toBe(true);
    expect(raw.voyage.theme).toBeTruthy();
    const p = migrate(raw);
    expect(p.v).toBe(9);
    expect(p.m14Migrated).toBe(true);
    for (const key of ['gems', 'dust', 'mats', 'boosters', 'quests', 'road', 'roadPass', 'pass', 'skins', 'roadPassEntitlements'] as const)
      expect(p[key], key).toEqual(raw[key]);
    // Untouched 1.1 also drops this obsolete catch-up flag for an unplayed week.
    const { legacyCatchUpPaid: _retired, ...voyage } = raw.voyage;
    expect(p.voyage).toEqual(voyage);
    expect(p.home.expedition).toEqual(raw.home.expedition);
    expect(p.home.tripReturn).toEqual(raw.home.tripReturn);
    expect(p.roadRecords.road00).toEqual({ ...raw.roadRecords.road00, creditedEarningKeys: [] });
    expect(p.roadCreditedEarningKeys).toEqual(raw.roadCreditedEarningKeys);
    expect(p.home.roadLandmarks).toEqual({});
    expect(migrate(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it('preserves the unfinished Road golden at 150 points without creating a Road 1 record', () => {
    const raw = golden('tests/fixtures/road/road0-unfinished-at-road1.v7.json');
    expect(raw.v).toBe(7);
    const p = migrate(raw);
    expect(p.roadRecords.road00).toEqual({ ...raw.roadRecords.road00, creditedEarningKeys: [] });
    expect(p.roadPoints).toBe(150);
    expect(p.roadRecords).not.toHaveProperty('road01');
    expect(migrate(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it('unions all per-Road keys, retains the newest 600 once, and rejects malformed keys', () => {
    const raw = golden();
    raw.roadRecords.road00.creditedEarningKeys = ['old-only', 'shared', null, 'x'.repeat(161)];
    raw.roadRecords.road01 = { ...raw.roadRecords.road00, creditedEarningKeys: ['road1-only', 'shared'] };
    raw.roadCreditedEarningKeys = ['shared', ...Array.from({ length: 597 }, (_, i) => `campaign:planet:${i}`), false];
    const p = migrate(raw);
    expect(p.roadCreditedEarningKeys).toEqual([
      'old-only',
      'road1-only',
      'shared',
      ...Array.from({ length: 597 }, (_, i) => `campaign:planet:${i}`),
    ]);
    expect(Object.values(p.roadRecords).every((road) => road.creditedEarningKeys.length === 0)).toBe(true);
    raw.roadCreditedEarningKeys.push('newest');
    expect(migrate(raw).roadCreditedEarningKeys).toEqual([...p.roadCreditedEarningKeys.slice(1), 'newest']);
  });

  it('keeps the live writer capped and observes point dates without changing the daily cap', () => {
    const p = migrate(golden());
    p.roadCreditedEarningKeys = Array.from({ length: 600 }, (_, i) => `campaign:old:${i}`);
    p.roadSeenDay = '2026-11-10';
    expect(grantProfileRoadPoints(p, { source: 'wish', date: '2026-11-11', earningKey: 'new', delta: 1 })).toBe(1);
    expect(p.roadCreditedEarningKeys).toHaveLength(600);
    expect(p.roadCreditedEarningKeys[0]).toBe('campaign:old:1');
    expect(p.roadCreditedEarningKeys.at(-1)).toBe('wish:new');
    expect(p.roadRecords.road00.creditedEarningKeys).toEqual([]);
    expect(p.roadSeenDay).toBe('2026-11-11');
    expect(grantProfileRoadPoints(p, { source: 'wish', date: '2026-11-09', earningKey: 'rollback', delta: 1 })).toBe(1);
    expect(p.roadSeenDay).toBe('2026-11-11');
    expect(p.roadDay).toEqual({ day: '2026-11-11', earned: 2 });
    expect(grantProfileRoadPoints(p, { source: 'wish', date: '2026-11-11', earningKey: 'new', delta: 1 })).toBe(0);
  });

  it('seeds availability from today or the later saved day, then never moves it back', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-14T12:00:00'));
      const raw = golden();
      raw.roadDay.day = '2026-10-01';
      const p = migrate(raw);
      expect(p.roadSeenDay).toBe(today());
      raw.roadDay.day = '2027-02-01';
      expect(migrate(raw).roadSeenDay).toBe('2027-02-01');
      p.roadSeenDay = '2027-03-01';
      vi.setSystemTime(new Date('2026-09-01T12:00:00'));
      expect(migrate(JSON.parse(JSON.stringify(p))).roadSeenDay).toBe('2027-03-01');
      expect(defaultProfile().roadSeenDay).toBe('');
      p.roadSeenDay = 'invalid';
      expect(migrate(JSON.parse(JSON.stringify(p))).roadSeenDay).toBe(p.roadDay.day);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps Road Landmark progress separate and sanitizes it without granting rewards', () => {
    const raw = golden();
    raw.home.roadLandmarks = {
      rl_road01: { stage: 4, progress: [2, -1, 'bad'], rewarded: ['rl_road01:stage:1'], done: 123, rounds: ['daily:1', 'daily:1'] },
      keepers_beacon: { stage: 4 },
    };
    const p = migrate(raw);
    expect(p.home.roadLandmarks).toEqual({
      rl_road01: {
        stage: 4,
        progress: [2, 0, 0],
        rewarded: ['rl_road01:stage:1'],
        done: 123,
        rounds: ['daily:1'],
        arrivals: [],
        planets: [],
      },
    });
    expect(p.home.landmarks).toEqual(raw.home.landmarks);
    expect(p.gems).toBe(raw.gems);
    expect(migrate(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});

describe('M14 step-0 dormant contracts', () => {
  it('installs Road 1, its Landmark and content, all dormant until the owner pins the opening date', () => {
    expect(ROAD_CATALOG.map((road) => road.id)).toEqual(['road00', 'road01']);
    expect(ROAD_CATALOG.map((road) => road.addedIn)).toEqual(['1.0', '1.2']);
    // Decision 86: no invented date, so Road 1 is not playable yet.
    expect(ROAD01.road.opensOn).toBeUndefined();
    expect(roadOpen(ROAD01.road, today())).toBe(false);
    for (const list of [ROAD01.road.tiers, ROAD01.looks, ROAD01.products, ROAD01.singles, ROAD01.stardust, ROAD_LANDMARKS])
      expect(list.length).toBeGreaterThan(0);
    expect(COSMETICS.some((look) => look.productId === 'com.pocketplanet.game.road01')).toBe(false);
    // Content data stays plain: at most a type-only import from cosmetics, never a runtime one.
    expect(readFileSync('src/meta/content/road01.ts', 'utf8')).not.toMatch(/^import (?!type)[^\n]*from ['"].*cosmetics/m);
    expect(Array.isArray(ALMANAC)).toBe(true);
    expect(Array.isArray(CALENDAR_OVERRIDES)).toBe(true);
  });
  it('retains the current Road mapping, calendar seeds and Styles dot without sending mail', () => {
    expect(roadForProduct('com.pocketplanet.game.road00')).toBe('road00');
    expect(roadForProduct('com.pocketplanet.game.theme.tidepool')).toBeUndefined();
    expect(roadForProduct('unknown')).toBeUndefined();
    const p = defaultProfile(0);
    const before = structuredClone(p);
    expect(anyRoadReady(p)).toBe(false);
    expect(roadLandmarkMail(p)).toBe(0);
    expect(almanacTheme('2026-W53', 'south', 'ocean')).toBe('ocean');
    expect(calendarSalt('2026-12-31')).toBe(0);
    expect(calendarSalt('2026-W53', 0)).toBe(0);
    // Before Road 1 opens the dot announces 1.0's catalogue with 1.0's rules (Home and Missions also
    // require Styles access); Road 1's own dot adds decision 82's planet and session gates.
    expect(availableStylesRelease(p, '2026-10-14')).toBe('m12');
    expect(stylesNewDot(p, '2026-10-14')).toBe(true);
    expect(p).toEqual(before);
    p.stylesNewSeen = availableStylesRelease(p, '2026-10-14');
    expect(stylesNewDot(p, '2026-10-14')).toBe(false);
  });
  it('accepts Theme data without changing either installed Theme factory output', () => {
    for (const spec of [
      { id: 'tidepool', name: 'Tidepool', colors: ['#86b6aa', '#5c8199', '#33566e'] as const, motif: 'wave' as const },
      { id: 'cometcandy', name: 'Comet Candy', colors: ['#cf9eaf', '#a4779b', '#694f87'] as const, motif: 'candy' as const },
    ]) {
      const items = themed(spec);
      expect(items).toHaveLength(16);
      expect(items).toEqual(COSMETICS.filter((look) => look.productId === `com.pocketplanet.game.theme.${spec.id}`));
    }
  });
});
