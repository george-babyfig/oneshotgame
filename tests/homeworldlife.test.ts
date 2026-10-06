import { describe, expect, it } from 'vitest';
import { addFriendship, availableLands, recordGrownSectors, setGapLand } from '../src/meta/homeworld';
import { defaultProfile, migrate } from '../src/meta/profile';
import { friendPairs, routineFor } from '../src/meta/friends';
import { seededWeatherOn, weatherOn } from '../src/meta/weather';
import { LANDMARKS } from '../src/meta/tuning';
import { landmarkState, lintLandmarkTeaching, recordLandmarkRound } from '../src/meta/landmarks';
import type { LandmarkRoundEvent } from '../src/meta/landmarks';

describe('Homeworld Life invariants', () => {
  it('has five permanent, taught, play-earned sites with no rare-colour delivery', () => {
    expect(LANDMARKS).toHaveLength(5);
    expect(lintLandmarkTeaching()).toEqual([]);
    expect(LANDMARKS.map((site) => site.stages.map((stage) => stage.routes[0].target))).toEqual([
      [12, 8, 3],
      [12, 6, 4],
      [15, 3, 4],
      [3, 8, 10],
      [5, 1, 2],
    ]);
    for (const site of LANDMARKS) {
      expect(site.stages).toHaveLength(3);
      expect(Object.keys(site.delivery).every((mat) => ['leaf', 'stone', 'dew'].includes(mat))).toBe(true);
      for (const stage of site.stages) {
        expect(stage.routes).toHaveLength(2);
        expect(stage.routes.every((route) => route.target > 0 && !!route.taught)).toBe(true);
        expect(JSON.stringify(stage).toLowerCase()).not.toMatch(/expire|timer|purchase|chore|random|paid/);
      }
    }
  });

  it('counts first arrival and new-best evidence in allowed modes with one stage payment', () => {
    const p = defaultProfile(Date.UTC(2026, 9, 6));
    p.level = 30;
    const event: LandmarkRoundEvent = {
      mode: 'campaign',
      roundKey: 'round-1',
      planetKey: 'campaign:30',
      at: Date.UTC(2026, 9, 6),
      won: true,
      stars: 1,
      difficulty: 'normal',
      newStars: 1,
      firstArrivals: ['mossbun'],
      improvedSectors: { meadow: 12 },
      fusions: 0,
      supernovas: 0,
      settledTroubles: 0,
      grownSectors: { meadow: 12 },
    };
    const before = p.dust;
    for (const mode of ['remix', 'rush', 'challenge', 'practice'] as const)
      expect(recordLandmarkRound(p, { ...event, mode }).earned).toEqual([]);
    expect(recordLandmarkRound(p, { ...event, won: false }).earned).toEqual([]);
    expect(recordLandmarkRound(p, event).earned).toMatchObject([{ dust: 100 }]);
    expect(p.dust - before).toBe(100);
    expect(recordLandmarkRound(p, { ...event, at: event.at - 86_400_000 }).earned).toEqual([]);
    expect(landmarkState(p, 'sprout_garden').stage).toBe(1);
    const next = {
      ...event,
      roundKey: 'round-2',
      improvedSectors: {},
      newStars: 0,
      firstArrivals: ['mossbun', 'owl', 'wolf', 'fish', 'fox', 'frog', 'bee', 'deer', 'bear'],
    };
    expect(recordLandmarkRound(p, next).earned).toMatchObject([{ gems: 10 }]);
    expect(recordLandmarkRound(p, { ...next, roundKey: 'round-3' }).earned).toEqual([]);
    expect(landmarkState(p, 'sprout_garden').stage).toBe(2);
  });

  it('accepts a later new best from the same planet even when the device clock rolls back', () => {
    const p = defaultProfile(Date.UTC(2026, 9, 6));
    p.level = 30;
    const base: LandmarkRoundEvent = {
      mode: 'campaign',
      roundKey: 'best-1',
      planetKey: 'campaign:30',
      at: Date.UTC(2026, 9, 6),
      won: true,
      stars: 1,
      difficulty: 'normal',
      newStars: 1,
      firstArrivals: [],
      improvedSectors: { meadow: 7 },
      grownSectors: { meadow: 7 },
      fusions: 0,
      supernovas: 0,
      settledTroubles: 0,
    };
    expect(recordLandmarkRound(p, base).earned).toEqual([]);
    const newBest = { ...base, roundKey: 'best-2', at: base.at - 86_400_000, improvedSectors: { forest: 5 } };
    expect(recordLandmarkRound(p, newBest).earned).toMatchObject([{ dust: 100 }]);
    expect(landmarkState(p, 'sprout_garden').stage).toBe(1);
  });

  it('derives the same routine and pair action from the same local minute', () => {
    const p = defaultProfile(Date.UTC(2026, 9, 6));
    const date = new Date(2026, 9, 6, 12, 34);
    const friend = { species: 'owl', fp: 8, lastReq: -1, rewarded: 3 };
    p.home.residents.push(friend);
    expect(routineFor(friend, date, 'clear', 'autumn')).toEqual(routineFor(friend, new Date(date), 'clear', 'autumn'));
    expect(friendPairs(p.home.residents, date, p.home.gaps, p.home)).toEqual(
      friendPairs(p.home.residents, new Date(date), p.home.gaps, p.home),
    );
    const night = routineFor(friend, new Date(2026, 9, 6, 23), 'clear', 'autumn');
    expect(night.awake).toBe(true);
    expect(night.respondsToTap).toBe(true);
    const sleeping = routineFor('mossbun', new Date(2026, 9, 6, 23), 'clear', 'autumn');
    expect(sleeping.awake).toBe(false);
    expect(sleeping.respondsToTap).toBe(true);
  });

  it('keeps weather date-seeded, hemisphere-specific and economically inert', () => {
    const p = defaultProfile(Date.UTC(2026, 9, 6));
    const before = JSON.stringify(p);
    expect(
      Array.from({ length: 366 }, (_, offset) => new Date(2026, 0, offset + 1, 12)).some(
        (day) => seededWeatherOn(day, 'north') !== seededWeatherOn(day, 'south'),
      ),
    ).toBe(true);
    for (let day = 1; day <= 366; day++) {
      const noon = new Date(2026, 0, day, 12);
      const night = new Date(2026, 0, day, 23);
      for (const hemisphere of ['north', 'south'] as const) {
        expect(seededWeatherOn(noon, hemisphere)).toBe(seededWeatherOn(night, hemisphere));
        expect(weatherOn(noon, hemisphere)).toBe(weatherOn(new Date(noon), hemisphere));
        if (seededWeatherOn(noon, hemisphere) === 'starry') {
          expect(weatherOn(noon, hemisphere)).toBe('clear');
          expect(weatherOn(night, hemisphere)).toBe('starry');
        }
      }
    }
    expect(JSON.stringify(p)).toBe(before);
  });

  it('counts only eligible winning evidence once and keeps land choices free and reversible', () => {
    const p = defaultProfile(Date.UTC(2026, 9, 6));
    const event = {
      mode: 'campaign' as const,
      roundKey: 'campaign:30:first-best',
      planetKey: 'campaign:30',
      at: Date.UTC(2026, 9, 6),
      grownSectors: { meadow: 10 },
    };
    expect(recordGrownSectors(p, { ...event, mode: 'remix' })).toBe(false);
    expect(recordGrownSectors(p, event)).toBe(true);
    expect(recordGrownSectors(p, { ...event, at: event.at - 86_400_000 })).toBe(false);
    expect(p.stats.grown.meadow).toBe(10);
    expect(availableLands(p)).toContain('meadow');
    const before = [p.dust, p.gems, { ...p.mats }];
    expect(setGapLand(p, 0, 'meadow')).toBe(true);
    expect(setGapLand(p, 0, null)).toBe(true);
    expect([p.dust, p.gems, p.mats]).toEqual(before);
    expect(setGapLand(p, 0, 'barren')).toBe(false);
  });

  it('inherits paid Comet Pier stages without replaying their value on old saves', () => {
    const old = defaultProfile(Date.UTC(2026, 9, 6));
    old.home.level = 4;
    old.cometPier.stage = 3;
    const saved = JSON.parse(JSON.stringify(old));
    delete saved.m115Migrated;
    delete saved.home.landmarks;
    const loaded = migrate(saved);
    expect(loaded.home.landmarks.comet_pier.stage).toBe(3);
    expect(loaded.home.landmarks.comet_pier.rewarded).toEqual(['comet_pier:stage:1', 'comet_pier:stage:2', 'comet_pier:stage:3']);
    const again = migrate(JSON.parse(JSON.stringify(loaded)));
    expect(again.home.landmarks.comet_pier).toEqual(loaded.home.landmarks.comet_pier);
    expect([again.dust, again.gems]).toEqual([loaded.dust, loaded.gems]);
  });

  it('credits friendship value when earned, before its celebration or letter is opened', () => {
    const p = defaultProfile(Date.UTC(2026, 9, 6));
    const friend = { species: 'mossbun', fp: 0, lastReq: -1, rewarded: 1 };
    p.home.residents.push(friend);
    const before = p.gems;

    addFriendship(p, friend, 25);
    expect(friend.rewarded).toBe(5);
    expect(p.gems - before).toBe(10 + 15 + 20 + 25 + 25);
    expect(p.home.seen.celebrations).toEqual(expect.arrayContaining(['friend:mossbun:level:2', 'friend:mossbun:level:5']));
    expect(p.mail.find((letter) => letter.id === 'best-mossbun')).toMatchObject({ claimed: true, read: false });

    addFriendship(p, friend, 0);
    expect(p.gems - before).toBe(95);
    expect(p.mail.filter((letter) => letter.id === 'best-mossbun')).toHaveLength(1);
  });
});
