import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';
import { openChest, chapterReward } from '../src/meta/progression';

describe('profile migration', () => {
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
