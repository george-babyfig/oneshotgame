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
    expect(p.gems).toBe(raw.gems + 1);
    expect(p.home.level).toBe(3);
    expect(p.home.plots.filter((b) => b?.type === 'mill' || b?.type === 'grove' || b?.type === 'observatory')).toEqual([]);
    expect(p.home.plots.find((b) => b?.type === 'launch_bay')?.lv).toBe(1);
    expect(p.home.expedition).toEqual(raw.home.expedition);
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
    expect(p.vault).toMatchObject({ tier: 4, bankedProductionMs: 0, storedDust: 9816 });
    expect(p.home.debris).toEqual([]);
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
