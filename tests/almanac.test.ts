import { describe, expect, it, vi } from 'vitest';
import * as almanac from '../src/meta/almanac';
import { EVENTS, eventFor, eventForWeek, isoWeek, weekStart } from '../src/meta/events';
import { seasonOf } from '../src/meta/seasons';
import { defaultProfile } from '../src/meta/profile';
import { dailyLevel } from '../src/meta/modes';
import { ensureVoyage, portName, stopReward, voyageLevel } from '../src/meta/voyage';

describe('B12 append-only almanac and override contract', () => {
  it('keeps the shipped prefix and the full M13 golden boundary', () => {
    expect(almanac.ALMANAC_FROZEN_THROUGH).toBe('2027-W03');
    expect(almanac.ALMANAC.slice(0, 4)).toEqual([
      { week: '2027-W04', north: 'star', south: 'volcano', headline: 'Starfall Week' },
      { week: '2027-W08', north: 'ocean', south: 'ocean', headline: 'Ocean Week' },
      { week: '2027-W12', north: 'bloom', south: 'critter', headline: 'Blossom Week' },
      { week: '2027-W25', north: 'volcano', south: 'star', headline: 'Volcano Week' },
    ]);
    // No override has shipped yet; pin its nonempty prefix here when the first repair ships.
  });
  it('has at most one weekly and one monthly headline, only existing themes and no Remix', () => {
    const weekly = new Set<string>();
    const monthly = new Set<string>();
    for (const row of almanac.ALMANAC) {
      expect(row.week > almanac.ALMANAC_FROZEN_THROUGH).toBe(true);
      expect(weekly.has(row.week)).toBe(false);
      weekly.add(row.week);
      const monday = weekStart(row.week);
      const month = monday.toISOString().slice(0, 7);
      if (row.headline) {
        expect(monthly.has(month)).toBe(false);
        monthly.add(month);
        expect(EVENTS.some((theme) => theme.name === row.headline)).toBe(true);
      }
      for (const hemisphere of ['north', 'south'] as const) {
        const id = row[hemisphere];
        if (!id) continue;
        expect(EVENTS.some((theme) => theme.id === id)).toBe(true);
        expect(id.toLowerCase()).not.toContain('remix');
        if (id === 'frost') {
          const local = new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 12);
          expect(seasonOf(local, hemisphere)).toBe('winter');
        }
      }
    }
  });
  it('accepts only future, unique, integer-salt day or zero-based week-stop repairs', () => {
    const keys = new Set<string>();
    for (const row of almanac.CALENDAR_OVERRIDES) {
      expect(Number.isSafeInteger(row.salt) && row.salt > 0).toBe(true);
      let key: string;
      if (row.day !== undefined) {
        expect(row.week).toBeUndefined();
        expect(row.stop).toBeUndefined();
        expect(new Date(`${row.day}T12:00:00Z`).toISOString().slice(0, 10)).toBe(row.day);
        expect(isoWeek(new Date(`${row.day}T12:00:00`)) > almanac.ALMANAC_FROZEN_THROUGH).toBe(true);
        key = row.day;
      } else {
        expect(row.week > almanac.ALMANAC_FROZEN_THROUGH).toBe(true);
        expect(weekStart(row.week).getUTCDay()).toBe(1);
        expect(Number.isInteger(row.stop) && row.stop >= 0 && row.stop < 7).toBe(true);
        key = `${row.week}:${row.stop}`;
      }
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
    expect(almanac.calendarOverride({ day: '2026-11-02' })).toBe(0);
    expect(almanac.calendarOverride({ week: '2026-W45', stop: 0 })).toBe(0);
  });
  it('prefers the saved theme and preserves the legacy rotation without polluting later phases', () => {
    expect(eventForWeek('2027-W04', 'north').id).toBe('star');
    expect(eventForWeek('2027-W04', 'north', 'ocean').id).toBe('ocean');
    const row = almanac.ALMANAC.find((row) => row.north && eventForWeek(row.week, 'north', null).id !== row.north)!;
    expect(row).toBeDefined();
    expect(eventForWeek(row.week, 'north', null).id).not.toBe(row.north);
    const following = eventFor('2027-W05', 'north', null);
    eventFor('2027-W04', 'north');
    expect(eventFor('2027-W05', 'north')).toEqual(following);
    expect(almanac.almanacTheme('2027-W03', 'north', 'ocean')).toBe('ocean');
  });
  it('keeps a started route, its ports, layouts and atmosphere on its saved theme', () => {
    const p = defaultProfile(0);
    p.level = 28;
    p.voyage = { week: '2027-W04', base: 24, cleared: 1, stars: [1], theme: 'ocean', legacyCatchUpPaid: true, hemisphere: 'north' };
    ensureVoyage(p, p.voyage.week);
    expect(p.voyage.theme).toBe('ocean');
    expect(portName(p.voyage.week, 0, 'north', p.voyage.theme)).toBe('Blue Harbor');
    expect(voyageLevel(p.voyage.week, 24, 0, 28, 'north', p.voyage.theme).seed).toContain('ocean');
    expect(voyageLevel(p.voyage.week, 24, 0, 28, 'north').seed).toContain('star');
    expect(stopReward(p, 6).skin).toBe('teal');
    delete p.voyage.theme;
    ensureVoyage(p, p.voyage.week);
    expect(p.voyage.theme).toBeUndefined();
    expect(stopReward(p, 6).skin).toBe(eventFor(p.voyage.week, 'north', null).skin);
  });
  it('consults the override before generating Daily and Voyage while keeping rotation fixed', () => {
    const day = '2027-02-01';
    const week = '2027-W05';
    const daily = dailyLevel(day, 28);
    const voyage = voyageLevel(week, 24, 2, 28);
    const theme = eventFor(week);
    const spy = vi
      .spyOn(almanac, 'calendarSalt')
      .mockImplementation((key, stop) => (key === day || (key === week && stop === 2) ? 987 : 0));
    try {
      expect(dailyLevel(day, 28)).not.toEqual(daily);
      expect(voyageLevel(week, 24, 2, 28)).not.toEqual(voyage);
      expect(eventFor(week)).toEqual(theme);
      expect(spy).toHaveBeenCalledWith(day);
      expect(spy).toHaveBeenCalledWith(week, 2);
    } finally {
      spy.mockRestore();
    }
    expect(dailyLevel(day, 28)).toEqual(daily);
    expect(voyageLevel(week, 24, 2, 28)).toEqual(voyage);
  });
  it('keeps the existing no-repeat weekly cadence around each spotlight', () => {
    for (const row of almanac.ALMANAC) {
      const monday = weekStart(row.week);
      const adjacent = [-7, 7].map((offset) => {
        const date = new Date(monday.getTime() + offset * 86400000);
        return isoWeek(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
      });
      for (const hemisphere of ['north', 'south'] as const) {
        for (const week of adjacent)
          expect(eventFor(row.week, hemisphere).id, `${week} / ${row.week} ${hemisphere}`).not.toBe(eventFor(week, hemisphere).id);
      }
    }
  });
  it('keeps future Frost Week in local winter across DST, month end, year end and W53', () => {
    for (const day of ['2026-12-28', '2027-01-03', '2027-01-31', '2027-03-14', '2027-03-28', '2027-04-04', '2027-10-03']) {
      const week = isoWeek(new Date(`${day}T12:00:00`));
      for (const hemisphere of ['north', 'south'] as const) {
        const monday = weekStart(week);
        if (eventFor(week, hemisphere).id === 'frost')
          expect(seasonOf(new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 12), hemisphere)).toBe('winter');
      }
    }
    expect(isoWeek(new Date(2027, 0, 3, 12))).toBe('2026-W53');
    expect(() => weekStart('2027-W53')).toThrow();
  });
});
