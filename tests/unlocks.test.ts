import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GOALS_FROM } from '../src/core/levels';
import { KINDS, type Kind } from '../src/core/world';
import { buddyEligible } from '../src/meta/buddy';
import { festivalActive, FESTIVAL_UNLOCK_LEVEL } from '../src/meta/festivals';
import { homeUnlocked, HOME_UNLOCK_LEVEL } from '../src/meta/homeworld';
import { letterStrings } from '../src/meta/inbox';
import { momentumActive, MOMENTUM_UNLOCK } from '../src/meta/momentum';
import { defaultProfile, migrate } from '../src/meta/profile';
import { unlocked as rankUnlocked } from '../src/meta/rank';
import { GUSTY_WIND_TIP, UNLOCKS, debutsAt, unlocked } from '../src/meta/unlocks';
import { pendingLauncherIntroAfterWin } from '../src/meta/launcherPick';
import { voyageActive, VOYAGE_UNLOCK_LEVEL } from '../src/meta/voyage';

// M3 must empty this list as it moves today's crowded Home debuts.
const KNOWN_UNTIL_M3: number[] = [];

describe('unlock ladder', () => {
  it('has three shipped launcher introductions on distinct planets', () => {
    const rows = UNLOCKS.filter((row) => row.id.startsWith('launcher_'));
    expect(rows.map((row) => row.planet)).toEqual([31, 43, 48]);
    expect(rows.every((row) => !!row.intro)).toBe(true);
    for (const row of rows) expect(debutsAt(row.planet).filter((entry) => !!entry.intro)).toHaveLength(1);
  });
  it('waits for ownership and offers one late launcher card per won planet', () => {
    const p = defaultProfile();
    p.level = 54;
    expect(pendingLauncherIntroAfterWin(p, 53)).toBeUndefined();
    p.chapters.push(3, 5);
    expect(pendingLauncherIntroAfterWin(p, 53)?.id).toBe('launcher_swoop');
    p.mailSeen.push('coach-launcher_swoop', 'launcher-intro-planet:53');
    expect(pendingLauncherIntroAfterWin(p, 53)).toBeUndefined();
    expect(pendingLauncherIntroAfterWin(p, 54)).toBeUndefined();
  });
  it('preserves old gates while fresh players follow the new ladder', () => {
    const fresh = defaultProfile();
    fresh.level = 12;
    expect(unlocked(fresh, 'festival')).toBe(false);
    expect(unlocked(fresh, 'voyage')).toBe(false);
    const old = migrate({ ...fresh, tutorial: true, m3Migrated: undefined });
    expect(unlocked(old, 'festival')).toBe(true);
    expect(unlocked(old, 'voyage')).toBe(true);
    expect(old.mailSeen).toContain('coach-festival');
    expect(old.mailSeen).toContain('coach-voyage');
    fresh.pass = true;
    expect(unlocked(fresh, 'star_road')).toBe(true);
    fresh.quests.list = [{ id: 'collect2', progress: 1, claimed: false }];
    expect(unlocked(fresh, 'quests')).toBe(true);
  });
  it('has one row per feature and keeps known debut collisions honest', () => {
    expect(new Set(UNLOCKS.map((entry) => entry.id)).size).toBe(UNLOCKS.length);
    const crowded = Array.from({ length: 60 }, (_, i) => i + 1).filter(
      (planet) => debutsAt(planet).filter((entry) => entry.intro || entry.letter || entry.button).length > 1,
    );
    expect(crowded).toEqual(KNOWN_UNTIL_M3);
  });

  it('teaches the M7 reactions and Combo on their ladder planets', () => {
    const debuts = { steam: 8, rainGarden: 13, wildflowers: 22, glacier: 25, combo: 26, scorch: 32 } as const;
    for (const [id, planet] of Object.entries(debuts)) {
      const row = UNLOCKS.find((x) => x.id === id)!;
      expect(row.planet).toBe(planet);
      expect(row.intro?.icon).toBeTruthy();
      expect(row.intro!.body.split(/\s+/).length).toBeLessThanOrEqual(row.id === 'scorch' ? 20 : 12);
      const p = defaultProfile();
      p.level = planet - 1;
      expect(unlocked(p, id as typeof row.id)).toBe(false);
      p.level = planet;
      expect(unlocked(p, id as typeof row.id)).toBe(true);
    }
  });

  it('teaches each sky obstacle once and grandfathers earlier saves', () => {
    for (const [id, planet] of Object.entries({ rocks: 33, bubble: 41, mist: 46, ring: 51, tug: 57 }) as [
      'rocks' | 'bubble' | 'mist' | 'ring' | 'tug',
      number,
    ][]) {
      const row = UNLOCKS.find((entry) => entry.id === id)!;
      expect(row.planet).toBe(planet);
      expect(row.intro?.body.toLowerCase()).toContain('red bonk badge warns you');
      expect(row.intro!.body.split(/\s+/).length).toBeLessThanOrEqual(25);
      const old = defaultProfile();
      old.level = planet + 1;
      const migrated = migrate(Object.fromEntries(Object.entries(old).filter(([key]) => key !== 'skySeen')));
      expect(migrated.skySeen).toContain(id);
      expect(migrated.mailSeen).toContain(`coach-${id}`);
    }
    expect(GUSTY_WIND_TIP).toContain('Solar Wind');
    expect(defaultProfile().settings.gentle).toBe(false);
    expect(defaultProfile().skySeen).toEqual([]);
    expect(defaultProfile().gustSeen).toBe(false);
  });

  it('has translations for every intro and letter in all five locales', () => {
    const keys = [...UNLOCKS.flatMap((entry) => (entry.intro ? [entry.intro.title, entry.intro.body] : [])), ...letterStrings()];
    for (const lang of ['de', 'pt', 'es', 'ja', 'fr']) {
      const dict = JSON.parse(readFileSync(`src/locales/${lang}.json`, 'utf8')) as Record<string, string>;
      for (const key of keys) {
        expect(dict[key], `${lang}: ${key}`).toBeDefined();
        expect([...key.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()).toEqual(
          [...dict[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
        );
      }
    }
  });

  it('matches the existing level, rank, and achievement gates', () => {
    for (let level = 1; level <= 60; level++) {
      for (const rank of [1, 2, 3, 4, 5, 8]) {
        const p = defaultProfile();
        p.level = level;
        p.rank = rank;
        p.tutorial = level > 1;
        p.stats.wins = level - 1;
        expect(unlocked(p, 'homeworld')).toBe(level >= HOME_UNLOCK_LEVEL);
        expect(homeUnlocked(p)).toBe(level >= HOME_UNLOCK_LEVEL);
        expect(unlocked(p, 'festival')).toBe(level >= FESTIVAL_UNLOCK_LEVEL);
        expect(festivalActive(p)).toBe(level >= FESTIVAL_UNLOCK_LEVEL);
        expect(unlocked(p, 'voyage')).toBe(level >= VOYAGE_UNLOCK_LEVEL);
        expect(voyageActive(p)).toBe(level >= VOYAGE_UNLOCK_LEVEL);
        expect(unlocked(p, 'momentum')).toBe(level >= MOMENTUM_UNLOCK);
        expect(momentumActive(p)).toBe(level >= MOMENTUM_UNLOCK);
        expect(unlocked(p, 'goals')).toBe(level >= GOALS_FROM);
        expect(unlocked(p, 'quest_spot')).toBe(level >= FESTIVAL_UNLOCK_LEVEL);
        expect(unlocked(p, 'quest_voyage')).toBe(level >= VOYAGE_UNLOCK_LEVEL);
        for (const kind of Object.keys(KINDS) as Kind[]) expect(unlocked(p, kind)).toBe(level >= KINDS[kind].unlock);
        for (const [mode, need] of Object.entries({ daily: 27, rush: 38, zen: 30, challenge: 40 }) as [
          'daily' | 'rush' | 'zen' | 'challenge',
          number,
        ][]) {
          const oldRank = { daily: 2, rush: 3, zen: 4, challenge: 5 }[mode];
          expect(unlocked(p, mode)).toBe(level >= need || rank >= oldRank);
          expect(rankUnlocked(p, mode)).toBe(level >= need || rank >= oldRank);
        }
        expect(unlocked(p, 'star_calendar')).toBe(level >= 21);
        expect(unlocked(p, 'passport_setup')).toBe(p.stats.wins >= 1);
        expect(unlocked(p, 'buddy')).toBe(false);
        p.sightings.bunny = 5;
        expect(unlocked(p, 'buddy')).toBe(false);
        expect(buddyEligible(p).includes('bunny')).toBe(false);
        p.home.residents.push({ species: 'bunny', fp: 0, lastReq: 0, rewarded: 0 });
        expect(unlocked(p, 'buddy')).toBe(level >= 18);
        expect(buddyEligible(p).includes('bunny')).toBe(level >= 18);
      }
    }
  });
});
