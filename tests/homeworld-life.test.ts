import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';
import {
  addFriendship,
  availableLands,
  recordGrownSectors,
  recordHomeworldWin,
  resolvedGaps,
  setGapLand,
  takeHomeCelebrations,
} from '../src/meta/homeworld';
import { friendPairs, homeSpotFor, keepsakeFor, KEEPSAKE_IDS, reactionsFor, routineFor } from '../src/meta/friends';
import { SEASON_DRESSING, seasonOf } from '../src/meta/seasons';
import { seededWeatherOn, WEATHER_WEIGHTS, weatherOn } from '../src/meta/weather';
import { claimMail } from '../src/meta/inbox';

const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month, day, hour, minute);

describe('Homeworld Life routines and weather', () => {
  it('derives fixed routines from an injected clock and keeps sleeping friends responsive', () => {
    const otter = { species: 'otter', fp: 8, lastReq: -1, rewarded: 3 };
    const morning = routineFor(otter, at(5, 2, 8), 'clear', 'summer');
    expect(morning).toEqual(routineFor(otter, at(5, 2, 8), 'clear', 'summer'));
    expect(morning).toMatchObject({ block: 'morning', awake: true, activity: 'walk_home', signatureId: 'signature:otter' });
    expect(routineFor(otter, at(5, 2, 12), 'clear', 'summer').activity).toBe('signature');
    expect(routineFor('fish', at(5, 2, 13), 'drizzle', 'summer').activity).toBe('puddle_dance');
    expect(routineFor(otter, at(5, 2, 23), 'clear', 'summer')).toMatchObject({
      block: 'night',
      awake: false,
      activity: 'sleep',
      respondsToTap: true,
      tapPose: 'sleepy_wave',
    });
    for (const species of ['owl', 'wolf', 'fish'])
      expect(routineFor(species, at(5, 2, 23), 'starry', 'summer')).toMatchObject({ awake: true, activity: 'stargaze' });
    expect(routineFor('owl', at(5, 2, 5), 'clear', 'summer').awake).toBe(false);
  });

  it('selects neighbouring friend reactions from IDs and the minute', () => {
    const p = defaultProfile(0);
    p.home.residents = [
      { species: 'otter', fp: 0, lastReq: -1, rewarded: 1 },
      { species: 'deer', fp: 0, lastReq: -1, rewarded: 1 },
    ];
    p.home.gaps[0] = 'forest';
    p.home.gaps[1] = 'forest';
    expect(homeSpotFor(p.home.residents[0], p.home, p.home.gaps)).toEqual({ kind: 'gap', index: 0 });
    const date = at(5, 2, 12, 7);
    expect(friendPairs(p.home.residents, date, p.home.gaps, p.home)).toEqual(
      friendPairs([...p.home.residents].reverse(), date, p.home.gaps, p.home),
    );
    expect(friendPairs(p.home.residents, at(5, 2, 23), p.home.gaps, p.home)).toEqual([]);
    expect(reactionsFor(p.home, { kind: 'land_planted', biome: 'forest' }, date).map((r) => r.species)).toEqual(['deer', 'otter']);
    expect(reactionsFor(p.home, { kind: 'decoration_placed', decoration: 'fountain' }, date)).toEqual([]);
  });

  it('uses the specified seasonal weights and hides Starry during daylight', () => {
    expect(WEATHER_WEIGHTS).toEqual({
      spring: [45, 20, 25, 0, 10],
      summer: [60, 15, 10, 0, 15],
      autumn: [40, 30, 25, 0, 5],
      winter: [35, 15, 10, 35, 5],
    });
    expect(Object.keys(SEASON_DRESSING)).toEqual(['spring', 'summer', 'autumn', 'winter']);
    expect(seasonOf(at(0, 10, 12), 'south')).toBe('summer');
    expect(seededWeatherOn(at(0, 10, 12), 'north')).toBe(seededWeatherOn(at(0, 10, 23), 'north'));
    for (let day = 1; day <= 31; day++) {
      expect(seededWeatherOn(at(4, day, 12), 'north')).not.toBe('snow');
      if (seededWeatherOn(at(4, day, 12), 'north') === 'starry') {
        expect(weatherOn(at(4, day, 12), 'north')).toBe('clear');
        expect(weatherOn(at(4, day, 23), 'north')).toBe('starry');
      }
    }
  });
});

describe('grown lands and celebrations', () => {
  it('counts real eligible wins once and only offers lands after ten sectors', () => {
    const p = defaultProfile(0);
    const win = {
      mode: 'campaign' as const,
      planetKey: 'campaign:9',
      roundKey: 'win:9:1',
      at: 1,
      grownSectors: { forest: 9, meadow: 10, barren: 12 },
    };
    expect(recordGrownSectors(p, win)).toBe(true);
    expect(recordGrownSectors(p, win)).toBe(false);
    expect(p.stats.grown).toEqual({ forest: 9, meadow: 10 });
    expect(availableLands(p)).toEqual(['meadow']);
    expect(setGapLand(p, 0, 'forest')).toBe(false);
    expect(setGapLand(p, 0, 'meadow')).toBe(true);
    expect(recordGrownSectors(p, { ...win, mode: 'daily', roundKey: 'daily:1' })).toBe(false);
    expect(recordGrownSectors(p, { ...win, mode: 'zen', roundKey: 'zen:1', grownSectors: { forest: 1 } })).toBe(true);
    expect(availableLands(p)).toEqual(['forest', 'meadow']);
    expect(resolvedGaps(p)[0]).toBe('meadow');
    expect(setGapLand(p, 0, null)).toBe(true);
    expect(setGapLand(p, 0, 'barren')).toBe(false);
  });

  it('records final sectors through the Homeworld win operation only once', () => {
    const p = defaultProfile(0);
    const event = {
      mode: 'voyage' as const,
      planetKey: 'voyage:week-1',
      roundKey: 'voyage:week-1:win-1',
      at: 5,
      buddySpecies: null,
      grownSectors: { reef: 10 },
    };
    recordHomeworldWin(p, event);
    recordHomeworldWin(p, event);
    expect(p.stats.grown.reef).toBe(10);
    expect(availableLands(p)).toContain('reef');
  });

  it('repairs malformed saved land and landmark state without inventing a grown tally', () => {
    const p = defaultProfile(0);
    const raw = JSON.parse(JSON.stringify(p));
    raw.stats.grown = { forest: 12.7, barren: 999, nonsense: 50, reef: -3 };
    raw.home.gaps = ['forest', 'reef', 'nonsense', 'barren'];
    raw.home.landmarks.skyglass = { stage: 99, progress: [3, -2, 'bad'], rewarded: ['ok', 'ok', '../bad'] };
    raw.home.grownRoundKeys = Array.from({ length: 100 }, (_, n) => `round-${n}`);
    raw.home.landmarks.sprout_garden.rounds = Array.from({ length: 100 }, (_, n) => `landmark-${n}`);
    const loaded = migrate(raw);
    expect(loaded.stats.grown).toEqual({ forest: 12 });
    expect(loaded.home.gaps).toEqual(['forest', null, null, null, null, null]);
    expect(loaded.home.landmarks.skyglass).toMatchObject({ stage: 0, progress: [0, 0, 0, 0, 0, 0], rewarded: [] });
    expect(loaded.home.grownRoundKeys).toHaveLength(64);
    expect(loaded.home.landmarks.sprout_garden.rounds).toHaveLength(64);
    expect(migrate(JSON.parse(JSON.stringify(loaded)))).toEqual(loaded);
  });

  it('pays every friendship gift immediately and queues only the visit presentation', () => {
    const p = defaultProfile(0);
    const friend = { species: 'otter', fp: 7, lastReq: -1, rewarded: 2 };
    p.home.residents.push(friend);
    const before = p.gems;
    expect(addFriendship(p, friend, 1)).toMatchObject({ levelUp: 3, gems: 15 });
    expect(p.gems).toBe(before + 15);
    expect(p.home.seen.celebrations).toContain('friend:otter:level:3');
    expect(addFriendship(p, friend, 17)).toMatchObject({ levelUp: 5, gems: 70 });
    expect(p.gems).toBe(before + 85);
    expect(p.mementos).toContain('otter');
    expect(keepsakeFor(friend)).toBe('keepsake:otter');
    expect(KEEPSAKE_IDS).toHaveLength(36);
    expect(p.mail.find((m) => m.id === 'best-otter')).toMatchObject({ claimed: true, read: false });
    expect(claimMail(p, 'best-otter')).toBeNull();
    expect(takeHomeCelebrations(p)).toContain('friend:otter:level:5');
    expect(p.home.seen.celebrations).toEqual([]);
    expect(addFriendship(p, friend, 0)).toEqual({});
    expect(p.gems).toBe(before + 85);
  });
});
